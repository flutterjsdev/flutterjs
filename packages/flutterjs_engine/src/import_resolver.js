// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * Configurable Import Resolver - Flexible File Mapping
 * ============================================================================
 * 
 * Allows mapping @flutterjs/* imports to ANY local files:
 * - From package: node_modules/@flutterjs/...
 * - From source: src/framework/...
 * - From anywhere: your custom paths
 * 
 * Configuration file: flutterjs.imports.json
 */

import fs from 'fs';
import path from 'path';

class ImportResolver {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
    this.debugMode = config.debugMode || false;
    
    // Load import mappings from config
    this.mappings = config.mappings || this.loadImportConfig();
    
    // Fallback mappings if config not found
    if (!this.mappings || Object.keys(this.mappings).length === 0) {
      this.mappings = this.getDefaultMappings();
    }

    if (this.debugMode) {
      console.log('[ImportResolver] Loaded mappings for:', Object.keys(this.mappings).length, 'modules');
    }
  }

  /**
   * Load import configuration from file
   */
  loadImportConfig() {
    const configPaths = [
      path.join(this.projectRoot, 'flutterjs.imports.json'),
      path.join(this.projectRoot, 'flutterjs.config.js'),
    ];

    for (const configPath of configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          if (configPath.endsWith('.json')) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.imports) {
              return config.imports;
            }
          }
        }
      } catch (error) {
        if (this.debugMode) {
          console.warn(`[ImportResolver] Error loading ${configPath}:`, error.message);
        }
      }
    }

    return null;
  }

  /**
   * Get default mappings - searches common locations
   */
  getDefaultMappings() {
    const mappings = {};
    const searchPaths = [
      { prefix: '@flutterjs/', base: 'node_modules/@flutterjs' },
      { prefix: '@flutterjs/', base: 'src/framework' },
      { prefix: '@flutterjs/', base: 'src' },
    ];

    // Common module names to look for
    const modules = [
      'widget', 'runtime', 'material', 'container', 'gestures',
      'animation', 'services', 'routing', 'state', 'theme'
    ];

    for (const { prefix, base } of searchPaths) {
      const baseDir = path.join(this.projectRoot, base);

      for (const module of modules) {
        const modulePath = path.join(baseDir, module);
        
        // Try different file patterns
        const candidates = [
          path.join(modulePath, 'index.js'),
          path.join(modulePath, `${module}.js`),
          path.join(baseDir, `${module}.js`),
          path.join(baseDir, `${module}/src/index.js`),
          path.join(baseDir, `${module}/src/${module}.js`),
        ];

        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            const key = `${prefix}${module}`;
            const relativePath = path.relative(this.projectRoot, candidate);
            
            if (!mappings[key]) {
              mappings[key] = {
                path: relativePath,
                source: candidate,
              };
              
              if (this.debugMode) {
                console.log(`[ImportResolver] Auto-found: ${key} @ ${relativePath}`);
              }
            }
            
            break; // Use first match
          }
        }
      }
    }

    return mappings;
  }

  /**
   * Register a custom import mapping
   */
  registerMapping(moduleName, filePath) {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Mapping file not found: ${absolutePath}`);
    }

    this.mappings[moduleName] = {
      path: filePath,
      source: absolutePath,
    };

    if (this.debugMode) {
      console.log(`[ImportResolver] Registered: ${moduleName} @ ${filePath}`);
    }

    return this;
  }

  /**
   * Parse imports from source code
   */
  parseImports(sourceCode) {
    const imports = [];
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(sourceCode)) !== null) {
      const items = match[1].split(',').map(s => s.trim());
      const from = match[2];

      imports.push({
        items,
        from,
        fullStatement: match[0],
        isFlutterJS: from.startsWith('@flutterjs/'),
        lineNumber: sourceCode.substring(0, match.index).split('\n').length,
      });
    }

    return imports;
  }

  /**
   * Resolve a module to its actual file path
   */
  resolveModulePath(moduleName) {
    // Check explicit mapping
    if (this.mappings[moduleName]) {
      const mapping = this.mappings[moduleName];
      const source = mapping.source || path.join(this.projectRoot, mapping.path);
      
      if (fs.existsSync(source)) {
        return source;
      }
    }

    // Try to find it in common locations
    const candidates = [
      path.join(this.projectRoot, 'node_modules', moduleName.replace(/\//g, path.sep)),
      path.join(this.projectRoot, 'src', moduleName.replace('@flutterjs/', '').replace(/\//g, path.sep)),
      path.join(this.projectRoot, 'src/framework', moduleName.replace('@flutterjs/', '').replace(/\//g, path.sep)),
    ];

    for (const candidate of candidates) {
      const indexPath = path.join(candidate, 'index.js');
      const defaultPath = candidate + '.js';

      if (fs.existsSync(indexPath)) return indexPath;
      if (fs.existsSync(defaultPath)) return defaultPath;
    }

    return null;
  }

  /**
   * Get all required files for imports
   */
  getRequiredFiles(imports) {
    const files = new Map();

    for (const imp of imports) {
      if (!imp.isFlutterJS) continue;

      const filePath = this.resolveModulePath(imp.from);

      if (filePath && fs.existsSync(filePath)) {
        const relativePath = path.relative(this.projectRoot, filePath);
        files.set(imp.from, {
          source: filePath,
          destination: `./lib/${path.basename(filePath)}`,
          relativePath,
          exports: imp.items,
        });
      }
    }

    return files;
  }

  /**
   * Rewrite imports to match output structure
   */
  rewriteImports(sourceCode, imports, outputStructure = 'flat') {
    let rewritten = sourceCode;

    for (const imp of imports) {
      if (!imp.isFlutterJS) continue;

      const filePath = this.resolveModulePath(imp.from);
      if (!filePath) continue;

      let newPath;

      switch (outputStructure) {
        case 'flat':
          newPath = `./${path.basename(filePath)}`;
          break;
        case 'lib':
          newPath = `./lib/${path.basename(filePath)}`;
          break;
        default:
          newPath = `./lib/${path.basename(filePath)}`;
      }

      newPath = newPath.replace(/\\/g, '/');
      const newImportStatement = `import { ${imp.items.join(', ')} } from '${newPath}'`;
      rewritten = rewritten.replace(imp.fullStatement, newImportStatement);
    }

    return rewritten;
  }

  /**
   * Copy required files to output directory
   */
  copyRequiredFiles(imports, outputDir) {
    const requiredFiles = this.getRequiredFiles(imports);
    const copiedFiles = [];

    for (const [moduleName, fileInfo] of requiredFiles) {
      const destPath = path.join(outputDir, path.basename(fileInfo.source));

      try {
        fs.copyFileSync(fileInfo.source, destPath);
        copiedFiles.push({
          module: moduleName,
          source: fileInfo.source,
          dest: destPath,
          size: fs.statSync(destPath).size,
        });
      } catch (error) {
        console.error(`Failed to copy ${moduleName}:`, error.message);
      }
    }

    return copiedFiles;
  }

  /**
   * Validate that all imports can be resolved
   */
  validateImports(imports) {
    const errors = [];
    const warnings = [];
    const found = [];

    for (const imp of imports) {
      if (!imp.isFlutterJS) continue;

      const filePath = this.resolveModulePath(imp.from);

      if (!filePath || !fs.existsSync(filePath)) {
        errors.push({
          type: 'missing',
          module: imp.from,
          line: imp.lineNumber,
          message: `Cannot find module '${imp.from}'`,
          suggestion: `Check flutterjs.imports.json or ensure file exists in expected locations`
        });
        continue;
      }

      found.push({
        module: imp.from,
        file: path.relative(this.projectRoot, filePath),
        exports: imp.items,
      });

      // Try to verify exports (best effort)
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        for (const item of imp.items) {
          const patterns = [
            `export { ${item}`,
            `export class ${item}`,
            `export function ${item}`,
            `export const ${item}`,
            `export async function ${item}`,
          ];

          const found = patterns.some(pattern => fileContent.includes(pattern));
          
          if (!found) {
            warnings.push({
              type: 'unverified_export',
              module: imp.from,
              item,
              line: imp.lineNumber,
              message: `Cannot verify export of '${item}' from '${imp.from}'`,
              suggestion: `Check that ${path.basename(filePath)} exports ${item}`
            });
          }
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    return { errors, warnings, found };
  }

  /**
   * Generate summary report
   */
  generateReport(imports) {
    const validation = this.validateImports(imports);
    
    let report = '\n';
    report += '='.repeat(80) + '\n';
    report += 'Import Resolution Report\n';
    report += '='.repeat(80) + '\n\n';

    // Found imports
    if (validation.found.length > 0) {
      report += `✅ Successfully resolved (${validation.found.length}):\n`;
      validation.found.forEach(item => {
        report += `  ✓ ${item.module}\n`;
        report += `    → ${item.file}\n`;
        report += `    Exports: ${item.exports.join(', ')}\n\n`;
      });
    }

    // Errors
    if (validation.errors.length > 0) {
      report += `\n❌ Errors (${validation.errors.length}):\n`;
      validation.errors.forEach(err => {
        report += `  ✗ Line ${err.line}: ${err.message}\n`;
        report += `    ${err.suggestion}\n\n`;
      });
    }

    // Warnings
    if (validation.warnings.length > 0) {
      report += `\n⚠ Warnings (${validation.warnings.length}):\n`;
      validation.warnings.forEach(warn => {
        report += `  ⚠ ${warn.message}\n`;
        report += `    ${warn.suggestion}\n\n`;
      });
    }

    if (validation.errors.length === 0) {
      report += '\n✅ All imports resolved successfully!\n';
    }

    report += '\n' + '='.repeat(80) + '\n';

    return report;
  }

  /**
   * Generate flutterjs.imports.json config file
   */
  generateConfigFile(outputPath = null) {
    const configPath = outputPath || path.join(this.projectRoot, 'flutterjs.imports.json');
    
    const config = {
      imports: this.mappings,
      description: 'FlutterJS Import Mappings - Maps @flutterjs/* to local files'
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    return configPath;
  }

  /**
   * Get all registered mappings
   */
  getMappings() {
    return { ...this.mappings };
  }

  /**
   * Clear all mappings
   */
  clearMappings() {
    this.mappings = {};
    return this;
  }
}

export { ImportResolver };
export default ImportResolver;