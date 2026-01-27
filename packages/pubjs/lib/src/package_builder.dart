import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package_watcher.dart';
import 'package:flutterjs_builder/flutterjs_builder.dart';

/// Builds FlutterJS packages by running their build.js scripts
/// and generating exports.json manifests
///
/// This class is responsible for ensuring all packages have valid
/// exports.json files before code generation begins.
class PackageBuilder {
  /// SDK packages that need to be built
  static const sdkPackages = [
    '@flutterjs/runtime',
    '@flutterjs/material',
    '@flutterjs/vdom',
    '@flutterjs/engine',
  ];

  /// Build all SDK packages
  ///
  /// [projectRoot] - Root directory of the FlutterJS project
  /// [buildPath] - Build directory (e.g., build/flutterjs)
  /// [force] - Force rebuild even if up-to-date
  /// [verbose] - Print detailed progress
  /// [parallel] - Build packages in parallel (faster)
  Future<BuildStatistics> buildSDKPackages({
    required String projectRoot,
    required String buildPath,
    bool force = false,
    bool verbose = false,
    bool parallel = true,
    Map<String, String>? sdkPaths,
  }) async {
    final stats = BuildStatistics();
    stats.startTime = DateTime.now();

    if (verbose) {
      print('\n🔨 Building SDK packages...');
    }

    // Use sequential if parallel is disabled
    final futureList = <Future<BuildResult>>[];

    for (final pkgName in sdkPackages) {
      if (parallel) {
        futureList.add(
          _buildWithProgress(
            packageName: pkgName,
            projectRoot: projectRoot,
            buildPath: buildPath,
            force: force,
            verbose: verbose,
            stats: stats,
            sdkPaths: sdkPaths,
          ),
        );
      } else {
        // Sequential build
        final result = await _buildWithProgress(
          packageName: pkgName,
          projectRoot: projectRoot,
          buildPath: buildPath,
          force: force,
          verbose: verbose,
          stats: stats,
          sdkPaths: sdkPaths,
        );

        if (result == BuildResult.built) {
          stats.builtCount++;
        } else if (result == BuildResult.skipped) {
          stats.skippedCount++;
        } else {
          stats.failedCount++;
          return stats; // Stop on failure
        }
      }
    }

    if (parallel) {
      final results = await Future.wait(futureList);

      // Count results
      for (final result in results) {
        if (result == BuildResult.built) {
          stats.builtCount++;
        } else if (result == BuildResult.skipped) {
          stats.skippedCount++;
        } else {
          stats.failedCount++;
        }
      }
    } else {
      // Sequential build
      for (final pkgName in sdkPackages) {
        final result = await buildPackage(
          packageName: pkgName,
          projectRoot: projectRoot,
          buildPath: buildPath,
          force: force,
          verbose: verbose,
        );

        if (result == BuildResult.built) {
          stats.builtCount++;
        } else if (result == BuildResult.skipped) {
          stats.skippedCount++;
        } else {
          stats.failedCount++;
          return stats; // Stop on failure
        }
      }
    }

    stats.endTime = DateTime.now();

    // 🎁 BUILD STATISTICS
    if (verbose) {
      print('\n📊 Build Statistics:');
      print('   ✓ Built: ${stats.builtCount}');
      print('   ⏭  Skipped: ${stats.skippedCount}');
      if (stats.failedCount > 0) {
        print('   ❌ Failed: ${stats.failedCount}');
      }
      print('   ⏱  Duration: ${stats.getDuration()}');
    }

    return stats;
  }

  /// Build package with progress indicator
  Future<BuildResult> _buildWithProgress({
    required String packageName,
    required String projectRoot,
    required String buildPath,
    required bool force,
    required bool verbose,
    required BuildStatistics stats,
    Map<String, String>? sdkPaths,
  }) async {
    final packageStopwatch = Stopwatch()..start();

    final result = await buildPackage(
      packageName: packageName,
      projectRoot: projectRoot,
      buildPath: buildPath,
      force: force,
      verbose: false, // Don't print in parallel mode
      sdkPaths: sdkPaths,
    );

    packageStopwatch.stop();
    stats.recordPackageBuild(packageName, packageStopwatch.elapsedMilliseconds);

    // 🎁 PROGRESS INDICATOR
    if (verbose) {
      final icon = result == BuildResult.built
          ? '✓'
          : result == BuildResult.skipped
          ? '⏭'
          : '❌';
      final time = '${packageStopwatch.elapsedMilliseconds}ms';
      print('   $icon $packageName ($time)');
    }

    return result;
  }

  // ... (existing imports)

