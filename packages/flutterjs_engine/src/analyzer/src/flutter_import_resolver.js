/**
 * Advanced Import Resolver for Flutter.js Framework
 * ✅ FIXED: Now handles multi-line imports correctly
 * 
 * Resolution Chain:
 * 1. Parse imports from source code (single & multi-line)
 * 2. Check framework package mappings (@flutterjs/*, @package:)
 * 3. Check local project code (./src, ./lib, etc.)
 * 4. Check package cache (future: npm_modules, pub_cache, etc.)
 * 5. Return error if not found
 */

import fs from 'fs';
import path from 'path';

class ImportResolver {
  constructor(options = {}) {
    this.options = {
      projectRoot: process.cwd(),
      frameworkType: 'flutter-js',
      ignoreUnresolved: false,
      cacheEnabled: false,
      ...options,
    };

    this.frameworkPackages = {
      "@flutterjs/runtime": "file:../../../../../src/runtime",
      "@flutterjs/vdom": "file:../../../../../src/vdom",
      "@flutterjs/analyzer": "file:../../../../analyzer",
      "@flutterjs/material": "file:../../../../../package/material",
      "@flutterjs/cupertino": "file:../../../../../package/cupertino",
      "@flutterjs/foundation": "file:../../../../../package/foundation",
    };

    this.customPackageMappings = {};
    this.resolvedCache = new Map();
    this.unresolvedCache = new Map();

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
   * ✅ FINAL FIX: Parse imports directly from source code
   * Handles both single-line and multi-line imports
   */
  parseImportsFromSource(sourceCode, logger = null) {
    const imports = [];

    if (logger) {
      logger.info('[ImportResolver] Starting import parsing...');
      logger.debug(`[ImportResolver] Source code length: ${sourceCode.length} characters`);
    }

    // Regex: import ... from 'path'
    // [\s\S]*? matches ANYTHING including newlines (non-greedy)
    const importRegex = /import\s+([\s\S]*?)\s+from\s+['"`]([^'"`]+)['"`]/g;

    let match;
    let matchCount = 0;

    while ((match = importRegex.exec(sourceCode)) !== null) {
      matchCount++;
      const importClause = match[1];
      const modulePath = match[2];

      if (logger) {
        logger.debug(`[ImportResolver] Match #${matchCount} found`);
        logger.debug(`  Module path: '${modulePath}'`);
        logger.trace(`  Raw clause length: ${importClause.length} chars`);
      }

      // Parse the clause (parsing handles cleaning internally)
      const parsed = this.parseImportClause(importClause, modulePath, logger);

      if (parsed) {
        if (logger) {
          logger.debug(`  ✓ Successfully parsed`);
          logger.debug(`    Items: ${parsed.items.join(', ')}`);
        }
        imports.push(parsed);
      } else {
        if (logger) {
          logger.warn(`  ✗ Parse returned null - clause: ${importClause.substring(0, 100)}`);
        }
      }
    }

    if (logger) {
      logger.info(`[ImportResolver] FINAL RESULT: Found ${matchCount} imports, parsed ${imports.length}`);
      if (imports.length === 0 && matchCount === 0) {
        logger.warn('[ImportResolver] ⚠️ NO IMPORTS FOUND - Check regex or source code!');
        logger.warn(`[ImportResolver] Source starts with: ${sourceCode.substring(0, 200)}`);
      }
      imports.forEach((imp, idx) => {
        logger.info(`[ImportResolver]   [${idx}] ${imp.source} → [${imp.items.join(', ')}]`);
      });
    }

    return imports;
  }

