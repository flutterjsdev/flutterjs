/**
 * ============================================================================
 * BuildGenerator - Output Generation & Reporting (Phases 8-10)
 * ============================================================================
 *
 * Responsibility: HTML/CSS/JS generation, file output, and build reporting
 * 
 * ✅ UPDATED: Removed package copying (done in phase 4)
 * ✅ UPDATED: Uses ImportRewriter for import maps
 * ✅ CLEANED: Only handles file generation and output
 * 
 * Phases:
 * 8. Generate HTML
 * 9. Generate output files
 * 10. Generate report
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";

class BuildGenerator {
  constructor(buildIntegration) {
    this.integration = buildIntegration;
    this.config = buildIntegration.config;
    this.projectRoot = buildIntegration.projectRoot;

    if (this.config.debugMode) {
      console.log(chalk.gray("[BuildGenerator] Initialized\n"));
    }
  }

  /**
   * ========================================================================
   * PHASE 8: GENERATE HTML
   * ========================================================================
   */
  async phase8_generateHTML() {
    const spinner = ora(chalk.blue("📄 Phase 8: Generating HTML...")).start();

    try {
      this.integration.generatedHTML = this.generateHTMLShell();

      if (this.config.debugMode) {
        console.log(chalk.green("✓ HTML generated"));
        console.log(
          chalk.gray(`  Size: ${this.integration.generatedHTML.length} bytes\n`)
        );
      }

      spinner.succeed(chalk.green("✓ HTML generation complete"));
    } catch (error) {
      spinner.fail(chalk.red(`✗ HTML generation failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 9: GENERATE OUTPUT FILES
   * ========================================================================
   * ✅ UPDATED: Removed package copying (done in phase 4)
   */
  async phase9_generateOutput() {
    const spinner = ora(
      chalk.blue("💾 Phase 9: Generating output files...")
    ).start();

    try {
      if (!this.integration.analysis) {
        throw new Error("Analysis data is missing");
      }

      const outputDir = path.join(this.projectRoot, this.config.outputDir);
      await fs.promises.mkdir(outputDir, { recursive: true });

      const files = [];
      const metadata = this.buildMetadata();
      const registry = this.generateWidgetRegistry();

      this.integration.buildOutput = {
        outputDir,
        files: [],
        metadata,
        registry,
        manifest: {},
      };

      // ✅ 1. Write transformed code
      const mainPath = path.join(outputDir, "main.js");
      const transformedCode = this.integration.transformed?.transformedCode || "";
      await fs.promises.writeFile(mainPath, transformedCode, "utf-8");
      files.push({ name: "main.js", size: transformedCode.length });

      // ✅ 2. Write HTML
      const htmlPath = path.join(outputDir, "index.html");
      const htmlWrapper = this.wrapHTMLWithTemplate(
        this.integration.generatedHTML,
        metadata
      );
      await fs.promises.writeFile(htmlPath, htmlWrapper, "utf-8");
      files.push({ name: "index.html", size: htmlWrapper.length });

      // ✅ 3. Write metadata
      const metadataPath = path.join(outputDir, "metadata.json");
      await fs.promises.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        "utf-8"
      );
      files.push({
        name: "metadata.json",
        size: JSON.stringify(metadata).length,
      });

      // ✅ 4. Write widget registry
      const registryPath = path.join(outputDir, "widget_registry.json");
      await fs.promises.writeFile(
        registryPath,
        JSON.stringify(registry, null, 2),
        "utf-8"
      );
      files.push({
        name: "widget_registry.json",
        size: JSON.stringify(registry).length,
      });

      // ✅ 5. Write app.js bootstrap
      const appPath = path.join(outputDir, "app.js");
      const appCode = this.generateAppBootstrap();
      await fs.promises.writeFile(appPath, appCode, "utf-8");
      files.push({ name: "app.js", size: appCode.length });

      // ✅ 6. Write styles.css
      const stylesPath = path.join(outputDir, "styles.css");
      const styles = this.generateStyles();
      await fs.promises.writeFile(stylesPath, styles, "utf-8");
      files.push({ name: "styles.css", size: styles.length });

      // ✅ 7. Write manifest
      const manifestPath = path.join(outputDir, "manifest.json");
      const manifest = this.buildManifest();
      await fs.promises.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2),
        "utf-8"
      );
      files.push({
        name: "manifest.json",
        size: JSON.stringify(manifest).length,
      });

      this.integration.buildOutput.files = files;
      this.integration.buildOutput.manifest = manifest;

      spinner.succeed(chalk.green("✓ Output generated"));
      if (this.config.debugMode) {
        console.log(chalk.gray(`  Files: ${files.length}`));
        console.log(chalk.gray(`  Output: ${outputDir}\n`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`✗ Output generation failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 10: GENERATE REPORT
   * ========================================================================
   */
  phase10_report(duration) {
    console.log(chalk.blue("\n" + "=".repeat(70)));
    console.log(chalk.blue("BUILD COMPLETE"));
    console.log(chalk.blue("=".repeat(70)));

    console.log(chalk.gray("\n📊 Statistics:\n"));
    console.log(
      chalk.gray(
        `  Source Code: ${this.integration.analysis?.metadata?.linesOfCode || 0} lines`
      )
    );
    console.log(chalk.gray(`  Widgets: ${this.integration.analysis?.widgets?.count || 0}`));
    console.log(
      chalk.gray(
        `  Generated HTML: ${this.integration.generatedHTML?.length || 0} bytes`
      )
    );
    console.log(chalk.gray(`  Build Time: ${duration}ms`));

    const bundleSize = this.calculateBundleSize();
    const bundleSizeKB = (bundleSize / 1024).toFixed(2);

    console.log(chalk.green(`\n✅ Output: ${this.integration.buildOutput?.outputDir}`));
    console.log(chalk.green(`   - index.html`));
    console.log(chalk.green(`   - app.js`));
    console.log(chalk.green(`   - styles.css`));
    console.log(chalk.green(`   - metadata.json`));
    console.log(chalk.green(`   - widget_registry.json`));
    console.log(chalk.green(`   - manifest.json`));

    console.log(chalk.gray(`\n📦 Bundle Size: ${bundleSizeKB} KB`));
    console.log(chalk.gray(`⏱️  Duration: ${duration}ms`));
    console.log(chalk.blue("\n" + "=".repeat(70) + "\n"));
  }

  // ========================================================================
  // FILE GENERATION HELPERS
  // ========================================================================

  /**
   * Generate HTML shell content
   * Simple loading state for the app
   */
  generateHTMLShell() {
    const projectName =
      this.integration.analysis?.metadata?.projectName || "FlutterJS App";

    return `<div id="app-container">
  <div class="app-loading">
    <div class="app-loader">
      <p>Loading ${projectName}...</p>
      <div class="spinner"></div>
    </div>
  </div>
  <noscript>
    <p style="color: red; font-family: sans-serif; padding: 20px;">
      This application requires JavaScript to be enabled.
    </p>
  </noscript>
</div>

<style>
  #app-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .app-loading {
    text-align: center;
  }

  .app-loader p {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #333;
    margin-bottom: 20px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #6750a4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>`;
  }

  /**
   * Wrap HTML shell with full HTML template
   * ✅ UPDATED: Gets import map from ImportRewriter
   */
  wrapHTMLWithTemplate(bodyHTML, metadata) {
    // ✅ Get import map from ImportRewriter
    const importRewriter = this.integration.analyzer.importRewriter;
    const importMapScript = importRewriter.getImportMapScript();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Built with FlutterJS">
  <meta name="theme-color" content="#6750a4">
  <title>${metadata.projectName}</title>
  <link rel="stylesheet" href="./styles.css">
  
  <!-- ✅ Import Map from ImportRewriter -->
  <!-- Maps @flutterjs/* packages to ./node_modules/@flutterjs/ -->
  ${importMapScript}

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body { background: #fffbfe; color: #1c1b1f; }
    #root { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root">${bodyHTML}</div>
  <script src="./app.js" type="module" defer></script>
</body>
</html>`;
  }

  /**
   * Generate CSS styles
   * Material Design 3 base styles
   */
  generateStyles() {
    return `/**
 * FlutterJS Base Styles
 * Material Design 3 Theme
 */

:root {
  --primary: #6750a4;
  --on-primary: #ffffff;
  --primary-container: #eaddff;
  --on-primary-container: #21005e;
  --secondary: #625b71;
  --on-secondary: #ffffff;
  --secondary-container: #e8def8;
  --tertiary: #7d5260;
  --on-tertiary: #ffffff;
  --error: #b3261e;
  --on-error: #ffffff;
  --outline: #79747e;
  --background: #fffbfe;
  --on-background: #1c1b1f;
  --surface: #fffbfe;
  --on-surface: #1c1b1f;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--surface);
  color: var(--on-surface);
}

#root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Material Design Utilities */
.fjs-container { display: flex; flex-direction: column; }
.fjs-row { display: flex; flex-direction: row; }
.fjs-center { display: flex; align-items: center; justify-content: center; }
.fjs-text { display: inline; line-height: 1.5; }
.fjs-button {
  padding: 10px 24px;
  background-color: var(--primary);
  color: var(--on-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}
.fjs-button:hover { opacity: 0.9; }
.fjs-button:active { transform: scale(0.98); }`;
  }

  /**
   * Generate widget registry
   * Maps widget names to their type and methods
   */
  generateWidgetRegistry() {
    const registry = {};
    const stateless = this.integration.analysis?.widgets?.stateless || [];
    const stateful = this.integration.analysis?.widgets?.stateful || [];

    stateless.forEach((widget) => {
      if (widget && typeof widget === "string") {
        registry[widget] = { type: "stateless", methods: ["build"] };
      }
    });

    stateful.forEach((widget) => {
      if (widget && typeof widget === "string") {
        registry[widget] = {
          type: "stateful",
          methods: ["createState"],
          stateClass: `_${widget}State`,
        };
      }
    });

    return registry;
  }

  /**
   * Generate app.js bootstrap code
   * Entry point for the application
   */
  generateAppBootstrap() {
    const stateless = this.integration.analysis?.widgets?.stateless || [];
    const stateful = this.integration.analysis?.widgets?.stateful || [];
    const allWidgets = [...stateless, ...stateful].filter(Boolean);
    const rootWidget = this.integration.analysis?.metadata?.rootWidget || "MyApp";

    const widgetImports =
      allWidgets.length > 0
        ? `import { ${allWidgets.join(", ")} } from './main.js';`
        : `// No widgets to import`;

    return `/**
 * FlutterJS Application Bootstrap
 * Generated at: ${new Date().toISOString()}
 * 
 * This file:
 * 1. Imports user-defined widgets from main.fjs
 * 2. Imports runtime from @flutterjs/runtime package
 * 3. Initializes and runs the app
 */

// ============================================================================
// IMPORTS
// ============================================================================

${widgetImports}

import {
  FlutterJSRuntime,
  runApp,
  getRuntime,
  updateApp,
  hotReload,
  dispose
} from '@flutterjs/runtime';

// ============================================================================
// BUILD-TIME METADATA
// ============================================================================

const analysisMetadata = ${JSON.stringify(
      this.integration.analysis?.metadata || {},
      null,
      2
    )};

const widgetExports = {
  ${allWidgets.map((w) => `${w}`).join(",\n  ")}
};

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

async function bootApp() {
  console.log('🚀 FlutterJS App Starting...');
  console.log('Root widget: ${rootWidget}');
  
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element #root not found in DOM');
    }

    // ✅ Create runtime instance with configuration
    const runtime = new FlutterJSRuntime({
      debugMode: ${this.config.debugMode},
      enableHotReload: ${this.config.mode === "development"},
      enableStateTracking: true,
      enablePerformanceTracking: true,
      mode: 'csr',
      target: '${this.config.target}'
    });

    // ✅ Initialize runtime
    runtime.initialize({ rootElement });

    // ✅ Get the root widget class
    ${
      allWidgets.length > 0
        ? `const RootWidget = ${rootWidget};
    
    if (!RootWidget) {
      throw new Error('Root widget ${rootWidget} not found');
    }

    // ✅ Run the app with the root widget
    runtime.runApp(new RootWidget(), {
      buildContext: {},
      appBuilder: null // Can integrate AppBuilder later if needed
    });`
        : `// No widgets found - nothing to render
    console.warn('⚠️  No widgets found in analysis');
    console.warn('Make sure to export widget classes from main.fjs');`
    }

    console.log('✓ App initialized successfully');
    
    // ✅ Log runtime statistics
    const stats = runtime.getStats?.();
    if (stats) {
      console.log('Statistics:');
      console.log('  Environment:', stats.environment);
      console.log('  Mount Time:', stats.mountTime?.toFixed(2) + 'ms');
      console.log('  Render Time:', stats.renderTime?.toFixed(2) + 'ms');
    }
    
    // ✅ Store for debugging and external access
    window.__flutterjs_runtime__ = runtime;
    window.__flutterjs_widgets__ = widgetExports;
    window.__flutterjs_metadata__ = analysisMetadata;
    
    // ✅ Setup hot reload in development mode
    if (${this.config.mode === "development"}) {
      setupHotReload(runtime);
    }

  } catch (error) {
    console.error('✗ App initialization failed:', error.message);
    if (${this.config.debugMode}) {
      console.error('Stack:', error.stack);
    }
    showErrorOverlay(error.message);
    throw error;
  }
}

// ============================================================================
// HOT RELOAD (Development Mode)
// ============================================================================

function setupHotReload(runtime) {
  if (!${this.config.mode === "development"}) return;

  console.log('🔥 Hot reload enabled');

  // Listen for HMR messages from dev server
  if (typeof window !== 'undefined' && window.__flutterjs_hmr__) {
    window.__flutterjs_hmr__.on('update', async (updatedCode) => {
      try {
        console.log('📄 Hot reload triggered...');
        
        // Update and re-render
        runtime.update?.({ rebuild: true, forceRender: true });
        
        console.log('✓ Hot reload complete');
      } catch (error) {
        console.error('✗ Hot reload failed:', error);
      }
    });
  }
}

// ============================================================================
// ERROR OVERLAY (Development Mode)
// ============================================================================

function showErrorOverlay(message) {
  if (typeof document === 'undefined') return;

  // Remove existing overlay if any
  const existing = document.getElementById('__flutterjs_error_overlay__');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = '__flutterjs_error_overlay__';
  overlay.style.cssText = \`
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: monospace;
  \`;

  const errorBox = document.createElement('div');
  errorBox.style.cssText = \`
    background: white;
    padding: 30px;
    border-radius: 8px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    color: #d32f2f;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
  \`;

  errorBox.innerHTML = \`
    <h2 style="margin: 0 0 15px 0; color: #d32f2f;">✗ Application Error</h2>
    <pre style="
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin: 0;
      color: #c62828;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.4;
    ">\${message}</pre>
    <p style="color: #666; margin-top: 20px; font-size: 12px;">
      Check the browser console for more details.
    </p>
  \`;

  overlay.appendChild(errorBox);
  document.body.appendChild(overlay);
}

// ============================================================================
// BOOTSTRAP TRIGGER
// ============================================================================

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    // DOM still loading
    document.addEventListener('DOMContentLoaded', bootApp);
  } else {
    // DOM already loaded
    bootApp();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  bootApp,
  widgetExports,
  analysisMetadata
};
`;
  }

  // ========================================================================
  // METADATA & MANIFEST BUILDERS
  // ========================================================================

  /**
   * Build metadata from analysis results
   */
  buildMetadata() {
    return {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      projectName: this.integration.analysis?.metadata?.projectName || "FlutterJS App",
      rootWidget: this.integration.analysis?.metadata?.rootWidget || "MyApp",
      widgets: {
        stateless: this.integration.analysis?.widgets?.stateless || [],
        stateful: this.integration.analysis?.widgets?.stateful || [],
        count:
          (this.integration.analysis?.widgets?.stateless?.length || 0) +
          (this.integration.analysis?.widgets?.stateful?.length || 0),
      },
      stateClasses: this.integration.analysis?.metadata?.stateClasses || {},
      imports: this.integration.analysis?.imports || [],
      runtimeRequirements: {
        requiresThemeProvider: true,
        requiresMediaQuery: true,
        requiresNavigator: false,
        stateManagement: "local",
        asyncOperations: false,
      },
    };
  }

  /**
   * Build manifest file content
   */
  buildManifest() {
    return {
      name: this.integration.analysis?.metadata?.projectName || "FlutterJS App",
      version: "1.0.0",
      description: "Built with FlutterJS",
      build: {
        timestamp: new Date().toISOString(),
        mode: this.config.mode,
        target: this.config.target,
      },
      stats: {
        linesOfCode: this.integration.analysis?.metadata?.linesOfCode || 0,
        widgetsFound: this.integration.analysis?.widgets?.count || 0,
        packagesResolved: this.integration.resolution?.packages.size || 0,
        filesCollected: this.integration.collection?.copiedFiles?.length || 0,
        importsRewritten: this.integration.transformed?.importsRewritten || 0,
        htmlSize: this.integration.generatedHTML?.length || 0,
      },
    };
  }

  /**
   * Calculate total bundle size
   */
  calculateBundleSize() {
    try {
      let totalSize = 0;

      if (this.integration.transformed?.transformedCode) {
        totalSize += Buffer.byteLength(
          this.integration.transformed.transformedCode,
          "utf-8"
        );
      }

      if (this.integration.buildOutput?.metadata) {
        totalSize += Buffer.byteLength(
          JSON.stringify(this.integration.buildOutput.metadata),
          "utf-8"
        );
      }

      if (this.integration.buildOutput?.registry) {
        totalSize += Buffer.byteLength(
          JSON.stringify(this.integration.buildOutput.registry),
          "utf-8"
        );
      }

      if (this.integration.collection?.totalSize) {
        totalSize += this.integration.collection.totalSize;
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}

export { BuildGenerator };
export default BuildGenerator;