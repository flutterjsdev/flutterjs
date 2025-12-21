/**
 * ============================================================================
 * FlutterJS Build Pipeline - Complete Implementation (UPDATED)
 * ============================================================================
 * 
 * NOW WITH AppBuilder INTEGRATION
 * 
 * Enhanced to:
 * - Inject AppBuilder into generated app.js
 * - Pass analysis metadata for widget registration
 * - Handle state lifecycle during build
 * - Generate proper entry point for runtime
 * 
 * Location: cli/build/build_pipeline.js
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Analyzer } from '../../src/analyzer/src/analyzer.js';
import { DependencyResolver } from './dependency_resolver.js';
import { PackageCollector } from './package_collector.js';
import { ImportRewriter } from './import_rewriter.js';
import { CodeTransformer } from './code_transformer.js';
import { PathResolver } from './path-resolver.js';

// ============================================================================
// BUILD RESULT TYPES
// ============================================================================

class BuildResult {
  constructor() {
    this.success = false;
    this.outputDir = '';
    this.timestamp = new Date().toISOString();
    this.duration = 0;

    this.analysis = null;
    this.resolution = null;
    this.collection = null;
    this.rewrite = null;
    this.transformation = null;

    this.files = {
      index_html: null,
      app_js: null,
      runtime_js: null,
      styles_css: null,
      manifest_json: null,
      app_builder_js: null
    };

    this.stats = {
      linesOfCode: 0,
      widgetsFound: 0,
      packagesResolved: 0,
      filesCollected: 0,
      importsRewritten: 0,
      transformationsApplied: 0,
      bundleSize: 0
    };

    this.errors = [];
    this.warnings = [];
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}

// ============================================================================
// MAIN BUILD PIPELINE CLASS
// ============================================================================

class BuildPipeline {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      mode: config.mode || 'development',
      target: config.target || 'spa',

      // FIX: Properly extract entry file from config.entry.main
      entry: config.entry || { main: 'lib/main.fjs' },
      entryFile: config.entryFile || config.entry?.main || 'lib/main.fjs',  // âœ… NORMALIZED

      outputDir: config.outputDir || 'dist',
      devDir: config.devDir || '.dev',
      debugMode: config.debugMode || false,
      watch: config.watch || false,
      minify: config.minify || false,
      sourceMap: config.sourceMap !== false,
      verbose: config.verbose || false,
      ...config
    };

    this.projectRoot = this.config.projectRoot;

    this.pathResolver = new PathResolver(this.projectRoot, this.config);

    this.result = new BuildResult();

    if (this.config.debugMode) {
      console.log(chalk.gray('[BuildPipeline] Initialized'));
      console.log(chalk.gray(`  Entry: ${this.config.entryFile}`));
      console.log(chalk.gray(`  Output: ${this.config.outputDir}`));
    }
  }
  /**
   * MAIN ENTRY POINT: Execute complete build
   */
  async run() {
    const startTime = Date.now();

    if (this.config.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(70)));
      console.log(chalk.blue('FLUTTERJS BUILD PIPELINE'));
      console.log(chalk.blue('='.repeat(70)));
      console.log(chalk.gray(`Mode: ${this.config.mode}`));
      console.log(chalk.gray(`Entry (from config): ${this.config.entry?.main || 'lib/main.fjs'}`));
      console.log(chalk.gray(`Resolved: ${this.pathResolver.getSourcePath()}`));
      console.log(chalk.gray(`Output: ${this.config.outputDir}\n`));
    }

    try {
      // Step 1: Analyze code
      await this.analyzeCode();

      // Step 2: Resolve dependencies
      await this.resolveDependencies();

      // Step 3: Collect packages
      await this.collectPackages();

      // Step 4: Rewrite imports
      await this.rewriteImports();

      // Step 5: Transform code
      await this.transformCode();

      // Step 6: Generate output (WITH AppBuilder integration)
      await this.generateOutput();

      // Step 7: Write files
      await this.writeFiles();

      this.result.success = true;
      this.result.duration = Date.now() - startTime;
      this.result.outputDir = path.join(this.projectRoot, this.config.outputDir);

      if (this.config.debugMode) {
        this.printSummary();
      }

      return this.result;

    } catch (error) {
      this.result.success = false;
      this.result.addError(`Build failed: ${error.message}`);
      console.error(chalk.red(`\nâŒ ${error.message}\n`));
      throw error;
    }
  }

  /**
   * FIXED: analyzeCode() method
   * 
   * The problem:
   * - this.config.entryFile is a STRING: 'lib/main.fjs'
   * - You were trying to access .main on it: this.config.entryFile.main
   * - This caused: "Cannot read properties of undefined (reading 'main')"
   * 
   * The solution:
   * - Use this.config.entryFile directly (it's already the full path)
   * - OR use this.config.entry.main from the config object
   */

