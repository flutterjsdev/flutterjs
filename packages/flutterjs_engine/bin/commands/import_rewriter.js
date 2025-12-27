/**
 * ============================================================================
 * Enhanced ImportRewriter - Import Analysis & Import Map Generation
 * ============================================================================
 *
 * Responsibilities:
 * 1. Parse and analyze import statements from source code
 * 2. Validate import resolution
 * 3. Generate import maps for @flutterjs/* packages
 * 4. Create import map JSON for <script type="importmap">
 * 5. Track import transformations
 *
 * Location: cli/build/import_rewriter.js
 */

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
 * Framework package configuration
 */
class FrameworkPackage {
  constructor(name, scopedName, mainEntry = 'index.js') {
    this.name = name;
    this.scopedName = scopedName;
    this.mainEntry = mainEntry;  // e.g., 'src/flutterjs_runtime.js'
    this.path = null;
  }

  getImportMapEntry(baseDir = '/node_modules/@flutterjs') {
    const cleanName = this.scopedName.toLowerCase();
    return {
      packageName: this.name,
      // FIX: Use this.mainEntry as-is (it includes 'src/' if needed)
      importPath: `${baseDir}/${cleanName}/${this.mainEntry}`
    };
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
// MAIN IMPORT REWRITER CLASS
// ============================================================================

class ImportRewriter {
  constructor(config = {}) {
    this.config = {
      debugMode: config.debugMode || false,
      baseDir: config.baseDir || './node_modules/@flutterjs',
      validateExports: config.validateExports !== false,
      ...config
    };

    // Framework packages configuration
    this.frameworkPackages = new Map([
      ['@flutterjs/runtime', new FrameworkPackage('@flutterjs/runtime', 'runtime', 'src/flutterjs_runtime.js')],
      ['@flutterjs/analyzer', new FrameworkPackage('@flutterjs/analyzer', 'analyzer', 'src/analyzer.js')],
      ['@flutterjs/core', new FrameworkPackage('@flutterjs/core', 'core', 'src/index.js')],
      ['@flutterjs/material', new FrameworkPackage('@flutterjs/material', 'material', 'src/index.js')],
      ['@flutterjs/widgets', new FrameworkPackage('@flutterjs/widgets', 'widgets', 'src/index.js')],
      ['@flutterjs/cupertino', new FrameworkPackage('@flutterjs/cupertino', 'cupertino', 'src/index.js')],
      ['@flutterjs/vdom', new FrameworkPackage('@flutterjs/vdom', 'vdom', 'src/vnode_renderer.js')],
      ['@flutterjs/rendering', new FrameworkPackage('@flutterjs/rendering', 'src/rendering', 'index.js')],
      ['@flutterjs/painting', new FrameworkPackage('@flutterjs/painting', 'src/painting', 'index.js')],
      ['@flutterjs/foundation', new FrameworkPackage('@flutterjs/foundation', 'foundation', 'src/index.js')],
      ['@flutterjs/animation', new FrameworkPackage('@flutterjs/animation', 'animation', 'src/index.js')],
    ]);

    this.result = new ImportAnalysisResult();

    if (this.config.debugMode) {
      console.log(chalk.gray('[ImportRewriter] Initialized'));
      console.log(chalk.gray(`  Base Dir: ${this.config.baseDir}`));
      console.log(chalk.gray(`  Framework packages: ${this.frameworkPackages.size}\n`));
    }
  }

  /**
   * ========================================================================
   * MAIN ENTRY POINT: Analyze Imports
   * ========================================================================
   */
  analyzeImports(sourceCode) {
    this.result = new ImportAnalysisResult();

    if (this.config.debugMode) {
      console.log(chalk.blue('\n📖 Import Analysis Started'));
      console.log(chalk.blue('='.repeat(70) + '\n'));
    }

    try {
      // Step 1: Parse imports
      this.parseImports(sourceCode);

      // Step 2: Validate imports
      this.validateImports();

      // Step 3: Generate import map
      this.generateImportMap();

      if (this.config.debugMode) {
        this.printAnalysisReport();
      }

      return this.result;

    } catch (error) {
      this.result.addError(`Analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * ========================================================================
   * PARSING IMPORTS
   * ========================================================================
   */

  /**
   * Parse all import statements from source code
   */
  parseImports(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.gray('🔍 Parsing import statements...\n'));
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

  /**
   * Validate that all imports can be resolved
   */
  validateImports() {
    if (this.config.debugMode) {
      console.log(chalk.blue('✓ Validating imports...\n'));
    }

    for (const importStmt of this.result.imports) {
      // Framework imports will be resolved via import map
      if (importStmt.isFramework) {
        if (!this.frameworkPackages.has(importStmt.source)) {
          this.result.addWarning(`Unknown framework package: ${importStmt.source}`);
        }

        if (this.config.debugMode) {
          console.log(chalk.green(`✓ ${importStmt.source} (framework)`));
        }
        continue;
      }

      // External packages are expected to be in node_modules
      if (importStmt.isExternal) {
        if (this.config.debugMode) {
          console.log(chalk.gray(`○ ${importStmt.source} (external)`));
        }
        continue;
      }

      // Local imports are validated later at runtime
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
   * IMPORT MAP GENERATION
   * ========================================================================
   */

  /**
   * Generate import map for framework packages
   * Maps @flutterjs/* to their actual locations
   */
  generateImportMap() {
    if (this.config.debugMode) {
      console.log(chalk.blue('🗺️  Generating import map...\n'));
    }

    // Add all framework packages to import map
    for (const [packageName, pkg] of this.frameworkPackages) {
      const entry = pkg.getImportMapEntry(this.config.baseDir);
      this.result.importMap.addImport(entry.packageName, entry.importPath);

      if (this.config.debugMode) {
        console.log(chalk.gray(`${packageName}`));
        console.log(chalk.gray(`  → ${entry.importPath}`));
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
   * Ready to embed in <head>
   */
  getImportMapScript() {
    return this.result.importMap.toScript();
  }

  /**
   * ========================================================================
   * CONFIGURATION
   * ========================================================================
   */

  /**
   * Update base directory for import map
   * Useful when packages are in different location
   */
  setBaseDir(baseDir) {
    this.config.baseDir = baseDir;

    // Regenerate import map with new base
    this.result.importMap = new ImportMap();
    this.generateImportMap();
  }

  /**
   * Update framework package entry point
   * E.g., if @flutterjs/runtime uses 'dist/index.js' instead of 'flutterjs_runtime.js'
   */
  updateFrameworkPackage(packageName, mainEntry) {
    if (this.frameworkPackages.has(packageName)) {
      const pkg = this.frameworkPackages.get(packageName);
      pkg.mainEntry = mainEntry;

      // Regenerate import map
      this.result.importMap = new ImportMap();
      this.generateImportMap();
    }
  }

  /**
   * Add custom framework package
   */
  addFrameworkPackage(packageName, scopedName, mainEntry = 'index.js') {
    const pkg = new FrameworkPackage(packageName, scopedName, mainEntry);
    this.frameworkPackages.set(packageName, pkg);

    // Regenerate import map
    this.result.importMap = new ImportMap();
    this.generateImportMap();
  }

  /**
   * ========================================================================
   * REPORTING
   * ========================================================================
   */

  /**
   * Print analysis report
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

    console.log(chalk.gray('\nFramework Packages:'));
    for (const importStmt of this.result.frameworkImports) {
      console.log(chalk.gray(`  ✓ ${importStmt.source}`));
      if (importStmt.specifiers.length > 0) {
        console.log(chalk.gray(`    • ${importStmt.specifiers.map(s => s.name).join(', ')}`));
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

  /**
   * Get analysis report
   */
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

  /**
   * Get statistics
   */
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
  FrameworkPackage,
  ImportAnalysisResult
};

export default ImportRewriter;