/**
 * ============================================================================
 * ProjectLoader - Detects and loads Flutter.js projects
 * ============================================================================
 * 
 * This module:
 * 1. Detects project root by searching for package.json
 * 2. Loads flutterjs.config.js configuration
 * 3. Merges with package.json "flutterjs" field
 * 4. Validates project structure
 * 5. Resolves all file paths to absolute
 * 6. Provides configuration to all commands
 * 
 * Location: lib/project-loader.js or src/project-loader.js
 * 
 * Usage:
 *   const { ProjectLoader } = require('./project-loader');
 *   const loader = new ProjectLoader();
 *   
 *   console.log(loader.projectRoot);        // /home/user/my-app
 *   console.log(loader.config.entry.main);   // src/main.fjs
 *   console.log(loader.resolvePaths());      // All absolute paths
 */

const fs = require('fs');
const path = require('path');

class ProjectLoader {
  /**
   * Constructor - Load project on instantiation
   */
  constructor(startPath = null) {
    this.startPath = startPath || process.cwd();
    this.projectRoot = null;
    this.config = null;
    this.packageJson = null;

    // Load everything
    this._findProjectRoot();
    this._loadConfig();
    this._loadPackageJson();
  }

  // =========================================================================
  // STEP 1: Find Project Root
  // =========================================================================

  /**
   * Find project root by searching upward for package.json
   * with "flutterjs" marker
   */
  _findProjectRoot() {
    let current = this.startPath;
    const root = path.parse(current).root;

    while (current !== root) {
      const packageJsonPath = path.join(current, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        try {
          const content = fs.readFileSync(packageJsonPath, 'utf8');
          const pkg = JSON.parse(content);

          // Check for Flutter.js markers
          if (
            pkg.flutterjs || // Has "flutterjs" field
            (pkg.keywords && pkg.keywords.includes('flutter.js')) || // Has keyword
            fs.existsSync(path.join(current, 'flutterjs.config.js')) // Has config file
          ) {
            this.projectRoot = current;
            return;
          }
        } catch (e) {
          // Invalid JSON, continue searching
        }
      }

      current = path.dirname(current);
    }

    // Not found
    throw new Error(
      `Flutter.js project not found!\n\n` +
      `Expected to find one of:\n` +
      `  • package.json with "flutterjs" field\n` +
      `  • flutterjs.config.js file\n` +
      `  • package.json with keywords: ["flutter.js"]\n\n` +
      `To create a new project:\n` +
      `  flutter_js init my-app\n`
    );
  }

  // =========================================================================
  // STEP 2: Load Configuration
  // =========================================================================

  /**
   * Load flutterjs.config.js
   * Returns default config if file not found
   */
  _loadConfig() {
    const configPath = path.join(this.projectRoot, 'flutterjs.config.js');

    if (fs.existsSync(configPath)) {
      try {
        // Clear cache to allow reloading
        delete require.cache[require.resolve(configPath)];
        const configModule = require(configPath);
        this.config = this._mergeConfigs(
          this._defaultConfig(),
          configModule
        );
      } catch (error) {
        throw new Error(
          `Failed to load flutterjs.config.js:\n${error.message}`
        );
      }
    } else {
      // No explicit config file, use defaults
      this.config = this._defaultConfig();
    }
  }

  /**
   * Load and merge package.json "flutterjs" field
   */
  _loadPackageJson() {
    const pkgPath = path.join(this.projectRoot, 'package.json');

    try {
      const content = fs.readFileSync(pkgPath, 'utf8');
      this.packageJson = JSON.parse(content);

      // Merge "flutterjs" field from package.json
      // (has lower priority than flutterjs.config.js)
      if (this.packageJson.flutterjs) {
        this.config = this._mergeConfigs(
          this.config,
          this.packageJson.flutterjs
        );
      }
    } catch (error) {
      throw new Error(`Failed to load package.json:\n${error.message}`);
    }
  }

