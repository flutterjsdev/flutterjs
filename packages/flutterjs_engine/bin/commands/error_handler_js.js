/**
 * ============================================================================
 * FlutterJS Error Handler & Overlay System - Complete Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. Error parsing and enhancement with source maps
 * 2. Code frame generation with context
 * 3. Error overlay generation for browser display
 * 4. Error history tracking
 * 5. Integration with dev server
 * 6. Source map loading and mapping
 * 7. Stack trace parsing
 * 8. Error categorization
 * 
 * Location: cli/server/error-handler.js
 * Usage:
 *   const handler = new ErrorHandler(options);
 *   const enhanced = await handler.enhanceError(error, sourceMapPath);
 *   handler.broadcastToClients(enhanced);
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      overlayEnabled: options.overlayEnabled !== false,
      sourceMapDir: options.sourceMapDir || '.flutterjs/maps',
      debugDir: options.debugDir || '.debug',
      projectRoot: options.projectRoot || process.cwd(),
      maxStackLines: options.maxStackLines || 20,
      maxErrorHistory: options.maxErrorHistory || 50,
      verbose: options.verbose || false,
      ...options,
    };

    // Error tracking
    this.errorStack = [];
    this.currentError = null;
    this.lastErrorTime = null;

    // Source map cache
    this.sourceMapCache = new Map();

    // Error colors for console
    this.colors = {
      error: chalk.red,
      warn: chalk.yellow,
      info: chalk.cyan,
      debug: chalk.gray,
      success: chalk.green,
    };
  }

  /**
   * Parse and enhance error with source map information
   * @param {Error} error - The error object to enhance
   * @param {string} sourceMapPath - Path to source map file
   * @returns {Promise<Object>} Enhanced error object
   */
  async enhanceError(error, sourceMapPath = null) {
    const enhanced = {
      id: this._generateErrorId(),
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      stack: error.stack || '',
      type: this._categorizeError(error),
      file: null,
      line: null,
      column: null,
      originalFile: null,
      originalLine: null,
      originalColumn: null,
      codeFrame: null,
      formatted: null,
      timestamp: new Date().toISOString(),
      severity: 'error',
      isDevelopment: true,
    };

    try {
      // Parse stack trace to get file location
      this._parseStackTrace(error.stack, enhanced);

      // Load and apply source map if available
      if (sourceMapPath && fs.existsSync(sourceMapPath)) {
        await this._applySourceMap(sourceMapPath, enhanced);
      }

      // Generate code frame
      const codeFile = enhanced.originalFile || enhanced.file;
      const codeLine = enhanced.originalLine || enhanced.line;
      const codeColumn = enhanced.originalColumn || enhanced.column;

      if (codeFile && codeLine) {
        enhanced.codeFrame = await this._generateCodeFrame(
          codeFile,
          codeLine,
          codeColumn
        );
      }

      // Store in error history
      this._storeError(enhanced);
      this.currentError = enhanced;
      this.lastErrorTime = Date.now();

      if (this.options.verbose) {
        console.log(this.colors.debug(`[ErrorHandler] Enhanced error: ${enhanced.id}`));
      }

      return enhanced;

    } catch (enhanceError) {
      console.warn(
        this.colors.warn(
          `[ErrorHandler] Failed to enhance error: ${enhanceError.message}`
        )
      );
      // Return basic enhanced error even if enhancement failed
      this._storeError(enhanced);
      return enhanced;
    }
  }

  /**
   * Parse stack trace and extract file location
   * @private
   */
  _parseStackTrace(stack, enhanced) {
    if (!stack) return;

    // Match patterns like:
    // at functionName (file.js:10:5)
    // at file.js:10:5
    const patterns = [
      /at\s+(?:.*?\s+)?\(?(.+?):(\d+):(\d+)\)?/,
      /^\s*at\s+(.+?):(\d+):(\d+)/m,
      /in\s+(.+?)\s+at\s+line\s+(\d+),\s+column\s+(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = stack.match(pattern);
      if (match) {
        enhanced.file = match[1];
        enhanced.line = parseInt(match[2], 10);
        enhanced.column = parseInt(match[3], 10);
        break;
      }
    }
  }

  /**
   * Load and apply source map to get original locations
   * @private
   */
  async _applySourceMap(sourceMapPath, enhanced) {
    try {
      // Load source map from cache or file
      let sourceMapData;
      if (this.sourceMapCache.has(sourceMapPath)) {
        sourceMapData = this.sourceMapCache.get(sourceMapPath);
      } else {
        const content = await fs.promises.readFile(sourceMapPath, 'utf-8');
        sourceMapData = JSON.parse(content);
        this.sourceMapCache.set(sourceMapPath, sourceMapData);
      }

      // Find original position using source map
      const originalPos = this._findOriginalPosition(
        sourceMapData,
        enhanced.line,
        enhanced.column
      );

      if (originalPos) {
        enhanced.originalFile = originalPos.source;
        enhanced.originalLine = originalPos.line;
        enhanced.originalColumn = originalPos.column;

        if (this.options.verbose) {
          console.log(
            this.colors.debug(
              `[ErrorHandler] Mapped ${enhanced.file}:${enhanced.line} ` +
              `→ ${enhanced.originalFile}:${enhanced.originalLine}`
            )
          );
        }
      }

    } catch (error) {
      console.warn(
        this.colors.warn(
          `[ErrorHandler] Failed to load source map: ${error.message}`
        )
      );
    }
  }

  /**
   * Find original position in source using source map
   * @private
   */
  _findOriginalPosition(sourceMap, line, column) {
    try {
      if (!sourceMap.mappings) return null;

      // Simple source map decoder (basic implementation)
      // For production, use source-map library
      const mappings = sourceMap.mappings.split(';');

      if (line > mappings.length) return null;

      const lineMapping = mappings[line - 1];
      if (!lineMapping) return null;

      // Parse VLQ encoded mappings
      const decoded = this._decodeVLQ(lineMapping);

      if (!decoded || decoded.length === 0) return null;

      // Find mapping closest to our column
      let bestMapping = null;
      for (const mapping of decoded) {
        if (mapping[0] <= column) {
          bestMapping = mapping;
        } else {
          break;
        }
      }

      if (!bestMapping || bestMapping.length < 4) return null;

      return {
        source: sourceMap.sources[bestMapping[1]],
        line: bestMapping[2] + 1,
        column: bestMapping[3],
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Decode Variable Length Quantity encoding
   * @private
   */
  _decodeVLQ(str) {
    const result = [];
    let pos = 0;
    let values = [];

    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      let digit;

      if (c >= 65 && c <= 90) {
        digit = c - 65;
      } else if (c >= 97 && c <= 122) {
        digit = c - 97 + 26;
      } else if (c >= 48 && c <= 57) {
        digit = c - 48 + 52;
      } else if (c === 43) {
        digit = 62;
      } else if (c === 47) {
        digit = 63;
      } else {
        continue;
      }

      const continuation = (digit & 32) !== 0;
      const value = digit & 31;

      values.push(value);

      if (!continuation) {
        let num = 0;
        for (let j = values.length - 1; j >= 0; j--) {
          num = (num << 5) + values[j];
        }

        if ((num & 1) === 0) {
          num = num >> 1;
        } else {
          num = -((num + 1) >> 1);
        }

        pos += num;
        result.push(pos);
        values = [];
      }
    }

    return result;
  }

  /**
   * Generate code frame showing error context
   * @private
   */
  async _generateCodeFrame(filePath, line, column) {
    try {
      // Resolve path relative to project root
      let resolvedPath = filePath;
      if (!path.isAbsolute(filePath)) {
        resolvedPath = path.join(this.options.projectRoot, filePath);
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        if (this.options.verbose) {
          console.warn(
            this.colors.warn(
              `[ErrorHandler] File not found: ${resolvedPath}`
            )
          );
        }
        return null;
      }

      // Read file
      const source = await fs.promises.readFile(resolvedPath, 'utf-8');
      const lines = source.split('\n');

      // Validate line number
      if (!line || line < 1 || line > lines.length) {
        return null;
      }

      // Get surrounding lines (3 before, 3 after)
      const start = Math.max(0, line - 4);
      const end = Math.min(lines.length, line + 3);
      const lineNumWidth = String(end).length;

      let frame = '';

      for (let i = start; i < end; i++) {
        const lineNum = i + 1;
        const isErrorLine = lineNum === line;
        const prefix = isErrorLine ? chalk.red('>') : ' ';
        const lineNumStr = String(lineNum).padStart(lineNumWidth, ' ');
        const lineContent = lines[i];

        // Color error line differently
        let displayContent = lineContent;
        if (isErrorLine) {
          displayContent = chalk.red(lineContent);
        }

        frame += `${prefix} ${chalk.gray(lineNumStr)} | ${displayContent}\n`;

        // Add pointer to error column
        if (isErrorLine && column) {
          const pointerPos = column + lineNumWidth + 4;
          const pointer = ' '.repeat(pointerPos) + chalk.red('^');
          frame += pointer + '\n';
        }
      }

      return frame;

    } catch (error) {
      console.warn(
        this.colors.warn(
          `[ErrorHandler] Failed to generate code frame: ${error.message}`
        )
      );
      return null;
    }
  }

  /**
   * Categorize error type
   * @private
   */
  _categorizeError(error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('syntax') || name.includes('syntax')) {
      return 'syntax-error';
    }
    if (message.includes('type') || name.includes('type')) {
      return 'type-error';
    }
    if (message.includes('reference') || name.includes('reference')) {
      return 'reference-error';
    }
    if (message.includes('range') || name.includes('range')) {
      return 'range-error';
    }
    if (message.includes('widget') || message.includes('component')) {
      return 'widget-error';
    }
    if (message.includes('state') || message.includes('setState')) {
      return 'state-error';
    }
    if (message.includes('import') || message.includes('module')) {
      return 'module-error';
    }

    return 'runtime-error';
  }

  /**
   * Store error in history
   * @private
   */
  _storeError(error) {
    this.errorStack.push(error);

    // Keep only recent errors
    if (this.errorStack.length > this.options.maxErrorHistory) {
      this.errorStack = this.errorStack.slice(-this.options.maxErrorHistory);
    }
  }

  /**
   * Generate unique error ID
   * @private
   */
  _generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format error for console output
   */
  formatErrorForConsole(error) {
    let output = '\n' + chalk.bgRed.white(' ERROR ') + '\n\n';

    // Error name and message
    output += chalk.red.bold(error.name) + ': ';
    output += chalk.white(error.message) + '\n';

    // Location info
    if (error.originalFile) {
      output += chalk.gray(
        `  📁 ${error.originalFile}:${error.originalLine}:${error.originalColumn}\n`
      );
    } else if (error.file) {
      output += chalk.gray(
        `  📁 ${error.file}:${error.line}:${error.column}\n`
      );
    }

    // Error type
    if (error.type) {
      output += chalk.gray(`  Type: ${error.type}\n`);
    }

    // Code frame
    if (error.codeFrame) {
      output += '\n' + error.codeFrame + '\n';
    }

    // Stack trace (first few lines)
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, this.options.maxStackLines);
      output += '\n' + chalk.gray(stackLines.join('\n')) + '\n';
    }

    output += '\n';

    return output;
  }

  /**
   * Generate HTML error overlay for browser
   */
  generateErrorOverlayHTML(error) {
    const escapedMessage = this._escapeHtml(error.message);
    const escapedStack = this._escapeHtml(error.stack || '');
    const escapedCodeFrame = this._escapeHtml(error.codeFrame || '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FlutterJS Build Error">
  <title>FlutterJS - Build Error</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      height: 100%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
    }

    .error-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .error-container {
      background: #1e1e1e;
      border: 2px solid #ff4757;
      border-radius: 12px;
      padding: 40px;
      max-width: 850px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 
        0 0 40px rgba(255, 71, 87, 0.3),
        0 20px 60px rgba(0, 0, 0, 0.8);
    }

    .error-header {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }

    .error-icon {
      font-size: 40px;
      flex-shrink: 0;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .error-title {
      flex: 1;
    }

    .error-title h1 {
      color: #ff4757;
      font-size: 28px;
      margin-bottom: 8px;
      word-break: break-word;
    }

    .error-title p {
      color: #888;
      font-size: 13px;
      margin: 4px 0;
    }

    .error-type-badge {
      display: inline-block;
      background: rgba(255, 71, 87, 0.2);
      border: 1px solid rgba(255, 71, 87, 0.5);
      color: #ff6b7a;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      margin-top: 8px;
    }

    .error-location {
      background: #0f0f0f;
      border-left: 4px solid #ff4757;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      color: #4ec9b0;
      word-break: break-all;
    }

    .error-message {
      background: #0f0f0f;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 20px;
      border: 1px solid #333;
      line-height: 1.6;
      color: #d4d4d4;
      font-size: 14px;
      word-break: break-word;
    }

    .error-code-frame {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 12px;
      line-height: 1.6;
    }

    .error-code-frame pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #d4d4d4;
    }

    .error-section {
      margin-bottom: 20px;
    }

    .error-section-title {
      color: #00d4ff;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #333;
    }

    .error-stack {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 15px;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.5;
      max-height: 250px;
      overflow-y: auto;
      color: #888;
    }

    .error-stack pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .error-hint {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-left: 4px solid #00d4ff;
      border-radius: 6px;
      padding: 15px;
      color: #d4d4d4;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .error-hint strong {
      color: #00d4ff;
    }

    .error-actions {
      display: flex;
      gap: 10px;
      padding-top: 20px;
      border-top: 1px solid #333;
      flex-wrap: wrap;
    }

    button {
      flex: 1;
      min-width: 140px;
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .btn-reload {
      background: #4ec9b0;
      color: #0a0a0a;
    }

    .btn-reload:hover {
      background: #5fd3ba;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(78, 201, 176, 0.3);
    }

    .btn-copy {
      background: #6750a4;
      color: white;
    }

    .btn-copy:hover {
      background: #7b5fa7;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(103, 80, 164, 0.3);
    }

    .btn-dismiss {
      background: transparent;
      color: #888;
      border: 1px solid #333;
    }

    .btn-dismiss:hover {
      background: #333;
      color: #d4d4d4;
    }

    /* Scrollbar styling */
    .error-container::-webkit-scrollbar {
      width: 8px;
    }

    .error-container::-webkit-scrollbar-track {
      background: #1a1a1a;
    }

    .error-container::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 4px;
    }

    .error-container::-webkit-scrollbar-thumb:hover {
      background: #444;
    }
  </style>
</head>
<body>
  <div class="error-overlay">
    <div class="error-container">
      <div class="error-header">
        <div class="error-icon">⚠️</div>
        <div class="error-title">
          <h1>${error.name}</h1>
          <p>Build failed during development</p>
          ${error.type ? `<div class="error-type-badge">${error.type}</div>` : ''}
        </div>
      </div>

      ${error.originalFile ? `
        <div class="error-location">
          📁 ${error.originalFile}:${error.originalLine}:${error.originalColumn}
        </div>
      ` : error.file ? `
        <div class="error-location">
          📁 ${error.file}:${error.line}:${error.column}
        </div>
      ` : ''}

      <div class="error-message">
        <strong>Error Message:</strong><br>
        ${escapedMessage}
      </div>

      ${error.codeFrame ? `
        <div class="error-section">
          <div class="error-section-title">Source Code</div>
          <div class="error-code-frame">
            <pre>${escapedCodeFrame}</pre>
          </div>
        </div>
      ` : ''}

      ${error.stack ? `
        <div class="error-section">
          <div class="error-section-title">Stack Trace</div>
          <div class="error-stack">
            <pre>${escapedStack}</pre>
          </div>
        </div>
      ` : ''}

      <div class="error-hint">
        <strong>💡 Tip:</strong> Check the file and line shown above. 
        Fix the error in your editor, and the page will automatically 
        reload once the issue is resolved.
      </div>

      <div class="error-actions">
        <button class="btn-reload" onclick="location.reload()">
          🔄 Reload Page
        </button>
        <button class="btn-copy" onclick="copyErrorToClipboard()">
          📋 Copy Error
        </button>
        <button class="btn-dismiss" onclick="dismissOverlay()">
          Dismiss
        </button>
      </div>
    </div>
  </div>

  <script>
    function copyErrorToClipboard() {
      const errorText = \`\${error.name}: \${error.message}

File: \${error.originalFile || error.file}
Line: \${error.originalLine || error.line}
Column: \${error.originalColumn || error.column}

\${error.stack || ''}\`;

      navigator.clipboard.writeText(errorText).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }).catch(err => {
        alert('Failed to copy: ' + err.message);
      });
    }

    function dismissOverlay() {
      document.querySelector('.error-overlay').style.display = 'none';
    }

    // Auto-dismiss on page visibility change (page reload detection)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        dismissOverlay();
      }
    });

    const error = ${JSON.stringify(error)};
  </script>
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   * @private
   */
  _escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Print error to console with formatting
   */
  printErrorToConsole(error) {
    const formatted = this.formatErrorForConsole(error);
    console.log(formatted);
  }

  /**
   * Get error history
   */
  getErrorHistory() {
    return [...this.errorStack];
  }

  /**
   * Get current error
   */
  getCurrentError() {
    return this.currentError;
  }

  /**
   * Clear error stack
   */
  clearErrors() {
    this.errorStack = [];
    this.currentError = null;
  }

  /**
   * Clear source map cache
   */
  clearSourceMapCache() {
    this.sourceMapCache.clear();
  }

  /**
   * Get handler stats
   */
  getStats() {
    return {
      totalErrors: this.errorStack.length,
      currentError: this.currentError?.id || null,
      lastErrorTime: this.lastErrorTime,
      sourceMapsCached: this.sourceMapCache.size,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ErrorHandler,
};
