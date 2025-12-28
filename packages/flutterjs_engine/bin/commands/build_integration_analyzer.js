/**
 * ============================================================================
 * BuildAnalyzer - Analysis Pipeline (Phases 1-7)
 * ============================================================================
 *
 * Responsibility: Source code analysis, dependency resolution, and transformation
 * 
 * Phases:
 * 1. Analyze source code
 * 2. Resolve dependencies
 * 3. Install packages
 * 4. Collect packages (✅ UPDATED: Uses enhanced PackageCollector)
 * 5. Transform code (✅ UPDATED: Uses enhanced ImportRewriter)
 * 6. Initialize runtime
 * 7. Build widget metadata
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";

import { PathResolver } from "./path-resolver.js";
import { Analyzer } from "@flutterjs/analyzer/analyzer";
import { DependencyResolver } from "./dependency_resolver.js";
import { PackageInstaller } from "./flutterjs_package_installer.js";
import { PackageCollector } from "./package_collector.js";
import { ImportRewriter } from "./import_rewriter.js";
import { CodeTransformer } from "./code_transformer.js";

class BuildAnalyzer {
  constructor(buildIntegration) {
    this.integration = buildIntegration;
    this.config = buildIntegration.config;
    this.projectRoot = buildIntegration.projectRoot;

    // Initialize sub-systems
    this.pathResolver = new PathResolver(buildIntegration.projectRoot, this.config);
    this.dependencyResolver = new DependencyResolver({
      projectRoot: buildIntegration.projectRoot,
      debugMode: this.config.debugMode,
    });
    this.packageInstaller = new PackageInstaller(
      buildIntegration.projectRoot,
      this.config
    );
    this.packageCollector = new PackageCollector({
      projectRoot: buildIntegration.projectRoot,
      outputDir: this.config.outputDir,
      debugMode: this.config.debugMode,
    });
    this.importRewriter = new ImportRewriter({
      debugMode: this.config.debugMode,
      baseDir: '/node_modules/@flutterjs',  // ✅ FIXED: Absolute path without ./
    });
    this.codeTransformer = new CodeTransformer({}, {
      debugMode: this.config.debugMode,
    });

    if (this.config.debugMode) {
      console.log(chalk.gray("[BuildAnalyzer] Initialized\n"));
    }
  }

  /**
   * ========================================================================
   * PHASE 1: ANALYZE SOURCE CODE
   * ========================================================================
   */
  async phase1_analyze() {
    const spinner = ora(
      chalk.blue("📊 Phase 1: Analyzing source code...")
    ).start();

    try {
      const sourcePath = this.pathResolver.getSourcePath();

      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }

      const sourceCode = fs.readFileSync(sourcePath, "utf-8");
      const analyzer = new Analyzer({
        sourceCode,
        sourceFile: sourcePath,
        debugMode: this.config.debugMode,
        includeImports: true,
        includeContext: true,
        includeSsr: true,
        outputFormat: "json",
      });

      const analysisResult = await analyzer.analyze();
      const widgets = this.normalizeWidgets(analysisResult.widgets);

      // ✅ IMPORTANT: Always ensure @flutterjs/vdom is in imports
      // vdom is the core virtual DOM implementation required by all widgets
      const imports = this.ensureVdomImport(analysisResult.imports || []);

      this.integration.analysis = {
        sourcePath,
        sourceCode,
        widgets: {
          stateless: widgets.stateless,
          stateful: widgets.stateful,
          count: widgets.stateless.length + widgets.stateful.length,
          all: [...widgets.stateless, ...widgets.stateful],
        },
        imports: imports,  // ✅ Updated with vdom
        metadata: {
          projectName: "FlutterJS App",
          rootWidget: widgets.stateful[0] || widgets.stateless[0] || "MyApp",
          stateClasses: this.extractStateClasses(widgets.stateful),
          linesOfCode: sourceCode.split("\n").length,
        },
      };

      spinner.succeed(chalk.green("✔ Analysis complete"));
      if (this.config.debugMode) {
        console.log(chalk.gray(`  Widgets: ${this.integration.analysis.widgets.count}`));
        console.log(chalk.gray(`  Stateless: ${widgets.stateless.length}`));
        console.log(chalk.gray(`  Stateful: ${widgets.stateful.length}`));
        console.log(chalk.gray(`  Imports: ${this.integration.analysis.imports.length}`));
        console.log(chalk.gray(`  Includes @flutterjs/vdom: YES (automatic)`));
        console.log(chalk.gray(`  Root: ${this.integration.analysis.metadata.rootWidget}\n`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`✖ Analysis failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ✅ NEW: Ensure @flutterjs/vdom is always in imports
   * vdom is required by all Flutter widgets and must be available
   */
  ensureVdomImport(imports) {
    // Handle different import formats
    let importObject = {};
    
    if (Array.isArray(imports)) {
      // Format: ['@flutterjs/runtime', '@flutterjs/material', ...]
      for (const item of imports) {
        if (typeof item === 'string') {
          importObject[item] = [];
        } else if (item && typeof item === 'object' && item.source) {
          importObject[item.source] = [];
        }
      }
    } else if (typeof imports === 'object' && imports !== null) {
      // Format: { '@flutterjs/runtime': ['runApp'], '@flutterjs/material': [...] }
      importObject = { ...imports };
    }

    // ✅ Always add vdom as a required dependency
    const vdomImport = '@flutterjs/vdom';
    if (!importObject[vdomImport]) {
      importObject[vdomImport] = [];
      
      if (this.config.debugMode) {
        console.log(chalk.yellow(`  ℹ️  Auto-added @flutterjs/vdom to imports (required core dependency)\n`));
      }
    }

    return importObject;
  }

  /**
   * ========================================================================
   * PHASE 2: RESOLVE DEPENDENCIES
   * ========================================================================
   */
  async phase2_resolveDependencies() {
    const spinner = ora(
      chalk.blue("🔗 Phase 2: Resolving dependencies...")
    ).start();

    try {
      // ✅ FIXED: Pass analyzer result directly
      const resolutionResult = await this.dependencyResolver.resolveAll(
        this.integration.analysis
      );

      this.integration.resolution = this.normalizeResolution(resolutionResult);

      if (this.config.debugMode) {
        console.log(chalk.yellow("\nResolved Packages:"));
        this.integration.resolution.packages.forEach((info, name) => {
          console.log(chalk.green(`  ✔ ${name}`));
          console.log(chalk.gray(`     ${info.location || info.source}`));
        });
        console.log();
      }

      spinner.succeed(
        chalk.green(`✔ Resolved ${this.integration.resolution.packages.size} packages`)
      );
    } catch (error) {
      spinner.fail(chalk.red(`✖ Resolution failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 3: INSTALL PACKAGES
   * ========================================================================
   */
  async phase3_installPackages() {
    const spinner = ora(
      chalk.blue("📦 Phase 3: Installing packages...")
    ).start();

    try {
      if (!this.integration.resolution || this.integration.resolution.packages.size === 0) {
        spinner.info(chalk.yellow("ℹ️  No packages to install"));
        this.integration.installation = {
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
        };
        return;
      }

      const packageNames = Array.from(this.integration.resolution.packages.keys());
      const sdkPackages = packageNames.filter((p) => p.startsWith("@flutterjs/"));
      const otherPackages = packageNames.filter((p) => !p.startsWith("@flutterjs/"));

      const installResults = [];

      for (const pkg of [...sdkPackages, ...otherPackages]) {
        const result = await this.packageInstaller.installPackage(pkg);
        installResults.push(result);
      }

      this.integration.installation = {
        total: installResults.length,
        successful: installResults.filter((r) => r.success).length,
        failed: installResults.filter((r) => !r.success).length,
        results: installResults,
      };

      spinner.succeed(chalk.green(`✔ Installation complete`));
    } catch (error) {
      spinner.fail(chalk.red(`✖ Installation failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 4: COLLECT PACKAGES
   * ========================================================================
   * ✅ UPDATED: Uses enhanced PackageCollector.collectAndCopyPackages()
   */
  async phase4_collectPackages() {
    const spinner = ora(
      chalk.blue("📋 Phase 4: Collecting packages...")
    ).start();

    try {
      if (!this.integration.resolution || this.integration.resolution.packages.size === 0) {
        spinner.info(chalk.yellow("ℹ️  No packages to collect"));
        this.integration.collection = {
          copiedFiles: [],
          failedFiles: [],
          totalSize: 0,
          session: null,
        };
        return;
      }

      // ✅ Use enhanced PackageCollector with new method
      const session = await this.packageCollector.collectAndCopyPackages(
        this.integration.resolution
      );

      // ✅ Store session and results
      this.integration.collection = {
        copiedFiles: Array.from(session.results.keys()),
        failedFiles: session.globalErrors.length > 0 ? session.globalErrors : [],
        totalSize: session.totalSize,
        session: session,
      };

      spinner.succeed(chalk.green(`✔ Collection complete`));
      if (this.config.debugMode) {
        const stats = session.getReport();
        console.log(chalk.gray(`  Packages: ${stats.successful}/${stats.total}`));
        console.log(chalk.gray(`  Files: ${stats.files}`));
        console.log(chalk.gray(`  Size: ${stats.size}\n`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`✖ Collection failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 5: TRANSFORM CODE
   * ========================================================================
   * ✅ UPDATED: Uses enhanced ImportRewriter.analyzeImports()
   */
  async phase5_transformCode() {
    const spinner = ora(chalk.blue("🔧 Phase 5: Transforming code...")).start();

    try {
      const sourceCode = this.integration.analysis.sourceCode;

      // ✅ NEW: Analyze imports WITH resolution data
      const importAnalysisResult = await this.importRewriter.analyzeImportsWithResolution(
        sourceCode,
        this.integration.resolution  // Pass resolution so we can read package.json files
      );

      // Transform code
      const transformResult = this.codeTransformer.transform(sourceCode);

      // Store transformed code
      this.integration.transformed = {
        originalCode: sourceCode,
        transformedCode: transformResult.transformedCode || sourceCode,
        importsRewritten: importAnalysisResult.stats.framework,
        transformations: transformResult.transformations?.length || 0,
        exports: transformResult.exports || [],
        errors: transformResult.errors || [],
        warnings: transformResult.warnings || [],
      };

      // Store import analysis with import map
      this.integration.importAnalysis = importAnalysisResult;

      // ✅ NEW: Store the generated import map for HTML generation
      const importMapObj = importAnalysisResult.getImportMapObject();
      const importMapScript = importAnalysisResult.getImportMapScript();

      this.integration.importMap = importMapObj;
      this.integration.importMapScript = importMapScript;

      spinner.succeed(chalk.green(`✔ Transformation complete`));
      if (this.config.debugMode) {
        console.log(chalk.gray(`  Framework imports found: ${importAnalysisResult.stats.framework}`));
        console.log(chalk.gray(`  External imports: ${importAnalysisResult.stats.external}`));
        console.log(chalk.gray(`  Local imports: ${importAnalysisResult.stats.local}`));
        console.log(chalk.gray(`  Packages loaded: ${importAnalysisResult.packageExports.size}`));

        const importCount = (importMapObj.imports) ? Object.keys(importMapObj.imports).length : 0;
        console.log(chalk.gray(`  Import map entries: ${importCount}`));

        if (importMapObj.imports && Object.keys(importMapObj.imports).length > 0) {
          console.log(chalk.gray(`\n  Import Map (first 5):`));
          let count = 0;
          for (const [key, value] of Object.entries(importMapObj.imports)) {
            if (count >= 5) {
              console.log(chalk.gray(`    ... and ${Object.keys(importMapObj.imports).length - 5} more`));
              break;
            }
            console.log(chalk.gray(`    ${key}`));
            console.log(chalk.gray(`      → ${value}`));
            count++;
          }
        }

        console.log(chalk.gray(`  Transformations: ${this.integration.transformed.transformations}\n`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`✖ Transformation failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 6: INITIALIZE RUNTIME
   * ========================================================================
   */
  async phase6_initializeRuntime() {
    const spinner = ora(
      chalk.blue("⚙️  Phase 6: Initializing runtime...")
    ).start();

    try {
      this.integration.runtime = {
        initialized: true,
        mode: "build-time-stub",
        message: "Actual runtime created in browser",
      };

      if (this.config.debugMode) {
        console.log(chalk.green("✔ Runtime stub created"));
        console.log(chalk.gray("  (Actual runtime will initialize in browser)\n"));
      }

      spinner.succeed(chalk.green("✔ Runtime prepared"));
    } catch (error) {
      spinner.fail(
        chalk.red(`✖ Runtime initialization failed: ${error.message}`)
      );
      throw error;
    }
  }

  /**
   * ========================================================================
   * PHASE 7: BUILD WIDGETS
   * ========================================================================
   */
  async phase7_buildWidgets() {
    const spinner = ora(
      chalk.blue("🎨 Phase 7: Preparing widget data...")
    ).start();

    try {
      const widgetMetadata = this.extractWidgetMetadata(
        this.integration.transformed.transformedCode
      );

      this.integration.generatedVNodes = null;
      this.integration.widgetMetadata = widgetMetadata;

      if (this.config.debugMode) {
        console.log(chalk.green("✔ Widget metadata extracted"));
        console.log(chalk.gray(`  Found ${Object.keys(widgetMetadata).length} widgets\n`));
      }

      spinner.succeed(chalk.green("✔ Widget preparation complete"));
    } catch (error) {
      spinner.fail(chalk.red(`✖ Widget preparation failed: ${error.message}`));
      throw error;
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Normalize widgets from analyzer result
   */
  normalizeWidgets(widgets) {
    if (!widgets) {
      return { stateless: [], stateful: [] };
    }

    return {
      stateless: this.ensureArray(widgets.stateless),
      stateful: this.ensureArray(widgets.stateful),
    };
  }

  /**
   * Ensure value is an array
   */
  ensureArray(value) {
    if (Array.isArray(value)) {
      return value.filter((v) => v && typeof v === "string");
    }
    if (value && typeof value === "object") {
      return Object.keys(value).filter((k) => k && typeof k === "string");
    }
    return [];
  }

  /**
   * Extract state classes from stateful widgets
   */
  extractStateClasses(statefulWidgets) {
    const stateClasses = {};

    if (Array.isArray(statefulWidgets)) {
      statefulWidgets.forEach((widget) => {
        if (widget && typeof widget === "string") {
          stateClasses[widget] = `_${widget}State`;
        }
      });
    }

    return stateClasses;
  }

  /**
   * Normalize dependency resolver output
   */
  normalizeResolution(result) {
    if (!result) {
      return {
        packages: new Map(),
        allFiles: [],
        graph: new Map(),
        errors: [],
        warnings: [],
      };
    }

    let packages = result.packages || new Map();

    if (packages instanceof Map) {
      // Already a Map
    } else if (typeof packages === "object" && packages !== null) {
      // Convert object to Map
      packages = new Map(Object.entries(packages));
    } else {
      // Invalid, reset to empty Map
      packages = new Map();
    }

    return {
      packages,
      allFiles: result.allFiles || [],
      graph: result.graph || new Map(),
      errors: result.errors || [],
      warnings: result.warnings || [],
    };
  }

  /**
   * Extract widget metadata from transformed code
   */
  extractWidgetMetadata(transformedCode) {
    const metadata = {};
    const classRegex =
      /export\s+(?:class|const)\s+([A-Z][a-zA-Z0-9]*)\s+(?:extends\s+(\w+)|=\s*class)/g;
    let match;

    while ((match = classRegex.exec(transformedCode)) !== null) {
      const className = match[1];
      const extendsClass = match[2] || "unknown";

      metadata[className] = {
        name: className,
        baseClass: extendsClass,
        isStateful:
          extendsClass === "StatefulWidget" ||
          extendsClass.includes("Stateful"),
        isStateless:
          extendsClass === "StatelessWidget" ||
          extendsClass.includes("Stateless"),
      };
    }

    return metadata;
  }
}

export { BuildAnalyzer };
export default BuildAnalyzer;