  /**
   * ✅ FIXED: Parse individual import clause
   * Handles: { x, y, z }, defaultExport, * as namespace, etc.
   * 
   * KEY FIX: Clean the clause COMPLETELY FIRST, then detect type
   */
  parseImportClause(clause, modulePath, logger = null) {
    if (!clause || typeof clause !== 'string') {
      return null;
    }

    // ✅ CRITICAL FIX #1: Clean AGGRESSIVELY FIRST
    // This removes ALL noise (comments, newlines, extra spaces)
    let cleaned = clause
      .replace(/\/\/.*$/gm, '')                    // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')            // Remove block comments
      .replace(/\n/g, ' ')                         // Replace newlines with spaces
      .replace(/\t/g, ' ')                         // Replace tabs with spaces
      .replace(/\s+/g, ' ')                        // Collapse multiple spaces to one
      .trim();                                      // Trim leading/trailing

    if (logger) {
      logger.trace(`[ImportResolver]   Original: ${clause.substring(0, 100).replace(/\n/g, '\\n')}`);
      logger.trace(`[ImportResolver]   Cleaned: "${cleaned}"`);
    }

    const result = {
      source: modulePath,
      items: [],
      default: null,
      namespace: null,
      raw: clause,
    };

    // ✅ Case 1: Namespace import: import * as name
    const namespaceMatch = cleaned.match(/^\*\s+as\s+(\w+)$/);
    if (namespaceMatch) {
      result.namespace = namespaceMatch[1];
      result.items.push(namespaceMatch[1]);
      if (logger) logger.trace(`[ImportResolver]   → Namespace import: ${namespaceMatch[1]}`);
      return result;
    }

    // ✅ Case 2: Named imports with braces: { x, y, z }
    const namedMatch = cleaned.match(/\{(.+?)\}/);
    if (namedMatch) {
      if (logger) logger.trace(`[ImportResolver]   → Found braces, extracting named imports`);
      
      const itemsString = namedMatch[1];
      this.extractNamedItems(itemsString, result, logger);
      
      if (result.items.length > 0) {
        return result;
      }
    }

    // ✅ Case 3: NO BRACES - but might be comma-separated list
    // This happens when clause is just: "Widget, State, StatefulWidget, ..."
    // (the braces were stripped by the regex that captured this clause)
    if (!cleaned.includes('{') && cleaned.includes(',')) {
      if (logger) logger.trace(`[ImportResolver]   → No braces but has commas, treating as named imports`);
      
      this.extractNamedItems(cleaned, result, logger);
      
      if (result.items.length > 0) {
        return result;
      }
    }

    // ✅ Case 4: Default import (no braces, no commas, single identifier)
    if (!cleaned.includes('{') && !cleaned.includes(',') && cleaned.length > 0) {
      // Verify it's a valid identifier
      if (/^[\w$]+$/.test(cleaned)) {
        result.default = cleaned;
        result.items.push(cleaned);
        if (logger) logger.trace(`[ImportResolver]   → Default import: ${cleaned}`);
        return result;
      }
    }

    // ✅ Case 5: Combined default + named: import defaultExport, { x, y }
    if (cleaned.includes('{') && cleaned.includes(',')) {
      const beforeBrace = cleaned.split('{')[0].trim();
      if (beforeBrace && beforeBrace !== ',' && /^[\w$]+$/.test(beforeBrace)) {
        result.default = beforeBrace;
        // Also parse the named imports
        const namedMatch2 = cleaned.match(/\{(.+?)\}/);
        if (namedMatch2) {
          this.extractNamedItems(namedMatch2[1], result, logger);
        }
        return result.items.length > 0 ? result : null;
      }
    }

    // ✅ Debug: Nothing matched
    if (logger) {
      logger.warn(`[ImportResolver]   ⚠️ No valid import pattern detected`);
      logger.debug(`[ImportResolver]   Cleaned was: "${cleaned}"`);
    }

    return null;
  }

  /**
   * ✅ NEW: Extract named items from a comma-separated string
   * Handles: "x, y, z" and "x as y, z as w" patterns
   */
  extractNamedItems(itemsString, result, logger = null) {
    const items = itemsString.split(',');
    
    if (logger) {
      logger.trace(`[ImportResolver]     Found ${items.length} comma-separated items`);
    }

    items.forEach((item) => {
      const trimmed = item.trim();
      
      // Skip empty items
      if (!trimmed || trimmed.length === 0) return;
      
      // Skip if it looks like a comment left over
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

      // Handle "x as y" syntax - take the alias (the part after 'as')
      const asMatch = trimmed.match(/^(\w+)\s+as\s+(\w+)$/);
      let importName;
      
      if (asMatch) {
        // "x as y" → use "y"
        importName = asMatch[2];
        if (logger) logger.trace(`[ImportResolver]       "${asMatch[1]} as ${asMatch[2]}" → ${importName}`);
      } else {
        // Simple identifier
        importName = trimmed;
        if (logger) logger.trace(`[ImportResolver]       "${trimmed}"`);
      }

      // Validate it's a proper identifier
      if (/^[\w$]+$/.test(importName) && !result.items.includes(importName)) {
        result.items.push(importName);
      }
    });
  }

