/**
 * ============================================================================
 * FlutterJS Dependency Resolver - Clean Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Parse import statements from source code
 * - Resolve imports to package locations
 * - Validate all dependencies are available
 * - Generate resolution map for code transformation
 * 
 * Uses shared utilities to avoid duplication
 * Location: cli/build/dependency-resolver.js
 */

import chalk from 'chalk';
import { PackageResolver } from './shared/package_resolver.js';
import { createEmptyResolution, createResolutionError } from './shared/types.js';

// ============================================================================
// IMPORT PARSING
// ============================================================================

/**
 * Parse import statements from source code
 * Supports: import { x, y } from '@flutterjs/module'
 */
function parseImports(sourceCode) {
  const imports = [];
  const importRegex = /^import\s+(?:(.+?)\s+)?from\s+['"]([^'"]+)['"]/gm;
  let match;

  while ((match = importRegex.exec(sourceCode)) !== null) {
    const specifiersStr = match[1] || '';
    const source = match[2];

    const items = specifiersStr
      .replace(/[{}]/g, '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !s.includes('*'));

    imports.push({
      source,
      items,
      isFramework: source.startsWith('@flutterjs/'),
      isLocal: source.startsWith('.'),
      isExternal: !source.startsWith('@flutterjs/') && !source.startsWith('.')
    });
  }

  return imports;
}

/**
 * Map import source to standard package name
 */
function mapSourceToPackage(source) {
  if (!source) return null;

  // Already a scoped package name
  if (source.startsWith('@flutterjs/')) {
    return source;
  }

  // @package: notation (Dart-style)
  if (source.startsWith('@package:')) {
    const pkgName = source.replace('@package:', '');
    const mappings = {
      'flutter': '@flutterjs/material',
      'material': '@flutterjs/material',
      'core': '@flutterjs/core',
      'foundation': '@flutterjs/foundation',
      'widgets': '@flutterjs/widgets',
      'rendering': '@flutterjs/rendering',
      'painting': '@flutterjs/painting',
      'animation': '@flutterjs/animation',
      'cupertino': '@flutterjs/cupertino'
    };
    return mappings[pkgName] || `@flutterjs/${pkgName}`;
  }

  // Local imports - not a package
  if (source.startsWith('.')) {
    return null;
  }

  // Regular npm packages
  return source;
}

// ============================================================================
// MAIN RESOLVER CLASS
// ============================================================================

class DependencyResolver {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      debugMode: options.debugMode || false,
      ...options,
    };

    // Use shared package resolver
    this.packageResolver = new PackageResolver(this.options.projectRoot, {
      debugMode: this.options.debugMode
    });

    if (this.options.debugMode) {
      console.log(chalk.gray('[DependencyResolver] Initialized\n'));
    }
  }

  /**
   * Main entry point - resolve all imports from source code
   */
  async resolveAll(sourceCode = '') {
    if (this.options.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(70)));
      console.log(chalk.blue('📋 Dependency Resolution Started'));
      console.log(chalk.blue('='.repeat(70) + '\n'));
    }

    try {
      // Step 1: Parse imports from source
      const imports = parseImports(sourceCode);

      if (imports.length === 0) {
        if (this.options.debugMode) {
          console.log(chalk.yellow('ℹ️  No imports found\n'));
        }
        return createEmptyResolution();
      }

      if (this.options.debugMode) {
        console.log(chalk.gray(`Found ${imports.length} imports:\n`));
      }

      // Step 2: Resolve each import to a package
      const packages = new Map();
      const errors = [];
      const warnings = [];

      for (const imp of imports) {
        if (this.options.debugMode) {
          const icon = imp.isFramework ? '📦' : imp.isLocal ? '📄' : '📨';
          console.log(chalk.gray(`${icon} ${imp.source}`));
        }

        // Local imports don't need package resolution
        if (imp.isLocal) {
          if (this.options.debugMode) {
            console.log(chalk.gray('   (local import - no resolution needed)\n'));
          }
          continue;
        }

        // Map source to package name
        const packageName = mapSourceToPackage(imp.source);

        if (!packageName) {
          warnings.push(`Cannot map import: ${imp.source}`);
          continue;
        }

        // Skip if already resolved
        if (packages.has(packageName)) {
          continue;
        }

        // Try to resolve package path
        const resolved = this.packageResolver.resolve(packageName);

        if (resolved) {
          packages.set(packageName, {
            name: packageName,
            source: imp.source,
            path: resolved.path,
            type: resolved.source,
            version: null,
            items: imp.items,
            resolved: true
          });

          if (this.options.debugMode) {
            console.log(chalk.green(`   ✓ Resolved: ${resolved.path}`));
            console.log(chalk.gray(`   Type: ${resolved.source}\n`));
          }
        } else {
          packages.set(packageName, {
            name: packageName,
            source: imp.source,
            path: null,
            type: 'unknown',
            resolved: false,
            items: imp.items
          });

          errors.push(`Cannot resolve package: ${packageName} (from ${imp.source})`);

          if (this.options.debugMode) {
            console.log(chalk.red(`   ✗ Not found\n`));
          }
        }
      }

      // Step 3: Build resolution result
      const result = {
        imports,
        packages,
        resolved: packages.size,
        errors,
        warnings,
        hasErrors: errors.length > 0,
        success: errors.length === 0
      };

      // Log summary
      if (this.options.debugMode) {
        this.printResolutionSummary(result);
      }

      return result;

    } catch (error) {
      console.error(chalk.red(`\n❌ Resolution Error: ${error.message}\n`));
      return createResolutionError(error.message);
    }
  }

  /**
   * Print resolution summary
   */
  printResolutionSummary(result) {
    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('📊 Resolution Summary'));
    console.log(chalk.blue('='.repeat(70)));

    console.log(chalk.gray(`\nImports Found: ${result.imports.length}`));
    console.log(chalk.gray(`Packages Resolved: ${result.resolved}`));

    if (result.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors: ${result.errors.length}`));
      result.errors.forEach(err => {
        console.log(chalk.red(`  • ${err}`));
      });
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings: ${result.warnings.length}`));
      result.warnings.forEach(warn => {
        console.log(chalk.yellow(`  • ${warn}`));
      });
    }

    if (result.success) {
      console.log(chalk.green('\n✓ All dependencies resolved successfully!\n'));
    } else {
      console.log(chalk.red('\n✗ Some dependencies could not be resolved\n'));
    }

    console.log(chalk.blue('='.repeat(70) + '\n'));
  }

  /**
   * Get all resolved package paths
   */
  getResolvedPaths(resolution) {
    const paths = [];
    for (const [name, info] of resolution.packages) {
      if (info.resolved && info.path) {
        paths.push(info.path);
      }
    }
    return paths;
  }

  /**
   * Validate that all framework imports can be resolved
   */
  validateFrameworkImports(resolution) {
    const errors = [];
    const warnings = [];

    for (const [name, info] of resolution.packages) {
      if (!info.isFramework) continue;

      if (!info.resolved) {
        errors.push(`Cannot resolve framework package: ${name}`);
      }

      // Check if all requested items are likely exported
      if (info.items.length > 0) {
        // Note: Could do more rigorous checking by reading the package
        warnings.push(`Import items from ${name}: ${info.items.join(', ')} - verify exports exist`);
      }
    }

    return { errors, warnings };
  }

  /**
   * Get resolution report as JSON
   */
  getReport(resolution) {
    return {
      success: resolution.success,
      imports: resolution.imports.length,
      resolved: resolution.resolved,
      errors: resolution.errors,
      warnings: resolution.warnings,
      packages: Array.from(resolution.packages.values()).map(pkg => ({
        name: pkg.name,
        type: pkg.type,
        path: pkg.path,
        resolved: pkg.resolved,
        items: pkg.items
      }))
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DependencyResolver };
export default DependencyResolver;