// build.js - Enhanced with Analyzer Integration (Dynamic Import for ESM)
const fs = require('fs');
const path = require('path');

function mkdirp(dir) {
  if (fs.existsSync(dir)) return;
  const parent = path.dirname(dir);
  if (!fs.existsSync(parent)) {
    mkdirp(parent);
  }
  fs.mkdirSync(dir);
}

function copyDir(src, dest) {
  mkdirp(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function minifyJS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,=()[\]])\s*/g, '$1')
    .trim();
}

function obfuscateJS(code) {
  const vars = new Map();
  let counter = 0;
  function getVarName() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let name = '';
    let n = counter++;
    do {
      name = chars[n % 26] + name;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return '_' + name;
  }
  const varPattern = /\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;
  while ((match = varPattern.exec(code)) !== null) {
    const originalName = match[2];
    if (!vars.has(originalName) && originalName.length > 2) {
      vars.set(originalName, getVarName());
    }
  }
  let obfuscated = code;
  vars.forEach((newName, oldName) => {
    const regex = new RegExp('\\b' + oldName + '\\b', 'g');
    obfuscated = obfuscated.replace(regex, newName);
  });
  return obfuscated;
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .trim();
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Calculate health score based on analysis metrics
 */
function calculateHealthScore(analysisReport) {
  let score = 100;
  
  // Deduct points for issues
  if (analysisReport.state?.validationIssues > 0) {
    score -= Math.min(analysisReport.state.validationIssues * 5, 30);
  }
  
  if (analysisReport.ssr?.unsafePatterns > 0) {
    score -= Math.min(analysisReport.ssr.unsafePatterns * 3, 20);
  }
  
  return Math.max(score, 0);
}



async function build(options, projectContext) {
  console.log('🚀 Building Flutter.js application...\n');

  const { config, paths, projectRoot } = projectContext;

  const mode = options.mode || config.render?.mode || 'dev';
  const output = options.output || config.build?.output || 'dist';
  const shouldMinify = options.minify !== false && (config.build?.production?.minify !== false);
  const shouldObfuscate = options.obfuscate !== false && (config.build?.production?.obfuscate !== false);

  try {
    // 1. Validate entry file
    console.log('📦 Loading entry file...');
    if (!fs.existsSync(paths.entryFile)) {
      throw new Error(`Entry file not found: ${paths.entryFile}`);
    }

    // 2. Load framework runtime
    console.log('⚙️ Loading flutter_js runtime...');
    let frameworkCode = `
// Flutter.js Runtime v1.0.0
window.FlutterJS = window.FlutterJS || {};
window.FlutterJS.mount = function(selector) {
  const root = document.querySelector(selector);
  if (root) {
    console.log('Flutter.js mounted at', selector);
  }
};
`;

    // 3. Load application code
    console.log('📄 Loading application code...');
    const appCode = fs.readFileSync(paths.entryFile, 'utf8');

    // 4. RUN ANALYZER ON SOURCE CODE (Phase 1 + 2 + 3)
    // FIXED: Import from correct path
    console.log('🔍 Analyzing source code...\n');
    let analysisResults = {
      widgets: { widgets: {}, summary: {} },
      state: { stateClasses: [], summary: {} },
      context: { inheritedWidgets: [], summary: {} },
      ssr: { summary: {} },
    };
    let analysisErrors = [];

    try {
      // FIXED: Correct import path - use file:// URL for dynamic import
   const analyzerIndexPath = path.resolve(
      __dirname,           // bin/ directory
      '../../src/analyzer/src/index.js'  // ✅ Go up, then into src/
    );
    const analyzerUrl = `file://${analyzerIndexPath}`;
    console.log("NewPath"+analyzerUrl);
      
      const { Analyzer } = await import(analyzerUrl);
      
      const analyzer = new Analyzer({
        sourceCode: appCode,
        
        outputFormat: 'json',
        verbose: false, // Don't spam console during build
        includeContext: true,  // Phase 3: Context analysis
        includeSsr: true,      // Phase 3: SSR analysis
      });

      const analysisReport = await analyzer.analyze();
      
      // Extract structured data from analysis
      analysisResults = {
        widgets: {
          widgets: analysisReport.widgets?.widgets || {},
          summary: {
            count: analysisReport.widgets?.count || 0,
            stateless: analysisReport.widgets?.stateless || 0,
            stateful: analysisReport.widgets?.stateful || 0,
            stateClasses: analysisReport.widgets?.stateClasses || 0,
            healthScore: calculateHealthScore(analysisReport),
          },
        },
        state: {
          stateClasses: analysisReport.state?.stateClasses || [],
          summary: {
            stateClasses: analysisReport.state?.stateClasses || 0,
            stateFields: analysisReport.state?.stateFields || 0,
            setStateCalls: analysisReport.state?.setStateCalls || 0,
            lifecycleMethods: analysisReport.state?.lifecycleMethods || 0,
            eventHandlers: analysisReport.state?.eventHandlers || 0,
          },
        },
        context: {
          inheritedWidgets: analysisReport.context?.inheritedWidgets || [],
          changeNotifiers: analysisReport.context?.changeNotifiers || [],
          providers: analysisReport.context?.providers || [],
          summary: {
            inheritedWidgets: analysisReport.context?.inheritedWidgets || 0,
            changeNotifiers: analysisReport.context?.changeNotifiers || 0,
            providers: analysisReport.context?.providers || 0,
          },
        },
        ssr: {
          summary: {
            score: analysisReport.ssr?.compatibilityScore || 0,
            compatibility: analysisReport.ssr?.compatibility || 'unknown',
            safePatterns: analysisReport.ssr?.safePatterns || 0,
            unsafePatterns: analysisReport.ssr?.unsafePatterns || 0,
            estimatedEffort: analysisReport.ssr?.estimatedEffort || 'unknown',
          },
        },
      };

      console.log('✅ Analysis complete\n');
    } catch (error) {
      console.error('⚠️  Analysis error:', error.message);
      analysisErrors.push({
        type: 'analysis_error',
        message: error.message,
        severity: 'warning',
      });
      
      if (options.verbose) {
        console.error(error.stack);
      }
    }

    // 5. Create render configuration
    console.log(`📋 Bundling in ${mode.toUpperCase()} mode...`);
    const renderConfig = {
      mode: mode,
      ssr: mode === 'ssr' || mode === 'hybrid',
      csr: mode === 'csr' || mode === 'hybrid',
      hydrate: mode === 'hybrid',
      projectRoot: projectRoot,
      entryPoint: config.entry?.main || 'src/main.fjs',
      buildTime: new Date().toISOString(),
    };

    // 6. Combine all code
    let finalCode = `
// Flutter.js Runtime
${frameworkCode}

// Render Configuration
window.__FLUTTER_JS_CONFIG__ = ${JSON.stringify(renderConfig, null, 2)};

// Application Code
${appCode}

// Initialize Application
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (window.FlutterJS) {
      FlutterJS.mount('#root');
    }
  });
}
`;

    // 7. Minify if enabled
    if (shouldMinify) {
      console.log('📉 Minifying...');
      finalCode = minifyJS(finalCode);
    }

    // 8. Obfuscate if enabled
    if (shouldObfuscate) {
      console.log('🔐 Obfuscating...');
      finalCode = obfuscateJS(finalCode);
    }

    // 9. Create output directory
    console.log('📁 Creating output directory...');
    const outputPath = path.resolve(projectRoot, output);
    mkdirp(outputPath);

    // 10. Write JavaScript
    const jsFileName = shouldMinify ? 'app.min.js' : 'app.js';
    const jsPath = path.join(outputPath, jsFileName);
    fs.writeFileSync(jsPath, finalCode);
    console.log(`   ✔ ${jsFileName}`);

    // 11. SAVE ANALYSIS DATA FOR DEV/DEBUG SERVERS
    const analysisPath = path.join(outputPath, '.analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify({
      analysisResults,
      analysisErrors,
      timestamp: new Date().toISOString(),
    }, null, 2));
    console.log('   ✔ .analysis.json (cached for servers)');

    // 12. Generate HTML
    console.log('📄 Generating HTML...');
    generateHTML(outputPath, jsFileName, renderConfig);

    // 13. Process CSS
    console.log('🎨 Processing CSS...');
    processCSS(outputPath, shouldMinify);

    // 14. Copy public assets
    const publicPath = path.join(projectRoot, 'public');
    if (fs.existsSync(publicPath)) {
      console.log('🎨 Copying public assets...');
      copyDir(publicPath, path.join(outputPath, 'assets'));
    }

    // 15. Copy assets folder
    const assetsPath = path.join(projectRoot, 'assets');
    if (fs.existsSync(assetsPath)) {
      console.log('🖼️ Copying assets...');
      copyDir(assetsPath, path.join(outputPath, 'assets'));
    }

    // 16. Generate stats
    const stats = generateStats(outputPath, finalCode);

    console.log('\n✅ Build complete!\n');
    console.log(`📊 Build Stats:`);
    console.log(`   Mode: ${renderConfig.mode.toUpperCase()}`);
    console.log(`   SSR: ${renderConfig.ssr ? 'Enabled' : 'Disabled'}`);
    console.log(`   CSR: ${renderConfig.csr ? 'Enabled' : 'Disabled'}`);
    console.log(`   Output: ${output}/`);
    console.log(`   JavaScript: ${stats.jsSize}`);
    console.log(`   CSS: ${stats.cssSize}`);
    console.log(`   Total: ${stats.totalSize}`);
    console.log(`   Gzipped: ~${stats.gzippedSize}\n`);

    // 17. Display analysis summary (Phase 1, 2, 3)
    if (analysisResults) {
      console.log(`📈 Analysis Summary (Phase 1, 2, 3):`);
      console.log(`   Phase 1 - Widgets: ${analysisResults.widgets?.summary?.count || 0} (Health: ${analysisResults.widgets?.summary?.healthScore || 0}/100)`);
      console.log(`   Phase 2 - State: ${analysisResults.state?.summary?.stateClasses || 0} classes`);
      console.log(`   Phase 3 - Context: ${analysisResults.context?.summary?.inheritedWidgets || 0} inherited widgets`);
      console.log(`   Phase 3 - SSR: ${analysisResults.ssr?.summary?.score || 0}/100 (${analysisResults.ssr?.summary?.compatibility || 'unknown'})`);
      console.log();
    }

    if (analysisErrors.length > 0) {
      console.log(`⚠️  Analysis Issues:`);
      analysisErrors.forEach(err => {
        console.log(`   • ${err.message}`);
      });
      console.log();
    }

    return {
      success: true,
      outputPath,
      analysisResults,
      analysisErrors,
    };

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function generateHTML(outputDir, jsFileName, renderConfig) {
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Flutter.js Application">
  <title>Flutter.js App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root">${renderConfig.ssr ? '<!-- SSR content will be injected here -->' : ''}</div>
  <script src="${jsFileName}"></script>
</body>
</html>`;

  fs.writeFileSync(
    path.join(outputDir, 'index.html'),
    htmlTemplate
  );
}

function processCSS(outputDir, shouldMinify) {
  let css = `
/* Flutter.js Framework Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.5;
  color: #333;
}

#root {
  width: 100%;
  min-height: 100vh;
}
`;

  if (shouldMinify) {
    css = minifyCSS(css);
  }

  fs.writeFileSync(
    path.join(outputDir, 'styles.css'),
    css
  );
}

function generateStats(outputDir, jsCode) {
  const jsSize = formatBytes(Buffer.byteLength(jsCode, 'utf8'));
  const cssPath = path.join(outputDir, 'styles.css');
  const cssSize = fs.existsSync(cssPath)
    ? formatBytes(fs.statSync(cssPath).size)
    : '0 KB';
  const totalBytes = Buffer.byteLength(jsCode, 'utf8') +
    (fs.existsSync(cssPath) ? fs.statSync(cssPath).size : 0);
  const gzippedSize = formatBytes(Math.floor(totalBytes * 0.3));

  return { jsSize, cssSize, totalSize: formatBytes(totalBytes), gzippedSize };
}

module.exports = { build };