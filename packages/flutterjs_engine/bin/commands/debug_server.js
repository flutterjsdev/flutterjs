// debug-server.js - DevTools UI and Debug Server
const http = require('http');

/**
 * Start debug server - DevTools UI connected to dev server
 */
async function startDebugServer(options) {
  const { port, devServerUrl, open, verbose } = options;

  try {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const pathname = url.pathname;

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Main route: serve DevTools UI
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(serveDevToolsUI(devServerUrl));
        return;
      }

      // API: Get analysis from dev server
      if (pathname === '/api/analysis') {
        try {
          const analysisData = await fetchFromDevServer(`${devServerUrl}/api/build-analysis`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(analysisData, null, 2));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }, null, 2));
        }
        return;
      }

      // API: Get build errors from dev server
      if (pathname === '/api/errors') {
        try {
          const errorData = await fetchFromDevServer(`${devServerUrl}/api/build-errors`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(errorData, null, 2));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }, null, 2));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - Not Found');
    });

    server.listen(port, () => {
      console.log('✅ Debug server ready!\n');
      console.log(`   DevTools:  🔗 http://localhost:${port}/`);
      console.log(`   Dev App:   🔗 ${devServerUrl}/`);
      console.log(`   Analysis:  🔗 http://localhost:${port}/api/analysis\n`);
      console.log('   Connected to dev server - showing live analysis\n');

      if (open) {
        openBrowser(`http://localhost:${port}`);
      }
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down debug server...');
      server.close(() => {
        console.log('✅ Debug server stopped');
        process.exit(0);
      });
    });

    // Return promise that never resolves (keeps server running)
    return new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Debug server failed:', error.message);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Fetch data from dev server API
 */
