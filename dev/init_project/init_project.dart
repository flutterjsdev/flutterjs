import 'dart:io';
import 'package:args/command_runner.dart';
import 'package:yaml/yaml.dart';

class InitProject extends Command<void> {
  final bool verbose;
  final bool verboseHelp;
  InitProject({required this.verbose, required this.verboseHelp}) {
    argParser.addFlag(
      'verbose',
      abbr: 'v',
      negatable: false,
      help: 'Show detailed output',
    );
  }

  @override
  String get description =>
      'Initialize FlutterJS converter. Sets up MPA structure with service integration support';

  @override
  String get name => "init";

  @override
  String get invocation => 'flutterjs init [options]';

  @override
  Future<void> run() async {
    print('🚀 Initializing FlutterJS MPA project...\n');

    // 1. Verify Flutter project
    if (!await _isFlutterProject()) {
      print('❌ Error: Not a Flutter project.');
      print(
        '   Ensure you are in a Flutter project directory with a valid pubspec.yaml.',
      );
      exit(1);
    }

    // 2. Verify web folder exists
    if (!await _hasWebSupport()) {
      print('❌ Error: Web support not enabled.');
      print('   Run: flutter create --platforms=web .');
      exit(1);
    }

    print('✅ Flutter project with web support detected\n');

    // 3. Detect services from pubspec.yaml
    final services = await _detectServices();

    // 4. Create build output structure
    await _createBuildStructure();

    // 5. Create FlutterJS configuration
    await _createConfigFile(services);

    // 6. Create MPA index.html
    await _createMPAIndexHtml();

    // 7. Create services configuration
    await _createServicesConfig(services);

    // 8. Create Firebase config template (if Firebase detected)
    if (services.hasFirebase) {
      await _createFirebaseConfigTemplate();
    }

    // 9. Update .gitignore
    await _updateGitignore();

    // 10. Create manifest template
    await _createManifestTemplate();

    // // 11. Update web/manifest.json for PWA (if Firebase detected)
    // if (services.hasFirebase) {
    //   await _updateWebManifest();
    // }

    print('\n✨ FlutterJS MPA initialization complete!\n');
    _printProjectStructure(services);
    _printUsageInstructions(services);
  }

  Future<DetectedServices> _detectServices() async {
    print('🔍 Detecting services from pubspec.yaml...\n');

    final pubspecFile = File('pubspec.yaml');
    final content = await pubspecFile.readAsString();
    final pubspec = loadYaml(content);

    final dependencies = pubspec['dependencies'] as Map?;
    final devDependencies = pubspec['dev_dependencies'] as Map?;

    final allDeps = {...?dependencies?.keys, ...?devDependencies?.keys};

    final services = DetectedServices(
      hasFirebase: _checkFirebaseDeps(allDeps.cast<String>()),
      hasAuth: allDeps.contains('firebase_auth'),
      hasFirestore: allDeps.contains('cloud_firestore'),
      hasStorage: allDeps.contains('firebase_storage'),
      hasAnalytics: allDeps.contains('firebase_analytics'),
      hasCrashlytics: allDeps.contains('firebase_crashlytics'),
      hasFunctions: allDeps.contains('cloud_functions'),
      hasMessaging: allDeps.contains('firebase_messaging'),
      hasDatabase: allDeps.contains('firebase_database'),
      hasHttp: _checkHttpDeps(allDeps.cast<String>()),
      hasDio: allDeps.contains('dio'),
      hasGraphQL:
          allDeps.contains('graphql_flutter') || allDeps.contains('graphql'),
    );

    // Print detected services
    if (services.hasFirebase) {
      print('   ✅ Firebase detected with services:');
      if (services.hasAuth) print('      - Authentication');
      if (services.hasFirestore) print('      - Firestore');
      if (services.hasStorage) print('      - Storage');
      if (services.hasAnalytics) print('      - Analytics');
      if (services.hasCrashlytics) print('      - Crashlytics');
      if (services.hasFunctions) print('      - Cloud Functions');
      if (services.hasMessaging) print('      - Messaging');
      if (services.hasDatabase) print('      - Realtime Database');
    }
    if (services.hasHttp || services.hasDio) {
      print('   ✅ HTTP client detected (${services.hasDio ? 'Dio' : 'http'})');
    }
    if (services.hasGraphQL) {
      print('   ✅ GraphQL detected');
    }
    if (!services.hasAnyService) {
      print('   ℹ️  No external services detected');
    }

    print('');
    return services;
  }

