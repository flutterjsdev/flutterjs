/**
 * ============================================================================
 * FlutterJS Dependency Resolver - FINAL FIXED VERSION
 * ============================================================================
 * 
 * Purpose:
 * - Resolves all imports from analyzer result
 * - Finds packages in packages/flutterjs_engine/src/ folders
 * - Handles both single and multiple packages
 * - Validates all dependencies are available
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// ============================================================================
// RESOLUTION DATA TYPES
// ============================================================================

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
// MAIN RESOLVER CLASS
// ============================================================================
class DependencyResolver {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      debugMode: options.debugMode || false,
      ...options
    };

    this.projectRoot = this.options.projectRoot;
    this.resolvedPackages = new Map();

    if (this.options.debugMode) {
      console.log(chalk.cyan('\n[DependencyResolver] Initialized'));
      console.log(chalk.gray(`  Project Root: ${this.projectRoot}\n`));
    }
  }

  /**
   * ✅ Find the flutterjs project root by walking up directories
   */
  findFlutterjsRoot(startPath) {
    let currentPath = startPath;
    const maxLevels = 20;
    let level = 0;
    
    while (level < maxLevels && currentPath !== path.dirname(currentPath)) {
      const enginePath = path.join(currentPath, 'packages', 'flutterjs_engine', 'src');
      
      if (this.options.debugMode && level < 5) {
        console.log(chalk.gray(`    [Level ${level}] Checking: ${enginePath}`));
      }
      
      if (fs.existsSync(enginePath)) {
        if (this.options.debugMode) {
          console.log(chalk.green(`  ✔ Found flutterjs root at: ${currentPath}`));
        }
        return currentPath;
      }
      
      currentPath = path.dirname(currentPath);
      level++;
    }
    
    if (this.options.debugMode) {
      console.log(chalk.yellow(`  ⚠ Could not find flutterjs root, using projectRoot`));
    }
    return this.projectRoot;
  }

  /**
   * Resolve all dependencies from analysis
   */
  async resolveAll(analysis) {
    console.log(chalk.blue('\n📦 Phase 2: Resolving dependencies...'));
    console.log(chalk.blue('='.repeat(70)));

    try {
      // Extract all packages
      const allPackages = this.extractAllPackages(analysis);

      if (this.options.debugMode) {
        console.log(chalk.yellow(`\nPackages to resolve: ${allPackages.size}`));
        for (const pkg of allPackages) {
          console.log(chalk.gray(`  • ${pkg}`));
        }
        console.log();
      }

      if (allPackages.size === 0) {
        console.log(chalk.yellow('⚠️  No @flutterjs/* packages found'));
        return {
          packages: new Map(),
          allFiles: [],
          graph: new Map(),
          errors: [],
          warnings: []
        };
      }

      // Find SDK root once
      const sdkRoot = this.findFlutterjsRoot(this.projectRoot);
      const srcDir = path.join(sdkRoot, 'packages', 'flutterjs_engine', 'src');

      if (this.options.debugMode) {
        console.log(chalk.cyan(`SDK Root: ${sdkRoot}`));
        console.log(chalk.cyan(`Src Dir: ${srcDir}\n`));
      }

      // Resolve each package
      for (const packageName of allPackages) {
        this.resolvePackage(packageName, srcDir);
      }

      console.log(chalk.blue('='.repeat(70)));
      console.log(chalk.green(`✔ Resolved ${this.resolvedPackages.size} packages\n`));

      return {
        packages: this.resolvedPackages,
        allFiles: [],
        graph: new Map(),
        errors: [],
        warnings: []
      };

    } catch (error) {
      console.error(chalk.red(`\n✖ Resolution error: ${error.message}\n`));
      throw error;
    }
  }

  /**
   * ✅ Extract all packages from analysis result
   * Handles multiple formats:
   * - analysis.imports as OBJECT: { '@flutterjs/runtime': [...], '@flutterjs/material': [...] }
   * - analysis.imports as array of strings: ['@flutterjs/vdom', '@flutterjs/material']
   * - analysis.imports as array of objects: [{ source: '@flutterjs/runtime' }]
   */
  extractAllPackages(analysis) {
    const packages = new Set();

    if (!analysis) {
      return packages;
    }

    // ✅ NEW: Handle object format (most common from analyzer)
    // Format: { '@flutterjs/runtime': ['runApp'], '@flutterjs/material': [...] }
    if (analysis.imports && typeof analysis.imports === 'object' && !Array.isArray(analysis.imports)) {
      for (const packageName of Object.keys(analysis.imports)) {
        if (packageName.startsWith('@flutterjs/')) {
          packages.add(packageName);
          if (this.options.debugMode) {
            console.log(chalk.gray(`  Found import: ${packageName}`));
          }
        }
      }
    }

    // Format: Array of strings
    if (Array.isArray(analysis.imports)) {
      for (const item of analysis.imports) {
        if (typeof item === 'string' && item.startsWith('@flutterjs/')) {
          packages.add(item);
          if (this.options.debugMode) {
            console.log(chalk.gray(`  Found import: ${item}`));
          }
        } else if (typeof item === 'object' && item && item.source) {
          const pkgName = this.extractPackageName(item.source);
          if (pkgName) {
            packages.add(pkgName);
            if (this.options.debugMode) {
              console.log(chalk.gray(`  Found import: ${pkgName}`));
            }
          }
        }
      }
    }

    // Format: analysis.metadata.imports as object
    if (analysis.metadata && typeof analysis.metadata.imports === 'object') {
      for (const pkgName of Object.keys(analysis.metadata.imports)) {
        if (pkgName.startsWith('@flutterjs/')) {
          packages.add(pkgName);
          if (this.options.debugMode) {
            console.log(chalk.gray(`  Found metadata: ${pkgName}`));
          }
        }
      }
    }

    return packages;
  }

  /**
   * Extract package name from import source
   * @flutterjs/material/core -> @flutterjs/material
   */
  extractPackageName(source) {
    if (!source || typeof source !== 'string') return null;

    // Handle scoped packages
    if (source.startsWith('@')) {
      const parts = source.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
    }

    // Handle regular packages
    const parts = source.split('/');
    return parts[0];
  }

  /**
   * ✅ Resolve a single package
   * Searches BOTH locations:
   * 1. packages/flutterjs_engine/src/[packageName]
   * 2. packages/flutterjs_engine/package/[packageName]
   */
  resolvePackage(fullPackageName, srcDir) {
    // Extract: @flutterjs/vdom -> vdom
    let packageName = fullPackageName;
    if (fullPackageName.startsWith('@flutterjs/')) {
      packageName = fullPackageName.split('/')[1];
    }

    if (this.options.debugMode) {
      console.log(chalk.cyan(`Resolving: ${fullPackageName}`));
    }

    // Get the engine root directory from srcDir
    // srcDir is: .../packages/flutterjs_engine/src
    // We need: .../packages/flutterjs_engine
    const engineRoot = path.dirname(srcDir);

    // ✅ Search paths in priority order
    const searchPaths = [
      // First: Check src/ folder
      path.join(engineRoot, 'src', packageName),
      // Second: Check package/ folder
      path.join(engineRoot, 'package', packageName)
    ];

    let foundPath = null;

    for (let i = 0; i < searchPaths.length; i++) {
      const searchPath = searchPaths[i];
      
      if (this.options.debugMode) {
        console.log(chalk.gray(`  [${i + 1}/${searchPaths.length}] Checking: ${searchPath}`));
      }

      if (!fs.existsSync(searchPath)) {
        if (this.options.debugMode) {
          console.log(chalk.red(`         ✖ Not found`));
        }
        continue;
      }

      // Verify it's a directory
      const stat = fs.statSync(searchPath);
      if (!stat.isDirectory()) {
        if (this.options.debugMode) {
          console.log(chalk.red(`         ✖ Not a directory`));
        }
        continue;
      }

      // Found it!
      foundPath = searchPath;
      if (this.options.debugMode) {
        const files = fs.readdirSync(searchPath);
        console.log(chalk.green(`         ✔ Found (${files.length} items)`));
      }
      break;
    }

    if (!foundPath) {
      if (this.options.debugMode) {
        console.log(chalk.red(`  ✖ Not found in any location`));
      }
      this.resolvedPackages.set(fullPackageName, {
        location: null,
        source: null,
        path: null,
        resolved: false,
        error: `Package not found at any location`
      });
      return;
    }

    // Store resolved package
    this.resolvedPackages.set(fullPackageName, {
      name: fullPackageName,
      packageName: packageName,
      location: foundPath,
      source: foundPath,
      path: foundPath,
      type: 'sdk',
      resolved: true
    });

    console.log(chalk.green(`  ✔ ${fullPackageName}`));
    console.log(chalk.gray(`     └─ ${foundPath}`));
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