/**
 * ============================================================================
 * FlutterJS Development Server - Updated with AppBuilder Support
 * ============================================================================
 * 
 * UPDATED TO:
 * - Run analyzer to get metadata
 * - Pass analysis data to AppBuilder
 * - Rebuild on file changes
 * - Support hot reload
 * - Serve analysis for DevTools
 * 
 * Location: cli/dev/dev.js
 */

import http from "http";
import express from "express";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import chokidar from "chokidar";
import { WebSocketServer } from "ws";
import { execSync } from "child_process";
import open from "open";
import compression from "compression";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

// Import FlutterJS systems
import { Analyzer } from "../../src/analyzer/src/analyzer.js";
import { BuildPipeline } from "./build_pipeline.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.fjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// ============================================================================
// DEVELOPMENT SERVER CLASS
// ============================================================================

export class DevServer {
  constructor(config, projectContext) {
    this.config = config;
    this.projectContext = projectContext;

    // Server state
    this.app = null;
    this.server = null;
    this.wss = null;
    this.fileWatcher = null;
    this.isRunning = false;

    // ===== NEW: Analysis and build state =====
    this.analyzer = null;
    this.buildPipeline = null;
    this.analysisData = null;
    this.lastBuildTime = null;
    this.isBuilding = false;

    // Port & host
    this.port = parseInt(config.dev?.server?.port || 3000, 10);
    this.host = config.dev?.server?.host || 'localhost';
    this.https = config.dev?.server?.https || false;

    // HMR settings
    this.hmrEnabled = config.dev?.hmr?.enabled !== false;
    this.hmrInterval = config.dev?.hmr?.interval || 300;
    this.overlayEnabled = config.dev?.hmr?.overlay !== false;

    // Paths
    this.projectRoot = projectContext.projectRoot;
    this.buildDir = path.join(this.projectRoot, '.dev');
    this.sourceDir = path.join(this.projectRoot, config.build?.source || 'lib');
    this.entryFile = config.entry?.main || 'lib/main.fjs';
    this.entryPath = path.join(this.projectRoot, this.entryFile);

    // Client connections
    this.clients = new Set();

    if (this.config.debugMode) {
      console.log(chalk.gray('[DevServer] Initialized with:'));
      console.log(chalk.gray(`  Entry: ${this.entryFile}`));
      console.log(chalk.gray(`  Build Dir: ${this.buildDir}`));
      console.log(chalk.gray(`  Port: ${this.port}\n`));
    }
  }

  /**
   * Start development server
   */
  async start() {
    try {
      console.log(chalk.blue('\n🚀 Starting development server...\n'));

      // ===== STEP 1: Initial Analysis =====
      console.log(chalk.cyan('Step 1: Running code analysis...'));
      await this.runAnalysis();

      // ===== STEP 2: Initial Build =====
      console.log(chalk.cyan('Step 2: Building application...'));
      await this.runBuild();

      // ===== STEP 3: Initialize Express =====
      console.log(chalk.cyan('Step 3: Initializing server...'));
      this._initializeApp();
      this._setupMiddleware();
      this._setupRoutes();

      // ===== STEP 4: Create HTTP Server =====
      this.server = http.createServer(this.app);

      // ===== STEP 5: Setup WebSocket for HMR =====
      this._setupWebSocket();

      // ===== STEP 6: Setup File Watcher =====
      this._setupFileWatcher();

      // ===== STEP 7: Start Listening =====
      await this._listen();

      // ===== STEP 8: Open Browser =====
      if (this.config.dev?.behavior?.open) {
        setTimeout(() => this._openBrowser(), 500);
      }

      this.isRunning = true;

      return this.server;

    } catch (error) {
      console.error(chalk.red('\n❌ Failed to start dev server:'));
      console.error(chalk.red(`${error.message}`));
      if (this.config.debugMode) {
        console.error(chalk.gray('\n🔍 Stack trace:'));
        console.error(chalk.gray(error.stack));
      }
      throw error;
    }
  }

