// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * FlutterJS File Watcher System - Complete Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. Advanced file watching with Chokidar
 * 2. File change detection and debouncing
 * 3. Hot Module Replacement triggering
 * 4. Configuration change handling
 * 5. Dependency tracking
 * 6. Smart change detection (HMR vs Full Reload)
 * 7. File type categorization
 * 8. Automatic rebuilding
 * 9. Error recovery
 * 10. Performance optimization
 * 
 * Location: cli/server/file-watcher.js
 * Usage:
 *   const watcher = new FileWatcher(config, callbacks);
 *   await watcher.start();
 */

const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// ============================================================================
// CONSTANTS
// ============================================================================

const FILE_TYPES = {
  FJS: '.fjs',
  JS: '.js',
  CSS: '.css',
  HTML: '.html',
  JSON: '.json',
  IMAGE: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
  FONT: ['.woff', '.woff2', '.ttf', '.otf'],
  CONFIG: ['flutterjs.config.js', 'package.json', '.env'],
};

const CHANGE_TYPES = {
  ADD: 'add',
  CHANGE: 'change',
  UNLINK: 'unlink',
};

const DEBOUNCE_DELAYS = {
  fjs: 300,          // .fjs files
  css: 200,          // CSS files
  config: 1000,      // Config files
  assets: 500,       // Images, fonts
  default: 400,      // Default
};

// ============================================================================
// FILE WATCHER CLASS
// ============================================================================

class FileWatcher {
  constructor(config, callbacks = {}) {
    this.config = config;
    this.callbacks = {
      onFileChange: callbacks.onFileChange || (() => {}),
      onConfigChange: callbacks.onConfigChange || (() => {}),
      onHMR: callbacks.onHMR || (() => {}),
      onReload: callbacks.onReload || (() => {}),
      onError: callbacks.onError || (() => {}),
      onAnalyze: callbacks.onAnalyze || (() => {}),
      ...callbacks,
    };

    // Project paths
    this.projectRoot = config.projectRoot || process.cwd();
    this.sourceDir = config.sourceDir || 'lib';
    this.publicDir = config.publicDir || 'public';
    this.assetsDir = config.assetsDir || 'assets';

    // Watcher state
    this.watcher = null;
    this.isRunning = false;
    this.isReady = false;

    // Debouncing
    this.debounceTimers = new Map();
    this.pendingChanges = new Map();

    // Change tracking
    this.changeHistory = [];
    this.maxHistorySize = 100;
    this.affectedModules = new Set();

    // Configuration
    this.verbose = config.verbose || false;
    this.ignorePatterns = this._getIgnorePatterns();
    this.watchPaths = this._getWatchPaths();

    // Performance tracking
    this.stats = {
      fileChanges: 0,
      reloads: 0,
      hmrUpdates: 0,
      configChanges: 0,
      startTime: null,
    };
  }

  /**
   * Get paths to watch
   * @private
   */
  _getWatchPaths() {
    const basePath = this.projectRoot;
    return [
      path.join(basePath, this.sourceDir),
      path.join(basePath, this.publicDir),
      path.join(basePath, this.assetsDir),
      path.join(basePath, 'flutterjs.config.js'),
      path.join(basePath, '.env'),
      path.join(basePath, '.env.local'),
    ].filter(p => {
      // Only include paths that exist or are important config files
      const filename = path.basename(p);
      return fs.existsSync(p) || FILE_TYPES.CONFIG.includes(filename);
    });
  }

  /**
   * Get ignore patterns for watcher
   * @private
   */
  _getIgnorePatterns() {
    return [
      '**/node_modules/**',
      '**/.git/**',
      '**/.flutterjs/**',
      '**/dist/**',
      '**/.dev/**',
      '**/build/**',
      '**/.cache/**',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.log',
      '**/npm-debug.log*',
      '**/.vscode/**',
      '**/.idea/**',
      '**/*.swp',
      '**/*.swo',
      '**/*~',
    ];
  }

  /**
   * Start watching files
   */
  async start() {
    try {
      console.log(chalk.blue('\n📁 Starting file watcher...\n'));

      this.stats.startTime = Date.now();

      // Create watcher instance
      this.watcher = chokidar.watch(this.watchPaths, {
        ignoreInitial: true,
        ignored: this.ignorePatterns,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
        usePolling: process.platform === 'win32',
        alwaysStat: true,
        depth: 10,
      });

      // Setup event handlers
      this._setupEventHandlers();

      // Wait for watcher to be ready
      await new Promise((resolve) => {
        this.watcher.on('ready', () => {
          this.isReady = true;
          this.isRunning = true;
          console.log(chalk.green('✓ File watcher ready\n'));
          console.log(chalk.gray('👁 Watching for changes...\n'));
          resolve();
        });
      });

      return this.watcher;

    } catch (error) {
      console.error(chalk.red('✗ Failed to start file watcher:'));
      console.error(chalk.red(`  ${error.message}\n`));
      throw error;
    }
  }

