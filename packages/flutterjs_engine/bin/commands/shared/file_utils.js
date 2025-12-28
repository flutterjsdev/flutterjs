/**
 * ============================================================================
 * Shared File Utilities - Centralized File Scanning & Copying
 * ============================================================================
 * 
 * Single implementations for file operations used everywhere:
 * - Scanning package directories
 * - Copying files with filtering
 * - Directory traversal
 * - Size calculations
 * 
 * Used by: PackageCollector, PackageInstaller
 * Location: cli/build/shared/file-utils.js
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// ============================================================================
// CONFIGURATION - Single Source of Truth
// ============================================================================

const SKIP_DIRS = new Set([
  // Build/version control
  '.git',
  '.github',
  'coverage',
  'node_modules',
  '.next',
  '.nuxt',

  // Testing (usually)
  'test',
  'tests',
  '__tests__',
]);

const SKIP_FILES = new Set([
  '.DS_Store',
  'thumbs.db',
  '.env',
  '.env.local',
  '.npmignore',
  '.gitignore',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'README.md',
  'README.txt',
  'LICENSE',
  'CHANGELOG.md',
  'Makefile',
  '.editorconfig',
]);

const SKIP_EXTENSIONS = new Set([
  '.map',        // Source maps
  '.test.js',    // Test files
  '.spec.js',    // Test files
  '.test.ts',    // Test files
  '.spec.ts',    // Test files
]);

const INCLUDE_EXTENSIONS = new Set([
  // Code files
  '.js', '.mjs', '.cjs',
  '.ts', '.tsx', '.jsx',

  // Markup & styling
  '.html', '.css', '.scss', '.less',

  // Data & config
  '.json',

  // Assets
  '.svg', '.png', '.jpg', '.jpeg', '.gif',

  // Fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',

  // Documentation
  '.md', '.txt',
]);

// ============================================================================
// FILE SCANNER
// ============================================================================

class FileScanner {
  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
  }

  /**
   * Get all files from package directory recursively
   * Applies standard filtering rules
   */
  async getAllPackageFiles(packagePath) {
    const files = [];

    async function traverse(dir, depth = 0) {
      try {
        if (!fs.existsSync(dir)) {
          return;
        }

        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip hidden files (except specific ones)
          if (entry.name.startsWith('.')) {
            if (entry.name !== '.npmignore' && entry.name !== '.npmrc') {
              continue;
            }
          }

          // Skip specific files
          if (SKIP_FILES.has(entry.name)) {
            continue;
          }

          // Skip specific directories
          if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
            continue;
          }

          if (entry.isFile()) {
            // Include file if extension matches
            const ext = path.extname(entry.name);
            const isRelevantFile = INCLUDE_EXTENSIONS.has(ext);
            const isNotSkipped = !SKIP_EXTENSIONS.has(ext);

            if (isRelevantFile && isNotSkipped) {
              files.push(fullPath);
            }
          } else if (entry.isDirectory()) {
            // Recursively traverse subdirectories
            await traverse(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Skip unreadable directories
      }
    }

    await traverse(packagePath);
    return files;
  }

  /**
   * Get all files in directory recursively (no filtering)
   */
  async getAllFilesUnfiltered(dirPath) {
    const files = [];

    async function traverse(dir) {
      try {
        if (!fs.existsSync(dir)) {
          return;
        }

        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isFile()) {
            files.push(fullPath);
          } else if (entry.isDirectory()) {
            await traverse(fullPath);
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }

    await traverse(dirPath);
    return files;
  }

  /**
   * Get directory stats (file count, total size)
   */
  async getDirectoryStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;

    const files = await this.getAllFilesUnfiltered(dirPath);

    for (const file of files) {
      try {
        const stats = await fs.promises.stat(file);
        fileCount++;
        totalSize += stats.size;
      } catch {
        // Skip unreadable files
      }
    }

    return {
      fileCount,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }
}

// ============================================================================
// FILE COPIER
// ============================================================================

class FileCopier {
  constructor(options = {}) {
    this.debugMode = options.debugMode || false;
  }

  /**
   * Copy specific files from source to destination
   */
  async copyFiles(sourcePath, destPath, files) {
    const copiedFiles = [];
    const failedFiles = [];
    let totalSize = 0;

    for (const file of files) {
      try {
        const relativePath = path.relative(sourcePath, file);
        const destFile = path.join(destPath, relativePath);
        const destDir = path.dirname(destFile);

        // Create directory if needed
        await fs.promises.mkdir(destDir, { recursive: true });

        // Copy file
        await fs.promises.copyFile(file, destFile);

        // Get file size
        const stats = await fs.promises.stat(destFile);
        totalSize += stats.size;

        copiedFiles.push({
          source: file,
          dest: destFile,
          relative: relativePath,
          size: stats.size
        });

      } catch (error) {
        failedFiles.push({
          file: file,
          error: error.message
        });
      }
    }

    return {
      files: copiedFiles,
      failedFiles,
      totalSize,
      isSuccessful() {
        return failedFiles.length === 0;
      }
    };
  }

  /**
   * Copy entire directory recursively
   * Useful for copying node_modules or large directories
   */
  async copyDirectoryRecursive(sourceDir, destDir) {
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

    async function traverse(src, dest) {
      try {
        if (!fs.existsSync(src)) {
          return;
        }

        // Create destination directory
        await fs.promises.mkdir(dest, { recursive: true });

        const entries = await fs.promises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
          try {
            // Skip specific files and directories
            if (skipFiles.has(entry.name) || skipDirs.has(entry.name)) {
              continue;
            }

            // Skip hidden files
            if (entry.name.startsWith('.') && entry.name !== '.npmignore') {
              continue;
            }

            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
              // Recursively copy subdirectories
              await traverse(srcPath, destPath);
            } else if (entry.isFile()) {
              // Copy file
              await fs.promises.copyFile(srcPath, destPath);

              // Update stats
              const stats = await fs.promises.stat(destPath);
              totalSize += stats.size;
              filesCount++;
            }
          } catch (entryError) {
            // Skip individual file/dir errors, continue with next
          }
        }
      } catch (error) {
        // Skip directory errors
      }
    }

    await traverse(sourceDir, destDir);

    return {
      filesCount,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Copy directory with detailed progress logging
   */
  async copyDirectoryWithProgress(sourceDir, destDir, onProgress) {
    let filesCount = 0;
    let totalSize = 0;

    async function traverse(src, dest, depth = 0) {
      try {
        if (!fs.existsSync(src)) {
          return;
        }

        await fs.promises.mkdir(dest, { recursive: true });

        const entries = await fs.promises.readdir(src, { withFileTypes: true });
        const indent = '  '.repeat(depth);

        if (onProgress) {
          onProgress('dir', src, indent);
        }

        for (const entry of entries) {
          try {
            if (entry.name.startsWith('.')) {
              continue;
            }

            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
              await traverse(srcPath, destPath, depth + 1);
            } else if (entry.isFile()) {
              await fs.promises.copyFile(srcPath, destPath);

              const stats = await fs.promises.stat(destPath);
              totalSize += stats.size;
              filesCount++;

              if (onProgress) {
                onProgress('file', srcPath, indent);
              }
            }
          } catch {
            // Continue on individual errors
          }
        }
      } catch {
        // Continue on directory errors
      }
    }

    await traverse(sourceDir, destDir);

    return {
      filesCount,
      totalSize: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Delete a directory and all its contents
   */
  async deleteDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        return true;
      }

      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.deleteDirectory(fullPath);
        } else {
          await fs.promises.unlink(fullPath);
        }
      }

      await fs.promises.rmdir(dirPath);
      return true;

    } catch (error) {
      console.error(chalk.red(`Failed to delete ${dirPath}: ${error.message}`));
      return false;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FileScanner,
  FileCopier,
  SKIP_DIRS,
  SKIP_FILES,
  SKIP_EXTENSIONS,
  INCLUDE_EXTENSIONS
};

export default { FileScanner, FileCopier };