  /// Build a package and all its dependencies recursively
  Future<BuildResult> buildPackageRecursively({
    required String packageName,
    required String projectRoot,
    String? explicitSourcePath,
    bool force = false,
    bool verbose = false,
  }) async {
    print('🔄 Resolving dependencies for $packageName...');

    // 1. Initialize Resolver
    final searchPath = explicitSourcePath ?? projectRoot;
    PackageResolver resolver;
    try {
      resolver = await PackageResolver.load(searchPath);
    } catch (e) {
      if (verbose) print('   ⚠️ Could not load PackageResolver: $e');
      // Fallback: Just build the single package if resolver fails (legacy mode)
      return buildPackage(
        packageName: packageName,
        projectRoot: projectRoot,
        buildPath: '',
        explicitSourcePath: explicitSourcePath,
        force: force,
        verbose: verbose,
      );
    }

    // 2. Build Dependency Graph
    final buildOrder = <String>[];
    final visited = <String>{};
    final visiting = <String>{};

    Future<void> visit(String pkg) async {
      if (visiting.contains(pkg)) {
        if (verbose) print('   ⚠️ Circular dependency detected: $pkg');
        return;
      }
      if (visited.contains(pkg)) return;

      visiting.add(pkg);

      try {
        final deps = await resolver.getDependencies(pkg);
        for (final dep in deps) {
          // Skip SDK/Flutter specific packages checking if needed
          // For now, try to resolve all. SDK params might fail lookup, which is fine.
          if (resolver.resolvePackagePath(dep) != null) {
            await visit(dep);
          }
        }
      } catch (e) {
        if (verbose) print('   ⚠️ Could not resolve deps for $pkg: $e');
      }

      visiting.remove(pkg);
      visited.add(pkg);
      buildOrder.add(pkg);
    }

    // Start resolution
    // If explicit path, we might not know the package name yet,
    // but the CLI tries to parse it. If resolving dependencies of "."
    // we need to know the name.

    await visit(packageName);

    print('📦 Build Order: ${buildOrder.join(' -> ')}');

    // 3. Build All
    BuildResult finalResult = BuildResult.skipped;

    for (final pkg in buildOrder) {
      // Find path from resolver
      final pkgPath = resolver.resolvePackagePath(pkg);
      if (pkgPath == null) continue;

      // Skip if it's the flutter SDK or similar non-buildable
      // Simple heuristic: check if it has a lib dir? buildPackage check needsBuild anyway.

      final result = await buildPackage(
        packageName: pkg,
        projectRoot: projectRoot,
        buildPath: '',
        explicitSourcePath: pkgPath, // Must use explicit path from resolver
        force: force,
        verbose: verbose,
        resolver: resolver,
      );

      if (pkg == packageName) {
        finalResult = result;
      } else if (result == BuildResult.failed) {
        print('❌ Dependency failed: $pkg');
        return BuildResult.failed;
      }
    }

    return finalResult;
  }

  /// Build a single package
  Future<BuildResult> buildPackage({
    required String packageName,
    required String projectRoot,
    required String buildPath,
    bool force = false,
    bool verbose = false,
    Map<String, String>? sdkPaths,
    String? explicitSourcePath,
    PackageResolver? resolver,
  }) async {
    // 1. Find package source directory
    String? sourcePath;

    if (explicitSourcePath != null) {
      sourcePath = explicitSourcePath;
    } else {
      sourcePath = await _findPackageSource(
        packageName,
        projectRoot,
        buildPath,
        sdkPaths,
      );
    }

    if (sourcePath == null) {
      if (verbose) print('   ⚠️  $packageName not found, skipping');
      return BuildResult.skipped;
    }

    // 2. Check if build needed
    if (!force) {
      final needed = await needsBuild(sourcePath);
      if (!needed) {
        if (verbose) print('   ✓ $packageName (up-to-date)');
        return BuildResult.skipped;
      }
    }

    if (verbose) print('   🔨 Building $packageName...');

    // 3. Determine Build Strategy
    final buildScript = File(p.join(sourcePath, 'build.js'));

    if (await buildScript.exists()) {
      // STRATEGY A: Legacy/Manual build.js
      if (verbose) print('      Using build.js strategy');

      // Check/Install node_modules
      final nodeModules = Directory(p.join(sourcePath, 'node_modules'));
      if (!await nodeModules.exists()) {
        if (verbose) print('   📦 Installing dependencies for $packageName...');
        final npmCommand = Platform.isWindows ? 'npm.cmd' : 'npm';
        final installResult = await Process.run(
          npmCommand,
          ['install'],
          workingDirectory: sourcePath,
          runInShell: true,
        );
        if (installResult.exitCode != 0) {
          print(
            '❌ npm install failed for $packageName:\n${installResult.stderr}',
          );
          return BuildResult.failed;
        }
      }

      final result = await Process.run('node', [
        'build.js',
      ], workingDirectory: sourcePath);

      if (result.exitCode != 0) {
        print('❌ Build failed for $packageName:');
        print(result.stderr);
        return BuildResult.failed;
      }
    } else {
      // STRATEGY B: Automatic Dart Compilation (The New Standard)
      if (verbose) print('      Using Automatic Dart Compiler');

      try {
        final compiler = PackageCompiler(
          packagePath: sourcePath,
          outputDir: p.join(sourcePath, 'dist'),
          verbose: verbose,
          resolver: resolver,
        );

        await compiler.compile();
      } catch (e) {
        print('❌ Compilation failed for $packageName: $e');
        return BuildResult.failed;
      }
    }

    // 5. Verify exports.json was created and is valid
    if (!await verifyManifest(sourcePath)) {
      print('❌ Manifest verification failed for $packageName');
      return BuildResult.failed;
    }

    if (verbose) {
      final manifest = await _loadManifest(sourcePath);
      final count = manifest?['exports']?.length ?? 0;
      print('   ✓ $packageName built ($count exports)');
    }

    return BuildResult.built;
  }

