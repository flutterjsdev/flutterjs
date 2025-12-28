/**
 * ============================================================================
 * FlutterJS Dependency Resolver - FIXED VERSION
 * ============================================================================
 * 
 * Purpose:
 * - Resolves all imports from analyzer result
 * - Finds packages in src/ or package/ folders
 * - Copies packages to dist/node_modules/@flutterjs/
 * - Validates all dependencies are available
 * 
 * Location: cli/build/dependency-resolver.js
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// ============================================================================
// RESOLUTION DATA TYPES
// ============================================================================

/**
 * Single resolved package metadata
 */
class ResolvedPackage {
  constructor(name, type, packagePath) {
    this.name = name;
    this.type = type;
    this.packagePath = packagePath;
    this.packageJson = null;
    this.main = null;
    this.exports = new Map();
    this.dependencies = [];
    this.files = [];
    this.errors = [];
  }

  isValid() {
    return this.errors.length === 0 && this.packagePath !== null;
  }

  addError(message) {
    this.errors.push(message);
  }

  toString() {
    return `${this.name} (${this.type}) @ ${this.packagePath}`;
  }
}

/**
 * Complete resolution result
 */
class ResolutionResult {
  constructor() {
    this.packages = new Map();
    this.graph = new Map();
    this.allFiles = [];
    this.errors = [];
    this.warnings = [];
    this.resolvedTime = null;
  }

  addPackage(resolvedPackage) {
    this.packages.set(resolvedPackage.name, resolvedPackage);
  }

  getPackage(name) {
    return this.packages.get(name);
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  hasErrors() {
    return this.errors.length > 0 ||
      Array.from(this.packages.values()).some(pkg => !pkg.isValid());
  }

  toString() {
    const summary = `
Resolved ${this.packages.size} packages
- Errors: ${this.errors.length}
- Warnings: ${this.warnings.length}
- Total Files: ${this.allFiles.length}
    `;
    return summary.trim();
  }
}

// ============================================================================
// MAIN RESOLVER CLASS - FIXED
// ============================================================================
class DependencyResolver {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      debugMode: options.debugMode || false,
      ...options,
    };

    // âœ… FIND THE ACTUAL SDK ROOT by searching upward
    const sdkRoot = this.findSDKRoot(this.options.projectRoot);

    this.srcRoot = path.join(sdkRoot, 'src');
    this.packageRoot = path.join(sdkRoot, 'package');
    this.outputDir = path.join(this.options.projectRoot, options.outputDir || 'dist');
    this.nodeModulesDir = path.join(this.outputDir, 'node_modules', '@flutterjs');

