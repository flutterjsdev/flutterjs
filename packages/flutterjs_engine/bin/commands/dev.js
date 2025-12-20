/**
 * ============================================================================
 * FlutterJS Development Server - Complete Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. HTTP server with middleware support
 * 2. Hot Module Replacement (HMR) with WebSocket
 * 3. File watching & change detection
 * 4. API endpoints for build analysis
 * 5. Static asset serving with caching
 * 6. CORS support for development
 * 7. Error overlay for build failures
 * 8. Live reload triggering
 * 9. Proxy support for API calls
 * 10. Browser auto-open functionality
 * 
 * Location: cli/server/dev-server.js
 * Usage:
 *   const devServer = new DevServer(config, projectContext);
 *   await devServer.start();
 */

const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const { execSync } = require('child_process');
const open = require('open');
const compression = require('compression');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

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
  '.otf': 'font/otf',
  '.txt': 'text/plain',
  '.webp': 'image/webp',
  '.map': 'application/json',
};

const DEVELOPMENT_DEPENDENCIES = {
  express: true,
  'ws': true,
  'chokidar': true,
  'compression': true,
  'cors': true,
  'http-proxy-middleware': true,
  'open': true,
};

// ============================================================================
// DEVELOPMENT SERVER CLASS
// ============================================================================

class DevServer {
  constructor(config, projectContext) {
    this.config = config;
    this.projectContext = projectContext;
    
    // Server state
    this.app = null;
    this.server = null;
    this.wss = null;
    this.fileWatcher = null;
    this.isRunning = false;
    this.buildAnalysisData = null;
    
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
    
    // Client connections
    this.clients = new Set();
    this.lastBuildTime = null;
  }

  /**
   * Start development server
   */
  async start() {
    try {
      console.log(chalk.blue('\n🚀 Starting development server...\n'));

      // 1. Initialize Express app
      this._initializeApp();

      // 2. Setup middleware
      this._setupMiddleware();

      // 3. Setup routes
      this._setupRoutes();

      // 4. Create HTTP server
      this.server = http.createServer(this.app);

      // 5. Setup WebSocket for HMR
      this._setupWebSocket();

      // 6. Setup file watcher
      this._setupFileWatcher();

      // 7. Start listening
      await this._listen();

      // 8. Open browser (if requested)
      if (this.config.dev?.behavior?.open) {
        setTimeout(() => this._openBrowser(), 500);
      }

      this.isRunning = true;

      return this.server;

    } catch (error) {
      console.error(chalk.red('\n❌ Failed to start dev server:'));
      console.error(chalk.red(`${error.message}\n`));
      throw error;
    }
  }

  /**
   * Initialize Express application
   */
  _initializeApp() {
    this.app = express();

    // Disable x-powered-by header
    this.app.disable('x-powered-by');

    // Set trust proxy
    this.app.set('trust proxy', 1);
  }

