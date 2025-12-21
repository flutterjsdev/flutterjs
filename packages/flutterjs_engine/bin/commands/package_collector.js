/**
 * ============================================================================
 * FlutterJS Package Collector - Complete Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Copies resolved package files to output directory
 * - Creates index files for easy importing
 * - Generates export maps for code transformation
 * - Tracks copied files for bundling
 * - Validates and reports collection status
 * 
 * Location: cli/build/package-collector.js
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// ============================================================================
// COLLECTION DATA TYPES
// ============================================================================

/**
 * Information about a copied file
 */
class CopiedFile {
  constructor(source, dest, packageName, relative) {
    this.source = source;              // Absolute source path
    this.dest = dest;                  // Absolute dest path
    this.package = packageName;        // '@flutterjs/material'
    this.relative = relative;          // Relative path in package
    this.size = 0;                     // File size in bytes
    this.copied = false;               // Whether successfully copied
    this.error = null;                 // Error if any
  }

  getSizeKB() {
    return (this.size / 1024).toFixed(2);
  }
}

/**
 * Collection result summary
 */
class CollectionResult {
  constructor() {
    this.copiedFiles = [];             // All copied files
    this.failedFiles = [];             // Files that failed to copy
    this.indexFiles = [];              // Generated index files
    this.exportMaps = new Map();       // package -> export map
    this.errors = [];
    this.warnings = [];
    this.totalSize = 0;                // Total bytes copied
    this.startTime = null;
    this.endTime = null;
  }

  addCopiedFile(copiedFile) {
    this.copiedFiles.push(copiedFile);
    this.totalSize += copiedFile.size;
  }

  addFailedFile(copiedFile) {
    this.failedFiles.push(copiedFile);
  }

  addIndexFile(path, content) {
    this.indexFiles.push({ path, content });
  }

  addExportMap(packageName, exports) {
    this.exportMaps.set(packageName, exports);
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  get totalFiles() {
    return this.copiedFiles.length + this.failedFiles.length;
  }

  get successCount() {
    return this.copiedFiles.length;
  }

  get failureCount() {
    return this.failedFiles.length;
  }

  get totalSizeMB() {
    return (this.totalSize / (1024 * 1024)).toFixed(2);
  }

  hasFailed() {
    return this.failedFiles.length > 0 || this.errors.length > 0;
  }

  toString() {
    return `
Copied ${this.successCount} files (${this.totalSizeMB} MB)
Failed: ${this.failureCount}
Index files: ${this.indexFiles.length}
Errors: ${this.errors.length}
Warnings: ${this.warnings.length}
    `.trim();
  }
}

// ============================================================================
// MAIN COLLECTOR CLASS
// ============================================================================

class PackageCollector {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      outputDir: config.outputDir || '.dev',
      libDir: config.libDir || 'lib',
      debugMode: config.debugMode || false,
      createIndexFiles: config.createIndexFiles !== false,
      generateExportMaps: config.generateExportMaps !== false,
      overwrite: config.overwrite !== false,
      preserveStructure: config.preserveStructure !== false,
      ...config
    };

