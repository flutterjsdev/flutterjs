/**
 * ============================================================================
 * FlutterJS Development Server - Fixed Version
 * ============================================================================
 * 
 * Fixes:
 * - Proper proxy configuration handling
 * - Server-side safe initialization
 * - No browser-only APIs during setup
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

      // 1. Ensure build directory exists
      try {
        if (!fs.existsSync(this.buildDir)) {
          fs.mkdirSync(this.buildDir, { recursive: true });
        }
      } catch (error) {
        throw new Error(`Failed to create build directory: ${error.message}`);
      }

      // 2. Initialize Express app
      try {
        this._initializeApp();
      } catch (error) {
        throw new Error(`Failed to initialize app: ${error.message}`);
      }

      // 3. Setup middleware
      try {
        this._setupMiddleware();
      } catch (error) {
        throw new Error(`Failed to setup middleware: ${error.message}`);
      }

      // 4. Setup routes
      try {
        this._setupRoutes();
      } catch (error) {
        throw new Error(`Failed to setup routes: ${error.message}`);
      }

      // 5. Create HTTP server
      try {
        this.server = http.createServer(this.app);
      } catch (error) {
        throw new Error(`Failed to create HTTP server: ${error.message}`);
      }

      // 6. Setup WebSocket for HMR
      try {
        this._setupWebSocket();
      } catch (error) {
        throw new Error(`Failed to setup WebSocket: ${error.message}`);
      }

      // 7. Setup file watcher (after ensuring paths exist)
      try {
        this._setupFileWatcher();
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Warning: File watcher setup failed: ${error.message}`));
        // Don't throw - file watcher is optional
      }

      // 8. Start listening
      try {
        await this._listen();
      } catch (error) {
        throw new Error(`Failed to start listening: ${error.message}`);
      }

      // 9. Open browser (if requested)
      if (this.config.dev?.behavior?.open) {
        setTimeout(() => this._openBrowser(), 500);
      }

      this.isRunning = true;

      return this.server;

    } catch (error) {
      console.error(chalk.red('\n❌ Failed to start dev server:'));
      console.error(chalk.red(`${error.message}`));
      if (process.env.DEBUG) {
        console.error(chalk.gray('\n📍 Stack trace:'));
        console.error(chalk.gray(error.stack));
      }
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
    if (this.config.dev?.server?.cors !== false) {
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

    // 5. API proxy - FIX: Only setup if proxy config exists and is valid
    const proxyConfig = this.config.dev?.proxy || this.config.dev?.behavior?.proxy || {};
    
    if (typeof proxyConfig === 'object' && Object.keys(proxyConfig).length > 0) {
      try {
        Object.entries(proxyConfig).forEach(([pathPattern, target]) => {
          try {
            // Validate path pattern
            if (!pathPattern || pathPattern.trim() === '') {
              console.warn(chalk.yellow(`⚠️  Skipping empty proxy pattern`));
              return;
            }

            // Skip invalid patterns like "*" or "/*"
            if (pathPattern === '*' || pathPattern === '/*') {
              console.warn(chalk.yellow(`⚠️  Skipping invalid proxy pattern: "${pathPattern}" (use /api or similar)`));
              return;
            }

            // Ensure path starts with /
            const normalizedPath = pathPattern.startsWith('/') ? pathPattern : `/${pathPattern}`;

            // Validate target URL
            if (!target || typeof target !== 'string') {
              console.warn(chalk.yellow(`⚠️  Skipping proxy - invalid target for ${normalizedPath}: ${target}`));
              return;
            }

            console.log(chalk.gray(`  Setting up proxy: ${normalizedPath} -> ${target}`));

            this.app.use(normalizedPath, createProxyMiddleware({
              target,
              changeOrigin: true,
              logLevel: 'warn',
              onError: (err, req, res) => {
                console.error(chalk.red(`Proxy error for ${normalizedPath}:`), err.message);
                res.status(502).json({
                  error: 'Proxy error',
                  message: err.message,
                  target: target
                });
              },
            }));

            if (process.env.DEBUG) {
              console.log(chalk.gray(`  ✓ Proxy configured: ${normalizedPath} -> ${target}`));
            }
          } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not setup proxy for "${pathPattern}": ${error.message}`));
            if (process.env.DEBUG) {
              console.error(chalk.gray(error.stack));
            }
          }
        });
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Error setting up proxies: ${error.message}`));
        if (process.env.DEBUG) {
          console.error(chalk.gray(error.stack));
        }
      }
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
    // IMPORTANT: Use regex instead of '*' for catch-all
    this.app.get(/^(?!\/api\/).*/, (req, res) => {
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

    // Error handler (must be last)
    this.app.use((err, req, res, next) => {
      console.error(chalk.red('Server error:'), err.message);

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
    try {
      // Create WebSocket server
      this.wss = new WebSocketServer({
        noServer: true,
        perMessageDeflate: false,
      });

      // Handle upgrade requests
      this.server.on('upgrade', (request, socket, head) => {
        try {
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
        } catch (error) {
          console.error(chalk.red('WebSocket upgrade error:'), error.message);
          socket.destroy();
        }
      });

      // Handle WebSocket connections
      this.wss.on('connection', (ws, request) => {
        try {
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
              console.error(chalk.red(`Failed to parse message from ${clientId}:`), error.message);
            }
          });

          // Handle client disconnection
          ws.on('close', (code, reason) => {
            this.clients.delete(ws);
            console.log(chalk.cyan(`HMR client disconnected: ${clientId}`));
          });

          // Handle errors
          ws.on('error', (error) => {
            console.error(chalk.red(`WebSocket error (${clientId}):`), error.message);
          });
        } catch (error) {
          console.error(chalk.red('Error handling WebSocket connection:'), error.message);
          ws.close(1011, 'Server error');
        }
      });

      // Handle WebSocket server errors
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
        break;

      case 'error':
        console.error(chalk.red(`Client ${clientId} error:`), message.data);
        break;

      case 'custom':
        this._broadcastToClients({
          type: 'custom',
          data: message.data,
          from: clientId,
        }, ws);
        break;

      default:
        if (message.type.startsWith('custom:')) {
          this._broadcastToClients(message, ws);
        }
        break;
    }
  }

  /**
   * Setup file watcher
   */
  _setupFileWatcher() {
    try {
      // Build list of paths to watch (only if they exist)
      const potentialPaths = [
        this.sourceDir,
        path.join(this.projectRoot, 'public'),
        path.join(this.projectRoot, 'assets'),
        path.join(this.projectRoot, 'flutterjs.config.js'),
      ];

      const watchPaths = potentialPaths.filter(p => {
        const exists = fs.existsSync(p);
        if (!exists && process.env.DEBUG) {
          console.log(chalk.gray(`  Watch path not found: ${p}`));
        }
        return exists;
      });

      // Only setup watcher if we have paths to watch
      if (watchPaths.length === 0) {
        console.warn(chalk.yellow('⚠️  No source paths found to watch'));
        return;
      }

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

      // Handle watcher errors
      this.fileWatcher.on('error', (error) => {
        console.error(chalk.red('File watcher error:'), error.message);
      });

      console.log(chalk.gray('👀 Watching for file changes...\n'));
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not setup file watcher: ${error.message}`));
    }
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
        console.log(chalk.blue('🔗 URLs:\n'));
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
      console.warn(chalk.yellow('⚠️  Could not open browser automatically'));
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

export default DevServer;