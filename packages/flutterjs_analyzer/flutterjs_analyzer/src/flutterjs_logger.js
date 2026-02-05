// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS Logger - Centralized Debug Output System
 * 
 * Instead of console.log() everywhere, use this logger to:
 * - Write debug logs to a file (.debug folder)
 * - Maintain clean console output
 * - Enable/disable debug modes per component
 * - Group related logs together
 * - Support multiple log levels
 */

import fs from 'fs';
import path from 'path';

class Logger {
  constructor(options = {}) {
    this.options = {
      debugDir: '.debug',
      enabled: true,
      level: 'info',  // 'error', 'warn', 'info', 'debug', 'trace'
      writeToFile: true,
      writeToConsole: false,  // Set to true only for critical errors
      includeTimestamp: true,
      includeStackTrace: false,
      maxFileSize: 10 * 1024 * 1024,  // 10MB
      ...options,
    };

    this.logLevels = {
      'error': 0,
      'warn': 1,
      'info': 2,
      'debug': 3,
      'trace': 4,
    };

    this.currentLevel = this.logLevels[this.options.level];
    this.logs = [];
    this.logSessions = {};
    this.indentLevel = 0;

    // Ensure debug directory exists
    if (this.options.writeToFile) {
      this.ensureDebugDir();
    }
  }

  /**
   * Ensure .debug directory exists
   */
  ensureDebugDir() {
    if (!fs.existsSync(this.options.debugDir)) {
      fs.mkdirSync(this.options.debugDir, { recursive: true });
    }
  }

  /**
   * Get file path for a specific component
   */
  getLogFilePath(component = 'general') {
    return path.join(this.options.debugDir, `${component}.log`);
  }

  /**
   * Check if log level should be written
   */
  shouldLog(level) {
    return this.logLevels[level] <= this.currentLevel;
  }

  /**
   * Format log entry
   */
  formatEntry(level, component, message, data = null) {
    const timestamp = this.options.includeTimestamp
      ? new Date().toISOString()
      : '';

    const indent = '  '.repeat(this.indentLevel);
    const levelStr = level.toUpperCase().padEnd(5);
    const componentStr = component.padEnd(20);

    let entry = `${timestamp} [${levelStr}] [${componentStr}] ${indent}${message}`;

    if (data) {
      entry += '\n' + indent + JSON.stringify(data, null, 2);
    }

    return entry;
  }

  /**
   * Internal write method
   */
  write(level, component, message, data) {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, component, message, data);
    this.logs.push(entry);

    // Write to console if enabled (only for critical messages)
    if (this.options.writeToConsole && level === 'error') {
      console.error(`${component}: ${message}`, data || '');
    }

