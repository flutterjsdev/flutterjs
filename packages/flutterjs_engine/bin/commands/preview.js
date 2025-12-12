const fs = require('fs');
const path = require('path');
const http = require('http');

async function preview(options, projectContext) {
  console.log('📂 Starting Flutter.js preview server...\n');
  
  const { config, projectRoot } = projectContext;
  
  const port = parseInt(options.port || config.dev?.server?.port || '4173', 10);
  const output = options.output || config.build?.output || 'dist';
  const shouldOpen = options.open !== false;
  
  // Check if build exists
  const buildPath = path.resolve(projectRoot, output);
  const indexPath = path.join(buildPath, 'index.html');
  
  if (!fs.existsSync(buildPath) || !fs.existsSync(indexPath)) {
    console.error(`❌ Build not found in ${output}/`);
    console.log('\n💡 First, build your application:');
    console.log('   flutter_js build\n');
    process.exit(1);
  }
  
  try {
    // MIME types mapping
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
      '.wasm': 'application/wasm',
    };
    
    // Create HTTP server
    const server = http.createServer((req, res) => {
      // Parse URL and remove query string
      let urlPath = req.url.split('?')[0];
      
      // Default to index.html
      if (urlPath === '/') {
        urlPath = '/index.html';
      }
      
      // Prevent directory traversal
      const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(buildPath, safePath);
      
      // Get file extension
      const extname = path.extname(filePath).toLowerCase();
      const contentType = contentTypes[extname] || 'application/octet-stream';
      
      // Check if file exists
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // Try index.html for SPA routing
          if (extname === '') {
            filePath = indexPath;
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
        
        // Production headers with caching
        const headers = {
          'Content-Type': contentType,
        };
        
        // Cache static assets
        const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
        if (staticExtensions.includes(path.extname(filePath))) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else {
          headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
        }
        
        res.writeHead(200, headers);
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
        console.log(`💡 Try a different port: flutter_js preview --port ${port + 1}\n`);
      } else {
        console.error(`\n❌ Server error:`, err.message);
      }
      process.exit(1);
    });
    
    // Start server
    server.listen(port, () => {
      console.log('✅ Preview server ready!\n');
      console.log(`   Local:   \x1b[36mhttp://localhost:${port}/\x1b[0m`);
      console.log(`   Network: \x1b[36mhttp://127.0.0.1:${port}/\x1b[0m`);
      console.log(`   Serving: ${output}/\n`);
      console.log('   Press Ctrl+C to stop\n');
      
      // Open browser if requested
      if (shouldOpen) {
        openBrowser(`http://localhost:${port}`);
      }
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down preview server...');
      server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('\n❌ Preview failed:', error.message);
    if (options.verbose) {
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

module.exports = { preview };