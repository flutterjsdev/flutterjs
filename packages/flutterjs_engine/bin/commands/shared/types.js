/**
 * ============================================================================
 * Shared Types & Factories - Unified Result Objects
 * ============================================================================
 * 
 * Standard result types used across all modules:
 * - DependencyResolver
 * - PackageInstaller
 * - PackageCollector
 * - ImportRewriter
 * 
 * Location: cli/build/shared/types.js
 */

// ============================================================================
// RESOLUTION RESULT
// ============================================================================

/**
 * Package resolution result from DependencyResolver
 * Contains: imports, resolved packages, errors/warnings
 */
function createResolution() {
  return {
    imports: [],
    packages: new Map(),
    resolved: 0,
    errors: [],
    warnings: [],
    hasErrors: false,
    success: true,
    timestamp: new Date().toISOString()
  };
}

function createEmptyResolution() {
  return {
    imports: [],
    packages: new Map(),
    resolved: 0,
    errors: [],
    warnings: ['No imports to resolve'],
    hasErrors: false,
    success: true,
    timestamp: new Date().toISOString()
  };
}

function createResolutionError(message) {
  return {
    imports: [],
    packages: new Map(),
    resolved: 0,
    errors: [message],
    warnings: [],
    hasErrors: true,
    success: false,
    timestamp: new Date().toISOString()
  };
}

function addResolutionPackage(resolution, packageName, packageInfo) {
  resolution.packages.set(packageName, {
    name: packageName,
    ...packageInfo,
    timestamp: new Date().toISOString()
  });
}

function addResolutionError(resolution, error) {
  resolution.errors.push(error);
  resolution.hasErrors = true;
  resolution.success = false;
}

function addResolutionWarning(resolution, warning) {
  resolution.warnings.push(warning);
}

// ============================================================================
// INSTALLATION RESULT
// ============================================================================

/**
 * Single package installation result
 */
class InstallationResult {
  constructor(packageName) {
    this.packageName = packageName;
    this.success = false;
    this.version = null;
    this.sourcePath = null;
    this.destPath = null;
    this.filesCount = 0;
    this.size = 0;
    this.error = null;
    this.warnings = [];
    this.timestamp = new Date().toISOString();
  }

  getSizeKB() {
    return (this.size / 1024).toFixed(2);
  }

  getSizeMB() {
    return (this.size / (1024 * 1024)).toFixed(2);
  }

  toJSON() {
    return {
      packageName: this.packageName,
      success: this.success,
      version: this.version,
      filesCount: this.filesCount,
      size: this.getSizeMB() + ' MB',
      error: this.error,
      warnings: this.warnings,
      timestamp: this.timestamp
    };
  }
}

/**
 * Installation session result (multiple packages)
 */
function createInstallationSession() {
  return {
    results: [],
    totalPackages: 0,
    successCount: 0,
    failureCount: 0,
    totalSize: 0,
    totalFiles: 0,
    errors: [],
    warnings: [],
    startTime: Date.now(),
    endTime: null,

    addResult(result) {
      this.results.push(result);
      this.totalPackages++;
      if (result.success) {
        this.successCount++;
        this.totalSize += result.size;
        this.totalFiles += result.filesCount;
      } else {
        this.failureCount++;
      }
    },

    addError(message) {
      this.errors.push(message);
    },

    addWarning(message) {
      this.warnings.push(message);
    },

    complete() {
      this.endTime = Date.now();
    },

    getDuration() {
      return this.endTime ? this.endTime - this.startTime : 0;
    },

    getTotalSizeMB() {
      return (this.totalSize / (1024 * 1024)).toFixed(2);
    },

    isSuccessful() {
      return this.failureCount === 0 && this.errors.length === 0;
    },

    getReport() {
      return {
        total: this.totalPackages,
        successful: this.successCount,
        failed: this.failureCount,
        files: this.totalFiles,
        size: this.getTotalSizeMB() + ' MB',
        duration: this.getDuration() + 'ms',
        results: this.results.map(r => r.toJSON()),
        errors: this.errors,
        warnings: this.warnings
      };
    }
  };
}

