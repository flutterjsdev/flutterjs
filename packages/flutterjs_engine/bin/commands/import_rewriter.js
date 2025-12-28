/**
 * ============================================================================
 * FlutterJS Import Rewriter - Clean Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Parse import statements from source code
 * - Categorize imports (framework, external, local)
 * - Generate import maps for @flutterjs/* packages
 * - Create <script type="importmap"> for HTML
 * - Track import statistics
 * 
 * Uses shared utilities and types
 * Location: cli/build/import-rewriter.js
 */

import chalk from 'chalk';
import { createAnalysisResult } from './shared/types.js';
import { isFlutterJSPackage } from './shared/utils.js';

// ============================================================================
// FRAMEWORK PACKAGES CONFIGURATION
// ============================================================================

/**
 * Framework package metadata
 * Defines how @flutterjs/* packages map to their entry points
 */
const FRAMEWORK_PACKAGES = new Map([
  ['@flutterjs/runtime', { scopedName: 'runtime', mainEntry: 'dist/flutterjs_runtime.js' }],
  ['@flutterjs/analyzer', { scopedName: 'analyzer', mainEntry: 'dist/analyzer.js' }],
  ['@flutterjs/core', { scopedName: 'core', mainEntry: 'dist/index.js' }],
  ['@flutterjs/material', { scopedName: 'material', mainEntry: 'dist/index.js' }],
  ['@flutterjs/widgets', { scopedName: 'widgets', mainEntry: 'dist/index.js' }],
  ['@flutterjs/cupertino', { scopedName: 'cupertino', mainEntry: 'dist/index.js' }],
  ['@flutterjs/vdom', { scopedName: 'vdom', mainEntry: 'dist/vnode_renderer.js' }],
  ['@flutterjs/rendering', { scopedName: 'rendering', mainEntry: 'dist/index.js' }],
  ['@flutterjs/painting', { scopedName: 'painting', mainEntry: 'dist/index.js' }],
  ['@flutterjs/foundation', { scopedName: 'foundation', mainEntry: 'dist/index.js' }],
  ['@flutterjs/animation', { scopedName: 'animation', mainEntry: 'dist/index.js' }],
]);

// ============================================================================
// IMPORT PARSING
// ============================================================================

/**
 * Parse import statements from source code
 * Supports multiple formats:
 * - import { x, y } from 'module'
 * - import * as x from 'module'
 * - import x from 'module'
 */
function parseImports(sourceCode) {
  const imports = [];
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

    const importStmt = {
      source,
      specifiers: [],
      type: 'named',
      original: line.trim(),
      lineNumber,
      isFramework: isFlutterJSPackage(source),
      isLocal: source.startsWith('.'),
      isExternal: !isFlutterJSPackage(source) && !source.startsWith('.')
    };

    // Parse specifiers
    parseSpecifiers(specifiersStr, importStmt);

    imports.push(importStmt);
    lineNumber++;
  }

  return imports;
}

/**
 * Parse individual import specifiers
 * Handles: { x, y } | { x as Y } | * as X | default | none
 */
function parseSpecifiers(specifiersStr, importStmt) {
  if (!specifiersStr) {
    importStmt.type = 'default';
    return;
  }

  specifiersStr = specifiersStr.trim();

  // Named imports: { x, y, z as Z }
  if (specifiersStr.startsWith('{') && specifiersStr.endsWith('}')) {
    importStmt.type = 'named';
    const content = specifiersStr.slice(1, -1).trim();

    const items = content.split(',').map(s => s.trim());

    for (const item of items) {
      if (item.includes(' as ')) {
        const [name, alias] = item.split(' as ').map(s => s.trim());
        importStmt.specifiers.push({ name, alias });
      } else if (item) {
        importStmt.specifiers.push({ name: item, alias: item });
      }
    }
  }
  // Namespace import: * as X
  else if (specifiersStr.includes('*')) {
    importStmt.type = 'namespace';
    const parts = specifiersStr.split('as').map(s => s.trim());
    if (parts.length === 2) {
      importStmt.specifiers.push({ name: '*', alias: parts[1] });
    }
  }
  // Default import
  else {
    importStmt.type = 'default';
    importStmt.specifiers.push({ name: 'default', alias: specifiersStr });
  }
}

// ============================================================================
// IMPORT MAP GENERATION
// ============================================================================

/**
 * Create import map for framework packages
 */
