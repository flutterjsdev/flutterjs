/**
 * Advanced Import Resolver for Flutter.js Framework
 * 
 * Resolution Chain:
 * 1. Check framework package mappings (@package:)
 * 2. Check local project code (./src, ./lib, etc.)
 * 3. Check package cache (future: npm_modules, pub_cache, etc.)
 * 4. Return error if not found
 */

import fs from 'fs';
import path from 'path';

class ImportResolver {
  constructor(options = {}) {
    this.options = {
      projectRoot: process.cwd(),
      frameworkType: 'flutter-js',
      ignoreUnresolved: false,        // Fail on missing imports
      cacheEnabled: false,            // Enable package cache checking
      ...options,
    };

    // Framework package mappings
    this.frameworkPackages = {
      '@package:flutter': 'flutter-js-framework/core',
      '@package:material': 'flutter-js-framework/material',
      '@package:cupertino': 'flutter-js-framework/cupertino',
      '@package:foundation': 'flutter-js-framework/foundation',
      '@package:widgets': 'flutter-js-framework/widgets',
      '@package:painting': 'flutter-js-framework/painting',
      '@package:rendering': 'flutter-js-framework/rendering',
      '@package:animation': 'flutter-js-framework/animation',
    };

    // User-defined custom package mappings
    this.customPackageMappings = {};

    // Resolution cache
    this.resolvedCache = new Map();
    this.unresolvedCache = new Map();

    // Local search paths (where to look for local code)
    this.localSearchPaths = [
      'src',
      'lib',
      'packages',
      'modules',
      '.',
    ];

    this.results = {
      resolved: [],
      unresolved: [],
      errors: [],
    };
  }

  /**
   * Main resolution entry point
   * Tries multiple fallback locations
   */
  resolve(importPath, importedItems = [], options = {}) {
    // Check cache first
    const cacheKey = `${importPath}:${JSON.stringify(importedItems)}`;
    if (this.resolvedCache.has(cacheKey)) {
      return this.resolvedCache.get(cacheKey);
    }
    if (this.unresolvedCache.has(cacheKey)) {
      return this.unresolvedCache.get(cacheKey);
    }

    const result = {
      original: importPath,
      items: importedItems,
      resolved: null,
      actualPath: null,
      type: null,
      source: null,        // Where it was found: 'framework', 'local', 'cache', 'error'
      isValid: false,
      reason: null,
      fallbacks: [],       // Track what was tried
    };

    // STEP 1: Check if it's a framework package (@package:)
    if (importPath.startsWith('@package:')) {
      const stepResult = this.resolveFrameworkPackage(importPath, importedItems);
      if (stepResult.isValid) {
        result.resolved = stepResult.resolved;
        result.actualPath = stepResult.actualPath;
        result.type = 'framework';
        result.source = 'framework';
        result.isValid = true;
        result.reason = 'Resolved from framework mappings';
        this.resolvedCache.set(cacheKey, result);
        this.results.resolved.push(result);
        return result;
      }
      result.fallbacks.push({
        step: 1,
        tried: 'framework-package',
        found: false,
        reason: stepResult.reason,
      });
    }

    // STEP 2: Check local project code
    if (!importPath.startsWith('@')) {
      const stepResult = this.resolveLocalImport(importPath, importedItems);
      if (stepResult.isValid) {
        result.resolved = stepResult.resolved;
        result.actualPath = stepResult.actualPath;
        result.type = 'local';
        result.source = 'local';
        result.isValid = true;
        result.reason = `Found in local project at ${stepResult.actualPath}`;
        this.resolvedCache.set(cacheKey, result);
        this.results.resolved.push(result);
        return result;
      }
      result.fallbacks.push({
        step: 2,
        tried: 'local-code',
        locations: stepResult.searchedLocations,
        found: false,
        reason: stepResult.reason,
      });
    }

    // STEP 3: Check package cache (future feature)
    if (this.options.cacheEnabled) {
      const stepResult = this.resolveFromCache(importPath, importedItems);
      if (stepResult.isValid) {
        result.resolved = stepResult.resolved;
        result.actualPath = stepResult.actualPath;
        result.type = 'cache';
        result.source = 'cache';
        result.isValid = true;
        result.reason = `Found in package cache at ${stepResult.actualPath}`;
        this.resolvedCache.set(cacheKey, result);
        this.results.resolved.push(result);
        return result;
      }
      result.fallbacks.push({
        step: 3,
        tried: 'package-cache',
        found: false,
        reason: stepResult.reason,
      });
    }

    // STEP 4: Not found - return error
    result.isValid = false;
    result.source = 'error';
    result.reason = this.generateErrorMessage(importPath, result.fallbacks);

    if (!this.options.ignoreUnresolved) {
      this.results.errors.push(result);
    }
    this.unresolvedCache.set(cacheKey, result);
    this.results.unresolved.push(result);

    return result;
  }