  /**
   * Deep merge configuration objects
   * Values in `override` take precedence over `base`
   */
  _mergeConfigs(base, override) {
    const merged = { ...base };

    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        if (
          typeof override[key] === 'object' &&
          override[key] !== null &&
          !Array.isArray(override[key])
        ) {
          // Recursively merge objects
          merged[key] = this._mergeConfigs(
            base[key] || {},
            override[key]
          );
        } else {
          // Direct assignment for primitives and arrays
          merged[key] = override[key];
        }
      }
    }

    return merged;
  }

  /**
   * Get default configuration
   */
  _defaultConfig() {
    return {
      project: {
        name: 'flutter-js-app',
        description: 'A Flutter.js application',
        version: '1.0.0',
      },

      entry: {
        main: 'src/main.fjs',
        rootWidget: 'MyApp',
        entryFunction: 'main',
      },

      render: {
        mode: 'csr', // 'csr' | 'ssr' | 'hybrid'
        target: 'web', // 'web' | 'node' | 'universal'
      },

      build: {
        source: 'src',
        output: 'dist',
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
      },

      dev: {
        server: {
          port: 3000,
          host: 'localhost',
          https: false,
        },
        hmr: {
          enabled: true,
          interval: 300,
          reload: true,
        },
      },

      framework: {
        material: {
          version: '3',
          theme: 'light',
        },
        providers: {
          theme: true,
          navigation: true,
          mediaQuery: true,
        },
      },
    };
  }

  // =========================================================================
  // STEP 3: Validate Project
  // =========================================================================

  /**
   * Validate project structure
   * Throws error if validation fails
   */
  validate() {
    const errors = [];
    const paths = this.resolvePaths();

    // Check source directory
    if (!fs.existsSync(paths.sourceDir)) {
      errors.push(`Source directory not found: ${paths.sourceDir}`);
    }

    // Check entry file
    if (!fs.existsSync(paths.entryFile)) {
      errors.push(`Entry file not found: ${paths.entryFile}`);
    }

    // Check for circular imports (simple check)
    try {
      // Could add deeper validation here
    } catch (e) {
      errors.push(`Configuration error: ${e.message}`);
    }

    if (errors.length > 0) {
      throw new Error(
        'Project validation failed:\n\n  ' +
        errors.map((e) => `• ${e}`).join('\n  ') +
        '\n'
      );
    }

    return true;
  }

  // =========================================================================
  // STEP 4: Resolve Paths
  // =========================================================================

  /**
   * Convert relative paths from config to absolute paths
   */
  resolvePaths() {
    return {
      projectRoot: this.projectRoot,
      sourceDir: path.resolve(
        this.projectRoot,
        this.config.build?.source || 'src'
      ),
      outputDir: path.resolve(
        this.projectRoot,
        this.config.build?.output || 'dist'
      ),
      entryFile: path.resolve(
        this.projectRoot,
        this.config.entry?.main || 'src/main.fjs'
      ),
      configFile: path.join(this.projectRoot, 'flutterjs.config.js'),
      packageFile: path.join(this.projectRoot, 'package.json'),
      publicDir: path.resolve(this.projectRoot, 'public'),
      cacheDir: path.resolve(this.projectRoot, '.cache'),
    };
  }

  // =========================================================================
  // STEP 5: Environment & Build Config
  // =========================================================================

  /**
   * Get current environment: 'development' or 'production'
   */
  getEnvironment() {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Get build config for specific environment
   */
  getBuildConfig(env = null) {
    env = env || this.getEnvironment();

    return {
      ...this.config.build,
      ...(this.config.build[env] || {}),
    };
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  /**
   * Print project summary to console
   */
  printSummary(verbose = false) {
    const paths = this.resolvePaths();

    console.log('\n🚀 Flutter.js Project Loaded\n');
    console.log(`📁 Project Root: ${this.projectRoot}`);
    console.log(`📦 Entry Point:  ${paths.entryFile}`);
    console.log(`📂 Source Dir:   ${paths.sourceDir}`);
    console.log(`📂 Output Dir:   ${paths.outputDir}`);
    console.log(`⚙️  Config File:  ${paths.configFile}`);
    console.log(
      `📋 Package:      ${this.packageJson.name}@${this.packageJson.version}`
    );
    console.log(
      `🎯 Root Widget:  ${this.config.entry?.rootWidget || 'MyApp'}`
    );
    console.log(`📊 Render Mode:  ${this.config.render?.mode || 'csr'}`);

    if (verbose) {
      console.log('\n📋 Configuration:');
      console.log(JSON.stringify(this.config, null, 2));
    }

    console.log();
  }

  /**
   * Get full project context object
   * Useful to pass to all commands
   */
  getContext() {
    return {
      loader: this,
      projectRoot: this.projectRoot,
      config: this.config,
      packageJson: this.packageJson,
      paths: this.resolvePaths(),
      environment: this.getEnvironment(),
      buildConfig: this.getBuildConfig(),
    };
  }

  /**
   * Check if file is within source directory
   */
  isSourceFile(filePath) {
    const sourceDir = this.resolvePaths().sourceDir;
    const absolute = path.resolve(filePath);
    return absolute.startsWith(sourceDir);
  }

  /**
   * Watch for configuration changes
   */
  watchConfig(callback) {
    const configPath = path.join(this.projectRoot, 'flutterjs.config.js');

    if (fs.existsSync(configPath)) {
      fs.watchFile(configPath, () => {
        try {
          this._loadConfig();
          callback(null, this.config);
        } catch (error) {
          callback(error);
        }
      });
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = { ProjectLoader };