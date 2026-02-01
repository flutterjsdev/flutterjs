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
import { execSync } from "child_process";

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

      // ✅ 0. Copy all source files (renaming .fjs -> .js)
      // This ensures all multi-file assets are available
      await this._copySourceFiles(outputDir);

      // ✅ 1. Write transformed code
      // This OVERWRITES the copied main.js with the transformed version
      const mainPath = path.join(outputDir, "main.js");
      let transformedCode = this.integration.transformed?.transformedCode || "";

      // ✅ REWRITE IMPORTS: .fjs -> .js
      // Since we renamed the files on disk, we must update the imports
      transformedCode = transformedCode.replace(/\.fjs(['"])/g, '.js$1');

      await fs.promises.writeFile(mainPath, transformedCode, "utf-8");
      files.push({ name: "main.js", size: transformedCode.length });

      // ✅ 7. Write importmap.json
      const importMapPath = path.join(outputDir, "importmap.json");
      const importMapJSON = JSON.stringify(this.integration.importMap || {}, null, 2);
      await fs.promises.writeFile(importMapPath, importMapJSON, "utf-8");
      files.push({ name: "importmap.json", size: importMapJSON.length });

      // ✅ 2. Write HTML
      const htmlPath = path.join(outputDir, "index.html");
      const htmlWrapper = this.wrapHTMLWithTemplate(
        this.integration.generatedHTML,
        metadata,
        importMapJSON
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



      // ✅ 8. Write manifest
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

      // ✅ 9. Write SourceMaps
      const sourceMapperPath = path.join(outputDir, "source_mapper.js");
      const sourceMapper = this.generateSourceMapper();
      await fs.promises.writeFile(sourceMapperPath, sourceMapper, "utf-8");
      files.push({ name: "source_mapper.js", size: sourceMapper.length });

      // ✅ 7.  genreateWidgetTracker
      const widgetTrackerPath = path.join(outputDir, "widget_tracker.js");
      const widgetTracker = this.genreateWidgetTracker();
      await fs.promises.writeFile(widgetTrackerPath, widgetTracker, "utf-8");
      await fs.promises.writeFile(widgetTrackerPath, widgetTracker, "utf-8");
      files.push({ name: "widget_tracker.js", size: widgetTracker.length });


      // ✅ 8. Generate SSR Runner (if target=ssr)
      if (this.config.target === 'ssr') {
        const ssrPath = path.join(outputDir, "ssr_runner.js");
        const ssrCode = this.generateSSRRunner();
        await fs.promises.writeFile(ssrPath, ssrCode, "utf-8");
        files.push({ name: "ssr_runner.js", size: ssrCode.length });

        await this.executeSSR(ssrPath);
      }


      this.integration.buildOutput.files = files;
      this.integration.buildOutput.manifest = manifest;
      await this._copySourceMapsFromPackages();
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
   * ✅ NEW: Copy source files so multi-file apps work
   * Renames .fjs -> .js AND rewrites imports
   * Preserves directory structure
   */
  async _copySourceFiles(outputDir) {
    if (!this.integration.analysis || !this.integration.analysis.sourcePath) {
      return;
    }

    const srcDir = path.dirname(this.integration.analysis.sourcePath);
    console.log(chalk.blue(`\n  Copying source files from: ${srcDir}`));

    const copyRecursive = async (currentPath, targetPath) => {
      // Don't traverse into node_modules or hidden dirs
      if (currentPath.includes('node_modules') || path.basename(currentPath).startsWith('.')) {
        return;
      }

      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      await fs.promises.mkdir(targetPath, { recursive: true });

      let count = 0;

      for (const entry of entries) {
        const srcPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          const destPath = path.join(targetPath, entry.name);
          await copyRecursive(srcPath, destPath);
        } else if (entry.isFile()) {
          // Rename .fjs -> .js
          let finalDest = path.join(targetPath, entry.name);
          let isFjs = false;

          if (entry.name.endsWith('.fjs')) {
            finalDest = path.join(targetPath, entry.name.replace(/\.fjs$/, '.js'));
            isFjs = true;
          } else if (entry.name.endsWith('.dart') || entry.name === 'flutterjs.config.js') {
            // Skip Dart files and config
            continue;
          }

          // Read content, replace imports if FJS, write to dest
          if (isFjs) {
            let content = await fs.promises.readFile(srcPath, 'utf-8');
            content = content.replace(/\.fjs(['"])/g, '.js$1');
            await fs.promises.writeFile(finalDest, content, 'utf-8');
          } else {
            await fs.promises.copyFile(srcPath, finalDest);
          }

          count++;
        }
      }
      return count;
    };

    try {
      await copyRecursive(srcDir, outputDir);
      console.log(chalk.gray(`  ✓ Source files copied`));
    } catch (e) {
      console.warn(chalk.yellow(`  ⚠ Error copying source files: ${e.message}`));
    }
  }


  async _copySourceMapsFromPackages() {
    // ✅ FIX: Don't copy source maps in development mode
    // The dev server serves node_modules directly from project root
    // DEBUG: Print mode
    console.log(chalk.magenta(`DEBUG: _copySourceMapsFromPackages mode=${this.config.mode}`));

    if (this.config.mode === 'development' || this.config.mode === 'dev') {
      if (this.config.debugMode) {
        console.log(chalk.gray(`  ℹ️  Skipping source map copy (development mode)`));
      }
      return;
    }

    const nodeModulesDir = path.join(this.projectRoot, 'node_modules', '@flutterjs');
    const outputNodeModulesDir = path.join(this.integration.buildOutput.outputDir, 'node_modules', '@flutterjs');

    try {
      // Create output node_modules directory
      await fs.promises.mkdir(outputNodeModulesDir, { recursive: true });

      // Find all .map files
      const findMapFiles = async (dir) => {
        const maps = [];
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            const subMaps = await findMapFiles(fullPath);
            maps.push(...subMaps);
          } else if (entry.name.endsWith('.map')) {
            maps.push(fullPath);
          }
        }

        return maps;
      };

      const mapFiles = await findMapFiles(nodeModulesDir);

      for (const mapFile of mapFiles) {
        const relative = path.relative(nodeModulesDir, mapFile);
        const dest = path.join(outputNodeModulesDir, relative);

        // Create destination directory
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });

        // Copy the map file
        await fs.promises.copyFile(mapFile, dest);

        if (this.config.debugMode) {
          console.log(chalk.gray(`  ✓ Copied: ${relative}`));
        }
      }

      console.log(chalk.green(`✅ Copied ${mapFiles.length} source map files`));

    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not copy source maps: ${error.message}`));
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
   * ✅ UPDATED: Gets import map from JSON argument
   */
  wrapHTMLWithTemplate(bodyHTML, metadata, importMapJSON) {
    // ✅ Use passed JSON or fall back to empty
    const mapContent = importMapJSON || '{}';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Built with FlutterJS">
  <meta name="theme-color" content="#6750a4">
  <title>${metadata.projectName}</title>
  <link rel="stylesheet" href="./styles.css">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <!-- ✅ Import Map: Inline for reliability -->
  <script type="importmap">
    ${importMapJSON}
  </script>

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


  genreateWidgetTracker() {
    return `
   /**
 * ============================================================================
 * IMPROVED WIDGET TRACKER
 * 
 * Provides comprehensive widget build tracking with:
 * ✅ Clear error identification
 * ✅ Build chain visualization
 * ✅ Actionable error messages
 * ✅ Component isolation
 * ============================================================================
 */

class WidgetTracker {
  constructor() {
    this.buildStack = [];           // Current build hierarchy
    this.widgetRegistry = new Map(); // All created widgets
    this.buildAttempts = [];        // Build attempt history
    this.errorLog = [];             // All errors
    this.stats = {
      created: 0,
      buildAttempts: 0,
      successful: 0,
      failed: 0
    };
  }

  // ========================================================================
  // TRACKING METHODS
  // ========================================================================

  /**
   * Track widget instantiation
   */
  trackWidgetCreation(widget) {
    const widgetId = this._generateId();
    const info = {
      id: widgetId,
      createdAt: new Date().toISOString(),
      constructor: widget.constructor.name,
      type: this._getWidgetType(widget),
      hasTag: widget.tag !== undefined,
      hasBuild: typeof widget.build === 'function',
      hasCreateState: typeof widget.createState === 'function',
      hasUpdateShouldNotify: typeof widget.updateShouldNotify === 'function',
      properties: this._extractProperties(widget)
    };

    this.widgetRegistry.set(widgetId, info);
    widget.__trackedId = widgetId;
    this.stats.created++;

    return widgetId;
  }

  /**
   * Track build start
   */
  trackBuildStart(widget, context = {}) {
    this.stats.buildAttempts++;

    const attempt = {
      id: this._generateId(),
      timestamp: new Date().toISOString(),
      widget: widget?.constructor?.name || 'Unknown',
      widgetId: widget?.__trackedId || 'untracked',
      stack: [...this.buildStack],
      stackPath: this.buildStack.join(' → ') || 'ROOT',
      status: 'IN_PROGRESS',
      startTime: performance.now(),
      context: {
        element: context.element?.constructor?.name,
        parent: context.parent?.constructor?.name,
        method: context.method || 'unknown'
      }
    };

    this.buildAttempts.push(attempt);
    this.buildStack.push(widget?.constructor?.name || 'Unknown');

    return attempt;
  }

  /**
   * Track build success
   */
  trackBuildSuccess(widget, result) {
    if (this.buildAttempts.length === 0) return;

    const attempt = this.buildAttempts[this.buildAttempts.length - 1];
    const duration = performance.now() - attempt.startTime;

    attempt.status = 'SUCCESS';
    attempt.duration = duration;
    attempt.result = {
      type: typeof result,
      constructor: result?.constructor?.name,
      hasTag: result?.tag !== undefined,
      isVNode: result?.tag !== undefined && typeof result.tag === 'string'
    };

    this.buildStack.pop();
    this.stats.successful++;
  }

  /**
   * Track build failure - ENHANCED ERROR TRACKING
   */
  trackBuildFailure(widget, error, context = {}) {
    if (this.buildAttempts.length === 0) {
      // Create new attempt if needed
      this.trackBuildStart(widget, context);
    }

    const attempt = this.buildAttempts[this.buildAttempts.length - 1];
    const duration = performance.now() - attempt.startTime;

    attempt.status = 'FAILED';
    attempt.duration = duration;
    attempt.error = {
      message: error?.message || String(error),
      code: error?.code || 'UNKNOWN',
      type: error?.constructor?.name,
      stack: error?.stack?.split('\\n').slice(0, 5) || [] // First 5 lines
    };

    attempt.failureInfo = this._analyzeFailure(widget, error);
    attempt.suggestion = this._generateSuggestion(widget, error, attempt);

    this.buildStack.pop();
    this.stats.failed++;

    // Add to error log
    this.errorLog.push({
      timestamp: new Date().toISOString(),
      widget: widget?.constructor?.name,
      error: attempt.error.message,
      buildPath: attempt.stackPath,
      failureInfo: attempt.failureInfo
    });

    return attempt;
  }

  // ========================================================================
  // ERROR ANALYSIS & SUGGESTIONS
  // ========================================================================

  /**
   * Analyze failure reason
   */
  _analyzeFailure(widget, error) {
    const analysis = {
      isWidgetIssue: false,
      isElementIssue: false,
      isStateIssue: false,
      reason: 'Unknown',
      details: []
    };

    if (!widget) {
      analysis.reason = 'Widget is null or undefined';
      analysis.details.push('No widget instance available for build');
      return analysis;
    }

    // Check widget type
    const hasCreateState = typeof widget.createState === 'function';
    const hasBuild = typeof widget.build === 'function';
    const hasTag = widget.tag !== undefined;

    if (hasTag && hasBuild) {
      analysis.isWidgetIssue = true;
      analysis.reason = 'Widget is hybrid (has both tag and build)';
      analysis.details.push('Widget appears to be both VNode and Widget');
      return analysis;
    }

    if (!hasBuild && !hasCreateState && !hasTag) {
      analysis.isWidgetIssue = true;
      analysis.reason = 'Invalid widget type';
      analysis.details.push('Widget has no build(), createState(), or tag property');
      analysis.details.push('Check if widget was properly instantiated');
      return analysis;
    }

    if (error?.message?.includes('null')) {
      analysis.reason = 'Null/Undefined returned';
      analysis.details.push('build() or createElement() returned null');
      return analysis;
    }

    if (error?.message?.includes('build')) {
      analysis.isWidgetIssue = true;
      analysis.reason = 'Build method error';
      analysis.details.push('Error occurred in build() method');
      if (hasCreateState) {
        analysis.details.push('This is a StatefulWidget - check State.build()');
      }
      return analysis;
    }

    if (error?.message?.includes('element') || error?.message?.includes('Element')) {
      analysis.isElementIssue = true;
      analysis.reason = 'Element creation error';
      analysis.details.push('Error occurred during element creation');
      return analysis;
    }

    if (error?.message?.includes('state') || error?.message?.includes('State')) {
      analysis.isStateIssue = true;
      analysis.reason = 'State initialization error';
      analysis.details.push('Error occurred during state initialization');
      return analysis;
    }

    analysis.reason = 'Generic build error';
    analysis.details.push('Check error message for specifics');
    return analysis;
  }

  /**
   * Generate actionable suggestion
   */
  _generateSuggestion(widget, error, attempt) {
    const name = widget?.constructor?.name || 'Unknown';
    const msg = error?.message || '';
    const failureInfo = attempt.failureInfo;

    const suggestions = [];

    // Based on failure analysis
    if (failureInfo.isWidgetIssue) {
      suggestions.push(\`❌ Widget Issue: \${name}\`);
      suggestions.push(\`   Check that \${name} is a valid Widget class\`);

      if (typeof widget.createState === 'function') {
        suggestions.push(\`   This is a StatefulWidget\`);
        suggestions.push(\`   Verify createState() returns a State instance\`);
        suggestions.push(\`   Verify State.build(context) returns a Widget or VNode\`);
      } else if (typeof widget.build === 'function') {
        suggestions.push(\`   This is a StatelessWidget\`);
        suggestions.push(\`   Verify build(context) returns a Widget or VNode\`);
      }
    }

    if (failureInfo.isElementIssue) {
      suggestions.push(\`❌ Element Issue: \${name}\`);
      suggestions.push(\`   createElement(parent, runtime) may have failed\`);
      suggestions.push(\`   Check that runtime is passed correctly\`);
      suggestions.push(\`   Verify Element subclass implementation\`);
    }

    if (failureInfo.isStateIssue) {
      suggestions.push(\`❌ State Issue: \${name}\`);
      suggestions.push(\`   State initialization failed\`);
      suggestions.push(\`   Check initState(), didMount() methods\`);
      suggestions.push(\`   Verify state properties are properly initialized\`);
    }

    // Specific error messages
    if (msg.includes('createState') || msg.includes('not a function')) {
      suggestions.push(\`\\n⚠️  Method Not Found\`);
      suggestions.push(\`   Verify \${name}.createState() is defined\`);
      suggestions.push(\`   Check method name spelling\`);
    }

    if (msg.includes('returned null') || msg.includes('undefined')) {
      suggestions.push(\`\\n⚠️  Null/Undefined Return\`);
      suggestions.push(\`   build() must return a Widget or VNode\`);
      suggestions.push(\`   Cannot return null or undefined\`);
      suggestions.push(\`   Example: return new Container(...)\`);
    }

    if (msg.includes('Cannot read') || msg.includes('is not defined')) {
      suggestions.push(\`\\n⚠️  Reference Error\`);
      suggestions.push(\`   Variable or property doesn't exist\`);
      suggestions.push(\`   Check spelling and scope\`);
      suggestions.push(\`   Ensure imports are correct\`);
    }

    if (suggestions.length === 0) {
      suggestions.push(\`⚠️  Generic Error: \${msg}\`);
      suggestions.push(\`   Check console for full error details\`);
    }

    return suggestions.join('\\n');
  }

  // ========================================================================
  // REPORTING - ENHANCED
  // ========================================================================

  /**
   * Print detailed error report
   */
  printReport() {
    if (this.stats.failed === 0) {
      console.log('%c✅ No errors recorded', 'color: #4CAF50; font-weight: bold');
      return;
    }

    console.clear();

    console.log('%c════════════════════════════════════════════════════════════════', 'color: #f44336; font-weight: bold');
    console.log('%c🔴 WIDGET BUILD ERROR REPORT', 'color: #f44336; font-weight: bold; font-size: 16px');
    console.log('%c════════════════════════════════════════════════════════════════\\n', 'color: #f44336; font-weight: bold');

    // Statistics
    console.log('%c📊 STATISTICS', 'color: #2196F3; font-weight: bold');
    console.log(\`  Total Widgets: \${this.stats.created}\`);
    console.log(\`  Build Attempts: \${this.stats.buildAttempts}\`);
    console.log(\`  ✅ Successful: \${this.stats.successful}\`);
    console.log(\`  ❌ Failed: \${this.stats.failed}\\n\`);

    // Failed attempts
    if (this.buildAttempts.length > 0) {
      const failedAttempts = this.buildAttempts.filter(a => a.status === 'FAILED');

      failedAttempts.forEach((attempt, idx) => {
        this._printFailedAttempt(attempt, idx + 1, failedAttempts.length);
      });
    }

    console.log('%c════════════════════════════════════════════════════════════════\\n', 'color: #f44336; font-weight: bold');
  }

  /**
   * Print single failed attempt
   */
  _printFailedAttempt(attempt, index, total) {
    console.log(\`%c[\${index}/\${total}] \${attempt.widget}\`, 'color: #FF5252; font-weight: bold; font-size: 14px');
    console.log(\`    Timestamp: \${attempt.timestamp}\`);
    console.log(\`    Duration: \${attempt.duration.toFixed(2)}ms\\n\`);

    console.log(\`%c    Build Path:\`, 'color: #FF9800; font-weight: bold');
    if (attempt.stack.length === 0) {
      console.log(\`      ROOT → \${attempt.widget}\`);
    } else {
      console.log(\`      \${attempt.stackPath}\`);
    }
    console.log('');

    console.log(\`%c    Error Message:\`, 'color: #f44336; font-weight: bold');
    console.log(\`    ❌ \${attempt.error.message}\`);
    if (attempt.error.code !== 'UNKNOWN') {
      console.log(\`    Code: \${attempt.error.code}\`);
    }
    console.log('');

    console.log(\`%c    Failure Analysis:\`, 'color: #FF6F00; font-weight: bold');
    console.log(\`    Reason: \${attempt.failureInfo.reason}\`);
    if (attempt.failureInfo.details.length > 0) {
      attempt.failureInfo.details.forEach(detail => {
        console.log(\`    • \${detail}\`);
      });
    }
    console.log('');

    console.log(\`%c    💡 Suggestions:\`, 'color: #4CAF50; font-weight: bold');
    const suggestionLines = attempt.suggestion.split('\\n');
    suggestionLines.forEach(line => {
      if (line.trim()) {
        console.log(\`    \${line}\`);
      }
    });
    console.log('');

    if (attempt.error.stack && attempt.error.stack.length > 0) {
      console.log(\`%c    Stack Trace:\`, 'color: #666; font-weight: bold');
      attempt.error.stack.forEach(line => {
        console.log(\`    \${line}\`);
      });
      console.log('');
    }
  }

  /**
   * Get full report as object
   */
  getReport() {
    return {
      stats: { ...this.stats },
      errors: this.errorLog,
      buildAttempts: this.buildAttempts.map(a => ({
        widget: a.widget,
        status: a.status,
        duration: a.duration,
        error: a.error?.message,
        suggestions: a.suggestion,
        buildPath: a.stackPath
      })),
      registry: Array.from(this.widgetRegistry.values())
    };
  }

  /**
   * Get last error details
   */
  getLastError() {
    const failed = this.buildAttempts.filter(a => a.status === 'FAILED');
    return failed.length > 0 ? failed[failed.length - 1] : null;
  }

  /**
   * Clear all tracking data
   */
  clear() {
    this.buildStack = [];
    this.widgetRegistry.clear();
    this.buildAttempts = [];
    this.errorLog = [];
    this.stats = { created: 0, buildAttempts: 0, successful: 0, failed: 0 };
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  _getWidgetType(widget) {
    if (typeof widget.createState === 'function') return 'StatefulWidget';
    if (typeof widget.build === 'function') return 'StatelessWidget';
    if (typeof widget.updateShouldNotify === 'function') return 'InheritedWidget';
    if (widget.tag !== undefined) return 'VNode';
    return 'Unknown';
  }

  _extractProperties(widget) {
    const props = {};
    const keys = Object.keys(widget)
      .filter(k => !k.startsWith('_') && !k.startsWith('__'))
      .slice(0, 5); // Limit to 5 properties

    keys.forEach(key => {
      const value = widget[key];
      if (typeof value !== 'function') {
        props[key] = typeof value === 'object' ? \`[\${value?.constructor?.name}]\` : value;
      }
    });

    return props;
  }

  _generateId() {
    return \`\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
  }
}

// ============================================================================
// GLOBAL TRACKER MANAGEMENT
// ============================================================================

let globalTracker = null;

export function enableWidgetTracking() {
  if (globalTracker) {
    console.warn('⚠️ Widget tracking already enabled');
    return globalTracker;
  }

  globalTracker = new WidgetTracker();

  if (typeof window !== 'undefined') {
    window.__widgetTracker = globalTracker;
    console.log('%c✅ Widget Tracker Enabled', 'color: #4CAF50; font-weight: bold');
    console.log('%c   Use: window.__widgetTracker.printReport()', 'color: #666');
    console.log('%c   Use: window.__widgetTracker.getReport()', 'color: #666');
  }

  return globalTracker;
}

export function getWidgetTracker() {
  return globalTracker;
}

export function printWidgetReport() {
  if (!globalTracker) {
    console.warn('⚠️ Widget tracking not enabled');
    return;
  }
  globalTracker.printReport();
}

export function getWidgetReport() {
  return globalTracker?.getReport() || null;
}

export { WidgetTracker };

   `;
  }


  /**
   * Generate source_mapper
   */
  generateSourceMapper() {
    return `/**
 * ============================================================================
 * Advanced Source Map Loader - Multi-Package Support
 * ============================================================================
 */

class PackageSourceMapManager {
  constructor(options = {}) {
    this.options = {
      baseNodeModules: options.baseNodeModules || '/node_modules/@flutterjs',
      debugMode: options.debugMode || false,
      autoDiscover: options.autoDiscover !== false,
      parallel: options.parallel !== false,
      maxConcurrent: options.maxConcurrent || 5,
      timeout: options.timeout || 5000,
      ...options,
    };

    this.packages = new Map();
    this.globalNameMap = new Map();
    this.sourceMapCache = new Map();
    this.filePathMap = new Map();
    this.loadingPromise = null;
    this.isLoaded = false;

    this.stats = {
      packagesDiscovered: 0,
      packagesLoaded: 0,
      sourceMapsLoaded: 0,
      totalNames: 0,
      totalFiles: 0,
      loadTime: 0,
      errors: [],
    };

    if (this.options.debugMode) {
      console.log('[SourceMapLoader] 🚀 Initialized');
      console.log(\`  Base: \${this.options.baseNodeModules}\`);
      console.log(\`  Auto-discover: \${this.options.autoDiscover}\`);
    }
  }

  async load() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    const startTime = performance.now();

    this.loadingPromise = (async () => {
      console.log('\\n📦 Phase: Discovering Source Maps from All Packages');
      console.log('='.repeat(70));

      try {
        console.log('\\n🔍 Discovering packages...');
        const packages = await this._discoverPackages();

        if (packages.length === 0) {
          console.warn(\`⚠️  No packages found at \${this.options.baseNodeModules}\`);
          this.isLoaded = true;
          return this._getLoadResult(startTime, 0);
        }

        this.stats.packagesDiscovered = packages.length;
        console.log(\`  ✅ Found \${packages.length} packages:\\n\`);
        packages.forEach((pkg) => {
          console.log(\`     • @flutterjs/\${pkg}\`);
        });

        console.log('\\n\\n📂 Loading source maps...\\n');
        const results = await this._loadPackageMaps(packages);

        console.log('\\n\\n🗺️  Merging name mappings...\\n');
        await this._mergeNameMaps();

        this.isLoaded = true;
        const result = this._getLoadResult(startTime, results.length);

        console.log('='.repeat(70));
        console.log(\`✅ Source maps ready!\\n\`);
        console.log(\`   Packages: \${this.stats.packagesLoaded}\`);
        console.log(\`   Source Maps: \${this.stats.sourceMapsLoaded}\`);
        console.log(\`   Names Mapped: \${this.stats.totalNames}\`);
        console.log(\`   Load Time: \${this.stats.loadTime.toFixed(2)}ms\`);
        console.log('='.repeat(70) + '\\n');

        return result;
      } catch (error) {
        console.error(\`\\n❌ Failed to load source maps: \${error.message}\`);
        if (this.options.debugMode) {
          console.error(\`Stack: \${error.stack}\`);
        }
        this.stats.errors.push(error.message);
        return { success: false, loaded: 0, error: error.message };
      }
    })();

    return this.loadingPromise;
  }

  async _discoverPackages() {
    return await this._discoverPackagesFallback();
  }

  _parseDirectoryListing(html) {
    const packages = [];
    const linkRegex = /href="([^"]+?)\\/"/g;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const name = match[1];
      if (name !== '..' && !name.startsWith('.') && name.length > 0) {
        packages.push(name);
      }
    }

    return packages;
  }

  // ✅ FIXED: Use GET instead of HEAD for discovery
  async _discoverPackagesFallback() {
    const commonPackages = [
      'runtime',
      'vdom',
      'material',
    ];

    const discovered = [];

    for (const pkgName of commonPackages) {
      try {
        const packageJsonUrl = \`\${this.options.baseNodeModules}/\${pkgName}/package.json\`;
        const response = await fetch(packageJsonUrl, {
          method: 'GET',  // ✅ CHANGED: Use GET instead of HEAD
          timeout: this.options.timeout,
        }).catch((err) => {
          if (this.options.debugMode) {
            console.log(\`  [Fetch error] \${pkgName}: \${err.message}\`);
          }
          return null;
        });

        if (response && response.ok) {
          // Try to parse to ensure it's valid JSON
          try {
            const json = await response.json();
            discovered.push(pkgName);
            if (this.options.debugMode) {
              console.log(\`  ✓ Found: \${pkgName}\`);
            }
          } catch (parseErr) {
            console.error(\`  ❌ Invalid package.json for \${pkgName}: \${parseErr.message}\`);
          }
        }
      } catch (err) {
        if (this.options.debugMode) {
          console.log(\`  ❌ Error checking \${pkgName}: \${err.message}\`);
        }
      }
    }

    return discovered;
  }
  async _loadPackageMaps(packageNames) {
    const results = [];
    const chunks = this._chunkArray(packageNames, this.options.maxConcurrent);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((pkgName) => this._loadPackageSourceMaps(pkgName))
      );
      results.push(...chunkResults);
    }

    return results.filter((r) => r !== null);
  }

  async _loadPackageSourceMaps(packageName) {
    const packagePath = \`\${this.options.baseNodeModules}/\${packageName}\`;
    const packageInfo = {
      name: packageName,
      path: packagePath,
      files: new Map(),
      nameMap: new Map(),
      errors: [],
      filesLoaded: 0,
      mapsLoaded: 0,
    };

    try {
      const jsFiles = await this._findJsFiles(packagePath);

      if (jsFiles.length === 0) {
        if (this.options.debugMode) {
          console.log(\`  ⚠️  No JS files in \${packageName}\`);
        }
        return null;
      }

      for (const jsFile of jsFiles) {
        const mapUrl = \`\${packagePath}/\${jsFile}.map\`;

        try {
          const mapData = await this._fetchSourceMap(mapUrl);

          if (mapData) {
            const basename = jsFile.split('/').pop();
            packageInfo.files.set(jsFile, mapData);
            packageInfo.mapsLoaded++;

            if (mapData.names && Array.isArray(mapData.names)) {
              mapData.names.forEach((name) => {
                packageInfo.nameMap.set(name, name);
              });
            }

            if (this.options.debugMode) {
              console.log(\`    ✓ \${packageName}/\${basename} (\${mapData.names?.length || 0} names)\`);
            }
          }
        } catch (err) {
          packageInfo.errors.push({
            file: jsFile,
            error: err.message,
          });
        }
      }

      if (packageInfo.mapsLoaded > 0) {
        this.packages.set(packageName, packageInfo);
        this.stats.packagesLoaded++;
        this.stats.sourceMapsLoaded += packageInfo.mapsLoaded;
        this.stats.totalFiles += jsFiles.length;

        console.log(\`  ✅ \${packageName}: \${packageInfo.mapsLoaded}/\${jsFiles.length} source maps\`);

        return packageInfo;
      } else {
        console.log(\`  ⚠️  \${packageName}: No source maps loaded\`);
        return null;
      }
    } catch (error) {
      packageInfo.errors.push({ error: error.message });
      console.log(\`  ⚠️  \${packageName}: \${error.message}\`);
      return null;
    }
  }

// ✅ Helper to resolve package.json - WITH DEBUGGING
 async _resolvePackageJson(packagePath) {
    try {
      const packageJsonUrl = \`\${packagePath}/package.json\`;
      
      console.log(\`    📥 Fetching: \${packageJsonUrl}\`);

      const response = await fetch(packageJsonUrl, {
        method: 'GET',
        timeout: this.options.timeout,
      }).catch((err) => {
        console.error(\`    ❌ Fetch error: \${err.message}\`);
        return null;
      });

      if (!response) {
        console.error(\`    ❌ No response from: \${packageJsonUrl}\`);
        return null;
      }

      if (!response.ok) {
        console.error(\`    ❌ HTTP \${response.status}: \${packageJsonUrl}\`);
        return null;
      }

      let packageJson;
      try {
        packageJson = await response.json();
      } catch (parseErr) {
        console.error(\`    ❌ Failed to parse JSON: \${parseErr.message}\`);
        return null;
      }

      if (!packageJson.name) {
        console.error(\`    ❌ Invalid package.json - no "name" field\`);
        return null;
      }

      console.log(\`    ✅ Loaded package.json: \${packageJson.name}\`);
      console.log(\`    📖 Main field: "\${packageJson.main}"\`);

      return packageJson;
    } catch (error) {
      console.error(\`    ❌ Error in _resolvePackageJson: \${error.message}\`);
      return null;
    }
  }

  // ✅ FIXED: Properly resolve entry point from package.json
  async _findJsFiles(packagePath) {
    const files = [];

    try {
      // Get package.json
      const packageJson = await this._resolvePackageJson(packagePath);
      
      if (!packageJson) {
        console.log(\`    ⚠️  Could not resolve package.json at \${packagePath}\`);
        return files;
      }

      if (this.options.debugMode) {
        console.log(\`    📦 Package: \${packageJson.name}\`);
      }
      
      // ✅ Get entry point from "main" field
      let entryPoint = packageJson.main;

      if (!entryPoint) {
        console.log(\`    ⚠️  No "main" field in \${packageJson.name}/package.json\`);
        return files;
      }

      // Normalize the path (remove leading ./)
      if (entryPoint.startsWith('./')) {
        entryPoint = entryPoint.substring(2);
      }

      console.log(\`    📖 Resolved entry point: \${entryPoint}\`);

      // Test if the entry point exists
      const entryUrl = \`\${packagePath}/\${entryPoint}\`;
      
      if (this.options.debugMode) {
        console.log(\`    🔍 Checking: \${entryUrl}\`);
      }

      const entryResponse = await fetch(entryUrl, {
        method: 'HEAD',
        timeout: this.options.timeout,
      }).catch(() => null);

      if (entryResponse && entryResponse.ok) {
        files.push(entryPoint);
        console.log(\`    ✅ Found: \${entryPoint}\`);
        return files;
      }

      // Entry point doesn't exist
      console.log(\`    ❌ Entry point missing: \${entryPoint}\`);
      console.log(\`    🔍 Trying fallbacks...\`);

      const fallbackLocations = [
        'dist/index.js',
        'lib/index.js',
        'index.js',
      ];

      for (const location of fallbackLocations) {
        try {
          const fallbackUrl = \`\${packagePath}/\${location}\`;
          
          if (this.options.debugMode) {
            console.log(\`    🔍 Checking fallback: \${fallbackUrl}\`);
          }

          const fallbackResponse = await fetch(fallbackUrl, {
            method: 'HEAD',
            timeout: this.options.timeout,
          }).catch(() => null);

          if (fallbackResponse && fallbackResponse.ok) {
            files.push(location);
            console.log(\`    ✅ Fallback found: \${location}\`);
            return files;
          }
        } catch (err) {
          // Continue to next fallback
        }
      }

      console.log(\`    ❌ No entry point found for \${packageJson.name}\`);
      return files;

    } catch (error) {
      console.error(\`    ❌ Error in _findJsFiles: \${error.message}\`);
      return files;
    }
  }
  // ✅ FIXED: Better error handling
  async _fetchSourceMap(url) {
    if (this.sourceMapCache.has(url)) {
      return this.sourceMapCache.get(url);
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: this.options.timeout,
      }).catch(() => null);

      // Handle null response (network error, timeout)
      if (!response) {
        if (this.options.debugMode) {
          console.log(\`  [network error] \${url}\`);
        }
        return null;
      }

      // Handle non-200 responses
      if (!response.ok) {
        if (this.options.debugMode && response.status !== 404) {
          console.log(\`  [\${response.status}] \${url}\`);
        }
        return null;
      }

      const mapData = await response.json();

      // Validate source map format
      if (mapData && (mapData.version === 3 || mapData.names)) {
        this.sourceMapCache.set(url, mapData);
        return mapData;
      }

      return null;
    } catch (error) {
      if (this.options.debugMode) {
        console.warn(\`Failed to fetch \${url}: \${error.message}\`);
      }
      return null;
    }
  }

  async _mergeNameMaps() {
    let totalNames = 0;

    for (const [packageName, packageInfo] of this.packages) {
      for (const [minified, original] of packageInfo.nameMap) {
        if (!this.globalNameMap.has(minified)) {
          this.globalNameMap.set(minified, original);
          totalNames++;
        }
      }

      for (const [filePath, mapData] of packageInfo.files) {
        if (mapData.names) {
          mapData.names.forEach((name) => {
            this.filePathMap.set(filePath, {
              package: packageName,
              name: name,
            });
          });
        }
      }
    }

    this._addCommonPatterns();
    this.stats.totalNames = this.globalNameMap.size;

    if (this.options.debugMode) {
      console.log(\`   Total unique names: \${this.stats.totalNames}\`);
    }
  }

  _addCommonPatterns() {
    const commonPatterns = {
      v: 'StatelessElement',
      o: 'Element',
      A: 'Widget',
      r: 'runtime',
      s: 'state',
      e: 'element',
      t: 'target',
      i: 'index',
      n: 'name',
      h: 'handler',
      w: 'widget',
      a: 'analyzer',
      b: 'builder',
      c: 'context',
      d: 'data',
      f: 'function',
      g: 'get',
      j: 'json',
      k: 'key',
      l: 'list',
      m: 'map',
      p: 'parent',
      q: 'query',
      u: 'update',
      x: 'x',
      y: 'y',
      z: 'zone',
      build: 'build',
      render: 'render',
      create: 'create',
      update: 'update',
      mount: 'mount',
      dispose: 'dispose',
    };

    for (const [minified, original] of Object.entries(commonPatterns)) {
      if (!this.globalNameMap.has(minified)) {
        this.globalNameMap.set(minified, original);
      }
    }
  }

  decode(minifiedName) {
    if (!minifiedName || typeof minifiedName !== 'string') {
      return minifiedName;
    }

    if (this.globalNameMap.has(minifiedName)) {
      return this.globalNameMap.get(minifiedName);
    }

    return minifiedName;
  }

  decodeMessage(message) {
    if (!this.isLoaded || !message || typeof message !== 'string') {
      return message;
    }

    let decoded = message;

    for (const [minified, original] of this.globalNameMap) {
      if (minified !== original && minified.length <= 3) {
        try {
          const regex = new RegExp(\`\\\\b\${minified}\\\\b\`, 'g');
          decoded = decoded.replace(regex, original);
        } catch (e) {
          // Skip invalid regex patterns
        }
      }
    }

    return decoded;
  }

  decodeError(error) {
    if (!error) return error;

    const decoded = { ...error };

    if (error.message) {
      decoded.message = this.decodeMessage(error.message);
    }

    if (error.stack) {
      decoded.stack = this.decodeMessage(error.stack);
    }

    return decoded;
  }

  intercept() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    const mapper = this;

    const decodeArgs = (args) => {
      return args.map((arg) => {
        if (typeof arg === 'string') {
          return mapper.decodeMessage(arg);
        }
        if (arg instanceof Error) {
          return mapper.decodeError(arg);
        }
        return arg;
      });
    };

    console.log = function (...args) {
      originalLog.apply(console, decodeArgs(args));
    };

    console.error = function (...args) {
      originalError.apply(console, decodeArgs(args));
    };

    console.warn = function (...args) {
      originalWarn.apply(console, decodeArgs(args));
    };

    console.info = function (...args) {
      originalInfo.apply(console, decodeArgs(args));
    };

    console.debug = function (...args) {
      originalDebug.apply(console, decodeArgs(args));
    };

    if (this.options.debugMode) {
      console.log('[SourceMapLoader] ✅ Console intercepted');
    }
  }

  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  _getLoadResult(startTime, count) {
    this.stats.loadTime = performance.now() - startTime;

    return {
      success: this.stats.sourceMapsLoaded > 0,
      loaded: count,
      stats: { ...this.stats },
    };
  }

  getStats() {
    return {
      ...this.stats,
      isReady: this.isLoaded,
      packages: this.packages.size,
      globalNames: this.globalNameMap.size,
    };
  }

  getPackages() {
    return Array.from(this.packages.keys());
  }

  getPackageDetails(packageName) {
    const pkg = this.packages.get(packageName);
    if (!pkg) return null;

    return {
      name: pkg.name,
      path: pkg.path,
      mapsLoaded: pkg.mapsLoaded,
      filesLoaded: pkg.files.size,
      names: pkg.nameMap.size,
      errors: pkg.errors,
    };
  }

  getNameMappings() {
    return Array.from(this.globalNameMap.entries()).map(([minified, original]) => ({
      minified,
      original,
    }));
  }
}

let globalSourceMapLoader = null;

async function initializeSourceMaps(options = {}) {
  if (globalSourceMapLoader) {
    return globalSourceMapLoader;
  }

  const loader = new PackageSourceMapManager({
    baseNodeModules: options.baseNodeModules || '/node_modules/@flutterjs',
    debugMode: options.debugMode || false,
    autoDiscover: options.autoDiscover !== false,
    intercept: options.intercept !== false,
    ...options,
  });

  await loader.load();

  if (options.intercept !== false) {
    loader.intercept();
  }

  globalSourceMapLoader = loader;
  return loader;
}

function getSourceMapLoader() {
  return globalSourceMapLoader;
}

export {
  PackageSourceMapManager,
  initializeSourceMaps,
  getSourceMapLoader,
};
export default PackageSourceMapManager;`;
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
  /**
     * Generate app.js bootstrap code
     * Entry point for the application
     * ✅ IMPROVED: Actually calls main() instead of trying to instantiate widgets directly
     */
  generateAppBootstrap() {
    // ✅ ROBUST: Scan transformed code for exports (files often use named export blocks like export { A, B })
    // This fixes issues where 'export class' is not used, preventing metadata from finding widgets
    const transformedCode = this.integration.transformed?.transformedCode || "";
    const exportedSet = new Set();

    // 1. Scan for inline exports: "export class Name" or "export const Name"
    const inlineRegex = /export\s+(?:class|const|function)\s+([a-zA-Z0-9_$]+)/g;
    let match;
    while ((match = inlineRegex.exec(transformedCode)) !== null) {
      exportedSet.add(match[1]);
    }

    // 2. Scan for named export blocks: "export { A, B, C }"
    const blockRegex = /export\s*\{([^}]+)\}/g;
    while ((match = blockRegex.exec(transformedCode)) !== null) {
      match[1].split(',').forEach(part => {
        const cleaned = part.trim();
        if (!cleaned) return;
        const parts = cleaned.split(/\s+as\s+/);
        exportedSet.add(parts[parts.length - 1].trim());
      });
    }

    const stateless = this.integration.analysis?.widgets?.stateless || [];
    const stateful = this.integration.analysis?.widgets?.stateful || [];
    const candidates = [...stateless, ...stateful];

    // Filter analysis candidates against actual exports
    let validWidgets = candidates;
    if (exportedSet.size > 0) {
      validWidgets = candidates.filter(w => exportedSet.has(w));
    }

    const allWidgets = [...new Set(validWidgets.filter(Boolean))];
    const projectName = this.integration.analysis?.metadata?.projectName || "FlutterJS App";

    // Filter 'main' from widget list to avoid duplicate import if it's there
    const widgetsToImport = allWidgets.filter(w => w !== 'main');

    const widgetImports = widgetsToImport.length > 0
      ? `import { ${widgetsToImport.join(", ")}, main } from './main.js';`
      : `import { main } from './main.js';`;

    return `/**
 * FlutterJS Application Bootstrap
 * Generated at: ${new Date().toISOString()}
 * Project: ${projectName}
 * 
 * This file:
 * 1. Imports user-defined widgets and main entry point from main.fjs
 * 2. Imports runtime from @flutterjs/runtime package
 * 3. Initializes and runs the app using main() as entry point
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


import { initializeSourceMaps } from './source_mapper.js';
import { enableWidgetTracking } from './widget_tracker.js';

console.log('🚀 FlutterJS App Bootstrapping...\\n');



// ============================================================================
// BUILD-TIME METADATA
// ============================================================================

const analysisMetadata = ${JSON.stringify(
      this.integration.analysis?.metadata || {},
      null,
      2
    )};

const widgetExports = {
  main,
  ${allWidgets.map((w) => `${w}`).join(",\n  ")}
};

const BUILD_MODE = '${this.config.mode}';  // 'development' or 'production'

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

async function bootApp() {
  console.log('🚀 FlutterJS App Bootstrapping...');
  console.log('Project:', '${projectName}');
  
  try {
    // Initialize source maps for ALL packages
    await initializeSourceMaps({
      baseNodeModules: '/node_modules/@flutterjs',
      debugMode: BUILD_MODE !== 'production',
      autoDiscover: true,
      intercept: true,
    });

    enableWidgetTracking();
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Fatal: Root element #root not found in DOM');
    }

    // ✅ Create runtime instance with build-time configuration
    if (${this.config.debugMode}) {
      console.log('📋 Creating runtime with config:', {
        debugMode: ${this.config.debugMode},
        enableHotReload: ${this.config.mode === "development"},
        mode: 'csr',
        target: '${this.config.target}'
      });
    }

    const runtime = new FlutterJSRuntime({
      debugMode: ${this.config.debugMode},
      enableHotReload: ${this.config.mode === "development"},
      enableStateTracking: true,
      enablePerformanceTracking: true,
      mode: '${this.config.target === 'ssr' ? 'ssr' : 'csr'}',
      target: '${this.config.target}'
    });

    // ✅ Initialize runtime (creates VNodeBuilder, VNodeRenderer, etc.)
    runtime.initialize({ rootElement });
    if (${this.config.debugMode}) {
      console.log('✓ Runtime initialized');
    }

    // ✅ Call main() to get the root widget instance
    if (${this.config.debugMode}) {
      console.log('🔧 Calling main() entry point...');
    }

    let rootWidgetInstance;
    try {
      rootWidgetInstance = main();
    } catch (e) {
      throw new Error('Failed to call main(): ' + e.message);
    }

    if (!rootWidgetInstance) {
      throw new Error('main() returned null or undefined - check main.js exports');
    }

    if (typeof rootWidgetInstance.build !== 'function') {
      throw new Error('Invalid widget: main() did not return a valid Widget instance (missing build method)');
    }

    if (${this.config.debugMode}) {
      console.log('✓ Root widget obtained:', rootWidgetInstance.constructor.name);
    }

    // ✅ Run the app with the root widget instance
    runtime.runApp(rootWidgetInstance, {
      buildContext: {},
      appBuilder: null
    });

    // ✅ Force a reflow to ensure all styles are properly computed
    // This fixes an issue where the UI doesn't render correctly at full viewport width
    requestAnimationFrame(() => {
      document.body.offsetHeight; // Trigger reflow
    });

    if (${this.config.debugMode}) {
      console.log('✓ App running on DOM');
    }

    // ✅ Log runtime statistics
    const stats = runtime.getStats?.();
    if (stats) {
      console.log('📊 Runtime Statistics:');
      console.log('   Environment:', stats.environment);
      console.log('   Mount Time:', stats.mountTime?.toFixed(2) + 'ms');
      console.log('   Render Time:', stats.renderTime?.toFixed(2) + 'ms');
      console.log('   VNode Size:', stats.vnodeSize + ' bytes');
    }
    
    // ✅ Store for debugging and external access
    window.__flutterjs_runtime__ = runtime;
    window.__flutterjs_widgets__ = widgetExports;
    window.__flutterjs_metadata__ = analysisMetadata;

    if (${this.config.debugMode}) {
      console.log('✓ Global references stored:');
      console.log('   window.__flutterjs_runtime__');
      console.log('   window.__flutterjs_widgets__');
      console.log('   window.__flutterjs_metadata__');
    }
    
    // ✅ Setup hot reload in development mode
      if (BUILD_MODE === 'development') {
      setupHotReload(runtime, BUILD_MODE);
    }


    console.log('✅ App initialized successfully!\\n');

 } catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error('❌ App initialization failed:', errorMsg);
  if (${this.config.debugMode}) {
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  }
  window.__widgetTracker?.printReport();
  showErrorOverlay(errorMsg);
  throw error;
}
}

// ============================================================================
// HOT RELOAD (Development Mode)
// ============================================================================

function setupHotReload(runtime,mode) {
  if (mode !== 'development') return;

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
        console.error('❌ Hot reload failed:', error.message);
      }
    });
  }
}

// ============================================================================
// ERROR OVERLAY (Development Mode)
// ============================================================================

function showErrorOverlay(message) {
  if (typeof document === 'undefined') return;

  try {
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
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
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
    \`;

    const titleEl = document.createElement('h2');
    titleEl.style.cssText = 'margin: 0 0 15px 0; color: #d32f2f; font-size: 18px;';
    titleEl.textContent = '❌ Application Error';

    const msgEl = document.createElement('pre');
    msgEl.style.cssText = \`
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin: 0;
      color: #c62828;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-wrap: break-word;
    \`;
    msgEl.textContent = message;

    const noteEl = document.createElement('p');
    noteEl.style.cssText = 'color: #666; margin-top: 20px; font-size: 12px; margin-bottom: 0;';
    noteEl.textContent = '💡 Check the browser console for more details.';

    errorBox.appendChild(titleEl);
    errorBox.appendChild(msgEl);
    errorBox.appendChild(noteEl);

    overlay.appendChild(errorBox);
    document.body.appendChild(overlay);
  } catch (e) {
    // Silently fail if overlay creation fails
    console.error('Failed to show error overlay:', e);
  }
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
  /**
   * Generate SSR Runner Script
   */
  generateSSRRunner() {
    return `import { main } from './main.js';
import { FlutterJSRuntime } from '@flutterjs/runtime';
import { SSRRenderer } from '@flutterjs/vdom/ssr_renderer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSSR() {
  console.log('🚀 Starting Server-Side Rendering...');
  
  try {
    // Initialize SSR Runtime
    const runtime = new FlutterJSRuntime({
      debugMode: false,
      mode: 'ssr',
      target: 'ssr'
    });
    
    // Get Root Widget
    const app = main();
    
    // Render to String
    const bodyHtml = runtime.renderToString(app);
    
    // Inject into index.html
    const indexPath = path.join(__dirname, 'index.html');
    let template = fs.readFileSync(indexPath, 'utf-8');
    
    // Inject content and hydration marker
    const rootRegex = /<div id="root">[\s\S]*?<\/div>/;
    const replacement = \`<div id="root" data-hydrated="true">\${bodyHtml}</div>\`;
    
    if (rootRegex.test(template)) {
       template = template.replace(rootRegex, replacement);
       fs.writeFileSync(indexPath, template);
       console.log('✅ SSR Complete: index.html updated');
    } else {
       console.error('❌ SSR Failed: #root element not found in index.html');
       process.exit(1);
    }
    
  } catch (err) {
    console.error('❌ SSR Failed:', err);
    process.exit(1);
  }
}

runSSR();`;
  }

  /**
   * Execute the SSR Runner
   */
  async executeSSR(scriptPath) {
    console.log(chalk.blue('⚡ Executing SSR Pre-rendering...'));
    try {
      const cwd = path.dirname(scriptPath);
      const fileName = path.basename(scriptPath);

      execSync(`node ${fileName}`, {
        cwd: cwd,
        stdio: 'inherit'
      });

    } catch (e) {
      throw new Error(`SSR Execution failed: ${e.message}`);
    }
  }
}

export { BuildGenerator };
export default BuildGenerator;