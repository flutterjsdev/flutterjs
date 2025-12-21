/**
 * ============================================================================
 * FlutterJS Dependency Resolver - Complete Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Resolves all imports from source code
 * - Finds package files in node_modules
 * - Builds dependency graph with cycles detection
 * - Validates all dependencies are available
 * - Generates resolution map for code transformation
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
    this.name = name;                    // '@flutterjs/material'
    this.type = type;                    // 'builtin' | 'npm' | 'local'
    this.packagePath = packagePath;      // Absolute path to package
    this.packageJson = null;             // Parsed package.json
    this.main = null;                    // Main entry file
    this.exports = new Map();            // Named exports: 'Container' -> 'container.js'
    this.dependencies = [];              // Direct dependencies
    this.files = [];                     // All files in package
    this.errors = [];                    // Validation errors
  }

  isValid() {
    return this.errors.length === 0 && this.packageJson !== null;
  }

  addError(message) {
    this.errors.push(message);
  }

  addExport(name, filePath) {
    this.exports.set(name, filePath);
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
    this.packages = new Map();           // name -> ResolvedPackage
    this.graph = new Map();              // Dependency graph
    this.allFiles = [];                  // All files to include
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
// MAIN RESOLVER CLASS
// ============================================================================

class DependencyResolver {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      debugMode: config.debugMode || false,
      validateVersions: config.validateVersions !== false,
      ignoreMissing: config.ignoreMissing || false,
      ...config
    };

    this.projectRoot = this.config.projectRoot;
    this.cache = new Map();              // name -> ResolvedPackage
    this.visited = new Set();            // For cycle detection
    this.resolvingStack = [];            // Stack for cycle detection
    this.result = new ResolutionResult();
  }

  /**
  * FIX for DependencyResolver.resolveAll()
  * 
  * The problem: importStatements parameter is coming in wrong format
  * Solution: Add normalization at the start of resolveAll()
  */

  /**
   * MAIN ENTRY POINT: Resolve all imports
   * FIXED: Now handles multiple input formats
   */
  async resolveAll(importStatements) {
    const startTime = Date.now();

    // ===== CRITICAL FIX: Normalize input =====
    importStatements = this.normalizeInput(importStatements);

    if (this.config.debugMode) {
      console.log(chalk.gray('\nðŸ" Starting dependency resolution...\n'));
      console.log(chalk.gray(`Input type: ${typeof importStatements}`));
      console.log(chalk.gray(`Is array: ${Array.isArray(importStatements)}`));
      console.log(chalk.gray(`Length: ${importStatements.length}`));
    }

    try {
      // Validate we have an iterable
      if (!Array.isArray(importStatements)) {
        console.error('importStatements after normalization:', importStatements);
        throw new Error(`importStatements must be an array, got ${typeof importStatements}`);
      }

      // Collect all unique import sources
      const sources = new Set();

      for (const imp of importStatements) {
        // Extract source from different formats
        const source = imp?.source || imp?.from || imp?.module || (typeof imp === 'string' ? imp : null);

        if (source) {
          sources.add(source);
        }
      }

      if (this.config.debugMode) {
        console.log(chalk.gray(`Found ${sources.size} unique imports:`));
        for (const source of sources) {
          console.log(chalk.gray(`  â€¢ ${source}`));
        }
        console.log();
      }

      // Resolve each import recursively
      for (const source of sources) {
        if (!this.visited.has(source)) {
          await this.resolveOne(source);
        }
      }

      // Validate resolution
      this.validateResolution();

      // Collect all files
      this.collectAllFiles();

      // Build dependency graph
      this.buildDependencyGraph();

      this.result.resolvedTime = Date.now() - startTime;

      if (this.config.debugMode) {
        this.printResolutionSummary();
      }

      return this.result;

    } catch (error) {
      this.result.addError(`Resolution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * NORMALIZE INPUT - Handle any format
   */
  normalizeInput(input) {
    // Null/undefined
    if (!input) {
      return [];
    }

    // Already an array
    if (Array.isArray(input)) {
      return input;
    }

    // Object with values
    if (typeof input === 'object') {
      console.error('[DependencyResolver] Received object instead of array:', Object.keys(input).slice(0, 5));
      return Object.values(input);
    }

    // Single string
    if (typeof input === 'string') {
      return [input];
    }

    console.error('[DependencyResolver] Unknown input type:', typeof input, input);
    return [];
  }

  /**
   * Extract source from import object (multiple formats supported)
   */
  extractSource(imp) {
    if (!imp) return null;
    if (typeof imp === 'string') return imp;

    return imp.source     // DependencyResolver format
      || imp.from       // Analyzer format
      || imp.module     // Alternative format
      || imp.name       // Another alternative
      || null;
  }

  /**
   * Updated resolveOne to use extractSource
   */
  async resolveOne(packageName, depth = 0) {
    const indent = '  '.repeat(depth);

    // Check if already resolved
    if (this.cache.has(packageName)) {
      if (this.config.debugMode && depth === 0) {
        console.log(chalk.green(`${indent}âœ" ${packageName} (cached)`));
      }
      return this.cache.get(packageName);
    }

    // Check for circular dependencies
    if (this.resolvingStack.includes(packageName)) {
      const cycle = [...this.resolvingStack, packageName].join(' -> ');
      const message = `Circular dependency detected: ${cycle}`;
      this.result.addError(message);
      throw new Error(message);
    }

    this.resolvingStack.push(packageName);

    try {
      if (this.config.debugMode && depth === 0) {
        console.log(chalk.blue(`${indent}Resolving ${packageName}...`));
      }

      // Determine package type and location
      let resolved = await this.resolveByType(packageName);

      if (!resolved) {
        throw new Error(`Cannot resolve: ${packageName}`);
      }

      // Cache result
      this.cache.set(packageName, resolved);  // Use packageName directly
      this.result.addPackage(resolved);

      if (this.config.debugMode && depth === 0) {
        console.log(chalk.green(`${indent}âœ" ${packageName}\n`));
      }

      // Recursively resolve dependencies
      if (resolved.dependencies && resolved.dependencies.length > 0) {
        for (const dep of resolved.dependencies) {
          if (!this.visited.has(dep)) {
            await this.resolveOne(dep, depth + 1);
            this.visited.add(dep);
          }
        }
      }

      this.visited.add(packageName);
      return resolved;

    } catch (error) {
      this.result.addError(`Failed to resolve ${packageName}: ${error.message}`);
      // Don't re-throw, allow build to continue
      return null;
    } finally {
      this.resolvingStack.pop();
    }
  }

  /**
   * Resolve package by type
   */
  async resolveByType(packageName) {
    // Built-in @flutterjs packages
    if (packageName.startsWith('@flutterjs/')) {
      return await this.resolveBuiltin(packageName);
    }

    // Local packages (relative paths)
    if (packageName.startsWith('.')) {
      return await this.resolveLocal(packageName);
    }

    // NPM packages
    return await this.resolveNPM(packageName);
  }

  /**
   * Resolve @flutterjs/* builtin packages
   */
  async resolveBuiltin(packageName) {
    const packagePath = this.getBuiltinPath(packageName);

    if (!fs.existsSync(packagePath)) {
      const message = `Built-in package not found: ${packageName}\n` +
        `Expected at: ${packagePath}`;

      if (this.config.ignoreMissing) {
        this.result.addWarning(message);
        return null;
      }

      throw new Error(message);
    }

    return await this.loadPackageMetadata(packageName, packagePath, 'builtin');
  }

  /**
   * Resolve local packages
   */
  async resolveLocal(packageName) {
    const packagePath = path.resolve(this.projectRoot, packageName);

    if (!fs.existsSync(packagePath)) {
      const message = `Local package not found: ${packageName}\n` +
        `Expected at: ${packagePath}`;

      if (this.config.ignoreMissing) {
        this.result.addWarning(message);
        return null;
      }

      throw new Error(message);
    }

    return await this.loadPackageMetadata(packageName, packagePath, 'local');
  }

  /**
   * Resolve npm packages from node_modules
   */
  async resolveNPM(packageName) {
    const packagePath = path.join(
      this.projectRoot,
      'node_modules',
      packageName
    );

    if (!fs.existsSync(packagePath)) {
      const message = `NPM package not found: ${packageName}\n` +
        `Expected at: ${packagePath}\n` +
        `Install with: npm install ${packageName}`;

      if (this.config.ignoreMissing) {
        this.result.addWarning(message);
        return null;
      }

      throw new Error(message);
    }

    return await this.loadPackageMetadata(packageName, packagePath, 'npm');
  }

  /**
   * Load and parse package metadata
   */
  async loadPackageMetadata(packageName, packagePath, type) {
    const resolved = new ResolvedPackage(packageName, type, packagePath);

    try {
      // Read package.json
      const packageJsonPath = path.join(packagePath, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        resolved.addError(`Missing package.json at ${packageJsonPath}`);
        return resolved;
      }

      const jsonContent = await fs.promises.readFile(packageJsonPath, 'utf-8');
      resolved.packageJson = JSON.parse(jsonContent);

      // Get main entry point
      resolved.main = resolved.packageJson.main || 'index.js';

      // Extract exports mapping
      await this.extractExports(resolved);

      // Get dependencies
      resolved.dependencies = this.extractDependencies(resolved.packageJson);

      // List all files
      resolved.files = await this.listPackageFiles(packagePath);

      if (this.config.debugMode) {
        console.log(chalk.gray(`  Package: ${packageName}`));
        console.log(chalk.gray(`    Main: ${resolved.main}`));
        console.log(chalk.gray(`    Exports: ${resolved.exports.size}`));
        console.log(chalk.gray(`    Dependencies: ${resolved.dependencies.length}`));
        console.log(chalk.gray(`    Files: ${resolved.files.length}`));
      }

      return resolved;

    } catch (error) {
      resolved.addError(`Failed to load metadata: ${error.message}`);
      return resolved;
    }
  }

  /**
   * Extract exports from package
   */
  async extractExports(resolved) {
    // Check package.json exports field first
    if (resolved.packageJson.exports && typeof resolved.packageJson.exports === 'object') {
      for (const [key, value] of Object.entries(resolved.packageJson.exports)) {
        if (typeof value === 'string') {
          resolved.addExport(key.replace('./', ''), value);
        }
      }
      return;
    }

    // Fallback: scan for .js files and treat as exports
    const libDir = path.join(resolved.packagePath, 'lib');
    const srcDir = path.join(resolved.packagePath, 'src');

    for (const dir of [libDir, srcDir, resolved.packagePath]) {
      if (fs.existsSync(dir)) {
        const files = await fs.promises.readdir(dir);

        for (const file of files) {
          if (file.endsWith('.js') && !file.startsWith('_')) {
            const name = file.replace('.js', '');
            // Capitalize first letter (Container, Center, etc.)
            const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
            resolved.addExport(capitalName, file);
          }
        }
      }
    }

    // Always add index as re-export
    if (fs.existsSync(path.join(resolved.packagePath, 'index.js'))) {
      resolved.addExport('default', 'index.js');
    }
  }

  /**
   * Extract dependencies from package.json
   */
  extractDependencies(packageJson) {
    const deps = [];

    // Add regular dependencies
    if (packageJson.dependencies) {
      deps.push(...Object.keys(packageJson.dependencies));
    }

    // Add peer dependencies (should be installed)
    if (packageJson.peerDependencies) {
      for (const dep of Object.keys(packageJson.peerDependencies)) {
        if (!deps.includes(dep)) {
          deps.push(dep);
        }
      }
    }

    return deps;
  }

  /**
   * List all files in package (recursive)
   */
  async listPackageFiles(packagePath) {
    const files = [];
    const ignore = new Set([
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.DS_Store',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml'
    ]);

    async function traverse(dir, relativePath = '') {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          // Skip hidden files and ignored directories
          if (entry.name.startsWith('.') || ignore.has(entry.name)) {
            continue;
          }

          const fullPath = path.join(dir, entry.name);
          const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

          if (entry.isFile()) {
            // Include JS and JSON files only
            if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
              files.push({
                path: fullPath,
                relative: relPath,
                name: entry.name
              });
            }
          } else if (entry.isDirectory()) {
            await traverse(fullPath, relPath);
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dir}: ${error.message}`);
      }
    }

    await traverse(packagePath);
    return files;
  }

  /**
   * Get path to builtin package
   */
  getBuiltinPath(packageName) {
    // Extract package name: @flutterjs/material -> material
    const name = packageName.replace('@flutterjs/', '');

    // Look in framework packages directory
    const builtinRoot = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../../packages'
    );

    return path.join(builtinRoot, name);
  }

  /**
   * Validate resolution results
   */
  validateResolution() {
    if (this.config.debugMode) {
      console.log(chalk.blue('\n🔍 Validating resolution...\n'));
    }

    for (const [name, resolved] of this.cache) {
      // Check for package errors
      if (!resolved.isValid()) {
        this.result.addError(`Invalid package: ${name}`);
        for (const error of resolved.errors) {
          this.result.addError(`  • ${error}`);
        }
      }

      // Warn if no exports found
      if (resolved.exports.size === 0) {
        this.result.addWarning(`Package ${name} has no exports defined`);
      }

      // Warn about large packages
      if (resolved.files.length > 1000) {
        this.result.addWarning(
          `Package ${name} is large (${resolved.files.length} files)`
        );
      }
    }

    if (this.config.debugMode && this.result.errors.length === 0) {
      console.log(chalk.green('✓ All packages valid\n'));
    }
  }

  /**
   * Collect all files from all packages
   */
  collectAllFiles() {
    const uniqueFiles = new Map();

    for (const resolved of this.cache.values()) {
      for (const file of resolved.files) {
        // Use absolute path as key to avoid duplicates
        uniqueFiles.set(file.path, file);
      }
    }

    this.result.allFiles = Array.from(uniqueFiles.values());

    if (this.config.debugMode) {
      console.log(chalk.blue(`\n📦 Collected ${this.result.allFiles.length} files\n`));
    }
  }

  /**
   * Build dependency graph
   */
  buildDependencyGraph() {
    for (const [name, resolved] of this.cache) {
      this.result.graph.set(name, {
        package: resolved,
        dependencies: resolved.dependencies,
        dependents: []
      });
    }

    // Link dependents
    for (const [name, node] of this.result.graph) {
      for (const dep of node.dependencies) {
        if (this.result.graph.has(dep)) {
          this.result.graph.get(dep).dependents.push(name);
        }
      }
    }
  }

  /**
   * Print resolution summary
   */
  printResolutionSummary() {
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.blue('RESOLUTION SUMMARY'));
    console.log(chalk.blue('='.repeat(60)));
    console.log(chalk.gray(`\nResolved Packages (${this.cache.size}):`));

    for (const [name, resolved] of this.cache) {
      const icon = resolved.isValid() ? chalk.green('✓') : chalk.red('✗');
      console.log(
        `${icon} ${name.padEnd(40)} ${chalk.gray(`[${resolved.type}]`)}`
      );
      console.log(
        chalk.gray(`    Exports: ${resolved.exports.size}, Files: ${resolved.files.length}`)
      );
    }

    console.log(chalk.gray(`\nTotal Files: ${this.result.allFiles.length}`));
    console.log(chalk.gray(`Errors: ${this.result.errors.length}`));
    console.log(chalk.gray(`Warnings: ${this.result.warnings.length}`));
    console.log(chalk.gray(`Time: ${this.result.resolvedTime}ms`));

    if (this.result.errors.length > 0) {
      console.log(chalk.red('\n⚠️  ERRORS:'));
      for (const error of this.result.errors) {
        console.log(chalk.red(`  • ${error}`));
      }
    }

    if (this.result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  WARNINGS:'));
      for (const warning of this.result.warnings) {
        console.log(chalk.yellow(`  • ${warning}`));
      }
    }

    console.log(chalk.blue('\n' + '='.repeat(60) + '\n'));
  }

  /**
   * Get resolution map for code transformation
   */
  getResolutionMap() {
    const map = new Map();

    for (const [name, resolved] of this.cache) {
      map.set(name, {
        type: resolved.type,
        path: resolved.packagePath,
        main: resolved.main,
        exports: Object.fromEntries(resolved.exports),
        files: resolved.files,
        dependencies: resolved.dependencies
      });
    }

    return map;
  }

  /**
   * Get all files for bundling
   */
  getAllFiles() {
    return this.result.allFiles;
  }

  /**
   * Find which package exports a symbol
   */
  findExportingPackage(symbolName) {
    for (const [name, resolved] of this.cache) {
      if (resolved.exports.has(symbolName)) {
        return {
          package: name,
          file: resolved.exports.get(symbolName)
        };
      }
    }
    return null;
  }

  /**
   * Validate import statement
   */
  validateImport(packageName, exportNames) {
    const resolved = this.cache.get(packageName);

    if (!resolved) {
      return {
        valid: false,
        error: `Package not found: ${packageName}`
      };
    }

    if (!resolved.isValid()) {
      return {
        valid: false,
        error: `Invalid package: ${packageName}`
      };
    }

    const missing = [];
    for (const name of exportNames) {
      if (!resolved.exports.has(name)) {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        error: `${packageName} does not export: ${missing.join(', ')}`
      };
    }

    return { valid: true };
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