  /**
   * Setup event handlers for watcher
   * @private
   */
  _setupEventHandlers() {
    // File added
    this.watcher.on('add', (filePath) => {
      this._handleFileChange(filePath, CHANGE_TYPES.ADD);
    });

    // File modified
    this.watcher.on('change', (filePath) => {
      this._handleFileChange(filePath, CHANGE_TYPES.CHANGE);
    });

    // File deleted
    this.watcher.on('unlink', (filePath) => {
      this._handleFileChange(filePath, CHANGE_TYPES.UNLINK);
    });

    // Watch errors
    this.watcher.on('error', (error) => {
      console.error(chalk.red('Watcher error:'), error);
      this.callbacks.onError(error);
    });
  }

  /**
   * Handle file change
   * @private
   */
  _handleFileChange(filePath, changeType) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const ext = path.extname(filePath);
    const filename = path.basename(filePath);

    // Log change
    if (this.verbose) {
      console.log(
        chalk.cyan(`[${changeType.toUpperCase()}]`) + ' ' +
        chalk.gray(relativePath)
      );
    }

    // Store in history
    this._recordChange(filePath, changeType);

    // Categorize file
    const fileType = this._categorizeFile(filePath, ext);

    // Handle based on file type
    switch (fileType) {
      case 'fjs':
        this._handleFjsChange(filePath, changeType, relativePath);
        break;

      case 'css':
        this._handleCssChange(filePath, changeType, relativePath);
        break;

      case 'html':
        this._handleHtmlChange(filePath, changeType, relativePath);
        break;

      case 'config':
        this._handleConfigChange(filePath, changeType, relativePath);
        break;

      case 'asset':
        this._handleAssetChange(filePath, changeType, relativePath);
        break;

      default:
        this._handleGeneralChange(filePath, changeType, relativePath);
    }

    // Notify all listeners
    this.callbacks.onFileChange({
      file: relativePath,
      changeType,
      fileType,
      timestamp: Date.now(),
    });

