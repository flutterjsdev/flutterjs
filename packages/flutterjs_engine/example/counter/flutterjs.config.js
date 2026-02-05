// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


// ============================================================================
// 1. PERFECT flutterjs.config.js
// ============================================================================

module.exports = {
  // Project Identity
  project: {
    name: 'counter-app',
    description: 'A FlutterJS Counter Application',
    version: '1.0.0',
  },

  // Entry Point Configuration
  entry: {
    // Which file to start from (where main() is exported)
    main: 'src/main.fjs',

    // Root widget to render
    rootWidget: 'MyApp',

    // Entry point function (must exist in main file)
    entryFunction: 'main',
  },

  // Rendering Mode
  render: {
    mode: 'csr', // Options: 'csr' | 'ssr' | 'hybrid'
    target: 'web', // Options: 'web' | 'node' | 'universal'
  },

  // Build Configuration
  build: {
    // Output directory for build artifacts
    output: 'dist',

    // Source directory containing .fjs files
    source: 'src',

    // Production optimizations
    production: {
      minify: true,
      obfuscate: true,
      treeshake: true,
      sourceMap: false,
    },

    // Development optimizations
    development: {
      minify: false,
      obfuscate: false,
      treeshake: false,
      sourceMap: true,
    },

    // HTML generation
    html: {
      template: 'public/index.html', // Custom HTML template (optional)
      inlineCSS: false, // Inline critical CSS
      minifyHTML: false,
    },

    // Code splitting
    chunks: {
      enabled: true,
      minSize: 30000, // Minimum chunk size in bytes
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
    },
  },

  // Development Server
  dev: {
    server: {
      port: 3000,
      host: 'localhost',
      https: false,
    },

    // Hot Module Reload
    hmr: {
      enabled: true,
      interval: 300, // Check for changes every 300ms
      reload: true, // Full reload if HMR fails
    },

    // Dev server behavior
    behavior: {
      open: false, // Auto-open browser
      cors: true,
      proxy: {}, // Optional API proxies
    },
  },

  // Framework & Runtime Configuration
  framework: {
    // Material Design version
    material: {
      version: '3',
      theme: 'light', // Options: 'light' | 'dark' | 'system'
    },

    // Cupertino (iOS) support
    cupertino: {
      enabled: false,
    },

    // Global providers
    providers: {
      theme: true,
      navigation: true,
      mediaQuery: true,
      locale: true,
    },
  },

  // Dependencies Configuration
  dependencies: {
    // NPM packages to include
    npm: {},

    // Custom package wrappers
    custom: {},

    // External CDN resources
    cdn: {
      roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    },
  },

  // Assets Configuration
  assets: {
    // Directories to include
    include: [
      'public/assets/**/*',
      'public/fonts/**/*',
    ],

    // Patterns to exclude
    exclude: [
      '**/*.md',
      '**/.DS_Store',
      '**/node_modules',
    ],

    // Inline small assets
    inline: {
      maxSize: 10240, // 10KB threshold
      formats: ['svg', 'png', 'jpg', 'woff2'],
    },
  },

  // Output File Configuration
  output: {
    // HTML file name
    html: 'index.html',

    // JavaScript bundle names
    js: {
      app: 'static/app.bundle.js',
      runtime: 'static/runtime.min.js',
      vendor: 'static/vendor.bundle.js',
    },

    // CSS output
    css: {
      main: 'static/styles.css',
      material: 'static/material.css',
    },

    // Source maps
    sourceMap: {
      js: true,
      css: true,
      location: 'static/maps',
    },

    // Manifest files
    manifest: {
      build: 'manifest.json',
      assets: 'assets-manifest.json',
    },
  },

  // Analysis & Validation
  analysis: {
    // Enable code analysis
    enabled: true,

    // Report configuration
    report: {
      unused: true, // Warn about unused code
      circular: true, // Detect circular dependencies
      performance: true, // Performance warnings
    },

    // Type checking (if using TypeScript-like JSDoc)
    typeCheck: true,
  },

  // Logging & Debugging
  logging: {
    level: 'info', // Options: 'debug' | 'info' | 'warn' | 'error'

    // Log specific modules
    modules: {
      analyzer: false,
      builder: false,
      compiler: false,
    },
  },

  // Performance Optimization
  optimization: {
    // Bundle size targets
    budgets: [
      { type: 'bundle', name: 'app', maxSize: '50kb' },
      { type: 'bundle', name: 'vendor', maxSize: '30kb' },
    ],

    // Cache configuration
    cache: {
      enabled: true,
      type: 'file', // Options: 'file' | 'memory'
      directory: '.cache',
    },

    // Lazy loading
    lazyLoad: {
      enabled: true,
      minChunkSize: 5000,
    },
  },

  // Environment Variables
  env: {
    development: {
      DEBUG: true,
      API_BASE: 'http://localhost:8000',
    },
    production: {
      DEBUG: false,
      API_BASE: 'https://api.example.com',
    },
  },
};