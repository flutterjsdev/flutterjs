/**
 * ============================================================================
 * FIXED BuildIntegration - Proper Widget Format & Error Handling
 * ============================================================================
 * 
 * Issues fixed:
 * 1. Widget format mismatch - stateless/stateful arrays
 * 2. DependencyResolver returning object instead of array
 * 3. Metadata structure - proper widget counting
 * 4. Error handling for null/undefined widgets
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

import { PathResolver } from './path-resolver.js';
import { Analyzer } from '@flutterjs/analyzer/analyzer';
import { DependencyResolver } from './dependency_resolver.js';
import { PackageInstaller } from './flutterjs_package_installer.js';
import { PackageCollector } from './package_collector.js';
import { ImportRewriter } from './import_rewriter.js';
import { CodeTransformer } from './code_transformer.js';
// ✅ IMPORT THE ACTUAL RUNTIME
import {
  FlutterJSRuntime,
  runApp
} from '@flutterjs/runtime/flutterjs_runtime';

// ✅ IMPORT VNODE COMPONENTS
import {
  VNodeRenderer,

} from '@flutterjs/vdom/vnode_renderer';

import {

  VNodeBuilder
} from '@flutterjs/vdom/vnode_builder';


class BuildIntegration {
  constructor(projectRoot, config = {}) {
    this.projectRoot = projectRoot;
    this.config = {
      mode: config.mode || 'development',
      target: config.target || 'web',
      outputDir: config.outputDir || 'dist',
      debugMode: config.debugMode || false,
      installDependencies: config.installDependencies !== false,
      ...config
    };

    if (this.config.debugMode) {
      console.log(chalk.blue('\n[BuildIntegration] Initialized'));
      console.log(chalk.gray(`  projectRoot: ${projectRoot}`));
      console.log(chalk.gray(`  mode: ${this.config.mode}`));
      console.log(chalk.gray(`  outputDir: ${this.config.outputDir}\n`));
    }

    this.pathResolver = new PathResolver(projectRoot, this.config);
    this.dependencyResolver = new DependencyResolver({
      projectRoot,
      debugMode: this.config.debugMode
    });
    this.packageInstaller = new PackageInstaller(projectRoot, this.config);
    this.packageCollector = new PackageCollector({
      projectRoot,
      outputDir: this.config.outputDir,
      debugMode: this.config.debugMode
    });
    this.importRewriter = new ImportRewriter(new Map(), {
      debugMode: this.config.debugMode
    });
    this.codeTransformer = new CodeTransformer({}, {
      debugMode: this.config.debugMode
    });

    // ✅ ADD: Runtime instance for building widgets
    this.runtime = null;
    this.vNodeRenderer = null;
    this.vNodeBuilder = null;

    this.analysis = null;
    this.resolution = null;
    this.installation = null;
    this.collection = null;
    this.transformed = null;
    this.buildOutput = null;

    // ✅ ADD: Store generated VNodes and HTML
    this.generatedVNodes = null;
    this.generatedHTML = null;
  }


  /**
   * ========================================================================
   * MAIN BUILD PIPELINE
   * ========================================================================
   */

  async execute() {
    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('FLUTTERJS BUILD INTEGRATION PIPELINE'));
    console.log(chalk.blue('='.repeat(70)));

    const startTime = Date.now();

    try {
      await this.phase1_analyze();
      await this.phase2_resolveDependencies();

      if (this.config.installDependencies) {
        await this.phase3_installPackages();
      }

      await this.phase4_collectPackages();
      await this.phase5_transformCode();


      
      // ✅ NEW: Initialize runtime
      await this.phase6_initializeRuntime();

      // ✅ NEW: Build widgets using runtime
      await this.phase7_buildWidgets();

      // ✅ NEW: Generate HTML from VNodes
      await this.phase8_generateHTML();




      await this.phase9_generateOutput();

      const duration = Date.now() - startTime;
      this.phase10_report(duration);

      return {
        success: true,
        duration,
        analysis: this.analysis,
        resolution: this.resolution,
        installation: this.installation,
        collection: this.collection,
        transformed: this.transformed,
        output: this.buildOutput
      };

    } catch (error) {
      console.error(chalk.red('\n✗ Build Failed:'), error.message);
      if (this.config.debugMode) {
        console.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 1: ANALYZE SOURCE CODE
   * ========================================================================
   */

  async phase1_analyze() {
    const spinner = ora(chalk.blue('📊 Phase 1: Analyzing source code...')).start();

    try {
      const sourcePath = this.pathResolver.getSourcePath();

      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }

      const sourceCode = fs.readFileSync(sourcePath, 'utf-8');

      const analyzer = new Analyzer({
        sourceCode,
        sourceFile: sourcePath,
        debugMode: this.config.debugMode,
        includeImports: true,
        includeContext: true,
        includeSsr: true,
        outputFormat: 'json'
      });

      const analysisResult = await analyzer.analyze();

      // ✅ FIX: Handle widget format properly
      const widgets = this.normalizeWidgets(analysisResult.widgets);

      // ✅ FIX: Proper metadata structure
      this.analysis = {
        sourcePath,
        sourceCode,
        widgets: {
          stateless: widgets.stateless,
          stateful: widgets.stateful,
          count: widgets.stateless.length + widgets.stateful.length,
          all: [...widgets.stateless, ...widgets.stateful]
        },
        imports: analysisResult.imports || [],
        metadata: {
          projectName: 'FlutterJS App',
          rootWidget: widgets.stateful[0] || widgets.stateless[0] || 'MyApp',
          stateClasses: this.extractStateClasses(widgets.stateful),
          linesOfCode: sourceCode.split('\n').length
        }
      };

      spinner.succeed(chalk.green(`✓ Analysis complete`));
      if (this.config.debugMode) {
        console.log(chalk.gray(`  Widgets: ${this.analysis.widgets.count}`));
        console.log(chalk.gray(`  Stateless: ${this.analysis.widgets.stateless.length}`));
        console.log(chalk.gray(`  Stateful: ${this.analysis.widgets.stateful.length}`));
        console.log(chalk.gray(`  Imports: ${this.analysis.imports.length}`));
        console.log(chalk.gray(`  Root Widget: ${this.analysis.metadata.rootWidget}\n`));
      }

    } catch (error) {
      spinner.fail(chalk.red(`✗ Analysis failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ✅ FIX: Normalize widget format from Analyzer
   * Analyzer might return widgets in different formats
   */
  normalizeWidgets(widgets) {
    if (!widgets) {
      return { stateless: [], stateful: [] };
    }

    return {
      stateless: this.ensureArray(widgets.stateless),
      stateful: this.ensureArray(widgets.stateful)
    };
  }

  /**
   * ✅ FIX: Ensure value is an array
   */
  ensureArray(value) {
    if (Array.isArray(value)) {
      return value.filter(v => v && typeof v === 'string');
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).filter(k => k && typeof k === 'string');
    }
    return [];
  }

  /**
   * ✅ FIX: Extract state classes properly
   */
  extractStateClasses(statefulWidgets) {
    const stateClasses = {};

    if (Array.isArray(statefulWidgets)) {
      statefulWidgets.forEach(widget => {
        if (widget && typeof widget === 'string') {
          stateClasses[widget] = `_${widget}State`;
        }
      });
    }

    return stateClasses;
  }

  /**
   * ========================================================================
   * PHASE 2: RESOLVE DEPENDENCIES
   * ========================================================================
   */

  async phase2_resolveDependencies() {
    const spinner = ora(chalk.blue('🔍 Phase 2: Resolving dependencies...')).start();

    try {
      // ✅ ENHANCED LOGGING: Log what we're resolving
      let imports = this.analysis.imports || [];

      console.log('\n' + chalk.blue('[PHASE 2 DEBUG] Import Resolution Trace'));
      console.log(chalk.blue('='.repeat(70)));

      // Show raw imports from analysis
      console.log(chalk.yellow('\n1️⃣  RAW IMPORTS FROM ANALYZER:'));
      console.log(chalk.gray(`  Type: ${typeof imports}`));
      console.log(chalk.gray(`  Is Array: ${Array.isArray(imports)}`));
      console.log(chalk.gray(`  Length: ${imports?.length || 0}`));

      if (Array.isArray(imports)) {
        imports.forEach((imp, idx) => {
          console.log(chalk.gray(`  [${idx}] source: "${imp.source || imp.from || 'UNKNOWN'}" | items: ${(imp.items || []).length}`));
        });
      } else {
        console.log(chalk.red(`  ❌ PROBLEM: imports is not an array!`));
        console.log(chalk.gray(`  Keys: ${Object.keys(imports || {}).slice(0, 5).join(', ')}`));
      }

      // Handle case where imports is an object with stats
      if (!Array.isArray(imports)) {
        if (imports.statements && Array.isArray(imports.statements)) {
          console.log(chalk.yellow('\n  ℹ️  Found imports.statements, using that'));
          imports = imports.statements;
        } else if (typeof imports === 'object') {
          console.log(chalk.red('\n  ❌ imports is object (not array), resetting to []'));
          imports = [];
        }
      }

      console.log(chalk.gray(`\n  Final imports count: ${imports.length}`));

      if (imports.length === 0) {
        spinner.warn(chalk.yellow('⚠️  No dependencies to resolve'));
        console.log(chalk.red('\n⚠️  WARNING: This means:'));
        console.log(chalk.red('  - No @package: imports found in source'));
        console.log(chalk.red('  - No local package imports found'));
        console.log(chalk.red('  - PackageInstaller will NOT run (Phase 3 skipped)'));
        console.log(chalk.red('  - No module files will be copied to output'));
        console.log(chalk.blue('='.repeat(70) + '\n'));

        this.resolution = {
          packages: new Map(),
          allFiles: [],
          errors: [],
          warnings: ['No imports found in source code']
        };
        return;
      }

      // ✅ ENHANCED LOGGING: Log what we're passing to resolver
      console.log(chalk.yellow('\n2️⃣  PASSING TO DependencyResolver.resolveAll():'));
      console.log(chalk.gray(`  Array of ${imports.length} imports`));
      imports.slice(0, 3).forEach((imp, idx) => {
        console.log(chalk.gray(`  [${idx}] ${JSON.stringify(imp).substring(0, 60)}...`));
      });

      // Call resolver
      const resolutionResult = await this.dependencyResolver.resolveAll(imports);

      // ✅ ENHANCED LOGGING: Log what we got back
      console.log(chalk.yellow('\n3️⃣  RESOLUTION RESULT FROM DependencyResolver:'));
      console.log(chalk.gray(`  Type: ${typeof resolutionResult}`));
      console.log(chalk.gray(`  Keys: ${Object.keys(resolutionResult).join(', ')}`));
      console.log(chalk.gray(`  packages.size: ${resolutionResult?.packages?.size || 0}`));
      console.log(chalk.gray(`  allFiles.length: ${resolutionResult?.allFiles?.length || 0}`));
      console.log(chalk.gray(`  errors.length: ${resolutionResult?.errors?.length || 0}`));

      if (resolutionResult?.packages?.size > 0) {
        console.log(chalk.green('\n  ✅ PACKAGES RESOLVED:'));
        resolutionResult.packages.forEach((info, name) => {
          console.log(chalk.green(`     • ${name} (${info.type || 'unknown'})`));
        });
      } else {
        console.log(chalk.red('\n  ❌ NO PACKAGES RESOLVED!'));
        console.log(chalk.red('  This means DependencyResolver found no matching packages'));
      }

      // Normalize
      this.resolution = this.normalizeResolution(resolutionResult);

      console.log(chalk.blue('='.repeat(70)));
      spinner.succeed(chalk.green(`✔ Resolution complete (${this.resolution.packages.size} packages)`));

      if (this.config.debugMode) {
        console.log(chalk.gray(`  Packages: ${this.resolution.packages.size}`));
        console.log(chalk.gray(`  Files: ${this.resolution.allFiles.length}`));
        if (this.resolution.errors.length > 0) {
          console.log(chalk.red(`  Errors: ${this.resolution.errors.length}`));
          this.resolution.errors.forEach(err => {
            console.log(chalk.red(`    • ${err}`));
          });
        }
        console.log();
      }

    } catch (error) {
      spinner.fail(chalk.red(`✗ Resolution failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ✅ FIX: Normalize DependencyResolver output
   * It might return an object with resolution stats instead of standard format
   */
  normalizeResolution(result) {
    if (!result) {
      return {
        packages: new Map(),
        allFiles: [],
        graph: new Map(),
        errors: [],
        warnings: []
      };
    }

    // If result has resolutionRate, it's the stats object - return normalized
    if (result.resolutionRate !== undefined) {
      return {
        packages: new Map(),
        allFiles: [],
        graph: new Map(),
        errors: result.errors || [],
        warnings: result.warnings || []
      };
    }

    // Standard format
    return {
      packages: result.packages || new Map(),
      allFiles: result.allFiles || [],
      graph: result.graph || new Map(),
      errors: result.errors || [],
      warnings: result.warnings || []
    };
  }

  /**
   * ========================================================================
   * PHASE 3: INSTALL PACKAGES
   * ========================================================================
   */

  async phase3_installPackages() {
    const spinner = ora(chalk.blue('📦 Phase 3: Installing packages...')).start();

    try {
      console.log('\n' + chalk.blue('[PHASE 3 DEBUG] Package Installation Trace'));
      console.log(chalk.blue('='.repeat(70)));

      if (!this.resolution || this.resolution.packages.size === 0) {
        console.log(chalk.yellow('\n❌ NO PACKAGES TO INSTALL'));
        console.log(chalk.gray(`  resolution.packages.size: ${this.resolution?.packages?.size || 0}`));
        console.log(chalk.red('\nThis is the problem! Phase 2 found 0 packages.'));
        console.log(chalk.red('Check Phase 2 logs above to see why imports were not resolved.\n'));

        spinner.info(chalk.yellow('ℹ️ No packages to install'));
        this.installation = {
          total: 0,
          successful: 0,
          failed: 0,
          results: []
        };
        console.log(chalk.blue('='.repeat(70) + '\n'));
        return;
      }

      const packageNames = Array.from(this.resolution.packages.keys());
      console.log(chalk.yellow('\n1️⃣  PACKAGES TO INSTALL:'));
      console.log(chalk.gray(`  Total: ${packageNames.length}`));
      packageNames.forEach(name => {
        console.log(chalk.green(`  • ${name}`));
      });

      const sdkPackages = packageNames.filter(p => p.startsWith('@flutterjs/'));
      const otherPackages = packageNames.filter(p => !p.startsWith('@flutterjs/'));

      console.log(chalk.yellow('\n2️⃣  PACKAGE BREAKDOWN:'));
      console.log(chalk.gray(`  SDK packages (@flutterjs/*): ${sdkPackages.length}`));
      sdkPackages.forEach(p => console.log(chalk.gray(`    • ${p}`)));
      console.log(chalk.gray(`  Other packages: ${otherPackages.length}`));
      otherPackages.forEach(p => console.log(chalk.gray(`    • ${p}`)));

      const installResults = [];

      console.log(chalk.yellow('\n3️⃣  INSTALLING...'));

      for (const pkg of sdkPackages) {
        console.log(chalk.gray(`  Installing ${pkg}...`));
        const result = await this.packageInstaller.installPackage(pkg);
        installResults.push(result);

        if (result.success) {
          console.log(chalk.green(`    ✅ Success | ${result.filesCount} files | ${(result.size / 1024).toFixed(2)} KB`));
        } else {
          console.log(chalk.red(`    ❌ Failed: ${result.error}`));
        }
      }

      for (const pkg of otherPackages) {
        console.log(chalk.gray(`  Installing ${pkg}...`));
        const result = await this.packageInstaller.installPackage(pkg);
        installResults.push(result);

        if (result.success) {
          console.log(chalk.green(`    ✅ Success | ${result.filesCount} files | ${(result.size / 1024).toFixed(2)} KB`));
        } else {
          console.log(chalk.red(`    ❌ Failed: ${result.error}`));
        }
      }

      this.installation = {
        total: installResults.length,
        successful: installResults.filter(r => r.success).length,
        failed: installResults.filter(r => !r.success).length,
        results: installResults
      };

      console.log(chalk.yellow('\n4️⃣  INSTALLATION SUMMARY:'));
      console.log(chalk.gray(`  Total: ${this.installation.total}`));
      console.log(chalk.green(`  Successful: ${this.installation.successful}`));
      if (this.installation.failed > 0) {
        console.log(chalk.red(`  Failed: ${this.installation.failed}`));
      }
      console.log(chalk.blue('='.repeat(70)));

      spinner.succeed(chalk.green(`✔ Installation complete`));

    } catch (error) {
      spinner.fail(chalk.red(`✗ Installation failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 4: COLLECT PACKAGES
   * ========================================================================
   */
  async phase4_collectPackages() {
    const spinner = ora(chalk.blue('📋 Phase 4: Collecting packages...')).start();

    try {
      console.log('\n' + chalk.blue('[PHASE 4 DEBUG] Package Collection Trace'));
      console.log(chalk.blue('='.repeat(70)));

      if (!this.resolution || this.resolution.packages.size === 0) {
        console.log(chalk.yellow('\n❌ NO PACKAGES TO COLLECT'));
        console.log(chalk.gray(`  resolution.packages.size: ${this.resolution?.packages?.size || 0}`));
        console.log(chalk.red('\nNo packages were resolved in Phase 2, so nothing to collect.\n'));

        spinner.info(chalk.yellow('ℹ️ No packages to collect'));
        this.collection = {
          copiedFiles: [],
          failedFiles: [],
          indexFiles: [],
          exportMaps: new Map(),
          totalSize: 0,
          errors: [],
          warnings: []
        };
        console.log(chalk.blue('='.repeat(70) + '\n'));
        return;
      }

      console.log(chalk.yellow('\n1️⃣  COLLECTING FROM PACKAGES:'));
      console.log(chalk.gray(`  resolution.packages.size: ${this.resolution.packages.size}`));

      const collectionResult = await this.packageCollector.collect(this.resolution);

      console.log(chalk.yellow('\n2️⃣  COLLECTION RESULT:'));
      console.log(chalk.gray(`  copiedFiles: ${collectionResult.copiedFiles?.length || 0}`));
      console.log(chalk.gray(`  totalSize: ${(collectionResult.totalSize / 1024).toFixed(2)} KB`));
      console.log(chalk.gray(`  exportMaps: ${collectionResult.exportMaps?.size || 0}`));

      if ((collectionResult.copiedFiles?.length || 0) > 0) {
        console.log(chalk.green('\n  ✅ FILES COLLECTED:'));
        collectionResult.copiedFiles?.slice(0, 5).forEach(f => {
          console.log(chalk.green(`     • ${f}`));
        });
        if ((collectionResult.copiedFiles?.length || 0) > 5) {
          console.log(chalk.gray(`     ... and ${collectionResult.copiedFiles.length - 5} more`));
        }
      } else {
        console.log(chalk.yellow('\n  ⚠️  NO FILES COLLECTED'));
        console.log(chalk.gray('     (Using CDN/bundled packages fallback)'));
      }

      this.collection = {
        copiedFiles: collectionResult.copiedFiles || [],
        failedFiles: collectionResult.failedFiles || [],
        indexFiles: collectionResult.indexFiles || [],
        exportMaps: collectionResult.exportMaps || new Map(),
        totalSize: collectionResult.totalSize || 0,
        errors: collectionResult.errors || [],
        warnings: collectionResult.warnings || []
      };

      // ✅ FIX: Safely set export maps if method exists
      if (this.importRewriter && typeof this.importRewriter.setExportMaps === 'function') {
        this.importRewriter.setExportMaps(collectionResult.exportMaps);
      }

      console.log(chalk.blue('='.repeat(70)));
      spinner.succeed(chalk.green(`✔ Collection complete`));

    } catch (error) {
      spinner.fail(chalk.red(`✗ Collection failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 5: TRANSFORM CODE
   * ========================================================================
   */

  async phase5_transformCode() {
    const spinner = ora(chalk.blue('🔧 Phase 5: Transforming code...')).start();

    try {
      const sourceCode = this.analysis.sourceCode;

      const rewriteResult = this.importRewriter.rewrite(
        sourceCode,
        this.analysis.imports || [],
        this.config.outputDir
      );

      const transformResult = this.codeTransformer.transform(rewriteResult.rewrittenCode);

      this.transformed = {
        originalCode: sourceCode,
        rewrittenCode: rewriteResult.rewrittenCode,
        transformedCode: transformResult.transformedCode || rewriteResult.rewrittenCode,
        importsRewritten: rewriteResult.stats?.rewritten || 0,
        transformations: transformResult.transformations?.length || 0,
        exports: transformResult.exports || [],
        errors: transformResult.errors || [],
        warnings: transformResult.warnings || []
      };

      spinner.succeed(chalk.green(`✓ Transformation complete`));
      if (this.config.debugMode) {
        console.log(chalk.gray(`  Imports rewritten: ${this.transformed.importsRewritten}`));
        console.log(chalk.gray(`  Transformations: ${this.transformed.transformations}`));
        console.log(chalk.gray(`  Exports: ${this.transformed.exports.length}`));
        console.log();
      }

    } catch (error) {
      spinner.fail(chalk.red(`✗ Transformation failed: ${error.message}`));
      throw error;
    }
  }



/**
   * ========================================================================
   * PHASE 6: INITIALIZE RUNTIME ✅ NEW
   * ========================================================================
   */

  async phase6_initializeRuntime() {
    const spinner = ora(chalk.blue('âš™ï¸ Phase 6: Initializing runtime...')).start();

    try {
      if (this.config.debugMode) {
        console.log(chalk.gray('\n[Phase 6] Creating FlutterJSRuntime instance...\n'));
      }

      // ✅ CREATE RUNTIME INSTANCE
      this.runtime = new FlutterJSRuntime({
        debugMode: this.config.debugMode,
        mode: 'csr', // Client-side rendering for build
        target: this.config.target,
        enableHotReload: false,
        enablePerformanceTracking: true
      });

      // ✅ CREATE VNODE COMPONENTS
      this.vNodeBuilder = new VNodeBuilder({
        debugMode: this.config.debugMode
      });

      this.vNodeRenderer = new VNodeRenderer({
        debugMode: this.config.debugMode
      });

      if (this.config.debugMode) {
        console.log(chalk.green('âœ" FlutterJSRuntime created'));
        console.log(chalk.green('âœ" VNodeBuilder created'));
        console.log(chalk.green('âœ" VNodeRenderer created\n'));
      }

      spinner.succeed(chalk.green('âœ" Runtime initialized'));

    } catch (error) {
      spinner.fail(chalk.red(`âœ— Runtime initialization failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 7: BUILD WIDGETS USING RUNTIME ✅ NEW
   * ========================================================================
   */

  async phase7_buildWidgets() {
    const spinner = ora(chalk.blue('ðŸ—ï¸  Phase 7: Building widgets...')).start();

    try {
      if (!this.runtime || !this.vNodeBuilder) {
        throw new Error('Runtime not initialized');
      }

      if (this.config.debugMode) {
        console.log(chalk.gray('\n[Phase 7] Building widget tree from source code...\n'));
      }

      // ✅ Get root widget class name
      const rootWidgetName = this.analysis.metadata.rootWidget;

      if (this.config.debugMode) {
        console.log(chalk.gray(`Root Widget: ${rootWidgetName}`));
      }

      // ✅ Execute transformed code to get widget classes
      // This dynamically creates the widget classes from transformed code
      const widgetClasses = this.extractWidgetClasses(this.transformed.transformedCode);

      if (this.config.debugMode) {
        console.log(chalk.gray(`Found ${Object.keys(widgetClasses).length} widget classes`));
      }

      // ✅ Get the root widget class
      const RootWidgetClass = widgetClasses[rootWidgetName];

      if (!RootWidgetClass) {
        throw new Error(`Root widget '${rootWidgetName}' not found in transformed code`);
      }

      if (this.config.debugMode) {
        console.log(chalk.gray(`Instantiating ${rootWidgetName}...`));
      }

      // ✅ Create instance of root widget
      const rootWidgetInstance = new RootWidgetClass();

      // ✅ Build VNode tree by calling widget.build()
      if (this.config.debugMode) {
        console.log(chalk.gray(`Calling build() method...`));
      }

      // Create a mock BuildContext
      const mockContext = this.createMockBuildContext();

      // ✅ Call build method to get VNode
      this.generatedVNodes = this.vNodeBuilder.build(rootWidgetInstance, {
        context: mockContext
      });

      if (this.config.debugMode) {
        console.log(chalk.green('âœ" VNode tree generated'));
        console.log(chalk.gray(`VNode structure: ${JSON.stringify(this.generatedVNodes, null, 2).substring(0, 200)}...\n`));
      }

      spinner.succeed(chalk.green('âœ" Widgets built successfully'));

    } catch (error) {
      spinner.fail(chalk.red(`âœ— Widget building failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Extract widget classes from transformed code
   */
  extractWidgetClasses(transformedCode) {
    const widgetClasses = {};

    // ✅ Dynamically execute code in isolated scope
    try {
      const scope = {};

      // Create function that executes the code with exposed scope
      const execute = new Function('scope', `
        ${transformedCode}
        // Return all exported items
        return { ...this };
      `);

      const result = execute.call(scope, scope);

      // Extract widget classes (classes that have build method)
      for (const [name, value] of Object.entries(result)) {
        if (typeof value === 'function' && name.match(/^[A-Z]/)) {
          widgetClasses[name] = value;
        }
      }
    } catch (error) {
      if (this.config.debugMode) {
        console.error(chalk.red(`Failed to extract widget classes: ${error.message}`));
      }
      throw error;
    }

    return widgetClasses;
  }

  /**
   * Create mock BuildContext for build phase
   */
  createMockBuildContext() {
    return {
      theme: () => ({
        primaryColor: '#6750a4',
        primarySwatch: '#6750a4',
        accentColor: '#03dac6',
        backgroundColor: '#fffbfe',
        textColor: '#1c1b1f'
      }),
      mediaQuery: () => ({
        size: { width: 1280, height: 720 },
        orientation: 'portrait',
        devicePixelRatio: 1.0
      }),
      scoped: (key) => null,
      widget: null,
      state: null,
      mounted: true
    };
  }

  /**
   * ========================================================================
   * PHASE 8: GENERATE HTML FROM VNODES ✅ NEW
   * ========================================================================
   */

  async phase8_generateHTML() {
    const spinner = ora(chalk.blue('ðŸ" Phase 8: Generating HTML...')).start();

    try {
      if (!this.vNodeRenderer || !this.generatedVNodes) {
        throw new Error('VNode renderer not initialized or no VNodes generated');
      }

      if (this.config.debugMode) {
        console.log(chalk.gray('\n[Phase 8] Rendering VNode tree to HTML string...\n'));
      }

      // ✅ RENDER VNODES TO HTML STRING
      this.generatedHTML = this.vNodeRenderer.renderToString(this.generatedVNodes);

      if (this.config.debugMode) {
        console.log(chalk.green('âœ" HTML generated'));
        console.log(chalk.gray(`HTML length: ${this.generatedHTML.length} bytes\n`));
      }

      spinner.succeed(chalk.green('âœ" HTML rendering complete'));

    } catch (error) {
      spinner.fail(chalk.red(`âœ— HTML generation failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 9: GENERATE OUTPUT FILES
   * ========================================================================
   */

  async phase9_generateOutput() {
    const spinner = ora(chalk.blue('Phase 9: Generating output files...')).start();

    try {
      const outputDir = path.join(this.projectRoot, this.config.outputDir);
      await fs.promises.mkdir(outputDir, { recursive: true });

      const files = [];

      // Metadata
      const metadata = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        projectName: this.analysis?.metadata?.projectName || 'FlutterJS App',
        rootWidget: this.analysis?.metadata?.rootWidget || 'MyApp',
        widgets: {
          stateless: this.analysis?.widgets?.stateless || [],
          stateful: this.analysis?.widgets?.stateful || [],
          count: (this.analysis?.widgets?.stateless?.length || 0) +
            (this.analysis?.widgets?.stateful?.length || 0)
        }
      };

      const registry = this.generateWidgetRegistry();

      // 1. Write HTML file ✅ NOW GENERATED
      const htmlPath = path.join(outputDir, 'index.html');
      const htmlWrapper = this.wrapHTMLWithTemplate(this.generatedHTML || '', metadata);
      await fs.promises.writeFile(htmlPath, htmlWrapper, 'utf-8');
      files.push({ name: 'index.html', size: htmlWrapper.length });

      // 2. Write metadata
      const metadataPath = path.join(outputDir, 'metadata.json');
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      files.push({ name: 'metadata.json', size: JSON.stringify(metadata).length });

      // 3. Write registry
      const registryPath = path.join(outputDir, 'widget_registry.json');
      await fs.promises.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
      files.push({ name: 'widget_registry.json', size: JSON.stringify(registry).length });

      // 4. Write manifest
      const manifest = {
        name: metadata.projectName,
        version: '1.0.0',
        description: 'Built with FlutterJS',
        build: {
          timestamp: new Date().toISOString(),
          mode: this.config.mode,
          target: this.config.target
        },
        stats: {
          linesOfCode: this.analysis?.metadata?.linesOfCode || 0,
          widgetsFound: this.analysis?.widgets?.count || 0,
          htmlSize: this.generatedHTML?.length || 0
        }
      };

      const manifestPath = path.join(outputDir, 'manifest.json');
      await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      files.push({ name: 'manifest.json', size: JSON.stringify(manifest).length });

      this.buildOutput = {
        outputDir,
        files,
        metadata,
        registry,
        manifest,
        generatedHTML: !!this.generatedHTML
      };

      spinner.succeed(chalk.green(`âœ" Output generated (${files.length} files)`));

    } catch (error) {
      spinner.fail(chalk.red(`âœ— Output generation failed: ${error.message}`));
      throw error;
    }
  }

  wrapHTMLWithTemplate(bodyHTML, metadata) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root">${bodyHTML}</div>
</body>
</html>`;
  }

  generateWidgetRegistry() {
    const registry = {};
    const stateless = this.analysis?.widgets?.stateless || [];
    const stateful = this.analysis?.widgets?.stateful || [];

    stateless.forEach(widget => {
      if (widget && typeof widget === 'string') {
        registry[widget] = { type: 'stateless', methods: ['build'] };
      }
    });

    stateful.forEach(widget => {
      if (widget && typeof widget === 'string') {
        registry[widget] = { type: 'stateful', methods: ['createState'], stateClass: `_${widget}State` };
      }
    });

    return registry;
  }

  /**
   * ========================================================================
   * PHASE 10: REPORT
   * ========================================================================
   */

  phase10_report(duration) {
    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('BUILD COMPLETE'));
    console.log(chalk.blue('='.repeat(70)));

    console.log(chalk.gray('\nðŸ"Š Statistics:\n'));
    console.log(chalk.gray(`  Source Code: ${this.analysis?.metadata?.linesOfCode || 0} lines`));
    console.log(chalk.gray(`  Widgets: ${this.analysis?.widgets?.count || 0}`));
    console.log(chalk.gray(`  Generated HTML: ${this.generatedHTML?.length || 0} bytes`));
    console.log(chalk.gray(`  Build Time: ${duration}ms`));

    console.log(chalk.green(`\nâœ… Output: ${this.buildOutput?.outputDir}`));
    console.log(chalk.green(`   - index.html (✅ GENERATED FROM RUNTIME)`));
    console.log(chalk.green(`   - metadata.json`));
    console.log(chalk.green(`   - widget_registry.json`));
    console.log(chalk.green(`   - manifest.json`));

    console.log(chalk.blue('\n' + '='.repeat(70) + '\n'));
  }


  /**
   * ========================================================================
   * PHASE 6: GENERATE OUTPUT
   * ========================================================================
   */

  async phase9_generateOutput() {
    const spinner = ora(chalk.blue('💾 Phase 6: Generating output files...')).start();

    try {
      // ✅ FIX: Safety check - make sure analysis exists
      if (!this.analysis) {
        throw new Error('Analysis data is missing - cannot generate output');
      }

      const outputDir = path.join(this.projectRoot, this.config.outputDir);
      await fs.promises.mkdir(outputDir, { recursive: true });

      const files = [];

      // ✅ FIX: Build metadata with safety checks EARLY
      const metadata = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        projectName: this.analysis?.metadata?.projectName || 'FlutterJS App',
        rootWidget: this.analysis?.metadata?.rootWidget || 'MyApp',
        widgets: {
          stateless: this.analysis?.widgets?.stateless || [],
          stateful: this.analysis?.widgets?.stateful || [],
          count: (this.analysis?.widgets?.stateless?.length || 0) +
            (this.analysis?.widgets?.stateful?.length || 0)
        },
        stateClasses: this.analysis?.metadata?.stateClasses || {},
        imports: this.analysis?.imports || [],
        runtimeRequirements: {
          requiresThemeProvider: true,
          requiresMediaQuery: true,
          requiresNavigator: false,
          stateManagement: 'local',
          asyncOperations: false
        }
      };

      // ✅ FIX: Generate widget registry EARLY
      const registry = this.generateWidgetRegistry();

      // ✅ FIX: INITIALIZE buildOutput BEFORE calling generateAppBootstrap()
      this.buildOutput = {
        outputDir,
        files: [],
        metadata,
        registry,
        manifest: {} // Will be populated below
      };

      // 1. Write transformed code
      const mainPath = path.join(outputDir, 'main.fjs');
      const transformedCode = this.transformed?.transformedCode || '';
      await fs.promises.writeFile(mainPath, transformedCode, 'utf-8');
      files.push({ name: 'main.fjs', size: transformedCode.length });

      // 2. Write analysis metadata
      const metadataPath = path.join(outputDir, 'analysis_metadata.json');
      await fs.promises.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        'utf-8'
      );
      files.push({
        name: 'analysis_metadata.json',
        size: JSON.stringify(metadata).length
      });

      // 3. Write widget registry
      const registryPath = path.join(outputDir, 'widget_registry.json');
      await fs.promises.writeFile(
        registryPath,
        JSON.stringify(registry, null, 2),
        'utf-8'
      );
      files.push({
        name: 'widget_registry.json',
        size: JSON.stringify(registry).length
      });

      // 4. Write app.js bootstrap (NOW buildOutput is initialized!)
      const appPath = path.join(outputDir, 'app.js');
      const appCode = this.generateAppBootstrap();
      await fs.promises.writeFile(appPath, appCode, 'utf-8');
      files.push({ name: 'app.js', size: appCode.length });

      // 5. Write manifest
      const manifestPath = path.join(outputDir, 'manifest.json');
      const manifest = {
        name: this.analysis?.metadata?.projectName || 'FlutterJS App',
        version: '1.0.0',
        description: 'Built with FlutterJS',
        build: {
          timestamp: new Date().toISOString(),
          mode: this.config.mode,
          target: this.config.target
        },
        stats: {
          linesOfCode: this.analysis?.metadata?.linesOfCode || 0,
          widgetsFound: this.analysis?.widgets?.count || 0,
          packagesResolved: this.resolution?.packages.size || 0,
          filesCollected: this.collection?.copiedFiles.length || 0,
          importsRewritten: this.transformed?.importsRewritten || 0
        }
      };

      await fs.promises.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2),
        'utf-8'
      );
      files.push({
        name: 'manifest.json',
        size: JSON.stringify(manifest).length
      });

      // ✅ FIX: Update buildOutput with final files and manifest
      this.buildOutput.files = files;
      this.buildOutput.manifest = manifest;

      spinner.succeed(chalk.green(`✓ Output generated`));
      if (this.config.debugMode) {
        console.log(chalk.gray(`  Files: ${files.length}`));
        console.log(chalk.gray(`  Output: ${outputDir}`));
        console.log();
      }

    } catch (error) {
      spinner.fail(chalk.red(`✗ Output generation failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * FIX: Add this method to phase6_generateOutput() to calculate total size
   * 
   * Error: Cannot read properties of undefined (reading 'toFixed')
   * Cause: No code was writing manifest or calculating bundle size
   */


  calculateBundleSize() {
    try {
      let totalSize = 0;

      // Add transformed code size
      if (this.transformed?.transformedCode) {
        totalSize += Buffer.byteLength(this.transformed.transformedCode, 'utf-8');
      }

      // Add metadata files
      if (this.buildOutput?.metadata) {
        totalSize += Buffer.byteLength(JSON.stringify(this.buildOutput.metadata), 'utf-8');
      }

      // Add registry
      if (this.buildOutput?.registry) {
        totalSize += Buffer.byteLength(JSON.stringify(this.buildOutput.registry), 'utf-8');
      }

      // Add manifest
      if (this.buildOutput?.manifest) {
        totalSize += Buffer.byteLength(JSON.stringify(this.buildOutput.manifest), 'utf-8');
      }

      // Add collected files
      if (this.collection?.totalSize) {
        totalSize += this.collection.totalSize;
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  /**
   * ========================================================================
   * PHASE 7: REPORT & SUMMARY
   * ========================================================================
   */
  /**
   * MODIFIED phase7_report() to safely calculate bundle size
   */

  phase7_report(duration) {
    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('BUILD COMPLETE'));
    console.log(chalk.blue('='.repeat(70)));

    console.log(chalk.gray('\n📊 Statistics:\n'));
    console.log(chalk.gray(`  Source Code: ${this.analysis?.metadata?.linesOfCode || 0} lines`));
    console.log(chalk.gray(`  Widgets: ${this.analysis?.widgets?.count || 0}`));
    console.log(chalk.gray(`  Imports: ${this.analysis?.imports?.length || 0}`));
    console.log(chalk.gray(`  Packages: ${this.resolution?.packages?.size || 0}`));
    console.log(chalk.gray(`  Files Collected: ${this.collection?.copiedFiles?.length || 0}`));
    console.log(chalk.gray(`  Imports Rewritten: ${this.transformed?.importsRewritten || 0}`));
    console.log(chalk.gray(`  Build Time: ${duration}ms`));

    const totalErrors = (this.resolution?.errors?.length || 0) + (this.transformed?.errors?.length || 0);
    if (totalErrors > 0) {
      console.log(chalk.red(`\n⚠️  Errors: ${totalErrors}`));
    }

    console.log(chalk.green(`\n✅ Output: ${this.buildOutput?.outputDir}\n`));
    console.log(chalk.blue('='.repeat(70) + '\n'));

    // ✅ SAFE: Calculate bundle size with fallback
    const bundleSize = this.calculateBundleSize();
    const bundleSizeKB = (bundleSize / 1024).toFixed(2);

    console.log(chalk.blue('='.repeat(70)));
    console.log(chalk.blue('📊 Build Results:'));
    console.log(chalk.blue('='.repeat(70)));
    console.log(chalk.gray(`  Output:     ${path.relative(this.projectRoot, this.buildOutput?.outputDir || '')}`));
    console.log(chalk.gray(`  Bundle:     ${bundleSizeKB} KB`));
    console.log(chalk.gray(`  Mode:       ${this.config.mode}`));
    console.log(chalk.gray(`  Duration:   ${duration}ms`));
    console.log(chalk.blue('='.repeat(70) + '\n'));
  }

  /**
   * ========================================================================
   * HELPER METHODS
   * ========================================================================
   */


  generateWidgetRegistry() {
    try {
      const registry = {};

      const stateless = this.analysis?.widgets?.stateless || [];
      const stateful = this.analysis?.widgets?.stateful || [];

      stateless.forEach(widget => {
        if (widget && typeof widget === 'string') {
          registry[widget] = {
            type: 'stateless',
            exports: true,
            methods: ['build']
          };
        }
      });

      stateful.forEach(widget => {
        if (widget && typeof widget === 'string') {
          registry[widget] = {
            type: 'stateful',
            exports: true,
            methods: ['createState'],
            stateClass: `_${widget}State`
          };
        }
      });

      return registry;

    } catch (error) {
      console.error('[generateWidgetRegistry] Error:', error.message);
      return {};
    }
  }
  generateAppBootstrap() {
    try {
      // ✅ FIX: Handle missing buildOutput gracefully
      if (!this.buildOutput) {
        throw new Error('buildOutput is not set');
      }

      const stateless = this.analysis?.widgets?.stateless || [];
      const stateful = this.analysis?.widgets?.stateful || [];
      const widgets = [...stateless, ...stateful].filter(Boolean);

      if (widgets.length === 0) {
        // Return minimal bootstrap if no widgets found
        return `/**
 * FlutterJS Application Bootstrap
 * Generated by Build Integration
 * Time: ${new Date().toISOString()}
 * 
 * WARNING: No widgets found in analysis
 */

import { AppBridge, initializeApp } from './app_bridge.js';

const analysisMetadata = ${JSON.stringify(this.buildOutput.metadata, null, 2)};

const widgetExports = {};

async function bootApp() {
  console.log('🚀 FlutterJS App Starting...');
  console.log('⚠️  WARNING: No widgets found');
  
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error('Root element #root not found');

    const result = await initializeApp(analysisMetadata, widgetExports, {
      debugMode: ${this.config.debugMode},
      mode: '${this.config.mode}',
      target: '${this.config.target}'
    });

    if (result.success) {
      console.log('✅ App initialized (no widgets)');
    } else {
      console.error('❌ Initialization failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Critical error:', error.message);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
  } else {
    bootApp();
  }
}

export { bootApp, widgetExports, analysisMetadata };
`;
      }

      // Normal case - have widgets
      return `/**
 * FlutterJS Application Bootstrap
 * Generated by Build Integration
 * Time: ${new Date().toISOString()}
 */

import { ${widgets.join(', ')} } from './main.fjs';
import { AppBridge, initializeApp } from './app_bridge.js';

const analysisMetadata = ${JSON.stringify(this.buildOutput.metadata, null, 2)};

const widgetExports = {
  ${widgets.map(w => `${w}`).join(',\n  ')}
};

async function bootApp() {
  console.log('🚀 FlutterJS App Starting...');
  
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error('Root element #root not found');

    const result = await initializeApp(analysisMetadata, widgetExports, {
      debugMode: ${this.config.debugMode},
      mode: '${this.config.mode}',
      target: '${this.config.target}'
    });

    if (result.success) {
      console.log('✅ App initialized successfully');
    } else {
      console.error('❌ Initialization failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Critical error:', error.message);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
  } else {
    bootApp();
  }
}

export { bootApp, widgetExports, analysisMetadata };
`;

    } catch (error) {
      console.error('[generateAppBootstrap] Error:', error.message);
      throw error;
    }
  }

}

export { BuildIntegration };
export default BuildIntegration;