// ============================================================================
// COPY RESULT
// ============================================================================

/**
 * File copy operation result
 */
function createCopyResult() {
  return {
    files: [],
    failedFiles: [],
    totalSize: 0,
    filesCount: 0,

    addFile(file, size) {
      this.files.push(file);
      this.totalSize += size;
      this.filesCount++;
    },

    addFailure(file, error) {
      this.failedFiles.push({ file, error });
    },

    getTotalSizeMB() {
      return (this.totalSize / (1024 * 1024)).toFixed(2);
    },

    isSuccessful() {
      return this.failedFiles.length === 0;
    }
  };
}

// ============================================================================
// COLLECTION RESULT
// ============================================================================

/**
 * Package collection result (copies to output)
 */
class CollectionResult {
  constructor(packageName) {
    this.packageName = packageName;
    this.success = false;
    this.version = null;
    this.sourcePath = null;
    this.destPath = null;
    this.copiedFiles = [];
    this.failedFiles = [];
    this.totalSize = 0;
    this.error = null;
    this.warnings = [];
    this.timestamp = new Date().toISOString();
  }

  getTotalSizeMB() {
    return (this.totalSize / (1024 * 1024)).toFixed(2);
  }

  toJSON() {
    return {
      packageName: this.packageName,
      success: this.success,
      version: this.version,
      files: this.copiedFiles.length,
      size: this.getTotalSizeMB() + ' MB',
      failed: this.failedFiles.length,
      error: this.error,
      warnings: this.warnings
    };
  }
}

/**
 * Collection session (multiple packages)
 */
function createCollectionSession() {
  return {
    results: new Map(),
    totalPackages: 0,
    successCount: 0,
    failureCount: 0,
    totalSize: 0,
    totalFiles: 0,
    errors: [],
    warnings: [],
    startTime: Date.now(),
    endTime: null,

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
    },

    addError(message) {
      this.errors.push(message);
    },

    addWarning(message) {
      this.warnings.push(message);
    },

    complete() {
      this.endTime = Date.now();
    },

    getDuration() {
      return this.endTime ? this.endTime - this.startTime : 0;
    },

    getTotalSizeMB() {
      return (this.totalSize / (1024 * 1024)).toFixed(2);
    },

    isSuccessful() {
      return this.failureCount === 0 && this.errors.length === 0;
    },

    getReport() {
      return {
        total: this.totalPackages,
        successful: this.successCount,
        failed: this.failureCount,
        files: this.totalFiles,
        size: this.getTotalSizeMB() + ' MB',
        duration: this.getDuration() + 'ms',
        results: Array.from(this.results.values()).map(r => r.toJSON()),
        errors: this.errors,
        warnings: this.warnings
      };
    }
  };
}

// ============================================================================
// ANALYSIS RESULT
// ============================================================================

/**
 * Import analysis result
 */
function createAnalysisResult() {
  return {
    imports: [],
    frameworkImports: [],
    externalImports: [],
    localImports: [],
    errors: [],
    warnings: [],
    stats: {
      totalImports: 0,
      framework: 0,
      external: 0,
      local: 0
    },

    addImport(importStmt, category) {
      this.imports.push(importStmt);
      this.stats.totalImports++;

      if (category === 'framework') {
        this.frameworkImports.push(importStmt);
        this.stats.framework++;
      } else if (category === 'external') {
        this.externalImports.push(importStmt);
        this.stats.external++;
      } else if (category === 'local') {
        this.localImports.push(importStmt);
        this.stats.local++;
      }
    },

    addError(message) {
      this.errors.push(message);
    },

    addWarning(message) {
      this.warnings.push(message);
    },

    hasErrors() {
      return this.errors.length > 0;
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Resolution
  createResolution,
  createEmptyResolution,
  createResolutionError,
  addResolutionPackage,
  addResolutionError,
  addResolutionWarning,

  // Installation
  InstallationResult,
  createInstallationSession,

  // Copy
  createCopyResult,

  // Collection
  CollectionResult,
  createCollectionSession,

  // Analysis
  createAnalysisResult
};