    if (this.options.debugMode) {
      console.log(chalk.cyan('\n[DependencyResolver] Initialized'));
      console.log(chalk.gray(`  Project: ${this.options.projectRoot}`));
      console.log(chalk.gray(`  SDK Root: ${sdkRoot}`));
      console.log(chalk.gray(`  Src Root: ${this.srcRoot}`));
      console.log(chalk.gray(`  Package Root: ${this.packageRoot}`));
      console.log(chalk.gray(`  Output: ${this.nodeModulesDir}\n`));
    }
  }

  /**
   * Search upward to find flutterjs_engine/src and flutterjs_engine/package
   */
  findSDKRoot(startPath) {
    let current = startPath;
    const visited = new Set();
    const maxLevels = 15;

    for (let i = 0; i < maxLevels; i++) {
      if (visited.has(current)) break;
      visited.add(current);

      // Check if this directory has packages/flutterjs_engine
      const enginePath = path.join(current, 'packages', 'flutterjs_engine');
      if (fs.existsSync(enginePath)) {
        const srcPath = path.join(enginePath, 'src');
        const pkgPath = path.join(enginePath, 'package');

        if (fs.existsSync(srcPath) && fs.existsSync(pkgPath)) {
          if (this.options.debugMode) {
            console.log(chalk.gray(`[Found SDK at: ${enginePath}]`));
          }
          return enginePath;
        }
      }

      // Move up one directory
      const parent = path.dirname(current);
      if (parent === current) break; // Reached filesystem root
      current = parent;
    }

    // Fallback: return the best guess
    console.warn(chalk.yellow(`⚠️  Could not find flutterjs_engine, using relative path`));
    return path.join(startPath, '..', '..', 'packages', 'flutterjs_engine');
  }

  /**
   * Main entry point: Resolve from analyzer imports
   */
  async resolveAll(analyzerResult) {
    console.log(chalk.blue('\n📦 Phase 2: Resolving dependencies...'));
    console.log(chalk.blue('='.repeat(70)));

    try {
      // Extract packages from analyzer result
      const requiredPackages = this.extractPackages(analyzerResult);

      console.log(chalk.yellow(`\nFound ${requiredPackages.length} packages to resolve:`));
      requiredPackages.forEach(pkg => {
        console.log(chalk.gray(`  • ${pkg}`));
      });
      console.log();

      if (requiredPackages.length === 0) {
        console.log(chalk.yellow('⚠️  No @flutterjs/* packages found'));
        return this.createEmptyResult();
      }

      // Resolve each package
      const packages = new Map();
      const errors = [];

      for (const fullPackageName of requiredPackages) {
        const packageName = fullPackageName.split('/')[1]; // @flutterjs/runtime -> runtime

        const source = this.findPackageSource(packageName);

        if (!source) {
          errors.push(`Cannot find: ${fullPackageName}`);
          console.log(chalk.red(`  ✗ ${fullPackageName} NOT FOUND`));
          continue;
        }

        packages.set(fullPackageName, {
          name: fullPackageName,
          packageName: packageName,
          source: source.path,
          location: source.location,
          type: 'sdk',
          resolved: true
        });

        console.log(chalk.green(`  ✓ ${fullPackageName}`));
        console.log(chalk.gray(`    └─ ${source.location}`));
      }

      console.log(chalk.blue('='.repeat(70)));
      console.log(chalk.green(`✓ Resolved ${packages.size} packages\n`));

      return {
        packages,
        allFiles: Array.from(packages.values()).map(p => p.source),
        graph: new Map(),
        errors,
        warnings: errors.length > 0 ? [`${errors.length} packages not found`] : [],
      };

    } catch (error) {
      console.error(chalk.red(`\n✗ Resolution error: ${error.message}\n`));
      throw error;
    }
  }

  /**
   * Extract @flutterjs/* packages from analyzer result
   */
  extractPackages(analyzerResult) {
    const packages = new Set();

    if (!analyzerResult) {
      return Array.from(packages);
    }

    // Check imports object
    if (analyzerResult.imports && typeof analyzerResult.imports === 'object') {
      Object.keys(analyzerResult.imports).forEach(pkg => {
        if (pkg.startsWith('@flutterjs/')) {
          packages.add(pkg);
        }
      });
    }

    return Array.from(packages).sort();
  }

  /**
   * Find package in src/ or package/ folder
   * Returns { path, location } or null
   */
  findPackageSource(packageName) {
    console.log(chalk.cyan(`\n  Searching for: ${packageName}`));

    // Try src/ first
    const srcPath = path.join(this.srcRoot, packageName);
    console.log(chalk.gray(`    [1/2] Checking src/: ${srcPath}`));

    if (fs.existsSync(srcPath)) {
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        const files = fs.readdirSync(srcPath);
        console.log(chalk.green(`         ✓ FOUND (${files.length} items)`));
        return {
          path: srcPath,
          location: `src/${packageName}`
        };
      }
    }
    console.log(chalk.red(`         ✗ not found`));

    // Try package/ folder
    const pkgPath = path.join(this.packageRoot, packageName);
    console.log(chalk.gray(`    [2/2] Checking package/: ${pkgPath}`));

    if (fs.existsSync(pkgPath)) {
      const stat = fs.statSync(pkgPath);
      if (stat.isDirectory()) {
        const files = fs.readdirSync(pkgPath);
        console.log(chalk.green(`         ✓ FOUND (${files.length} items)`));
        return {
          path: pkgPath,
          location: `package/${packageName}`
        };
      }
    }
    console.log(chalk.red(`         ✗ not found`));

    return null;
  }

  /**
   * Create empty result
   */
  createEmptyResult() {
    return {
      packages: new Map(),
      allFiles: [],
      graph: new Map(),
      errors: [],
      warnings: ['No packages to resolve'],
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DependencyResolver,
  ResolvedPackage,
  ResolutionResult
};