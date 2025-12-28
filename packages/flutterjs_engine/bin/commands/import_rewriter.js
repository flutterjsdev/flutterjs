/**
 * ============================================================================
 * Enhanced ImportRewriter - Dynamic Import Map from package.json
 * ============================================================================
 *
 * ✅ FIXED: Reads import maps directly from package.json exports field
 * ✅ NO hardcoded entries - everything comes from actual package.json
 * ✅ Supports both default and named exports
 * ✅ Validates against actual package structure
 *
 * Flow:
 * 1. For each resolved package, read its package.json
 * 2. Extract the "exports" field
 * 3. Map exports to dist/node_modules/@flutterjs/[package]/ paths
 * 4. Generate import map from real data
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// ============================================================================
// DATA TYPES
// ============================================================================

/**
 * Parsed import statement
 */
class ImportStatement {
  constructor(source) {
    this.source = source;
    this.specifiers = [];
    this.type = 'named';
    this.original = '';
    this.lineNumber = -1;
    this.isFramework = false;
    this.isExternal = false;
    this.isLocal = false;
  }

  addSpecifier(name, alias = null) {
    this.specifiers.push({
      name: name,
      alias: alias || name
    });
  }

  toString() {
    if (this.specifiers.length === 0) {
      return `import {} from '${this.source}';`;
    }

    const specs = this.specifiers
      .map(s => s.alias === s.name ? s.name : `${s.name} as ${s.alias}`)
      .join(', ');

    return `import { ${specs} } from '${this.source}';`;
  }
}

/**
 * ✅ NEW: Package export configuration read from package.json
 */
class PackageExportConfig {
  constructor(packageName, packageJsonPath) {
    this.packageName = packageName;
    this.scopedName = this.extractScopedName(packageName);
    this.packageJsonPath = packageJsonPath;
    this.exports = new Map();      // Export name -> file path
    this.mainEntry = null;         // Main entry point
    this.version = null;
    this.error = null;
  }

  extractScopedName(packageName) {
    // @flutterjs/runtime -> runtime
    if (packageName.startsWith('@')) {
      return packageName.split('/')[1];
    }
    return packageName;
  }

