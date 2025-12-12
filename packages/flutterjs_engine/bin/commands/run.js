const fs = require('fs');
const path = require('path');
const { build } = require('./build');
const { dev } = require('./dev');

/**
 * Run command - All-in-one workflow
 * Builds the application and starts dev server
 */
async function run(options, projectContext) {
  console.log('🚀 Flutter.js Runtime - Executing project...\n');
  
  const { config, paths, projectRoot } = projectContext;
  
  try {
    // Step 1: Validate entry file exists
    console.log('✓ Validating project structure...');
    
    if (!fs.existsSync(paths.entryFile)) {
      throw new Error(`Entry file not found: ${paths.entryFile}`);
    }
    
    if (!fs.existsSync(paths.sourceDir)) {
      throw new Error(`Source directory not found: ${paths.sourceDir}`);
    }
    
    console.log(`  Entry: ${paths.entryFile}`);
    console.log(`  Source: ${paths.sourceDir}\n`);
    
    // Step 2: Build
    console.log('📦 Building application...\n');
    await build({
      mode: options.mode || 'dev',
      output: options.output || '.dev',
      minify: options.minify !== false,
      obfuscate: options.obfuscate !== false,
      verbose: options.verbose,
    }, projectContext);
    
    // Step 3: Start dev server (unless explicitly disabled)
    if (options.serve !== false) {
      console.log('\n🌐 Starting development server...\n');
      await dev({
        port: options.port || config.dev?.server?.port || '3000',
        open: options.open !== false,
        verbose: options.verbose,
      }, projectContext);
    } else {
      console.log('\n✅ Build complete! (server not started)\n');
    }
    
  } catch (error) {
    console.error('\n❌ Runtime error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = { run };