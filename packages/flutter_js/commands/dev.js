const fs = require('fs');
const path = require('path');
const http = require('http');
const { loadConfig } = require('../src/utils/config');

async function dev(options) {
  console.log('🚀 Starting Flutter.js development server...\n');
  
  // Load config
  const config = loadConfig();
  const port = parseInt(options.port || config.server?.port || '3000', 10);
  const shouldOpen = options.open !== false && (config.server?.open !== false);
  
  // Check if generated code exists
  const generatedCodePath = path.join(process.cwd(), '.flutter_js', 'app.generated.js');
  
  if (!fs.existsSync(generatedCodePath)) {
    console.error('❌ Generated code not found!');
    console.log('\n💡 First, transpile your Flutter code:');
    console.log('   flutter_js_compiler transpile src/\n');
    process.exit(1);
  }
  
  // Build dev version first
  console.log('📦 Building development bundle...\n');
  const { build } = require('./build');
  await build({ 
    mode: 'dev', 
    output: '.dev', 
    minify: false, 
    obfuscate: false 
  });
  
  console.log('\n🌐 Starting HTTP server...\n');
  
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
    let filePath = path.join(process.cwd(), '.dev', safePath);
    
    // Get file extension
    const extname = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extname] || 'application/octet-stream';
    
    // Check if file exists
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Try index.html for SPA routing
        if (extname === '') {
          filePath = path.join(process.cwd(), '.dev', 'index.html');
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
      console.log(`💡 Try a different port: flutter_js dev --port ${port + 1}\n`);
    } else {
      console.error(`\n❌ Server error:`, err.message);
    }
    process.exit(1);
  });
  
  // Start server
  server.listen(port, () => {
    console.log('✅ Development server ready!\n');
    console.log(`   Local:   \x1b[36mhttp://localhost:${port}/\x1b[0m`);
    console.log(`   Network: \x1b[36mhttp://127.0.0.1:${port}/\x1b[0m\n`);
    console.log('   Press Ctrl+C to stop\n');
    
    // Open browser if requested
    if (shouldOpen) {
      openBrowser(`http://localhost:${port}`);
    }
  });
  
  // Watch for file changes (basic implementation)
  if (config.server?.hot !== false) {
    console.log('🔥 Hot reload enabled (watching for changes)...\n');
    watchFiles();
  }
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down development server...');
    server.close(() => {
      console.log('✅ Server stopped');
      process.exit(0);
    });
  });
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

function watchFiles() {
  const srcPath = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcPath)) {
    return;
  }
  
  fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.fjs') || filename.endsWith('.js'))) {
      console.log(`\n🔄 Change detected: ${filename}`);
      console.log('   Rebuilding...\n');
      
      const { processFJSFiles } = require('../src/utils/fjs');
      const srcPath = path.join(process.cwd(), 'src');
      const fjsPath = path.join(process.cwd(), '.flutter_js');
      processFJSFiles(srcPath, fjsPath);
    }
  });
}


module.exports = { dev };