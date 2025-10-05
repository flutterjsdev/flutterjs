import 'dart:io';

import '../service_detection.dart';

//tODO: Add data from existing flutter.yaml that already exists
// imporve other sections based on detected services
// divide into mutiple smaller functions for config sections so that its easier to manage

Future<void> createConfigFile(DetectedServices services) async {
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