  Future<bool> _isFlutterProject() async {
    final pubspecFile = File('pubspec.yaml');
    if (!await pubspecFile.exists()) return false;

    try {
      final content = await pubspecFile.readAsString();
      final pubspec = loadYaml(content);
      return pubspec['dependencies']?.containsKey('flutter') ?? false;
    } catch (e) {
      if (verbose) print('Error reading pubspec.yaml: $e');
      return false;
    }
  }

  Future<bool> _hasWebSupport() async {
    final webDir = Directory('web');
    final indexFile = File('web/index.html');
    return await webDir.exists() && await indexFile.exists();
  }

  Future<void> _createBuildStructure() async {
    print('📦 Creating MPA build structure...');

    final dirs = [
      'build/flutterjs-cache/output',
      'build/flutterjs-cache/output/pages',
      'build/flutterjs-cache/output/services',
      'build/flutterjs-cache/output/styles',
      'build/flutterjs/output',
      'build/flutterjs/output/pages',
      'build/flutterjs/output/services',
      'build/flutterjs/output/runtime',
    ];

    for (final dirPath in dirs) {
      final dir = Directory(dirPath);
      if (!await dir.exists()) {
        await dir.create(recursive: true);
        if (verbose) print('   Created: $dirPath/');
      }
    }

    print('✅ MPA structure created\n');
  }

