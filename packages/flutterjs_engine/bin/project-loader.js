/**
 * ============================================================================
 * FlutterJS Configuration Loader - Complete Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. Configuration file loading & parsing
 * 2. Default configuration merging
 * 3. Configuration validation & schema enforcement
 * 4. Environment-specific overrides
 * 5. Configuration watching & hot reload
 * 6. Error reporting with helpful suggestions
 * 
 * Location: cli/config/config-loader.js
 * Usage:
 *   const config = await ConfigLoader.load('flutterjs.config.js');
 *   const validated = ConfigLoader.validate(config);
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ============================================================================
// DEFAULT CONFIGURATION SCHEMA
// ============================================================================

const DEFAULT_CONFIG = {
  // Project Identity
  project: {
    name: 'flutter-js-app',
    description: 'A FlutterJS application',
    version: '1.0.0',
  },

  // Entry Point Configuration
  entry: {
    main: 'lib/main.fjs',
    rootWidget: 'MyApp',
    entryFunction: 'main',
  },

  // Rendering Mode
  render: {
    mode: 'csr', // 'csr' | 'ssr' | 'hybrid'
    target: 'web', // 'web' | 'node' | 'universal'
  },

  // Build Configuration
  build: {
    output: 'dist',
    source: 'lib',
    publicPath: '/',
    
    production: {
      minify: true,
      obfuscate: true,
      treeshake: true,
      sourceMap: false,
    },
    
    development: {
      minify: false,
      obfuscate: false,
      treeshake: false,
      sourceMap: true,
    },
    
    // CSS options
    css: {
      modules: false,
      extract: true,
      minify: true,
      prefixer: true,
      purge: true,
    },
    
    // Asset options
    assets: {
      inline: 8192, // Inline assets < 8KB as data URLs
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'],
      imageOptimization: true,
      svgOptimization: true,
    },
    
    // Code splitting
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    
    // External dependencies (don't bundle)
    externals: [],
    
    // Chunk size limits
    chunkSizeWarningLimit: 500 * 1024, // 500KB
  },

  // Development Server
  dev: {
    server: {
      port: 3000,
      host: 'localhost',
      https: false,
      cors: true,
    },
    
    hmr: {
      enabled: true,
      interval: 300, // Poll interval in ms
      reload: true,
      overlay: true, // Error overlay
    },
    
    behavior: {
      open: false,
      clearScreen: true,
    },
    
    // API proxy
    proxy: {},
    
    // Debug tools
    debug: {
      enabled: false,
      port: 3001,
    },
  },

  // Framework Configuration
  framework: {
    material: {
      version: '3',
      theme: 'light', // 'light' | 'dark'
      primaryColor: '#6750A4',
      useM3: true,
    },
    
    providers: {
      theme: true,
      navigation: true,
      mediaQuery: true,
      localization: false,
    },
  },

  // Optimization
  optimization: {
    minify: true,
    obfuscate: false,
    
    // Terser options for minification
    terser: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
      mangle: true,
      output: {
        comments: false,
      },
    },
    
    // Compression
    gzip: true,
    brotli: false,
  },

  // Plugins
  plugins: [],

  // Module aliases for imports
  alias: {
    '@': './lib',
    '@components': './lib/widgets',
    '@pages': './lib/pages',
    '@services': './lib/services',
    '@models': './lib/models',
    '@utils': './lib/utils',
  },

  // Global constants
  define: {
    '__DEV__': JSON.stringify(true),
    '__VERSION__': JSON.stringify('1.0.0'),
  },

  // Analytics (optional)
  analytics: {
    enabled: false,
    trackingId: '',
  },
};

// ============================================================================
// CONFIGURATION LOADER CLASS
// ============================================================================

class ConfigLoader {
  /**
   * Load and merge configuration from multiple sources
   * Priority: CLI options > flutterjs.config.js > package.json > defaults
   */
  static async load(configPath = 'flutterjs.config.js', projectRoot = null) {
    const root = projectRoot || process.cwd();
    const fullPath = path.resolve(root, configPath);

    try {
      // 1. Start with defaults
      let config = this.deepClone(DEFAULT_CONFIG);

      // 2. Load flutterjs.config.js if exists
      if (fs.existsSync(fullPath)) {
        const userConfig = await this._loadConfigFile(fullPath);
        config = this._mergeConfigs(config, userConfig);
      } else {
        console.warn(chalk.yellow(`⚠ No config file found at ${configPath}`));
        console.warn(chalk.gray('Using default configuration\n'));
      }

      // 3. Load package.json "flutterjs" field
      const packagePath = path.join(root, 'package.json');
      if (fs.existsSync(packagePath)) {
        const pkg = await this._loadPackageJson(packagePath);
        if (pkg.flutterjs) {
          config = this._mergeConfigs(config, pkg.flutterjs);
        }
      }

      // 4. Validate merged configuration
      this.validate(config);

      return config;

    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Load configuration file (CommonJS or ESM)
   */
  static async _loadConfigFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Config file not found: ${filePath}`);
      }

      // Clear require cache to reload
      delete require.cache[require.resolve(filePath)];

      // Try require first (CommonJS)
      try {
        const config = require(filePath);
        return config || {};
      } catch (e) {
        // Fall back to import (ESM)
        const module = await import(`file://${filePath}`);
        return module.default || module;
      }

    } catch (error) {
      throw new Error(
        `Failed to parse config file:\n\n${error.message}\n\n` +
        `Make sure flutterjs.config.js is valid JavaScript/JSON`
      );
    }
  }

  /**
   * Load package.json
   */
  static async _loadPackageJson(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${error.message}`);
    }
  }

  /**
   * Deep merge two configuration objects
   * Values in `override` take precedence over `base`
   */
  static _mergeConfigs(base, override) {
    const merged = this.deepClone(base);

    for (const key in override) {
      if (!override.hasOwnProperty(key)) continue;

      const baseValue = merged[key];
      const overrideValue = override[key];

      // Recursively merge objects
      if (
        typeof overrideValue === 'object' &&
        overrideValue !== null &&
        !Array.isArray(overrideValue) &&
        typeof baseValue === 'object' &&
        baseValue !== null &&
        !Array.isArray(baseValue)
      ) {
        merged[key] = this._mergeConfigs(baseValue, overrideValue);
      } else {
        // Direct assignment for primitives and arrays
        merged[key] = overrideValue;
      }
    }

    return merged;
  }

  /**
   * Validate configuration schema
   * Throws error if validation fails
   */
  static validate(config) {
    const errors = [];

    // Validate required fields
    if (!config.entry?.main) {
      errors.push('entry.main is required');
    }

    if (!config.build?.output) {
      errors.push('build.output is required');
    }

    // Validate render mode
    const validModes = ['csr', 'ssr', 'hybrid'];
    if (!validModes.includes(config.render?.mode)) {
      errors.push(
        `render.mode must be one of: ${validModes.join(', ')}. ` +
        `Got: "${config.render?.mode}"`
      );
    }

    // Validate target
    const validTargets = ['web', 'node', 'universal'];
    if (!validTargets.includes(config.render?.target)) {
      errors.push(
        `render.target must be one of: ${validTargets.join(', ')}. ` +
        `Got: "${config.render?.target}"`
      );
    }

    // Validate dev server port
    if (config.dev?.server?.port) {
      const port = config.dev.server.port;
      if (typeof port !== 'number' || port < 1 || port > 65535) {
        errors.push(
          `dev.server.port must be a number between 1 and 65535. ` +
          `Got: ${port}`
        );
      }
    }

    // Validate HMR interval
    if (config.dev?.hmr?.interval) {
      const interval = config.dev.hmr.interval;
      if (typeof interval !== 'number' || interval < 100) {
        errors.push(
          `dev.hmr.interval must be at least 100ms. ` +
          `Got: ${interval}ms`
        );
      }
    }

    // Validate chunk size limit
    if (config.build?.chunkSizeWarningLimit) {
      const limit = config.build.chunkSizeWarningLimit;
      if (typeof limit !== 'number' || limit < 1024) {
        errors.push(
          `build.chunkSizeWarningLimit must be at least 1024 bytes. ` +
          `Got: ${limit}`
        );
      }
    }

    // Validate inline size
    if (config.build?.assets?.inline) {
      const inline = config.build.assets.inline;
      if (typeof inline !== 'number' || inline < 0) {
        errors.push(
          `build.assets.inline must be a non-negative number. ` +
          `Got: ${inline}`
        );
      }
    }

    // Validate aliases (must be objects)
    if (config.alias && typeof config.alias !== 'object') {
      errors.push('alias must be an object');
    }

    // Validate define (must be object)
    if (config.define && typeof config.define !== 'object') {
      errors.push('define must be an object');
    }

    // Report errors
    if (errors.length > 0) {
      const errorList = errors
        .map((err, i) => `${i + 1}. ${err}`)
        .join('\n');

      throw new Error(
        `Configuration validation failed:\n\n${errorList}\n\n` +
        `See https://flutter-js.dev/docs/config for documentation`
      );
    }

    return true;
  }

  /**
   * Get configuration for specific environment
   */
  static getEnvironmentConfig(config, env = null) {
    env = env || process.env.NODE_ENV || 'development';

    const envConfig = config.build?.[env] || {};

    return {
      ...config,
      build: {
        ...config.build,
        ...envConfig,
      },
    };
  }

  /**
   * Get build configuration for specific mode
   */
  static getBuildConfig(config, mode = 'development') {
    const envConfig = config.build?.[mode];

    if (!envConfig) {
      console.warn(
        chalk.yellow(`⚠ No build configuration for mode "${mode}"`)
      );
      return config.build || {};
    }

    return envConfig;
  }

  /**
   * Resolve relative paths in configuration
   */
  static resolvePaths(config, projectRoot) {
    return {
      ...config,
      entry: {
        ...config.entry,
        main: path.resolve(projectRoot, config.entry.main),
      },
      build: {
        ...config.build,
        source: path.resolve(projectRoot, config.build.source),
        output: path.resolve(projectRoot, config.build.output),
      },
      dev: {
        ...config.dev,
        // Dev paths remain relative for serving
      },
    };
  }

  /**
   * Watch configuration file for changes
   */
  static watchConfig(configPath = 'flutterjs.config.js', callback) {
    const fullPath = path.resolve(process.cwd(), configPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(chalk.yellow(`⚠ Config file not found: ${configPath}`));
      return null;
    }

    let debounceTimer;

    const watcher = fs.watch(fullPath, async (eventType, filename) => {
      // Debounce rapid changes
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        try {
          console.log(chalk.blue('🔄 Config changed, reloading...'));

          const newConfig = await this.load(configPath);
          callback(null, newConfig);

          console.log(chalk.green('✅ Config reloaded'));
        } catch (error) {
          callback(error, null);
          console.error(chalk.red(`❌ Failed to reload config: ${error.message}`));
        }
      }, 300);
    });

    return watcher;
  }

  /**
   * Print configuration summary
   */
  static printSummary(config, verbose = false) {
    console.log(chalk.blue('\n📋 Configuration Summary\n'));

    console.log(chalk.gray('Project:'));
    console.log(chalk.gray(`  Name: ${config.project?.name}`));
    console.log(chalk.gray(`  Version: ${config.project?.version}`));

    console.log(chalk.gray('\nEntry:'));
    console.log(chalk.gray(`  Main: ${config.entry?.main}`));
    console.log(chalk.gray(`  Root Widget: ${config.entry?.rootWidget}`));

    console.log(chalk.gray('\nRendering:'));
    console.log(chalk.gray(`  Mode: ${config.render?.mode.toUpperCase()}`));
    console.log(chalk.gray(`  Target: ${config.render?.target}`));

    console.log(chalk.gray('\nBuild:'));
    console.log(chalk.gray(`  Source: ${config.build?.source}`));
    console.log(chalk.gray(`  Output: ${config.build?.output}`));
    console.log(chalk.gray(`  Public Path: ${config.build?.publicPath}`));

    console.log(chalk.gray('\nDev Server:'));
    console.log(chalk.gray(`  Port: ${config.dev?.server?.port}`));
    console.log(chalk.gray(`  Host: ${config.dev?.server?.host}`));
    console.log(chalk.gray(`  HMR: ${config.dev?.hmr?.enabled ? 'Enabled' : 'Disabled'}`));

    if (verbose) {
      console.log(chalk.gray('\nFull Configuration:'));
      console.log(JSON.stringify(config, null, 2));
    }

    console.log();
  }

  /**
   * Validate that entry file exists
   */
  static validateEntryPoint(config, projectRoot) {
    const entryPath = path.resolve(projectRoot, config.entry.main);

    if (!fs.existsSync(entryPath)) {
      throw new Error(
        `Entry point not found: ${config.entry.main}\n\n` +
        `Expected at: ${entryPath}\n\n` +
        `Make sure the file exists or update entry.main in your config`
      );
    }

    return true;
  }

  /**
   * Deep clone object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags);
    }

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Export default config template
   */
  static getTemplate() {
    return `/**
 * FlutterJS Configuration
 * 
 * For full documentation, visit:
 * https://flutter-js.dev/docs/config
 */

module.exports = {
  // Project Identity
  project: {
    name: 'my-app',
    description: 'A FlutterJS application',
    version: '1.0.0',
  },

  // Entry Point
  entry: {
    main: 'lib/main.fjs',
    rootWidget: 'MyApp',
    entryFunction: 'main',
  },

  // Rendering Mode
  render: {
    mode: 'csr', // 'csr' | 'ssr' | 'hybrid'
    target: 'web', // 'web' | 'node' | 'universal'
  },

  // Build Configuration
  build: {
    output: 'dist',
    source: 'lib',
    production: {
      minify: true,
      obfuscate: true,
      treeshake: true,
      sourceMap: false,
    },
  },

  // Development Server
  dev: {
    server: {
      port: 3000,
      host: 'localhost',
    },
    hmr: {
      enabled: true,
    },
  },

  // Framework
  framework: {
    material: {
      version: '3',
      theme: 'light',
    },
  },
};
`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ConfigLoader,
  DEFAULT_CONFIG,
};