/**
 * ============================================================================
 * FlutterJS Package Installer - Clean Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Install packages from multiple sources (SDK, npm, local)
 * - Copy package files to dist/ directory
 * - Validate package structures
 * - Generate installation reports
 * - Handle installation failures gracefully
 * 
 * Uses shared utilities to avoid duplication
 * Location: cli/package_manager/package-installer.js
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { PackageResolver } from './shared/package_resolver.js';
import { FileScanner, FileCopier } from './shared/file_utils.js';
import { loadPackageJson, validatePackage, getScopedPackageName } from './shared/utils.js';
import { InstallationResult, createInstallationSession } from './shared/types.js';

// ============================================================================
// MAIN PACKAGE INSTALLER CLASS
// ============================================================================

class PackageInstaller {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      outputDir: options.outputDir || 'dist',
      validatePackages: options.validatePackages !== false,
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
    this.outputBase = path.join(this.options.projectRoot, this.options.outputDir);
    this.packagesBase = path.join(this.outputBase, 'packages');
    this.nodeModulesDir = path.join(this.outputBase, 'node_modules', '@flutterjs');

    // Session tracking
    this.currentSession = null;

    if (this.options.debugMode) {
      console.log(chalk.gray('[PackageInstaller] Initialized'));
      console.log(chalk.gray(`  Project: ${this.options.projectRoot}`));
      console.log(chalk.gray(`  Output: ${this.outputBase}`));
      console.log(chalk.gray(`  Packages: ${this.packagesBase}\n`));
    }
  }

  /**
   * Main entry point - install single package
   */
  async installPackage(packageName) {
    const result = new InstallationResult(packageName);

    try {
      if (this.options.debugMode) {
        console.log(chalk.cyan(`\n[Install] ${packageName}`));
      }

      // Resolve package location
      const resolved = this.packageResolver.resolve(packageName);

      if (!resolved) {
        // Package not found locally - allow build to continue
        result.success = true;
        result.version = '0.0.0';
        result.filesCount = 0;
        result.size = 0;
        result.warnings.push(
          `Package not found locally, will use from CDN or bundled distribution`
        );

        if (this.options.debugMode) {
          console.log(chalk.yellow(`  ⚠️  Not found locally (will use CDN)\n`));
        }

        return result;
      }

      result.sourcePath = resolved.path;

      if (this.options.debugMode) {
        console.log(chalk.gray(`  Source: ${resolved.path}`));
        console.log(chalk.gray(`  Type: ${resolved.source}`));
      }

      // Load package.json
      try {
        const pkgJson = await loadPackageJson(resolved.path);
        result.version = pkgJson.version || '1.0.0';

        // Validate package structure
        if (this.options.validatePackages) {
          const validation = validatePackage(pkgJson, resolved.path);
          if (!validation.valid) {
            result.warnings.push(...validation.errors);
          }
        }
      } catch (error) {
        result.success = true; // Allow build to continue
        result.error = error.message;
        result.warnings.push(`Could not validate package.json: ${error.message}`);

        if (this.options.debugMode) {
          console.log(chalk.yellow(`  ⚠️  ${error.message}\n`));
        }

        return result;
      }

      // Determine destination path
      const destPath = this.getDestinationPath(packageName);
      result.destPath = destPath;

      if (this.options.debugMode) {
        console.log(chalk.gray(`  Dest: ${destPath}`));
      }

      // Create destination directory
      await fs.promises.mkdir(destPath, { recursive: true });

      // Scan package files
      const files = await this.fileScanner.getAllPackageFiles(resolved.path);

      if (this.options.debugMode) {
        console.log(chalk.gray(`  Files: ${files.length}`));
      }

      if (files.length === 0) {
        result.success = true;
        result.filesCount = 0;
        result.size = 0;
        result.warnings.push('No files found in package');

        if (this.options.debugMode) {
          console.log(chalk.yellow(`  ⚠️  No files found\n`));
        }

        return result;
      }

      // Copy files
      const copyResult = await this.fileCopier.copyFiles(
        resolved.path,
        destPath,
        files
      );

      result.filesCount = copyResult.files.length;
      result.size = copyResult.totalSize;
      result.success = true;

      if (this.options.debugMode) {
        console.log(chalk.green(`  ✓ Copied: ${result.filesCount} files`));
        console.log(chalk.gray(`  Size: ${result.getSizeKB()} KB\n`));

        if (copyResult.failedFiles.length > 0) {
          console.log(chalk.yellow(`  ⚠️  Failed: ${copyResult.failedFiles.length} files`));
          copyResult.failedFiles.forEach(f => {
            console.log(chalk.gray(`      • ${f.file}: ${f.error}`));
          });
        }
      }

    } catch (error) {
      result.success = true; // Allow build to continue
      result.error = error.message;
      result.warnings.push(`Installation error: ${error.message}`);

      if (this.options.debugMode) {
        console.log(chalk.yellow(`  ⚠️  ${error.message}`));
        console.log(chalk.gray(`  Build will continue without local files\n`));
      }
    }

    return result;
  }

  /**
   * Install multiple packages
   */
  async installPackages(packageNames) {
    const session = createInstallationSession();
    this.currentSession = session;

    if (this.options.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(70)));
      console.log(chalk.blue(`📦 Installing ${packageNames.length} packages`));
      console.log(chalk.blue('='.repeat(70)));
    }

    try {
      // Ensure output directories exist
      await fs.promises.mkdir(this.packagesBase, { recursive: true });
      await fs.promises.mkdir(this.nodeModulesDir, { recursive: true });

      // Install each package
      for (const packageName of packageNames) {
        const result = await this.installPackage(packageName);
        session.addResult(result);
      }

    } catch (error) {
      session.addError(`Installation failed: ${error.message}`);
      if (this.options.debugMode) {
        console.log(chalk.red(`\n❌ Error: ${error.message}\n`));
      }
    }

    session.complete();

    if (this.options.debugMode) {
      this.printInstallationReport(session);
    }

    return session;
  }

  /**
   * Install all SDK packages
   */
  async installAllSdk() {
    const sdkPackages = this.packageResolver.listSdkPackages();
    const packageNames = sdkPackages.map(p => p.name);

    if (this.options.debugMode) {
      console.log(chalk.blue(`\nFound ${packageNames.length} SDK packages`));
      packageNames.forEach(name => console.log(chalk.gray(`  • ${name}`)));
    }

    return this.installPackages(packageNames);
  }

  /**
   * Install all npm packages
   */
  async installAllNpm() {
    const npmPackages = this.packageResolver.listNpmPackages();
    const packageNames = npmPackages.map(p => p.name);

    if (this.options.debugMode) {
      console.log(chalk.blue(`\nFound ${packageNames.length} npm packages`));
      packageNames.forEach(name => console.log(chalk.gray(`  • ${name}`)));
    }

    return this.installPackages(packageNames);
  }

  /**
   * Install all local packages
   */
  async installAllLocal() {
    const localPackages = this.packageResolver.listLocalPackages();
    const packageNames = localPackages.map(p => p.name);

    if (this.options.debugMode) {
      console.log(chalk.blue(`\nFound ${packageNames.length} local packages`));
      packageNames.forEach(name => console.log(chalk.gray(`  • ${name}`)));
    }

    return this.installPackages(packageNames);
  }

  /**
   * Install all packages (SDK + npm + local)
   */
  async installAll() {
    const allPackages = this.packageResolver.listPackages('all');
    const packageNames = allPackages.map(p => p.name);

    if (this.options.debugMode) {
      console.log(chalk.blue(`\nFound ${packageNames.length} total packages`));
      packageNames.forEach(name => console.log(chalk.gray(`  • ${name}`)));
    }

    return this.installPackages(packageNames);
  }

  /**
   * Get destination path for package
   * @flutterjs/* packages go to node_modules/@flutterjs/
   * Other packages go to packages/
   */
  getDestinationPath(packageName) {
    if (packageName.startsWith('@flutterjs/')) {
      const scopedName = getScopedPackageName(packageName);
      return path.join(this.nodeModulesDir, scopedName);
    }

    // Other packages use packages directory
    const cleanName = packageName
      .replace('@', '')
      .replace(/\//g, '-')
      .toLowerCase();

    return path.join(this.packagesBase, cleanName);
  }

  /**
   * Print installation report
   */
  printInstallationReport(session) {
    const report = session.getReport();

    console.log(chalk.blue('\n' + '='.repeat(70)));
    console.log(chalk.blue('📊 Installation Report'));
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
      const icon = result.success ? chalk.green('✓') : chalk.yellow('⚠️ ');
      console.log(`${icon} ${result.packageName}`);

      if (result.success) {
        console.log(chalk.gray(`    v${result.version} | ${result.filesCount} files | ${result.size}`));
      }

      if (result.error) {
        console.log(chalk.yellow(`    Error: ${result.error}`));
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(warn => {
          console.log(chalk.yellow(`    • ${warn}`));
        });
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
      console.log(chalk.green(`\n✓ Installation successful!\n`));
    } else {
      console.log(chalk.yellow(`\n⚠️  Installation completed with warnings\n`));
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
   * Get installation statistics
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
   * Get list of installed packages
   */
  getInstalledPackages() {
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
          files: result.filesCount,
          size: result.getSizeMB() + ' MB'
        });
      }
    }

    return packages;
  }

  /**
   * Clear package cache
   */
  clearCache() {
    this.packageResolver.clearCache();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PackageInstaller };
export default PackageInstaller;