  /**
   * Load and parse package.json
   */
  async load() {
    try {
      if (!fs.existsSync(this.packageJsonPath)) {
        throw new Error(`package.json not found: ${this.packageJsonPath}`);
      }

      const content = fs.readFileSync(this.packageJsonPath, 'utf-8');
      const pkgJson = JSON.parse(content);

      this.version = pkgJson.version || '1.0.0';
      this.mainEntry = this.cleanPath(pkgJson.main || 'index.js');

      // Parse exports field
      if (pkgJson.exports && typeof pkgJson.exports === 'object') {
        for (const [exportPath, filePath] of Object.entries(pkgJson.exports)) {
          // Skip default export "."
          if (exportPath === '.') {
            this.mainEntry = this.cleanPath(filePath);
            this.exports.set('default', this.cleanPath(filePath));
            continue;
          }

          // Extract export name: "./runtime" -> "runtime"
          const exportName = exportPath
            .replace(/^\.\//, '')      // Remove leading ./
            .replace(/\/$/, '');       // Remove trailing /

          this.exports.set(exportName, this.cleanPath(filePath));
        }
      }

      return true;

    } catch (error) {
      this.error = error.message;
      return false;
    }
  }

  /**
   * ✅ NEW: Clean file paths
   * - Remove leading ./
   * - Fix double .js.js
   * - Normalize slashes
   */
  cleanPath(filePath) {
    if (!filePath) return 'index.js';

    // Remove leading ./
    filePath = filePath.replace(/^\.\//, '');

    // Fix .js.js -> .js (from package.json typo)
    filePath = filePath.replace(/\.js\.js$/, '.js');

    // Ensure it doesn't start with /
    filePath = filePath.replace(/^\//, '');

    return filePath;
  }

  /**
   * Get import map entry for this package
   * Maps: @flutterjs/runtime -> /dist/node_modules/@flutterjs/runtime/dist/flutterjs_runtime.js
   */
  getImportMapEntry(baseDir = '/dist/node_modules/@flutterjs') {
    return {
      packageName: this.packageName,
      // Use main entry: could be ./dist/flutterjs_runtime.js
      mainPath: `${baseDir}/${this.scopedName}/${this.mainEntry}`
    };
  }

  /**
   * Get all export entries for import map
   */
  getExportEntries(baseDir = '/node_modules/@flutterjs') {
    const entries = new Map();

    // ✅ HELPER: Clean path by removing duplicate slashes and ./
    const cleanPath = (dirPath, filePath) => {
      // Remove leading ./ from filePath
      let cleanedFilePath = filePath.replace(/^\.\//, '');
      
      // Combine: /node_modules/@flutterjs + runtime + dist/index.js
      let combined = `${dirPath}/${this.scopedName}/${cleanedFilePath}`;
      
      // Remove any /./ sequences
      combined = combined.replace(/\/\.\//g, '/');
      
      // Remove duplicate slashes
      combined = combined.replace(/\/+/g, '/');
      
      // Ensure starts with /
      if (!combined.startsWith('/')) {
        combined = '/' + combined;
      }
      
      return combined;
    };

    // Main export
    const mainPath = cleanPath(baseDir, this.mainEntry);
    entries.set(this.packageName, mainPath);

    // Named exports (optional - if you want to support them)
    for (const [exportName, filePath] of this.exports) {
      if (exportName === 'default') continue;

      const fullPath = cleanPath(baseDir, filePath);
      // Named export key: @flutterjs/runtime/build_context
      entries.set(`${this.packageName}/${exportName}`, fullPath);
    }

    return entries;
  }
}

/**
 * Import map configuration
 */
class ImportMap {
  constructor() {
    this.imports = new Map();
    this.scopes = new Map();
  }

  addImport(packageName, importPath) {
    this.imports.set(packageName, importPath);
  }

  addScopeImport(scope, packageName, importPath) {
    if (!this.scopes.has(scope)) {
      this.scopes.set(scope, new Map());
    }
    this.scopes.get(scope).set(packageName, importPath);
  }

  toJSON() {
    const obj = {};

    if (this.imports.size > 0) {
      obj.imports = {};
      for (const [name, path] of this.imports) {
        obj.imports[name] = path;
      }
    }

    if (this.scopes.size > 0) {
      obj.scopes = {};
      for (const [scope, imports] of this.scopes) {
        obj.scopes[scope] = {};
        for (const [name, path] of imports) {
          obj.scopes[scope][name] = path;
        }
      }
    }

    return obj;
  }

  toScript() {
    const json = JSON.stringify(this.toJSON(), null, 2);
    return `<script type="importmap">\n${json}\n</script>`;
  }
}

/**
 * Import analysis result
 */
class ImportAnalysisResult {
  constructor() {
    this.imports = [];
    this.frameworkImports = [];
    this.externalImports = [];
    this.localImports = [];
    this.importMap = new ImportMap();
    this.packageExports = new Map();    // ✅ NEW: Store package export configs
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalImports: 0,
      framework: 0,
      external: 0,
      local: 0
    };
  }

  addImport(importStmt) {
    this.imports.push(importStmt);
    this.stats.totalImports++;

    if (importStmt.isFramework) {
      this.frameworkImports.push(importStmt);
      this.stats.framework++;
    } else if (importStmt.isExternal) {
      this.externalImports.push(importStmt);
      this.stats.external++;
    } else if (importStmt.isLocal) {
      this.localImports.push(importStmt);
      this.stats.local++;
    }
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}

// ============================================================================
// MAIN IMPORT REWRITER CLASS - ENHANCED
// ============================================================================

class ImportRewriter {
  constructor(config = {}) {
    this.config = {
      debugMode: config.debugMode || false,
      baseDir: config.baseDir || '/node_modules/@flutterjs',
      validateExports: config.validateExports !== false,
      ...config
    };

    this.result = new ImportAnalysisResult();
    this.resolution = null;  // ✅ NEW: Store resolution data for access to package paths

    if (this.config.debugMode) {
      console.log(chalk.gray('[ImportRewriter] Initialized'));
      console.log(chalk.gray(`  Base Dir: ${this.config.baseDir}`));
      console.log(chalk.gray(`  Dynamic loading from package.json enabled\n`));
    }
  }

  /**
   * ========================================================================
   * ✅ NEW MAIN ENTRY POINT: Analyze Imports with Package Resolution
   * ========================================================================
   */
  async analyzeImportsWithResolution(sourceCode, resolution) {
    this.result = new ImportAnalysisResult();
    this.resolution = resolution;

    if (this.config.debugMode) {
      console.log(chalk.blue('\n📋 Import Analysis with Package Resolution'));
      console.log(chalk.blue('='.repeat(70) + '\n'));
    }

    try {
      // Step 1: Parse imports
      this.parseImports(sourceCode);

      // Step 2: Load package exports from resolution
      if (this.config.debugMode) {
        console.log(chalk.cyan('\n[DEBUG] Resolution packages:'));
        if (this.resolution && this.resolution.packages) {
          for (const [name, info] of this.resolution.packages) {
            console.log(chalk.cyan(`  ${name}: ${JSON.stringify(info, null, 2)}`));
          }
        } else {
          console.log(chalk.red('  No resolution packages!'));
        }
        console.log();
      }

      await this.loadPackageExports();

      // Step 3: Validate imports
      this.validateImports();

      // Step 4: Generate import map from actual package.json data
      this.generateDynamicImportMap();

      if (this.config.debugMode) {
        this.printAnalysisReport();
      }

      // ✅ Return object with methods attached
      return this.getAnalysisResult();

    } catch (error) {
      this.result.addError(`Analysis failed: ${error.message}`);
      if (this.config.debugMode) {
        console.error(chalk.red(`Error: ${error.stack}`));
      }
      throw error;
    }
  }

  /**
   * ========================================================================
   * ✅ NEW: Load package exports from resolution packages
   * ========================================================================
   */
  async loadPackageExports() {
    if (!this.resolution || !this.resolution.packages) {
      console.warn(chalk.yellow('⚠️  No resolution data available'));
      return;
    }

    if (this.config.debugMode) {
      console.log(chalk.blue('📦 Loading package exports...\n'));
    }

    for (const [packageName, packageInfo] of this.resolution.packages) {
      try {
        // ✅ FIX: packageInfo might be an object with different structure
        let sourcePath = packageInfo.source || packageInfo;
        
        if (typeof packageInfo === 'string') {
          sourcePath = packageInfo;
        } else if (packageInfo.path) {
          sourcePath = packageInfo.path;
        }

        if (!sourcePath || typeof sourcePath !== 'string') {
          this.result.addWarning(`Invalid package path for ${packageName}`);
          if (this.config.debugMode) {
            console.log(chalk.yellow(`  ⚠ ${packageName}: Invalid package path - ${JSON.stringify(packageInfo)}`));
          }
          continue;
        }

        const packageJsonPath = path.join(sourcePath, 'package.json');

        if (this.config.debugMode) {
          console.log(chalk.gray(`  Reading: ${packageJsonPath}`));
        }

        // Check if file exists first
        if (!fs.existsSync(packageJsonPath)) {
          this.result.addWarning(`package.json not found for ${packageName} at ${packageJsonPath}`);
          if (this.config.debugMode) {
            console.log(chalk.yellow(`  ⚠ ${packageName}: package.json not found at ${packageJsonPath}`));
          }
          continue;
        }

        const config = new PackageExportConfig(packageName, packageJsonPath);
        const loaded = await config.load();

        if (loaded) {
          this.result.packageExports.set(packageName, config);

          if (this.config.debugMode) {
            console.log(chalk.green(`  ✓ ${packageName} (v${config.version})`));
            console.log(chalk.gray(`    Path: ${sourcePath}`));
            console.log(chalk.gray(`    Main: ${config.mainEntry}`));
            console.log(chalk.gray(`    Exports: ${config.exports.size}`));
            for (const [name, filePath] of config.exports) {
              console.log(chalk.gray(`      - ${name}: ${filePath}`));
            }
          }
        } else {
          this.result.addWarning(`Could not load ${packageName}: ${config.error}`);
          if (this.config.debugMode) {
            console.log(chalk.yellow(`  ⚠ ${packageName}: ${config.error}`));
          }
        }

      } catch (error) {
        this.result.addWarning(`Error loading ${packageName}: ${error.message}`);
        if (this.config.debugMode) {
          console.log(chalk.yellow(`  ⚠ ${packageName}: ${error.message}`));
          console.log(chalk.gray(`     Stack: ${error.stack}`));
        }
      }
    }

    if (this.config.debugMode) {
      console.log(chalk.gray(`\n✓ Loaded ${this.result.packageExports.size} package exports\n`));
    }
  }

  /**
   * ========================================================================
   * PARSING IMPORTS
   * ========================================================================
   */

  parseImports(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.gray('📋 Parsing import statements...\n'));
    }

    const lines = sourceCode.split('\n');
    const importRegex = /^import\s+(?:(.+?)\s+)?from\s+['"]([^'"]+)['"]/;

    let lineNumber = 1;

    for (const line of lines) {
      const match = line.match(importRegex);

      if (!match) {
        lineNumber++;
        continue;
      }

      const specifiersStr = match[1] || '';
      const source = match[2];

      const importStmt = new ImportStatement(source);
      importStmt.original = line.trim();
      importStmt.lineNumber = lineNumber;

      // Categorize import type
      if (source.startsWith('@flutterjs/')) {
        importStmt.isFramework = true;
      } else if (source.startsWith('.')) {
        importStmt.isLocal = true;
      } else {
        importStmt.isExternal = true;
      }

      // Parse specifiers
      this.parseSpecifiers(specifiersStr, importStmt);

      this.result.addImport(importStmt);

      if (this.config.debugMode) {
        const icon = importStmt.isFramework ? '📦' : (importStmt.isLocal ? '📄' : '📨');
        console.log(chalk.gray(`${icon} Line ${lineNumber}: ${importStmt.source}`));
        if (importStmt.specifiers.length > 0) {
          console.log(chalk.gray(`   Imports: ${importStmt.specifiers.map(s => s.name).join(', ')}`));
        }
      }

      lineNumber++;
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * Parse individual import specifiers
   */
  parseSpecifiers(specifiersStr, importStmt) {
    if (!specifiersStr) {
      importStmt.type = 'default';
      return;
    }

    specifiersStr = specifiersStr.trim();

    // Named imports: { Container, Text }
    if (specifiersStr.startsWith('{') && specifiersStr.endsWith('}')) {
      importStmt.type = 'named';
      const content = specifiersStr.slice(1, -1).trim();

      const items = content.split(',').map(s => s.trim());

      for (const item of items) {
        if (item.includes(' as ')) {
          const [name, alias] = item.split(' as ').map(s => s.trim());
          importStmt.addSpecifier(name, alias);
        } else {
          importStmt.addSpecifier(item);
        }
      }
    }
    // Namespace import: * as Material
    else if (specifiersStr.includes('*')) {
      importStmt.type = 'namespace';
      const parts = specifiersStr.split('as').map(s => s.trim());
      if (parts.length === 2) {
        importStmt.addSpecifier('*', parts[1]);
      }
    }
    // Default import: Material
    else {
      importStmt.type = 'default';
      importStmt.addSpecifier('default', specifiersStr);
    }
  }

  /**
   * ========================================================================
   * VALIDATION
   * ========================================================================
   */

  validateImports() {
    if (this.config.debugMode) {
      console.log(chalk.blue('✓ Validating imports...\n'));
    }

    for (const importStmt of this.result.imports) {
      // Framework imports - check if loaded
      if (importStmt.isFramework) {
        if (this.result.packageExports.has(importStmt.source)) {
          if (this.config.debugMode) {
            console.log(chalk.green(`✓ ${importStmt.source} (framework - found)`));
          }
        } else {
          this.result.addWarning(`Unknown framework package: ${importStmt.source}`);
          if (this.config.debugMode) {
            console.log(chalk.yellow(`⚠ ${importStmt.source} (not found)`));
          }
        }
        continue;
      }

      // External packages
      if (importStmt.isExternal) {
        if (this.config.debugMode) {
          console.log(chalk.gray(`○ ${importStmt.source} (external)`));
        }
        continue;
      }

      // Local imports
      if (importStmt.isLocal) {
        if (this.config.debugMode) {
          console.log(chalk.gray(`○ ${importStmt.source} (local)`));
        }
      }
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * ========================================================================
   * ✅ NEW: Generate import map from package.json exports
   * ========================================================================
   */
  generateDynamicImportMap() {
    if (this.config.debugMode) {
      console.log(chalk.blue('🗺️  Generating import map from package.json...\n'));
      console.log(chalk.gray(`Base Dir: ${this.config.baseDir}\n`));
    }

    // Add all loaded packages to import map
    for (const [packageName, exportConfig] of this.result.packageExports) {
      try {
        // ✅ Make sure baseDir doesn't have /./ in it
        let baseDir = this.config.baseDir;
        baseDir = baseDir.replace(/\/\.\//g, '/');
        baseDir = baseDir.replace(/\/+/g, '/');

        const entries = exportConfig.getExportEntries(baseDir);

        for (const [importName, importPath] of entries) {
          this.result.importMap.addImport(importName, importPath);

          if (this.config.debugMode) {
            console.log(chalk.gray(`${importName}`));
            console.log(chalk.gray(`  → ${importPath}`));
          }
        }

      } catch (error) {
        this.result.addWarning(`Error generating entries for ${packageName}: ${error.message}`);
        if (this.config.debugMode) {
          console.log(chalk.yellow(`⚠ ${packageName}: ${error.message}`));
        }
      }
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * Get import map as JSON object
   */
  getImportMapObject() {
    return this.result.importMap.toJSON();
  }

  /**
   * Get import map as JSON string
   */
  getImportMapJSON() {
    return JSON.stringify(this.result.importMap.toJSON(), null, 2);
  }

  /**
   * Get import map as HTML script tag
   */
  getImportMapScript() {
    return this.result.importMap.toScript();
  }

  /**
   * Return the analysis result object with access to importMap methods
   */
  getAnalysisResult() {
    return {
      ...this.result,
      getImportMapObject: () => this.result.importMap.toJSON(),
      getImportMapScript: () => this.result.importMap.toScript(),
      getImportMapJSON: () => JSON.stringify(this.result.importMap.toJSON(), null, 2)
    };
  }

  /**
   * ========================================================================
   * CONFIGURATION
   * ========================================================================
   */

  setBaseDir(baseDir) {
    // ✅ Clean the baseDir before setting
    baseDir = baseDir.replace(/\/\.\//g, '/');
    baseDir = baseDir.replace(/\/+/g, '/');
    
    this.config.baseDir = baseDir;
    this.result.importMap = new ImportMap();
    this.generateDynamicImportMap();
  }

  /**
   * ========================================================================
   * REPORTING
   * ========================================================================
   */

  printAnalysisReport() {
    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('IMPORT ANALYSIS REPORT'));
    console.log(chalk.blue('='.repeat(70)));

    const stats = this.result.stats;

    console.log(chalk.gray('\nImports Found:'));
    console.log(chalk.gray(`  Total: ${stats.totalImports}`));
    console.log(chalk.green(`  Framework (@flutterjs/*): ${stats.framework}`));
    console.log(chalk.gray(`  External (npm): ${stats.external}`));
    console.log(chalk.gray(`  Local (./...): ${stats.local}`));

    console.log(chalk.gray('\nPackage Exports Loaded:'));
    console.log(chalk.gray(`  ${this.result.packageExports.size} packages`));

    console.log(chalk.gray('\nImport Map Entries:'));
    const importMapObj = this.getImportMapObject();
    if (importMapObj.imports) {
      for (const [name, path] of Object.entries(importMapObj.imports)) {
        console.log(chalk.gray(`  ${name}`));
        console.log(chalk.gray(`    → ${path}`));
      }
    }

    if (this.result.errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${this.result.errors.length}`));
      for (const error of this.result.errors) {
        console.log(chalk.red(`  ✗ ${error}`));
      }
    }

    if (this.result.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${this.result.warnings.length}`));
      for (const warning of this.result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    }

    console.log(chalk.green('\n✓ Import analysis complete!\n'));
    console.log(chalk.blue('='.repeat(70) + '\n'));
  }

  getReport() {
    return {
      success: !this.result.hasErrors(),
      stats: this.result.stats,
      imports: this.result.imports.map(i => ({
        source: i.source,
        specifiers: i.specifiers,
        type: i.type,
        line: i.lineNumber,
        isFramework: i.isFramework,
        isExternal: i.isExternal,
        isLocal: i.isLocal
      })),
      importMap: this.getImportMapObject(),
      errors: this.result.errors,
      warnings: this.result.warnings
    };
  }

  getStats() {
    return this.result.stats;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ImportRewriter,
  ImportStatement,
  ImportMap,
  PackageExportConfig,
  ImportAnalysisResult
};

export default ImportRewriter;