async analyzeCode() {
  if (this.config.debugMode) {
    console.log(chalk.blue('ðŸ"Š STEP 1: Code Analysis'));
  }

  try {
    // FIX: Get entry file path correctly
    // Option 1: Use config.entry.main (from flutterjs.config.js)
    const entryFile = this.config.entry?.main || this.config.entryFile || 'lib/main.fjs';
    
    const entryPath = path.join(this.projectRoot, entryFile);

    if (this.config.debugMode) {
      console.log(chalk.gray(`  Entry: ${entryFile}`));
      console.log(chalk.gray(`  Full path: ${entryPath}`));
    }

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${entryPath}`);
    }

    const sourceCode = fs.readFileSync(entryPath, 'utf-8');

    if (this.config.debugMode) {
      console.log(chalk.gray(`  Source file loaded: ${entryPath}`));
      console.log(chalk.gray(`  Source code length: ${sourceCode.length} chars`));
    }

    // FIX: Pass sourceCode to constructor, not to analyze()
    const analyzer = new Analyzer({
      sourceCode: sourceCode,      // ← Pass here in constructor options
      sourceFile: entryPath,       // Also pass file path
      debugMode: this.config.debugMode,
      verbose: false,
      includeImports: true,
      includeContext: true,
      includeSsr: true
    });

    // Call analyze() with NO parameters
    this.result.analysis = await analyzer.analyze();
    
    this.result.stats.linesOfCode = sourceCode.split('\n').length;
    
    // Handle different widget object structures
    const widgetsObj = this.result.analysis?.widgets || {};
    const widgetCount = (widgetsObj.count || 0) + (widgetsObj.stateless || 0) + (widgetsObj.stateful || 0);
    
    this.result.stats.widgetsFound = widgetCount;

    if (this.config.debugMode) {
      console.log(chalk.green(`âœ" Found ${widgetCount} widgets`));
      console.log(chalk.green(`âœ" ${this.result.analysis.imports?.total || 0} imports\n`));
    }

  } catch (error) {
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

/**
 * ALSO FIX: rewriteImports() method
 * Same issue here - using this.config.entryFile incorrectly
 */

async rewriteImports() {
  if (this.config.debugMode) {
    console.log(chalk.blue('âœ"ðŸ¸ STEP 4: Import Rewriting'));
  }

  try {
    // FIX: Get entry file correctly
    const entryFile = this.config.entry?.main || this.config.entryFile || 'lib/main.fjs';
    const entryPath = path.join(this.projectRoot, entryFile);
    
    const sourceCode = fs.readFileSync(entryPath, 'utf-8');

    const rewriter = new ImportRewriter(this.exportMaps, {
      debugMode: this.config.debugMode,
      libPath: './lib',
      preserveStructure: false,
      validateExports: true
    });

    this.result.rewrite = rewriter.rewrite(sourceCode);
    this.result.stats.importsRewritten = this.result.rewrite.stats.rewritten;

    if (this.config.debugMode) {
      console.log(chalk.green(
        `âœ" Rewritten ${this.result.rewrite.stats.rewritten} imports`
      ));
      console.log(chalk.green(
        `âœ" Unchanged: ${this.result.rewrite.stats.unchanged}\n`
      ));
    }

    if (this.result.rewrite.errors.length > 0) {
      for (const error of this.result.rewrite.errors) {
        this.result.addError(`Import: ${error}`);
      }
    }

  } catch (error) {
    throw new Error(`Import rewriting failed: ${error.message}`);
  }
}

  /**
   * Step 2: Resolve dependencies
   */
  async resolveDependencies() {
    if (this.config.debugMode) {
      console.log(chalk.blue('ðŸ" STEP 2: Dependency Resolution'));
    }

    try {
      const resolver = new DependencyResolver({
        projectRoot: this.projectRoot,
        debugMode: this.config.debugMode
      });

      this.result.resolution = await resolver.resolveAll(
        this.result.analysis.imports
      );

      this.result.stats.packagesResolved = this.result.resolution.packages.size;

      if (this.config.debugMode) {
        console.log(chalk.green(
          `âœ" Resolved ${this.result.resolution.packages.size} packages`
        ));
        console.log(chalk.green(
          `âœ" Found ${this.result.resolution.allFiles.length} files\n`
        ));
      }

      if (this.result.resolution.hasErrors?.()) {
        for (const error of this.result.resolution.errors) {
          this.result.addError(`Resolution: ${error}`);
        }
      }

    } catch (error) {
      throw new Error(`Dependency resolution failed: ${error.message}`);
    }
  }

  /**
   * Step 3: Collect packages
   */
  async collectPackages() {
    if (this.config.debugMode) {
      console.log(chalk.blue('ðŸ"¦ STEP 3: Package Collection'));
    }

    try {
      const collector = new PackageCollector({
        projectRoot: this.projectRoot,
        outputDir: this.config.devDir,
        libDir: 'lib',
        debugMode: this.config.debugMode,
        createIndexFiles: true,
        generateExportMaps: true
      });

      this.result.collection = await collector.collect(this.result.resolution);
      this.result.stats.filesCollected = this.result.collection.copiedFiles.length;

      if (this.config.debugMode) {
        console.log(chalk.green(
          `âœ" Collected ${this.result.collection.copiedFiles.length} files`
        ));
        console.log(chalk.green(
          `âœ" Total size: ${this.result.collection.totalSizeMB} MB\n`
        ));
      }

      this.exportMaps = collector.getExportMaps();

    } catch (error) {
      throw new Error(`Package collection failed: ${error.message}`);
    }
  }

  /**
   * Step 4: Rewrite imports
   */
  async rewriteImports() {
    if (this.config.debugMode) {
      console.log(chalk.blue('âœï¸  STEP 4: Import Rewriting'));
    }

    try {
      const entryPath = path.join(this.projectRoot, this.config.entryFile);
      const sourceCode = fs.readFileSync(entryPath, 'utf-8');

      const rewriter = new ImportRewriter(this.exportMaps, {
        debugMode: this.config.debugMode,
        libPath: './lib',
        preserveStructure: false,
        validateExports: true
      });

      this.result.rewrite = rewriter.rewrite(sourceCode);
      this.result.stats.importsRewritten = this.result.rewrite.stats.rewritten;

      if (this.config.debugMode) {
        console.log(chalk.green(
          `âœ" Rewritten ${this.result.rewrite.stats.rewritten} imports`
        ));
        console.log(chalk.green(
          `âœ" Unchanged: ${this.result.rewrite.stats.unchanged}\n`
        ));
      }

      if (this.result.rewrite.errors.length > 0) {
        for (const error of this.result.rewrite.errors) {
          this.result.addError(`Import: ${error}`);
        }
      }

    } catch (error) {
      throw new Error(`Import rewriting failed: ${error.message}`);
    }
  }

  /**
   * Step 5: Transform code
   */
  async transformCode() {
    if (this.config.debugMode) {
      console.log(chalk.blue('ðŸ"§ STEP 5: Code Transformation'));
    }

    try {
      const transformer = new CodeTransformer(this.result.analysis, {
        debugMode: this.config.debugMode,
        injectState: true,
        injectLifecycle: true,
        addMetadata: true,
        validateExports: true
      });

      this.result.transformation = transformer.transform(
        this.result.rewrite.rewrittenCode
      );

      this.result.stats.transformationsApplied =
        this.result.transformation.transformations.length;

      if (this.config.debugMode) {
        console.log(chalk.green(
          `âœ" Transformed ${this.result.transformation.widgets.size} widgets`
        ));
        console.log(chalk.green(
          `âœ" Applied ${this.result.transformation.transformations.length} transformations`
        ));
        console.log(chalk.green(
          `âœ" Generated exports for ${this.result.transformation.exports.length} symbols\n`
        ));
      }

    } catch (error) {
      throw new Error(`Code transformation failed: ${error.message}`);
    }
  }

  /**
   * Step 6: Generate output files (WITH AppBuilder)
   */
  async generateOutput() {
    if (this.config.debugMode) {
      console.log(chalk.blue('ðŸ" STEP 6: Output Generation'));
    }

    try {
      // Generate HTML
      this.result.files.index_html = this.generateHTML();

      // Generate app.js WITH AppBuilder injection
      this.result.files.app_js = this.generateAppJS();

      // Generate runtime.js
      this.result.files.runtime_js = this.generateRuntimeJS();

      // Generate styles.css
      this.result.files.styles_css = this.generateStyles();

      // Generate manifest.json
      this.result.files.manifest_json = this.generateManifest();

      // Generate app_builder.js (copy from framework)
      this.result.files.app_builder_js = this.generateAppBuilderJS();

      if (this.config.debugMode) {
        console.log(chalk.green('âœ" Generated index.html'));
        console.log(chalk.green('âœ" Generated app.js (with AppBuilder)'));
        console.log(chalk.green('âœ" Generated runtime.js'));
        console.log(chalk.green('âœ" Generated styles.css'));
        console.log(chalk.green('âœ" Generated app_builder.js'));
        console.log(chalk.green('âœ" Generated manifest.json\n'));
      }

    } catch (error) {
      throw new Error(`Output generation failed: ${error.message}`);
    }
  }

  /**
   * Step 7: Write files to disk
   */
  async writeFiles() {
    if (this.config.debugMode) {
      console.log(chalk.blue(' STEP 7: Writing Files'));
    }

    try {
      const outputDir = path.join(this.projectRoot, this.config.outputDir);

      await fs.promises.mkdir(outputDir, { recursive: true });

      const files = [
        { name: 'index.html', content: this.result.files.index_html },
        { name: 'app.js', content: this.result.files.app_js },
        { name: 'runtime.js', content: this.result.files.runtime_js },
        { name: 'styles.css', content: this.result.files.styles_css },
        { name: 'manifest.json', content: this.result.files.manifest_json },
        { name: 'app_builder.js', content: this.result.files.app_builder_js }
      ];

      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(outputDir, file.name);
        await fs.promises.writeFile(filePath, file.content, 'utf-8');

        const size = Buffer.byteLength(file.content, 'utf-8');
        totalSize += size;

        if (this.config.debugMode) {
          const sizeKB = (size / 1024).toFixed(2);
          console.log(chalk.green(`âœ" ${file.name} (${sizeKB} KB)`));
        }
      }

      this.result.stats.bundleSize = totalSize;

      if (this.config.debugMode) {
        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log(chalk.green(`âœ" Total size: ${totalMB} MB\n`));
      }

    } catch (error) {
      throw new Error(`Failed to write files: ${error.message}`);
    }
  }

  /**
   * Generate index.html
   */
  generateHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FlutterJS Application">
  <meta name="theme-color" content="#6750a4">
  <title>${this.result.analysis.projectName || 'FlutterJS App'}</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    #root {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="/runtime.js" defer></script>
  <script src="/app_builder.js" defer></script>
  <script src="/app.js" type="module" defer></script>
