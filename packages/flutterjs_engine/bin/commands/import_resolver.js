/**
 * ============================================================================
 * FlutterJS Import Resolver - Clean Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Resolve import paths from source code
 * - Map @flutterjs/* imports to local files
 * - Validate import statements
 * - Copy required files to output
 * - Generate import mapping configuration
 * 
 * Uses shared utilities to avoid duplication
 * Location: cli/build/import-resolver.js
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { PackageResolver } from './shared/package_resolver.js';
import { FileCopier } from './shared/file_utils.js';
import {
  readJsonFile,
  writeJsonFile,
  fileExists,
  directoryExists,
  isFlutterJSPackage,
  getFileExtension,
  normalizePath,
  normalizePathToUrl
} from './shared/utils.js';

// ============================================================================
// IMPORT MAPPING CONFIGURATION
// ============================================================================

/**
 * Configuration file names to check
 */
const CONFIG_FILES = [
  'flutterjs.imports.json',
  'flutterjs.config.js'
];

/**
 * Search paths for module discovery
 */
const MODULE_SEARCH_PATHS = [
  { prefix: '@flutterjs/', base: 'node_modules/@flutterjs' },
  { prefix: '@flutterjs/', base: 'src/framework' },
  { prefix: '@flutterjs/', base: 'src' },
];

/**
 * Common module names to search for
 */
const COMMON_MODULES = [
  'widget', 'runtime', 'material', 'container', 'gestures',
  'animation', 'services', 'routing', 'state', 'theme',
  'core', 'widgets', 'foundation', 'rendering', 'painting'
];

/**
 * File patterns to check for modules
 */
const MODULE_FILE_PATTERNS = [
  'index.js',
  '{module}.js',
  'src/index.js',
  'src/{module}.js',
  'dist/index.js'
];

// ============================================================================
// MAIN IMPORT RESOLVER CLASS
// ============================================================================

class ImportResolver {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
    this.debugMode = config.debugMode || false;

    // Load or auto-discover mappings
    this.mappings = config.mappings || this.loadImportConfig() || this.discoverMappings();

    // Initialize shared utilities
    this.packageResolver = new PackageResolver(this.projectRoot, {
      debugMode: this.debugMode
    });

    this.fileCopier = new FileCopier({
      debugMode: this.debugMode
    });