  /**
   * Resolve imports from source code directly
   * ✅ NEW METHOD: Accepts sourceCode and parses multi-line imports automatically
   */
  resolveFromSource(sourceCode, logger = null) {
    // Parse imports from source
    const parsedImports = this.parseImportsFromSource(sourceCode, logger);

    if (logger) {
      logger.info(`[ImportResolver] Parsed ${parsedImports.length} import statements`);
      parsedImports.forEach((imp, idx) => {
        logger.debug(`[ImportResolver]   [${idx}] ${imp.source} → [${imp.items.join(', ')}]`);
      });
    }

    // Group by source
    const groupedBySource = {};
    parsedImports.forEach(imp => {
      if (!groupedBySource[imp.source]) {
        groupedBySource[imp.source] = [];
      }
      groupedBySource[imp.source] = groupedBySource[imp.source].concat(imp.items);
    });

    // ✅ Reset results before resolving
    this.results = {
      resolved: [],
      unresolved: [],
      errors: [],
    };

    // Resolve each unique source
    Object.entries(groupedBySource).forEach(([source, items]) => {
      this.resolve(source, items);
    });

    return {
      imports: this.results,
      summary: this.getSummary(),
      parsed: parsedImports,
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
      source: null,
      isValid: false,
      reason: null,
      fallbacks: [],
    };

    // STEP 1: Check if it's a framework package
    if (this.isFrameworkPackage(importPath)) {
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
    if (!this.isScopedPackage(importPath)) {
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

    // STEP 3: Check package cache
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

    // STEP 4: Not found
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

  isFrameworkPackage(importPath) {
    return importPath.startsWith('@flutterjs/') ||
           importPath.startsWith('@package:');
  }

  isScopedPackage(importPath) {
    return importPath.startsWith('@');
  }

  resolveFrameworkPackage(importPath, importedItems) {
    if (this.frameworkPackages[importPath]) {
      return {
        isValid: true,
        resolved: this.frameworkPackages[importPath],
        actualPath: this.frameworkPackages[importPath],
        reason: 'Found in framework package mappings',
      };
    }

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

  resolveLocalImport(importPath, importedItems) {
    const searchedLocations = [];

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

    for (const searchPath of this.localSearchPaths) {
      const fullPath = path.resolve(
        this.options.projectRoot,
        searchPath,
        importPath
      );
      searchedLocations.push(fullPath);

      const indexPath = path.join(fullPath, 'index.js');
      if (this.fileExists(indexPath)) {
        return {
          isValid: true,
          resolved: importPath,
          actualPath: indexPath,
          reason: `Found in ${searchPath}/${importPath}/index.js`,
        };
      }

      if (this.fileExists(`${fullPath}.js`)) {
        return {
          isValid: true,
          resolved: importPath,
          actualPath: `${fullPath}.js`,
          reason: `Found in ${searchPath}/${importPath}.js`,
        };
      }

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

  resolveFromCache(importPath, importedItems) {
    return {
      isValid: false,
      reason: 'Package cache resolution not yet implemented',
    };
  }

  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

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

  addPackageMapping(packageName, actualPath) {
    if (packageName.startsWith('@flutterjs/') || packageName.startsWith('@package:')) {
      this.customPackageMappings[packageName] = actualPath;
      console.log(`✓ Added mapping: ${packageName} → ${actualPath}`);
    } else {
      console.warn(`⚠ Framework mappings should start with @flutterjs/ or @package:`);
    }
  }

  addPackageMappings(mappings) {
    Object.entries(mappings).forEach(([pkg, path]) => {
      this.addPackageMapping(pkg, path);
    });
  }

  getPackageMappings() {
    return {
      framework: this.frameworkPackages,
      custom: this.customPackageMappings,
    };
  }

  setLocalSearchPaths(paths) {
    this.localSearchPaths = paths;
    console.log(`✓ Set local search paths: ${paths.join(', ')}`);
  }

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

  generateReport() {
    const summary = this.getSummary();

    let report = `
╔═══════════════════════════════════════════════════════════════════════════╗
║         IMPORT RESOLUTION REPORT                                          ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 Summary
──────────
  Total Imports:    ${summary.total}
  ✓ Resolved:       ${summary.resolved} (${summary.resolutionRate})
  ✗ Unresolved:     ${summary.unresolved}
  ⚠ Errors:         ${summary.errors}

📍 Resolution Sources
──────────────────────────────────────
  Framework:        ${summary.bySource.framework}
  Local Code:       ${summary.bySource.local}
  Package Cache:    ${summary.bySource.cache}

${this.results.unresolved.length > 0 ? `
⚠️  UNRESOLVED IMPORTS
──────────────────────────
${this.results.unresolved
          .map(
            (imp) =>
              `  ✗ ${imp.original}
     Reason: ${imp.reason}`
          )
          .join('\n')}
` : ''}

${this.results.errors.length > 0 ? `
🔴 ERRORS
──────────
${this.results.errors.map((err) => `  • ${err.reason}`).join('\n')}
` : ''}
`;

    return report;
  }

  clearCache() {
    this.resolvedCache.clear();
    this.unresolvedCache.clear();
    console.log('✓ Resolution cache cleared');
  }
}

export { ImportResolver };