function fetchFromDevServer(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
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

/**
 * Generate DevTools UI HTML
 */
function serveDevToolsUI(devServerUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flutter.js DevTools - Analysis Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      min-height: 100vh;
      padding: 20px;
    }
    
    .container { max-width: 1400px; margin: 0 auto; }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0f3460;
    }
    
    h1 {
      font-size: 28px;
      background: linear-gradient(135deg, #00d4ff, #7b2ff7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .status-link {
      padding: 8px 16px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      color: #00d4ff;
      text-decoration: none;
      font-size: 12px;
      transition: all 0.3s;
    }
    
    .status-link:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: rgba(0, 212, 255, 0.6);
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: 10px;
      padding: 20px;
      backdrop-filter: blur(10px);
    }
    
    .card h2 {
      color: #00d4ff;
      font-size: 16px;
      margin-bottom: 15px;
    }
    
    .stat {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .stat:last-child { border: none; }
    .stat-value { color: #00d4ff; font-weight: 600; }
    
    .section {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .section h3 { color: #00d4ff; margin-bottom: 15px; }
    
    .error-box {
      background: rgba(255, 71, 87, 0.1);
      border: 1px solid rgba(255, 71, 87, 0.3);
      border-left: 4px solid #ff4757;
      padding: 15px;
      border-radius: 6px;
      margin: 10px 0;
    }
    
    .error-box strong { color: #ff6b7a; }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #00d4ff;
    }
    
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(0, 212, 255, 0.3);
      border-top: 3px solid #00d4ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 10px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .score-bar {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      margin-top: 8px;
      overflow: hidden;
    }
    
    .score-fill {
      height: 100%;
      background: linear-gradient(90deg, #7b2ff7, #00d4ff);
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>🔧 Flutter.js DevTools</h1>
        <p style="color: #666; margin-top: 5px;">Analysis & Development Dashboard</p>
      </div>
      <a href="${devServerUrl}" class="status-link" target="_blank">👁️ View App</a>
    </header>

    <div id="content" class="loading">
      <span class="spinner"></span>Loading analysis...
    </div>
  </div>

  <script>
    async function loadAnalysis() {
      try {
        const response = await fetch('/api/analysis');
        const data = await response.json();
        
        if (data.error) {
          document.getElementById('content').innerHTML = 
            '<div class="section"><h3>❌ Error</h3><p>' + data.error + '</p></div>';
          return;
        }

        const analysisResults = data.analysisResults || {};
        const errors = data.analysisErrors || [];
        
        let html = '';

        // Show errors if any
        if (errors.length > 0) {
          html += '<div class="section"><h3>⚠️ Build Issues</h3>';
          errors.forEach(err => {
            html += '<div class="error-box"><strong>' + err.type + ':</strong> ' + err.message + '</div>';
          });
          html += '</div>';
        }

        // Widgets analysis
        const widgets = analysisResults.widgets || {};
        const health = widgets.summary?.healthScore || 0;
        html += '<div class="card"><h2>📦 Widgets (Phase 1)</h2>';
        html += '<div class="stat"><span>Total Widgets</span><span class="stat-value">' + 
          (widgets.summary?.count || 0) + '</span></div>';
        html += '<div class="stat"><span>Stateless</span><span class="stat-value">' + 
          (widgets.summary?.stateless || 0) + '</span></div>';
        html += '<div class="stat"><span>Stateful</span><span class="stat-value">' + 
          (widgets.summary?.stateful || 0) + '</span></div>';
        html += '<div class="stat"><span>Health Score</span><span class="stat-value">' + health + '/100</span></div>';
        html += '<div class="score-bar"><div class="score-fill" style="width: ' + health + '%"></div></div>';
        html += '</div>';

        // State analysis
        const state = analysisResults.state || {};
        const stateClasses = state.summary?.stateClasses || 0;
        html += '<div class="card"><h2>⚙️ State (Phase 2)</h2>';
        html += '<div class="stat"><span>State Classes</span><span class="stat-value">' + stateClasses + '</span></div>';
        html += '<div class="stat"><span>State Fields</span><span class="stat-value">' + 
          (state.summary?.stateFields || 0) + '</span></div>';
        html += '<div class="stat"><span>setState Calls</span><span class="stat-value">' + 
          (state.summary?.setStateCalls || 0) + '</span></div>';
        html += '<div class="stat"><span>Event Handlers</span><span class="stat-value">' + 
          (state.summary?.eventHandlers || 0) + '</span></div>';
        html += '</div>';

        // Context and SSR analysis
        const context = analysisResults.context || {};
        const ssr = analysisResults.ssr || {};
        const ssrScore = ssr.summary?.score || 0;
        html += '<div class="card"><h2>🌐 Context & SSR (Phase 3)</h2>';
        html += '<div class="stat"><span>InheritedWidgets</span><span class="stat-value">' + 
          (context.summary?.inheritedWidgets || 0) + '</span></div>';
        html += '<div class="stat"><span>ChangeNotifiers</span><span class="stat-value">' + 
          (context.summary?.changeNotifiers || 0) + '</span></div>';
        html += '<div class="stat"><span>Providers</span><span class="stat-value">' + 
          (context.summary?.providers || 0) + '</span></div>';
        html += '<div class="stat"><span>SSR Score</span><span class="stat-value">' + ssrScore + '/100</span></div>';
        html += '<div class="score-bar"><div class="score-fill" style="width: ' + ssrScore + '%"></div></div>';
        html += '</div>';

        // Build info
        html += '<div class="section"><h3>ℹ️ Build Info</h3>';
        html += '<p style="font-size: 13px; color: #999;">Built: ' + data.buildTime + '</p>';
        html += '<p style="font-size: 13px; color: #999;">Updated: ' + new Date().toLocaleTimeString() + '</p>';
        html += '</div>';

        document.getElementById('content').innerHTML = html;
      } catch (error) {
        document.getElementById('content').innerHTML = 
          '<div class="section"><h3>❌ Connection Error</h3><p>' + error.message + '</p></div>';
      }
    }

    loadAnalysis();
    setInterval(loadAnalysis, 2000); // Refresh every 2 seconds
  </script>
</body>
</html>`;
}

module.exports = { startDebugServer };