// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * FlutterJS Build Cache - Complete Persistent Caching Implementation
 * ============================================================================
 * 
 * This module provides:
 * 1. Persistent build artifact caching
 * 2. Content-based hash validation
 * 3. Dependency change detection
 * 4. Cache invalidation strategies
 * 5. LRU cache eviction
 * 6. Cache compression and storage
 * 7. Multi-layer caching (memory + disk)
 * 8. Build acceleration
 * 9. Cache statistics and analysis
 * 10. Recovery and restoration
 * 
 * Location: cli/bundler/build-cache.js
 * Usage:
 *   const cache = new BuildCache(config);
 *   await cache.initialize();
 *   const result = await cache.get(key);
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const chalk = require('chalk');

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_VERSION = '1.0.0';
const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_MAX_ENTRIES = 1000;

const CACHE_TYPES = {
  BUILD: 'build',
  ANALYSIS: 'analysis',
  BUNDLE: 'bundle',
  ASSETS: 'assets',
  OPTIMIZATION: 'optimization',
};

// ============================================================================
// BUILD CACHE CLASS
// ============================================================================

class BuildCache {
  constructor(config = {}) {
    this.config = {
      projectRoot: config.projectRoot || process.cwd(),
      cacheDir: config.cacheDir || '.flutterjs/cache',
      maxSize: config.maxSize || DEFAULT_MAX_SIZE,
      maxEntries: config.maxEntries || DEFAULT_MAX_ENTRIES,
      verbose: config.verbose || false,
      compress: config.compress !== false,
      ...config,
    };

    // Paths
    this.cachePath = path.join(this.config.projectRoot, this.config.cacheDir);
    this.manifestPath = path.join(this.cachePath, 'manifest.json');
    this.statsPath = path.join(this.cachePath, 'stats.json');

    // In-memory cache (hot cache)
    this.memoryCache = new Map();
    this.maxMemorySize = 50 * 1024 * 1024; // 50MB
    this.memoryUsed = 0;

    // Cache manifest (persisted to disk)
    this.manifest = {
      version: CACHE_VERSION,
      entries: {},
      lastCleanup: null,
    };

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entryCount: 0,
      compressionRatio: 0,
      lastUpdated: null,
    };

