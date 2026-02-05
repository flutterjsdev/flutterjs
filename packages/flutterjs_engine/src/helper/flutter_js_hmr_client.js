// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * FlutterJS Hot Module Replacement (HMR) Client - Complete Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. WebSocket connection management to dev server
 * 2. Module hot replacement without full page reload
 * 3. State preservation during hot reload
 * 4. Error handling and recovery
 * 5. Automatic reconnection on connection loss
 * 6. Error overlay display
 * 7. Custom message routing
 * 8. Module dependency tracking
 * 9. Performance metrics
 * 10. Development environment detection
 * 
 * Location: cli/hmr/hmr-client.js
 * Injected into: All development builds automatically
 * 
 * Usage (internal - auto-injected):
 *   window.__HMR__.connect();
 *   window.__HMR__.setRuntime(flutterRuntime);
 */

// ============================================================================
// HMR CLIENT CLASS
// ============================================================================

class HMRClient {
  constructor(options = {}) {
    // Configuration
    this.options = {
      protocol: options.protocol || (window.location.protocol === 'https:' ? 'wss:' : 'ws:'),
      host: options.host || window.location.hostname,
      port: options.port || window.location.port,
      path: options.path || '/ws',
      reconnectDelay: options.reconnectDelay || 1000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
      ...options,
    };

    // Connection state
    this.ws = null;
    this.connected = false;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;

    // Module state
    this.moduleCache = new Map();
    this.moduleMetadata = new Map();
    this.stateSnapshot = null;
    this.runtime = null;

    // Performance metrics
    this.stats = {
      totalUpdates: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      totalReloads: 0,
      averageUpdateTime: 0,
    };

    // Error tracking
    this.lastError = null;
    this.errorCount = 0;

    // Message handlers
    this.messageHandlers = new Map();
    this.errorHandlers = [];

    // Version info
    this.version = '1.0.0';
    this.isDevelopment = true;
  }

