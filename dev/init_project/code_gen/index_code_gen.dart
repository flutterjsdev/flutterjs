import 'dart:io';

//tODO: Add data from existing flutter.yaml that already exists
// imporve other sections based on detected services
// divide into mutiple smaller functions for config sections so that its easier to manage
Future<void> createMPAIndexHtml(bool verbose) async {
  print('📄 Creating MPA index.html loader...');

  final indexFile = File('web/index.html');
  final backupFile = File('web/index.html.flutter');

  if (await indexFile.exists() && !await backupFile.exists()) {
    await indexFile.copy('web/index.html.flutter');
    if (verbose) print('   Backup created: web/index.html.flutter');
  }

  final htmlContent = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Flutter app transpiled to HTML/CSS/JS">
  <title>FlutterJS MPA</title>
  
  <!-- FlutterJS MPA Loader -->
  <script>
    /**
     * FlutterJS Multi-Page Application Loader
     * Each route loads a separate HTML page (true MPA)
     * Services (Firebase, APIs) loaded once and shared
     */
    (function() {
      'use strict';
      
      // Detect base path
      const BASE_PATH = (() => {
        const currentPath = window.location.pathname;
        const webIndex = currentPath.indexOf('/web/');
        return webIndex !== -1 ? currentPath.substring(0, webIndex) : '';
      })();
      
      const CONFIG = {
        devPath: \`\${BASE_PATH}/build/flutterjs-cache/output\`,
        buildPath: \`\${BASE_PATH}/build/flutterjs/output\`,
        retryInterval: 2000,
        servicesConfigPath: \`\${BASE_PATH}/web/services-config.js\`,
      };
      
      let currentMode = null;
      let manifestCache = null;
      let servicesLoaded = false;
      
      console.log('[FlutterJS MPA] Base path:', BASE_PATH || '/');
      
      // Parse route from URL
      function getCurrentRoute() {
        // Support both hash and path-based routing
        const hash = window.location.hash.slice(1);
        const path = window.location.pathname.replace(/^\\/web\\/index\\.html/, '');
        return hash || path || '/';
      }
      
      // Detect mode
      async function detectMode() {
        try {
          const buildResponse = await fetch(\`\${CONFIG.buildPath}/manifest.json?v=\${Date.now()}\`);
          if (buildResponse.ok) {
            console.log('[FlutterJS MPA] Build mode detected');
            return { mode: 'build', path: CONFIG.buildPath };
          }
        } catch (e) {}
        
        try {
          const devResponse = await fetch(\`\${CONFIG.devPath}/manifest.json?v=\${Date.now()}\`);
          if (devResponse.ok) {
            console.log('[FlutterJS MPA] Dev mode detected');
            return { mode: 'dev', path: CONFIG.devPath };
          }
        } catch (e) {}
        
        return null;
      }
      
      // Load manifest
      async function loadManifest(basePath) {
        const response = await fetch(\`\${basePath}/manifest.json?v=\${Date.now()}\`);
        if (!response.ok) throw new Error('Manifest not found');
        return await response.json();
      }
      
      // Load services (Firebase, APIs, etc.)
      async function loadServices(basePath) {
        if (servicesLoaded) return;
        
        console.log('[FlutterJS MPA] Loading services...');
        
        // 1. Load services config
        try {
          await loadScript(CONFIG.servicesConfigPath);
          console.log('[FlutterJS MPA] Services config loaded');
        } catch (e) {
          console.log('[FlutterJS MPA] No services config found (optional)');
        }
        
        // 2. Load service files from manifest
        if (manifestCache.files?.services) {
          for (const service of manifestCache.files.services) {
            await loadScript(\`\${basePath}/\${service}\`);
            console.log('[FlutterJS MPA] Loaded service:', service);
          }
        }
        
        // 3. Initialize services
        if (window.FlutterJSServices && window.FlutterJSServices.init) {
          await window.FlutterJSServices.init();
          console.log('[FlutterJS MPA] Services initialized');
        }
        
        servicesLoaded = true;
      }
      
      // Load CSS
      function loadCSS(href) {
        return new Promise((resolve, reject) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          link.onload = resolve;
          link.onerror = reject;
          document.head.appendChild(link);
        });
      }
      
      // Load JS
      function loadScript(src) {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      
      // Load HTML content
      async function loadHTML(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(\`Failed to load: \${url}\`);
        return await response.text();
      }
      
      // Load page
      async function loadPage(route) {
        const basePath = currentMode === 'dev' ? CONFIG.devPath : CONFIG.buildPath;
        const pageInfo = manifestCache.routes?.[route] || manifestCache.routes?.['/'];
        
        if (!pageInfo) {
          showError(new Error(\`Route not found: \${route}\`));
          return;
        }
        
        console.log('[FlutterJS MPA] Loading page:', route);
        
        try {
          // Show loading
          document.body.innerHTML = '<div id="flutterjs-root"><div style="padding: 40px; text-align: center;">Loading...</div></div>';
          
          const version = manifestCache.version + '-' + manifestCache.generated;
          
          // 1. Load page CSS
          if (pageInfo.css) {
            await loadCSS(\`\${basePath}/\${pageInfo.css}?v=\${version}\`);
          }
          
          // 2. Load page HTML
          if (pageInfo.html) {
            const html = await loadHTML(\`\${basePath}/\${pageInfo.html}?v=\${version}\`);
            document.getElementById('flutterjs-root').innerHTML = html;
            
            // Update meta tags
            if (pageInfo.meta) {
              document.title = pageInfo.meta.title || 'FlutterJS App';
              updateMetaTag('description', pageInfo.meta.description);
              updateMetaTag('keywords', pageInfo.meta.keywords);
            }
          }
          
          // 3. Load page JS
          if (pageInfo.js) {
            await loadScript(\`\${basePath}/\${pageInfo.js}?v=\${version}\`);
          }
          
          // 4. Notify page loaded
          if (window.FlutterJS && window.FlutterJS.onPageLoad) {
            window.FlutterJS.onPageLoad(route);
          }
          
          console.log('[FlutterJS MPA] Page loaded:', route);
          
        } catch (error) {
          console.error('[FlutterJS MPA] Page load error:', error);
          showError(error);
        }
      }
      
      // Update meta tag
      function updateMetaTag(name, content) {
        if (!content) return;
        let meta = document.querySelector(\`meta[name="\${name}"]\`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = name;
          document.head.appendChild(meta);
        }
        meta.content = content;
      }
      
      // Show loading screen
      function showLoadingScreen() {
        document.body.innerHTML = \`
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="text-align: center; color: white;">
              <h1 style="font-size: 3em; margin: 0;">🚀</h1>
              <h2 style="margin: 20px 0;">FlutterJS MPA</h2>
              <p style="opacity: 0.9;">Waiting for transpiler output...</p>
              <p style="opacity: 0.7; font-size: 0.9em; margin-top: 10px;">Run: <code style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 4px;">flutterjs run</code></p>
            </div>
            <div style="margin-top: 40px;">
              <div style="border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; width: 48px; height: 48px; animation: spin 1s linear infinite;"></div>
            </div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        \`;
      }
      
      // Show error
      function showError(error) {
        document.body.innerHTML = \`
          <div style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto;">
            <h1 style="color: #e74c3c; font-size: 2em;">⚠️ FlutterJS MPA Error</h1>
            <pre style="background: #f8f8f8; padding: 20px; border-radius: 8px; overflow: auto;">\${error.message}</pre>
            <div style="margin-top: 20px; padding: 20px; background: #e8f4f8; border-radius: 8px;">
              <h3 style="margin-top: 0;">Troubleshooting:</h3>
              <ol style="line-height: 1.8;">
                <li>Run <code>flutterjs run</code> to start the transpiler</li>
                <li>Check browser console for details</li>
                <li>Verify route exists in flutterjs.yaml</li>
              </ol>
            </div>
          </div>
        \`;
      }
      
      // Initialize
      async function init() {
        showLoadingScreen();
        
        const modeInfo = await detectMode();
        if (!modeInfo) {
          console.warn('[FlutterJS MPA] No output found. Waiting...');
          setTimeout(init, CONFIG.retryInterval);
          return;
        }
        
        currentMode = modeInfo.mode;
        const basePath = modeInfo.path;
        
        try {
          // Load manifest
          manifestCache = await loadManifest(basePath);
          console.log('[FlutterJS MPA] Manifest loaded');
          
          const version = manifestCache.version + '-' + manifestCache.generated;
          
          // Clear loading
          document.body.innerHTML = '<div id="flutterjs-root"></div>';
          
          // Load runtime
          if (manifestCache.files?.runtime) {
            await loadScript(\`\${basePath}/\${manifestCache.files.runtime}?v=\${version}\`);
            console.log('[FlutterJS MPA] Runtime loaded');
          }
          
          // Load services (Firebase, APIs, etc.)
          await loadServices(basePath);
          
          // Load global styles
          if (manifestCache.files?.styles) {
            for (const style of manifestCache.files.styles) {
              await loadCSS(\`\${basePath}/\${style}?v=\${version}\`);
            }
          }
          
          // Load current page
          const currentRoute = getCurrentRoute();
          await loadPage(currentRoute);
          
          // Setup navigation for hash changes
          window.addEventListener('hashchange', () => {
            const route = getCurrentRoute();
            loadPage(route);
          });
          
          // Expose navigation API
          window.FlutterJSNavigate = (route) => {
            window.location.hash = route;
          };
          
          console.log('[FlutterJS MPA] ✅ Initialization complete');
          
        } catch (error) {
          console.error('[FlutterJS MPA] Error:', error);
          showError(error);
        }
      }
      
      // Start
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
      
    })();
  </script>
</head>
<body>
  <noscript>
    <div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h1>JavaScript Required</h1>
      <p>This FlutterJS application requires JavaScript to run.</p>
    </div>
  </noscript>
</body>
</html>''';

  await indexFile.writeAsString(htmlContent);
  print('✅ MPA index.html created\n');
}