  /**
   * Setup Express middleware
   */
  _setupMiddleware() {
    // 1. Compression
    this.app.use(compression());

    // 2. CORS
    if (this.config.dev?.server?.cors) {
      this.app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        optionsSuccessStatus: 200,
      }));
    }

    // 3. Development headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Dev-Server', 'FlutterJS');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });

    // 4. Request logging
    this.app.use((req, res, next) => {
      const originalEnd = res.end;

      res.end = function(...args) {
        const statusCode = res.statusCode;
        const method = req.method;
        const url = req.url;
        const timestamp = new Date().toLocaleTimeString();

        const statusColor = statusCode >= 400 ? chalk.red : 
                           statusCode >= 300 ? chalk.yellow : chalk.green;

        console.log(
          `${statusColor(statusCode)}${chalk.reset()} ` +
          `${chalk.gray(method)} ${url} - ${chalk.gray(timestamp)}`
        );

        originalEnd.apply(res, args);
      };

      next();
    });

    // 5. API proxy
    if (this.config.dev?.proxy) {
      Object.entries(this.config.dev.proxy).forEach(([path, target]) => {
        this.app.use(path, createProxyMiddleware({
          target,
          changeOrigin: true,
          logLevel: 'warn',
          onError: (err, req, res) => {
            console.error(chalk.red(`Proxy error for ${path}:`), err.message);
            res.status(502).json({
              error: 'Proxy error',
              message: err.message,
            });
          },
        }));
      });
    }

    // 6. JSON & URL-encoded body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // 7. Static files middleware
    this.app.use(express.static(this.buildDir, {
      maxAge: 0,
      etag: false,
    }));
  }

  /**
   * Setup Express routes
   */
  _setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // API: Get build analysis
    this.app.get('/api/build-analysis', (req, res) => {
      try {
        if (!this.buildAnalysisData) {
          return res.status(404).json({
            error: 'No build analysis available',
            message: 'Run build first to generate analysis',
          });
        }

        res.json({
          ...this.buildAnalysisData,
          lastUpdate: this.lastBuildTime,
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to fetch analysis',
          message: error.message,
        });
      }
    });

    // API: Get build errors
    this.app.get('/api/build-errors', (req, res) => {
      try {
        const errors = this.buildAnalysisData?.analysisErrors || [];

        res.json({
          errors,
          count: errors.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to fetch errors',
          message: error.message,
        });
      }
    });

    // API: Update build analysis
    this.app.post('/api/build-analysis', (req, res) => {
      try {
        this.buildAnalysisData = req.body;
        this.lastBuildTime = new Date().toISOString();

        // Broadcast to all connected clients
        this._broadcastToClients({
          type: 'analysis-update',
          data: this.buildAnalysisData,
          timestamp: this.lastBuildTime,
        });

        res.json({
          success: true,
          message: 'Analysis updated',
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to update analysis',
          message: error.message,
        });
      }
    });

    // API: File change notification
    this.app.post('/api/file-changed', (req, res) => {
      try {
        const { file, type } = req.body;

        this._broadcastToClients({
          type: 'file-changed',
          data: { file, type },
          timestamp: new Date().toISOString(),
        });

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to notify file change',
          message: error.message,
        });
      }
    });

    // API: Request full reload
    this.app.post('/api/reload', (req, res) => {
      this._broadcastToClients({
        type: 'reload',
        reason: req.body?.reason || 'Server requested reload',
      });

      res.json({ success: true });
    });

    // API: Get server info
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

    // SPA fallback: Serve index.html for unknown routes
    this.app.get('*', (req, res) => {
      const indexPath = path.join(this.buildDir, 'index.html');

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          error: 'Not found',
          path: req.url,
          message: 'File not found and no index.html available',
        });
      }
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error(chalk.red('Server error:'), err);

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Unknown error',
      });
    });
  }

  /**
   * Setup WebSocket for HMR
   */
  _setupWebSocket() {
    this.wss = new WebSocket.Server({
      noServer: true,
      perMessageDeflate: false,
    });

    this.server.on('upgrade', (request, socket, head) => {
      // Only allow WebSocket upgrade from same origin
      const origin = request.headers.origin;
      const host = request.headers.host;

      if (origin && !origin.includes(host)) {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    // Handle WebSocket connections
    this.wss.on('connection', (ws, request) => {
      const clientId = this._generateClientId();
      const clientIp = request.socket.remoteAddress;

      console.log(chalk.cyan(`HMR client connected: ${clientId} (${clientIp})`));

      this.clients.add(ws);

      // Send initial state
      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
        hmrEnabled: this.hmrEnabled,
        timestamp: new Date().toISOString(),
      }));

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleClientMessage(message, ws, clientId);
        } catch (error) {
          console.error(chalk.red('Failed to parse client message:'), error);
        }
      });

      // Handle client disconnection
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(chalk.cyan(`HMR client disconnected: ${clientId}`));
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(chalk.red(`WebSocket error (${clientId}):`), error.message);
      });
    });
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
        break;

      case 'error':
        console.error(chalk.red(`Client ${clientId} error:`), message.data);
        break;

      case 'custom':
        // Allow clients to send custom messages
        this._broadcastToClients({
          type: 'custom',
          data: message.data,
          from: clientId,
        }, ws);
        break;

      default:
        if (message.type.startsWith('custom:')) {
          // Custom message type
          this._broadcastToClients(message, ws);
        }
        break;
    }
  }

  /**
   * Setup file watcher
   */
  _setupFileWatcher() {
    const watchPaths = [
      this.sourceDir,
      path.join(this.projectRoot, 'public'),
      path.join(this.projectRoot, 'assets'),
      path.join(this.projectRoot, 'flutterjs.config.js'),
    ];

    const ignorePaths = [
      '**/node_modules/**',
      '**/.git/**',
      '**/.flutterjs/**',
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
      usePolling: process.platform === 'win32',
    });

    // File changed
    this.fileWatcher.on('change', (filePath) => {
      this._handleFileChange(filePath, 'change');
    });

    // File added
    this.fileWatcher.on('add', (filePath) => {
      this._handleFileChange(filePath, 'add');
    });

    // File deleted
    this.fileWatcher.on('unlink', (filePath) => {
      this._handleFileChange(filePath, 'unlink');
    });

    console.log(chalk.gray('👀 Watching for file changes...\n'));
  }

  /**
   * Handle file changes
   */
  _handleFileChange(filePath, eventType) {
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

    // Determine if full reload needed
    if (
      filePath.includes('flutterjs.config.js') ||
      filePath.includes('package.json') ||
      ext === '.html'
    ) {
      this._broadcastReload('Configuration or HTML changed');
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
        console.log(chalk.blue('📍 URLs:\n'));
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
        client.send(data);
      }
    });
  }

  /**
   * Request page reload on all clients
   */
  _broadcastReload(reason = 'Server requested reload') {
    this._broadcastToClients({
      type: 'reload',
      reason,
      timestamp: new Date().toISOString(),
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
   * Update build analysis data
   */
  updateBuildAnalysis(analysisData) {
    this.buildAnalysisData = analysisData;
    this.lastBuildTime = new Date().toISOString();

    this._broadcastToClients({
      type: 'analysis-update',
      data: analysisData,
      timestamp: this.lastBuildTime,
    });
  }

  /**
   * Report build error to clients
   */
  reportBuildError(error) {
    this._broadcastToClients({
      type: 'build-error',
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Gracefully shut down server
   */
  async stop() {
    console.log(chalk.yellow('\n\n👋 Shutting down development server...\n'));

    return new Promise((resolve, reject) => {
      // Close all WebSocket connections
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
    console.log(chalk.gray(`Uptime: ${(stats.uptime).toFixed(2)}s`));
    console.log(chalk.gray(`Memory: ${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  DevServer,
  MIME_TYPES,
};