  /**
   * Connect to HMR server via WebSocket
   */
  connect() {
    if (this.connected) {
      console.warn('[HMR] Already connected');
      return;
    }

    const url = `${this.options.protocol}//${this.options.host}:${this.options.port}${this.options.path}`;

    console.log(`[HMR] Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url);

      // Connection opened
      this.ws.onopen = () => {
        this._onConnectionOpen();
      };

      // Message received
      this.ws.onmessage = (event) => {
        this._onMessage(event);
      };

      // Connection closed
      this.ws.onclose = () => {
        this._onConnectionClose();
      };

      // Connection error
      this.ws.onerror = (error) => {
        this._onConnectionError(error);
      };

    } catch (error) {
      console.error('[HMR] Failed to create WebSocket:', error);
      this._attemptReconnect();
    }
  }

  /**
   * Handle WebSocket connection open
   */
  _onConnectionOpen() {
    this.connected = true;
    this.reconnectAttempts = 0;

    console.log('[HMR] ✅ Connected to server');

    // Send ready message
    this._send({
      type: 'ready',
      clientId: this.clientId,
      version: this.version,
    });

    // Start heartbeat
    this._startHeartbeat();

    // Reset error state
    this.errorCount = 0;
    this._hideErrorOverlay();
  }

  /**
   * Handle WebSocket connection close
   */
  _onConnectionClose() {
    this.connected = false;
    this.clientId = null;

    console.warn('[HMR] ⚠ Disconnected from server');

    // Clear heartbeat
    clearInterval(this.heartbeatTimer);

    // Attempt reconnect
    this._attemptReconnect();
  }

  /**
   * Handle WebSocket connection error
   */
  _onConnectionError(error) {
    console.error('[HMR] Connection error:', error);
    this.errorCount++;

    if (this.errorCount > 3) {
      this._showErrorOverlay(
        'HMR Connection Failed',
        'Unable to connect to development server. ' +
        'Check your network and restart the dev server.'
      );
    }
  }

  /**
   * Attempt to reconnect to server
   */
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error(
        '[HMR] ❌ Max reconnection attempts reached. ' +
        'Please reload the page manually.'
      );

      this._showErrorOverlay(
        'HMR Connection Lost',
        'Unable to reconnect to development server. ' +
        'Please reload the page manually.',
        true
      );

      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[HMR] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Handle messages from server
   */
  _onMessage(event) {
    try {
      const message = JSON.parse(event.data);

      // Handle system messages
      switch (message.type) {
        case 'connected':
          this._handleConnected(message);
          break;

        case 'pong':
          this._handlePong(message);
          break;

        case 'file-changed':
          this._handleFileChanged(message);
          break;

        case 'update':
          this._handleUpdate(message);
          break;

        case 'reload':
          this._handleReload(message);
          break;

        case 'error':
          this._handleServerError(message);
          break;

        case 'build-error':
          this._handleBuildError(message);
          break;

        case 'analysis-update':
          this._handleAnalysisUpdate(message);
          break;

        case 'custom':
          this._handleCustomMessage(message);
          break;

        default:
          // Custom message types
          if (message.type.startsWith('custom:')) {
            this._handleCustomMessage(message);
          } else {
            console.debug('[HMR] Unknown message type:', message.type);
          }
      }

    } catch (error) {
      console.error('[HMR] Failed to process message:', error);
    }
  }

  /**
   * Handle connected message from server
   */
  _handleConnected(message) {
    this.clientId = message.clientId;
    console.log(`[HMR] Client ID: ${this.clientId}`);
  }

  /**
   * Handle pong from heartbeat
   */
  _handlePong(message) {
    // Heartbeat response received
    if (this.options.verbose) {
      console.debug('[HMR] Pong received');
    }
  }

  /**
   * Handle file change notification
   */
  _handleFileChanged(message) {
    const { file, eventType, extension } = message.data;

    console.log(`[HMR] File changed: ${file} (${eventType})`);

    // Track which modules changed
    this._updateModuleCache(file, eventType);

    // Determine if we can hot reload or need full reload
    if (this._canHotReload(file, extension)) {
      console.log(`[HMR] Hot reloading ${file}...`);
      this._performHotReload(file);
    } else {
      console.log(`[HMR] Full reload required (${file})`);
      this._performFullReload(file);
    }
  }

  /**
   * Handle hot update message
   */
  _handleUpdate(message) {
    const { file, widgets, timestamp } = message;

    console.log(`[HMR] Updating widgets: ${widgets.join(', ')}`);

    try {
      // Preserve state before update
      this._captureState();

      // Perform module replacement
      this._replaceModules(file, widgets);

      // Restore state after update
      this._restoreState();

      // Update stats
      this.stats.totalUpdates++;
      this.stats.successfulUpdates++;

      console.log('[HMR] ✅ Update completed');

    } catch (error) {
      this.stats.totalUpdates++;
      this.stats.failedUpdates++;

      console.error('[HMR] ❌ Update failed:', error);
      this._showErrorOverlay(
        'Hot Module Replacement Failed',
        error.message,
        false,
        error.stack
      );

      // Fallback to full reload
      this._performFullReload(file);
    }
  }

  /**
   * Handle full page reload
   */
  _handleReload(message) {
    const reason = message.reason || 'Server requested reload';

    console.log(`[HMR] Full reload: ${reason}`);

    this.stats.totalReloads++;

    // Small delay to ensure message is logged
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  /**
   * Handle server error message
   */
  _handleServerError(message) {
    console.error('[HMR] Server error:', message.error);

    this._showErrorOverlay(
      'Server Error',
      message.error.message || 'Unknown error',
      true
    );
  }

  /**
   * Handle build error
   */
  _handleBuildError(message) {
    const { error } = message;

    console.error('[HMR] Build error:', error.message);

    this._showErrorOverlay(
      'Build Error',
      error.message,
      false,
      error.stack
    );

    this.lastError = error;
  }

  /**
   * Handle analysis update
   */
  _handleAnalysisUpdate(message) {
    if (this.options.verbose) {
      console.debug('[HMR] Analysis updated:', message.data);
    }

    // Dispatch custom event for listeners
    window.dispatchEvent(new CustomEvent('hmr:analysis-update', {
      detail: message.data,
    }));
  }

  /**
   * Handle custom messages
   */
  _handleCustomMessage(message) {
    if (this.options.verbose) {
      console.debug('[HMR] Custom message:', message);
    }

    // Dispatch custom event
    const eventName = message.type.replace('custom:', 'hmr:custom:');
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: message.data,
    }));

    // Call registered handlers
    if (this.messageHandlers.has(message.type)) {
      const handlers = this.messageHandlers.get(message.type);
      handlers.forEach(handler => {
        try {
          handler(message.data);
        } catch (error) {
          console.error('[HMR] Error in message handler:', error);
        }
      });
    }
  }

  /**
   * Determine if module can be hot reloaded
   */
  _canHotReload(file, extension) {
    // Never hot reload these types
    const noHotReloadExtensions = ['.html'];
    const noHotReloadPatterns = [
      'index.fjs',
      'main.fjs',
      'app.fjs',
      'config.js',
      'flutterjs.config.js',
    ];

    // Check extension
    if (noHotReloadExtensions.includes(extension)) {
      return false;
    }

    // Check filename patterns
    const filename = file.split('/').pop();
    for (const pattern of noHotReloadPatterns) {
      if (filename.includes(pattern)) {
        return false;
      }
    }

    // Can hot reload if runtime available
    return !!this.runtime;
  }

  /**
   * Capture current application state
   */
  _captureState() {
    if (!this.runtime) {
      console.warn('[HMR] No runtime available for state capture');
      return;
    }

    try {
      this.stateSnapshot = this.runtime.captureState?.();

      if (this.stateSnapshot) {
        console.log('[HMR] State captured');
      }

    } catch (error) {
      console.warn('[HMR] Failed to capture state:', error.message);
    }
  }

  /**
   * Restore application state after update
   */
  _restoreState() {
    if (!this.runtime || !this.stateSnapshot) {
      return;
    }

    try {
      this.runtime.restoreState?.(this.stateSnapshot);
      console.log('[HMR] State restored');

    } catch (error) {
      console.warn('[HMR] Failed to restore state:', error.message);
    }
  }

  /**
   * Replace module and update affected widgets
   */
  _replaceModules(file, widgets) {
    if (!this.runtime) {
      throw new Error('Runtime not available');
    }

    // Clear module from cache
    this._invalidateModule(file);

    // Find and update affected widgets
    const affectedElements = this.runtime.findElementsByWidgetType?.(widgets);

    if (!affectedElements || affectedElements.length === 0) {
      console.warn('[HMR] No affected elements found');
      return;
    }

    console.log(`[HMR] Updating ${affectedElements.length} element(s)`);

    // Update each affected element
    affectedElements.forEach((element, index) => {
      try {
        element.rebuild?.();
        console.debug(`[HMR] Updated element ${index + 1}/${affectedElements.length}`);
      } catch (error) {
        console.error(`[HMR] Failed to update element ${index}:`, error);
        throw error;
      }
    });
  }

  /**
   * Perform hot reload
   */
  _performHotReload(file) {
    const start = performance.now();

    try {
      // Capture state
      this._captureState();

      // Invalidate module cache
      this._invalidateModule(file);

      // Notify runtime of hot reload
      if (this.runtime?.hotReload) {
        this.runtime.hotReload(file);
      }

      // Restore state
      this._restoreState();

      const duration = performance.now() - start;
      console.log(`[HMR] ✅ Hot reload completed in ${duration.toFixed(2)}ms`);

      this.stats.successfulUpdates++;

    } catch (error) {
      console.error('[HMR] Hot reload failed:', error);
      this._performFullReload(file);
    }
  }

  /**
   * Perform full page reload
   */
  _performFullReload(file) {
    console.log(`[HMR] Performing full reload (${file})`);

    this.stats.totalReloads++;

    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  /**
   * Update module cache
   */
  _updateModuleCache(file, eventType) {
    if (eventType === 'unlink') {
      this.moduleCache.delete(file);
      this.moduleMetadata.delete(file);
    } else {
      const timestamp = Date.now();
      this.moduleCache.set(file, {
        lastChanged: timestamp,
        eventType,
      });
    }
  }

  /**
   * Invalidate module from cache
   */
  _invalidateModule(file) {
    // Clear from require.cache (if using CommonJS)
    if (typeof require !== 'undefined' && require.cache) {
      Object.keys(require.cache).forEach(key => {
        if (key.includes(file)) {
          delete require.cache[key];
        }
      });
    }

    // Clear from module map
    this.moduleCache.delete(file);

    console.debug(`[HMR] Invalidated module: ${file}`);
  }

  /**
   * Show error overlay in browser
   */
  _showErrorOverlay(title, message, persistent = false, stack = '') {
    // Check if overlay already exists
    let overlay = document.getElementById('hmr-error-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'hmr-error-overlay';
      document.body.appendChild(overlay);
    }

    const styles = `
      #hmr-error-overlay {
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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 20px;
      }

      #hmr-error-content {
        background: #1e1e1e;
        color: #d4d4d4;
        border-radius: 12px;
        padding: 32px;
        max-width: 700px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      #hmr-error-title {
        color: #f48771;
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 16px 0;
      }