  /// Check if a package needs to be built
  ///
  /// Returns true if:
  /// - exports.json doesn't exist
  /// - Any source file is newer than exports.json
  Future<bool> needsBuild(String packagePath) async {
    final exportsFile = File(p.join(packagePath, 'exports.json'));

    // If exports.json doesn't exist, definitely need to build
    if (!await exportsFile.exists()) {
      return true;
    }

    try {
      final exportsTime = await exportsFile.lastModified();
      final srcDir = Directory(p.join(packagePath, 'src'));

      if (!await srcDir.exists()) {
        return false; // No source files, no need to build
      }

      // Check if any source file is newer than exports.json
      await for (final entity in srcDir.list(recursive: true)) {
        if (entity is File && entity.path.endsWith('.js')) {
          final sourceTime = await entity.lastModified();
          if (sourceTime.isAfter(exportsTime)) {
            return true; // Source is newer, need rebuild
          }
        }
      }

      return false; // All sources older, no rebuild needed
    } catch (e) {
      // On any error, be safe and rebuild
      return true;
    }
  }

  /// Verify that a package's manifest is valid
  ///
  /// Checks:
  /// - exports.json exists
  /// - Valid JSON format
  /// - Has required fields
  /// - Has at least one export
  Future<bool> verifyManifest(String packagePath) async {
    final exportsFile = File(p.join(packagePath, 'exports.json'));

    if (!await exportsFile.exists()) {
      return false;
    }

    try {
      final content = await exportsFile.readAsString();
      final json = jsonDecode(content) as Map<String, dynamic>;

      // Check required fields
      if (!json.containsKey('package')) return false;
      if (!json.containsKey('version')) return false;
      if (!json.containsKey('exports')) return false;

      final exports = json['exports'];
      if (exports is! List) return false;
      if (exports.isEmpty) return false;

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Find package source directory
  ///
  /// Tries multiple locations:
  /// 1. build/flutterjs/node_modules/@flutterjs/xxx
  /// 2. packages/flutterjs_xxx/flutterjs_xxx (SDK packages)
  Future<String?> _findPackageSource(
    String packageName,
    String projectRoot,
    String buildPath, [
    Map<String, String>? sdkPaths,
  ]) async {
    // 0. Check threaded SDK paths (Most reliable)
    if (sdkPaths != null && sdkPaths.containsKey(packageName)) {
      final relativePath = sdkPaths[packageName]!;
      final absPath = p.normalize(p.join(projectRoot, relativePath));
      if (await Directory(absPath).exists()) {
        return absPath;
      }
    }

    final simpleName = packageName.replaceAll('@flutterjs/', '');

    final locations = [
      // In build directory (runtime packages)
      p.join(buildPath, 'node_modules', '@flutterjs', simpleName),

      // In packages directory (SDK source - nested)
      p.join(
        projectRoot,
        'packages',
        'flutterjs_$simpleName',
        'flutterjs_$simpleName',
      ),

      // In packages directory (SDK source - flat)
      p.join(projectRoot, 'packages', 'flutterjs_$simpleName'),
    ];

    for (final location in locations) {
      if (await Directory(location).exists()) {
        return location;
      }
    }

    return null;
  }

  /// Load manifest JSON (helper for verbose output)
  Future<Map<String, dynamic>?> _loadManifest(String packagePath) async {
    try {
      final file = File(p.join(packagePath, 'exports.json'));
      final content = await file.readAsString();
      return jsonDecode(content) as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }
}

/// Result of a package build operation
enum BuildResult {
  /// Package was successfully built
  built,

  /// Package was skipped (up-to-date or no build.js)
  skipped,

  /// Package build failed
  failed,
}
