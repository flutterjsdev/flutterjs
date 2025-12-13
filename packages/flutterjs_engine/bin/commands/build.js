const fs = require('fs');
const path = require('path');

// Simple mkdir -p implementation
function mkdirp(dir) {
  if (fs.existsSync(dir)) return;
  const parent = path.dirname(dir);
  if (!fs.existsSync(parent)) {
    mkdirp(parent);
  }
  fs.mkdirSync(dir);
}

// Simple copy directory
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

// Simple minifier
function minifyJS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\/\/.*/g, '') // Remove single-line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{};,=()[\]])\s*/g, '$1') // Remove space around operators
    .trim();
}

// Simple obfuscator
function obfuscateJS(code) {
  const vars = new Map();
  let counter = 0;

  // Generate short variable names
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

  // Find variable declarations
  const varPattern = /\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;

  while ((match = varPattern.exec(code)) !== null) {
    const originalName = match[2];
    if (!vars.has(originalName) && originalName.length > 2) {
      vars.set(originalName, getVarName());
    }
  }

  // Replace variables
  let obfuscated = code;
  vars.forEach((newName, oldName) => {
    const regex = new RegExp('\\b' + oldName + '\\b', 'g');
    obfuscated = obfuscated.replace(regex, newName);
  });

  return obfuscated;
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around punctuation
    .trim();
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function build(options, projectContext) {
  console.log('🚀 Building Flutter.js application...\n');

  const { config, paths, projectRoot } = projectContext;

  // Merge CLI options with config
  const mode = options.mode || config.render?.mode || 'dev';
  const output = options.output || config.build?.output || 'dist';
  const shouldMinify = options.minify !== false && (config.build?.production?.minify !== false);
  const shouldObfuscate = options.obfuscate !== false && (config.build?.production?.obfuscate !== false);

  try {
    // 1. Check if entry file exists
    console.log('📦 Loading entry file...');

    if (!fs.existsSync(paths.entryFile)) {
      throw new Error(`Entry file not found: ${paths.entryFile}`);
    }

    // 2. Load framework runtime (simulated)
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
    console.log('📖 Loading application code...');
    const appCode = fs.readFileSync(paths.entryFile, 'utf8');

    // 4. Create render configuration
    console.log(`📋 Bundling in ${mode.toUpperCase()} mode...`);
    const renderConfig = {
      mode: mode,
      ssr: mode === 'ssr' || mode === 'hybrid',
      csr: mode === 'csr' || mode === 'hybrid',
      hydrate: mode === 'hybrid',
      projectRoot: projectRoot,
      entryPoint: config.entry?.main || 'src/main.fjs',
    };

    // 5. Combine all code
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

    // 6. Minify if enabled
    if (shouldMinify) {
      console.log('📉 Minifying...');
      finalCode = minifyJS(finalCode);
    }

    // 7. Obfuscate if enabled
    if (shouldObfuscate) {
      console.log('🔒 Obfuscating...');
      finalCode = obfuscateJS(finalCode);
    }

    // 8. Create output directory
    console.log('📁 Creating output directory...');
    const outputPath = path.resolve(projectRoot, output);
    mkdirp(outputPath);

    // 9. Write JavaScript
    const jsFileName = shouldMinify ? 'app.min.js' : 'app.js';
    const jsPath = path.join(outputPath, jsFileName);
    fs.writeFileSync(jsPath, finalCode);
    console.log(`   ✓ ${jsFileName}`);

    // 10. Generate HTML
    console.log('📄 Generating HTML...');
    generateHTML(outputPath, jsFileName, renderConfig);

    // 11. Process CSS
    console.log('🎨 Processing CSS...');
    processCSS(outputPath, shouldMinify);

    // 12. Copy public assets if they exist
    const publicPath = path.join(projectRoot, 'public');
    if (fs.existsSync(publicPath)) {
      console.log('🎨 Copying public assets...');
      copyDir(publicPath, path.join(outputPath, 'assets'));
    }

    // 13. Copy assets folder
    const assetsPath = path.join(projectRoot, 'assets');
    if (fs.existsSync(assetsPath)) {
      console.log('🖼️ Copying assets...');
      copyDir(assetsPath, path.join(outputPath, 'assets'));
    }

    // 14. Generate stats
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

  return {
    jsSize,
    cssSize,
    totalSize: formatBytes(totalBytes),
    gzippedSize,
  };
}

module.exports = { build };