function createImportMap(baseDir = './node_modules/@flutterjs') {
  const imports = {};

  for (const [packageName, config] of FRAMEWORK_PACKAGES) {
    const importPath = `${baseDir}/${config.scopedName}/${config.mainEntry}`;
    imports[packageName] = importPath;
  }

  return { imports };
}

/**
 * Convert import map to HTML script tag
 */
function importMapToScript(importMap) {
  const json = JSON.stringify(importMap, null, 2);
  return `<script type="importmap">\n${json}\n</script>`;
}

/**
 * Convert import map to JSON string
 */
function importMapToJSON(importMap) {
  return JSON.stringify(importMap, null, 2);
}

// ============================================================================
// MAIN IMPORT REWRITER CLASS
// ============================================================================

class ImportRewriter {
  constructor(config = {}) {
    this.config = {
      debugMode: config.debugMode || false,
      baseDir: config.baseDir || './node_modules/@flutterjs',
      ...config
    };

    this.result = null;

    if (this.config.debugMode) {
      console.log(chalk.gray('[ImportRewriter] Initialized'));
      console.log(chalk.gray(`  Base Dir: ${this.config.baseDir}`));
      console.log(chalk.gray(`  Framework packages: ${FRAMEWORK_PACKAGES.size}\n`));
    }
  }

