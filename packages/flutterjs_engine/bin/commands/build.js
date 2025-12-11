const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../../src/utils/config');

// Simple mkdir -p implementation
function mkdirp(dir) {
  if (fs.existsSync(dir)) return;
  const parent = path.dirname(dir);
  if (!fs.existsSync(parent)) {
    mkdirp(parent);
  }
  fs.mkdirSync(dir);
}


async function transpileFJS(options) {
  const { processFJSFiles } = require('../src/filepropert/fjs');
  const srcPath = path.join(process.cwd(), 'src');
  const fjsPath = path.join(process.cwd(), '.flutter_js');
  
  console.log('🔄 Transpiling .fjs files...');
  processFJSFiles(srcPath, fjsPath);
  console.log('✅ .fjs transpilation complete\n');
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

async function build(options) {
  console.log('🚀 Building Flutter.js application...\n');
  
  // Load config file
  const config = loadConfig();
  
  // Merge CLI options with config
  const mode = options.mode || config.mode || 'prod';
  const output = options.output || config.build?.output || 'dist';
  const shouldMinify = options.minify !== false && (config.build?.minify !== false);
  const shouldObfuscate = options.obfuscate !== false && (config.build?.obfuscate !== false);
  
  try {
    // 1. Find generated code from transpiler
    console.log('📦 Loading generated code...');
    const generatedCodePath = path.join(process.cwd(), '.flutter_js', 'app.generated.js');
    
    if (!fs.existsSync(generatedCodePath)) {
      throw new Error(
        'app.generated.js not found!\n' +
        '   Run the Flutter.js transpiler first:\n' +
        '   flutter_js_compiler transpile src/'
      );
    }
    
    const generatedCode = fs.readFileSync(generatedCodePath, 'utf8');
    
    // 2. Load flutter_js runtime
    console.log('⚙️  Loading flutter_js runtime...');
    const frameworkPath = path.join(__dirname, '..', 'dist', 'flutter_js.runtime.js');
    
    if (!fs.existsSync(frameworkPath)) {
      throw new Error('flutter_js.runtime.js not found in dist/');
    }
    
    const frameworkCode = fs.readFileSync(frameworkPath, 'utf8');
    
    // 3. Create render configuration based on mode
    console.log(`🔗 Bundling in ${mode.toUpperCase()} mode...`);
    const renderConfig = {
      mode: mode,
      ssr: mode === 'ssr' || mode === 'hybrid',
      csr: mode === 'csr' || mode === 'hybrid',
      hydrate: mode === 'hybrid',
    };
    
    // 4. Combine framework + config + generated code
    let finalCode = `
// Flutter.js Runtime
${frameworkCode}

// Render Configuration
window.__FLUTTER_JS_CONFIG__ = ${JSON.stringify(renderConfig, null, 2)};

// Generated Application Code
${generatedCode}

// Initialize Application
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (window.FlutterJS) {
      FlutterJS.mount('#root');
    }
  });
}
`;
    
    // 5. Minify if enabled
    if (shouldMinify) {
      console.log('📉 Minifying...');
      finalCode = minifyJS(finalCode);
    }
    
    // 6. Obfuscate if enabled
    if (shouldObfuscate) {
      console.log('🔒 Obfuscating...');
      finalCode = obfuscateJS(finalCode);
    }
    
    // 7. Create output directory
    console.log('📁 Creating output directory...');
    mkdirp(output);
    
    // 8. Write JavaScript
    const jsFileName = shouldMinify ? 'app.min.js' : 'app.js';
    fs.writeFileSync(
      path.join(output, jsFileName),
      finalCode
    );
    
    // 9. Generate HTML
    console.log('📄 Generating HTML...');
    generateHTML(output, jsFileName, renderConfig);
    
    // 10. Process CSS
    console.log('🎨 Processing CSS...');
    processCSS(output, shouldMinify);
    
    // 11. Copy assets if they exist
    const assetsPath = path.join(process.cwd(), 'assets');
    if (fs.existsSync(assetsPath)) {
      console.log('📸 Copying assets...');
      copyDir(assetsPath, path.join(output, 'assets'));
    }
    
    // 12. Generate stats
    const stats = generateStats(output, finalCode);
    
    console.log('\n✅ Build complete!\n');
    console.log(`📊 Build Stats:`);
    console.log(`   Mode: ${renderConfig.mode.toUpperCase()}`);
    console.log(`   SSR: ${renderConfig.ssr ? 'Enabled' : 'Disabled'}`);
    console.log(`   CSR: ${renderConfig.csr ? 'Enabled' : 'Disabled'}`);
    console.log(`   Output: ${output}/`);
    console.log(`   JavaScript: ${stats.jsSize}`);
    console.log(`   CSS: ${stats.cssSize}`);
    console.log(`   Total: ${stats.totalSize}`);
    console.log(`   Gzipped: ~${stats.gzippedSize}`);
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
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
  // Load flutter_js framework CSS
  const frameworkCSSPath = path.join(__dirname, '..', 'dist', 'flutter_js.css');
  const frameworkCSS = fs.existsSync(frameworkCSSPath) 
    ? fs.readFileSync(frameworkCSSPath, 'utf8')
    : '';
  
  // Load generated CSS if exists
  let generatedCSS = '';
  const genCSSPath = path.join(process.cwd(), '.flutter_js', 'app.generated.css');
  if (fs.existsSync(genCSSPath)) {
    generatedCSS = fs.readFileSync(genCSSPath, 'utf8');
  }
  
  let finalCSS = `${frameworkCSS}\n\n${generatedCSS}`;
  
  // Minify CSS if enabled
  if (shouldMinify) {
    finalCSS = minifyCSS(finalCSS);
  }
  
  fs.writeFileSync(
    path.join(outputDir, 'styles.css'),
    finalCSS
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
  
  // Estimate gzipped size
  const gzippedSize = formatBytes(Math.floor(totalBytes * 0.3));
  
  return {
    jsSize,
    cssSize,
    totalSize: formatBytes(totalBytes),
    gzippedSize,
  };
}

module.exports = { build };