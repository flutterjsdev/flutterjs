// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * Dynamic Package Export Loader
 * ============================================================================
 * 
 * Reads package.json exports field and dynamically generates
 * FrameworkPackage configurations instead of hardcoding them.
 * 
 * Benefits:
 * - No need to manually update framework packages list
 * - Automatically picks up new exports
 * - Uses actual export paths from package.json
 * - Maintains dist/src resolution logic
 */

import fs from 'fs';
import path from 'path';

/**
 * Load and parse package.json exports
 * Converts exports field into usable format
 */
class PackageExportLoader {
  constructor(packageJsonPath, options = {}) {
    this.packageJsonPath = packageJsonPath;
    this.packageRoot = path.dirname(packageJsonPath);
    this.debugMode = options.debugMode || false;
    this.packageJson = null;
  }

  /**
   * Load and validate package.json
   */
  async loadPackageJson() {
    try {
      const content = await fs.promises.readFile(this.packageJsonPath, 'utf-8');
      this.packageJson = JSON.parse(content);
      return this.packageJson;
    } catch (error) {
      throw new Error(`Failed to load package.json: ${error.message}`);
    }
  }

  /**
   * Parse exports field from package.json
   * Returns Map of exportName -> exportPath
   * 
   * Example:
   * {
   *   "./flutterjs_runtime": "./dist/flutterjs_runtime.js",
   *   "./build_context": "./dist/build_context.js"
   * }
   */
  parseExports() {
    if (!this.packageJson) {
      throw new Error('Package.json not loaded. Call loadPackageJson() first');
    }

    const exportsMap = new Map();
    const exports = this.packageJson.exports;

    if (!exports || typeof exports !== 'object') {
      if (this.debugMode) {
        console.warn('No exports field found in package.json');
      }
      return exportsMap;
    }

    // Handle different export formats
    for (const [exportPath, filePath] of Object.entries(exports)) {
      // Skip default export "."
      if (exportPath === '.') {
        exportsMap.set('default', filePath);
        continue;
      }

      // Extract export name from path
      // "./flutterjs_runtime" -> "flutterjs_runtime"
      const exportName = exportPath
        .replace(/^\.\//, '')        // Remove leading ./
        .replace(/\/$/, '')          // Remove trailing /
        .split('/')[0];              // Get first part if nested

      if (exportName && !exportsMap.has(exportName)) {
        exportsMap.set(exportName, filePath);
      }
    }

    return exportsMap;
  }

  /**
   * Get main entry point
   */
  getMainEntry() {
    if (!this.packageJson) {
      throw new Error('Package.json not loaded');
    }

    const main = this.packageJson.main || 'index.js';
    const normalized = main.replace(/\.js$/, '').replace(/^\.\//, '');
    return normalized;
  }

  /**
   * Get package name
   */
  getPackageName() {
    if (!this.packageJson) {
      throw new Error('Package.json not loaded');
    }
    return this.packageJson.name || 'unknown';
  }

  /**
   * Get scoped package name (e.g., 'runtime' from '@flutterjs/runtime')
   */
  getScopedName() {
    const name = this.getPackageName();
    if (name.startsWith('@')) {
      return name.split('/')[1];
    }
    return name;
  }
}

/**
 * Framework Package configuration with dynamic export support
 */
class DynamicFrameworkPackage {
  constructor(name, scopedName, defaultEntry = 'index.js') {
    this.name = name;
    this.scopedName = scopedName;
    this.defaultEntry = defaultEntry;
    this.actualEntry = null;
    this.path = null;
    this.exports = new Map();  // Export name -> file path
  }

  /**
   * Add export mapping
   */
  addExport(exportName, filePath) {
    this.exports.set(exportName, filePath);
  }

  /**
   * Resolve entry point (prioritizing dist over src)
   */
  resolveEntry(packageRootPath) {
    if (!packageRootPath || !fs.existsSync(packageRootPath)) {
      return this.defaultEntry;
    }

    const distPath = path.join(packageRootPath, 'dist');
    const srcPath = path.join(packageRootPath, 'src');

    // Check dist first
    if (fs.existsSync(distPath)) {
      const distEntry = path.join('dist', this.defaultEntry);
      const distEntryPath = path.join(packageRootPath, distEntry);

      if (fs.existsSync(distEntryPath)) {
        this.actualEntry = distEntry;
        return distEntry;
      }
    }

    // Fall back to src
    if (fs.existsSync(srcPath)) {
      const srcEntry = path.join('src', this.defaultEntry);
      const srcEntryPath = path.join(packageRootPath, srcEntry);

      if (fs.existsSync(srcEntryPath)) {
        this.actualEntry = srcEntry;
        return srcEntry;
      }
    }

    this.actualEntry = this.defaultEntry;
    return this.defaultEntry;
  }

  getImportMapEntry(baseDir = '/node_modules/@flutterjs') {
    const cleanName = this.scopedName.toLowerCase();
    const entryToUse = this.actualEntry || this.defaultEntry;

    return {
      packageName: this.name,
      importPath: `${baseDir}/${cleanName}/${entryToUse}`
    };
  }
}

/**
 * Main class to load and generate framework packages from package.json
 */
class FrameworkPackageGenerator {
  constructor(options = {}) {
    this.options = {
      debugMode: options.debugMode || false,
      ...options,
    };
  }

  /**
   * Generate framework packages from package.json
   * 
   * Usage:
   * const generator = new FrameworkPackageGenerator({ debugMode: true });
   * const packages = await generator.generateFromPackageJson(packageJsonPath);
   */
  async generateFromPackageJson(packageJsonPath) {
    try {
      // Load package.json
      const loader = new PackageExportLoader(packageJsonPath, {
        debugMode: this.options.debugMode
      });

      await loader.loadPackageJson();
      const packageName = loader.getPackageName();
      const scopedName = loader.getScopedName();
      const mainEntry = loader.getMainEntry();

      if (this.options.debugMode) {
        console.log(`\n[FrameworkPackageGenerator] Loading: ${packageName}`);
        console.log(`  Scoped: ${scopedName}`);
        console.log(`  Main: ${mainEntry}`);
      }

      // Create main package
      const mainPackage = new DynamicFrameworkPackage(
        packageName,
        scopedName,
        mainEntry
      );

      // Parse and add exports
      const exports = loader.parseExports();

      if (this.options.debugMode) {
        console.log(`\n  Exports (${exports.size}):`);
      }

      for (const [exportName, filePath] of exports) {
        mainPackage.addExport(exportName, filePath);

        if (this.options.debugMode) {
          console.log(`    .${exportName}: ${filePath}`);
        }
      }

      return {
        packageName,
        scopedName,
        mainPackage,
        exports,
        loader
      };

    } catch (error) {
      console.error(`Error generating framework package: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate multiple framework packages from list of package.json paths
   */
  async generateMultiple(packageJsonPaths) {
    const results = new Map();

    for (const packagePath of packageJsonPaths) {
      try {
        const result = await this.generateFromPackageJson(packagePath);
        results.set(result.packageName, result.mainPackage);
      } catch (error) {
        console.error(`Failed to process ${packagePath}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Create framework packages Map from all packages in a directory
   */
  async generateFromDirectory(packagesDir) {
    const packages = new Map();

    if (!fs.existsSync(packagesDir)) {
      throw new Error(`Directory not found: ${packagesDir}`);
    }

    try {
      const entries = await fs.promises.readdir(packagesDir, { 
        withFileTypes: true 
      });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const packageJsonPath = path.join(packagesDir, entry.name, 'package.json');

        if (fs.existsSync(packageJsonPath)) {
          try {
            const result = await this.generateFromPackageJson(packageJsonPath);
            packages.set(result.packageName, result.mainPackage);
          } catch (error) {
            console.warn(
              `Skipped ${entry.name}: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      throw new Error(`Error reading directory: ${error.message}`);
    }

    return packages;
  }
}

/**
 * Helper to generate JavaScript code for framework packages
 */
class FrameworkPackageCodeGenerator {
  static generateMapCode(frameworkPackages) {
    let code = 'this.frameworkPackages = new Map([\n';

    for (const [packageName, pkg] of frameworkPackages) {
      const mainEntry = pkg.defaultEntry || 'index.js';
      code += `  ['${packageName}', new FrameworkPackage('${packageName}', '${pkg.scopedName}', '${mainEntry}')],\n`;
    }

    code += ']);';

    return code;
  }

  /**
   * Generate complete ImportRewriter initialization code
   */
  static generateImportRewriterCode(frameworkPackages) {
    return `
// ============================================================================
// AUTO-GENERATED: Framework Packages from Package.json
// ============================================================================

${this.generateMapCode(frameworkPackages)}

// ============================================================================
// Export mappings for each package
// ============================================================================

const EXPORT_MAPPINGS = {
${Array.from(frameworkPackages.entries())
  .map(([name, pkg]) => {
    const exports = Array.from(pkg.exports.entries())
      .map(([exportName, filePath]) => `    '${exportName}': '${filePath}'`)
      .join(',\n');
    
    return `  '${name}': {
${exports}
  }`;
  })
  .join(',\n\n')}
};
    `.trim();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PackageExportLoader,
  DynamicFrameworkPackage,
  FrameworkPackageGenerator,
  FrameworkPackageCodeGenerator
};

export default FrameworkPackageGenerator;