    // Write to file
    if (this.options.writeToFile) {
      this.writeToFile(component, entry);
    }
  }

  /**
   * Write entry to file
   */
  writeToFile(component, entry) {
    try {
      const filePath = this.getLogFilePath(component);
      fs.appendFileSync(filePath, entry + '\n', 'utf-8');

      // Check file size and rotate if needed
      const stats = fs.statSync(filePath);
      if (stats.size > this.options.maxFileSize) {
        this.rotateLogFile(filePath);
      }
    } catch (error) {
      console.error(`Logger failed to write to ${component}: ${error.message}`);
    }
  }

  /**
   * Rotate log file when it gets too large
   */
  rotateLogFile(filePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = filePath.replace('.log', `.${timestamp}.log`);
    fs.renameSync(filePath, backupPath);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Start a named session (group of related logs)
   */
  startSession(name, component = 'general') {
    this.logSessions[name] = {
      component,
      startTime: Date.now(),
      startIndent: this.indentLevel,
    };
    this.indent();
    this.info(component, `► START SESSION: ${name}`);
  }

  /**
   * End a named session
   */
  endSession(name, component = 'general') {
    if (this.logSessions[name]) {
      const duration = Date.now() - this.logSessions[name].startTime;
      this.info(component, `◄ END SESSION: ${name} (${duration}ms)`);
      this.unindent();
      delete this.logSessions[name];
    }
  }

  /**
   * Increase indent level
   */
  indent() {
    this.indentLevel++;
  }

  /**
   * Decrease indent level
   */
  unindent() {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
  }

  /**
   * Error level
   */
  error(component, message, data) {
    this.write('error', component, message, data);
  }

  /**
   * Warning level
   */
  warn(component, message, data) {
    this.write('warn', component, message, data);
  }

  /**
   * Info level
   */
  info(component, message, data) {
    this.write('info', component, message, data);
  }

  /**
   * Debug level
   */
  debug(component, message, data) {
    this.write('debug', component, message, data);
  }

  /**
   * Trace level (most verbose)
   */
  trace(component, message, data) {
    this.write('trace', component, message, data);
  }

  /**
   * Log a method entry/exit pair
   */
  methodEntry(component, methodName, params = null) {
    this.indent();
    this.trace(component, `→ ${methodName}()`, params);
  }

  /**
   * Log method exit
   */
  methodExit(component, methodName, result = null) {
    this.trace(component, `← ${methodName}()`, result);
    this.unindent();
  }

  /**
   * Log a successful step
   */
  success(component, message, data) {
    this.write('info', component, `✓ ${message}`, data);
  }

  /**
   * Log a failure
   */
  failure(component, message, error) {
    this.write('error', component, `✗ ${message}`, error);
  }

  /**
   * Log a step count (e.g., "Found 5 widgets")
   */
  count(component, label, count) {
    this.write('info', component, `${label}: ${count}`);
  }

  /**
   * Create a scoped logger for a specific component
   */
  createComponentLogger(componentName) {
    return {
      error: (msg, data) => this.error(componentName, msg, data),
      warn: (msg, data) => this.warn(componentName, msg, data),
      info: (msg, data) => this.info(componentName, msg, data),
      debug: (msg, data) => this.debug(componentName, msg, data),
      trace: (msg, data) => this.trace(componentName, msg, data),
      success: (msg, data) => this.success(componentName, msg, data),
      failure: (msg, err) => this.failure(componentName, msg, err),
      methodEntry: (method, params) => this.methodEntry(componentName, method, params),
      methodExit: (method, result) => this.methodExit(componentName, method, result),
      startSession: (name) => this.startSession(name, componentName),
      endSession: (name) => this.endSession(name, componentName),
      indent: () => this.indent(),
      unindent: () => this.unindent(),
    };
  }

  /**
   * Get all logs as a single string
   */
  getAllLogs() {
    return this.logs.join('\n');
  }

  /**
   * Save all logs to files
   */
  saveLogs() {
    try {
      const allLogsPath = path.join(this.options.debugDir, '_all.log');
      fs.writeFileSync(allLogsPath, this.getAllLogs(), 'utf-8');
      return allLogsPath;
    } catch (error) {
      console.error('Failed to save logs:', error.message);
      return null;
    }
  }

  /**
   * Clear debug directory
   */
  clearDebugDir() {
    try {
      if (fs.existsSync(this.options.debugDir)) {
        fs.rmSync(this.options.debugDir, { recursive: true, force: true });
        this.ensureDebugDir();
      }
    } catch (error) {
      console.error('Failed to clear debug directory:', error.message);
    }
  }

  /**
   * Read all debug files and return as object
   */
  readDebugFiles() {
    const files = {};
    try {
      const entries = fs.readdirSync(this.options.debugDir);
      entries.forEach((file) => {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.options.debugDir, file);
          files[file] = fs.readFileSync(filePath, 'utf-8');
        }
      });
    } catch (error) {
      console.error('Failed to read debug files:', error.message);
    }
    return files;
  }

  /**
   * Get analysis report of logs (counts, errors, warnings, etc.)
   */
  getReport() {
    const report = {
      totalEntries: this.logs.length,
      errors: 0,
      warnings: 0,
      info: 0,
      debug: 0,
      trace: 0,
      sessions: Object.keys(this.logSessions).length,
      debugFiles: [],
    };

    this.logs.forEach((log) => {
      if (log.includes('[ERROR]')) report.errors++;
      else if (log.includes('[WARN]')) report.warnings++;
      else if (log.includes('[INFO]')) report.info++;
      else if (log.includes('[DEBUG]')) report.debug++;
      else if (log.includes('[TRACE]')) report.trace++;
    });

    try {
      report.debugFiles = fs.readdirSync(this.options.debugDir)
        .filter((f) => f.endsWith('.log'));
    } catch (error) {
      // Ignore
    }

    return report;
  }
}

/**
 * Global singleton logger instance
 */
let globalLogger = null;

export function initLogger(options = {}) {
  globalLogger = new Logger(options);
  return globalLogger;
}

export function getLogger() {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

export { Logger };
