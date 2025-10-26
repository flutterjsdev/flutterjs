const fs = require('fs');
const path = require('path');

// Default configuration
const defaultConfig = {
  mode: 'csr',
  build: {
    output: 'dist',
    minify: true,
    obfuscate: true,
    sourcemap: false,
  },
  server: {
    port: 3000,
    host: 'localhost',
    open: false,
    hot: true,
  },
  optimization: {
    splitChunks: true,
    treeshake: true,
  },
  assets: {
    include: ['assets/**/*'],
    exclude: ['**/*.md', '**/.DS_Store'],
  },
};

/**
 * Load flutter.config.js from current working directory
 * @param {string} configPath - Optional custom config path
 * @returns {object} Configuration object
 */
function loadConfig(configPath) {
  const configFile = configPath || path.join(process.cwd(), 'flutter.config.js');
  
  // If config file doesn't exist, return default config
  if (!fs.existsSync(configFile)) {
    // Only warn if we're not in init command
    if (!process.argv.includes('init')) {
      console.warn('⚠️  flutter.config.js not found, using defaults');
    }
    return defaultConfig;
  }
  
  try {
    // Clear require cache to get fresh config
    delete require.cache[require.resolve(configFile)];
    
    // Load user config
    const userConfig = require(configFile);
    
    // Merge with defaults (deep merge)
    const mergedConfig = deepMerge(defaultConfig, userConfig);
    
    return mergedConfig;
  } catch (error) {
    console.error('❌ Error loading flutter.config.js:', error.message);
    console.log('💡 Using default configuration\n');
    return defaultConfig;
  }
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Validate configuration object
 * @param {object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function validateConfig(config) {
  const validModes = ['ssr', 'csr', 'hybrid'];
  
  if (!validModes.includes(config.mode)) {
    console.warn(`⚠️  Invalid mode "${config.mode}". Must be one of: ${validModes.join(', ')}`);
    return false;
  }
  
  if (config.server?.port) {
    const port = parseInt(config.server.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.warn(`⚠️  Invalid port "${config.server.port}". Must be between 1-65535`);
      return false;
    }
  }
  
  return true;
}

/**
 * Display current configuration
 * @param {object} config - Configuration to display
 */
function displayConfig(config) {
  console.log('\n⚙️  Configuration:\n');
  console.log(`   Mode: ${config.mode}`);
  console.log(`   Output: ${config.build.output}`);
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Minify: ${config.build.minify}`);
  console.log(`   Obfuscate: ${config.build.obfuscate}`);
  console.log(`   Hot Reload: ${config.server.hot}`);
  console.log('');
}

module.exports = {
  loadConfig,
  validateConfig,
  displayConfig,
  defaultConfig,
};