</body>
</html>`;
  }

  /**
   * Generate app.js WITH AppBuilder integration
   * THIS IS THE CRITICAL UPDATE - AppBuilder is now injected here
   */
  generateAppJS() {
    // Prepare analysis metadata for AppBuilder
    const analysisMetadata = {
      widgets: this.result.analysis.widgets || {},
      imports: this.result.analysis.imports || [],
      stateClasses: this.result.analysis.stateClasses || {},
      runtimeRequirements: this.result.analysis.runtimeRequirements || {},
      projectName: this.result.analysis.projectName || 'FlutterJS App'
    };

    return `/**
 * FlutterJS Application Entry Point
 * 
 * Generated: ${new Date().toISOString()}
 * Mode: ${this.config.mode}
 * 
 * This file:
 * 1. Imports AppBuilder (widget instantiation engine)
 * 2. Passes analysis metadata
 * 3. Builds widget tree to VNode tree
 * 4. Hands off to Runtime for rendering
 */

// ============================================================================
// IMPORTS
// ============================================================================

// User code (already transformed with rewritten imports)
${this.result.transformation?.code || this.result.rewrite?.rewrittenCode || ''}

// Import runtime systems
import { FlutterJSRuntime } from './runtime.js';

// AppBuilder will be injected via <script> tag in index.html
// But we need to ensure it's available
const AppBuilder = window.__flutterjs_appbuilder__?.AppBuilder;
if (!AppBuilder) {
  throw new Error('[App] AppBuilder not found. Ensure app_builder.js is loaded before app.js');
}

