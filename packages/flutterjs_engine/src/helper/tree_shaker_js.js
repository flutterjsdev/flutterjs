/**
 * ============================================================================
 * FlutterJS Tree-Shaker - Complete Dead Code Elimination Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. Dead code elimination analysis
 * 2. Unused export detection
 * 3. Unused import identification
 * 4. Dependency graph building
 * 5. Side effect analysis
 * 6. Module usage tracking
 * 7. Bundle size impact calculation
 * 8. Export/import mapping
 * 9. Circular dependency detection
 * 10. Tree-shaking recommendations
 * 
 * Location: cli/bundler/tree-shaker.js
 * Usage:
 *   const shaker = new TreeShaker(config);
 *   const analysis = await shaker.analyze(entryPoint);
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ============================================================================
// CONSTANTS
// ============================================================================

const SAFE_GLOBALS = [
  'console',
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'Math',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'Date',
  'RegExp',
  'Promise',
  'JSON',
  'Set',
  'Map',
  'WeakMap',
  'WeakSet',
  'Symbol',
  'Proxy',
  'Reflect',
];

const SIDE_EFFECT_PATTERNS = [
  /console\./,
  /document\./,
  /window\./,
  /localStorage\./,
  /global\./,
  /process\./,
];

// ============================================================================
// TREE SHAKER CLASS
// ============================================================================

class TreeShaker {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      entryPoint: config.entryPoint || 'lib/main.fjs',
      verbose: config.verbose || false,
      includeNodeModules: config.includeNodeModules || false,
      reportUnused: config.reportUnused !== false,
      ...config,
    };

    // Dependency graph
    this.modules = new Map();
    this.imports = new Map();
    this.exports = new Map();
    this.usedExports = new Set();
    this.unusedExports = new Set();

    // Analysis data
    this.dependencyGraph = new Map();
    this.circularDeps = [];
    this.sideEffectModules = new Set();
    this.orphanModules = new Set();

    // Statistics
    this.stats = {
      totalModules: 0,
      usedModules: 0,
      unusedModules: 0,
      totalExports: 0,
      usedExports: 0,
      unusedExports: 0,
      estimatedSavings: 0,
      analyzedTime: 0,
    };
  }

  /**
   * Analyze bundle for dead code
   */
  async analyze(entryPoint = null) {
    const startTime = performance.now();

    try {
      console.log(chalk.blue('\n🌳 Analyzing for dead code...\n'));

      const entry = entryPoint || path.resolve(
        this.config.projectRoot,
        this.config.entryPoint
      );

      // 1. Build dependency graph
      console.log(chalk.gray('Building dependency graph...'));
      await this._buildDependencyGraph(entry);

      // 2. Mark used exports
      console.log(chalk.gray('Analyzing exports...'));
      this._markUsedExports();

      // 3. Find unused exports
      console.log(chalk.gray('Finding unused code...'));
      this._findUnusedExports();

      // 4. Detect circular dependencies
      console.log(chalk.gray('Detecting circular dependencies...'));
      this._detectCircularDependencies();

      // 5. Identify orphan modules
      console.log(chalk.gray('Identifying orphan modules...'));
      this._identifyOrphanModules(entry);

      // 6. Calculate statistics
      this._calculateStats();

      const analyzedTime = performance.now() - startTime;
      this.stats.analyzedTime = analyzedTime;

      // 7. Generate report
      const report = this._generateReport();

      // 8. Log results
      this._logResults(report);

      return report;

    } catch (error) {
      console.error(chalk.red(`✗ Tree-shaking analysis failed: ${error.message}\n`));
      throw error;
    }
  }

  /**
   * Build dependency graph by parsing files
   * @private
   */
  async _buildDependencyGraph(entryPath) {
    const visited = new Set();
    const queue = [entryPath];

    while (queue.length > 0) {
      const filePath = queue.shift();

      if (visited.has(filePath)) continue;
      visited.add(filePath);

      try {
        // Skip node_modules unless explicitly included
        if (!this.config.includeNodeModules && filePath.includes('node_modules')) {
          continue;
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          if (this.config.verbose) {
            console.warn(chalk.yellow(`⚠ File not found: ${filePath}`));
          }
          continue;
        }

        // Read and parse file
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const fileKey = path.relative(this.config.projectRoot, filePath);

        // Extract imports and exports
        const imports = this._extractImports(content, filePath);
        const exports = this._extractExports(content);

        // Store in maps
        this.imports.set(fileKey, imports);
        this.exports.set(fileKey, exports);
        this.modules.set(fileKey, {
          path: filePath,
          content,
          size: Buffer.byteLength(content, 'utf-8'),
          hasSideEffects: this._hasSideEffects(content),
          imports,
          exports,
        });

        // Add imported modules to queue
        for (const imp of imports) {
          const resolvedPath = this._resolveImport(imp.source, filePath);
          if (resolvedPath && !visited.has(resolvedPath)) {
            queue.push(resolvedPath);
          }
        }

        if (this.config.verbose) {
          console.log(chalk.gray(`  Parsed: ${fileKey}`));
        }

      } catch (error) {
        console.warn(
          chalk.yellow(`⚠ Failed to parse ${filePath}: ${error.message}`)
        );
      }
    }

    this.stats.totalModules = this.modules.size;

    if (this.config.verbose) {
      console.log(chalk.gray(`\nTotal modules found: ${this.stats.totalModules}\n`));
    }
  }

  /**
   * Extract import statements from code
   * @private
   */
  _extractImports(content, filePath) {
    const imports = [];

    // Match import statements
    const importRegex = /import\s+(?:{([^}]*)}|(?:\*\s+as\s+(\w+))|(\w+))?\s*from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const destructured = match[1];
      const namespace = match[2];
      const defaultImport = match[3];
      const source = match[4];

      const specifiers = [];

      if (destructured) {
        // Parse destructured imports
        const parts = destructured.split(',').map(p => p.trim());
        parts.forEach(part => {
          const [imported, local] = part.split(' as ').map(p => p.trim());
          if (imported) {
            specifiers.push({
              imported,
              local: local || imported,
              type: 'named',
            });
          }
        });
      }

      if (namespace) {
        specifiers.push({
          imported: '*',
          local: namespace,
          type: 'namespace',
        });
      }

      if (defaultImport) {
        specifiers.push({
          imported: 'default',
          local: defaultImport,
          type: 'default',
        });
      }

      imports.push({
        source,
        specifiers,
        line: content.substring(0, match.index).split('\n').length,
      });
    }

    return imports;
  }

  /**
   * Extract export statements from code
   * @private
   */
  _extractExports(content) {
    const exports = new Map();

    // Match export default
    const defaultRegex = /export\s+default\s+(?:(?:class|function|const|let|var)\s+)?(\w+)?/g;
    const defaultMatch = defaultRegex.exec(content);

    if (defaultMatch) {
      exports.set('default', {
        type: 'default',
        name: defaultMatch[1] || 'default',
      });
    }

    // Match named exports
    const namedRegex = /export\s+(?:{([^}]*)}|(?:class|function|const|let|var)\s+(\w+))/g;
    let match;

    while ((match = namedRegex.exec(content)) !== null) {
      if (match[1]) {
        // export { x, y, z }
        const names = match[1].split(',').map(n => n.trim().split(' as ')[0]);
        names.forEach(name => {
          if (name) {
            exports.set(name, {
              type: 'named',
              name,
            });
          }
        });
      } else if (match[2]) {
        // export const/let/var/function/class
        exports.set(match[2], {
          type: 'named',
          name: match[2],
        });
      }
    }

    return exports;
  }

  /**
   * Resolve import to file path
   * @private
   */
  _resolveImport(source, fromFile) {
    const fromDir = path.dirname(fromFile);

    // Handle relative imports
    if (source.startsWith('.')) {
      let resolved = path.resolve(fromDir, source);

      // Try with extensions
      for (const ext of ['.fjs', '.js', '/index.fjs', '/index.js']) {
        const attempt = resolved.endsWith(ext) ? resolved : `${resolved}${ext}`;
        if (fs.existsSync(attempt)) {
          return attempt;
        }
      }

      return resolved; // Return even if doesn't exist
    }

    // Handle @flutterjs/* packages
    if (source.startsWith('@flutterjs/')) {
      return path.resolve(
        this.config.projectRoot,
        'node_modules',
        source,
        'index.js'
      );
    }

    // Other node_modules imports
    return path.resolve(
      this.config.projectRoot,
      'node_modules',
      source,
      'index.js'
    );
  }

  /**
   * Mark used exports by analyzing imports
   * @private
   */
  _markUsedExports() {
    for (const [fileKey, imports] of this.imports) {
      for (const imp of imports) {
        // Resolve source file
        const sourceFile = this.modules.get(imp.source) || this.modules.get(
          Array.from(this.modules.keys()).find(key =>
            key.endsWith(imp.source) || key.endsWith(imp.source + '/index.js')
          )
        );

        if (!sourceFile) continue;

        // Mark imported exports as used
        for (const spec of imp.specifiers) {
          const sourceKey = path.relative(
            this.config.projectRoot,
            sourceFile.path
          );

          if (spec.type === 'namespace') {
            // All exports are used
            for (const exp of sourceFile.exports.keys()) {
              this.usedExports.add(`${sourceKey}#${exp}`);
            }
          } else {
            this.usedExports.add(`${sourceKey}#${spec.imported}`);
          }
        }
      }
    }
  }

  /**
   * Find unused exports
   * @private
   */
  _findUnusedExports() {
    for (const [fileKey, exportsMap] of this.exports) {
      for (const exportName of exportsMap.keys()) {
        const exportKey = `${fileKey}#${exportName}`;

        if (!this.usedExports.has(exportKey)) {
          this.unusedExports.add(exportKey);
        } else {
          this.stats.usedExports++;
        }
      }

      this.stats.totalExports += exportsMap.size;
    }

    this.stats.unusedExports = this.unusedExports.size;
  }

  /**
   * Check if module has side effects
   * @private
   */
  _hasSideEffects(content) {
    // Check for side effect patterns
    for (const pattern of SIDE_EFFECT_PATTERNS) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // Check for top-level code that's not just declarations
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Ignore comments, imports, exports, and declarations
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('import') ||
        trimmed.startsWith('export') ||
        trimmed.match(/^(const|let|var|function|class)\s+/)
      ) {
        continue;
      }

      // If there's any other top-level code, it has side effects
      if (trimmed && !trimmed.startsWith('}')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect circular dependencies
   * @private
   */
  _detectCircularDependencies() {
    for (const [fileKey, imports] of this.imports) {
      for (const imp of imports) {
        const visited = new Set();
        const path = [fileKey];

        if (this._hasCircularDependency(imp.source, visited, path)) {
          this.circularDeps.push(path);
        }
      }
    }
  }

  /**
   * Check for circular dependency recursively
   * @private
   */
  _hasCircularDependency(moduleKey, visited, path) {
    if (visited.has(moduleKey)) {
      return path.includes(moduleKey);
    }

    visited.add(moduleKey);
    path.push(moduleKey);

    const imports = this.imports.get(moduleKey) || [];

    for (const imp of imports) {
      if (this._hasCircularDependency(imp.source, visited, [...path])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Identify orphan modules (not used by entry point)
   * @private
   */
  _identifyOrphanModules(entryPath) {
    const entry = path.relative(this.config.projectRoot, entryPath);
    const reachable = new Set();
    const queue = [entry];

    while (queue.length > 0) {
      const current = queue.shift();

      if (reachable.has(current)) continue;
      reachable.add(current);

      const imports = this.imports.get(current) || [];
      for (const imp of imports) {
        queue.push(imp.source);
      }
    }

    for (const moduleKey of this.modules.keys()) {
      if (!reachable.has(moduleKey)) {
        this.orphanModules.add(moduleKey);
      }
    }
  }

  /**
   * Calculate statistics
   * @private
   */
  _calculateStats() {
    this.stats.usedModules = this.modules.size - this.orphanModules.size;
    this.stats.unusedModules = this.orphanModules.size;

    // Calculate estimated savings
    let totalUnusedSize = 0;
    for (const orphan of this.orphanModules) {
      const module = this.modules.get(orphan);
      if (module) {
        totalUnusedSize += module.size;
      }
    }

    for (const unused of this.unusedExports) {
      // Rough estimate of savings per unused export
      totalUnusedSize += 100; // Average unused export size
    }

    this.stats.estimatedSavings = totalUnusedSize;
  }

  /**
   * Generate analysis report
   * @private
   */
  _generateReport() {
    return {
      stats: this.stats,
      unusedExports: Array.from(this.unusedExports),
      orphanModules: Array.from(this.orphanModules),
      circularDependencies: this.circularDeps,
      sideEffectModules: Array.from(this.sideEffectModules),
      recommendations: this._generateRecommendations(),
    };
  }

  /**
   * Generate recommendations
   * @private
   */
  _generateRecommendations() {
    const recommendations = [];

    // Unused exports
    if (this.stats.unusedExports > 0) {
      recommendations.push({
        type: 'unused-exports',
        severity: 'medium',
        count: this.stats.unusedExports,
        message: `Found ${this.stats.unusedExports} unused export(s). Consider removing them.`,
      });
    }

    // Orphan modules
    if (this.orphanModules.size > 0) {
      recommendations.push({
        type: 'orphan-modules',
        severity: 'high',
        count: this.orphanModules.size,
        message: `Found ${this.orphanModules.size} unused module(s). These can be safely removed.`,
        modules: Array.from(this.orphanModules),
      });
    }

    // Circular dependencies
    if (this.circularDeps.length > 0) {
      recommendations.push({
        type: 'circular-deps',
        severity: 'medium',
        count: this.circularDeps.length,
        message: `Found ${this.circularDeps.length} circular dependenc(ies). Consider refactoring.`,
        paths: this.circularDeps,
      });
    }

    // Potential savings
    if (this.stats.estimatedSavings > 0) {
      recommendations.push({
        type: 'estimated-savings',
        severity: 'info',
        bytes: this.stats.estimatedSavings,
        message: `Potential savings: ${this._formatBytes(this.stats.estimatedSavings)}`,
      });
    }

    return recommendations;
  }

  /**
   * Log results to console
   * @private
   */
  _logResults(report) {
    console.log(chalk.green('\n✓ Tree-shaking analysis complete\n'));

    console.log(chalk.blue('📊 Statistics:\n'));
    console.log(chalk.gray(`  Total modules: ${report.stats.totalModules}`));
    console.log(chalk.gray(`  Used modules: ${report.stats.usedModules}`));
    console.log(chalk.gray(`  Unused modules: ${report.stats.unusedModules}`));
    console.log(chalk.gray(`  Total exports: ${report.stats.totalExports}`));
    console.log(chalk.gray(`  Used exports: ${report.stats.usedExports}`));
    console.log(chalk.gray(`  Unused exports: ${report.stats.unusedExports}`));
    console.log(chalk.gray(`  Estimated savings: ${this._formatBytes(report.stats.estimatedSavings)}`));
    console.log(chalk.gray(`  Analysis time: ${report.stats.analyzedTime.toFixed(2)}ms\n`));

    // Display recommendations
    if (report.recommendations.length > 0) {
      console.log(chalk.blue('💡 Recommendations:\n'));

      report.recommendations.forEach(rec => {
        const color = rec.severity === 'high' ? chalk.red :
          rec.severity === 'medium' ? chalk.yellow :
            chalk.blue;

        console.log(color(`  ${rec.message}`));

        if (rec.modules && rec.modules.length > 0) {
          rec.modules.slice(0, 5).forEach(mod => {
            console.log(chalk.gray(`    - ${mod}`));
          });
          if (rec.modules.length > 5) {
            console.log(chalk.gray(`    ... and ${rec.modules.length - 5} more`));
          }
        }

        console.log();
      });
    }

    // Circular dependencies
    if (report.circularDependencies.length > 0) {
      console.log(chalk.yellow(`⚠ Circular Dependencies:\n`));

      report.circularDependencies.slice(0, 5).forEach(path => {
        console.log(chalk.gray(`  ${path.join(' → ')}`));
      });

      if (report.circularDependencies.length > 5) {
        console.log(chalk.gray(`  ... and ${report.circularDependencies.length - 5} more\n`));
      }
    }
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
   * Get detailed analysis of specific module
   */
  analyzeModule(modulePath) {
    const module = this.modules.get(modulePath);

    if (!module) {
      return null;
    }

    const imports = this.imports.get(modulePath) || [];
    const exports = this.exports.get(modulePath) || new Map();

    const usedExports = Array.from(exports.keys()).filter(
      exp => this.usedExports.has(`${modulePath}#${exp}`)
    );

    const unusedExports = Array.from(exports.keys()).filter(
      exp => !this.usedExports.has(`${modulePath}#${exp}`)
    );

    return {
      path: module.path,
      size: module.size,
      hasSideEffects: module.hasSideEffects,
      imports: imports.length,
      exports: exports.size,
      usedExports: usedExports.length,
      unusedExports: unusedExports.length,
      isOrphan: this.orphanModules.has(modulePath),
      exportDetails: {
        used: usedExports,
        unused: unusedExports,
      },
    };
  }

  /**
   * Get all unused exports
   */
  getUnusedExports() {
    return Array.from(this.unusedExports);
  }

  /**
   * Get all orphan modules
   */
  getOrphanModules() {
    return Array.from(this.orphanModules);
  }

  /**
   * Get all circular dependencies
   */
  getCircularDependencies() {
    return this.circularDeps;
  }

  /**
   * Get module statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Print detailed report
   */
  printDetailedReport() {
    console.log(chalk.blue('\n🌳 Detailed Tree-Shaking Report\n'));

    // Unused exports by file
    console.log(chalk.blue('Unused Exports by File:\n'));
    const unusedByFile = new Map();

    for (const unused of this.unusedExports) {
      const [file, exp] = unused.split('#');
      if (!unusedByFile.has(file)) {
        unusedByFile.set(file, []);
      }
      unusedByFile.get(file).push(exp);
    }

    for (const [file, exps] of unusedByFile) {
      console.log(chalk.gray(`  ${file}:`));
      exps.forEach(exp => {
        console.log(chalk.gray(`    - ${exp}`));
      });
    }

    // Orphan modules with sizes
    if (this.orphanModules.size > 0) {
      console.log(chalk.blue('\nOrphan Modules:\n'));

      const orphans = Array.from(this.orphanModules)
        .map(key => ({
          key,
          size: this.modules.get(key)?.size || 0,
        }))
        .sort((a, b) => b.size - a.size);

      orphans.forEach(orphan => {
        console.log(
          chalk.gray(
            `  ${orphan.key.padEnd(40)} ${this._formatBytes(orphan.size)}`
          )
        );
      });
    }

    console.log();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TreeShaker,
  SAFE_GLOBALS,
  SIDE_EFFECT_PATTERNS,
};