    this.stats.fileChanges++;
  }

  /**
   * Handle .fjs file changes
   * @private
   */
  _handleFjsChange(filePath, changeType, relativePath) {
    const debounceKey = `fjs:${filePath}`;
    const delay = DEBOUNCE_DELAYS.fjs;

    this._debounce(debounceKey, async () => {
      try {
        if (changeType === CHANGE_TYPES.UNLINK) {
          console.log(chalk.yellow(`🗑  File deleted: ${relativePath}`));
          this.callbacks.onReload(`Widget removed: ${relativePath}`);
          this.stats.reloads++;
          return;
        }

        // Analyze file changes
        const metadata = await this.callbacks.onAnalyze?.(filePath);

        // Get affected widgets
        const affectedWidgets = this._getAffectedWidgets(filePath, metadata);

        // Determine if can hot reload
        if (this._canHotReload(filePath, affectedWidgets)) {
          console.log(
            chalk.cyan('🔄 Hot reloading: ') + chalk.gray(relativePath)
          );

          this.callbacks.onHMR({
            file: relativePath,
            widgets: affectedWidgets,
            timestamp: Date.now(),
          });

          this.stats.hmrUpdates++;
        } else {
          console.log(
            chalk.yellow('🔁 Full reload: ') + chalk.gray(relativePath)
          );

          this.callbacks.onReload(
            `Entry point or root widget changed: ${relativePath}`
          );

          this.stats.reloads++;
        }

      } catch (error) {
        console.error(
          chalk.red(`Error handling .fjs change: ${error.message}`)
        );
        this.callbacks.onError(error);
        this.callbacks.onReload(`Error in ${relativePath}: ${error.message}`);
      }
    }, delay);
  }

  /**
   * Handle CSS file changes
   * @private
   */
  _handleCssChange(filePath, changeType, relativePath) {
    const debounceKey = `css:${filePath}`;
    const delay = DEBOUNCE_DELAYS.css;

    this._debounce(debounceKey, () => {
      if (changeType === CHANGE_TYPES.UNLINK) {
        console.log(chalk.yellow(`🗑  Stylesheet removed: ${relativePath}`));
        this.callbacks.onReload(`Stylesheet removed: ${relativePath}`);
        this.stats.reloads++;
        return;
      }

      console.log(chalk.cyan('🎨 CSS updated: ') + chalk.gray(relativePath));

      // CSS changes typically don't need full reload
      this.callbacks.onHMR({
        file: relativePath,
        type: 'css',
        timestamp: Date.now(),
      });

      this.stats.hmrUpdates++;
    }, delay);
  }

  /**
   * Handle HTML file changes
   * @private
   */
  _handleHtmlChange(filePath, changeType, relativePath) {
    const debounceKey = `html:${filePath}`;
    const delay = DEBOUNCE_DELAYS.config; // HTML changes need full reload

    this._debounce(debounceKey, () => {
      console.log(chalk.yellow('📄 HTML changed: ') + chalk.gray(relativePath));

      // HTML changes always require full reload
      this.callbacks.onReload(`HTML template changed: ${relativePath}`);
      this.stats.reloads++;
    }, delay);
  }

  /**
   * Handle configuration file changes
   * @private
   */
  _handleConfigChange(filePath, changeType, relativePath) {
    const debounceKey = `config:${filePath}`;
    const delay = DEBOUNCE_DELAYS.config;
    const filename = path.basename(filePath);

    this._debounce(debounceKey, () => {
      console.log(chalk.yellow('⚙️  Config changed: ') + chalk.gray(filename));

      // Config changes require server restart or full reload
      this.callbacks.onConfigChange({
        file: relativePath,
        changeType,
        timestamp: Date.now(),
      });

      this.callbacks.onReload(`Configuration changed: ${filename}`);
      this.stats.configChanges++;
      this.stats.reloads++;
    }, delay);
  }

  /**
   * Handle asset changes (images, fonts)
   * @private
   */
  _handleAssetChange(filePath, changeType, relativePath) {
    const debounceKey = `asset:${filePath}`;
    const delay = DEBOUNCE_DELAYS.assets;

    this._debounce(debounceKey, () => {
      const type = this._getAssetType(filePath);

      if (changeType === CHANGE_TYPES.UNLINK) {
        console.log(
          chalk.yellow(`🗑  ${type} removed: `) + chalk.gray(relativePath)
        );
      } else {
        console.log(
          chalk.cyan(`🖼  ${type} updated: `) + chalk.gray(relativePath)
        );
      }

      // Assets can use HMR
      this.callbacks.onHMR({
        file: relativePath,
        type: 'asset',
        assetType: type,
        timestamp: Date.now(),
      });

      this.stats.hmrUpdates++;
    }, delay);
  }

  /**
   * Handle general file changes
   * @private
   */
  _handleGeneralChange(filePath, changeType, relativePath) {
    const debounceKey = `general:${filePath}`;
    const delay = DEBOUNCE_DELAYS.default;

    this._debounce(debounceKey, () => {
      if (changeType === CHANGE_TYPES.UNLINK) {
        console.log(chalk.yellow(`🗑  File removed: `) + chalk.gray(relativePath));
      } else {
        console.log(chalk.cyan('📝 File changed: ') + chalk.gray(relativePath));
      }

      // General changes trigger HMR
      this.callbacks.onHMR({
        file: relativePath,
        changeType,
        timestamp: Date.now(),
      });

      this.stats.hmrUpdates++;
    }, delay);
  }

  /**
   * Debounce file change handling
   * @private
   */
  _debounce(key, callback, delay) {
    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Categorize file type
   * @private
   */
  _categorizeFile(filePath, ext) {
    const filename = path.basename(filePath);

    // Check config files
    if (FILE_TYPES.CONFIG.includes(filename)) {
      return 'config';
    }

    // Check by extension
    if (ext === FILE_TYPES.FJS) return 'fjs';
    if (ext === FILE_TYPES.CSS) return 'css';
    if (ext === FILE_TYPES.HTML) return 'html';
    if (FILE_TYPES.IMAGE.includes(ext)) return 'asset';
    if (FILE_TYPES.FONT.includes(ext)) return 'asset';

    return 'other';
  }

  /**
   * Get asset type description
   * @private
   */
  _getAssetType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (FILE_TYPES.IMAGE.includes(ext)) {
      return 'Image';
    }
    if (FILE_TYPES.FONT.includes(ext)) {
      return 'Font';
    }

    return 'Asset';
  }

  /**
   * Determine if file can be hot reloaded
   * @private
   */
  _canHotReload(filePath, affectedWidgets) {
    const filename = path.basename(filePath);
    const relativePath = path.relative(this.projectRoot, filePath);

    // Never hot reload these files
    const noHotReloadPatterns = [
      'main.fjs',
      'index.fjs',
      'app.fjs',
      'entry.fjs',
      'flutterjs.config.js',
      'package.json',
      '.env',
    ];

    for (const pattern of noHotReloadPatterns) {
      if (filename.includes(pattern) || relativePath.includes(pattern)) {
        return false;
      }
    }

    // Never hot reload if no affected widgets (shouldn't happen)
    if (!affectedWidgets || affectedWidgets.length === 0) {
      return false;
    }

    // Don't hot reload root widgets
    const rootWidgets = ['MyApp', 'App', 'Root', 'main'];
    const hasRootWidget = affectedWidgets.some(w =>
      rootWidgets.some(r => w.toLowerCase().includes(r.toLowerCase()))
    );

    if (hasRootWidget) {
      return false;
    }

    return true;
  }

  /**
   * Get affected widgets from analysis metadata
   * @private
   */
  _getAffectedWidgets(filePath, metadata) {
    if (!metadata || !metadata.widgets) {
      return [];
    }

    // Extract widget names from metadata
    const widgets = Object.keys(metadata.widgets || {});
    this.affectedModules.set(filePath, widgets);

    return widgets;
  }

  /**
   * Record change in history
   * @private
   */
  _recordChange(filePath, changeType) {
    const change = {
      file: path.relative(this.projectRoot, filePath),
      type: changeType,
      timestamp: Date.now(),
    };

    this.changeHistory.push(change);

    // Keep only recent changes
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Stop watching files
   */
  async stop() {
    console.log(chalk.yellow('\n\n👋 Stopping file watcher...\n'));

    return new Promise((resolve) => {
      // Clear all pending debounce timers
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();

      // Close watcher
      if (this.watcher) {
        this.watcher.close();
      }

      this.isRunning = false;
      this.isReady = false;

      console.log(chalk.green('✓ File watcher stopped\n'));
      resolve();
    });
  }

  /**
   * Pause watching temporarily
   */
  pause() {
    if (this.watcher) {
      this.watcher.unwatch(this.watchPaths);
      this.isRunning = false;
      console.log(chalk.yellow('⏸  File watcher paused'));
    }
  }

  /**
   * Resume watching
   */
  resume() {
    if (this.watcher) {
      this.watcher.add(this.watchPaths);
      this.isRunning = true;
      console.log(chalk.green('▶️  File watcher resumed'));
    }
  }

  /**
   * Get change history
   */
  getChangeHistory() {
    return [...this.changeHistory];
  }

  /**
   * Get affected modules for a file
   */
  getAffectedModules(filePath) {
    return this.affectedModules.get(filePath) || [];
  }

  /**
   * Clear affected modules cache
   */
  clearAffectedModulesCache() {
    this.affectedModules.clear();
  }

  /**
   * Get watcher statistics
   */
  getStats() {
    const uptime = this.stats.startTime
      ? Date.now() - this.stats.startTime
      : 0;

    return {
      ...this.stats,
      uptime,
      uptimeFormatted: this._formatUptime(uptime),
      isRunning: this.isRunning,
      isReady: this.isReady,
      pendingChanges: this.debounceTimers.size,
      historySize: this.changeHistory.length,
    };
  }

  /**
   * Format uptime duration
   * @private
   */
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Print watcher statistics to console
   */
  printStats() {
    const stats = this.getStats();

    console.log(chalk.blue('\n📊 File Watcher Statistics\n'));
    console.log(chalk.gray(`Status: ${stats.isRunning ? chalk.green('Running') : chalk.red('Stopped')}`));
    console.log(chalk.gray(`Uptime: ${stats.uptimeFormatted}`));
    console.log(chalk.gray(`File Changes: ${stats.fileChanges}`));
    console.log(chalk.gray(`HMR Updates: ${stats.hmrUpdates}`));
    console.log(chalk.gray(`Full Reloads: ${stats.reloads}`));
    console.log(chalk.gray(`Config Changes: ${stats.configChanges}`));
    console.log(chalk.gray(`Pending Debounces: ${stats.pendingChanges}`));
    console.log(chalk.gray(`Change History: ${stats.historySize}/${this.maxHistorySize}\n`));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FileWatcher,
  FILE_TYPES,
  CHANGE_TYPES,
  DEBOUNCE_DELAYS,
};