      #hmr-error-message {
        color: #e8e8e8;
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 20px 0;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      }

      #hmr-error-stack {
        background: #0a0a0a;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 16px;
        margin: 16px 0;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 11px;
        line-height: 1.5;
        max-height: 300px;
        overflow-y: auto;
        color: #888;
      }

      #hmr-error-dismiss {
        background: #6750a4;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
        margin-top: 16px;
      }

      #hmr-error-dismiss:hover {
        background: #7b5fa7;
      }

      #hmr-error-dismiss:active {
        background: #5d47a1;
      }

      #hmr-reload-btn {
        background: #4ec9b0;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
        margin-left: 8px;
      }

      #hmr-reload-btn:hover {
        background: #5fd3ba;
      }
    `;

    const html = `
      <div id="hmr-error-content">
        <h2 id="hmr-error-title">${title}</h2>
        <div id="hmr-error-message">${this._escapeHtml(message)}</div>
        ${stack ? `<div id="hmr-error-stack"><pre>${this._escapeHtml(stack)}</pre></div>` : ''}
        <div>
          ${!persistent ? '<button id="hmr-error-dismiss">Dismiss</button>' : ''}
          <button id="hmr-reload-btn">Reload Page</button>
        </div>
        <style>${styles}</style>
      </div>
    `;

    overlay.innerHTML = html;
    overlay.style.display = 'flex';

    // Add event listeners
    const dismissBtn = document.getElementById('hmr-error-dismiss');
    const reloadBtn = document.getElementById('hmr-reload-btn');

    if (dismissBtn) {
      dismissBtn.onclick = () => {
        overlay.style.display = 'none';
      };
    }

    if (reloadBtn) {
      reloadBtn.onclick = () => {
        window.location.reload();
      };
    }

    console.error(`[HMR] Error overlay shown: ${title}`);
  }

  /**
   * Hide error overlay
   */
  _hideErrorOverlay() {
    const overlay = document.getElementById('hmr-error-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Start heartbeat to detect connection loss
   */
  _startHeartbeat() {
    clearInterval(this.heartbeatTimer);

    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        this._send({ type: 'ping' });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Send message to server
   */
  _send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[HMR] WebSocket not connected, cannot send message');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[HMR] Failed to send message:', error);
    }
  }

  /**
   * Escape HTML special characters
   */
  _escapeHtml(text) {
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
   * Register message handler
   */
  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }

    this.messageHandlers.get(type).push(handler);
  }

  /**
   * Register error handler
   */
  onError(handler) {
    this.errorHandlers.push(handler);
  }

  /**
   * Set Flutter runtime for state management
   */
  setRuntime(runtime) {
    this.runtime = runtime;
    console.log('[HMR] Runtime registered');
  }

  /**
   * Get HMR statistics
   */
  getStats() {
    return {
      ...this.stats,
      connected: this.connected,
      clientId: this.clientId,
      uptime: Date.now(),
    };
  }

  /**
   * Print HMR stats to console
   */
  printStats() {
    const stats = this.getStats();

    console.log('[HMR] Statistics:');
    console.log(`  Connected: ${stats.connected}`);
    console.log(`  Client ID: ${stats.clientId}`);
    console.log(`  Total Updates: ${stats.totalUpdates}`);
    console.log(`  Successful: ${stats.successfulUpdates}`);
    console.log(`  Failed: ${stats.failedUpdates}`);
    console.log(`  Full Reloads: ${stats.totalReloads}`);
    console.log(`  Success Rate: ${stats.totalUpdates > 0 ? 
      ((stats.successfulUpdates / stats.totalUpdates) * 100).toFixed(1) : 'N/A'}%`);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }

    clearInterval(this.heartbeatTimer);
    clearTimeout(this.reconnectTimer);

    this.connected = false;

    console.log('[HMR] Disconnected');
  }
}

// ============================================================================
// INITIALIZE HMR CLIENT
// ============================================================================

// Create global HMR instance
if (typeof window !== 'undefined') {
  window.__HMR__ = new HMRClient({
    verbose: false,
    reconnectDelay: 1000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  });

  // Auto-connect in development
  if (process.env.NODE_ENV !== 'production') {
    window.__HMR__.connect();

    // Make HMR stats available globally
    window.__HMR_STATS__ = () => window.__HMR__.printStats();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HMRClient };
}