  /**
   * STEP 1: Resolve @package: framework imports
   */
  resolveFrameworkPackage(importPath, importedItems) {
    // Check framework packages
    if (this.frameworkPackages[importPath]) {
      return {
        isValid: true,
        resolved: this.frameworkPackages[importPath],
        actualPath: this.frameworkPackages[importPath],
        reason: 'Found in framework package mappings',
      };
    }

    // Check custom mappings
    if (this.customPackageMappings[importPath]) {
      return {
        isValid: true,
        resolved: this.customPackageMappings[importPath],
        actualPath: this.customPackageMappings[importPath],
        reason: 'Found in custom package mappings',
      };
    }

    return {
      isValid: false,
      reason: `Framework package "${importPath}" not found in mappings`,
    };
  }

  /**
   * STEP 2: Resolve local imports (./src/*, ./lib/*, etc.)
   * Tries multiple locations in project
   */
  resolveLocalImport(importPath, importedItems) {
    const searchedLocations = [];

    // For relative imports (./src/components)
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const fullPath = path.resolve(this.options.projectRoot, importPath);
      searchedLocations.push(fullPath);

      if (this.fileExists(fullPath)) {
        return {
          isValid: true,
          resolved: importPath,
          actualPath: fullPath,
          reason: 'Relative import found',
        };
      }

      // Try with .js extension
      if (this.fileExists(`${fullPath}.js`)) {
        return {
          isValid: true,
          resolved: importPath,
          actualPath: `${fullPath}.js`,
          reason: 'Relative import found (with .js)',
        };
      }

      return {
        isValid: false,
        searchedLocations,
        reason: `Relative import not found: ${importPath}`,
      };
    }

    // For absolute imports (components/Button)
    // Search in local paths: src/, lib/, packages/, etc.
    for (const searchPath of this.localSearchPaths) {
      const fullPath = path.resolve(
        this.options.projectRoot,
        searchPath,
        importPath
      );
      searchedLocations.push(fullPath);

      // Try as directory/index.js
      const indexPath = path.join(fullPath, 'index.js');
      if (this.fileExists(indexPath)) {
        return {
          isValid: true,
          resolved: importPath,
          actualPath: indexPath,
          reason: `Found in ${searchPath}/${importPath}/index.js`,
        };
      }

      // Try as file.js
      if (this.fileExists(`${fullPath}.js`)) {
        return {
          isValid: true,
          resolved: importPath,
          actualPath: `${fullPath}.js`,
          reason: `Found in ${searchPath}/${importPath}.js`,
        };
      }

      // Try as .fjs (Flutter.js file)
      if (this.fileExists(`${fullPath}.fjs`)) {
        return {
          isValid: true,
          resolved: importPath,
          actualPath: `${fullPath}.fjs`,
          reason: `Found in ${searchPath}/${importPath}.fjs`,
        };
      }
    }

