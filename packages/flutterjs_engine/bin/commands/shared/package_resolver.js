/**
 * ============================================================================
 * Shared Package Resolver - Centralized Package Location Resolution
 * ============================================================================
 * 
 * Single source of truth for finding packages from any source:
 * - SDK packages (@flutterjs/*)
 * - npm packages (node_modules)
 * - Local packages (packages/)
 * 
 * Used by: DependencyResolver, PackageInstaller, PackageCollector
 * Location: cli/build/shared/package-resolver.js
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// SEARCH PATH CONFIGURATION
// ============================================================================

/**
 * Standard search paths for packages
 * Order matters - earlier paths take precedence
 */
const STANDARD_SEARCH_PATHS = (projectRoot, scopedName, packageName) => [
  // SDK packages - highest priority
  path.join(projectRoot, 'packages', 'flutterjs_engine', 'src', scopedName),
  path.join(projectRoot, 'packages', 'flutterjs_engine', 'package', scopedName),

  // Local packages
  path.join(projectRoot, 'src', scopedName),
  path.join(projectRoot, 'packages', `flutterjs-${scopedName}`),
  path.join(projectRoot, 'packages', scopedName),

  // Node modules
  path.join(projectRoot, 'node_modules', packageName),
  path.join(projectRoot, 'node_modules', '@flutterjs', scopedName),
];

// ============================================================================
// MAIN PACKAGE RESOLVER
// ============================================================================

class PackageResolver {
  constructor(projectRoot = process.cwd(), options = {}) {
    this.projectRoot = projectRoot;
    this.debugMode = options.debugMode || false;
    this.cache = new Map(); // Cache resolved paths

    // Find root directories once
    this.sdkRoot = this.findSDKRoot();
    this.nodeModulesRoot = this.findNodeModulesRoot();
    this.localPackagesRoot = path.join(projectRoot, 'packages');
  }

  /**
   * Main entry point - resolve package from any source (auto-detect)
   */
  resolve(packageName) {
    if (!packageName) return null;

    // Check cache first
    if (this.cache.has(packageName)) {
      return this.cache.get(packageName);
    }

    let result = null;

    // Try SDK first (@flutterjs/*)
    if (packageName.startsWith('@flutterjs/')) {
      result = this.resolveSdk(packageName);
      if (result) {
        this.cache.set(packageName, result);
        return result;
      }
    }

    // Try npm registry (node_modules)
    result = this.resolveRegistry(packageName);
    if (result) {
      this.cache.set(packageName, result);
      return result;
    }

    // Try local packages
    result = this.resolveLocal(packageName);
    if (result) {
      this.cache.set(packageName, result);
      return result;
    }

    return null;
  }

  /**
   * Resolve SDK package (@flutterjs/*)
   */
  resolveSdk(packageName) {
    if (!packageName.startsWith('@flutterjs/')) {
      return null;
    }

    const scopedName = packageName.replace('@flutterjs/', '');
    const searchPaths = STANDARD_SEARCH_PATHS(
      this.projectRoot,
      scopedName,
      packageName
    );

    for (const searchPath of searchPaths) {
      if (this.isValidPackage(searchPath)) {
        if (this.debugMode) {
          console.log(`✓ Found SDK package: ${packageName} at ${searchPath}`);
        }
        return { path: searchPath, source: 'sdk' };
      }
    }

    return null;
  }

  /**
   * Resolve npm registry package
   */
  resolveRegistry(packageName) {
    const pkgPath = path.join(this.nodeModulesRoot, packageName);

    if (this.isValidPackage(pkgPath)) {
      if (this.debugMode) {
        console.log(`✓ Found npm package: ${packageName} at ${pkgPath}`);
      }
      return { path: pkgPath, source: 'npm' };
    }

    return null;
  }

  /**
   * Resolve local package (packages/ directory)
   */
  resolveLocal(packageName) {
    const pkgPath = path.join(this.localPackagesRoot, packageName);

    if (this.isValidPackage(pkgPath)) {
      if (this.debugMode) {
        console.log(`✓ Found local package: ${packageName} at ${pkgPath}`);
      }
      return { path: pkgPath, source: 'local' };
    }

    return null;
  }