  /**
   * Main entry point - analyze imports
   */
  analyzeImports(sourceCode) {
    this.result = createAnalysisResult();

    if (this.config.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(70)));
      console.log(chalk.blue('📖 Import Analysis Started'));
      console.log(chalk.blue('='.repeat(70) + '\n'));
    }

    try {
      // Step 1: Parse imports
      this.parseAndCategorizeImports(sourceCode);

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
      if (this.config.debugMode) {
        console.log(chalk.red(`\n❌ Analysis Error: ${error.message}\n`));
      }
      throw error;
    }
  }

  /**
   * Parse and categorize imports
   */
  parseAndCategorizeImports(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.gray('📄 Parsing imports...\n'));
    }

    const imports = parseImports(sourceCode);

    for (const importStmt of imports) {
      let category;

      if (importStmt.isFramework) {
        category = 'framework';
      } else if (importStmt.isLocal) {
        category = 'local';
      } else {
        category = 'external';
      }

      this.result.addImport(importStmt, category);

      if (this.config.debugMode) {
        const icon = category === 'framework' ? '📦' : category === 'local' ? '📄' : '📨';
        console.log(chalk.gray(`${icon} ${importStmt.source}`));

        if (importStmt.specifiers.length > 0) {
          const specs = importStmt.specifiers.map(s => s.name).join(', ');
          console.log(chalk.gray(`   → ${specs}`));
        }
      }
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * Validate imports
   */
  validateImports() {
    if (this.config.debugMode) {
      console.log(chalk.blue('✓ Validating imports...\n'));
    }

    for (const importStmt of this.result.frameworkImports) {
      // Check if package is known
      if (!FRAMEWORK_PACKAGES.has(importStmt.source)) {
        this.result.addWarning(
          `Unknown framework package: ${importStmt.source}`
        );

        if (this.config.debugMode) {
          console.log(chalk.yellow(`⚠️  ${importStmt.source} (unknown)`));
        }
      } else {
        if (this.config.debugMode) {
          console.log(chalk.green(`✓ ${importStmt.source}`));
        }
      }

      // Check if exports exist (basic check)
      if (importStmt.specifiers.length > 0) {
        const specs = importStmt.specifiers.map(s => s.name).join(', ');
        this.result.addWarning(
          `Verify exports exist in ${importStmt.source}: ${specs}`
        );
      }
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * Generate import map
   */
  generateImportMap() {
    if (this.config.debugMode) {
      console.log(chalk.blue('🗺️  Generating import map...\n'));

      for (const [packageName, config] of FRAMEWORK_PACKAGES) {
        const path = `${this.config.baseDir}/${config.scopedName}/${config.mainEntry}`;
        console.log(chalk.gray(`${packageName}`));
        console.log(chalk.gray(`  → ${path}`));
      }

      console.log();
    }

    this.result.importMap = createImportMap(this.config.baseDir);
  }

  /**
   * Get import map as object
   */
  getImportMapObject() {
    return this.result.importMap;
  }

  /**
   * Get import map as JSON string
   */
  getImportMapJSON() {
    return importMapToJSON(this.result.importMap);
  }

  /**
   * Get import map as HTML script tag
   */
  getImportMapScript() {
    return importMapToScript(this.result.importMap);
  }

  /**
   * Update base directory for import map
   */
  setBaseDir(baseDir) {
    this.config.baseDir = baseDir;

    if (this.result && this.result.importMap) {
      this.result.importMap = createImportMap(baseDir);
    }
  }

  /**
   * Update framework package entry point
   */
  updateFrameworkPackage(packageName, mainEntry) {
    if (FRAMEWORK_PACKAGES.has(packageName)) {
      FRAMEWORK_PACKAGES.get(packageName).mainEntry = mainEntry;

      if (this.result && this.result.importMap) {
        this.result.importMap = createImportMap(this.config.baseDir);
      }

      if (this.config.debugMode) {
        console.log(chalk.gray(`Updated ${packageName} → ${mainEntry}`));
      }
    }
  }

  /**
   * Add custom framework package
   */
  addFrameworkPackage(packageName, scopedName, mainEntry = 'dist/index.js') {
    FRAMEWORK_PACKAGES.set(packageName, { scopedName, mainEntry });

    if (this.result && this.result.importMap) {
      this.result.importMap = createImportMap(this.config.baseDir);
    }

    if (this.config.debugMode) {
      console.log(chalk.gray(`Added framework package: ${packageName}`));
    }
  }

  /**
   * Rewrite imports in source code
   * Maps @flutterjs/* imports to actual file paths
   */
  rewriteImports(sourceCode, outputStructure = 'dist') {
    let rewritten = sourceCode;

    const importMap = this.getImportMapObject();

    for (const [packageName, importPath] of Object.entries(importMap.imports)) {
      // Find all imports from this package
      const importRegex = new RegExp(
        `import\\s+(.+?)\\s+from\\s+['"]${packageName}['"]`,
        'g'
      );

      const matches = sourceCode.matchAll(importRegex);

      for (const match of matches) {
        const specifiersStr = match[1];
        const oldImportStatement = match[0];

        // Create new import with rewritten path
        const newImportStatement = `import ${specifiersStr} from '${importPath}'`;

        rewritten = rewritten.replace(oldImportStatement, newImportStatement);
      }
    }

    return rewritten;
  }

  /**
   * Print analysis report
   */
  printAnalysisReport() {
    const stats = this.result.stats;

    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('📊 Import Analysis Report'));
    console.log(chalk.blue('='.repeat(70)));

    console.log(chalk.gray('\nImports Found:'));
    console.log(chalk.gray(`  Total: ${stats.totalImports}`));
    console.log(chalk.green(`  Framework (@flutterjs/*): ${stats.framework}`));
    console.log(chalk.gray(`  External (npm): ${stats.external}`));
    console.log(chalk.gray(`  Local (./...): ${stats.local}`));

    if (this.result.frameworkImports.length > 0) {
      console.log(chalk.gray('\nFramework Packages:'));
      for (const imp of this.result.frameworkImports) {
        console.log(chalk.gray(`  ✓ ${imp.source}`));
        if (imp.specifiers.length > 0) {
          const specs = imp.specifiers.map(s => s.name).join(', ');
          console.log(chalk.gray(`    • ${specs}`));
        }
      }
    }

    if (this.result.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors: ${this.result.errors.length}`));
      for (const error of this.result.errors) {
        console.log(chalk.red(`  • ${error}`));
      }
    }

    if (this.result.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings: ${this.result.warnings.length}`));
      for (const warning of this.result.warnings) {
        console.log(chalk.yellow(`  • ${warning}`));
      }
    }

    console.log(chalk.green('\n✓ Import analysis complete!\n'));
    console.log(chalk.blue('='.repeat(70) + '\n'));
  }

  /**
   * Get analysis report as object
   */
  getReport() {
    return {
      success: !this.result.hasErrors(),
      stats: this.result.stats,
      imports: this.result.imports.map(imp => ({
        source: imp.source,
        specifiers: imp.specifiers,
        type: imp.type,
        line: imp.lineNumber,
        isFramework: imp.isFramework,
        isExternal: imp.isExternal,
        isLocal: imp.isLocal
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

  /**
   * Export import map to file
   */
  async exportImportMap(filePath) {
    const { writeJsonFile } = await import('./shared/utils.js');
    await writeJsonFile(filePath, this.result.importMap, true);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ImportRewriter,
  parseImports,
  parseSpecifiers,
  createImportMap,
  importMapToScript,
  importMapToJSON,
  FRAMEWORK_PACKAGES
};

export default ImportRewriter;