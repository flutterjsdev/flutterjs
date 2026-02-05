// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// debug-server.js - FIXED: Properly display logger data from analysis
const http = require('http');
const fs = require('fs');
const path = require('path');

let cachedAnalysisData = null;
let lastUpdate = null;

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

      // API: Get analysis from cached .analysis.json
      if (pathname === '/api/analysis') {
        try {
          // Try to load fresh .analysis.json from dist folder
          const analysisPath = path.resolve(process.cwd(), 'dist', '.analysis.json');
          if (fs.existsSync(analysisPath)) {
            const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
            cachedAnalysisData = analysisData;
            lastUpdate = new Date().toISOString();
          }

          if (cachedAnalysisData) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              ...cachedAnalysisData,
              lastUpdate: lastUpdate,
            }, null, 2));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'No analysis data available. Run build first.',
            }, null, 2));
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }, null, 2));
        }
        return;
      }

      // API: Get debug logs
      if (pathname === '/api/debug-logs') {
        try {
          const debugDir = path.resolve(process.cwd(), '.debug');
          const logs = {};

          if (fs.existsSync(debugDir)) {
            const files = fs.readdirSync(debugDir).filter(f => f.endsWith('.log'));
            files.forEach(file => {
              const content = fs.readFileSync(path.join(debugDir, file), 'utf-8');
              // Limit to last 500 lines per file to avoid huge payloads
              const lines = content.split('\n');
              logs[file] = lines.slice(Math.max(0, lines.length - 500)).join('\n');
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            logs,
            timestamp: new Date().toISOString(),
          }, null, 2));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }, null, 2));
        }
        return;
      }

      // API: Get errors
      if (pathname === '/api/errors') {
        try {
          if (cachedAnalysisData && cachedAnalysisData.analysisErrors) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              errors: cachedAnalysisData.analysisErrors,
              count: cachedAnalysisData.analysisErrors.length,
            }, null, 2));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errors: [], count: 0 }, null, 2));
          }
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
      console.log(`   API:       🔗 http://localhost:${port}/api/analysis\n`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Shutting down debug server...');
      server.close(() => {
        console.log('✅ Debug server stopped');
        process.exit(0);
      });
    });

    if (open) {
      setTimeout(() => openBrowser(`http://localhost:${port}`), 500);
    }

    return new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Debug server failed:', error.message);
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
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start ${url}`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.log('ℹ️  Could not open browser automatically');
    }
  });
}

/**
 * Generate DevTools UI HTML - FIXED: Shows debug logs
 */
function serveDevToolsUI(devServerUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS DevTools - Analysis Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      min-height: 100vh;
      padding: 20px;
    }
    
    .container { max-width: 1600px; margin: 0 auto; }
    
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
      margin-left: 10px;
    }
    
    .status-link:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: rgba(0, 212, 255, 0.6);
    }
    
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid #0f3460;
      padding-bottom: 10px;
    }
    
    .tab-btn {
      padding: 10px 20px;
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      font-size: 14px;
      border-bottom: 2px solid transparent;
      transition: all 0.3s;
    }
    
    .tab-btn.active {
      color: #00d4ff;
      border-bottom-color: #00d4ff;
    }
    
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
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
      font-size: 13px;
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
      font-size: 12px;
    }
    
    .error-box strong { color: #ff6b7a; }
    
    .log-viewer {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
      font-size: 11px;
      line-height: 1.5;
      font-family: 'Menlo', 'Monaco', monospace;
    }
    
    .log-line {
      padding: 2px 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .log-error { color: #ff6b7a; }
    .log-warn { color: #ffb627; }
    .log-info { color: #00d4ff; }
    .log-debug { color: #888; }
    .log-trace { color: #666; }
    
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
        <h1>🔧 FlutterJS DevTools</h1>
        <p style="color: #666; margin-top: 5px;">Analysis & Development Dashboard</p>
      </div>
      <div>
        <a href="${devServerUrl}" class="status-link" target="_blank">👁️ View App</a>
        <a href="#" class="status-link" onclick="location.reload(); return false;">🔄 Refresh</a>
      </div>
    </header>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('analysis')">📊 Analysis</button>
      <button class="tab-btn" onclick="switchTab('logs')">📋 Debug Logs</button>
      <button class="tab-btn" onclick="switchTab('errors')">⚠️ Errors</button>
    </div>

    <!-- Analysis Tab -->
    <div id="analysis" class="tab-content active">
      <div id="analysis-content" class="loading">
        <span class="spinner"></span>Loading analysis...
      </div>
    </div>

    <!-- Logs Tab -->
    <div id="logs" class="tab-content">
      <div class="section">
        <h3>📋 Debug Logs</h3>
        <div id="logs-content" class="log-viewer">
          <div class="log-line" style="color: #666;">Loading logs...</div>
        </div>
      </div>
    </div>

    <!-- Errors Tab -->
    <div id="errors" class="tab-content">
      <div id="errors-content" class="loading">
        <span class="spinner"></span>Loading errors...
      </div>
    </div>
  </div>

  <script>
    function switchTab(name) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
      });
      document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
      });

      // Show selected tab
      document.getElementById(name).classList.add('active');
      event.target.classList.add('active');

      // Load content if needed
      if (name === 'logs') loadLogs();
      else if (name === 'errors') loadErrors();
    }

    async function loadAnalysis() {
      try {
        const response = await fetch('/api/analysis');
        const data = await response.json();
        
        if (data.error) {
          document.getElementById('analysis-content').innerHTML = 
            '<div class="section"><h3>❌ Error</h3><p>' + data.error + '</p></div>';
          return;
        }

        const analysisResults = data.analysisResults || {};
        const errors = data.analysisErrors || [];
        
        let html = '';

        // Errors
        if (errors.length > 0) {
          html += '<div class="section"><h3>⚠️ Build Issues (' + errors.length + ')</h3>';
          errors.forEach(err => {
            html += '<div class="error-box"><strong>' + err.type + ':</strong> ' + err.message + '</div>';
          });
          html += '</div>';
        }

        // Analysis Cards
        html += '<div class="grid">';

        // Widgets
        const widgets = analysisResults.widgets || {};
        const health = widgets.summary?.healthScore || 0;
        html += '<div class="card"><h2>📦 Widgets (Phase 1)</h2>';
        html += '<div class="stat"><span>Total Widgets</span><span class="stat-value">' + 
          (widgets.summary?.count || 0) + '</span></div>';
        html += '<div class="stat"><span>Stateless</span><span class="stat-value">' + 
          (widgets.summary?.stateless || 0) + '</span></div>';
        html += '<div class="stat"><span>Stateful</span><span class="stat-value">' + 
          (widgets.summary?.stateful || 0) + '</span></div>';
        html += '<div class="stat"><span>Health</span><span class="stat-value">' + health + '/100</span></div>';
        html += '<div class="score-bar"><div class="score-fill" style="width: ' + health + '%"></div></div>';
        html += '</div>';

        // State
        const state = analysisResults.state || {};
        html += '<div class="card"><h2>⚙️ State (Phase 2)</h2>';
        html += '<div class="stat"><span>State Classes</span><span class="stat-value">' + 
          (state.summary?.stateClasses || 0) + '</span></div>';
        html += '<div class="stat"><span>State Fields</span><span class="stat-value">' + 
          (state.summary?.stateFields || 0) + '</span></div>';
        html += '<div class="stat"><span>setState Calls</span><span class="stat-value">' + 
          (state.summary?.setStateCalls || 0) + '</span></div>';
        html += '<div class="stat"><span>Event Handlers</span><span class="stat-value">' + 
          (state.summary?.eventHandlers || 0) + '</span></div>';
        html += '</div>';

        // Context & SSR
        const context = analysisResults.context || {};
        const ssr = analysisResults.ssr || {};
        const ssrScore = ssr.summary?.score || 0;
        html += '<div class="card"><h2>🌐 Context & SSR (Phase 3)</h2>';
        html += '<div class="stat"><span>InheritedWidgets</span><span class="stat-value">' + 
          (context.summary?.inheritedWidgets || 0) + '</span></div>';
        html += '<div class="stat"><span>Providers</span><span class="stat-value">' + 
          (context.summary?.providers || 0) + '</span></div>';
        html += '<div class="stat"><span>SSR Score</span><span class="stat-value">' + ssrScore + '/100</span></div>';
        html += '<div class="score-bar"><div class="score-fill" style="width: ' + ssrScore + '%"></div></div>';
        html += '</div>';

        html += '</div>';

        // Logger Report
        if (data.logger) {
          html += '<div class="section"><h3>📊 Logger Report</h3>';
          html += '<div class="stat"><span>Total Entries</span><span class="stat-value">' + data.logger.totalEntries + '</span></div>';
          html += '<div class="stat"><span>Errors</span><span class="stat-value" style="color: #ff6b7a;">' + data.logger.errors + '</span></div>';
          html += '<div class="stat"><span>Warnings</span><span class="stat-value" style="color: #ffb627;">' + data.logger.warnings + '</span></div>';
          html += '<div class="stat"><span>Info</span><span class="stat-value">' + data.logger.info + '</span></div>';
          html += '<div class="stat"><span>Debug</span><span class="stat-value">' + data.logger.debug + '</span></div>';
          html += '<p style="font-size: 11px; color: #666; margin-top: 10px;">Debug files: ' + data.logger.debugFiles.join(', ') + '</p>';
          html += '</div>';
        }

        document.getElementById('analysis-content').innerHTML = html;
      } catch (error) {
        document.getElementById('analysis-content').innerHTML = 
          '<div class="section"><h3>❌ Error</h3><p>' + error.message + '</p></div>';
      }
    }

    async function loadLogs() {
      try {
        const response = await fetch('/api/debug-logs');
        const data = await response.json();
        
        let html = '';
        if (data.logs && Object.keys(data.logs).length > 0) {
          for (const [file, content] of Object.entries(data.logs)) {
            html += '<div class="section"><h3>' + file + '</h3>';
            html += '<div class="log-viewer">';
            
            content.split('\\n').forEach(line => {
              const className = line.includes('[ERROR]') ? 'log-error' : 
                               line.includes('[WARN]') ? 'log-warn' :
                               line.includes('[INFO]') ? 'log-info' :
                               line.includes('[DEBUG]') ? 'log-debug' : 'log-trace';
              html += '<div class="log-line ' + className + '">' + escapeHtml(line) + '</div>';
            });
            
            html += '</div></div>';
          }
        } else {
          html += '<div class="section"><p style="color: #666;">No debug logs found. Run analyzer with --debug flag.</p></div>';
        }
        
        document.getElementById('logs-content').innerHTML = html;
      } catch (error) {
        document.getElementById('logs-content').innerHTML = 
          '<div class="error-box">Failed to load logs: ' + error.message + '</div>';
      }
    }

    async function loadErrors() {
      try {
        const response = await fetch('/api/errors');
        const data = await response.json();
        
        let html = '';
        if (data.errors && data.errors.length > 0) {
          html += '<div class="section"><h3>Found ' + data.count + ' error(s)</h3>';
          data.errors.forEach(err => {
            html += '<div class="error-box">';
            html += '<strong>' + err.type + ':</strong> ' + err.message;
            if (err.severity) {
              html += '<br><small style="color: #999;">Severity: ' + err.severity + '</small>';
            }
            html += '</div>';
          });
          html += '</div>';
        } else {
          html += '<div class="section"><h3>✅ No errors found!</h3></div>';
        }
        
        document.getElementById('errors-content').innerHTML = html;
      } catch (error) {
        document.getElementById('errors-content').innerHTML = 
          '<div class="error-box">Failed to load errors: ' + error.message + '</div>';
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Initial load
    loadAnalysis();
    setInterval(loadAnalysis, 3000);
  </script>
</body>
</html>`;
}

module.exports = { startDebugServer };