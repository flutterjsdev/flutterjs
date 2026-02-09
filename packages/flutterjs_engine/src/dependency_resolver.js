// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * FlutterJS Dependency Resolver - FINAL FIXED VERSION
 * ============================================================================
 *
 * Purpose:
 * - Resolves all imports from analyzer result
 * - Finds packages in packages/flutterjs_engine/src/ folders
 * - Handles both single and multiple packages
 * - Validates all dependencies are available
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";

// ============================================================================
// RESOLUTION DATA TYPES
// ============================================================================

class ResolvedPackage {
  constructor(name, type, packagePath) {
    this.name = name;
    this.type = type;
    this.packagePath = packagePath;
    this.packageJson = null;
    this.main = null;
    this.exports = new Map();
    this.dependencies = [];
    this.files = [];
    this.errors = [];
  }

  isValid() {
    return this.errors.length === 0 && this.packagePath !== null;
  }

  addError(message) {
    this.errors.push(message);
  }

  toString() {
    return `${this.name} (${this.type}) @ ${this.packagePath}`;
  }
}

class ResolutionResult {
  constructor() {
    this.packages = new Map();
    this.graph = new Map();
    this.allFiles = [];
    this.errors = [];
    this.warnings = [];
    this.resolvedTime = null;
  }

  addPackage(resolvedPackage) {
    this.packages.set(resolvedPackage.name, resolvedPackage);
  }

  getPackage(name) {
    return this.packages.get(name);
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  hasErrors() {
    return (
      this.errors.length > 0 ||
      Array.from(this.packages.values()).some((pkg) => !pkg.isValid())
    );
  }

  toString() {
    const summary = `
Resolved ${this.packages.size} packages
- Errors: ${this.errors.length}
- Warnings: ${this.warnings.length}
- Total Files: ${this.allFiles.length}
    `;
    return summary.trim();
  }
}

// ============================================================================
// MAIN RESOLVER CLASS
// ============================================================================
class DependencyResolver {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      debugMode: options.debugMode || false,
      config: options.config || {}, // ✅ Store config
      ...options,
    };

    this.projectRoot = this.options.projectRoot;
    this.resolvedPackages = new Map();
    this.preResolvedPackages = new Map();

    // ✅ HYBRID: Load authoritative record from 'flutterjs get' if available
    this._loadPackageMap();