  /**
   * Check if directory is a valid package (has package.json)
   */
  isValidPackage(packagePath) {
    if (!fs.existsSync(packagePath)) {
      return false;
    }

    const pkgJsonPath = path.join(packagePath, 'package.json');
    return fs.existsSync(pkgJsonPath);
  }

  /**
   * Find SDK root by searching upward
   * Looks for packages/flutterjs_engine/src or packages/flutterjs_engine/package
   */
  findSDKRoot() {
    let current = this.projectRoot;
    const visited = new Set();
    const maxLevels = 10;

    for (let i = 0; i < maxLevels; i++) {
      if (visited.has(current)) break;
      visited.add(current);

      // Check flutterjs_engine/src
      const srcPath = path.join(current, 'packages', 'flutterjs_engine', 'src');
      if (this.hasPackages(srcPath)) {
        if (this.debugMode) {
          console.log(`✓ Found SDK root at: ${srcPath}`);
        }
        return srcPath;
      }

      // Check flutterjs_engine/package
      const packagePath = path.join(current, 'packages', 'flutterjs_engine', 'package');
      if (this.hasPackages(packagePath)) {
        if (this.debugMode) {
          console.log(`✓ Found SDK root at: ${packagePath}`);
        }
        return packagePath;
      }

      // Check /src at root
      const projectSrc = path.join(current, 'src');
      if (this.hasPackages(projectSrc)) {
        if (this.debugMode) {
          console.log(`✓ Found SDK root at: ${projectSrc}`);
        }
        return projectSrc;
      }

      // Move up one directory
      const parent = path.dirname(current);
      if (parent === current) break; // Reached filesystem root
      current = parent;
    }

    // Fallback
    return path.join(this.projectRoot, 'packages', 'flutterjs_engine', 'src');
  }

  /**
   * Find node_modules root by searching upward
   */
  findNodeModulesRoot() {
    let current = this.projectRoot;
    const visited = new Set();
    const maxLevels = 10;

    for (let i = 0; i < maxLevels; i++) {
      if (visited.has(current)) break;
      visited.add(current);

      const nodeModulesPath = path.join(current, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        if (this.debugMode) {
          console.log(`✓ Found node_modules at: ${nodeModulesPath}`);
        }
        return nodeModulesPath;
      }

      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }

    // Fallback
    return path.join(this.projectRoot, 'node_modules');
  }

  /**
   * Check if directory contains packages (has subdirs with package.json)
   */
  hasPackages(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return false;
    }

    try {
      const entries = fs.readdirSync(dirPath);
      return entries.some(entry => {
        const entryPath = path.join(dirPath, entry);
        return fs.existsSync(path.join(entryPath, 'package.json'));
      });
    } catch {
      return false;
    }
  }

  /**
   * List all available packages
   */
  listPackages(type = 'all') {
    const packages = [];

    if (type === 'all' || type === 'sdk') {
      packages.push(...this.listSdkPackages());
    }

    if (type === 'all' || type === 'npm') {
      packages.push(...this.listNpmPackages());
    }

    if (type === 'all' || type === 'local') {
      packages.push(...this.listLocalPackages());
    }

    return packages;
  }

  /**
   * List SDK packages
   */
  listSdkPackages() {
    return this.listPackagesInDir(this.sdkRoot, 'sdk');
  }

  /**
   * List npm packages
   */
  listNpmPackages() {
    return this.listPackagesInDir(this.nodeModulesRoot, 'npm');
  }

  /**
   * List local packages
   */
  listLocalPackages() {
    return this.listPackagesInDir(this.localPackagesRoot, 'local');
  }

  /**
   * List all packages in a directory
   */
  listPackagesInDir(dirPath, type) {
    const packages = [];

    if (!fs.existsSync(dirPath)) {
      return packages;
    }

    try {
      const entries = fs.readdirSync(dirPath);

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const pkgJsonPath = path.join(entryPath, 'package.json');

        if (fs.existsSync(pkgJsonPath)) {
          try {
            const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
            packages.push({
              name: pkgJson.name || entry,
              version: pkgJson.version || '0.0.0',
              path: entryPath,
              type,
              description: pkgJson.description || ''
            });
          } catch {
            // Skip invalid package.json
          }
        }
      }
    } catch {
      // Skip if directory not readable
    }

    return packages;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cached: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PackageResolver, STANDARD_SEARCH_PATHS };
export default PackageResolver;