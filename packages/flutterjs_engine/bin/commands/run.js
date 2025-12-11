const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { loadConfig } = require('../../src/utils/config');

/**
 * Similar to: dart run C:/path/to/flutterjs.dart run --to-js --verbose
 * But for JavaScript: flutter_js run [options]
 */
async function run(options) {
  console.log('🚀 Flutter.js Runtime - Executing project...\n');
  
  // Load config from current project
  const config = loadConfig();
  const projectPath = process.cwd();
  
  // Check if this is a valid Flutter.js project
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Not a Flutter.js project!');
    console.log('📍 package.json not found in current directory');
    console.log('\n💡 Initialize a project first:');
    console.log('   flutter_js init my-app\n');
    process.exit(1);
  }
  
  try {
    // Step 1: Check if .fjs files exist (from your Dart transpiler output)
    const srcPath = path.join(projectPath, 'src');
    const fjsFiles = findFJSFiles(srcPath);
    
    if (fjsFiles.length === 0) {
      console.error('❌ No .fjs files found!');
      console.log('📍 Expected .fjs files in: src/');
      console.log('\n💡 Make sure your Dart transpiler ran first:');
      console.log('   dart run your_transpiler.dart transpile src/\n');
      process.exit(1);
    }
    
    console.log(`📦 Found ${fjsFiles.length} .fjs file(s):`);
    fjsFiles.forEach(f => console.log(`   • ${path.relative(projectPath, f)}`));
    console.log();
    
    // Step 2: Transpile .fjs files to JavaScript
    console.log('🔄 Transpiling .fjs files to JavaScript...');
    await transpileFJSFiles(fjsFiles, projectPath);
    console.log('✅ Transpilation complete\n');
    
    // Step 3: Build JavaScript bundle
    console.log('📦 Building JavaScript bundle...');
    const { build } = require('./build');
    await build({
      mode: options.mode || 'dev',
      output: options.output || '.dev',
      minify: options.minify !== false,
      obfuscate: options.obfuscate !== false,
    });
    console.log('✅ Bundle created\n');
    
    // Step 4: Start dev server
    if (options.serve !== false) {
      console.log('🌐 Starting development server...\n');
      const { dev } = require('./dev');
      await dev({
        port: options.port || '3000',
        open: options.open !== false,
      });
    }
    
  } catch (error) {
    console.error('\n❌ Runtime error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Find all .fjs files in a directory
 */
function findFJSFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) {
    return files;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      findFJSFiles(fullPath, files);
    } else if (entry.name.endsWith('.fjs')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Transpile .fjs files to JavaScript
 * This is where you convert your Flutter-like syntax to actual JS
 */
async function transpileFJSFiles(fjsFiles, projectPath) {
  for (const fjsFile of fjsFiles) {
    const relativePath = path.relative(projectPath, fjsFile);
    console.log(`   🔧 ${relativePath}`);
    
    // Read the .fjs file
    const fjsCode = fs.readFileSync(fjsFile, 'utf8');
    
    // Convert to JS (your transpiler logic)
    const jsCode = transpileFJSToJS(fjsCode);
    
    // Write to .js file (same location)
    const outputPath = fjsFile.replace(/\.fjs$/, '.js');
    fs.writeFileSync(outputPath, jsCode);
  }
}

/**
 * Core transpiler: Convert .fjs syntax to JavaScript
 * This is your custom Flutter-to-JS conversion logic
 */
function transpileFJSToJS(fjsCode) {
  // This is where you implement your custom transpilation logic
  // For now, basic example:
  
  let jsCode = fjsCode;
  
  // Example transformations (replace with your actual logic):
  
  // Convert Flutter class syntax to JavaScript
  jsCode = jsCode.replace(
    /class\s+(\w+)\s+extends\s+(\w+)\s*{/g,
    'class $1 extends $2 {'
  );
  
  // Convert Dart-style getters to JS
  jsCode = jsCode.replace(
    /get\s+(\w+)\s*\(\s*\)\s*{/g,
    'get $1() {'
  );
  
  // Remove Dart-specific decorators like @override
  jsCode = jsCode.replace(/@override\n\s*/g, '');
  jsCode = jsCode.replace(/@\w+\n\s*/g, '');
  
  // Convert async/await (already similar in both languages)
  jsCode = jsCode.replace(/async\s+(\w+)/g, 'async $1');
  
  // Add module exports if needed
  if (!jsCode.includes('export') && !jsCode.includes('module.exports')) {
    jsCode += '\n\nexport { main };';
  }
  
  return jsCode;
}

module.exports = { run };