    // Dependency tracking
    this.dependencies = new Map();
  }

  /**
   * Initialize cache
   */
  async initialize() {
    try {
      // Create cache directory
      await fs.promises.mkdir(this.cachePath, { recursive: true });

      // Load existing manifest
      if (fs.existsSync(this.manifestPath)) {
        const content = await fs.promises.readFile(this.manifestPath, 'utf-8');
        this.manifest = JSON.parse(content);
      }

      // Load stats
      if (fs.existsSync(this.statsPath)) {
        const content = await fs.promises.readFile(this.statsPath, 'utf-8');
        this.stats = JSON.parse(content);
      }

      if (this.config.verbose) {
        console.log(chalk.gray(`Cache initialized: ${this.cachePath}`));
        console.log(chalk.gray(`Cached entries: ${Object.keys(this.manifest.entries).length}`));
        console.log(chalk.gray(`Cache size: ${this._formatBytes(this.stats.size)}\n`));
      }

      return true;

    } catch (error) {
      console.error(chalk.red(`Cache initialization failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key, dependencies = []) {
    try {
      const cacheKey = this._generateKey(key);

      // Check memory cache first
      if (this.memoryCache.has(cacheKey)) {
        if (this.config.verbose) {
          console.log(chalk.gray(`Cache HIT (memory): ${key}`));
        }
        this.stats.hits++;
        return this.memoryCache.get(cacheKey);
      }

      // Check if entry exists in manifest
      const entry = this.manifest.entries[cacheKey];
      if (!entry) {
        this.stats.misses++;
        if (this.config.verbose) {
          console.log(chalk.gray(`Cache MISS: ${key}`));
        }
        return null;
      }

      // Check if dependencies changed
      if (!this._areDependenciesValid(cacheKey, dependencies)) {
        if (this.config.verbose) {
          console.log(chalk.gray(`Cache INVALID (dependencies changed): ${key}`));
        }
        await this.invalidate(cacheKey);
        this.stats.misses++;
        return null;
      }

      // Load from disk
      const value = await this._loadFromDisk(entry.path, entry.compressed);

      if (value) {
        // Store in memory cache
        this._storeInMemoryCache(cacheKey, value);
        this.stats.hits++;

        if (this.config.verbose) {
          console.log(chalk.gray(`Cache HIT (disk): ${key}`));
        }

        return value;
      }

      this.stats.misses++;
      return null;

    } catch (error) {
      console.warn(chalk.yellow(`Cache retrieval failed for ${key}: ${error.message}`));
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, dependencies = [], type = CACHE_TYPES.BUILD) {
    try {
      const cacheKey = this._generateKey(key);
      const valueSize = JSON.stringify(value).length;

      // Check cache size before adding
      if (this.stats.size + valueSize > this.config.maxSize) {
        await this._evictLRU();
      }

      // Store in memory cache
      this._storeInMemoryCache(cacheKey, value);

      // Save to disk
      const timestamp = Date.now();
      const compressed = this.config.compress && valueSize > 1024; // Only compress if > 1KB
      const filePath = await this._saveToDisk(cacheKey, value, compressed);

      // Update manifest
      this.manifest.entries[cacheKey] = {
        key: key,
        path: filePath,
        size: valueSize,
        compressed,
        created: timestamp,
        accessed: timestamp,
        type,
        dependencies: dependencies.map(dep => this._hashDependency(dep)),
      };

      // Update statistics
      this.stats.size += valueSize;
      this.stats.entryCount = Object.keys(this.manifest.entries).length;
      this.stats.lastUpdated = new Date().toISOString();

      // Store dependencies
      this._storeDependencies(cacheKey, dependencies);

      // Save manifest
      await this._saveManifest();

      if (this.config.verbose) {
        console.log(chalk.gray(`Cache SET: ${key} (${this._formatBytes(valueSize)})`));
      }

      return cacheKey;

    } catch (error) {
      console.warn(chalk.yellow(`Failed to cache ${key}: ${error.message}`));
      return null;
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key) {
    try {
      const cacheKey = typeof key === 'string' ? this._generateKey(key) : key;

      if (!this.manifest.entries[cacheKey]) {
        return false;
      }

      const entry = this.manifest.entries[cacheKey];

      // Remove from disk
      if (fs.existsSync(entry.path)) {
        await fs.promises.unlink(entry.path);
      }

      // Remove from manifest
      delete this.manifest.entries[cacheKey];

      // Remove from memory
      this.memoryCache.delete(cacheKey);

      // Update statistics
      this.stats.size -= entry.size || 0;
      this.stats.entryCount = Object.keys(this.manifest.entries).length;

      // Save manifest
      await this._saveManifest();

      if (this.config.verbose) {
        console.log(chalk.gray(`Cache INVALIDATED: ${key}`));
      }

      return true;

    } catch (error) {
      console.warn(chalk.yellow(`Failed to invalidate cache entry: ${error.message}`));
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.memoryUsed = 0;

      // Clear disk cache
      if (fs.existsSync(this.cachePath)) {
        const files = await fs.promises.readdir(this.cachePath);
        for (const file of files) {
          if (file !== 'manifest.json' && file !== 'stats.json') {
            const filePath = path.join(this.cachePath, file);
            const stat = await fs.promises.stat(filePath);
            if (stat.isFile()) {
              await fs.promises.unlink(filePath);
            }
          }
        }
      }

      // Reset manifest and stats
      this.manifest = {
        version: CACHE_VERSION,
        entries: {},
        lastCleanup: Date.now(),
      };

      this.stats = {
        hits: 0,
        misses: 0,
        size: 0,
        entryCount: 0,
        compressionRatio: 0,
        lastUpdated: new Date().toISOString(),
      };

      // Save manifest
      await this._saveManifest();

      if (this.config.verbose) {
        console.log(chalk.gray('Cache cleared\n'));
      }

      return true;

    } catch (error) {
      console.error(chalk.red(`Failed to clear cache: ${error.message}`));
      return false;
    }
  }

  /**
   * Check if entry is in cache
   */
  has(key) {
    const cacheKey = this._generateKey(key);
    return this.manifest.entries.hasOwnProperty(cacheKey);
  }

  /**
   * Get all entries of a type
   */
  getByType(type) {
    const entries = [];

    for (const [key, entry] of Object.entries(this.manifest.entries)) {
      if (entry.type === type) {
        entries.push({
          key: entry.key,
          cacheKey: key,
          size: entry.size,
          created: entry.created,
          accessed: entry.accessed,
        });
      }
    }

    return entries.sort((a, b) => b.accessed - a.accessed);
  }

  /**
   * Generate cache key from value
   * @private
   */
  _generateKey(value) {
    if (typeof value === 'string') {
      return crypto.createHash('sha256').update(value).digest('hex');
    }

    const stringified = JSON.stringify(value);
    return crypto.createHash('sha256').update(stringified).digest('hex');
  }

  /**
   * Hash dependency for comparison
   * @private
   */
  _hashDependency(dependency) {
    if (typeof dependency === 'string') {
      // Check file modification time
      try {
        const stat = fs.statSync(dependency);
        return `${dependency}:${stat.mtimeMs}`;
      } catch {
        return dependency;
      }
    }

    return crypto.createHash('sha256').update(JSON.stringify(dependency)).digest('hex');
  }

  /**
   * Check if dependencies are valid
   * @private
   */
  _areDependenciesValid(cacheKey, newDependencies) {
    const entry = this.manifest.entries[cacheKey];

    if (!entry || !entry.dependencies) {
      return newDependencies.length === 0;
    }

    if (entry.dependencies.length !== newDependencies.length) {
      return false;
    }

    const newHashes = newDependencies.map(dep => this._hashDependency(dep));

    return entry.dependencies.every((hash, i) => hash === newHashes[i]);
  }

  /**
   * Store dependencies for tracking
   * @private
   */
  _storeDependencies(cacheKey, dependencies) {
    this.dependencies.set(cacheKey, dependencies);
  }

  /**
   * Store in memory cache
   * @private
   */
  _storeInMemoryCache(key, value) {
    const size = JSON.stringify(value).length;

    // Check memory limit
    if (this.memoryUsed + size > this.maxMemorySize) {
      this._evictMemoryCache();
    }

    this.memoryCache.set(key, value);
    this.memoryUsed += size;
  }

  /**
   * Evict least recently used memory entries
   * @private
   */
  _evictMemoryCache() {
    // Simple eviction: remove 25% of oldest entries
    const entries = Array.from(this.memoryCache.entries());
    const toRemove = Math.ceil(entries.length * 0.25);

    for (let i = 0; i < toRemove; i++) {
      const [key, value] = entries[i];
      this.memoryCache.delete(key);
      this.memoryUsed -= JSON.stringify(value).length;
    }
  }

  /**
   * Load value from disk
   * @private
   */
  async _loadFromDisk(filePath, compressed) {
    try {
      let content = await fs.promises.readFile(filePath);

      if (compressed) {
        const zlib = require('zlib');
        const decompress = require('util').promisify(zlib.gunzip);
        content = await decompress(content);
      }

      return JSON.parse(content.toString('utf-8'));

    } catch (error) {
      console.warn(chalk.yellow(`Failed to load from disk: ${error.message}`));
      return null;
    }
  }

  /**
   * Save value to disk
   * @private
   */
  async _saveToDisk(key, value, compress = false) {
    try {
      const fileName = `${key}.cache`;
      const filePath = path.join(this.cachePath, fileName);

      let content = Buffer.from(JSON.stringify(value), 'utf-8');

      if (compress) {
        const zlib = require('zlib');
        const gzip = require('util').promisify(zlib.gzip);
        content = await gzip(content);
      }

      await fs.promises.writeFile(filePath, content);

      return filePath;

    } catch (error) {
      console.error(chalk.red(`Failed to save to disk: ${error.message}`));
      throw error;
    }
  }

  /**
   * Evict least recently used cache entries
   * @private
   */
  async _evictLRU() {
    const entries = Object.entries(this.manifest.entries)
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => a.accessed - b.accessed)
      .slice(0, Math.ceil(Object.keys(this.manifest.entries).length * 0.1));

    for (const entry of entries) {
      await this.invalidate(entry.key);
    }

    if (this.config.verbose) {
      console.log(chalk.gray(`Evicted ${entries.length} cache entries`));
    }
  }

  /**
   * Save manifest to disk
   * @private
   */
  async _saveManifest() {
    try {
      await fs.promises.writeFile(
        this.manifestPath,
        JSON.stringify(this.manifest, null, 2)
      );

      // Save stats
      await fs.promises.writeFile(
        this.statsPath,
        JSON.stringify(this.stats, null, 2)
      );

    } catch (error) {
      console.warn(chalk.yellow(`Failed to save manifest: ${error.message}`));
    }
  }

  /**
   * Format bytes to human readable size
   * @private
   */
  _formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memoryUsed: this._formatBytes(this.memoryUsed),
      memoryAvailable: this._formatBytes(this.maxMemorySize - this.memoryUsed),
    };
  }

  /**
   * Print cache statistics
   */
  printStats() {
    const stats = this.getStats();

    console.log(chalk.blue('\n📊 Cache Statistics\n'));
    console.log(chalk.gray(`Hits: ${stats.hits}`));
    console.log(chalk.gray(`Misses: ${stats.misses}`));
    console.log(chalk.gray(`Hit Rate: ${stats.hitRate}`));
    console.log(chalk.gray(`Size: ${this._formatBytes(stats.size)}`));
    console.log(chalk.gray(`Entries: ${stats.entryCount}`));
    console.log(chalk.gray(`Memory: ${stats.memoryUsed} / ${this._formatBytes(this.maxMemorySize)}\n`));
  }

  /**
   * Get cache health
   */
  getHealth() {
    const entries = Object.keys(this.manifest.entries).length;
    const isFull = entries >= this.config.maxEntries;
    const isLarge = this.stats.size >= this.config.maxSize;

    return {
      healthy: !isFull && !isLarge,
      entriesUsed: `${entries}/${this.config.maxEntries}`,
      sizeUsed: `${this._formatBytes(this.stats.size)}/${this._formatBytes(this.config.maxSize)}`,
      warnings: [
        ...(isFull ? ['Cache full: Consider cleanup'] : []),
        ...(isLarge ? ['Cache size limit approaching'] : []),
      ],
    };
  }

  /**
   * Cleanup old cache entries
   */
  async cleanup(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    try {
      const now = Date.now();
      const old = [];

      for (const [key, entry] of Object.entries(this.manifest.entries)) {
        if (now - entry.created > maxAgeMs) {
          old.push(key);
        }
      }

      for (const key of old) {
        await this.invalidate(key);
      }

      this.manifest.lastCleanup = now;
      await this._saveManifest();

      if (this.config.verbose) {
        console.log(chalk.gray(`Cleaned up ${old.length} old cache entries\n`));
      }

      return old.length;

    } catch (error) {
      console.error(chalk.red(`Cleanup failed: ${error.message}`));
      return 0;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  BuildCache,
  CACHE_TYPES,
  CACHE_VERSION,
};
