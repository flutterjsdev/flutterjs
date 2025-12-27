/**
 * ============================================================================
 * Enhanced PackageCollector - Complete Package Collection & Copying
 * ============================================================================
 *
 * ✅ FIXED: Copies packages to correct node_modules/@flutterjs/ structure
 *
 * Responsibilities:
 * 1. Collect resolved packages from DependencyResolver
 * 2. Copy package files to dist/node_modules/@flutterjs/ structure
 * 3. Generate export maps for each package
 * 4. Create index files for easy importing
 * 5. Report collection statistics
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// ============================================================================
// DATA TYPES
// ============================================================================

/**
 * Information about a copied file
 */
class CopiedFile {
  constructor(source, dest, packageName, relative) {
    this.source = source;
    this.dest = dest;
    this.package = packageName;
    this.relative = relative;
    this.size = 0;
    this.copied = false;
    this.error = null;
  }

  getSizeKB() {
    return (this.size / 1024).toFixed(2);
  }
}

/**
 * Package collection result
 */
class PackageCollectionResult {
  constructor(packageName) {
    this.packageName = packageName;
    this.source = null;
    this.version = null;
    this.destinationPath = null;
    this.copiedFiles = [];
    this.failedFiles = [];
    this.totalSize = 0;
    this.exportMap = new Map();
    this.indexFile = null;
    this.success = false;
    this.error = null;
    this.warnings = [];
  }

  addCopiedFile(file) {
    this.copiedFiles.push(file);
    this.totalSize += file.size;
  }

  addFailedFile(filename, error) {
    this.failedFiles.push({ filename, error });
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  getTotalSizeMB() {
    return (this.totalSize / (1024 * 1024)).toFixed(2);
  }

  toJSON() {
    return {
      package: this.packageName,
      version: this.version,
      success: this.success,
      files: this.copiedFiles.length,
      size: this.getTotalSizeMB() + ' MB',
      failed: this.failedFiles.length,
      destination: this.destinationPath,
      error: this.error,
      warnings: this.warnings
    };
  }
}

/**
 * Complete collection session result
 */
class CollectionSession {
  constructor() {
    this.results = new Map();
    this.totalPackages = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.totalSize = 0;
    this.totalFiles = 0;
    this.globalErrors = [];
    this.warnings = [];
    this.startTime = Date.now();
    this.endTime = null;
  }

  addResult(result) {
    this.results.set(result.packageName, result);
    this.totalPackages++;

    if (result.success) {
      this.successCount++;
      this.totalSize += result.totalSize;
      this.totalFiles += result.copiedFiles.length;
    } else {
      this.failureCount++;
    }

    if (result.warnings.length > 0) {
      this.warnings.push(...result.warnings);
    }
  }

  addError(message) {
    this.globalErrors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  getTotalSizeMB() {
    return (this.totalSize / (1024 * 1024)).toFixed(2);
  }

  getDuration() {
    return this.endTime ? this.endTime - this.startTime : 0;
  }

  isSuccessful() {
    return this.failureCount === 0 && this.globalErrors.length === 0;
  }

  getReport() {
    return {
      total: this.totalPackages,
      successful: this.successCount,
      failed: this.failureCount,
      files: this.totalFiles,
      size: this.getTotalSizeMB() + ' MB',
      duration: this.getDuration() + 'ms',
      results: Array.from(this.results.values()).map(r => r.toJSON()),
      errors: this.globalErrors,
      warnings: this.warnings
    };
  }
}

// ============================================================================
// MAIN PACKAGE COLLECTOR CLASS
// ============================================================================

class PackageCollector {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      outputDir: options.outputDir || 'dist',
      debugMode: options.debugMode || false,
      ...options,
    };

    this.projectRoot = this.options.projectRoot;
    this.outputDir = path.join(this.projectRoot, this.options.outputDir);
    
    // ✅ FIXED: Correct path to node_modules/@flutterjs
    this.nodeModulesDir = path.join(this.outputDir, 'node_modules', '@flutterjs');
    
