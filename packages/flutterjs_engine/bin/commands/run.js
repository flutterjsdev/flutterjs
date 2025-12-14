// run.js - Main orchestrator (simplified)
const fs = require('fs');
const path = require('path');

/**
 * Run command - All-in-one workflow
 * 1. Builds the application with analysis
 * 2. Starts dev server (serves app + exposes build analysis API)
 * 3. Starts debug server (consumes dev server API + shows DevTools UI)
 */
async function run(options, projectContext) {
  console.log('🚀 Flutter.js Runtime - Executing project...\n');
  
  const { config, paths, projectRoot } = projectContext;
  
  try {
    // Step 1: Validate project structure
    console.log('✓ Validating project structure...');
    
    if (!fs.existsSync(paths.entryFile)) {
      throw new Error(`Entry file not found: ${paths.entryFile}`);
    }
    
    if (!fs.existsSync(paths.sourceDir)) {
      throw new Error(`Source directory not found: ${paths.sourceDir}`);
    }
    
    console.log(`  Entry: ${paths.entryFile}`);
    console.log(`  Source: ${paths.sourceDir}\n`);
    
    // Dynamically import build module
    const { build } = await import('./build.js');
    
    // Step 2: Build with analysis
    console.log('📦 Building application...\n');
    const buildResult = await build({
      mode: options.mode || 'dev',
      output: options.output || '.dev',
      minify: options.minify !== false,
      obfuscate: options.obfuscate !== false,
      verbose: options.verbose,
    }, projectContext);
    
    // Step 3: Start dev server
    if (options.serve !== false) {
      console.log('\n🌐 Starting development server...\n');
      
      const devPort = parseInt(options.port || config.dev?.server?.port || '3000', 10);
      
      // Dynamically import dev server module
      const { startDevServer } = await import('./dev.js');
      
      // Start dev server
      const devServerPromise = startDevServer({
        port: devPort,
        projectRoot,
        open: options.open === 'dev-only',
        verbose: options.verbose,
      });
      
      // Give dev server time to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Start debug server (OPTIONAL)
      const debugEnabled = options.debug !== false && config.dev?.debug?.enabled !== false;
      
      if (debugEnabled) {
        const debugPort = parseInt(options.debugPort || config.dev?.debug?.port || (devPort + 1), 10);
        
        console.log(`\n🔧 Starting debug server...\n`);
        
        // Dynamically import debug server module
        const { startDebugServer } = await import('./debug_server.js');
        
        // Start debug server connected to dev server
        const debugServerPromise = startDebugServer({
          port: debugPort,
          devServerUrl: `http://localhost:${devPort}`,
          open: options.open !== 'dev-only',
          verbose: options.verbose,
        });
        
        // Keep both servers running
        await Promise.all([devServerPromise, debugServerPromise]);
      } else {
        // Just keep dev server running
        await devServerPromise;
      }
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