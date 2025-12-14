// dev.js - Development Server (serves app + exposes analysis API)
const fs = require('fs');
const path = require('path');
const http = require('http');

/**
 * Start development server - serves app and exposes analysis API
 */
async function startDevServer(options) {
  const { port, projectRoot, open, verbose } = options;

  try {
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
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
      '.txt': 'text/plain',
      '.webp': 'image/webp',
    };

    // Load analysis data from build
    let buildAnalysisData = {
      analysisResults: null,
      analysisErrors: [],
      buildTime: null,
    };

    const analysisPath = path.join(projectRoot, '.dev', '.analysis.json');
    if (fs.existsSync(analysisPath)) {
      try {
        buildAnalysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
      } catch (error) {
        console.error('⚠️  Could not load analysis data:', error.message);
      }
    }

    const server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // API ENDPOINT: Get build analysis data
      if (req.url === '/api/build-analysis') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(buildAnalysisData, null, 2));
        logRequest(req.method, req.url, 200);
        return;
      }

      // API ENDPOINT: Get build errors
      if (req.url === '/api/build-errors') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          errors: buildAnalysisData.analysisErrors,
          count: buildAnalysisData.analysisErrors.length,
        }, null, 2));
        logRequest(req.method, req.url, 200);
        return;
      }

      // Parse URL and remove query string
      let urlPath = req.url.split('?')[0];

      // Default to index.html
      if (urlPath === '/') {
        urlPath = '/index.html';
      }

      // Prevent directory traversal
      const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(projectRoot, '.dev', safePath);

      // Get file extension
      const extname = path.extname(filePath).toLowerCase();
      const contentType = contentTypes[extname] || 'application/octet-stream';

      // Check if file exists
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // Try index.html for SPA routing
          if (extname === '') {
            filePath = path.join(projectRoot, '.dev', 'index.html');
            serveFile(filePath, 'text/html', res, urlPath);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - File Not Found');
            logRequest(req.method, urlPath, 404);
          }
          return;
        }

        serveFile(filePath, contentType, res, urlPath);
        logRequest(req.method, urlPath, 200);
      });
    });

    function serveFile(filePath, contentType, res, urlPath) {
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 - Internal Server Error');
          console.error(`❌ Error reading file: ${err.message}`);
          return;
        }

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        });
        res.end(content);
      });
    }

    function logRequest(method, url, status) {
      const statusColor = status === 200 ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      const timestamp = new Date().toLocaleTimeString();
      console.log(`${statusColor}${status}${reset} ${method} ${url} - ${timestamp}`);
    }

    // Error handling
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${port} is already in use.`);
        console.log(`💡 Try a different port: flutter_js run --port ${port + 1}\n`);
      } else {
        console.error(`\n❌ Server error:`, err.message);
      }
      process.exit(1);
    });

    // Start server
    server.listen(port, () => {
      console.log('✅ Development server ready!\n');
      console.log(`   Local:   \x1b[36mhttp://localhost:${port}/\x1b[0m`);
      console.log(`   Network: \x1b[36mhttp://127.0.0.1:${port}/\x1b[0m`);
      console.log(`   API:     \x1b[36mhttp://localhost:${port}/api/build-analysis\x1b[0m\n`);
      console.log('   Press Ctrl+C to stop\n');

      // Open browser if requested
      if (open) {
        openBrowser(`http://localhost:${port}`);
      }
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down development server...');
      server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });

    // Return promise that never resolves (keeps server running)
    return new Promise(() => { });

  } catch (error) {
    console.error('\n❌ Dev server failed:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function openBrowser(url) {
  const { exec } = require('child_process');
  const platform = process.platform;

  let command;
  if (platform === 'darwin') {
    command = `open ${url}`;
  } else if (platform === 'win32') {
    command = `start ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }

  exec(command, (err) => {
    if (err) {
      console.log('ℹ️  Could not open browser automatically');
    }
  });
}

module.exports = { startDevServer };