    // ✅ NEW: Source and destination for all node_modules
    this.sourceNodeModules = path.join(this.projectRoot, 'node_modules');
    this.destNodeModules = path.join(this.outputDir, 'node_modules');

    // Package mappings: source folder -> @flutterjs package name
    this.packageMappings = {
      'flutterjs-runtime': 'runtime',
      'flutterjs-analyzer': 'analyzer',
      'flutterjs-core': 'core',
      'flutterjs-material': 'material',
      'flutterjs-widgets': 'widgets',
      'flutterjs-cupertino': 'cupertino',
      'flutterjs-vdom': 'vdom',
      'flutterjs-rendering': 'rendering',
      'flutterjs-painting': 'painting',
      'flutterjs-foundation': 'foundation',
      'flutterjs-animation': 'animation',
    };

    this.currentSession = null;

    if (this.options.debugMode) {
      console.log(chalk.gray('[PackageCollector] Initialized'));
      console.log(chalk.gray(`  Project: ${this.projectRoot}`));
      console.log(chalk.gray(`  Output: ${this.outputDir}`));
      console.log(chalk.gray(`  NodeModules: ${this.nodeModulesDir}\n`));
    }
  }

  /**
   * ========================================================================
   * ✅ NEW: Copy entire node_modules from source
   * ========================================================================
   */
  async copyAllNodeModules() {
    if (this.options.debugMode) {
      console.log(chalk.blue('\n📦 Copying all node_modules from source...\n'));
    }

    try {
      // Check if source exists
      if (!fs.existsSync(this.sourceNodeModules)) {
        console.warn(chalk.yellow(`⚠️  Source node_modules not found at: ${this.sourceNodeModules}`));
        return;
      }

      // Create destination directory
      await fs.promises.mkdir(this.destNodeModules, { recursive: true });

      // Copy entire node_modules
      const result = await this.copyDirectoryRecursive(
        this.sourceNodeModules,
        this.destNodeModules
      );

      if (this.options.debugMode) {
        console.log(chalk.green(`✓ node_modules copied`));
        console.log(chalk.gray(`  Files copied: ${result.filesCount}`));
        console.log(chalk.gray(`  Size: ${result.totalSize} MB\n`));
      }

    } catch (error) {
      console.error(chalk.red(`✗ Failed to copy node_modules: ${error.message}\n`));
    }
  }