  /**
   * ===== NEW METHOD: Run analyzer =====
   * Analyze source code and extract metadata
   */
  async runAnalysis() {
    try {
      if (!fs.existsSync(this.entryPath)) {
        throw new Error(`Entry file not found: ${this.entryPath}`);
      }

      // STEP 1: Read source code
      const sourceCode = fs.readFileSync(this.entryPath, 'utf-8');

      // STEP 2: Create Analyzer with sourceCode in constructor options
      this.analyzer = new Analyzer({
        sourceCode: sourceCode,        // ← Pass HERE in constructor
        sourceFile: this.entryPath,    // Also pass file path
        debugMode: this.config.debugMode,
        verbose: false,
        includeImports: true,
        includeContext: true,
        includeSsr: true
      });

      // STEP 3: Call analyze() with NO parameters
      this.analysisData = await this.analyzer.analyze();

      // STEP 4: Extract widget count safely
      const widgetsObj = this.analysisData?.widgets || {};
      const widgetCount = (widgetsObj.count || 0) + (widgetsObj.stateless || 0) + (widgetsObj.stateful || 0);

      console.log(chalk.green(`âœ" Analysis complete`));
      console.log(chalk.gray(`  Widgets found: ${widgetCount}`));
      console.log(chalk.gray(`  Imports: ${this.analysisData.imports?.total || 0}`));
      console.log(chalk.gray(`  State classes: ${this.analysisData.state?.stateClasses || 0}\n`));

      return this.analysisData;

    } catch (error) {
      console.error(chalk.red(`âœ— Analysis failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ===== NEW METHOD: Run build =====
   * Build application with analysis metadata
   */
  async runBuild() {
    if (this.isBuilding) {
      console.log(chalk.yellow('⚠  Build already in progress...'));
      return;
    }

    this.isBuilding = true;

    try {
      // Ensure build directory exists
      if (!fs.existsSync(this.buildDir)) {
        await fs.promises.mkdir(this.buildDir, { recursive: true });
      }

      console.log(chalk.cyan('Building application...\n'));

      // Create build pipeline
      const pipeline = new BuildPipeline({
        projectRoot: this.projectRoot,
        mode: 'development',
        target: 'spa',
        entry: {
          main: this.entryFile  // ← Pass as entry.main like in config
        },
        outputDir: '.dev',
        debugMode: this.config.debugMode || false,
        verbose: false
      });

      // Execute build
      const buildResult = await pipeline.run();

      if (!buildResult || !buildResult.success) {
        throw new Error('Build failed - no result returned');
      }

      this.lastBuildTime = new Date().toISOString();

      // Calculate bundle size safely
      const bundleSize = buildResult.stats?.bundleSize || 0;
      const bundleSizeKB = (bundleSize / 1024).toFixed(2);

      console.log(chalk.green(`✔ Build complete`));
      console.log(chalk.gray(`  Bundle size: ${bundleSizeKB} KB`));
      console.log(chalk.gray(`  Duration: ${buildResult.duration || 0}ms\n`));

      // Broadcast to clients if WebSocket is ready
      if (this.wss && this.clients.size > 0) {
        this._broadcastToClients({
          type: 'build-complete',
          data: {
            success: true,
            stats: buildResult.stats,
            timestamp: this.lastBuildTime
          }
        });
      }

      return buildResult;

    } catch (error) {
      console.error(chalk.red(`✗ Build failed: ${error.message}`));

      if (this.config.debugMode) {
        console.error(chalk.gray(`Stack: ${error.stack}`));
      }

      // Broadcast error to clients if WebSocket is ready
      if (this.wss && this.clients.size > 0) {
        this._broadcastToClients({
          type: 'build-error',
          data: {
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }

      throw error;

    } finally {
      this.isBuilding = false;
    }
  }

  /**
   * Helper: Broadcast to clients safely
   */
  _broadcastToClients(message, exclude = null) {
    if (!this.clients || this.clients.size === 0) {
      return;
    }

    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client !== exclude && client.readyState === 1) { // 1 = OPEN
        try {
          client.send(data);
        } catch (error) {
          console.error(chalk.red('Failed to send to client:'), error.message);
          this.clients.delete(client);
        }
      }
    });
  }
  /**
   * Initialize Express application
   */
  _initializeApp() {
    this.app = express();
    this.app.disable('x-powered-by');
    this.app.set('trust proxy', 1);
  }

  /**
   * Setup Express middleware
   */
  _setupMiddleware() {
    // Compression
    this.app.use(compression());

    // CORS
    if (this.config.dev?.server?.cors !== false) {
      this.app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
      }));
    }

    // Development headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Dev-Server', 'FlutterJS');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const originalEnd = res.end;

      res.end = function (...args) {
        const statusCode = res.statusCode;
        const statusColor = statusCode >= 400 ? chalk.red :
          statusCode >= 300 ? chalk.yellow : chalk.green;

        console.log(
          `${statusColor(statusCode)}${chalk.reset()} ` +
          `${chalk.gray(req.method)} ${req.url}`
        );

        originalEnd.apply(res, args);
      };

      next();
    });

    // API proxy
    const proxyConfig = this.config.dev?.proxy || this.config.dev?.behavior?.proxy || {};

    if (typeof proxyConfig === 'object' && Object.keys(proxyConfig).length > 0) {
      Object.entries(proxyConfig).forEach(([pathPattern, target]) => {
        try {
          if (pathPattern && pathPattern !== '*' && pathPattern !== '/*' && target) {
            const normalizedPath = pathPattern.startsWith('/') ? pathPattern : `/${pathPattern}`;

            this.app.use(normalizedPath, createProxyMiddleware({
              target,
              changeOrigin: true,
              logLevel: 'warn',
              onError: (err, req, res) => {
                console.error(chalk.red(`Proxy error for ${normalizedPath}:`, err.message));
                res.status(502).json({ error: 'Proxy error', message: err.message });
              },
            }));
          }
        } catch (error) {
          console.warn(chalk.yellow(`Could not setup proxy for "${pathPattern}": ${error.message}`));
        }
      });
    }

    // Body parsers
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use(express.static(this.buildDir, {
      maxAge: 0,
      etag: false,
    }));
  }

  /**
   * Setup Express routes
   */
  _setupRoutes() {
    // ===== NEW ROUTES FOR ANALYSIS METADATA =====

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // Get analysis metadata
    this.app.get('/api/analysis', (req, res) => {
      try {
        if (!this.analysisData) {
          return res.status(404).json({
            error: 'No analysis available',
            message: 'Run build first',
          });
        }

        res.json({
          ...this.analysisData,
          lastUpdate: this.lastBuildTime,
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to fetch analysis',
          message: error.message,
        });
      }
    });

    // Get build status
    this.app.get('/api/build-status', (req, res) => {
      res.json({
        isBuilding: this.isBuilding,
        lastBuildTime: this.lastBuildTime,
        analysis: this.analysisData ? {
          widgets: this.analysisData.widgets?.total || 0,
          imports: this.analysisData.imports?.length || 0,
        } : null,
      });
    });

    // Trigger rebuild
    this.app.post('/api/rebuild', async (req, res) => {
      try {
        console.log(chalk.cyan('\n📦 Manual rebuild requested...\n'));
        await this.runAnalysis();
        await this.runBuild();

        res.json({
          success: true,
          message: 'Rebuild complete',
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // Server info
    this.app.get('/api/server-info', (req, res) => {
      res.json({
        name: 'FlutterJS Dev Server',
        version: '1.0.0',
        uptime: process.uptime(),
        port: this.port,
        host: this.host,
        hmr: this.hmrEnabled,
        clients: this.clients.size,
        buildDir: this.buildDir,
      });
    });

    // SPA fallback
    this.app.get(/^(?!\/api\/).*/, (req, res) => {
      const indexPath = path.join(this.buildDir, 'index.html');

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          error: 'Not found',
          path: req.url,
        });
      }
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error(chalk.red('Server error:'), err.message);
      res.status(500).json({
        error: 'Internal server error',
        message: this.config.debugMode ? err.message : 'Unknown error',
      });
    });
  }

  /**
   * Setup WebSocket for HMR
   */
  _setupWebSocket() {
    try {
      this.wss = new WebSocketServer({
        noServer: true,
        perMessageDeflate: false,
      });

      // Handle upgrade requests
      this.server.on('upgrade', (request, socket, head) => {
        try {
          const origin = request.headers.origin;
          const host = request.headers.host;

          if (origin && !origin.includes(host)) {
            socket.destroy();
            return;
          }

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
          });
        } catch (error) {
          console.error(chalk.red('WebSocket upgrade error:'), error.message);
          socket.destroy();
        }
      });

      // Handle connections
      this.wss.on('connection', (ws, request) => {
        try {
          const clientId = this._generateClientId();
          const clientIp = request.socket.remoteAddress;

          console.log(chalk.cyan(`HMR client connected: ${clientId}`));

          this.clients.add(ws);

          // Send initial state with analysis data
          ws.send(JSON.stringify({
            type: 'connected',
            clientId,
            hmrEnabled: this.hmrEnabled,
            analysisData: this.analysisData,
            timestamp: new Date().toISOString(),
          }));

          // Handle client messages
          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              this._handleClientMessage(message, ws, clientId);
            } catch (error) {
              console.error(chalk.red(`Failed to parse message from ${clientId}:`, error.message));
            }
          });

          // Handle disconnection
          ws.on('close', (code, reason) => {
            this.clients.delete(ws);
            console.log(chalk.cyan(`HMR client disconnected: ${clientId}`));
          });

          // Handle errors
          ws.on('error', (error) => {
            console.error(chalk.red(`WebSocket error (${clientId}):`, error.message));
          });
        } catch (error) {
          console.error(chalk.red('Error handling WebSocket connection:'), error.message);
          ws.close(1011, 'Server error');
        }
      });

      this.wss.on('error', (error) => {
        console.error(chalk.red('WebSocket server error:'), error.message);
      });

    } catch (error) {
      throw new Error(`WebSocket setup failed: ${error.message}`);
    }
  }

  /**
   * Handle messages from HMR clients
   */
  _handleClientMessage(message, ws, clientId) {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'ready':
        console.log(chalk.cyan(`Client ${clientId} ready for HMR`));
        // Send current analysis
        ws.send(JSON.stringify({
          type: 'analysis-update',
          data: this.analysisData,
        }));
        break;

      case 'error':
        console.error(chalk.red(`Client ${clientId} error:`), message.data);
        break;

      default:
        break;
    }
  }

  /**
   * Setup file watcher for hot rebuild
   */
  _setupFileWatcher() {
    try {
      const watchPaths = [
        this.sourceDir,
        path.join(this.projectRoot, 'public'),
        path.join(this.projectRoot, 'flutterjs.config.js'),
      ].filter(p => fs.existsSync(p));

      if (watchPaths.length === 0) {
        console.warn(chalk.yellow('⚠ No source paths found to watch'));
        return;
      }

      const ignorePaths = [
        '**/node_modules/**',
        '**/.git/**',
        '**/.dev/**',
        '**/dist/**',
        '**/.DS_Store',
      ];

      this.fileWatcher = chokidar.watch(watchPaths, {
        ignoreInitial: true,
        ignored: ignorePaths,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      // File changed - trigger rebuild
      this.fileWatcher.on('change', (filePath) => {
        this._handleFileChange(filePath, 'change');
      });

      this.fileWatcher.on('add', (filePath) => {
        this._handleFileChange(filePath, 'add');
      });

      this.fileWatcher.on('unlink', (filePath) => {
        this._handleFileChange(filePath, 'unlink');
      });

      this.fileWatcher.on('error', (error) => {
        console.error(chalk.red('File watcher error:'), error.message);
      });

      console.log(chalk.gray('👀 Watching for file changes...\n'));

    } catch (error) {
      console.warn(chalk.yellow(`⚠ Could not setup file watcher: ${error.message}`));
    }
  }

  /**
   * Handle file changes - trigger rebuild
   */
  async _handleFileChange(filePath, eventType) {
    const relativePath = path.relative(this.projectRoot, filePath);
    const ext = path.extname(filePath);

    console.log(
      chalk.cyan(`[${eventType.toUpperCase()}]`) + ' ' +
      chalk.gray(relativePath)
    );

    // Broadcast to clients
    this._broadcastToClients({
      type: 'file-changed',
      data: {
        file: relativePath,
        eventType,
        extension: ext,
        timestamp: Date.now(),
      },
    });

    // Trigger rebuild if main files changed
    if (
      filePath.includes('flutterjs.config.js') ||
      filePath.includes('package.json') ||
      ext === '.fjs' ||
      ext === '.html'
    ) {
      try {
        await this.runAnalysis();
        await this.runBuild();

        // Broadcast rebuild complete
        this._broadcastToClients({
          type: 'rebuild-complete',
          data: {
            success: true,
            timestamp: this.lastBuildTime,
            analysisData: this.analysisData,
          },
        });
      } catch (error) {
        console.error(chalk.red('Rebuild failed:'), error.message);

        // Broadcast rebuild error
        this._broadcastToClients({
          type: 'rebuild-error',
          data: {
            error: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }

  /**
   * Start listening
   */
  async _listen() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        const protocol = this.https ? 'https' : 'http';
        const url = `${protocol}://${this.host}:${this.port}`;

        console.log(chalk.green('\n✅ Development server running!\n'));
        console.log(chalk.blue('🌐 URLs:\n'));
        console.log(chalk.cyan(`  Local:   ${url}`));
        console.log(chalk.cyan(`  Network: ${protocol}://127.0.0.1:${this.port}`));
        console.log(chalk.gray(`\n  Press Ctrl+C to stop\n`));

        resolve();
      });

      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(
            `Port ${this.port} is already in use!\n\n` +
            `Try:\n` +
            `  • Kill the process using port ${this.port}\n` +
            `  • Use a different port: flutterjs dev --port ${this.port + 1}\n`
          ));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Open browser
   */
  async _openBrowser() {
    try {
      const url = `http://${this.host}:${this.port}`;
      console.log(chalk.blue(`🌐 Opening browser at ${url}\n`));
      await open(url);
    } catch (error) {
      console.warn(chalk.yellow('⚠ Could not open browser automatically'));
    }
  }

  /**
   * Broadcast message to all HMR clients
   */
  _broadcastToClients(message, exclude = null) {
    const data = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (error) {
          console.error(chalk.red('Failed to send to client:'), error.message);
          this.clients.delete(client);
        }
      }
    });
  }

  /**
   * Generate unique client ID
   */
  _generateClientId() {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  /**
   * Gracefully shut down
   */
  async stop() {
    console.log(chalk.yellow('\n\n👋 Shutting down development server...\n'));

    return new Promise((resolve, reject) => {
      // Close WebSocket connections
      this.clients.forEach((client) => {
        client.close(1000, 'Server shutting down');
      });

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Close file watcher
      if (this.fileWatcher) {
        this.fileWatcher.close();
      }

      // Close HTTP server
      if (this.server) {
        this.server.close(() => {
          console.log(chalk.green('✅ Development server stopped\n'));
          resolve();
        });

        // Force close after 10 seconds
        setTimeout(() => {
          console.error(chalk.red('Force closing server'));
          process.exit(0);
        }, 10000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server stats
   */
  getStats() {
    return {
      running: this.isRunning,
      port: this.port,
      host: this.host,
      url: `http://${this.host}:${this.port}`,
      hmrEnabled: this.hmrEnabled,
      connectedClients: this.clients.size,
      buildDir: this.buildDir,
      isBuilding: this.isBuilding,
      lastBuildTime: this.lastBuildTime,
      analysisData: this.analysisData ? {
        widgets: this.analysisData.widgets?.total || 0,
        imports: this.analysisData.imports?.length || 0,
        stateClasses: this.analysisData.stateClasses?.length || 0,
      } : null,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Print server info
   */
  printInfo() {
    const stats = this.getStats();

    console.log(chalk.blue('\n📊 Development Server Info\n'));
    console.log(chalk.gray(`Status: ${stats.running ? chalk.green('Running') : chalk.red('Stopped')}`));
    console.log(chalk.gray(`URL: ${stats.url}`));
    console.log(chalk.gray(`HMR: ${stats.hmrEnabled ? chalk.green('Enabled') : chalk.red('Disabled')}`));
    console.log(chalk.gray(`Connected Clients: ${stats.connectedClients}`));
    console.log(chalk.gray(`Building: ${stats.isBuilding ? chalk.yellow('Yes') : chalk.green('No')}`));
    console.log(chalk.gray(`Last Build: ${stats.lastBuildTime || 'N/A'}`));

    if (stats.analysisData) {
      console.log(chalk.gray(`\nAnalysis:`));
      console.log(chalk.gray(`  Widgets: ${stats.analysisData.widgets}`));
      console.log(chalk.gray(`  Imports: ${stats.analysisData.imports}`));
      console.log(chalk.gray(`  State Classes: ${stats.analysisData.stateClasses}`));
    }

    console.log(chalk.gray(`\nUptime: ${stats.uptime.toFixed(2)}s`));
    console.log(chalk.gray(`Memory: ${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DevServer;