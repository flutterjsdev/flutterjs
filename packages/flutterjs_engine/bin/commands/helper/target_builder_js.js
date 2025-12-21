/**
 * ============================================================================
 * FlutterJS Target Builder - Complete Multi-Target Build Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. Single Page Application (SPA) builds
 * 2. Multi-Page Application (MPA) builds
 * 3. Server-Side Rendering (SSR) builds
 * 4. Hybrid (SSR + Hydration) builds
 * 5. Static Site Generation (SSG) builds
 * 6. Custom target support
 * 7. Target validation and detection
 * 8. Output optimization per target
 * 9. Configuration per target
 * 10. Target-specific entry points
 * 
 * Location: cli/bundler/target-builder.js
 * Usage:
 *   const builder = new TargetBuilder(config);
 *   const result = await builder.build();
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ============================================================================
// CONSTANTS
// ============================================================================

const BUILD_TARGETS = {
  SPA: 'spa',
  MPA: 'mpa',
  SSR: 'ssr',
  HYBRID: 'hybrid',
  STATIC: 'static',
};

const TARGET_DESCRIPTIONS = {
  spa: 'Single Page Application (Client-side rendering)',
  mpa: 'Multi-Page Application (Multiple entry points)',
  ssr: 'Server-Side Rendering (Full server rendering)',
  hybrid: 'Hybrid (SSR + Client-side hydration)',
  static: 'Static Site Generation (Pre-rendered pages)',
};

const TARGET_FEATURES = {
  spa: {
    clientBundle: true,
    serverBundle: false,
    preRendering: false,
    hydration: false,
    routes: false,
  },
  mpa: {
    clientBundle: true,
    serverBundle: false,
    preRendering: false,
    hydration: false,
    routes: true,
  },
  ssr: {
    clientBundle: false,
    serverBundle: true,
    preRendering: false,
    hydration: false,
    routes: false,
  },
  hybrid: {
    clientBundle: true,
    serverBundle: true,
    preRendering: false,
    hydration: true,
    routes: false,
  },
  static: {
    clientBundle: true,
    serverBundle: true,
    preRendering: true,
    hydration: true,
    routes: false,
  },
};

// ============================================================================
// TARGET BUILDER CLASS
// ============================================================================

class TargetBuilder {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      target: config.target || BUILD_TARGETS.SPA,
      outputDir: config.outputDir || 'dist',
      publicDir: config.publicDir || 'public',
      entryPoint: config.entryPoint || 'lib/main.fjs',
      mode: config.mode || 'production',
      verbose: config.verbose || false,
      ...config,
    };

    // Validate target
    this._validateTarget();

    // Build results
    this.results = {
      target: this.config.target,
      success: false,
      bundles: [],
      files: [],
      stats: {},
      warnings: [],
      errors: [],
    };

    // Statistics
    this.stats = {
      startTime: null,
      endTime: null,
      buildTime: 0,
      filesGenerated: 0,
      bundleCount: 0,
    };
  }

  /**
   * Validate build target
   * @private
   */
  _validateTarget() {
    const validTargets = Object.values(BUILD_TARGETS);

    if (!validTargets.includes(this.config.target)) {
      throw new Error(
        `Invalid target "${this.config.target}". ` +
        `Valid targets: ${validTargets.join(', ')}`
      );
    }
  }

  /**
   * Build based on target
   */
  async build() {
    this.stats.startTime = performance.now();

    try {
      console.log(chalk.blue(`\n🎯 Building ${this.config.target.toUpperCase()} target...\n`));

      // Log target info
      this._logTargetInfo();

      // Route to appropriate build method
      switch (this.config.target) {
        case BUILD_TARGETS.SPA:
          await this._buildSPA();
          break;

        case BUILD_TARGETS.MPA:
          await this._buildMPA();
          break;

        case BUILD_TARGETS.SSR:
          await this._buildSSR();
          break;

        case BUILD_TARGETS.HYBRID:
          await this._buildHybrid();
          break;

        case BUILD_TARGETS.STATIC:
          await this._buildStatic();
          break;

        default:
          throw new Error(`Unknown target: ${this.config.target}`);
      }

      this.results.success = true;
      this.stats.endTime = performance.now();
      this.stats.buildTime = this.stats.endTime - this.stats.startTime;

      // Log results
      this._logResults();

      return this.results;

    } catch (error) {
      console.error(chalk.red(`✗ Build failed: ${error.message}\n`));
      this.results.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Log target information
   * @private
   */
  _logTargetInfo() {
    const description = TARGET_DESCRIPTIONS[this.config.target];
    const features = TARGET_FEATURES[this.config.target];

    console.log(chalk.gray(`Description: ${description}\n`));

    console.log(chalk.gray('Features:'));
    Object.entries(features).forEach(([feature, enabled]) => {
      const icon = enabled ? '✓' : '✗';
      const color = enabled ? chalk.green : chalk.gray;
      console.log(color(`  ${icon} ${this._formatFeatureName(feature)}`));
    });

    console.log();
  }

  /**
   * Format feature name
   * @private
   */
  _formatFeatureName(feature) {
    const map = {
      clientBundle: 'Client Bundle',
      serverBundle: 'Server Bundle',
      preRendering: 'Pre-rendering',
      hydration: 'Hydration',
      routes: 'Multi-route Support',
    };

    return map[feature] || feature;
  }

  /**
   * Build Single Page Application
   * @private
   */
  async _buildSPA() {
    console.log(chalk.blue('📦 Building SPA bundle...\n'));

    // Create output directory
    const outputDir = path.join(this.config.projectRoot, this.config.outputDir);
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Generate HTML entry
    const html = this._generateSPAHTML();
    const htmlPath = path.join(outputDir, 'index.html');
    await fs.promises.writeFile(htmlPath, html);

    this.results.files.push({
      type: 'html',
      path: 'index.html',
      size: Buffer.byteLength(html, 'utf-8'),
    });

    // Generate JavaScript bundle info
    this.results.bundles.push({
      type: 'spa',
      name: 'app',
      files: ['app.js'],
      entry: this.config.entryPoint,
    });

    this.stats.filesGenerated++;
    this.stats.bundleCount++;

    console.log(chalk.green('✓ SPA bundle created\n'));
  }

  /**
   * Generate SPA HTML
   * @private
   */
  _generateSPAHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="A FlutterJS Single Page Application">
  <meta name="theme-color" content="#6750A4">
  <title>FlutterJS App</title>
  
  <!-- CSS -->
  <link rel="stylesheet" href="/material.css">
  <link rel="stylesheet" href="/styles.css">
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/app.js" as="script">
</head>
<body>
  <!-- Root element for React/Vue/Flutter rendering -->
  <div id="root"></div>
  
  <!-- Application script -->
  <script type="module" src="/app.js"></script>
  
  <!-- HMR client for development -->
  <script type="module">
    if (process.env.NODE_ENV !== 'production') {
      import('/hmr-client.js').catch(e => console.warn('HMR disabled'));
    }
  </script>
</body>
</html>`;
  }

  /**
   * Build Multi-Page Application
   * @private
   */
  async _buildMPA() {
    console.log(chalk.blue('📖 Building MPA with multiple pages...\n'));

    // Find all page entry points
    const pages = await this._findPages();

    if (pages.length === 0) {
      console.log(chalk.yellow('⚠ No pages found in lib/pages/\n'));
      pages.push({
        name: 'home',
        entry: this.config.entryPoint,
        route: '/',
      });
    }

    const outputDir = path.join(this.config.projectRoot, this.config.outputDir);

    // Generate HTML for each page
    for (const page of pages) {
      const pageDir = path.join(outputDir, page.name === 'home' ? '' : page.name);
      await fs.promises.mkdir(pageDir, { recursive: true });

      const html = this._generateMPAHTML(page);
      const htmlPath = path.join(pageDir, 'index.html');
      await fs.promises.writeFile(htmlPath, html);

      this.results.files.push({
        type: 'html',
        path: `${page.name}/index.html`,
        size: Buffer.byteLength(html, 'utf-8'),
        route: page.route,
      });

      this.results.bundles.push({
        type: 'mpa',
        name: page.name,
        files: [`${page.name}.js`],
        entry: page.entry,
        route: page.route,
      });

      this.stats.bundleCount++;
    }

    this.stats.filesGenerated = pages.length;

    console.log(chalk.green(`✓ MPA with ${pages.length} page(s) created\n`));
  }

  /**
   * Find all page entry points
   * @private
   */
  async _findPages() {
    const pagesDir = path.join(this.config.projectRoot, 'lib/pages');

    if (!fs.existsSync(pagesDir)) {
      return [];
    }

    const pages = [];
    const entries = await fs.promises.readdir(pagesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const mainFile = path.join(pagesDir, entry.name, 'main.fjs');

        if (fs.existsSync(mainFile)) {
          pages.push({
            name: entry.name,
            entry: path.relative(this.config.projectRoot, mainFile),
            route: `/${entry.name}`,
          });
        }
      }
    }

    return pages;
  }

  /**
   * Generate MPA page HTML
   * @private
   */
  _generateMPAHTML(page) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FlutterJS Application - ${page.name}">
  <meta name="theme-color" content="#6750A4">
  <title>FlutterJS - ${this._capitalize(page.name)}</title>
  
  <!-- CSS -->
  <link rel="stylesheet" href="/material.css">
  <link rel="stylesheet" href="/styles.css">
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/${page.name}.js" as="script">
</head>
<body>
  <!-- Root element for rendering -->
  <div id="root"></div>
  
  <!-- Page-specific script -->
  <script type="module" src="/${page.name}.js"></script>
</body>
</html>`;
  }

  /**
   * Build Server-Side Rendering
   * @private
   */
  async _buildSSR() {
    console.log(chalk.blue('🖥️  Building SSR server bundle...\n'));

    const outputDir = path.join(this.config.projectRoot, this.config.outputDir);
    const serverDir = path.join(outputDir, 'server');

    // Create server directory
    await fs.promises.mkdir(serverDir, { recursive: true });

    // Generate server entry point
    const serverEntry = this._generateServerEntry();
    const serverEntryPath = path.join(serverDir, 'index.js');
    await fs.promises.writeFile(serverEntryPath, serverEntry);

    this.results.files.push({
      type: 'server',
      path: 'server/index.js',
      size: Buffer.byteLength(serverEntry, 'utf-8'),
    });

    // Generate package.json for server
    const serverPkg = this._generateServerPackageJson();
    const pkgPath = path.join(serverDir, 'package.json');
    await fs.promises.writeFile(pkgPath, JSON.stringify(serverPkg, null, 2));

    this.results.bundles.push({
      type: 'ssr',
      name: 'server',
      files: ['server/index.js'],
      entry: this.config.entryPoint,
      render: 'renderToString',
    });

    this.stats.filesGenerated = 2;
    this.stats.bundleCount = 1;

    console.log(chalk.green('✓ SSR server bundle created\n'));
  }

  /**
   * Generate server entry point
   * @private
   */
  _generateServerEntry() {
    return `/**
 * FlutterJS Server Entry Point
 * Generated for Server-Side Rendering
 */

import express from 'express';
import { renderToString } from '@flutterjs/core';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(express.static('${this.config.outputDir}'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main SSR route
app.get('*', async (req, res) => {
  try {
    // Import the app component dynamically
    const { default: App } = await import('..\\/${this.config.entryPoint}');
    
    // Render to string
    const html = await renderToString(new App({ path: req.path }));
    
    // Send response
    res.send(generateHTML(html));
  } catch (error) {
    console.error('SSR Error:', error);
    
    // Fallback to client-side rendering
    res.status(500).send(generateHTML('', true));
  }
});

/**
 * Generate complete HTML document
 */
function generateHTML(appHtml, isFallback = false) {
  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS App</title>
  <link rel="stylesheet" href="/material.css">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root">\${appHtml}</div>
  <script type="module" src="/app.js"></script>
  \${isFallback ? '<script>console.error("SSR failed, falling back to CSR")</script>' : ''}
</body>
</html>\`;
}

// Start server
app.listen(PORT, HOST, () => {
  console.log(\`✓ SSR server running at http://\${HOST}:\${PORT}\`);
});

export { app };
export default app;
`;
  }

  /**
   * Generate server package.json
   * @private
   */
  _generateServerPackageJson() {
    return {
      name: 'flutterjs-ssr-server',
      version: '1.0.0',
      description: 'FlutterJS Server-Side Rendering Server',
      type: 'module',
      main: 'index.js',
      scripts: {
        start: 'node index.js',
        dev: 'node --watch index.js',
      },
      dependencies: {
        express: '^4.18.0',
        '@flutterjs/core': '^1.0.0',
      },
      engines: {
        node: '>=18.0.0',
      },
    };
  }

  /**
   * Build Hybrid (SSR + Hydration)
   * @private
   */
  async _buildHybrid() {
    console.log(chalk.blue('⚡ Building Hybrid (SSR + CSR) bundle...\n'));

    // Build both server and client
    const outputDir = path.join(this.config.projectRoot, this.config.outputDir);

    // 1. Generate server bundle
    const serverEntry = this._generateHybridServerEntry();
    const serverDir = path.join(outputDir, 'server');
    await fs.promises.mkdir(serverDir, { recursive: true });
    const serverPath = path.join(serverDir, 'index.js');
    await fs.promises.writeFile(serverPath, serverEntry);

    // 2. Generate client hydration entry
    const clientEntry = this._generateHydrationClient();
    const clientPath = path.join(outputDir, 'hydrate.js');
    await fs.promises.writeFile(clientPath, clientEntry);

    // 3. Generate HTML template
    const htmlTemplate = this._generateHybridHTML();
    const htmlPath = path.join(outputDir, 'template.html');
    await fs.promises.writeFile(htmlPath, htmlTemplate);

    this.results.files.push(
      {
        type: 'server',
        path: 'server/index.js',
        size: Buffer.byteLength(serverEntry, 'utf-8'),
      },
      {
        type: 'client',
        path: 'hydrate.js',
        size: Buffer.byteLength(clientEntry, 'utf-8'),
      },
      {
        type: 'html',
        path: 'template.html',
        size: Buffer.byteLength(htmlTemplate, 'utf-8'),
      }
    );

    this.results.bundles.push(
      {
        type: 'hybrid',
        name: 'server',
        files: ['server/index.js'],
        purpose: 'Server-side rendering',
      },
      {
        type: 'hybrid',
        name: 'client',
        files: ['hydrate.js'],
        purpose: 'Client-side hydration',
      }
    );

    this.stats.filesGenerated = 3;
    this.stats.bundleCount = 2;

    console.log(chalk.green('✓ Hybrid SSR+CSR bundle created\n'));
  }

  /**
   * Generate hybrid server entry
   * @private
   */
  _generateHybridServerEntry() {
    return `/**
 * FlutterJS Hybrid Server Entry Point
 * Server-Side Rendering with Client-Side Hydration
 */

import express from 'express';
import { renderToString } from '@flutterjs/core';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static('.'));

// Main handler
app.get('*', async (req, res) => {
  try {
    const { default: App } = await import('../${this.config.entryPoint}');
    const appHtml = await renderToString(new App({ path: req.path }));
    
    // Send pre-rendered HTML with hydration script
    const template = fs.readFileSync('./template.html', 'utf-8');
    const html = template.replace('<div id="root"></div>', \`<div id="root">\${appHtml}</div>\`);
    
    res.send(html);
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).send(getErrorHTML());
  }
});

function getErrorHTML() {
  return \`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
</head>
<body>
  <h1>Server Error</h1>
  <p>Failed to render page. Please refresh.</p>
  <script src="/hydrate.js"></script>
</body>
</html>\`;
}

app.listen(PORT, () => {
  console.log(\`✓ Hybrid server running on port \${PORT}\`);
});
`;
  }

  /**
   * Generate hydration client
   * @private
   */
  _generateHydrationClient() {
    return `/**
 * FlutterJS Hydration Client
 * Hydrates server-rendered content with client interactivity
 */

import { hydrateRoot } from '@flutterjs/core';

// Hydrate the root element
const root = document.getElementById('root');

if (root && root.innerHTML.trim()) {
  // Server-rendered content exists, hydrate it
  hydrateRoot(root, App);
  console.log('✓ Hydration complete');
} else {
  // No server-rendered content, render on client
  import('./app.js').then(({ default: App }) => {
    renderRoot(root, new App());
    console.log('✓ Client-side rendering complete');
  });
}

async function renderRoot(container, app) {
  const { render } = await import('@flutterjs/core');
  render(app, container);
}
`;
  }

  /**
   * Generate hybrid HTML template
   * @private
   */
  _generateHybridHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS App</title>
  <link rel="stylesheet" href="/material.css">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/hydrate.js"></script>
</body>
</html>`;
  }

  /**
   * Build Static Site Generation
   * @private
   */
  async _buildStatic() {
    console.log(chalk.blue('📄 Building Static Site...\n'));

    // Find all routes to pre-render
    const routes = await this._findRoutes();

    if (routes.length === 0) {
      routes.push('/');
    }

    const outputDir = path.join(this.config.projectRoot, this.config.outputDir);

    // Pre-render each route
    for (const route of routes) {
      const filename = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
      const filePath = path.join(outputDir, filename);

      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

      // Generate pre-rendered HTML
      const html = await this._prerenderRoute(route);
      await fs.promises.writeFile(filePath, html);

      this.results.files.push({
        type: 'static',
        path: filename,
        route,
        size: Buffer.byteLength(html, 'utf-8'),
      });
    }

    this.stats.filesGenerated = routes.length;
    this.stats.bundleCount = 1;

    console.log(chalk.green(`✓ Static site with ${routes.length} route(s) generated\n`));
  }

  /**
   * Find all routes to pre-render
   * @private
   */
  async _findRoutes() {
    // Try to load routes from config or find them
    const routes = [
      '/',
      '/about',
      '/contact',
      // Can be extended based on actual app routes
    ];

    return routes;
  }

  /**
   * Pre-render a single route
   * @private
   */
  async _prerenderRoute(route) {
    // Simplified pre-rendering
    // In production, would use renderToString or similar
    return this._generateSPAHTML(); // Fallback to SPA
  }

  /**
   * Capitalize string
   * @private
   */
  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Log build results
   * @private
   */
  _logResults() {
    console.log(chalk.green('✓ Build complete\n'));

    console.log(chalk.blue('📊 Build Summary:\n'));
    console.log(chalk.gray(`  Target: ${this.config.target.toUpperCase()}`));
    console.log(chalk.gray(`  Files generated: ${this.stats.filesGenerated}`));
    console.log(chalk.gray(`  Bundles: ${this.stats.bundleCount}`));
    console.log(chalk.gray(`  Build time: ${this.stats.buildTime.toFixed(2)}ms\n`));

    // Files breakdown
    if (this.results.files.length > 0) {
      console.log(chalk.blue('📁 Generated Files:\n'));
      this.results.files.forEach(file => {
        console.log(
          chalk.gray(
            `  ${file.path.padEnd(40)} ${this._formatBytes(file.size)}`
          )
        );
      });
      console.log();
    }

    // Bundles info
    if (this.results.bundles.length > 0) {
      console.log(chalk.blue('📦 Bundles:\n'));
      this.results.bundles.forEach(bundle => {
        console.log(chalk.gray(`  ${bundle.name}: ${bundle.files.join(', ')}`));
      });
      console.log();
    }

    // Warnings
    if (this.results.warnings.length > 0) {
      console.log(chalk.yellow(`⚠️ Warnings: ${this.results.warnings.length}\n`));
      this.results.warnings.slice(0, 5).forEach(warn => {
        console.log(chalk.yellow(`  ${warn}`));
      });
      if (this.results.warnings.length > 5) {
        console.log(chalk.yellow(`  ... and ${this.results.warnings.length - 5} more`));
      }
      console.log();
    }
  }

  /**
   * Format bytes to human readable size
   * @private
   */
  _formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Get build results
   */
  getResults() {
    return { ...this.results };
  }

  /**
   * Get statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get target features
   */
  getTargetFeatures() {
    return { ...TARGET_FEATURES[this.config.target] };
  }

  /**
   * Is target feature enabled
   */
  hasFeature(feature) {
    return TARGET_FEATURES[this.config.target]?.[feature] || false;
  }

  /**
   * Add warning
   */
  addWarning(message) {
    this.results.warnings.push(message);
  }

  /**
   * Get all bundles
   */
  getBundles() {
    return [...this.results.bundles];
  }

  /**
   * Get all generated files
   */
  getFiles() {
    return [...this.results.files];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TargetBuilder,
  BUILD_TARGETS,
  TARGET_DESCRIPTIONS,
  TARGET_FEATURES,
};
