/**
 * ============================================================================
 * FlutterJS Package Collector - Clean Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Collect resolved packages
 * - Copy package files to dist/node_modules/@flutterjs/ structure
 * - Generate collection statistics and reports
 * - Handle all collection failures gracefully
 * 
 * Uses shared utilities to avoid duplication
 * Location: cli/build/package-collector.js
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { PackageResolver } from './shared/package_resolver.js';
import { FileScanner, FileCopier } from './shared/file_utils.js';
import { CollectionResult, createCollectionSession } from './shared/types.js';
import { loadPackageJson } from './shared/utils.js';

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

    // Initialize shared utilities
    this.packageResolver = new PackageResolver(this.options.projectRoot, {
      debugMode: this.options.debugMode
    });

    this.fileScanner = new FileScanner({
      debugMode: this.options.debugMode
    });

    this.fileCopier = new FileCopier({
      debugMode: this.options.debugMode
    });

    // Setup output paths
    this.outputDir = path.join(this.options.projectRoot, this.options.outputDir);
    this.nodeModulesDir = path.join(this.outputDir, 'node_modules', '@flutterjs');

    // Session tracking
    this.currentSession = null;

    if (this.options.debugMode) {
      console.log(chalk.gray('[PackageCollector] Initialized'));
      console.log(chalk.gray(`  Project: ${this.options.projectRoot}`));
      console.log(chalk.gray(`  Output: ${this.outputDir}`));
      console.log(chalk.gray(`  NodeModules: ${this.nodeModulesDir}\n`));
    }
  }

  /**
   * Main entry point - collect and copy packages
   */
  async collectAndCopyPackages(resolution) {
    const session = createCollectionSession();
    this.currentSession = session;

    if (this.options.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(70)));
      console.log(chalk.blue('📦 Package Collection & Copying Started'));
      console.log(chalk.blue('='.repeat(70)));
      console.log(chalk.gray(`Destination: ${this.nodeModulesDir}\n`));
    }

    try {
      // Validate input
      if (!resolution || !resolution.packages || resolution.packages.size === 0) {
        session.addWarning('No packages to collect');
        session.complete();

        if (this.options.debugMode) {
          console.log(chalk.yellow('⚠️  No packages to collect\n'));
        }

        return session;
      }

      // Ensure output directory exists
      await fs.promises.mkdir(this.nodeModulesDir, { recursive: true });

      if (this.options.debugMode) {
        console.log(chalk.gray(`Found ${resolution.packages.size} packages:\n`));
        let idx = 0;
        for (const [name, info] of resolution.packages) {
          console.log(chalk.gray(`  [${++idx}] ${name}`));
          if (info.resolved) {
            console.log(chalk.gray(`      ✓ Path: ${info.path}`));
          } else {
            console.log(chalk.gray(`      ✗ Not resolved`));
          }
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

          // Continue with next package
          const failedResult = new CollectionResult(packageName);
          failedResult.error = error.message;
          session.addResult(failedResult);
        }
      }

      session.complete();

      if (this.options.debugMode) {
        this.printCollectionReport(session);
      }

      return session;

    } catch (error) {
      session.addError(`Collection failed: ${error.message}`);
      session.complete();

      if (this.options.debugMode) {
        console.log(chalk.red(`\n❌ Collection Error: ${error.message}\n`));
      }

      return session;
    }
  }

  /**
   * Collect and copy a single package
   */
  async collectPackage(packageName, packageInfo) {
    const result = new CollectionResult(packageName);

    try {
      // Get source path
      let sourcePath = packageInfo.path || packageInfo.actualPath;

      if (this.options.debugMode) {
        console.log(chalk.cyan(`\n[Package] ${packageName}`));
      }

      // If path not valid, try to resolve it
      if (!sourcePath || !fs.existsSync(sourcePath)) {
        const resolved = this.packageResolver.resolve(packageName);

        if (!resolved) {
          result.error = 'Package not found';
          if (this.options.debugMode) {
            console.log(chalk.red(`  ✗ Not found\n`));
          }
          return result;
        }

        sourcePath = resolved.path;
      }

      if (this.options.debugMode) {
        console.log(chalk.gray(`  Source: ${sourcePath}`));
      }

      // Load package.json
      try {
        const pkgJson = await loadPackageJson(sourcePath);
        result.version = pkgJson.version || '0.0.0';
      } catch (error) {
        result.error = `Invalid package.json: ${error.message}`;
        if (this.options.debugMode) {
          console.log(chalk.red(`  ✗ ${result.error}\n`));
        }
        return result;
      }

      // Determine destination
      const scopedName = this.getScopedPackageName(packageName);
      const destPath = path.join(this.nodeModulesDir, scopedName);
      result.destPath = destPath;
      result.sourcePath = sourcePath;

      if (this.options.debugMode) {
        console.log(chalk.gray(`  Dest: ${destPath}`));
      }

      // Create destination directory
      await fs.promises.mkdir(destPath, { recursive: true });

      // Scan files
      const allFiles = await this.fileScanner.getAllPackageFiles(sourcePath);

      if (this.options.debugMode) {
        console.log(chalk.gray(`  Files: ${allFiles.length}`));
      }

      if (allFiles.length === 0) {
        result.error = 'No files found in package';
        if (this.options.debugMode) {
          console.log(chalk.yellow(`  ⚠️  No files found\n`));
        }
        return result;
      }

      // Copy files
      const copyResult = await this.fileCopier.copyFiles(sourcePath, destPath, allFiles);

      result.copiedFiles = copyResult.files;
      result.failedFiles = copyResult.failedFiles;
      result.totalSize = copyResult.totalSize;
      result.success = copyResult.isSuccessful();

      if (this.options.debugMode) {
        console.log(chalk.green(`  ✓ Copied: ${result.copiedFiles.length} files`));
        console.log(chalk.gray(`  Size: ${result.getTotalSizeMB()} MB`));

        if (result.failedFiles.length > 0) {
          console.log(chalk.yellow(`  ⚠️  Failed: ${result.failedFiles.length} files\n`));
        } else {
          console.log();
        }
      }

    } catch (error) {
      result.success = false;
      result.error = error.message;

      if (this.options.debugMode) {
        console.log(chalk.red(`  ✗ Error: ${error.message}`));
        if (error.stack && this.options.debugMode) {
          console.log(chalk.red(`  ${error.stack}\n`));
        }
      }
    }

    return result;
  }

  /**
   * Extract scoped package name
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
   * Copy entire node_modules to output
   */
  async copyAllNodeModules() {
    if (this.options.debugMode) {
      console.log(chalk.blue('\n📦 Copying all node_modules...\n'));
    }

    const sourceNodeModules = path.join(this.options.projectRoot, 'node_modules');
    const destNodeModules = path.join(this.outputDir, 'node_modules');

    try {
      // Check if source exists
      if (!fs.existsSync(sourceNodeModules)) {
        console.warn(chalk.yellow(`⚠️  Source node_modules not found at: ${sourceNodeModules}`));
        return { filesCount: 0, totalSize: '0' };
      }

      // Copy entire directory
      const result = await this.fileCopier.copyDirectoryRecursive(
        sourceNodeModules,
        destNodeModules
      );

      if (this.options.debugMode) {
        console.log(chalk.green(`✓ node_modules copied`));
        console.log(chalk.gray(`  Files: ${result.filesCount}`));
        console.log(chalk.gray(`  Size: ${result.totalSize} MB\n`));
      }

      return result;

    } catch (error) {
      console.error(chalk.red(`✗ Failed to copy node_modules: ${error.message}\n`));
      return { filesCount: 0, totalSize: '0' };
    }
  }

  /**
   * Print collection report
   */
  printCollectionReport(session) {
    const report = session.getReport();

    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('📊 Collection Report'));
    console.log(chalk.blue('='.repeat(70)));

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

    // Detailed package results
    console.log(chalk.gray(`\nPackage Details:`));
    for (const result of report.results) {
      const icon = result.success ? chalk.green('✓') : chalk.red('✗');
      console.log(`${icon} ${result.packageName}`);

      if (result.success) {
        console.log(chalk.gray(`    v${result.version} | ${result.files} files | ${result.size}`));
      } else {
        console.log(chalk.red(`    Error: ${result.error}`));
      }
    }

    // Errors
    if (report.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors: ${report.errors.length}`));
      report.errors.forEach(err => {
        console.log(chalk.red(`  • ${err}`));
      });
    }

    // Warnings
    if (report.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings: ${report.warnings.length}`));
      report.warnings.forEach(warn => {
        console.log(chalk.yellow(`  • ${warn}`));
      });
    }

    // Summary
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

  /**
   * Get list of collected packages
   */
  getCollectedPackages() {
    if (!this.currentSession) {
      return [];
    }

    const packages = [];
    for (const result of this.currentSession.results) {
      if (result.success) {
        packages.push({
          name: result.packageName,
          version: result.version,
          path: result.destPath,
          files: result.copiedFiles.length,
          size: result.getTotalSizeMB() + ' MB'
        });
      }
    }

    return packages;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PackageCollector };
export default PackageCollector;