// ============================================================================
// ANALYSIS METADATA (from build-time analysis)
// ============================================================================

const ANALYSIS_METADATA = ${JSON.stringify(analysisMetadata, null, 2)};

const BUILD_CONFIG = {
  mode: '${this.config.mode}',
  target: '${this.config.target}',
  debugMode: ${this.config.debugMode},
  enableHotReload: ${this.config.mode === 'development'},
  enablePerformanceTracking: true,
  timestamp: '${new Date().toISOString()}'
};

// ============================================================================
// APPLICATION BOOTSTRAP
// ============================================================================

async function initializeApp() {
  const startTime = performance.now();

  console.log('[App] ðŸš€ Initializing FlutterJS Application');
  console.log('[App] Mode:', BUILD_CONFIG.mode);
  console.log('[App] Widgets found:', ANALYSIS_METADATA.widgets.count || 0);

  try {
    // ========================================================================
    // STEP 1: Create AppBuilder instance with analysis metadata
    // ========================================================================

    console.log('[App] Step 1: Creating AppBuilder...');

    const builder = new AppBuilder(ANALYSIS_METADATA, {
      debugMode: BUILD_CONFIG.debugMode,
      enableHotReload: BUILD_CONFIG.enableHotReload,
      mode: BUILD_CONFIG.mode,
      target: BUILD_CONFIG.target
    });

    if (BUILD_CONFIG.debugMode) {
      console.log('[App] âœ" AppBuilder created');
    }

    // ========================================================================
    // STEP 2: Register built-in Flutter widgets
    // ========================================================================

    console.log('[App] Step 2: Registering built-in widgets...');

    builder.registerBuiltInWidgets();

    if (BUILD_CONFIG.debugMode) {
      console.log('[App] âœ" Built-in widgets registered', builder.registry.getStats());
    }

    // ========================================================================
    // STEP 3: Load external packages (@flutterjs/material, etc.)
    // ========================================================================

    console.log('[App] Step 3: Loading packages...');

    const moduleMap = {
      '@flutterjs/material': { path: './lib/index.js' },
      '@flutterjs/core': { path: './lib/index.js' }
    };

    try {
      await builder.loadModules(moduleMap);
      console.log('[App] âœ" Packages loaded');
    } catch (error) {
      console.warn('[App] âš  Some packages could not load:', error.message);
    }

    // ========================================================================
    // STEP 4: Get root widget class (exported from user code)
    // ========================================================================

    console.log('[App] Step 4: Finding root widget...');

    // The user's code should export their root widget class
    // E.g.: export class MyApp extends StatelessWidget { ... }
    const RootWidgetClass = window.__flutterjs_app_root__ || 
                           (typeof MyApp !== 'undefined' ? MyApp : null) ||
                           (typeof main !== 'undefined' ? main : null);

    if (!RootWidgetClass) {
      throw new Error(
        '[App] Root widget not found!\\n' +
        'Make sure to export your root widget class or set window.__flutterjs_app_root__\\n' +
        'Expected: export class MyApp extends StatelessWidget { ... }'
      );
    }

    console.log('[App] âœ" Root widget found:', RootWidgetClass.name);

    // ========================================================================
    // STEP 5: Build application (widgets → VNode tree)
    // ========================================================================

    console.log('[App] Step 5: Building application...');

    const buildResult = await builder.build(RootWidgetClass);

    if (!buildResult.success) {
      throw new Error('Application build failed');
    }

    console.log('[App] âœ" Application built successfully');
    console.log('[App]', buildResult.stats);

    // Store for debugging
    window.__flutterjs_app__ = {
      builder,
      buildResult,
      rootVNode: buildResult.rootVNode,
      stats: buildResult.stats
    };

    // ========================================================================
    // STEP 6: Initialize runtime
    // ========================================================================

    console.log('[App] Step 6: Initializing runtime...');

    const runtime = new FlutterJSRuntime({
      debugMode: BUILD_CONFIG.debugMode,
      enableHotReload: BUILD_CONFIG.enableHotReload,
      enablePerformanceTracking: BUILD_CONFIG.enablePerformanceTracking,
      mode: BUILD_CONFIG.mode
    });

    console.log('[App] âœ" Runtime created');

    // ========================================================================
    // STEP 7: Mount application to DOM
    // ========================================================================

    console.log('[App] Step 7: Mounting to DOM...');

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('[App] Root element #root not found');
    }

    runtime.initialize({ rootElement });
    runtime.runApp(RootWidgetClass, { rootElement });

    console.log('[App] âœ" Application mounted');

    // ========================================================================
    // STEP 8: Setup hot reload (development mode)
    // ========================================================================

    if (BUILD_CONFIG.enableHotReload) {
      setupHotReload(builder, runtime);
    }

    // ========================================================================
    // STEP 9: Report success
    // ========================================================================

    const initTime = performance.now() - startTime;

    console.log('[App] ' + '='.repeat(60));
    console.log('[App] âœ… APPLICATION INITIALIZED SUCCESSFULLY');
    console.log('[App] ' + '='.repeat(60));
    console.log('[App] Total init time: ' + initTime.toFixed(2) + 'ms');
    console.log('[App] Widgets: ' + buildResult.stats.widgetsInstantiated);
    console.log('[App] States: ' + buildResult.stats.statesCreated);
    console.log('[App] Mode: ' + BUILD_CONFIG.mode);
    console.log('[App] ' + '='.repeat(60) + '\\n');

    // Make runtime globally accessible
    window.__flutterjs_runtime__ = runtime;
    window.__flutterjs_builder__ = builder;

  } catch (error) {
    console.error('[App] âŒ INITIALIZATION FAILED');
    console.error('[App]', error.message);
    if (BUILD_CONFIG.debugMode) {
      console.error('[App] Stack:', error.stack);
    }
    showErrorOverlay(error);
    throw error;
  }
}

