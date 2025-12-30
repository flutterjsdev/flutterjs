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

      const errorMap = path.join(outputDir, "error_remapper.js");
      const errorFile = this.errorMapBuilder();
      await fs.promises.writeFile(
        errorMap,
        errorFile,
        "utf-8"
      );

      files.push({
        name: "error_remapper.js",
        size: errorFile.length
      })

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
  <script src="./error_remapper.js"></script>
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


  errorMapBuilder() {
    return `(function() {
  'use strict';

  // Cache for loaded source maps
  const sourceMapCache = new Map();
  const loadedFiles = [];

  /**
   * Load all available source maps
   */
  async function loadSourceMaps() {
    try {
      console.log('[ErrorRemapper] Fetching source map list from /api/sourcemaps...');
      
      const response = await fetch('/api/sourcemaps');
      const data = await response.json();

      console.log('[ErrorRemapper] API Response:', data);

      if (!data.available || !data.maps || data.maps.length === 0) {
        console.warn('[ErrorRemapper] ❌ No source maps available from API');
        console.warn('[ErrorRemapper] Response:', data);
        return;
      }

      console.log(\`[ErrorRemapper] Found \${data.maps.length} source maps to load\`);

      // Load each source map
      for (const mapInfo of data.maps) {
        try {
          console.log(\`[ErrorRemapper] Loading: \${mapInfo.mapUrl}\`);
          
          const mapResponse = await fetch(mapInfo.mapUrl);
          if (!mapResponse.ok) {
            console.warn(\`[ErrorRemapper] ❌ Failed to fetch \${mapInfo.mapUrl}: \${mapResponse.status}\`);
            continue;
          }

          const sourceMap = await mapResponse.json();
          
          if (!sourceMap.mappings) {
            console.warn(\`[ErrorRemapper] ❌ Invalid source map (no mappings): \${mapInfo.mapUrl}\`);
            continue;
          }

          // Try multiple storage keys for this map
          const baseFile = mapInfo.file || mapInfo.mapUrl.split('/').pop().replace('.map', '');
          const jsFile = baseFile.replace(/\.fjs$/, '.js');
          const withoutExt = baseFile.replace(/\.\w+$/, '');

          // Store under all variations
          sourceMapCache.set(baseFile, sourceMap);
          sourceMapCache.set(jsFile, sourceMap);
          sourceMapCache.set(withoutExt, sourceMap);
          
          loadedFiles.push({
            file: mapInfo.file,
            keys: [baseFile, jsFile, withoutExt],
            sources: sourceMap.sources,
            mappings: sourceMap.mappings.substring(0, 50) + '...'
          });
          
          console.log(\`[ErrorRemapper] ✓ Loaded: \${baseFile} (stored under \${[baseFile, jsFile, withoutExt].join(', ')})\`);
          console.log(\`[ErrorRemapper]   Sources: \${sourceMap.sources.join(', ')}\`);

        } catch (err) {
          console.warn(\`[ErrorRemapper] ❌ Failed to load \${mapInfo.mapUrl}:\`, err.message);
        }
      }

      console.log(\`[ErrorRemapper] ✓ Successfully loaded \${sourceMapCache.size} source map entries\`);
      console.log('[ErrorRemapper] Cache keys:', Array.from(sourceMapCache.keys()));

    } catch (error) {
      console.error('[ErrorRemapper] ❌ Failed to load source maps:', error.message);
    }
  }

  /**
   * Simple VLQ decoder for source maps
   */
  function decodeVLQ(str) {
    const result = [];
    let index = 0;

    while (index < str.length) {
      let vlq = 0;
      let shift = 0;
      let continuation;

      do {
        const char = str[index++];
        const digit = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(char);
        
        if (digit === -1) {
          console.warn(\`[ErrorRemapper] Invalid VLQ character: \${char}\`);
          return result;
        }

        continuation = digit & 32;
        vlq += (digit & 31) << shift;
        shift += 5;
      } while (continuation);

      result.push(vlq & 1 ? -(vlq >> 1) : vlq >> 1);
    }

    return result;
  }

  /**
   * Find original source position using source map
   */
  function findOriginalPosition(sourceMap, generatedLine, generatedColumn) {
    if (!sourceMap || !sourceMap.mappings) {
      return null;
    }

    try {
      const mappings = sourceMap.mappings.split(';');
      
      // Get line (0-indexed)
      if (generatedLine - 1 >= mappings.length) {
        return null;
      }

      const lineMapping = mappings[generatedLine - 1];
      if (!lineMapping || lineMapping.length === 0) {
        return null;
      }

      // Decode VLQ
      const decoded = decodeVLQ(lineMapping);
      
      let genCol = 0;
      let srcIndex = 0;
      let srcLine = 0;
      let srcCol = 0;
      let nameIndex = 0;
      let bestMatch = null;

      // Process segments (each segment is 1, 4, or 5 values)
      for (let i = 0; i < decoded.length; i += 5) {
        // Generated column (always present)
        genCol += decoded[i] || 0;

        // Source index, line, column, name index (may not all be present)
        if (i + 1 < decoded.length) {
          srcIndex += decoded[i + 1] || 0;
        }
        if (i + 2 < decoded.length) {
          srcLine += decoded[i + 2] || 0;
        }
        if (i + 3 < decoded.length) {
          srcCol += decoded[i + 3] || 0;
        }
        if (i + 4 < decoded.length) {
          nameIndex += decoded[i + 4] || 0;
        }

        // Store if we have valid source info and haven't passed the column yet
        if (genCol <= generatedColumn && srcIndex < sourceMap.sources.length) {
          bestMatch = {
            source: sourceMap.sources[srcIndex],
            line: srcLine + 1,
            column: srcCol,
            name: sourceMap.names && nameIndex < sourceMap.names.length ? sourceMap.names[nameIndex] : null
          };
        }

        // Stop if we've passed the column and have a match
        if (genCol > generatedColumn && bestMatch) {
          break;
        }
      }

      return bestMatch;

    } catch (err) {
      console.warn(\`[ErrorRemapper] Error finding original position:\`, err.message);
      return null;
    }
  }

  /**
   * Parse a stack trace line to extract file, line, column
   */
  function parseStackLine(line) {
    const patterns = [
      /at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/,  // at func (file:line:col)
      /at\s+(.+?):(\d+):(\d+)/,              // at file:line:col
      /@(.+?):(\d+):(\d+)/,                   // @file:line:col (Firefox)
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        if (match.length === 5) {
          return {
            functionName: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4]),
            original: line
          };
        } else if (match.length === 4) {
          return {
            functionName: null,
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            original: line
          };
        }
      }
    }

    return null;
  }

  /**
   * Remap a single stack line using source maps
   */
  function remapStackLine(line) {
    const parsed = parseStackLine(line);
    if (!parsed) {
      return line;
    }

    // Extract just the filename from the full path
    const fullPath = parsed.file;
    const fileName = fullPath.split('/').pop();
    const fileWithoutExt = fileName.replace(/\.\w+$/, '');

    // Try different file name variations
    const fileVariations = [
      fileName,           // element.js
      fileWithoutExt,     // element
      fullPath,           // full/path/element.js
    ];

    let sourceMap = null;
    let mapKey = null;

    for (const variation of fileVariations) {
      sourceMap = sourceMapCache.get(variation);
      if (sourceMap) {
        mapKey = variation;
        break;
      }
    }

    if (!sourceMap) {
      // Uncomment for debugging: console.log(\`[ErrorRemapper] No map for: \${fileName} (tried: \${fileVariations.join(', ')})\`);
      return line;
    }

    const original = findOriginalPosition(sourceMap, parsed.line, parsed.column);
    if (!original || !original.source) {
      return line;
    }

    // Reconstruct the stack line with original source
    const sourcePath = original.source.replace(/\\\\/g, '/');
    const displayName = original.name || parsed.functionName || '';
    
    if (displayName) {
      return \`    at \${displayName} (\${sourcePath}:\${original.line}:\${original.column})\`;
    } else {
      return \`    at \${sourcePath}:\${original.line}:\${original.column}\`;
    }
  }

  /**
   * Remap entire error stack
   */
  function remapErrorStack(error) {
    if (!error || !error.stack) {
      return error;
    }

    const lines = error.stack.split('\\n');
    const remappedLines = lines.map((line, index) => {
      if (index === 0) {
        return line;
      }
      return remapStackLine(line);
    });

    error.stack = remappedLines.join('\\n');
    return error;
  }

  /**
   * Override console.error to remap stacks
   */
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const remappedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return remapErrorStack(arg);
      }
      return arg;
    });

    originalConsoleError.apply(console, remappedArgs);
  };

  /**
   * Override window.onerror to remap uncaught errors
   */
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (error instanceof Error) {
      remapErrorStack(error);
      console.error('[UNCAUGHT ERROR]', error);
    }

    if (originalOnError) {
      return originalOnError.apply(window, arguments);
    }
    return false;
  };

  /**
   * Override unhandledrejection to remap promise errors
   */
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason instanceof Error) {
      remapErrorStack(event.reason);
      console.error('[UNHANDLED REJECTION]', event.reason);
    }
  });

  // Load source maps when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSourceMaps);
  } else {
    loadSourceMaps();
  }

  // Expose debug info
  window.__errorRemapperDebug = {
    cacheSize: () => sourceMapCache.size,
    cacheKeys: () => Array.from(sourceMapCache.keys()),
    loadedFiles: () => loadedFiles,
    testRemap: (line) => remapStackLine(line)
  };

  console.log('[ErrorRemapper] ✓ Initialized');
  console.log('[ErrorRemapper] Debug: window.__errorRemapperDebug');

})();`;
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
  /**
     * Generate app.js bootstrap code
     * Entry point for the application
     * ✅ IMPROVED: Actually calls main() instead of trying to instantiate widgets directly
     */
  generateAppBootstrap() {
    const stateless = this.integration.analysis?.widgets?.stateless || [];
    const stateful = this.integration.analysis?.widgets?.stateful || [];
    const allWidgets = [...stateless, ...stateful].filter(Boolean);
    const projectName = this.integration.analysis?.metadata?.projectName || "FlutterJS App";

    // ✅ Always import main, plus all discovered widgets
    const widgetImports = allWidgets.length > 0
      ? `import { ${allWidgets.join(", ")}, main } from './main.js';`
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
      mode: 'csr',
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
}

export { BuildGenerator };
export default BuildGenerator;