  Future<void> _createMPAIndexHtml() async {
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

  Future<void> _createFirebaseConfigTemplate() async {
    print('🔥 Creating Firebase config template...');

    final firebaseFile = File('web/firebase-config.json');

    if (await firebaseFile.exists()) {
      print('   ⚠️  firebase-config.json already exists, skipping...\n');
      return;
    }

    final firebaseContent = '''{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT",
  "storageBucket": "YOUR_PROJECT.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "measurementId": "G-XXXXXXXXXX"
}
''';

    await firebaseFile.writeAsString(firebaseContent);
    print('✅ Firebase config template created\n');
  }

  Future<void> _createManifestTemplate() async {
    print('📋 Creating MPA manifest template...');

    final manifestFile = File('build/flutterjs/output/manifest.json');
    await manifestFile.writeAsString('''{
  "version": "1.0.0",
  "mode": "mpa",
  "generated": 0,
  "files": {
    "runtime": "runtime.js",
    "styles": ["styles/global.css"],
    "services": ["services/firebase.js"]
  },
  "routes": {
    "/": {
      "html": "pages/home.html",
      "css": "pages/home.css",
      "js": "pages/home.js",
      "meta": {
        "title": "Home - My App",
        "description": "Welcome to my app",
        "keywords": "flutter, web, home"
      }
    },
    "/profile": {
      "html": "pages/profile.html",
      "css": "pages/profile.css",
      "js": "pages/profile.js",
      "meta": {
        "title": "Profile - My App",
        "description": "User profile page"
      }
    },
    "/dashboard": {
      "html": "pages/dashboard.html",
      "css": "pages/dashboard.css",
      "js": "pages/dashboard.js",
      "meta": {
        "title": "Dashboard - My App",
        "description": "User dashboard"
      }
    }
  }
}
''');

    print('✅ MPA manifest template created\n');
  }

  Future<void> _updateGitignore() async {
    print('🔒 Updating .gitignore...');

    final gitignoreFile = File('.gitignore');

    if (!await gitignoreFile.exists()) {
      await gitignoreFile.writeAsString('');
    }

    String content = await gitignoreFile.readAsString();

    if (content.contains('build/flutterjs')) {
      if (verbose) print('   FlutterJS entries already in .gitignore');
      print('✅ .gitignore up to date\n');
      return;
    }

    final additions = '''

# FlutterJS
build/flutterjs-cache/
build/flutterjs/
web/index.html.flutter
web/firebase-config.json
''';

    await gitignoreFile.writeAsString(content + additions);
    print('✅ .gitignore updated\n');
  }

  // Helper to check Firebase dependencies
  bool _checkFirebaseDeps(Set<String> deps) {
    return deps.contains('firebase_core') ||
        deps.contains('firebase_auth') ||
        deps.contains('cloud_firestore') ||
        deps.contains('firebase_storage') ||
        deps.contains('firebase_analytics') ||
        deps.contains('firebase_crashlytics') ||
        deps.contains('cloud_functions') ||
        deps.contains('firebase_messaging') ||
        deps.contains('firebase_database');
  }

  bool _checkHttpDeps(Set<String> deps) {
    return deps.contains('http');
  }

  Future<void> _createConfigFile(DetectedServices services) async {
    print('⚙️  Creating flutterjs.yaml configuration...');

    final configFile = File('flutterjs.yaml');

    if (await configFile.exists()) {
      print('   ⚠️  flutterjs.yaml already exists, skipping...\n');
      return;
    }

    final configContent =
        '''# FlutterJS Transpiler Configuration - MPA Mode

project:
  name: my_flutter_app
  version: 1.0.0
  mode: mpa  # mpa | spa

# Output paths
paths:
  dev_output: build/flutterjs-cache/output
  prod_output: build/flutterjs/output
  lib: lib/
  web: web/

# MPA Routing Configuration
routing:
  mode: mpa  # Each route = separate HTML page
  base_path: /
  
  # Route definitions (maps Dart pages to URLs)
  routes:
    '/': 'lib/pages/home.dart'
    '/profile': 'lib/pages/profile.dart'
    '/dashboard': 'lib/pages/dashboard.dart'
    '/settings': 'lib/pages/settings.dart'
  
  # 404 handling
  not_found: 'lib/pages/not_found.dart'
  
  # Meta tags per route (SEO)
  meta:
    '/':
      title: 'Home - My Flutter App'
      description: 'Welcome to my Flutter app'
      keywords: 'flutter, web, app'
    '/profile':
      title: 'Profile - My Flutter App'
      description: 'User profile page'
    '/dashboard':
      title: 'Dashboard - My Flutter App'
      description: 'User dashboard'

# Services Integration
services:
  # Firebase configuration
  firebase:
    enabled: ${services.hasFirebase}
    config_file: 'web/firebase-config.json'
    services:
      - auth
      - firestore
      - storage
      - analytics
  
  # REST API
  rest_api:
    enabled: ${services.hasHttp || services.hasDio}
    base_url: 'https://api.example.com'
    timeout: 30
  
  # GraphQL
  graphql:
    enabled: ${services.hasGraphQL}
    endpoint: 'https://api.example.com/graphql'
  
  # Custom services
  custom: []

# Development server
dev:
  port: 8080
  hot_reload: true
  watch:
    - lib/
    - web/services-config.js
  auto_refresh: true
  structure: flat

# Build settings
build:
  structure: mirrored
  
  dev:
    minify: false
    obfuscate: false
    source_maps: true
  
  production:
    minify: true
    obfuscate: true
    source_maps: false
    
  # SEO & Meta
  seo:
    generate_sitemap: true
    generate_robots: true
    open_graph: true

# Transpiler settings
transpiler:
  widget_classification: true
  reactivity_analysis: true
  material_design: true
  
  per_widget_output:
    html: true
    css: true
    js: true

# Runtime settings
runtime:
  size_target: 15kb
  location: runtime.js
  shared_across_pages: true
''';

    await configFile.writeAsString(configContent);
    print('✅ MPA configuration file created\n');
  }

  Future<void> _createServicesConfig(DetectedServices services) async {
    print('🔧 Creating services configuration...');

    // Skip file creation if no services are detected
    if (!services.hasAnyService) {
      print(
        '   ℹ️  No services detected, skipping services-config.js creation\n',
      );
      return;
    }

    final servicesFile = File('web/services-config.js');

    if (await servicesFile.exists()) {
      print('   ⚠️  services-config.js already exists, skipping...\n');
      return;
    }

    // Build the configuration object
    final configParts = <String>[];

    // Firebase configuration with all possible services
    if (services.hasFirebase) {
      configParts.add('''
    firebase: {
      enabled: ${services.hasFirebase},
      config: {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "${services.hasAnalytics ? 'YOUR_MEASUREMENT_ID' : ''}"
      },
      services: {
        auth: ${services.hasAuth},
        firestore: ${services.hasFirestore},
        storage: ${services.hasStorage},
        analytics: ${services.hasAnalytics},
        crashlytics: ${services.hasCrashlytics},
        functions: ${services.hasFunctions},
        messaging: ${services.hasMessaging},
        database: ${services.hasDatabase}
      }
    }''');
    }

    // API configuration
    if (services.hasDio || services.hasHttp) {
      configParts.add('''
    api: {
      enabled: ${services.hasHttp || services.hasDio},
      baseURL: 'https://api.example.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    }''');
    }

    // GraphQL configuration
    if (services.hasGraphQL) {
      configParts.add('''
    graphql: {
      enabled: ${services.hasGraphQL},
      endpoint: 'https://api.example.com/graphql'
    }''');
    }

    // Build the init method
    final initCalls = <String>[];

    if (services.hasFirebase) {
      initCalls.add('''
    // Initialize Firebase
    if (this.config.firebase.enabled) {
      await this.initFirebase();
    }''');
    }

    if (services.hasHttp || services.hasDio) {
      initCalls.add('''
    // Initialize API client
    if (this.config.api.enabled) {
      await this.initAPI();
    }''');
    }

    if (services.hasGraphQL) {
      initCalls.add('''
    // Initialize GraphQL
    if (this.config.graphql.enabled) {
      await this.initGraphQL();
    }''');
    }

    // Build the service methods
    final methods = <String>[];

    if (services.hasFirebase) {
      methods.add('''
  // Firebase initialization
  async initFirebase() {
    try {
      // Load Firebase core
      await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');

      // Load enabled Firebase services
      ${services.hasAuth ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');" : ''}
      ${services.hasFirestore ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');" : ''}
      ${services.hasStorage ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js');" : ''}
      ${services.hasAnalytics ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js');" : ''}
      ${services.hasCrashlytics ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-crashlytics-compat.js');" : ''}
      ${services.hasFunctions ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions-compat.js');" : ''}
      ${services.hasMessaging ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');" : ''}
      ${services.hasDatabase ? "await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js');" : ''}

      // Initialize Firebase
      firebase.initializeApp(this.config.firebase.config);

      // Initialize enabled services
      ${services.hasAuth ? "window.firebaseAuth = firebase.auth();" : ''}
      ${services.hasFirestore ? "window.firebaseDb = firebase.firestore();" : ''}
      ${services.hasStorage ? "window.firebaseStorage = firebase.storage();" : ''}
      ${services.hasAnalytics ? "window.firebaseAnalytics = firebase.analytics();" : ''}
      ${services.hasCrashlytics ? "window.firebaseCrashlytics = firebase.crashlytics();" : ''}
      ${services.hasFunctions ? "window.firebaseFunctions = firebase.functions();" : ''}
      ${services.hasMessaging ? "window.firebaseMessaging = firebase.messaging();" : ''}
      ${services.hasDatabase ? "window.firebaseDatabase = firebase.database();" : ''}

      console.log('[Services] Firebase initialized with enabled services');
    } catch (error) {
      console.error('[Services] Firebase init error:', error);
    }
  }''');
    }

    if (services.hasHttp || services.hasDio) {
      methods.add('''
  // API client initialization
  async initAPI() {
    window.apiClient = {
      baseURL: this.config.api.baseURL,
      
      async request(method, endpoint, data = null) {
        const url = \`\${this.baseURL}\${endpoint}\`;
        const options = {
          method,
          headers: FlutterJSServices.config.api.headers,
        };
        
        if (data) {
          options.body = JSON.stringify(data);
        }
        
        try {
          const response = await fetch(url, options);
          if (!response.ok) throw new Error(\`API error: \${response.status}\`);
          return await response.json();
        } catch (error) {
          console.error('[API] Request failed:', error);
          throw error;
        }
      },
      
      get(endpoint) {
        return this.request('GET', endpoint);
      },
      
      post(endpoint, data) {
        return this.request('POST', endpoint, data);
      },
      
      put(endpoint, data) {
        return this.request('PUT', endpoint, data);
      },
      
      delete(endpoint) {
        return this.request('DELETE', endpoint);
      }
    };
    
    console.log('[Services] API client initialized');
  }''');
    }

    if (services.hasGraphQL) {
      methods.add('''
  // GraphQL initialization
  async initGraphQL() {
    window.graphqlClient = {
      endpoint: this.config.graphql.endpoint,
      
      async query(query, variables = {}) {
        try {
          const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables })
          });
          
          const result = await response.json();
          if (result.errors) throw new Error(result.errors[0].message);
          return result.data;
        } catch (error) {
          console.error('[GraphQL] Query failed:', error);
          throw error;
        }
      }
    };
    
    console.log('[Services] GraphQL client initialized');
  }''');
    }

    // Always include loadScript method
    methods.add('''
  // Helper to load external scripts
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }''');

    // Compose the final file
    final servicesContent =
        '''/**
 * FlutterJS Services Configuration
 * Auto-generated based on detected dependencies
 */

window.FlutterJSServices = {
  // Configuration
  config: {
${configParts.join(',\n    \n')}
  },
  
  // Initialize all services
  async init() {
    console.log('[Services] Initializing...');
${initCalls.join('\n    \n')}
    
    console.log('[Services] ✅ All services initialized');
  },
${methods.join(',\n  \n')}
};
''';

    await servicesFile.writeAsString(servicesContent);
    print('✅ Services configuration created\n');
  }
  // Future<void> _updateWebManifest() async {
  //   print('📱 Updating web/manifest.json for Firebase FCM...');

  //   final manifestFile = File('web/manifest.json');
  //   if (!await manifestFile.exists()) {
  //     print('   ⚠️  web/manifest.json not found, skipping...\n');
  //     return;
  //   }

  //   try {
  //     final content = await manifestFile.readAsString();
  //     final manifest = json.decode(content) as Map<String, dynamic>;

  //     // Add gcm_sender_id if not present
  //     if (!manifest.containsKey('gcm_sender_id')) {
  //       manifest['gcm_sender_id'] = '103953800507';

  //       await manifestFile.writeAsString(
  //         JsonEncoder.withIndent('    ').convert(manifest),
  //       );
  //       print('   ✅ Added gcm_sender_id for Firebase FCM\n');
  //     } else {
  //       print('   ℹ️  gcm_sender_id already present\n');
  //     }
  //   } catch (e) {
  //     print('   ⚠️  Could not update manifest.json: $e\n');
  //   }
  // }

  void _printProjectStructure(DetectedServices services) {
    print('📁 Project Structure:');
    print('   ├── lib/                           (Your Flutter/Dart code)');
    print('   │   ├── pages/');
    print('   │   │   ├── home.dart');
    print('   │   │   ├── profile.dart');
    print('   │   │   └── dashboard.dart');
    if (services.hasAnyService) {
      print('   │   └── services/');
      if (services.hasFirebase) {
        print('   │       └── firebase_service.dart');
      }
    }
    print('   │');
    print('   ├── web/');
    print('   │   ├── index.html                (MPA loader)');
    print('   │   ├── index.html.flutter        (Original Flutter backup)');
    print('   │   ├── services-config.js        (Firebase/API config)');
    if (services.hasFirebase) {
      print('   │   ├── firebase-config.json      (Firebase credentials)');
    }
    print('   │   └── manifest.json');
    print('   │');
    print('   ├── build/flutterjs/output/       (Transpiled pages)');
    print('   │   ├── manifest.json');
    print('   │   ├── runtime.js');
    if (services.hasAnyService) {
      print('   │   ├── services/                 (Firebase, APIs)');
      if (services.hasFirebase) {
        print('   │   │   └── firebase.js');
      }
    }
    print('   │   └── pages/                    (Each page = separate HTML)');
    print('   │       ├── home.html');
    print('   │       ├── home.css');
    print('   │       ├── home.js');
    print('   │       ├── profile.html');
    print('   │       └── dashboard.html\n');
  }

  void _printUsageInstructions(DetectedServices services) {
    print('🔄 How MPA works:');
    print('   ROUTING:');
    print('   → /                  → pages/home.html');
    print('   → /profile           → pages/profile.html');
    print('   → /dashboard         → pages/dashboard.html');
    print('   → Each route = Separate HTML page (true MPA)');
    print('   → Browser native back/forward works automatically');

    if (services.hasAnyService) {
      print('   ');
      print('   SERVICES:');
      if (services.hasFirebase) {
        print('   → Firebase: Configure in web/firebase-config.json');
      }
      if (services.hasHttp || services.hasDio) {
        print('   → REST API: Configure in web/services-config.js');
      }
      if (services.hasGraphQL) {
        print('   → GraphQL: Configure in web/services-config.js');
      }
      print('   → Auto-loaded before page content');
      print('   → Shared across all pages');
    }

    print('');
    print('✅ MPA mode enabled - Each route is a separate page');
    if (services.hasFirebase) {
      print('✅ Firebase support enabled');
    }
    if (services.hasHttp || services.hasDio) {
      print('✅ HTTP/REST API support enabled');
    }
    if (services.hasGraphQL) {
      print('✅ GraphQL support enabled');
    }
    print('✅ SEO-friendly with proper meta tags per page');
    print('✅ Run "flutterjs run" and open web/index.html\n');
  }
}

// Helper class to track detected services
// Helper class to track detected services
class DetectedServices {
  final bool hasFirebase;
  final bool hasAuth;
  final bool hasFirestore;
  final bool hasStorage;
  final bool hasAnalytics;
  final bool hasCrashlytics;
  final bool hasFunctions;
  final bool hasMessaging;
  final bool hasDatabase;
  final bool hasHttp;
  final bool hasDio;
  final bool hasGraphQL;

  DetectedServices({
    required this.hasFirebase,
    required this.hasAuth,
    required this.hasFirestore,
    required this.hasStorage,
    required this.hasAnalytics,
    required this.hasCrashlytics,
    required this.hasFunctions,
    required this.hasMessaging,
    required this.hasDatabase,
    required this.hasHttp,
    required this.hasDio,
    required this.hasGraphQL,
  });

  bool get hasAnyService => hasFirebase || hasHttp || hasDio || hasGraphQL;
}
