const fs = require('fs-extra');
const path = require('path');
const http = require('http');

async function serve(options) {
  const { port } = options;
  
  console.log('🚀 Starting development server...\n');
  
  // First, do a dev build
  const { build } = require('./build');
  await build({ mode: 'dev', output: '.dev', minify: false, obfuscate: false });
  
  // Create simple HTTP server
  const server = http.createServer((req, res) => {
    let filePath = path.join(process.cwd(), '.dev', req.url === '/' ? 'index.html' : req.url);
    
    const extname = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.svg': 'image/svg+xml',
    };
    
    const contentType = contentTypes[extname] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404);
          res.end('File not found');
        } else {
          res.writeHead(500);
          res.end('Server error: ' + err.code);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
  
  server.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}/\n`);
    console.log('Press Ctrl+C to stop');
  });
}

module.exports = { serve };