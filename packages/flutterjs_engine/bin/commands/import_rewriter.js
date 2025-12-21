/**
 * ============================================================================
 * FlutterJS Import Rewriter - Complete Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Parses import statements from source code
 * - Rewrites @flutterjs/* imports to local ./lib/ paths
 * - Validates all imports can be resolved
 * - Handles different import styles (named, default, namespace)
 * - Generates new import statements
 * - Tracks import transformations for debugging
 * 
 * Location: cli/build/import-rewriter.js
 */

import chalk from 'chalk';

// ============================================================================
// IMPORT DATA TYPES
// ============================================================================

/**
 * Parsed import statement
 */
class ImportStatement {
  constructor(source) {
    this.source = source;                    // '@flutterjs/material'
    this.specifiers = [];                    // [{ name, alias }, ...]
    this.type = 'named';                     // 'named', 'default', 'namespace'
    this.original = '';                      // Original import line
    this.lineNumber = -1;                    // Line in source file
    this.isFramework = false;                // @flutterjs/*
    this.isExternal = false;                 // Other npm packages
    this.isLocal = false;                    // Relative paths
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
 * Rewritten import with transformation details
 */
class RewrittenImport {
  constructor(original, rewritten) {
    this.original = original;                // Original import statement
    this.rewritten = rewritten;              // New import statement
    this.packageName = '';                   // Package being imported
    this.specifiers = [];                    // What was imported
    this.newPath = '';                       // New import path
    this.transformed = false;                // Whether it was transformed
    this.error = null;                       // Error if any
  }

  static fromImportStatement(imp, newPath) {
    const rewritten = new RewrittenImport(imp.original, '');
    rewritten.packageName = imp.source;
    rewritten.specifiers = imp.specifiers;
    rewritten.newPath = newPath;

    if (imp.specifiers.length > 0) {
      const specs = imp.specifiers
        .map(s => s.alias === s.name ? s.name : `${s.name} as ${s.alias}`)
        .join(', ');
      rewritten.rewritten = `import { ${specs} } from '${newPath}';`;
      rewritten.transformed = true;
    }

    return rewritten;
  }
}

/**
 * Rewrite result summary
 */
class RewriteResult {
  constructor() {
    this.originalCode = '';
    this.rewrittenCode = '';
    this.imports = [];                       // Parsed imports
    this.rewrites = [];                      // Rewrite transformations
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalImports: 0,
      frameworkImports: 0,
      externalImports: 0,
      localImports: 0,
      rewritten: 0,
      unchanged: 0
    };
  }

  addImport(importStmt) {
    this.imports.push(importStmt);
    this.stats.totalImports++;

    if (importStmt.isFramework) {
      this.stats.frameworkImports++;
    } else if (importStmt.isExternal) {
      this.stats.externalImports++;
    } else if (importStmt.isLocal) {
      this.stats.localImports++;
    }
  }

  addRewrite(rewrite) {
    this.rewrites.push(rewrite);
    if (rewrite.transformed) {
      this.stats.rewritten++;
    } else {
      this.stats.unchanged++;
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
  constructor(exportMaps, config = {}) {
    this.exportMaps = exportMaps;           // From PackageCollector
    this.config = {
      debugMode: config.debugMode || false,
      libPath: config.libPath || './lib',
      preserveStructure: config.preserveStructure || false,
      validateExports: config.validateExports !== false,
      ...config
    };

    this.result = new RewriteResult();
  }

  /**
   * MAIN ENTRY POINT: Rewrite all imports in source code
   */
  rewrite(sourceCode) {
    this.result.originalCode = sourceCode;

    if (this.config.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(60)));
      console.log(chalk.blue('IMPORT REWRITING STARTED'));
      console.log(chalk.blue('='.repeat(60)) + '\n');
    }

    try {
      // Step 1: Parse imports
      this.parseImports(sourceCode);

      // Step 2: Validate imports
      this.validateImports();

      // Step 3: Rewrite imports
      let rewritten = sourceCode;
      rewritten = this.performRewrite(rewritten);

      this.result.rewrittenCode = rewritten;

      if (this.config.debugMode) {
        this.printSummary();
      }

      return this.result;

    } catch (error) {
      this.result.addError(`Rewrite failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse all import statements
   */
  parseImports(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.gray('📝 Parsing import statements...\n'));
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

      // Skip node_modules and other non-framework imports for now
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
        console.log(chalk.gray(`Line ${lineNumber}: ${importStmt.source}`));
        if (importStmt.specifiers.length > 0) {
          console.log(chalk.gray(`  Imports: ${importStmt.specifiers.map(s => s.name).join(', ')}`));
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
   * Examples:
   * - import { Container, Text } from ...
   * - import { Container as Cont } from ...
   * - import * as Material from ...
   * - import Material from ...
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
   * Validate all imports can be resolved
   */
  validateImports() {
    if (this.config.debugMode) {
      console.log(chalk.blue('🔍 Validating imports...\n'));
    }

    for (const importStmt of this.result.imports) {
      // Skip external and local imports
      if (!importStmt.isFramework) {
        if (this.config.debugMode) {
          console.log(chalk.gray(`${importStmt.source} (external, skipped)`));
        }
        continue;
      }

      // Check if package is in export maps
      const packageExports = this.exportMaps.get(importStmt.source);

      if (!packageExports) {
        const message = `Package not found in export maps: ${importStmt.source}`;
        this.result.addError(message);
        if (this.config.debugMode) {
          console.log(chalk.red(`✗ ${importStmt.source}`));
        }
        continue;
      }

      // Validate each specifier
      if (this.config.validateExports) {
        for (const spec of importStmt.specifiers) {
          if (spec.name === '*') {
            // Namespace import - always valid
            continue;
          }

          if (!packageExports[spec.name]) {
            const message = `${importStmt.source} does not export ${spec.name}`;
            this.result.addWarning(message);
            if (this.config.debugMode) {
              console.log(chalk.yellow(`⚠ ${spec.name} not in ${importStmt.source}`));
            }
          }
        }
      }

      if (this.config.debugMode) {
        console.log(chalk.green(`✓ ${importStmt.source}`));
      }
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * Perform actual import rewriting
   */
  performRewrite(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.blue('✏️  Rewriting imports...\n'));
    }

    let rewritten = sourceCode;

    for (const importStmt of this.result.imports) {
      // Only rewrite framework imports
      if (!importStmt.isFramework) {
        const rewriteObj = new RewrittenImport(
          importStmt.original,
          importStmt.original
        );
        rewriteObj.transformed = false;
        this.result.addRewrite(rewriteObj);
        continue;
      }

      // Get new path from export maps
      const newPath = this.getNewPath(importStmt);

      if (!newPath) {
        const message = `Cannot determine new path for ${importStmt.source}`;
        this.result.addError(message);
        continue;
      }

      // Build new import statement
      const newImportStmt = this.buildNewImportStatement(importStmt, newPath);

      // Replace in source code
      rewritten = rewritten.replace(
        importStmt.original,
        newImportStmt
      );

      // Record rewrite
      const rewriteObj = RewrittenImport.fromImportStatement(importStmt, newPath);
      this.result.addRewrite(rewriteObj);

      if (this.config.debugMode) {
        console.log(chalk.green(`✓ ${importStmt.source}`));
        console.log(chalk.gray(`  ${importStmt.original}`));
        console.log(chalk.gray(`  ↓`));
        console.log(chalk.gray(`  ${newImportStmt}`));
      }
    }

    if (this.config.debugMode) {
      console.log();
    }

    return rewritten;
  }

  /**
   * Determine new import path
   */
  getNewPath(importStmt) {
    const packageExports = this.exportMaps.get(importStmt.source);

    if (!packageExports) {
      return null;
    }

    // For now, return lib path - can be customized
    if (this.config.preserveStructure) {
      const cleanName = importStmt.source.replace('@', '').replace('/', '-');
      return `${this.config.libPath}/${cleanName}/index.js`;
    } else {
      return `${this.config.libPath}/index.js`;
    }
  }

  /**
   * Build new import statement
   */
  buildNewImportStatement(importStmt, newPath) {
    if (importStmt.type === 'default') {
      const alias = importStmt.specifiers[0].alias;
      return `import ${alias} from '${newPath}'`;
    }

    if (importStmt.type === 'namespace') {
      const alias = importStmt.specifiers[0].alias;
      return `import * as ${alias} from '${newPath}'`;
    }

    // Named imports
    const specs = importStmt.specifiers
      .map(s => s.alias === s.name ? s.name : `${s.name} as ${s.alias}`)
      .join(', ');

    return `import { ${specs} } from '${newPath}'`;
  }

  /**
   * Print rewrite summary
   */
  printSummary() {
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.blue('REWRITE SUMMARY'));
    console.log(chalk.blue('='.repeat(60)));

    console.log(chalk.gray(`\nTotal Imports: ${this.result.stats.totalImports}`));
    console.log(chalk.gray(`  Framework: ${this.result.stats.frameworkImports}`));
    console.log(chalk.gray(`  External: ${this.result.stats.externalImports}`));
    console.log(chalk.gray(`  Local: ${this.result.stats.localImports}`));

    console.log(chalk.gray(`\nTransformations:`));
    console.log(chalk.gray(`  Rewritten: ${this.result.stats.rewritten}`));
    console.log(chalk.gray(`  Unchanged: ${this.result.stats.unchanged}`));

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

    if (!this.result.hasErrors()) {
      console.log(chalk.green('\n✅ Rewrite successful!\n'));
    } else {
      console.log(chalk.red('\n❌ Rewrite completed with errors\n'));
    }

    console.log(chalk.blue('='.repeat(60) + '\n'));
  }

  /**
   * Get rewritten code
   */
  getRewrittenCode() {
    return this.result.rewrittenCode;
  }

  /**
   * Get detailed report
   */
  getReport() {
    return {
      success: !this.result.hasErrors(),
      stats: this.result.stats,
      imports: this.result.imports.map(i => ({
        source: i.source,
        specifiers: i.specifiers,
        type: i.type,
        line: i.lineNumber
      })),
      rewrites: this.result.rewrites.map(r => ({
        package: r.packageName,
        original: r.original,
        rewritten: r.rewritten,
        transformed: r.transformed,
        newPath: r.newPath
      })),
      errors: this.result.errors,
      warnings: this.result.warnings
    };
  }

  /**
   * Get rewrite statistics
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
  RewrittenImport,
  RewriteResult
};