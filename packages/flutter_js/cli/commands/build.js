const fs = require('fs-extra');
const path = require('path');
const { minify } = require('terser');
const { obfuscate } = require('./obfuscator');

async function build(options) {
  console.log('🚀 Building Flutter.js application...\n');
  
  const { mode, output, minify: shouldMinify, obfuscate: shouldObfuscate } = options;
  
  try {
    // 1. Find generated code from Bridge
    console.log('📦 Loading generated code...');
    const generatedCodePath = path.join(process.cwd(), 'app.generated.js');
    
    if (!fs.existsSync(generatedCodePath)) {
      throw new Error('app.generated.js not found! Run flutter_js build first.');
    }
    
    const generatedCode = await fs.readFile(generatedCodePath, 'utf8');
    
    // 2. Load framework runtime
    console.log('⚙️  Loading framework runtime...');
    const frameworkPath = path.join(__dirname, '../../dist/flutter-framework.js');
    const frameworkCode = await fs.readFile(frameworkPath, 'utf8');
    
    // 3. Combine framework + generated code
    console.log('🔗 Combining code...');
    let finalCode = `${frameworkCode}\n\n${generatedCode}`;
    
    // 4. Minify if production
    if (mode === 'prod' && shouldMinify) {
      console.log('📉 Minifying...');
      const minified = await minify(finalCode, {
        compress: {
          dead_code: true,
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
        },
        mangle: {
          toplevel: true,
        },
        output: {
          comments: false,
        },
      });
      finalCode = minified.code;
    }
    
    // 5. Obfuscate if production
    if (mode === 'prod' && shouldObfuscate) {
      console.log('🔐 Obfuscating...');
      finalCode = await obfuscate(finalCode);
    }
    
    // 6. Create output directory
    console.log('📁 Creating output directory...');
    await fs.ensureDir(output);
    
    // 7. Write JavaScript
    const jsFileName = mode === 'prod' ? 'app.min.js' : 'app.js';
    await fs.writeFile(
      path.join(output, jsFileName),
      finalCode
    );
    
    // 8. Copy HTML template
    console.log('📄 Copying HTML...');
    await copyHTML(output, jsFileName);
    
    // 9. Copy/Generate CSS
    console.log('🎨 Processing CSS...');
    await processCSS(output, mode);
    
    // 10. Copy assets if they exist
    if (fs.existsSync('assets')) {
      console.log('📸 Copying assets...');
      await fs.copy('assets', path.join(output, 'assets'));
    }
    
    // 11. Generate stats
    const stats = await generateStats(output, finalCode);
    
    console.log('\n✅ Build complete!\n');
    console.log(`📊 Build Stats:`);
    console.log(`   Mode: ${mode}`);
    console.log(`   Output: ${output}/`);
    console.log(`   JavaScript: ${stats.jsSize}`);
    console.log(`   CSS: ${stats.cssSize}`);
    console.log(`   Total: ${stats.totalSize}`);
    
    if (mode === 'prod') {
      console.log(`   Gzipped: ~${stats.gzippedSize}`);
    }
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

async function copyHTML(outputDir, jsFileName) {
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flutter.js App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  <script src="${jsFileName}"></script>
</body>
</html>`;
  
  await fs.writeFile(
    path.join(outputDir, 'index.html'),
    htmlTemplate
  );
}

async function processCSS(outputDir, mode) {
  // Load framework CSS
  const frameworkCSS = await fs.readFile(
    path.join(__dirname, '../../dist/flutter.css'),
    'utf8'
  );
  
  // Load generated CSS if exists
  let generatedCSS = '';
  const genCSSPath = path.join(process.cwd(), 'app.generated.css');
  if (fs.existsSync(genCSSPath)) {
    generatedCSS = await fs.readFile(genCSSPath, 'utf8');
  }
  
  let finalCSS = `${frameworkCSS}\n\n${generatedCSS}`;
  
  // Minify CSS in production
  if (mode === 'prod') {
    finalCSS = minifyCSS(finalCSS);
  }
  
  await fs.writeFile(
    path.join(outputDir, 'styles.css'),
    finalCSS
  );
}

function minifyCSS(css) {
  // Simple CSS minification
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around punctuation
    .trim();
}

async function generateStats(outputDir, jsCode) {
  const jsSize = formatBytes(Buffer.byteLength(jsCode, 'utf8'));
  
  const cssPath = path.join(outputDir, 'styles.css');
  const cssSize = fs.existsSync(cssPath)
    ? formatBytes(fs.statSync(cssPath).size)
    : '0 KB';
  
  const totalBytes = Buffer.byteLength(jsCode, 'utf8') +
    (fs.existsSync(cssPath) ? fs.statSync(cssPath).size : 0);
  
  return {
    jsSize,
    cssSize,
    totalSize: formatBytes(totalBytes),
    gzippedSize: formatBytes(Math.floor(totalBytes * 0.3)), // Rough estimate
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

module.exports = { build };