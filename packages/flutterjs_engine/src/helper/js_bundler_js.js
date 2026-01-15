/**
 * ============================================================================
 * FlutterJS JavaScript Bundler - Complete Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. esbuild-based JavaScript bundling
 * 2. Code splitting and chunking strategy
 * 3. Tree-shaking (dead code elimination)
 * 4. Minification and optimization
 * 5. Source map generation
 * 6. Bundle analysis and metrics
 * 7. Plugin system for customization
 * 8. Multiple build targets support
 * 9. External dependencies handling
 * 10. Performance tracking
 * 
 * Location: cli/bundler/js-bundler.js
 * Usage:
 *   const bundler = new JavaScriptBundler(config);
 *   const result = await bundler.bundle();
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { builtinModules } = require('module');

// ============================================================================
// CONSTANTS
// ============================================================================

const BUILD_TARGETS = {
  ES2020: 'es2020',
  ES2021: 'es2021',
  ES2022: 'es2022',
  CHROME90: 'chrome90',
  FIREFOX88: 'firefox88',
  SAFARI14: 'safari14',
};

const DEFAULT_TARGETS = ['es2020', 'chrome90', 'firefox88', 'safari14'];

const CHUNK_NAMES = {
  vendor: 'vendor-[hash]',
  runtime: 'runtime-[hash]',
  material: 'material-[hash]',
  app: '[name]-[hash]',
};

// ============================================================================
// JAVASCRIPT BUNDLER CLASS
// ============================================================================

class JavaScriptBundler {
  constructor(config) {
    this.config = {
      entry: config.entry || 'lib/main.fjs',
      output: config.output || 'dist',
      projectRoot: config.projectRoot || process.cwd(),
      mode: config.mode || 'production',
      minify: config.minify !== false,
      treeshake: config.treeshake !== false,
      sourceMap: config.sourceMap !== false,
      splitting: config.splitting !== false,
      analyze: config.analyze || false,
      verbose: config.verbose || false,
      ...config,
    };

    // Bundler state
    this.result = null;
    this.startTime = null;
    this.buildTime = 0;
    this.analysis = null;

    // Statistics
    this.stats = {
      inputFiles: 0,
      outputFiles: 0,
      totalSize: 0,
      gzippedSize: 0,
      buildTime: 0,
      chunks: {},
      modules: [],
    };

    // Plugins
    this.plugins = this._getDefaultPlugins();
  }

  /**
   * Get default esbuild plugins
   * @private
   */
  _getDefaultPlugins() {
    return [
      this._createFlutterJSResolverPlugin(),
      this._createCSSPlugin(),
      this._createAssetPlugin(),
    ];
  }

  /**
   * Create FlutterJS module resolver plugin
   * @private
   */
  _createFlutterJSResolverPlugin() {
    return {
      name: 'flutterjs-resolver',
      setup: (build) => {
        // Resolve @flutterjs/* packages
        build.onResolve({ filter: /^@flutterjs\// }, (args) => {
          const packageName = args.path.replace('@flutterjs/', '');
          const packagePath = path.resolve(
            this.config.projectRoot,
            'node_modules',
            '@flutterjs',
            packageName,
            'index.js'
          );

          if (fs.existsSync(packagePath)) {
            return { path: packagePath };
          }

          return { path: args.path, external: true };
        });

        // Resolve .fjs files
        build.onResolve({ filter: /\.fjs$/ }, (args) => {
          return {
            path: path.resolve(args.resolveDir, args.path),
            namespace: 'flutterjs',
          };
        });

        // Load .fjs files
        build.onLoad({ filter: /\.fjs$/, namespace: 'flutterjs' }, async (args) => {
          try {
            const source = await fs.promises.readFile(args.path, 'utf-8');
            const contents = this._transformFjsCode(source);

            return {
              contents,
              loader: 'js',
            };
          } catch (error) {
            return {
              errors: [{
                text: `Failed to load ${args.path}: ${error.message}`,
              }],
            };
          }
        });
      },
    };
  }

  /**
   * Create CSS plugin for esbuild
   * @private
   */
  _createCSSPlugin() {
    return {
      name: 'css-processor',
      setup: (build) => {
        build.onLoad({ filter: /\.css$/ }, async (args) => {
          try {
            const source = await fs.promises.readFile(args.path, 'utf-8');
            const processed = this._processCss(source);

            return {
              contents: processed,
              loader: 'css',
            };
          } catch (error) {
            return {
              errors: [{
                text: `Failed to process CSS: ${error.message}`,
              }],
            };
          }
        });
      },
    };
  }

  /**
   * Create asset plugin for esbuild
   * @private
   */
  _createAssetPlugin() {
    return {
      name: 'asset-handler',
      setup: (build) => {
        // Handle image imports
        build.onLoad({ filter: /\.(png|jpg|jpeg|gif|svg|webp)$/ }, async (args) => {
          const buffer = await fs.promises.readFile(args.path);
          const base64 = buffer.toString('base64');
          const mimeType = this._getMimeType(args.path);

          return {
            contents: `export default "data:${mimeType};base64,${base64}"`,
            loader: 'js',
          };
        });

        // Handle font imports
        build.onLoad({ filter: /\.(woff|woff2|ttf|otf)$/ }, async (args) => {
          const buffer = await fs.promises.readFile(args.path);
          const base64 = buffer.toString('base64');
          const mimeType = this._getMimeType(args.path);

          return {
            contents: `export default "data:${mimeType};base64,${base64}"`,
            loader: 'js',
          };
        });
      },
    };
  }

  /**
   * Transform .fjs code to JavaScript
   * @private
   */
  _transformFjsCode(code) {
    // This is a simplified transformation
    // In production, this would use proper AST transformation
    let transformed = code;

    // Export transformation (simplified)
    if (!transformed.includes('export')) {
      // Add export if not present
      transformed += '\n\nexport default {};';
    }

    return transformed;
  }

  /**
   * Process CSS code
   * @private
   */
  _processCss(css) {
    // Remove comments
    let processed = css.replace(/\/\*[\s\S]*?\*\//g, '');

    if (this.config.minify) {
      // Minify CSS
      processed = processed
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .trim();
    }

    return processed;
  }

  /**
   * Get MIME type for file
   * @private
   */
  _getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    const types = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
    };

    return types[ext] || 'application/octet-stream';
  }

  /**
   * Build the bundle
   */
  async bundle() {
    this.startTime = performance.now();

    try {
      console.log(chalk.blue('\n🔨 Bundling JavaScript...\n'));

      // Resolve entry point
      const entryPath = path.resolve(
        this.config.projectRoot,
        this.config.entry
      );

      if (!fs.existsSync(entryPath)) {
        throw new Error(`Entry point not found: ${entryPath}`);
      }

      // Prepare esbuild options
      const esbuildOptions = this._prepareEsbuildOptions(entryPath);

      if (this.config.verbose) {
        console.log(chalk.gray('esbuild options:'));
        console.log(chalk.gray(JSON.stringify(esbuildOptions, null, 2)));
        console.log();
      }

      // Run esbuild
      this.result = await esbuild.build(esbuildOptions);

      this.buildTime = performance.now() - this.startTime;

      // Generate analysis
      if (this.config.analyze || this.result.metafile) {
        this.analysis = await this._analyzeBundle();
      }

      // Calculate statistics
      this._calculateStats();

      // Log results
      this._logBuildResults();

      return {
        success: true,
        result: this.result,
        analysis: this.analysis,
        stats: this.stats,
        buildTime: this.buildTime,
      };

    } catch (error) {
      console.error(chalk.red('✗ Bundle failed:'));
      console.error(chalk.red(`  ${error.message}\n`));

      throw error;
    }
  }

  /**
   * Prepare esbuild options
   * @private
   */
  _prepareEsbuildOptions(entryPath) {
    return {
      entryPoints: [entryPath],
      bundle: true,
      outdir: path.resolve(this.config.projectRoot, this.config.output),
      outbase: path.resolve(this.config.projectRoot, 'lib'),

      // Code splitting
      splitting: this.config.splitting,
      format: 'esm',
      chunkNames: CHUNK_NAMES.app,

      // Minification
      minify: this.config.minify,
      minifyWhitespace: this.config.minify,
      minifyIdentifiers: this.config.minify,
      minifySyntax: this.config.minify,

      // Tree-shaking
      treeShaking: this.config.treeshake,

      // Source maps
      sourcemap: this.config.sourceMap ? 'linked' : false,
      sourcesContent: this.config.sourceMap,

      // Target
      target: DEFAULT_TARGETS,

      // Platform
      platform: 'browser',

      // Externals
      external: [
        ...builtinModules,
        ...(this.config.externals || []),
      ],

      // Plugins
      plugins: this.plugins,

      // Define globals
      define: {
        'process.env.NODE_ENV': JSON.stringify(this.config.mode),
        '__DEV__': String(this.config.mode === 'development'),
        '__PROD__': String(this.config.mode === 'production'),
        ...(this.config.define || {}),
      },

      // Aliases
      alias: this.config.alias || {},

      // Loader configuration
      loader: {
        '.png': 'file',
        '.jpg': 'file',
        '.jpeg': 'file',
        '.gif': 'file',
        '.svg': 'file',
        '.woff': 'file',
        '.woff2': 'file',
        '.ttf': 'file',
        '.otf': 'file',
      },

      // Asset names
      assetNames: 'assets/[name]-[hash]',
      entryNames: '[dir]/[name]-[hash]',

      // Metafile for analysis
      metafile: true,

      // Write to disk
      write: true,

      // Logging
      logLevel: this.config.verbose ? 'debug' : 'warning',

      // Color output
      color: true,
    };
  }

  /**
   * Analyze bundle using metafile
   * @private
   */
  async _analyzeBundle() {
    if (!this.result.metafile) {
      return null;
    }

    try {
      const outputs = this.result.metafile.outputs;
      const inputs = this.result.metafile.inputs;

      // Calculate total size
      const totalSize = Object.values(outputs).reduce(
        (sum, output) => sum + output.bytes,
        0
      );

      // Group by chunk
      const chunks = {};
      Object.entries(outputs).forEach(([filePath, output]) => {
        const chunkName = this._getChunkName(filePath);

        if (!chunks[chunkName]) {
          chunks[chunkName] = {
            files: [],
            totalSize: 0,
            imports: [],
          };
        }

        chunks[chunkName].files.push({
          path: filePath,
          size: output.bytes,
        });

        chunks[chunkName].totalSize += output.bytes;

        if (output.imports) {
          chunks[chunkName].imports.push(...output.imports);
        }
      });

      // Find largest modules
      const modules = Object.entries(inputs)
        .map(([filePath, input]) => ({
          path: filePath,
          size: input.bytes,
          imports: input.imports?.map(i => i.path) || [],
        }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 50);

      // Build dependency tree
      const dependencyTree = this._buildDependencyTree(inputs);

      return {
        totalSize,
        totalSizeFormatted: this._formatBytes(totalSize),
        chunks,
        modules,
        dependencyTree,
        summary: {
          outputCount: Object.keys(outputs).length,
          inputCount: Object.keys(inputs).length,
          averageChunkSize: this._formatBytes(
            totalSize / Object.keys(outputs).length
          ),
        },
      };

    } catch (error) {
      console.warn(
        chalk.yellow(
          `[Bundler] Failed to analyze bundle: ${error.message}`
        )
      );
      return null;
    }
  }

  /**
   * Build dependency tree from metafile inputs
   * @private
   */
  _buildDependencyTree(inputs) {
    const tree = {};

    Object.entries(inputs).forEach(([filePath, input]) => {
      tree[filePath] = {
        size: input.bytes,
        imports: input.imports?.map(i => i.path) || [],
      };
    });

    return tree;
  }

  /**
   * Get chunk name from file path
   * @private
   */
  _getChunkName(filePath) {
    const basename = path.basename(filePath);

    if (basename.includes('vendor')) return 'vendor';
    if (basename.includes('runtime')) return 'runtime';
    if (basename.includes('material')) return 'material';
    if (basename.includes('chunk')) return 'chunks';

    return 'app';
  }

  /**
   * Calculate build statistics
   * @private
   */
  _calculateStats() {
    if (!this.result.metafile) return;

    const outputs = this.result.metafile.outputs;
    const inputs = this.result.metafile.inputs;

    // Count files
    this.stats.inputFiles = Object.keys(inputs).length;
    this.stats.outputFiles = Object.keys(outputs).length;

    // Calculate sizes
    this.stats.totalSize = Object.values(outputs).reduce(
      (sum, output) => sum + output.bytes,
      0
    );

    // Estimate gzipped size (roughly 30% of original)
    this.stats.gzippedSize = Math.floor(this.stats.totalSize * 0.3);

    // Build time
    this.stats.buildTime = this.buildTime;

    // Chunk breakdown
    this.stats.chunks = {};
    Object.entries(outputs).forEach(([filePath, output]) => {
      const chunkName = this._getChunkName(filePath);

      if (!this.stats.chunks[chunkName]) {
        this.stats.chunks[chunkName] = {
          size: 0,
          count: 0,
        };
      }

      this.stats.chunks[chunkName].size += output.bytes;
      this.stats.chunks[chunkName].count++;
    });

    // Top modules
    this.stats.modules = Object.entries(inputs)
      .map(([path, input]) => ({
        path,
        size: input.bytes,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);
  }

  /**
   * Log build results to console
   * @private
   */
  _logBuildResults() {
    console.log(chalk.green('✓ Bundle complete\n'));

    console.log(chalk.blue('📊 Bundle Statistics:\n'));
    console.log(chalk.gray(`  Input Files:    ${this.stats.inputFiles}`));
    console.log(chalk.gray(`  Output Files:   ${this.stats.outputFiles}`));
    console.log(chalk.gray(`  Total Size:     ${this._formatBytes(this.stats.totalSize)}`));
    console.log(chalk.gray(`  Gzipped Size:   ~${this._formatBytes(this.stats.gzippedSize)}`));
    console.log(chalk.gray(`  Build Time:     ${this.buildTime.toFixed(2)}ms\n`));

    console.log(chalk.blue('📦 Chunk Breakdown:\n'));
    Object.entries(this.stats.chunks).forEach(([name, chunk]) => {
      console.log(
        chalk.gray(
          `  ${name.padEnd(12)} ${this._formatBytes(chunk.size).padStart(10)} ` +
          `(${chunk.count} file${chunk.count !== 1 ? 's' : ''})`
        )
      );
    });

    if (this.stats.modules.length > 0) {
      console.log(chalk.blue('\n🔝 Top 10 Modules:\n'));
      this.stats.modules.slice(0, 10).forEach((module, i) => {
        console.log(
          chalk.gray(
            `  ${String(i + 1).padEnd(2)} ${this._formatBytes(module.size).padStart(10)} ` +
            `${path.relative(this.config.projectRoot, module.path)}`
          )
        );
      });
    }

    console.log();
  }

  /**
   * Format bytes to human readable size
   * @private
   */
  _formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Add custom plugin
   */
  addPlugin(plugin) {
    this.plugins.push(plugin);
  }

  /**
   * Get bundle analysis
   */
  getAnalysis() {
    return this.analysis;
  }

  /**
   * Get bundle statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Generate bundle report
   */
  async generateReport(outputPath) {
    if (!this.analysis) {
      throw new Error('No analysis data available. Run bundle() first.');
    }

    const report = {
      timestamp: new Date().toISOString(),
      buildTime: this.buildTime,
      stats: this.stats,
      analysis: this.analysis,
    };

    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(report, null, 2)
    );

    console.log(chalk.green(`✓ Report saved to ${outputPath}`));

    return report;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  JavaScriptBundler,
  BUILD_TARGETS,
  CHUNK_NAMES,
};