    if (this.options.debugMode) {
      console.log(chalk.cyan("\n[DependencyResolver] Initialized"));
      console.log(chalk.gray(`  Project Root: ${this.projectRoot}`));
      if (this.preResolvedPackages.size > 0) {
        console.log(
          chalk.green(
            `  Loaded authoritative map with ${this.preResolvedPackages.size} packages`
          )
        );
      } else {
        console.log(
          chalk.yellow(
            `  No authoritative map found (will use dynamic discovery)`
          )
        );
      }
    }
  }

  _loadPackageMap() {
    try {
      const mapPath = path.join(
        this.projectRoot,
        ".dart_tool",
        "flutterjs",
        "package_map.json"
      );
      if (fs.existsSync(mapPath)) {
        const data = JSON.parse(fs.readFileSync(mapPath, "utf8"));
        if (data.packages) {
          for (const [name, pkgPath] of Object.entries(data.packages)) {
            this.preResolvedPackages.set(name, pkgPath);
          }
        }
      }
    } catch (e) {
      if (this.options.debugMode) {
        console.log(
          chalk.yellow(
            `  ⚠ Warning: Failed to load package_map.json: ${e.message}`
          )
        );
      }
    }
  }

  /**
   * ✅ Find the flutterjs project root by walking up directories
   */
  findFlutterjsRoot(startPath) {
    let currentPath = startPath;
    const maxLevels = 20;
    let level = 0;

    while (level < maxLevels && currentPath !== path.dirname(currentPath)) {
      const enginePath = path.join(
        currentPath,
        "packages",
        "flutterjs_engine",
        "src"
      );

      if (this.options.debugMode && level < 5) {
        console.log(chalk.gray(`    [Level ${level}] Checking: ${enginePath}`));
      }

      if (fs.existsSync(enginePath)) {
        if (this.options.debugMode) {
          console.log(
            chalk.green(`  ✔ Found flutterjs root at: ${currentPath}`)
          );
        }
        return currentPath;
      }

      currentPath = path.dirname(currentPath);
      level++;
    }

    if (this.options.debugMode) {
      console.log(
        chalk.yellow(`  ⚠ Could not find flutterjs root, using projectRoot`)
      );
    }
    return this.projectRoot;
  }

  /**
   * Resolve all dependencies from analysis
   */
  async resolveAll(analysis) {
    console.log(chalk.blue("\n📦 Phase 2: Resolving dependencies..."));
    console.log(chalk.blue("=".repeat(70)));

    try {
      // Extract all packages
      const allPackages = this.extractAllPackages(analysis);

      if (this.options.debugMode) {
        console.log(chalk.yellow(`\nPackages to resolve: ${allPackages.size}`));
        for (const pkg of allPackages) {
          console.log(chalk.gray(`  • ${pkg}`));
        }
        console.log();
      }

      if (allPackages.size === 0) {
        console.log(chalk.yellow("⚠️  No @flutterjs/* packages found"));
        return {
          packages: new Map(),
          allFiles: [],
          graph: new Map(),
          errors: [],
          warnings: [],
        };
      }

      // Find SDK root once
      const sdkRoot = this.findFlutterjsRoot(this.projectRoot);
      const srcDir = path.join(sdkRoot, "packages", "flutterjs_engine", "src");

      if (this.options.debugMode) {
        console.log(chalk.cyan(`SDK Root: ${sdkRoot}`));
        console.log(chalk.cyan(`Src Dir: ${srcDir}\n`));
      }

      // Resolve each package
      for (const packageName of allPackages) {
        this.resolvePackage(packageName, srcDir);
      }

      console.log(chalk.blue("=".repeat(70)));
      console.log(
        chalk.green(`✔ Resolved ${this.resolvedPackages.size} packages\n`)
      );

      return {
        packages: this.resolvedPackages,
        allFiles: [],
        graph: new Map(),
        errors: [],
        warnings: [],
      };
    } catch (error) {
      console.error(chalk.red(`\n✖ Resolution error: ${error.message}\n`));
      throw error;
    }
  }

  /**
   * ✅ Extract all packages from analysis result
   * Handles multiple formats:
   * - analysis.imports as OBJECT: { '@flutterjs/runtime': [...], '@flutterjs/material': [...] }
   * - analysis.imports as array of strings: ['@flutterjs/vdom', '@flutterjs/material']
   * - analysis.imports as array of objects: [{ source: '@flutterjs/runtime' }]
   */
  extractAllPackages(analysis) {
    const packages = new Set();

    // ✅ 1. WORKSPACE SCAN: Auto-discover all @flutterjs packages in workspace
    // This ensures ALL workspace packages are available, including foundation
    try {
      const sdkRoot = this.findFlutterjsRoot(this.projectRoot);
      const packagesDir = path.join(sdkRoot, "packages");

      if (fs.existsSync(packagesDir)) {
        if (this.options.debugMode) {
          console.log(
            chalk.gray(`  Scanning workspace packages: ${packagesDir}`)
          );
        }

        const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (!entry.name.startsWith("flutterjs_")) continue;

          // Convert flutterjs_foundation -> @flutterjs/foundation
          const packageName = entry.name.replace("flutterjs_", "");
          const scopedName = `@flutterjs/${packageName}`;

          // Check if the package has a nested structure (packages/flutterjs_foundation/flutterjs_foundation)
          const nestedPath = path.join(packagesDir, entry.name, entry.name);
          const flatPath = path.join(packagesDir, entry.name);

          let packagePath = null;
          if (fs.existsSync(nestedPath)) {
            packagePath = nestedPath;
          } else if (fs.existsSync(path.join(flatPath, "package.json"))) {
            packagePath = flatPath;
          }

          if (packagePath) {
            packages.add(scopedName);
            if (
              this.options.debugMode ||
              scopedName === "@flutterjs/foundation"
            ) {
              console.log(
                chalk.green(`  Found workspace package: ${scopedName}`)
              );
            }
          }
        }
      }
    } catch (e) {
      if (this.options.debugMode) {
        console.warn(chalk.yellow(`  ⚠️  Workspace scan failed: ${e.message}`));
      }
    }

    // ✅ 2. Read dependencies from package.json (Project Root)
    // This ensures ALL installed packages are available in the import map, not just used ones
    try {
      const pkgJsonPath = path.join(this.projectRoot, "package.json");
      if (fs.existsSync(pkgJsonPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
        if (pkgJson.dependencies) {
          for (const dep of Object.keys(pkgJson.dependencies)) {
            packages.add(dep);
            if (this.options.debugMode) {
              console.log(
                chalk.gray(`  Found dependency (package.json): ${dep}`)
              );
            }
          }
        }
      }
    } catch (e) {
      console.warn(
        chalk.yellow(
          `⚠️  Could not read package.json dependencies: ${e.message}`
        )
      );
    }

    // ✅ 3. Read dependencies from configuration (flutterjs.config.js)
    if (this.options.config && this.options.config.packages) {
      for (const packageName of Object.keys(this.options.config.packages)) {
        packages.add(packageName);
        if (this.options.debugMode) {
          console.log(
            chalk.gray(`  Found dependency (config): ${packageName}`)
          );
        }
      }
    }

    // ✅ 4. Read dependencies from authoritative map (package_map.json) generated by 'flutterjs get'
    if (this.preResolvedPackages && this.preResolvedPackages.size > 0) {
      console.log(
        chalk.yellow(
          `[DEBUG] extractAllPackages: Authoritative map has ${this.preResolvedPackages.size} packages`
        )
      );
      for (const packageName of this.preResolvedPackages.keys()) {
        packages.add(packageName);
        if (this.options.debugMode || packageName === "http_parser") {
          console.log(
            chalk.gray(`  Found dependency (authoritative map): ${packageName}`)
          );
        }
      }
    }

    if (!analysis) {
      return packages;
    }

    // ✅ 5. Add imports found in analysis
    // Handle object format
    if (
      analysis.imports &&
      typeof analysis.imports === "object" &&
      !Array.isArray(analysis.imports)
    ) {
      for (const packageName of Object.keys(analysis.imports)) {
        if (packageName.startsWith(".")) continue; // Skip local

        // Handle package: scheme
        if (packageName.startsWith("package:")) {
          const name = packageName.split("/")[0].replace("package:", "");
          packages.add(name);
        } else {
          // Add everything else (scoped or regular)
          packages.add(packageName);
        }
      }
    }

    // Handle array format
    if (Array.isArray(analysis.imports)) {
      for (const item of analysis.imports) {
        let pkgName = null;
        if (typeof item === "string") {
          if (item.startsWith(".")) continue; // Skip local

          if (item.startsWith("package:")) {
            pkgName = item.split("/")[0].replace("package:", "");
          } else {
            // Extract package name (handles @scope/pkg and plain-pkg)
            pkgName = this.extractPackageName(item);
          }
        } else if (typeof item === "object" && item && item.source) {
          pkgName = this.extractPackageName(item.source);
        }

        if (pkgName) {
          packages.add(pkgName);
        }
      }
    }

    // ✅ 6. SCANNED: Scan node_modules for any missing packages
    // We check both the build output location and the local project location
    const scanPaths = [
      path.join(this.projectRoot, "build", "flutterjs", "node_modules"),
      path.join(this.projectRoot, "node_modules"),
    ];

    for (const scanPath of scanPaths) {
      try {
        if (fs.existsSync(scanPath)) {
          if (this.options.debugMode)
            console.log(chalk.gray(`  Scanning: ${scanPath}`));

          const entries = fs.readdirSync(scanPath, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name.startsWith(".")) continue;

            // Handle Scoped Packages
            if (entry.name.startsWith("@")) {
              const scopedPath = path.join(scanPath, entry.name);
              const scopedEntries = fs.readdirSync(scopedPath, {
                withFileTypes: true,
              });
              for (const scopedEntry of scopedEntries) {
                if (!scopedEntry.isDirectory()) continue;
                const pkgName = `${entry.name}/${scopedEntry.name}`;
                if (!packages.has(pkgName)) {
                  packages.add(pkgName);
                  if (this.options.debugMode) {
                    console.log(
                      chalk.green(`  Found scanned dependency: ${pkgName}`)
                    );
                  }
                }
              }
            } else {
              // Handle Regular Packages (e.g. http_parser)
              if (!packages.has(entry.name)) {
                packages.add(entry.name);
                if (this.options.debugMode || entry.name === "http_parser") {
                  console.log(
                    chalk.green(`  Found scanned dependency: ${entry.name}`)
                  );
                }
              }
            }
          }
        }
      } catch (e) {
        if (this.options.debugMode) {
          console.log(
            chalk.yellow(`  ⚠ Scanning ${scanPath} failed: ${e.message}`)
          );
        }
      }
    }

    return packages;
  }

  /**
   * Extract package name from import source
   * @flutterjs/material/core -> @flutterjs/material
   */
  extractPackageName(source) {
    if (!source || typeof source !== "string") return null;

    // Handle scoped packages
    if (source.startsWith("@")) {
      const parts = source.split("/");
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
    }

    // Handle regular packages
    const parts = source.split("/");
    return parts[0];
  }

  /**
   * ✅ Resolve a single package
   * Searches BOTH locations:
   * 1. packages/flutterjs_engine/src/[packageName]
   * 2. packages/flutterjs_engine/package/[packageName]
   */
  resolvePackage(fullPackageName, srcDir) {
    // Extract: @flutterjs/vdom -> vdom
    let packageName = fullPackageName;
    if (fullPackageName.startsWith("@flutterjs/")) {
      packageName = fullPackageName.split("/")[1];
    }

    if (this.options.debugMode) {
      console.log(chalk.cyan(`Resolving: ${fullPackageName}`));
    }

    // Get the engine root directory from srcDir
    // srcDir is: .../packages/flutterjs_engine/src
    // We need: .../packages/flutterjs_engine
    const engineRoot = path.dirname(srcDir);

    // Search paths in priority order
    const searchPaths = [];

    // 0. Authoritative Record from 'flutterjs get' (Highest Priority)
    if (this.preResolvedPackages.has(fullPackageName)) {
      const recordPath = this.preResolvedPackages.get(fullPackageName);
      if (fs.existsSync(recordPath)) {
        if (this.options.debugMode) {
          console.log(
            chalk.green(`      Using authoritative record: ${recordPath}`)
          );
        }
        searchPaths.push(recordPath);
      }
    }

    // 1. Config Override
    if (this.options.config?.packages?.[fullPackageName]) {
      const configEntry = this.options.config.packages[fullPackageName];
      // Supports string path or object { path: '...' }
      const overridePath =
        typeof configEntry === "string" ? configEntry : configEntry?.path;

      if (overridePath) {
        // Resolve relative paths against project root
        const resolvedOverride = path.isAbsolute(overridePath)
          ? overridePath
          : path.resolve(this.projectRoot, overridePath);

        searchPaths.push(resolvedOverride);

        if (this.options.debugMode) {
          console.log(
            chalk.cyan(`      Overriding path for ${fullPackageName}`)
          );
        }
      }
    }

    // 2. Default Mappings for Core SDK Packages
    // These are standard locations in the repo
    const CORE_DEFAULTS = {
      "@flutterjs/runtime": "packages/flutterjs_runtime/flutterjs_runtime",
      "@flutterjs/material": "packages/flutterjs_material/flutterjs_material",
      "@flutterjs/vdom": "packages/flutterjs_vdom/flutterjs_vdom",
      "@flutterjs/analyzer": "packages/flutterjs_analyzer/flutterjs_analyzer",
      "@flutterjs/seo": "packages/flutterjs_seo/flutterjs_seo",
      "@flutterjs/dart": "packages/flutterjs_dart",
      "@flutterjs/foundation":
        "packages/flutterjs_foundation/flutterjs_foundation",
    };

    if (CORE_DEFAULTS[fullPackageName]) {
      const sdkRoot = this.findFlutterjsRoot(this.projectRoot);
      const defaultPath = path.join(sdkRoot, CORE_DEFAULTS[fullPackageName]);
      searchPaths.push(defaultPath);
    }

    // 2. Default Engine Locations
    searchPaths.push(
      path.join(engineRoot, "src", packageName),
      path.join(engineRoot, "package", packageName)
    );

    // 3. Node Modules (Project Root & Build Dirs)
    const possibleNodeModules = [
      path.join(this.projectRoot, "node_modules"),
      path.join(this.projectRoot, "build", "flutterjs", "node_modules"), // pubjs default
      path.join(this.projectRoot, "dist", "node_modules"), // alternative output
    ];

    for (const nodeModules of possibleNodeModules) {
      // a) Try direct match: .../node_modules/http
      searchPaths.push(path.join(nodeModules, fullPackageName));

      // b) If not scoped, try adding @flutterjs scope: .../node_modules/@flutterjs/http
      if (!fullPackageName.startsWith("@flutterjs/")) {
        searchPaths.push(path.join(nodeModules, "@flutterjs", fullPackageName));
      }
    }

    let foundPath = null;

    for (let i = 0; i < searchPaths.length; i++) {
      const searchPath = searchPaths[i];

      if (this.options.debugMode) {
        console.log(
          chalk.gray(
            `  [${i + 1}/${searchPaths.length}] Checking: ${searchPath}`
          )
        );
      }

      if (!fs.existsSync(searchPath)) {
        if (this.options.debugMode) {
          console.log(chalk.red(`         ✖ Not found`));
        }
        continue;
      }

      // Verify it's a directory
      const stat = fs.statSync(searchPath);
      if (!stat.isDirectory()) {
        if (this.options.debugMode) {
          console.log(chalk.red(`         ✖ Not a directory`));
        }
        continue;
      }

      // Found it!
      foundPath = searchPath;
      if (this.options.debugMode) {
        const files = fs.readdirSync(searchPath);
        console.log(chalk.green(`         ✔ Found (${files.length} items)`));
      }
      break;
    }

    if (!foundPath) {
      if (this.options.debugMode) {
        console.log(chalk.red(`  ✖ Not found in any location`));
      }
      this.resolvedPackages.set(fullPackageName, {
        location: null,
        source: null,
        path: null,
        resolved: false,
        error: `Package not found at any location`,
      });
      return;
    }

    // Store resolved package
    this.resolvedPackages.set(fullPackageName, {
      name: fullPackageName,
      packageName: packageName,
      location: foundPath,
      source: foundPath,
      path: foundPath,
      type: "sdk",
      resolved: true,
    });

    console.log(chalk.green(`  ✔ ${fullPackageName}`));
    console.log(chalk.gray(`     └─ ${foundPath}`));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DependencyResolver, ResolvedPackage, ResolutionResult };