  /**
   * ========================================================================
   * ✅ NEW: Helper function to copy directory recursively
   * ========================================================================
   */
  async copyDirectoryRecursive(sourceDir, destDir, isTopLevel = true) {
    let filesCount = 0;
    let totalSize = 0;

    const skipDirs = new Set([
      '.git',
      '.github',
      'coverage'
    ]);

    const skipFiles = new Set([
      '.DS_Store',
      'thumbs.db',
      '.npmignore',
      '.gitignore'
    ]);

    // ✅ RECURSIVE FUNCTION
    const traverse = async (src, dest) => {
      try {
        // Verify source exists
        if (!fs.existsSync(src)) {
          console.warn(chalk.yellow(`Source path does not exist: ${src}`));
          return;
        }

        // Create destination directory first
        await fs.promises.mkdir(dest, { recursive: true });
        
        // Read all entries
        const entries = await fs.promises.readdir(src, { withFileTypes: true });

        console.log(chalk.gray(`  Scanning: ${src} (${entries.length} items)`));

        for (const entry of entries) {
          try {
            // Skip specific files and directories
            if (skipFiles.has(entry.name) || skipDirs.has(entry.name)) {
              continue;
            }

            // Skip hidden files (except specific ones)
            if (entry.name.startsWith('.') && entry.name !== '.npmignore') {
              continue;
            }

            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
              console.log(chalk.gray(`    → Dir: ${entry.name}`));
              // Recursively traverse subdirectories
              await traverse(srcPath, destPath);
            } else if (entry.isFile()) {
              try {
                // Copy the file
                await fs.promises.copyFile(srcPath, destPath);
                
                // Get file size
                const stats = await fs.promises.stat(destPath);
                totalSize += stats.size;
                filesCount++;
              } catch (fileError) {
                console.warn(chalk.yellow(`    ⚠️  Failed to copy ${entry.name}: ${fileError.message}`));
              }
            }
          } catch (entryError) {
            console.warn(chalk.yellow(`    ⚠️  Error processing ${entry.name}: ${entryError.message}`));
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not traverse ${src}: ${error.message}`));
      }
    };

    // Start traversal
    await traverse(sourceDir, destDir);

    return {
      filesCount,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * ========================================================================
   * MAIN ENTRY POINT: Collect and Copy Packages
   * ========================================================================
   */
  async collectAndCopyPackages(resolution) {
    const session = new CollectionSession();
    this.currentSession = session;

    if (this.options.debugMode) {
      console.log(chalk.blue('\n📦 Package Collection & Copying Started'));
      console.log(chalk.blue('='.repeat(70)));
      console.log(chalk.gray(`Project Root: ${this.projectRoot}`));
      console.log(chalk.gray(`Destination: ${this.nodeModulesDir}\n`));
    }

    try {
      // ✅ NEW: Copy all node_modules first
      await this.copyAllNodeModules();

      // ✅ CRITICAL: Ensure node_modules/@flutterjs directory exists FIRST
      await fs.promises.mkdir(this.nodeModulesDir, { recursive: true });

      if (!resolution || !resolution.packages || resolution.packages.size === 0) {
        session.addWarning('No packages to collect');
        session.endTime = Date.now();
        
        if (this.options.debugMode) {
          console.log(chalk.yellow('⚠️  No packages to collect\n'));
        }
        
        return session;
      }

      if (this.options.debugMode) {
        console.log(chalk.yellow(`Found ${resolution.packages.size} packages to collect:\n`));
        let idx = 0;
        for (const [name, info] of resolution.packages) {
          console.log(chalk.gray(`  [${idx}] ${name}`));
          if (this.options.debugMode) {
            console.log(chalk.gray(`       Path: ${info?.path || info?.actualPath || 'NOT SET'}`));
          }
          idx++;
        }
        console.log();
      }

      // Collect and copy each package
      for (const [packageName, packageInfo] of resolution.packages) {
        try {
          const result = await this.collectPackage(packageName, packageInfo);
          session.addResult(result);
        } catch (error) {
          session.addError(`Failed to collect ${packageName}: ${error.message}`);
        }
      }

      session.endTime = Date.now();

      if (this.options.debugMode) {
        this.printCollectionReport(session);
      }

      return session;

    } catch (error) {
      session.addError(`Collection failed: ${error.message}`);
      session.endTime = Date.now();

      if (this.options.debugMode) {
        console.log(chalk.red(`\n✗ Collection Error: ${error.message}\n`));
      }

      return session;
    }
  }

  /**
   * Collect and copy a single package
   * ✅ FIXED: Copies to node_modules/@flutterjs/[scopedName]
   * ✅ NEW: Also copies nested node_modules dependencies
   */
  async collectPackage(packageName, packageInfo) {
    const result = new PackageCollectionResult(packageName);

    try {
      // ✅ NEW: Get package path with fallback search
      let sourcePath = packageInfo.path || packageInfo.actualPath;
      
      // If not found or is just package name, search in common locations
      if (!sourcePath || !fs.existsSync(sourcePath) || sourcePath === packageName) {
        const scopedName = this.getScopedPackageName(packageName);
        const searchPaths = [
          // FlutterJS SDK structure
          path.join(this.projectRoot, 'src', scopedName),
          path.join(this.projectRoot, 'packages', `flutterjs-${scopedName}`),
          path.join(this.projectRoot, 'packages', scopedName),
          // Node modules
          path.join(this.projectRoot, 'node_modules', packageName),
          // Go up directories (for nested projects)
          path.join(this.projectRoot, '..', '..', 'src', scopedName),
          path.join(this.projectRoot, '..', '..', 'packages', scopedName),
        ];

        if (this.options.debugMode) {
          console.log(chalk.gray(`  Searching for ${packageName}...`));
        }

        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            sourcePath = searchPath;
            if (this.options.debugMode) {
              console.log(chalk.gray(`  ✓ Found at: ${searchPath}`));
            }
            break;
          }
        }
      }

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        result.error = 'Package source not found';
        if (this.options.debugMode) {
          console.log(chalk.yellow(`⚠️  ${packageName}: Source not found`));
          const scopedName = this.getScopedPackageName(packageName);
          console.log(chalk.yellow(`  Checked:`));
          console.log(chalk.yellow(`    - ${path.join(this.projectRoot, 'src', scopedName)}`));
          console.log(chalk.yellow(`    - ${path.join(this.projectRoot, 'packages', `flutterjs-${scopedName}`)}`));
          console.log(chalk.yellow(`    - ${path.join(this.projectRoot, 'node_modules', packageName)}`));
        }
        return result;
      }

      // Load package.json
      const pkgJson = await this.loadPackageJson(sourcePath);
      result.version = pkgJson.version || '1.0.0';
      result.source = sourcePath;

      // ✅ Get scoped name (runtime, material, core, etc.)
      const scopedName = this.getScopedPackageName(packageName);
      
      // ✅ FIXED: Correct destination path
      // node_modules/@flutterjs/runtime (not packages/flutterjs-runtime)
      const destPath = path.join(this.nodeModulesDir, scopedName);
      result.destinationPath = destPath;

      if (this.options.debugMode) {
        console.log(chalk.gray(`\nCopying ${packageName}...`));
        console.log(chalk.gray(`  From: ${sourcePath}`));
        console.log(chalk.gray(`  To:   ${destPath}`));
      }

      // Create destination directory
      await fs.promises.mkdir(destPath, { recursive: true });

      // Copy all package files
      const copyResult = await this.copyPackageFiles(sourcePath, destPath);
      result.copiedFiles = copyResult.files;
      result.failedFiles = copyResult.failedFiles;
      result.totalSize = copyResult.totalSize;

      // ✅ NEW: Copy nested node_modules from this package
      const nestedNodeModulesSource = path.join(sourcePath, 'node_modules');
      if (fs.existsSync(nestedNodeModulesSource)) {
        const nestedNodeModulesDest = path.join(destPath, 'node_modules');
        
        if (this.options.debugMode) {
          console.log(chalk.gray(`  Copying nested node_modules from: ${nestedNodeModulesSource}`));
          console.log(chalk.gray(`  To: ${nestedNodeModulesDest}`));
        }

        try {
          const nestedResult = await this.copyDirectoryRecursive(nestedNodeModulesSource, nestedNodeModulesDest);
          
          // Convert MB to bytes for totalSize
          const nestedSizeBytes = parseFloat(nestedResult.totalSize) * 1024 * 1024;
          result.totalSize += nestedSizeBytes;

          if (this.options.debugMode) {
            console.log(chalk.green(`    ✓ Nested copied: ${nestedResult.filesCount} files | ${nestedResult.totalSize} MB`));
          }
        } catch (nestedError) {
          console.error(chalk.red(`    ✗ Failed to copy nested node_modules: ${nestedError.message}`));
        }
      } else {
        if (this.options.debugMode) {
          console.log(chalk.yellow(`  ⚠️  No nested node_modules found at: ${nestedNodeModulesSource}`));
        }
      }

      // Generate export map for this package
      result.exportMap = this.generateExportMap(pkgJson, destPath);

      // Create index file if doesn't exist
      if (!fs.existsSync(path.join(destPath, 'index.js'))) {
        const indexContent = this.generateIndexFile(pkgJson, result.exportMap);
        const indexPath = path.join(destPath, 'index.js');
        await fs.promises.writeFile(indexPath, indexContent, 'utf-8');
        result.indexFile = indexPath;
        
        if (this.options.debugMode) {
          console.log(chalk.gray(`  Generated: index.js`));
        }
      }

      result.success = true;

      if (this.options.debugMode) {
        console.log(chalk.green(`✓ ${packageName}`));
        console.log(chalk.gray(`  v${result.version} | ${result.copiedFiles.length} files | ${result.getTotalSizeMB()} MB`));
      }

    } catch (error) {
      result.success = false;
      result.error = error.message;

      if (this.options.debugMode) {
        console.log(chalk.red(`✗ ${packageName}: ${error.message}`));
      }
    }

    return result;
  }

  /**
   * Load and validate package.json
   */
  async loadPackageJson(packagePath) {
    const pkgJsonPath = path.join(packagePath, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) {
      throw new Error('package.json not found');
    }

    try {
      const content = await fs.promises.readFile(pkgJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid package.json: ${error.message}`);
    }
  }

  /**
   * Get scoped package name from full package name
   * '@flutterjs/material' -> 'material'
   * 'some-package' -> 'some-package'
   */
  getScopedPackageName(packageName) {
    if (packageName.startsWith('@')) {
      return packageName.split('/')[1];
    }
    return packageName;
  }

  /**
   * ========================================================================
   * FILE COPYING
   * ========================================================================
   */

  /**
   * Copy all files from package source to destination
   */
  async copyPackageFiles(sourcePath, destPath) {
    const files = [];
    const failedFiles = [];
    let totalSize = 0;

    try {
      const allFiles = await this.getAllPackageFiles(sourcePath);

      for (const file of allFiles) {
        try {
          const relativePath = path.relative(sourcePath, file);
          const destFile = path.join(destPath, relativePath);
          const destFileDir = path.dirname(destFile);

          // Create directory if needed
          await fs.promises.mkdir(destFileDir, { recursive: true });

          // Copy file
          await fs.promises.copyFile(file, destFile);

          // Get file size
          const stats = await fs.promises.stat(destFile);
          totalSize += stats.size;

          const copiedFile = new CopiedFile(
            file,
            destFile,
            sourcePath,
            relativePath
          );
          copiedFile.size = stats.size;
          copiedFile.copied = true;
          files.push(copiedFile);

        } catch (error) {
          failedFiles.push({
            file: file,
            error: error.message
          });
        }
      }

    } catch (error) {
      failedFiles.push({
        step: 'scan',
        error: error.message
      });
    }

    return { files, failedFiles, totalSize };
  }

  /**
   * Get all files from package directory recursively
   * Filters out common non-essential directories
   */
  async getAllPackageFiles(packagePath) {
    const files = [];
    const skipDirs = new Set([
      '.git',
      '.github',
      'dist',
      'build',
      'coverage',
      'test',
      'tests',
      '.next',
      '.nuxt',
      'cache'
    ]);

    const skipExtensions = new Set([
      '.map',
      '.ts',
      '.tsx',
      '.test.js',
      '.spec.js',
      '.env',
      '.lock'
    ]);

    async function traverse(dir) {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          // Skip hidden files and directories
          if (entry.name.startsWith('.') && entry.name !== '.npmignore') {
            continue;
          }

          // Skip specific directories
          if (skipDirs.has(entry.name)) {
            continue;
          }

          const fullPath = path.join(dir, entry.name);

          if (entry.isFile()) {
            // Include common source and config files
            const ext = path.extname(entry.name);
            if (
              /\.(js|mjs|cjs|json|css|html|svg|md|woff|woff2|ttf|otf)$/i.test(entry.name) &&
              !skipExtensions.has(ext)
            ) {
              files.push(fullPath);
            }
          } else if (entry.isDirectory()) {
            // Recursively traverse, including 'src' and other source directories
            await traverse(fullPath);
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not read ${dir}`));
      }
    }

    await traverse(packagePath);
    return files;
  }

  /**
   * ========================================================================
   * EXPORT MAPS & INDEX FILES
   * ========================================================================
   */

  /**
   * Generate export map from package.json
   */
  generateExportMap(pkgJson, packagePath) {
    const exports = new Map();

    // Get main entry point
    const main = pkgJson.main || 'index.js';
    exports.set('default', main);

    // Get named exports from 'exports' field
    if (pkgJson.exports && typeof pkgJson.exports === 'object') {
      for (const [exportName, exportPath] of Object.entries(pkgJson.exports)) {
        if (exportName === '.') {
          exports.set('default', exportPath);
        } else {
          const cleanName = exportName.replace(/^\.\//, '').split('/')[0];
          if (cleanName) {
            exports.set(cleanName, exportPath);
          }
        }
      }
    }

    return exports;
  }

  /**
   * Generate index.js file for package if it doesn't exist
   */
  generateIndexFile(pkgJson, exportMap) {
    let content = `/**
 * Generated index for ${pkgJson.name}
 * Auto-generated by PackageCollector
 */

`;

    const main = pkgJson.main || 'index.js';

    content += `// Main export\n`;
    content += `export * from './${main.replace(/\.js$/, '')}';\n`;
    content += `export { default } from './${main.replace(/\.js$/, '')}';\n\n`;

    if (exportMap.size > 1) {
      content += `// Named exports\n`;
      for (const [name, filePath] of exportMap) {
        if (name !== 'default') {
          const cleanPath = filePath.replace(/\.js$/, '').replace(/^\.\//, '');
          content += `export * as ${name} from './${cleanPath}';\n`;
        }
      }
    }

    return content;
  }

  /**
   * ========================================================================
   * REPORTING
   * ========================================================================
   */

  /**
   * Print collection report
   */
  printCollectionReport(session) {
    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('PACKAGE COLLECTION REPORT'));
    console.log(chalk.blue('='.repeat(70)));

    const report = session.getReport();

    console.log(chalk.gray(`\nPackages:`));
    console.log(chalk.gray(`  Total: ${report.total}`));
    console.log(chalk.green(`  Successful: ${report.successful}`));
    if (report.failed > 0) {
      console.log(chalk.red(`  Failed: ${report.failed}`));
    }

    console.log(chalk.gray(`\nFiles & Size:`));
    console.log(chalk.gray(`  Files: ${report.files}`));
    console.log(chalk.gray(`  Size: ${report.size}`));

    console.log(chalk.gray(`\nTime: ${report.duration}`));

    if (report.errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${report.errors.length}`));
      report.errors.forEach(err => {
        console.log(chalk.red(`  • ${err}`));
      });
    }

    if (report.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${report.warnings.length}`));
      report.warnings.forEach(warn => {
        console.log(chalk.yellow(`  • ${warn}`));
      });
    }

    if (session.isSuccessful()) {
      console.log(chalk.green(`\n✓ Collection successful!\n`));
    } else {
      console.log(chalk.red(`\n✗ Collection completed with issues\n`));
    }

    console.log(chalk.blue('='.repeat(70) + '\n'));
  }

  /**
   * Get session report
   */
  getSessionReport() {
    return this.currentSession ? this.currentSession.getReport() : null;
  }

  /**
   * Get collection statistics
   */
  getStats() {
    if (!this.currentSession) {
      return null;
    }

    return {
      totalPackages: this.currentSession.totalPackages,
      successful: this.currentSession.successCount,
      failed: this.currentSession.failureCount,
      totalFiles: this.currentSession.totalFiles,
      totalSize: this.currentSession.getTotalSizeMB() + ' MB',
      duration: this.currentSession.getDuration() + 'ms'
    };
  }
}
// ============================================================================
// EXPORTS
// ============================================================================

export {
  PackageCollector,
  PackageCollectionResult,
  CollectionSession,
  CopiedFile
};

export default PackageCollector;