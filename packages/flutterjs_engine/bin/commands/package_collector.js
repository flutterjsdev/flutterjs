/**
 * ============================================================================
 * Enhanced PackageCollector - FIXED VERSION
 * ============================================================================
 *
 * âœ… FIXED: Copies packages to correct node_modules/@flutterjs/ structure
 *
 * Responsibilities:
 * 1. Collect resolved packages from DependencyResolver
 * 2. Copy package files to dist/node_modules/@flutterjs/ structure
 * 3. Generate export maps for each package
 * 4. Report collection statistics
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
    this.copiedDependencies = [];
    this.globalErrors = [];
    this.startTime = Date.now();
    this.endTime = null;
  }

  addResult(result) {
    if (!result) {
      console.warn(chalk.yellow('⚠️  Warning: addResult called with null/undefined'));
      return;
    }

    this.results.set(result.packageName, result);
    this.totalPackages++;

    if (result.success) {
      this.successCount++;
      this.totalSize += result.totalSize || 0;
      this.totalFiles += result.copiedFiles || 0;
      if (result.dependencies) {
        this.copiedDependencies.push(...result.dependencies);
      }
    } else {
      this.failureCount++;
      if (result.error) {
        this.globalErrors.push(result.error);
      }
    }
  }

  getReport() {
    return {
      total: this.totalPackages,
      successful: this.successCount,
      failed: this.failureCount,
      files: this.totalFiles,
      dependencies: this.copiedDependencies.length,
      size: (this.totalSize / (1024 * 1024)).toFixed(2) + ' MB',
      duration: (this.endTime - this.startTime) + 'ms'
    };
  }
}



// ============================================================================
// MAIN PACKAGE COLLECTOR CLASS - FIXED
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
    this.nodeModulesDir = path.join(this.outputDir, 'node_modules');
    this.flutterJsDir = path.join(this.nodeModulesDir, '@flutterjs');
    this.currentSession = null;

    if (this.options.debugMode) {
      console.log(chalk.gray('[PackageCollector] Initialized'));
      console.log(chalk.gray(`  Project: ${this.projectRoot}`));
      console.log(chalk.gray(`  NodeModules: ${this.nodeModulesDir}\n`));
    }
  }

  /**
   * Main entry point: Collect and copy packages
   */
  async collectAndCopyPackages(resolution) {
    console.log(chalk.blue('\n📦 Phase 4: Collecting packages...'));
    console.log(chalk.blue('='.repeat(70)));

    const session = new CollectionSession();
    this.currentSession = session;

    try {
      // ✅ Create output directory: projectRoot/node_modules/@flutterjs
      // This is where the dev server will serve from
      const nodeModulesDir = path.join(this.projectRoot, 'node_modules', '@flutterjs');
      await fs.promises.mkdir(nodeModulesDir, { recursive: true });
      console.log(chalk.gray(`Output ready: ${nodeModulesDir}\n`));

      if (!resolution || !resolution.packages || resolution.packages.size === 0) {
        console.log(chalk.yellow('ℹ️  No packages to collect'));
        session.endTime = Date.now();
        return session;
      }

      // ✅ NEW STEP: Install dependencies for each package FIRST
      if (this.options.autoInstall) {
        await this.installDependenciesForPackages(resolution, session);
      }

      // Copy each main package
      const packages = Array.from(resolution.packages.entries());
      console.log(chalk.gray(`\nPackages to copy: ${packages.length}\n`));

      for (const [packageName, packageInfo] of packages) {
        try {
          await this.copyPackage(packageName, packageInfo, session, nodeModulesDir);
        } catch (pkgError) {
          console.error(chalk.red(`\n✗ Error copying ${packageName}: ${pkgError.message}`));
          session.addResult({
            packageName,
            success: false,
            copiedFiles: [],
            totalSize: 0,
            error: pkgError.message
          });
        }
      }

      // Copy nested dependencies
      console.log(chalk.yellow(`\n📦 Handling nested dependencies...`));
      await this.copyNestedDependencies(packages, nodeModulesDir);

      session.endTime = Date.now();

      // Print report
      this.printCollectionReport(session);

      return session;

    } catch (error) {
      console.error(chalk.red(`✗ Collection failed: ${error.message}`));
      console.error(chalk.red(`  Stack: ${error.stack}`));
      session.endTime = Date.now();
      return session;
    }
  }


  printCollectionReport(session) {
    if (!session) {
      console.log(chalk.yellow('⚠️  No session data to report'));
      return;
    }

    console.log(chalk.blue('='.repeat(70)));
    const report = session.getReport();

    if (!report) {
      console.log(chalk.yellow('⚠️  No report data available'));
      console.log(chalk.blue('='.repeat(70) + '\n'));
      return;
    }

    console.log(chalk.green(`✓ Collection complete!`));
    console.log(chalk.gray(`  Output: projectRoot/node_modules/@flutterjs/`));
    console.log(chalk.gray(`  Main packages: ${report.successful}/${report.total}`));
    console.log(chalk.gray(`  Files: ${report.files}`));
    console.log(chalk.gray(`  Size: ${report.size}`));

    // ✅ Check if installationSummary exists
    if (report.installationSummary) {
      if (report.installationSummary.packagesInstalled > 0) {
        console.log(chalk.green(`  Dependencies installed: ${report.installationSummary.packagesInstalled}`));
      }

      if (report.installationSummary.installationErrors > 0) {
        console.log(chalk.yellow(`  Installation errors: ${report.installationSummary.installationErrors}`));
      }
    }

    console.log(chalk.blue('='.repeat(70) + '\n'));
  }


  /**
   * Copy a single package
   */
  async copyPackage(fullPackageName, packageInfo, session, nodeModulesDir) {
    const packageName = fullPackageName.split('/')[1];

    console.log(chalk.cyan(`\nCopying: ${fullPackageName}`));

    try {
      // Validate packageInfo
      if (!packageInfo || !packageInfo.source) {
        console.log(chalk.red(`  ✗ Package info invalid`));
        session.addResult({
          packageName: fullPackageName,
          success: false,
          copiedFiles: [],
          totalSize: 0,
          error: 'Invalid package info'
        });
        return;
      }

      // Validate source
      const source = packageInfo.source;
      if (!fs.existsSync(source)) {
        console.log(chalk.red(`  ✗ Source not found: ${source}`));
        session.addResult({
          packageName: fullPackageName,
          success: false,
          copiedFiles: [],
          totalSize: 0,
          error: 'Source not found'
        });
        return;
      }

      console.log(chalk.gray(`  From: ${source}`));

      // Destination: projectRoot/node_modules/@flutterjs/[name]
      const destination = path.join(nodeModulesDir, packageName);
      console.log(chalk.gray(`  To:   ${destination}`));

      // Remove existing
      if (fs.existsSync(destination)) {
        await this.removeDirectory(destination);
      }

      // Create destination
      await fs.promises.mkdir(destination, { recursive: true });

      // Copy package files
      const result = await this.copyDirectoryRecursive(source, destination, {
        excludeNodeModules: false
      });

      console.log(chalk.green(`  ✓ Success`));
      console.log(chalk.gray(`    Files: ${result.count}`));
      console.log(chalk.gray(`    Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`));
      if (result.depsCount > 0) {
        console.log(chalk.gray(`    Dependencies: ${result.depsCount}`));
      }

      const resultObj = new PackageCollectionResult(fullPackageName);
      resultObj.success = true;
      resultObj.source = source;
      resultObj.destinationPath = destination;
      resultObj.copiedFiles = result.copiedFiles || [];
      resultObj.totalSize = result.size;
      resultObj.depsInstalled = result.depsCount > 0;
      resultObj.depsCount = result.depsCount;

      session.addResult(resultObj);

    } catch (error) {
      console.log(chalk.red(`  ✗ Error: ${error.message}`));
      session.addResult({
        packageName: fullPackageName,
        success: false,
        copiedFiles: [],
        totalSize: 0,
        error: error.message
      });
    }
  }


  /**
   * âœ… NEW: Copy nested dependencies from each package
   */
  async copyNestedDependencies(packages, nodeModulesDir) {
    const copiedDeps = new Set();

    for (const [packageName, packageInfo] of packages) {
      const sourceDir = packageInfo.source;
      if (!sourceDir) continue;

      const nestedNodeModules = path.join(sourceDir, 'node_modules');

      if (!fs.existsSync(nestedNodeModules)) {
        continue;
      }

      console.log(chalk.gray(`\nChecking ${packageName} dependencies...`));

      try {
        const entries = await fs.promises.readdir(nestedNodeModules);

        for (const entry of entries) {
          const entryPath = path.join(nestedNodeModules, entry);
          const stat = fs.statSync(entryPath);

          if (!stat.isDirectory()) continue;

          // Handle @flutterjs/* packages
          if (entry === '@flutterjs') {
            console.log(chalk.blue(`  🔦 Found @flutterjs packages in ${packageName}`));

            const flutterPackages = await fs.promises.readdir(entryPath);
            for (const pkgName of flutterPackages) {
              const pkgPath = path.join(entryPath, pkgName);
              const pkgStat = fs.statSync(pkgPath);

              if (!pkgStat.isDirectory()) continue;

              const fullName = `@flutterjs/${pkgName}`;

              if (copiedDeps.has(fullName)) {
                console.log(chalk.gray(`    - ${fullName} (already copied)`));
                continue;
              }

              const destPath = path.join(nodeModulesDir, pkgName);

              if (!fs.existsSync(destPath)) {
                console.log(chalk.yellow(`    + ${fullName}`));

                const result = await this.copyDirectoryRecursive(pkgPath, destPath);

                console.log(chalk.gray(`      ${result.count} files, ${(result.size / 1024).toFixed(2)} KB`));
                copiedDeps.add(fullName);
              } else {
                console.log(chalk.gray(`    ~ ${fullName} (exists)`));
              }
            }
          }
        }
      } catch (error) {
        console.warn(chalk.yellow(`  ⚠ Error processing dependencies: ${error.message}`));
      }
    }

    if (copiedDeps.size > 0) {
      console.log(chalk.green(`\n✓ Copied ${copiedDeps.size} dependencies`));
    }
  }
  /**
   * Copy directory recursively
   */
  async copyDirectoryRecursive(src, dest, options = {}) {
    let fileCount = 0;
    let totalSize = 0;
    let depsCount = 0;
    const copiedFiles = [];

    const skipDirs = new Set([
      '.git', '.github', '.next', '.nuxt',
      'coverage', 'test', 'tests', '__tests__'
    ]);

    const skipFiles = new Set([
      '.DS_Store', '.env', '.gitignore', '.npmignore',
      'package-lock.json', 'yarn.lock', 'README.md', 'LICENSE'
    ]);

    const traverse = async (srcPath, destPath, depth = 0) => {
      try {
        await fs.promises.mkdir(destPath, { recursive: true });
        const entries = await fs.promises.readdir(srcPath, { withFileTypes: true });

        for (const entry of entries) {
          // Skip
          if (skipDirs.has(entry.name) || skipFiles.has(entry.name)) {
            continue;
          }

          if (entry.name.startsWith('.')) {
            continue;
          }

          const srcFile = path.join(srcPath, entry.name);
          const destFile = path.join(destPath, entry.name);

          if (entry.isDirectory()) {
            // Track node_modules depth
            if (entry.name === 'node_modules') {
              depsCount++;
            }

            // Recurse
            await traverse(srcFile, destFile, depth + 1);
          } else if (entry.isFile()) {
            // Copy file
            await fs.promises.copyFile(srcFile, destFile);
            const stat = await fs.promises.stat(destFile);
            totalSize += stat.size;
            fileCount++;
            copiedFiles.push(destFile);
          }
        }
      } catch (err) {
        console.warn(chalk.yellow(`    ⚠ Error: ${err.message}`));
      }
    };

    await traverse(src, dest);

    return { count: fileCount, size: totalSize, depsCount, copiedFiles };
  }

  /**
   * Remove directory recursively
   */
  async removeDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await this.removeDirectory(fullPath);
        } else {
          await fs.promises.unlink(fullPath);
        }
      }

      await fs.promises.rmdir(dirPath);
    } catch (err) {
      console.warn(chalk.yellow(`Could not remove ${dirPath}: ${err.message}`));
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    if (!this.currentSession) return null;

    const report = this.currentSession.getReport();
    return {
      totalPackages: report.total,
      successful: report.successful,
      failed: report.failed,
      totalFiles: report.files,
      totalSize: report.size
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