    this.projectRoot = this.config.projectRoot;
    this.outputBase = path.join(this.projectRoot, this.config.outputDir);
    this.libBase = path.join(this.outputBase, this.config.libDir);
    this.result = new CollectionResult();
  }

  /**
   * MAIN ENTRY POINT: Collect all package files
   */
  async collect(resolutionResult) {
    this.result.startTime = Date.now();

    if (this.config.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(60)));
      console.log(chalk.blue('PACKAGE COLLECTION STARTED'));
      console.log(chalk.blue('='.repeat(60)));
      console.log(chalk.gray(`\nOutput: ${this.libBase}\n`));
    }

    try {
      // Step 1: Ensure directories exist
      await this.ensureDirectories();

      // Step 2: Copy all files
      await this.copyAllFiles(resolutionResult);

      // Step 3: Create index files
      if (this.config.createIndexFiles) {
        await this.createIndexFiles(resolutionResult);
      }

      // Step 4: Generate export maps
      if (this.config.generateExportMaps) {
        await this.generateExportMaps(resolutionResult);
      }

      // Step 5: Validate collection
      await this.validateCollection();

      this.result.endTime = Date.now();

      if (this.config.debugMode) {
        this.printSummary();
      }

      return this.result;

    } catch (error) {
      this.result.addError(`Collection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure output directories exist
   */
  async ensureDirectories() {
    if (this.config.debugMode) {
      console.log(chalk.gray('📁 Creating directories...'));
    }

    try {
      // Create main output directory
      await fs.promises.mkdir(this.outputBase, { recursive: true });

      // Create lib directory
      await fs.promises.mkdir(this.libBase, { recursive: true });

      // Create package directories
      for (const dir of ['packages', 'vendor', 'assets']) {
        await fs.promises.mkdir(path.join(this.libBase, dir), { recursive: true });
      }

      if (this.config.debugMode) {
        console.log(chalk.green(`✓ Created ${this.libBase}\n`));
      }

    } catch (error) {
      const message = `Failed to create directories: ${error.message}`;
      this.result.addError(message);
      throw new Error(message);
    }
  }

  /**
   * Copy all package files
   */
  async copyAllFiles(resolutionResult) {
    if (this.config.debugMode) {
      console.log(chalk.blue('📦 Copying package files...\n'));
    }

    const allFiles = resolutionResult.allFiles;

    for (const fileInfo of allFiles) {
      await this.copyFile(fileInfo, resolutionResult);
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * Copy single file
   */
  async copyFile(fileInfo, resolutionResult) {
    // Determine source file info
    let packageName = null;
    let relativePath = fileInfo.relative;

    // Find which package this file belongs to
    for (const [name, resolved] of resolutionResult.packages) {
      if (fileInfo.path.startsWith(resolved.packagePath)) {
        packageName = name;
        break;
      }
    }

    // Determine destination path
    let destPath;
    if (this.config.preserveStructure && packageName) {
      // Preserve structure: lib/@flutterjs/material/container.js
      const cleanPackageName = packageName.replace('@', '').replace('/', '-');
      destPath = path.join(this.libBase, cleanPackageName, path.basename(fileInfo.path));
    } else {
      // Flat structure: lib/container.js
      destPath = path.join(this.libBase, path.basename(fileInfo.path));
    }

    const copiedFile = new CopiedFile(
      fileInfo.path,
      destPath,
      packageName || 'unknown',
      relativePath
    );

    try {
      // Check if already exists
      if (fs.existsSync(destPath) && !this.config.overwrite) {
        this.result.addWarning(
          `File already exists, skipping: ${path.relative(this.libBase, destPath)}`
        );
        copiedFile.copied = false;
        return;
      }

      // Create parent directory
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

      // Copy file
      await fs.promises.copyFile(fileInfo.path, destPath);

      // Get file size
      const stats = await fs.promises.stat(destPath);
      copiedFile.size = stats.size;
      copiedFile.copied = true;

      this.result.addCopiedFile(copiedFile);

      if (this.config.debugMode) {
        const sizeStr = copiedFile.getSizeKB().padStart(8);
        console.log(
          chalk.green(`✓ ${sizeStr} KB`) +
          chalk.gray(` ${path.relative(this.libBase, destPath)}`)
        );
      }

    } catch (error) {
      copiedFile.error = error.message;
      this.result.addFailedFile(copiedFile);

      if (this.config.debugMode) {
        console.log(
          chalk.red(`✗ Error: ${error.message}`) +
          chalk.gray(` ${fileInfo.relative}`)
        );
      }
    }
  }

  /**
   * Create index files for easy importing
   */
  async createIndexFiles(resolutionResult) {
    if (this.config.debugMode) {
      console.log(chalk.blue('\n📝 Creating index files...\n'));
    }

    // Group files by package
    const packageGroups = new Map();

    for (const copiedFile of this.result.copiedFiles) {
      if (!packageGroups.has(copiedFile.package)) {
        packageGroups.set(copiedFile.package, []);
      }
      packageGroups.get(copiedFile.package).push(copiedFile);
    }

    // Create root index.js
    await this.createRootIndex(resolutionResult, packageGroups);

    // Create package-specific indices
    for (const [packageName, files] of packageGroups) {
      await this.createPackageIndex(packageName, files, resolutionResult);
    }

    if (this.config.debugMode) {
      console.log();
    }
  }

  /**
   * Create root index.js that exports everything
   */
  async createRootIndex(resolutionResult, packageGroups) {
    let content = `/**
 * Auto-generated index file
 * Exports all packages and their contents
 * Generated at: ${new Date().toISOString()}
 */

`;

    // Create imports and re-exports
    for (const [packageName, resolved] of resolutionResult.packages) {
      const cleanName = packageName.replace('@flutterjs/', '').replace('-', '_');
      content += `// ========================================\n`;
      content += `// ${packageName}\n`;
      content += `// ========================================\n\n`;

      // Export each named export
      for (const [exportName, filePath] of resolved.exports) {
        const relativePath = this.getImportPath(filePath, packageName);
        content += `export { ${exportName} } from '${relativePath}';\n`;
      }

      content += '\n';
    }

    const indexPath = path.join(this.libBase, 'index.js');
    await fs.promises.writeFile(indexPath, content, 'utf-8');

    this.result.addIndexFile(indexPath, content);

    if (this.config.debugMode) {
      console.log(chalk.green(`✓ Created root index.js`));
    }
  }

  /**
   * Create package-specific index.js
   */
  async createPackageIndex(packageName, files, resolutionResult) {
    const resolved = resolutionResult.packages.get(packageName);
    if (!resolved) return;

    const cleanName = packageName.replace('@flutterjs/', '').replace('-', '_');
    const packageDir = path.join(this.libBase, cleanName);

    let content = `/**
 * ${packageName} - Auto-generated index
 * Generated at: ${new Date().toISOString()}
 */

`;

    // Create re-exports for each file
    for (const [exportName, filePath] of resolved.exports) {
      const fileName = path.basename(filePath);
      const fileNameWithoutExt = fileName.replace('.js', '');
      
      content += `export * from './${fileNameWithoutExt}.js';\n`;
      content += `export { default as ${exportName} } from './${fileNameWithoutExt}.js';\n`;
    }

    const indexPath = path.join(packageDir, 'index.js');
    
    // Create package directory if needed
    await fs.promises.mkdir(packageDir, { recursive: true });
    await fs.promises.writeFile(indexPath, content, 'utf-8');

    this.result.addIndexFile(indexPath, content);

    if (this.config.debugMode) {
      console.log(chalk.green(`✓ Created ${packageName} index.js`));
    }
  }

  /**
   * Generate export maps for code transformation
   */
  async generateExportMaps(resolutionResult) {
    if (this.config.debugMode) {
      console.log(chalk.blue('\n📊 Generating export maps...\n'));
    }

    const exportMaps = {};

    for (const [packageName, resolved] of resolutionResult.packages) {
      const exportsMap = {};

      for (const [exportName, filePath] of resolved.exports) {
        const importPath = this.getImportPath(filePath, packageName);
        exportsMap[exportName] = importPath;
      }

      exportMaps[packageName] = exportsMap;
      this.result.addExportMap(packageName, exportsMap);

      if (this.config.debugMode) {
        console.log(chalk.gray(`${packageName}:`));
        for (const [name, path] of Object.entries(exportsMap)) {
          console.log(chalk.gray(`  ${name} → ${path}`));
        }
      }
    }

    // Write export maps to JSON file
    const mapsPath = path.join(this.libBase, 'export-maps.json');
    await fs.promises.writeFile(
      mapsPath,
      JSON.stringify(exportMaps, null, 2),
      'utf-8'
    );

    if (this.config.debugMode) {
      console.log(chalk.green(`\n✓ Saved export maps to export-maps.json\n`));
    }
  }

  /**
   * Get import path for a file
   */
  getImportPath(filePath, packageName) {
    const fileName = path.basename(filePath);
    const fileWithoutExt = fileName.replace('.js', '');

    if (this.config.preserveStructure) {
      const cleanName = packageName.replace('@', '').replace('/', '-');
      return `./${cleanName}/${fileWithoutExt}.js`;
    } else {
      return `./${fileWithoutExt}.js`;
    }
  }

  /**
   * Validate collection results
   */
  async validateCollection() {
    if (this.config.debugMode) {
      console.log(chalk.blue('🔍 Validating collection...\n'));
    }

    // Check if critical files were copied
    const criticalFiles = [
      'widget.js',
      'stateless_widget.js',
      'stateful_widget.js'
    ];

    const copiedFileNames = this.result.copiedFiles.map(f => path.basename(f.dest));

    for (const critical of criticalFiles) {
      if (!copiedFileNames.includes(critical)) {
        this.result.addWarning(`Critical file not found: ${critical}`);
      }
    }

    // Check index files
    if (this.result.indexFiles.length === 0) {
      this.result.addWarning('No index files were created');
    }

    // Check for duplicate files
    const destPaths = new Set();
    const duplicates = [];

    for (const file of this.result.copiedFiles) {
      if (destPaths.has(file.dest)) {
        duplicates.push(file.dest);
      }
      destPaths.add(file.dest);
    }

    if (duplicates.length > 0) {
      this.result.addWarning(`Duplicate files detected: ${duplicates.length}`);
    }

    if (this.config.debugMode && this.result.errors.length === 0) {
      console.log(chalk.green('✓ Collection validated\n'));
    }
  }

  /**
   * Print summary of collection
   */
  printSummary() {
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.blue('COLLECTION SUMMARY'));
    console.log(chalk.blue('='.repeat(60)));

    console.log(chalk.gray(`\nFiles Copied: ${this.result.successCount}`));
    console.log(chalk.gray(`Total Size: ${this.result.totalSizeMB} MB`));
    console.log(chalk.gray(`Index Files: ${this.result.indexFiles.length}`));
    console.log(chalk.gray(`Export Maps: ${this.result.exportMaps.size}`));

    if (this.result.failureCount > 0) {
      console.log(chalk.red(`\nFailed: ${this.result.failureCount}`));
      for (const file of this.result.failedFiles) {
        console.log(chalk.red(`  ✗ ${file.relative}`));
        if (file.error) {
          console.log(chalk.gray(`    ${file.error}`));
        }
      }
    }

    if (this.result.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${this.result.warnings.length}`));
      for (const warning of this.result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    }

    if (this.result.errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${this.result.errors.length}`));
      for (const error of this.result.errors) {
        console.log(chalk.red(`  ✗ ${error}`));
      }
    }

    const duration = this.result.endTime - this.result.startTime;
    console.log(chalk.gray(`\nTime: ${duration}ms`));

    if (!this.result.hasFailed()) {
      console.log(chalk.green('\n✅ Collection successful!\n'));
    } else {
      console.log(chalk.red('\n❌ Collection completed with errors\n'));
    }

    console.log(chalk.blue('='.repeat(60) + '\n'));
  }

  /**
   * Get collected files for bundling
   */
  getCollectedFiles() {
    return this.result.copiedFiles.map(f => ({
      source: f.source,
      dest: f.dest,
      package: f.package,
      size: f.size
    }));
  }

  /**
   * Get export map for code transformation
   */
  getExportMaps() {
    return this.result.exportMaps;
  }

  /**
   * Get all index file paths
   */
  getIndexFiles() {
    return this.result.indexFiles.map(i => i.path);
  }

  /**
   * Check if collection was successful
   */
  isSuccessful() {
    return !this.result.hasFailed();
  }

  /**
   * Get detailed report
   */
  getReport() {
    return {
      success: !this.result.hasFailed(),
      files: {
        copied: this.result.successCount,
        failed: this.result.failureCount,
        total: this.result.totalFiles
      },
      size: {
        bytes: this.result.totalSize,
        kb: (this.result.totalSize / 1024).toFixed(2),
        mb: this.result.totalSizeMB
      },
      indices: this.result.indexFiles.length,
      exports: this.result.exportMaps.size,
      time: this.result.endTime - this.result.startTime,
      errors: this.result.errors,
      warnings: this.result.warnings
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PackageCollector,
  CopiedFile,
  CollectionResult
};