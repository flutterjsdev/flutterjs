/**
 * ============================================================================
 * Shared Utilities - Common Helper Functions
 * ============================================================================
 * 
 * Centralized utility functions used across multiple modules:
 * - Package JSON loading
 * - Package validation
 * - Path manipulation
 * - Error handling
 * 
 * Location: cli/build/shared/utils.js
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// PACKAGE.JSON UTILITIES
// ============================================================================

/**
 * Load and parse package.json from a directory
 */
async function loadPackageJson(packagePath) {
  const pkgJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`package.json not found at ${pkgJsonPath}`);
  }

  try {
    const content = await fs.promises.readFile(pkgJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid package.json: ${error.message}`);
  }
}

/**
 * Load package.json synchronously (for initialization)
 */
function loadPackageJsonSync(packagePath) {
  const pkgJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`package.json not found at ${pkgJsonPath}`);
  }

  try {
    const content = fs.readFileSync(pkgJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid package.json: ${error.message}`);
  }
}

/**
 * Validate package.json structure
 */
function validatePackage(pkgJson, packagePath = null) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!pkgJson.name) {
    errors.push('Package must have a "name" field');
  }

  // Optional but recommended
  if (!pkgJson.version) {
    warnings.push('Package should have a "version" field');
  }

  // FlutterJS specific validation
  if (pkgJson.flutterjs && typeof pkgJson.flutterjs === 'object') {
    const flutterjs = pkgJson.flutterjs;

    if (flutterjs.type) {
      const validTypes = ['widget', 'service', 'utility', 'framework', 'plugin'];
      if (!validTypes.includes(flutterjs.type)) {
        warnings.push(`Unknown package type: ${flutterjs.type}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Get package version from package.json
 */
function getPackageVersion(pkgJson) {
  return pkgJson.version || '0.0.0';
}

/**
 * Get package main entry point
 */
function getPackageMainEntry(pkgJson) {
  return pkgJson.main || pkgJson.exports?.('.') || 'index.js';
}

/**
 * Extract scoped package name
 * '@flutterjs/material' -> 'material'
 * 'some-package' -> 'some-package'
 */
function getScopedPackageName(packageName) {
  if (packageName.startsWith('@')) {
    return packageName.split('/')[1];
  }
  return packageName;
}

/**
 * Extract scope from scoped package name
 * '@flutterjs/material' -> '@flutterjs'
 * 'some-package' -> null
 */
function getPackageScope(packageName) {
  if (packageName.startsWith('@')) {
    return packageName.split('/')[0];
  }
  return null;
}

/**
 * Check if package is scoped (@scope/name)
 */
function isScopedPackage(packageName) {
  return packageName.startsWith('@') && packageName.includes('/');
}

/**
 * Check if package is a FlutterJS package
 */
function isFlutterJSPackage(packageName) {
  return packageName.startsWith('@flutterjs/');
}

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Get relative path from one directory to another
 */
function getRelativePath(from, to) {
  return path.relative(from, to).replace(/\\/g, '/');
}

/**
 * Normalize path for current platform
 */
function normalizePath(inputPath) {
  return inputPath.replace(/\\/g, path.sep).replace(/\//g, path.sep);
}

/**
 * Normalize path to forward slashes (for URLs/imports)
 */
function normalizePathToUrl(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

/**
 * Join paths and normalize
 */
function joinPaths(...parts) {
  return path.join(...parts).replace(/\\/g, '/');
}

/**
 * Get parent directory
 */
function getParentDir(dirPath) {
  return path.dirname(dirPath);
}

/**
 * Check if path is absolute
 */
function isAbsolutePath(dirPath) {
  return path.isAbsolute(dirPath);
}

/**
 * Make path absolute if relative
 */
function ensureAbsolutePath(dirPath, basePath = process.cwd()) {
  if (path.isAbsolute(dirPath)) {
    return dirPath;
  }
  return path.resolve(basePath, dirPath);
}

// ============================================================================
// FILE SYSTEM UTILITIES
// ============================================================================

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Check if directory exists
 */
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Get file extension
 */
function getFileExtension(filePath) {
  return path.extname(filePath).toLowerCase();
}

/**
 * Get file name without extension
 */
function getFileNameWithoutExt(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Read text file
 */
async function readTextFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

/**
 * Write text file
 */
async function writeTextFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write ${filePath}: ${error.message}`);
  }
}

/**
 * Read JSON file
 */
async function readJsonFile(filePath) {
  const content = await readTextFile(filePath);
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

/**
 * Write JSON file
 */
async function writeJsonFile(filePath, data, pretty = true) {
  const content = pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  await writeTextFile(filePath, content);
}

// ============================================================================
// ARRAY/COLLECTION UTILITIES
// ============================================================================

/**
 * Remove duplicates from array
 */
function removeDuplicates(array) {
  return [...new Set(array)];
}

/**
 * Flatten nested array
 */
function flattenArray(array) {
  return array.reduce((flat, item) => {
    return flat.concat(Array.isArray(item) ? flattenArray(item) : item);
  }, []);
}

/**
 * Group array by key
 */
function groupByKey(array, keyFn) {
  const groups = {};
  for (const item of array) {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  return groups;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate that value is not empty
 */
function isNotEmpty(value) {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Package utilities
  loadPackageJson,
  loadPackageJsonSync,
  validatePackage,
  getPackageVersion,
  getPackageMainEntry,
  getScopedPackageName,
  getPackageScope,
  isScopedPackage,
  isFlutterJSPackage,

  // Path utilities
  getRelativePath,
  normalizePath,
  normalizePathToUrl,
  joinPaths,
  getParentDir,
  isAbsolutePath,
  ensureAbsolutePath,

  // File system utilities
  fileExists,
  directoryExists,
  getFileSize,
  formatBytes,
  getFileExtension,
  getFileNameWithoutExt,
  readTextFile,
  writeTextFile,
  readJsonFile,
  writeJsonFile,

  // Array/collection utilities
  removeDuplicates,
  flattenArray,
  groupByKey,

  // Validation utilities
  isNotEmpty,
  isValidUrl,
  isValidEmail
};