    return {
      isValid: false,
      searchedLocations,
      reason: `Local import not found in: ${this.localSearchPaths.join(', ')}`,
    };
  }

  /**
   * STEP 3: Resolve from package cache (future implementation)
   * Can check: node_modules/, pub_cache/, etc.
   */
  resolveFromCache(importPath, importedItems) {
    // TODO: Implement package cache checking
    // For now, just return not found
    return {
      isValid: false,
      reason: 'Package cache resolution not yet implemented',
    };
  }

  /**
   * Check if file exists
   */
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate helpful error message showing what was tried
   */
  generateErrorMessage(importPath, fallbacks) {
    let message = `❌ Import not found: "${importPath}"\n\nResolution chain:\n`;

    fallbacks.forEach((step) => {
      message += `  ${step.step}. Checked ${step.tried}: NOT FOUND\n`;

      if (step.locations) {
        message += `     Locations searched:\n`;
        step.locations.forEach((loc) => {
          message += `       - ${loc}\n`;
        });
      }

      if (step.reason) {
        message += `     (${step.reason})\n`;
      }
    });

    message += `\nSuggestions:\n`;
    message += `  • Verify the import path is correct\n`;
    message += `  • Check that the file exists in your project\n`;
    message += `  • Add a custom package mapping if needed: addPackageMapping()\n`;

    return message;
  }

  /**
   * Resolve multiple imports at once
   */
  resolveImports(imports) {
    this.results = {
      resolved: [],
      unresolved: [],
      errors: [],
    };

    imports.forEach((imp) => {
      this.resolve(imp.source, imp.items);
    });

    return {
      imports: this.results,
      summary: this.getSummary(),
    };
  }

  /**
   * Add custom package mapping
   * Example: resolver.addPackageMapping('@package:ui', './packages/ui')
   */
  addPackageMapping(packageName, actualPath) {
    if (packageName.startsWith('@package:')) {
      this.customPackageMappings[packageName] = actualPath;
      console.log(`✓ Added mapping: ${packageName} → ${actualPath}`);
    } else {
      console.warn(`⚠ Custom mappings should start with @package:`);
    }
  }

  /**
   * Add multiple mappings at once
   */
  addPackageMappings(mappings) {
    Object.entries(mappings).forEach(([pkg, path]) => {
      this.addPackageMapping(pkg, path);
    });
  }

  /**
   * Get all mappings
   */
  getPackageMappings() {
    return {
      framework: this.frameworkPackages,
      custom: this.customPackageMappings,
    };
  }

  /**
   * Set local search paths
   * Example: resolver.setLocalSearchPaths(['src', 'lib', 'packages'])
   */
  setLocalSearchPaths(paths) {
    this.localSearchPaths = paths;
    console.log(`✓ Set local search paths: ${paths.join(', ')}`);
  }

  /**
   * Get resolution summary
   */
  getSummary() {
    const total = this.results.resolved.length + this.results.unresolved.length;
    const resolved = this.results.resolved.length;
    const unresolved = this.results.unresolved.length;

    return {
      total,
      resolved,
      unresolved,
      errors: this.results.errors.length,
      resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) + '%' : 'N/A',
      bySource: {
        framework: this.results.resolved.filter((r) => r.source === 'framework').length,
        local: this.results.resolved.filter((r) => r.source === 'local').length,
        cache: this.results.resolved.filter((r) => r.source === 'cache').length,
      },
    };
  }

  /**
   * Generate resolution report
   */
  generateReport() {
    const summary = this.getSummary();

    let report = `
╔════════════════════════════════════════════════════════════╗
║         IMPORT RESOLUTION REPORT                           ║
╚════════════════════════════════════════════════════════════╝

📊 Summary
──────────
  Total Imports:    ${summary.total}
  ✓ Resolved:       ${summary.resolved} (${summary.resolutionRate})
  ✗ Unresolved:     ${summary.unresolved}
  ⚠ Errors:         ${summary.errors}

📍 Resolution Sources
──────────────────────
  Framework:        ${summary.bySource.framework}
  Local Code:       ${summary.bySource.local}
  Package Cache:    ${summary.bySource.cache}

${this.results.unresolved.length > 0 ? `
⚠️  UNRESOLVED IMPORTS
─────────────────────
${this.results.unresolved
  .map(
    (imp) =>
      `  ❌ ${imp.original}
     Reason: ${imp.reason}`
  )
  .join('\n')}
` : ''}

${this.results.errors.length > 0 ? `
🔴 ERRORS
─────────
${this.results.errors.map((err) => `  • ${err.reason}`).join('\n')}
` : ''}
`;

    return report;
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.resolvedCache.clear();
    this.unresolvedCache.clear();
    console.log('✓ Resolution cache cleared');
  }
}

export { ImportResolver };