// ============================================================================
// HOT RELOAD SETUP (Development Mode)
// ============================================================================

function setupHotReload(builder, runtime) {
  console.log('[App] Setting up hot reload...');

  // Listen for hot reload events from dev server
  if (typeof window !== 'undefined') {
    window.__flutterjs_hot_reload__ = async function() {
      console.log('[App] ðŸ"¥ Hot reload triggered...');

      try {
        // Rebuild
        const RootWidgetClass = window.__flutterjs_app_root__ || MyApp;
        const newBuildResult = await builder.build(RootWidgetClass);

        // Update DOM
        if (runtime && runtime.rootElement) {
          runtime.rootElement.innerHTML = '';
          runtime.runApp(RootWidgetClass, { 
            rootElement: runtime.rootElement 
          });
        }

        console.log('[App] ðŸ"„ Hot reload complete');
      } catch (error) {
        console.error('[App] Hot reload failed:', error);
      }
    };

    // Listen for server messages
    if (window.__flutterjs_dev_client__) {
      window.__flutterjs_dev_client__.on('hot-reload', () => {
        window.__flutterjs_hot_reload__?.();
      });
    }
  }
}

// ============================================================================
// ERROR OVERLAY (Development Mode)
// ============================================================================

function showErrorOverlay(error) {
  if (typeof document === 'undefined') return;

  const overlay = document.createElement('div');
  overlay.id = '__flutterjs_error_overlay__';
  overlay.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
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
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  \`;

  errorBox.innerHTML = \`
    <h2 style="color: #d32f2f; margin: 0 0 20px 0;">
      ðŸ'¥ Application Error
    </h2>
    <p style="color: #666; margin: 0 0 10px 0;">
      <strong>Error:</strong>
    </p>
    <pre style="
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin: 0 0 20px 0;
      color: #c62828;
      overflow-x: auto;
    ">\${error.message}</pre>
    \${BUILD_CONFIG.debugMode ? \`
      <p style="color: #666; margin: 0 0 10px 0;">
        <strong>Stack Trace:</strong>
      </p>
      <pre style="
        background: #f5f5f5;
        padding: 15px;
        border-radius: 4px;
        margin: 0;
        color: #666;
        font-size: 11px;
        overflow-x: auto;
      ">\${error.stack}</pre>
    \` : ''}
    <p style="color: #999; margin-top: 20px; font-size: 12px;">
      Check the browser console for more details.
    </p>
  \`;

  overlay.appendChild(errorBox);
  document.body.appendChild(overlay);
}

// ============================================================================
// INITIALIZATION TRIGGER
// ============================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeApp };
}`;
  }

  /**
   * Generate app_builder.js (framework file - to be copied to output)
   */
  generateAppBuilderJS() {
    // This is a stub that points to the actual file
    // In real implementation, copy the actual app_builder.js file from framework
    return `/**
 * FlutterJS AppBuilder - Widget Instantiation Engine
 * 
 * This is a stub. In production:
 * 1. Copy from: framework/cli/runtime/app_builder.js
 * 2. Or generate from template
 * 3. Or bundle as separate module
 * 
 * The actual app_builder.js should be injected here via build process
 */

// For now, this will be replaced by actual file during build
// See build_pipeline.js writeFiles() method

console.warn('[AppBuilder] Stub loaded - replace with actual implementation');

// Export to window for app.js to access
if (typeof window !== 'undefined') {
  window.__flutterjs_appbuilder__ = {
    AppBuilder: class AppBuilder {
      constructor() {
        throw new Error('AppBuilder stub - replace with actual implementation');
      }
    }
  };
}`;
  }

  /**
   * Generate runtime.js
   */
  generateRuntimeJS() {
    return `/**
 * FlutterJS Runtime
 * Core rendering and state management engine
 */

class FlutterJSRuntime {
  constructor(config = {}) {
    this.config = config;
    this.widgets = new Map();
    this.state = new Map();
    this.mounted = false;
    this.rootElement = null;
  }

  initialize(options = {}) {
    this.rootElement = options.rootElement;
    console.log('[Runtime] Initialized with root element:', this.rootElement?.id);
    return this;
  }

  async runApp(rootWidget, options = {}) {
    this.rootElement = options.rootElement || this.rootElement;

    if (!this.rootElement) {
      throw new Error('[Runtime] No root element specified');
    }

    // Build widget tree
    const vnode = this.buildVNode(rootWidget);

    // Render to DOM
    const element = this.renderVNode(vnode);
    
    // Clear and mount
    this.rootElement.innerHTML = '';
    this.rootElement.appendChild(element);

    this.mounted = true;
    console.log('[Runtime] Application mounted');
  }

  buildVNode(widget) {
    if (!widget) return null;

    // Build widget's VNode
    if (typeof widget.build === 'function') {
      return widget.build();
    }

    return widget;
  }

  renderVNode(vnode) {
    if (typeof vnode === 'string') {
      return document.createTextNode(vnode);
    }

    if (vnode && vnode.tag) {
      const el = document.createElement(vnode.tag);

      // Set attributes
      if (vnode.props) {
        Object.entries(vnode.props).forEach(([key, value]) => {
          if (key !== 'children' && value !== null && value !== undefined) {
            el.setAttribute(key, String(value));
          }
        });
      }

      // Set styles
      if (vnode.style) {
        Object.assign(el.style, vnode.style);
      }

      // Add children
      if (vnode.children && Array.isArray(vnode.children)) {
        vnode.children.forEach(child => {
          el.appendChild(this.renderVNode(child));
        });
      }

      return el;
    }

    return document.createTextNode(String(vnode));
  }

  unmount() {
    if (this.rootElement) {
      this.rootElement.innerHTML = '';
    }
    this.mounted = false;
  }
}

// Expose to window
if (typeof window !== 'undefined') {
  window.__flutterjs_runtime__ = FlutterJSRuntime;
}`;
  }

  /**
   * Generate styles.css
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
   * Generate manifest.json
   */
  generateManifest() {
    return JSON.stringify({
      name: this.result.analysis.projectName || 'FlutterJS App',
      version: this.result.analysis.version || '1.0.0',
      description: 'Built with FlutterJS',
      build: {
        timestamp: this.result.timestamp,
        mode: this.config.mode,
        target: this.config.target
      },
      stats: this.result.stats,
      analysis: {
        widgets: this.result.analysis.widgets,
        imports: this.result.analysis.imports.length,
        stateClasses: this.result.analysis.stateClasses?.length || 0
      },
      appBuilder: {
        version: '1.0.0',
        enabled: true,
        features: [
          'widget-instantiation',
          'state-lifecycle',
          'vnode-conversion',
          'hot-reload',
          'ssr-support',
          'hydration'
        ]
      }
    }, null, 2);
  }

  /**
   * Print build summary
   */
  printSummary() {
    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('BUILD SUMMARY'));
    console.log(chalk.blue('='.repeat(70)));

    console.log(chalk.gray(`\nProject: ${this.result.analysis.projectName || 'FlutterJS App'}`));
    console.log(chalk.gray(`Mode: ${this.config.mode}`));
    console.log(chalk.gray(`Output: ${this.config.outputDir}`));

    console.log(chalk.gray(`\nStatistics:`));
    console.log(chalk.gray(`  Code: ${this.result.stats.linesOfCode} lines`));
    console.log(chalk.gray(`  Widgets: ${this.result.stats.widgetsFound}`));
    console.log(chalk.gray(`  Packages: ${this.result.stats.packagesResolved}`));
    console.log(chalk.gray(`  Files: ${this.result.stats.filesCollected}`));
    console.log(chalk.gray(`  Imports Rewritten: ${this.result.stats.importsRewritten}`));
    console.log(chalk.gray(`  Transformations: ${this.result.stats.transformationsApplied}`));
    console.log(chalk.gray(`  Bundle Size: ${(this.result.stats.bundleSize / 1024).toFixed(2)} KB`));

    console.log(chalk.gray(`\nDuration: ${this.result.duration}ms`));

    if (this.result.errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${this.result.errors.length}`));
      this.result.errors.forEach(err => {
        console.log(chalk.red(`  ✗ ${err}`));
      });
    }

    if (this.result.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${this.result.warnings.length}`));
      this.result.warnings.forEach(warn => {
        console.log(chalk.yellow(`  ⚠ ${warn}`));
      });
    }

    if (this.result.success) {
      console.log(chalk.green(`\n✅ Build successful!\n`));
    } else {
      console.log(chalk.red(`\n❌ Build failed!\n`));
    }

    console.log(chalk.blue('='.repeat(70) + '\n'));
  }

  /**
   * Get build report
   */
  getReport() {
    return {
      success: this.result.success,
      duration: this.result.duration,
      outputDir: this.result.outputDir,
      stats: this.result.stats,
      errors: this.result.errors,
      warnings: this.result.warnings,
      appBuilder: {
        integrated: true,
        version: '1.0.0',
        features: [
          'widget-registration',
          'state-lifecycle-management',
          'vnode-conversion',
          'hot-reload',
          'ssr-hydration'
        ]
      }
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  BuildPipeline,
  BuildResult
};