    if (this.debugMode) {
      console.log(chalk.gray('[ImportResolver] Initialized'));
      console.log(chalk.gray(`  Mappings: ${Object.keys(this.mappings).length}`));
      console.log(chalk.gray(`  Project: ${this.projectRoot}\n`));
    }
  }

  /**
   * Load import mappings from configuration file
   */
  loadImportConfig() {
    for (const configFile of CONFIG_FILES) {
      const configPath = path.join(this.projectRoot, configFile);

      try {
        if (!fileExists(configPath)) {
          continue;
        }

        if (configFile.endsWith('.json')) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

          if (config.imports && typeof config.imports === 'object') {
            if (this.debugMode) {
              console.log(chalk.gray(`Loaded config from: ${configFile}`));
            }
            return config.imports;
          }
        }
      } catch (error) {
        if (this.debugMode) {
          console.warn(chalk.yellow(`Error loading ${configFile}: ${error.message}`));
        }
      }
    }

    return null;
  }

  /**
   * Auto-discover mappings by searching common locations
   */
  discoverMappings() {
    if (this.debugMode) {
      console.log(chalk.gray('Auto-discovering import mappings...\n'));
    }

    const mappings = {};

    for (const { prefix, base } of MODULE_SEARCH_PATHS) {
      const baseDir = path.join(this.projectRoot, base);

      if (!directoryExists(baseDir)) {
        continue;
      }

      for (const module of COMMON_MODULES) {
        const modulePath = path.join(baseDir, module);

        // Try each file pattern
        const foundPath = this.findModuleFile(modulePath, module);

        if (foundPath) {
          const key = `${prefix}${module}`;
          const relativePath = path.relative(this.projectRoot, foundPath);

          if (!mappings[key]) {
            mappings[key] = {
              path: normalizePath(relativePath),
              source: foundPath,
            };

            if (this.debugMode) {
              console.log(chalk.green(`✓ Found ${key}`));
              console.log(chalk.gray(`  ${relativePath}`));
            }
          }
        }
      }
    }

    if (this.debugMode) {
      console.log();
    }

    return Object.keys(mappings).length > 0 ? mappings : {};
  }

  /**
   * Find module file by checking patterns
   */
  findModuleFile(modulePath, moduleName) {
    for (const pattern of MODULE_FILE_PATTERNS) {
      const filePath = pattern
        .replace('{module}', moduleName)
        .split('/')
        .reduce((p, part) => path.join(p, part), modulePath);

      if (fileExists(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Parse import statements from source code
   */
  parseImports(sourceCode) {
    const imports = [];
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(sourceCode)) !== null) {
      const items = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s && !s.includes('*'));

      const from = match[2];
      const lineNumber = sourceCode.substring(0, match.index).split('\n').length;

      imports.push({
        items,
        from,
        fullStatement: match[0],
        isFlutterJS: isFlutterJSPackage(from),
        lineNumber,
      });
    }

    return imports;
  }

  /**
   * Resolve a module to its actual file path
   */
  resolveModulePath(moduleName) {
    // Check explicit mapping first
    if (this.mappings[moduleName]) {
      const mapping = this.mappings[moduleName];
      const source = mapping.source || path.join(this.projectRoot, mapping.path);

      if (fileExists(source)) {
        return source;
      }
    }

    // Try common locations
    const candidates = [
      path.join(this.projectRoot, 'node_modules', moduleName.replace(/\//g, path.sep)),
      path.join(this.projectRoot, 'src', moduleName.replace('@flutterjs/', '').replace(/\//g, path.sep)),
      path.join(this.projectRoot, 'src/framework', moduleName.replace('@flutterjs/', '').replace(/\//g, path.sep)),
    ];

    for (const candidate of candidates) {
      const indexPath = path.join(candidate, 'index.js');
      const defaultPath = candidate + '.js';

      if (fileExists(indexPath)) return indexPath;
      if (fileExists(defaultPath)) return defaultPath;
    }

    return null;
  }

  /**
   * Register a custom import mapping
   */
  registerMapping(moduleName, filePath) {
    const absolutePath = path.resolve(this.projectRoot, filePath);

    if (!fileExists(absolutePath)) {
      throw new Error(`Mapping file not found: ${absolutePath}`);
    }

    this.mappings[moduleName] = {
      path: filePath,
      source: absolutePath,
    };

    if (this.debugMode) {
      console.log(chalk.gray(`Registered: ${moduleName} → ${filePath}`));
    }

    return this;
  }

  /**
   * Get all required files for imports
   */
  getRequiredFiles(imports) {
    const files = new Map();

    for (const imp of imports) {
      if (!imp.isFlutterJS) continue;

      const filePath = this.resolveModulePath(imp.from);

      if (filePath && fileExists(filePath)) {
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
   * Copy required files to output directory
   */
  async copyRequiredFiles(imports, outputDir) {
    const requiredFiles = this.getRequiredFiles(imports);
    const copiedFiles = [];

    if (requiredFiles.size === 0) {
      if (this.debugMode) {
        console.log(chalk.yellow('No files to copy'));
      }
      return copiedFiles;
    }

    if (this.debugMode) {
      console.log(chalk.blue(`\nCopying ${requiredFiles.size} files...\n`));
    }

    for (const [moduleName, fileInfo] of requiredFiles) {
      try {
        const destPath = path.join(outputDir, path.basename(fileInfo.source));

        await this.fileCopier.copyFiles(
          path.dirname(fileInfo.source),
          outputDir,
          [fileInfo.source]
        );

        copiedFiles.push({
          module: moduleName,
          source: fileInfo.source,
          dest: destPath,
          size: fs.statSync(destPath).size,
        });

        if (this.debugMode) {
          console.log(chalk.green(`✓ ${moduleName}`));
          console.log(chalk.gray(`  ${normalizePathToUrl(fileInfo.relativePath)}`));
        }

      } catch (error) {
        console.error(chalk.red(`Failed to copy ${moduleName}: ${error.message}`));
      }
    }

    if (this.debugMode) {
      console.log();
    }

    return copiedFiles;
  }

  /**
   * Rewrite imports in source code
   * Maps @flutterjs/* to actual output paths
   */
  rewriteImports(sourceCode, outputStructure = 'flat') {
    let rewritten = sourceCode;

    for (const imp of this.parseImports(sourceCode)) {
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
        case 'dist':
          newPath = `./dist/lib/${path.basename(filePath)}`;
          break;
        default:
          newPath = `./lib/${path.basename(filePath)}`;
      }

      newPath = normalizePathToUrl(newPath);
      const newImportStatement = `import { ${imp.items.join(', ')} } from '${newPath}'`;
      rewritten = rewritten.replace(imp.fullStatement, newImportStatement);
    }

    return rewritten;
  }

  /**
   * Validate imports - check if they can all be resolved
   */
  validateImports(imports) {
    const errors = [];
    const warnings = [];
    const found = [];

    for (const imp of imports) {
      if (!imp.isFlutterJS) continue;

      const filePath = this.resolveModulePath(imp.from);

      if (!filePath || !fileExists(filePath)) {
        errors.push({
          type: 'missing',
          module: imp.from,
          line: imp.lineNumber,
          message: `Cannot find module '${imp.from}'`,
          suggestion: 'Check flutterjs.imports.json or ensure file exists',
        });
        continue;
      }

      found.push({
        module: imp.from,
        file: path.relative(this.projectRoot, filePath),
        exports: imp.items,
      });

      // Try to verify exports
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

          const exportFound = patterns.some(pattern => fileContent.includes(pattern));

          if (!exportFound) {
            warnings.push({
              type: 'unverified_export',
              module: imp.from,
              item,
              line: imp.lineNumber,
              message: `Cannot verify export of '${item}' from '${imp.from}'`,
              suggestion: `Check that ${path.basename(filePath)} exports ${item}`,
            });
          }
        }
      } catch {
        // Skip read errors
      }
    }

    return { errors, warnings, found };
  }

  /**
   * Generate resolution report
   */
  generateReport(imports) {
    const validation = this.validateImports(imports);

    let report = '\n';
    report += '='.repeat(80) + '\n';
    report += 'Import Resolution Report\n';
    report += '='.repeat(80) + '\n\n';

    // Found imports
    if (validation.found.length > 0) {
      report += `✓ Successfully resolved (${validation.found.length}):\n`;
      validation.found.forEach(item => {
        report += `  ✓ ${item.module}\n`;
        report += `    → ${item.file}\n`;
        report += `    Exports: ${item.exports.join(', ')}\n\n`;
      });
    }

    // Errors
    if (validation.errors.length > 0) {
      report += `\n✗ Errors (${validation.errors.length}):\n`;
      validation.errors.forEach(err => {
        report += `  ✗ Line ${err.line}: ${err.message}\n`;
        report += `    ${err.suggestion}\n\n`;
      });
    }

    // Warnings
    if (validation.warnings.length > 0) {
      report += `\n⚠️  Warnings (${validation.warnings.length}):\n`;
      validation.warnings.forEach(warn => {
        report += `  ⚠️  ${warn.message}\n`;
        report += `    ${warn.suggestion}\n\n`;
      });
    }

    if (validation.errors.length === 0) {
      report += '\n✓ All imports resolved successfully!\n';
    }

    report += '\n' + '='.repeat(80) + '\n';

    return report;
  }

  /**
   * Generate flutterjs.imports.json configuration file
   */
  async generateConfigFile(outputPath = null) {
    const configPath = outputPath || path.join(this.projectRoot, 'flutterjs.imports.json');

    const config = {
      imports: this.mappings,
      description: 'FlutterJS Import Mappings - Maps @flutterjs/* to local files',
      generated: new Date().toISOString(),
    };

    try {
      await writeJsonFile(configPath, config, true);

      if (this.debugMode) {
        console.log(chalk.green(`Generated config: ${configPath}`));
      }

      return configPath;
    } catch (error) {
      console.error(chalk.red(`Failed to generate config: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get all registered mappings
   */
  getMappings() {
    return { ...this.mappings };
  }

  /**
   * Get mapping count
   */
  getMappingCount() {
    return Object.keys(this.mappings).length;
  }

  /**
   * Clear all mappings
   */
  clearMappings() {
    this.mappings = {};
    return this;
  }

  /**
   * Print debug info
   */
  printDebugInfo() {
    if (!this.debugMode) {
      console.log(chalk.yellow('Debug mode is off. Set debugMode: true in options.\n'));
      return;
    }

    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('Import Resolver Debug Info'));
    console.log(chalk.blue('='.repeat(70)));

    console.log(chalk.gray(`\nProject Root: ${this.projectRoot}`));
    console.log(chalk.gray(`Mappings: ${this.getMappingCount()}\n`));

    if (Object.keys(this.mappings).length > 0) {
      console.log(chalk.gray('Registered Mappings:'));
      for (const [module, info] of Object.entries(this.mappings)) {
        console.log(chalk.gray(`  ${module}`));
        console.log(chalk.gray(`    → ${info.path || info.source}`));
      }
    }

    console.log(chalk.blue('\n' + '='.repeat(70) + '\n'));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ImportResolver,
  MODULE_SEARCH_PATHS,
  COMMON_MODULES,
  MODULE_FILE_PATTERNS,
  CONFIG_FILES
};

export default ImportResolver;