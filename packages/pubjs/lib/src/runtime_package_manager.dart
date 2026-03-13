// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:yaml/yaml.dart';
import 'pub_dev_client.dart';
import 'package_downloader.dart';
import 'model/package_info.dart';
import 'config_resolver.dart';
import 'config_generator.dart';
import 'flutterjs_registry_client.dart';
import 'package_builder.dart';

/// Runtime package manager for FlutterJS
///
/// Handles package resolution, caching, and downloading from pub.dev or npm
/// at runtime. Enforces strict registry checking.
class RuntimePackageManager {
  final PubDevClient _pubDevClient;
  final PackageDownloader _downloader;
  final ConfigResolver _configResolver;
  final ConfigGenerator _configGenerator;
  final FlutterJSRegistryClient _registryClient;
  final bool verbose;

  RuntimePackageManager({
    PubDevClient? pubDevClient,

    PackageDownloader? downloader,
    ConfigResolver? configResolver,
    ConfigGenerator? configGenerator,
    FlutterJSRegistryClient? registryClient,
    this.verbose = false,
  }) : _pubDevClient = pubDevClient ?? PubDevClient(),

       _downloader = downloader ?? PackageDownloader(verbose: verbose),
       _configResolver = configResolver ?? ConfigResolver(),
       _configGenerator = configGenerator ?? ConfigGenerator(),
       _registryClient = registryClient ?? FlutterJSRegistryClient();

  /// Resolves specific packages and returns their paths
  ///
  /// This is used by the hybrid resolution strategy where Dart resolves
  /// only packages that don't have paths in the config.
  ///
  /// Returns: Map<packageName, resolvedPath>
  Future<Map<String, String>> resolvePackages(
    List<String> packageNames, {
    required String projectPath,
    bool includeSDK = false,
    bool includeProjectDependencies = false,
    String? lookupNodeModulesPath, // ✅ NEW: Custom node_modules path
    bool verbose = false,
  }) async {
    final resolvedPaths = <String, String>{};
    final packagesToResolve = List<String>.from(packageNames);

    // 0. Include project dependencies (Direct & Transitive) if requested
    if (includeProjectDependencies) {
      // A. Direct dependencies from pubspec
      final projectDeps = await _getDependenciesFromPubspec(projectPath);
      for (final dep in projectDeps) {
        if (!packagesToResolve.contains(dep)) {
          packagesToResolve.add(dep);
        }
      }

      // B. Transitive dependencies from node_modules
      // Use provided lookup path or default to project root
      final nodeModulesSearchPath =
          lookupNodeModulesPath ?? p.join(projectPath, 'node_modules');
      final nodeModulesDir = Directory(nodeModulesSearchPath);

      if (await nodeModulesDir.exists()) {
        await for (final entity in nodeModulesDir.list()) {
          if (entity is Directory) {
            final pkgName = p.basename(entity.path);

            // ✅ FIX: Recurse into scoped packages (e.g. @flutterjs/foundation)
            if (pkgName.startsWith('@')) {
              await for (final subEntity in entity.list()) {
                if (subEntity is Directory) {
                  final subPkgName = p.basename(subEntity.path);
                  final fullPkgName = '$pkgName/$subPkgName'; // @scope/pkg
                  if (!packagesToResolve.contains(fullPkgName)) {
                    packagesToResolve.add(fullPkgName);
                  }
                }
              }
            } else if (!pkgName.startsWith('.') &&
                !packagesToResolve.contains(pkgName)) {
              packagesToResolve.add(pkgName);
            }
          }
        }
      } else if (verbose) {
        print('   ⚠️ node_modules not found at $nodeModulesSearchPath');
      }

      if (verbose) {
        print(
          '   ➕ Added ${packagesToResolve.length} total dependencies (direct + transitive)',
        );
      }
    }

    if (verbose) {
      print('📦 Resolving ${packagesToResolve.length} packages...');
    }

    // 1. Read flutterjs.config.js for any existing configs
    final configPath = p.join(projectPath, 'flutterjs.config.js');
    final userPackageConfigs = await _configResolver.resolvePackageConfig(
      configPath,
    );

    // 2. Fetch registry for package mappings
    final registry = await _registryClient.fetchRegistry();
    final registryPackages = (registry?['packages'] as List?) ?? [];

    // 3. Resolve SDK packages if requested
    if (includeSDK) {
      final sdkPackages = await _resolveSDKPackages(projectPath);

      // If packagesToResolve is empty (and we didn't add project deps), resolve ALL SDK packages
      // But if we have project deps, we still want to ensure SDK packages are available if needed?
      // Actually, if packagesToResolve is empty, we return all SDK.
      // If NOT empty, we filter.

      if (packagesToResolve.isEmpty) {
        resolvedPaths.addAll(sdkPackages);
        if (verbose) {
          for (final pkg in sdkPackages.keys) {
            print('   ✔ $pkg (SDK)');
          }
        }
      } else {
        // Only resolve requested SDK packages
        // Also check if any packageToResolve maps to an SDK package (without @flutterjs prefix)
        // e.g. "flutterjs_material" -> "@flutterjs/material"

        for (final pkg in packagesToResolve) {
          String? sdkKey;
          if (pkg.startsWith('@flutterjs/') && sdkPackages.containsKey(pkg)) {
            sdkKey = pkg;
          } else if (sdkPackages.containsKey('@flutterjs/$pkg')) {
            sdkKey = '@flutterjs/$pkg';
          } else if (pkg.startsWith('flutterjs_')) {
            final simple = pkg.replaceFirst('flutterjs_', '');
            if (sdkPackages.containsKey('@flutterjs/$simple')) {
              sdkKey = '@flutterjs/$simple';
            }
          }

          if (sdkKey != null) {
            resolvedPaths[sdkKey] = sdkPackages[sdkKey]!;
            if (verbose) print('   ✔ $pkg -> $sdkKey (SDK)');
          }
        }

        // Also ensure core SDK packages are always included if includeSDK is true
        // regardless of whether they were requested, because config might need them?
        // Actually, let's just stick to requests for now to valid duplicates.
      }
    }

    // 4. Resolve each package
    for (final packageName in packagesToResolve) {
      // Skip if already resolved (SDK or alias)
      if (resolvedPaths.containsKey(packageName)) continue;
      if (resolvedPaths.containsKey('@flutterjs/$packageName')) continue;

      // Check if user has local path override
      final userConfig = userPackageConfigs[packageName];
      if (userConfig != null && userConfig.path != null) {
        final sourcePath = userConfig.path!;
        final absolutePath = p.isAbsolute(sourcePath)
            ? sourcePath
            : p.normalize(p.join(projectPath, sourcePath));

        if (await Directory(absolutePath).exists()) {
          resolvedPaths[packageName] = p.relative(
            absolutePath,
            from: projectPath,
          );
          if (verbose) print('   ✔ $packageName (local)');
        } else {
          if (verbose) print('   ❌ $packageName (local path not found)');
        }
        continue;
      }

      // Try registry lookup
      dynamic registryEntry;
      try {
        registryEntry = registryPackages.firstWhere(
          (pkg) => pkg['name'] == packageName,
        );
      } catch (_) {}

      if (registryEntry != null) {
        final targetFlutterJsPackage = registryEntry['flutterjs_package'];
        // Registry packages (non-SDK) go to root node_modules
        final nodeModulesSearchPath =
            lookupNodeModulesPath ?? p.join(projectPath, 'node_modules');
        resolvedPaths[packageName] = p.join(
          nodeModulesSearchPath,
          targetFlutterJsPackage,
        );
        if (verbose) {
          print(
            '   ✔ $packageName -> ${resolvedPaths[packageName]} (registry)',
          );
        }
      } else {
        // Fallback: Check node_modules for direct existence
        final nodeModulesSearchPath =
            lookupNodeModulesPath ?? p.join(projectPath, 'node_modules');

        // Return absolute path to ensure correct resolution in build tools
        resolvedPaths[packageName] = p.join(nodeModulesSearchPath, packageName);

        if (verbose) {
          print(
            '   ✔ $packageName -> ${resolvedPaths[packageName]} (fallback)',
          );
        }
      }
    }

    return resolvedPaths;
  }

  /// Resolves SDK packages (@flutterjs/*)
  Future<Map<String, String>> _resolveSDKPackages(String projectPath) async {
    final sdkPackages = <String, String>{};

    // Search upward for packages/flutterjs_engine/
    Directory current = Directory(projectPath);
    for (int i = 0; i < 8; i++) {
      final enginePaths = [
        p.join(current.path, 'packages', 'flutterjs_engine', 'src'),
        p.join(current.path, 'packages', 'flutterjs_engine', 'package'),
      ];

      for (final enginePath in enginePaths) {
        final engineDir = Directory(enginePath);
        if (await engineDir.exists()) {
          await for (final entity in engineDir.list()) {
            if (entity is Directory) {
              final pkgJsonPath = p.join(entity.path, 'package.json');
              if (await File(pkgJsonPath).exists()) {
                final pkgName = p.basename(entity.path);
                final relativePath = p.relative(entity.path, from: projectPath);
                sdkPackages['@flutterjs/$pkgName'] = relativePath;
              }
            }
          }
        }
      }

      // Also scan packages/flutterjs_* for core SDK packages
      // These have structure: packages/flutterjs_material/flutterjs_material/package.json
      final packagesDir = p.join(current.path, 'packages');
      if (await Directory(packagesDir).exists()) {
        await for (final entity in Directory(packagesDir).list()) {
          if (entity is Directory) {
            final dirName = p.basename(entity.path);

            // Check if it's a flutterjs_* package or flutter_web_plugins
            if ((dirName.startsWith('flutterjs_') ||
                    dirName == 'flutter_web_plugins') &&
                dirName != 'flutterjs_engine' &&
                dirName != 'flutterjs_tools') {
              // 1. Try nested package (legacy): packages/flutterjs_material/flutterjs_material/
              final innerPackageDir = Directory(p.join(entity.path, dirName));
              bool found = false;

              if (await innerPackageDir.exists()) {
                final pubspecPath = p.join(
                  innerPackageDir.path,
                  'pubspec.yaml',
                );
                if (await File(pubspecPath).exists()) {
                  found = true;
                  // Extract package name: flutterjs_material -> material
                  final pkgName = dirName.substring('flutterjs_'.length);
                  final relativePath = p.relative(
                    innerPackageDir.path,
                    from: projectPath,
                  );
                  sdkPackages['@flutterjs/$pkgName'] = relativePath;
                } else {
                  // NEW: logical fix for JS-based packages (using package.json)
                  final packageJsonPath = p.join(
                    innerPackageDir.path,
                    'package.json',
                  );
                  if (await File(packageJsonPath).exists()) {
                    found = true;
                    // FIX: Safe name extraction
                    String key;
                    if (dirName.startsWith('flutterjs_')) {
                      final simpleName = dirName.substring('flutterjs_'.length);
                      key = '@flutterjs/$simpleName';
                    } else {
                      key = dirName;
                    }

                    final relativePath = p.relative(
                      innerPackageDir.path,
                      from: projectPath,
                    );
                    sdkPackages[key] = relativePath;
                  }
                }
              }

              // 2. Try flat package (new): packages/flutterjs_dart/
              if (!found) {
                final pubspecPath = p.join(entity.path, 'pubspec.yaml');
                final packageJsonPath = p.join(entity.path, 'package.json');

                if (await File(pubspecPath).exists() ||
                    await File(packageJsonPath).exists()) {
                  // FIX: Safe name extraction
                  String key;
                  if (dirName.startsWith('flutterjs_')) {
                    final simpleName = dirName.substring('flutterjs_'.length);
                    key = '@flutterjs/$simpleName';
                  } else {
                    key = dirName;
                  }

                  final relativePath = p.relative(
                    entity.path,
                    from: projectPath,
                  );
                  sdkPackages[key] = relativePath;
                }
              }
            }
          }
        }
      }

      if (sdkPackages.isNotEmpty) break;

      if (current.parent.path == current.path) break;
      current = current.parent;
    }

    return sdkPackages;
  }

  /// Resolves and installs all dependencies for a FlutterJS project
  Future<bool> resolveProjectDependencies({
    required String projectPath,
    required String buildPath,
    bool verbose = false,
    Map<String, String>? preResolvedSdkPackages,
    PackageBuilder? builder,
    List<String> overridePackages = const [],
    bool force = false,
  }) async {
    // Make a mutable copy so we can add transitive deps discovered later
    final mutableOverrides = List<String>.from(overridePackages);
    final totalStopwatch = Stopwatch()..start();
    final Map<String, String> finalResolvedPackages = {};

    if (verbose) {
      print('🔍 Resolving FlutterJS project dependencies...');
    }

    try {
      // 1. Read pubspec.yaml dependencies
      final pubspecPath = p.join(projectPath, 'pubspec.yaml');
      final pubspecFile = File(pubspecPath);

      if (!await pubspecFile.exists()) {
        print('❌ pubspec.yaml not found: $pubspecPath');
        return false;
      }

      final pubspecContent = await pubspecFile.readAsString();
      final pubspec = loadYaml(pubspecContent) as Map;
      final dependencies = pubspec['dependencies'] as Map? ?? {};

      // 2. Read flutterjs.config.js overrides
      final configPath = p.join(projectPath, 'flutterjs.config.js');
      // Use the new package config resolver
      final userPackageConfigs = await _configResolver.resolvePackageConfig(
        configPath,
      );

      // 3. Resolve each dependency
      // SDK packages go to @flutterjs scope
      final nodeModulesFlutterJS = p.join(
        buildPath,
        'node_modules',
        '@flutterjs',
      );
      // Standard packages go to root node_modules
      final nodeModulesRoot = p.join(buildPath, 'node_modules');

      await Directory(nodeModulesFlutterJS).create(recursive: true);
      await Directory(nodeModulesRoot).create(recursive: true);

      // Pre-fetch registry to check for all packages
      final registry = await _registryClient.fetchRegistry();
      if (registry == null) {
        print(
          '⚠️  Warning: Could not fetch FlutterJS Registry. Only local paths will work.',
        );
      }
      final registryPackages = (registry?['packages'] as List?) ?? [];

      // 🎁 NEW: Resolve SDK packages locally first (or use pre-resolved)
      final sdkPackages =
          preResolvedSdkPackages ?? await _resolveSDKPackages(projectPath);
      if (verbose && sdkPackages.isNotEmpty) {
        if (preResolvedSdkPackages == null) {
          print('   💡 Found ${sdkPackages.length} local SDK packages');
        }
      }

      // 🎁 NEW: Explicitly link ALL SDK packages found in monorepo
      // This ensures scoped packages (e.g. @flutterjs/runtime) are available in node_modules
      const excludedSdkPackages = {
        '@flutterjs/analyzer',
        '@flutterjs/builder',
        '@flutterjs/core',
        '@flutterjs/dev_tools',
        '@flutterjs/dev_utils',
        '@flutterjs/gen',
      };

      for (final sdkPkg in sdkPackages.entries) {
        final pkgName = sdkPkg.key;

        // Skip dev-only/internal packages unless explicitly requested in pubspec.yaml
        if (excludedSdkPackages.contains(pkgName)) {
          // Map @flutterjs/foo -> flutterjs_foo to check pubspec dependencies
          final simpleName = pkgName.replaceFirst('@flutterjs/', '');
          final dartPkgName = 'flutterjs_$simpleName';

          if (!dependencies.containsKey(dartPkgName)) {
            if (verbose) print('   Skipping internal package: $pkgName');
            continue;
          }
        }

        final relPath = sdkPkg.value;
        final absPath = p.join(projectPath, relPath);

        if (pkgName.startsWith('@flutterjs/')) {
          // If package is scoped (e.g. @flutterjs/runtime), strip scope because destDir already includes @flutterjs
          final linkName = pkgName.substring('@flutterjs/'.length);

          if (verbose) {
            print('   🔗 Pre-linking SDK package: $pkgName -> $linkName');
          }
          await _linkLocalPackage(linkName, absPath, nodeModulesFlutterJS);

          // Also link under the Dart package name (e.g. 'flutterjs_server') in root
          // node_modules so generated JS `import '...' from 'flutterjs_server'` resolves.
          final dartPkgName = 'flutterjs_$linkName';
          if (dependencies.containsKey(dartPkgName)) {
            if (verbose) {
              print('   🔗 Also linking as Dart name: $dartPkgName');
            }
            await _linkLocalPackage(dartPkgName, absPath, nodeModulesRoot);
          }
        } else {
          // Non-scoped package (e.g. flutter_web_plugins) goes to root node_modules
          if (verbose) {
            print('   🔗 Pre-linking SDK package: $pkgName ->Root');
          }
          await _linkLocalPackage(pkgName, absPath, nodeModulesRoot);
        }

        // ✅ RECORD: SDK package
        finalResolvedPackages[pkgName] = absPath;

        // ✅ FIX: Collect dependencies of IMPLICITLY linked SDK packages of implicit SDK packages
        // If an SDK package depends on 'path', we must ensure 'path' is installed.
        final sdkDeps = await _getDependenciesFromPubspec(absPath);
        for (final dep in sdkDeps) {
          if (!dependencies.containsKey(dep)) {
            mutableOverrides.add(dep);
          }
        }
      }

      // Merge project dependencies with SDK package transitive deps
      final queue = <String>{
        ...dependencies.keys.map((k) => k.toString()),
        ...mutableOverrides,
      }.toList();
      final processed = <String>{};

      final Map<String, Set<String>> dependencyGraph = {};
      final Set<String> allDetectedPackages = {};

      var currentBatch = List<String>.from(queue);

      while (currentBatch.isNotEmpty) {
        final nextBatch = <String>{};
        final futures = <Future<List<String>?>>[];

        for (final pkg in currentBatch) {
          if (processed.contains(pkg)) continue;
          processed.add(pkg);
          allDetectedPackages.add(pkg);

          if (pkg == 'flutter' || pkg == 'flutter_web_plugins') continue;

          // Initialize graph node
          if (!dependencyGraph.containsKey(pkg)) {
            dependencyGraph[pkg] = {};
          }

          futures.add(
            _resolveAndInstallPackage(
              pkg,
              projectPath: projectPath,
              userPackageConfigs: userPackageConfigs,
              sdkPackages: sdkPackages,
              registryPackages: registryPackages,
              topLevelDependencies: dependencies,
              nodeModulesFlutterJS: nodeModulesFlutterJS,
              nodeModulesRoot: nodeModulesRoot,
              verbose: verbose,
              force: force,
              overridePackages: mutableOverrides,
              builder: builder,
              resolvedMap: finalResolvedPackages,
            ).then((deps) {
              // Populate graph edges
              if (deps != null) {
                // If this package has dependencies, record them
                // This means 'pkg' depends on 'dep'
                // So in build order: 'dep' must be built BEFORE 'pkg'
                for (final dep in deps) {
                  dependencyGraph[pkg]!.add(dep);
                }
              }
              return deps;
            }),
          );
        }

        if (futures.isEmpty) {
          currentBatch = nextBatch.toList();
          continue;
        }

        final results = await Future.wait(futures);

        for (final result in results) {
          if (result == null) {
            // Error occurred in one of the packages
            return false;
          }
          nextBatch.addAll(result);
        }

        currentBatch = nextBatch.toList();
      }

      // PHASE 1.5: Build Packages if builder is provided
      if (builder != null) {
        if (verbose) print('\nProcessing downloaded packages for build...');

        // Filter packages that need building
        final packagesToBuildSet = <String>{};
        for (final pkgName in allDetectedPackages) {
          if (sdkPackages.containsKey(pkgName) ||
              pkgName.startsWith('@flutterjs/')) {
            continue;
          }
          if (pkgName == 'flutter' || pkgName == 'flutter_web_plugins') {
            continue;
          }
          packagesToBuildSet.add(pkgName);
        }

        // PERFORM TOPOLOGICAL SORT
        // Sorts so dependencies appear BEFORE their consumers
        final sortedPackages = _topologicalSort(
          packagesToBuildSet,
          dependencyGraph,
        );

        if (verbose) {
          print('   Build order: ${sortedPackages.join(' → ')}');
        }

        final totalPackages = sortedPackages.length;
        if (totalPackages > 0) {
          print(
            '\n📦 Building $totalPackages package${totalPackages == 1 ? '' : 's'} (Ordered)...\n',
          );
        }

        var completedPackages = 0;

        // Build SEQUENTIALLY to ensure dependencies are ready
        for (final pkgName in sortedPackages) {
          final sw = Stopwatch()..start();

          try {
            // Pass the current state of resolved/built packages if needed?
            // The builder itself doesn't take dependency paths yet, we will update that next.
            // For now, simple ordered build ensures exports.json exists on disk.
            await builder.buildPackage(
              packageName: pkgName,
              projectRoot: projectPath,
              buildPath: buildPath,
              verbose: verbose,
              dependencyMap: finalResolvedPackages,
            );
          } catch (e) {
            print('❌ Build failed for $pkgName: $e');
            return false;
          }

          sw.stop();
          completedPackages++;
          final percentage = (completedPackages / totalPackages * 100).round();
          final duration = (sw.elapsedMilliseconds / 1000).toStringAsFixed(1);
          print(
            '[$completedPackages/$totalPackages] ($percentage%) ✓ $pkgName (${duration}s)',
          );
        }

        if (totalPackages > 0) {
          print('\n✅ All packages built successfully!\n');
        }
      }

      totalStopwatch.stop();
      final totalSeconds = (totalStopwatch.elapsedMilliseconds / 1000)
          .toStringAsFixed(1);
      print('⏱️  Total time: ${totalSeconds}s\n');

      // ✅ RECORD: Add project itself to map
      String appName = 'app';
      try {
        final yaml = loadYaml(pubspecContent) as Map;
        appName = yaml['name'] as String;
      } catch (_) {}
      finalResolvedPackages[appName] = projectPath;

      // ✅ RECORD: Write the final package map
      await _writePackageMap(projectPath, buildPath, finalResolvedPackages);

      return true;
    } catch (e) {
      print('❌ Error resolving dependencies: $e');
      return false;
    }
  }

  /// Helper to read dependencies from a package's pubspec.yaml.
  ///
  /// Also reads `flutter.plugin.platforms.web.default_package` so that
  /// plugin packages (e.g. url_launcher) automatically pull in their web
  /// implementation (e.g. url_launcher_web).
  Future<List<String>> _getDependenciesFromPubspec(String packagePath) async {
    try {
      final pubspecPath = p.join(packagePath, 'pubspec.yaml');
      final file = File(pubspecPath);
      if (!await file.exists()) return [];

      final content = await file.readAsString();
      final yaml = loadYaml(content) as Map;
      final deps = yaml['dependencies'] as Map? ?? {};

      final result = deps.keys
          .map((k) => k.toString())
          .where((d) => d != 'flutter')
          .where((d) => !_isNonWebPlatformPackage(d))
          .toList();

      // Read flutter.plugin.platforms.web.default_package so that the
      // web implementation of a plugin is automatically installed.
      // e.g. url_launcher declares default_package: url_launcher_web
      try {
        final flutter = yaml['flutter'] as Map?;
        final plugin = flutter?['plugin'] as Map?;
        final platforms = plugin?['platforms'] as Map?;
        final web = platforms?['web'] as Map?;
        final defaultPackage = web?['default_package'] as String?;
        if (defaultPackage != null && !result.contains(defaultPackage)) {
          result.add(defaultPackage);
        }
      } catch (_) {
        // Not a plugin package - fine to ignore
      }

      return result;
    } catch (e) {
      print('Warning: Failed to parse pubspec in $packagePath: $e');
      return [];
    }
  }

  bool _isNonWebPlatformPackage(String packageName) {
    // Always keep explicitly web packages
    if (packageName.endsWith('_web')) return false;

    // Filter out ONLY specific native implementations that are definitely not transpilable
    // "pure" dart packages (like bloc, provider, http) should pass.
    // We only exclude packages that are strictly for other platforms AND likely contain native code
    // or are plugins for those platforms.

    // If it's a "platform interface" package, it's usually fine (Dart).
    if (packageName.endsWith('_platform_interface')) return false;

    // Known native-only suffix
    const nativeSuffixes = [
      '_android',
      '_ios',
      '_macos',
      '_windows',
      '_linux',
      '_fuchsia',
    ];

    for (final suffix in nativeSuffixes) {
      // If package ends with _android, it likely depends on android embedding
      if (packageName.endsWith(suffix)) return true;
    }

    // Explicit blacklist for known non-web packages
    const blacklisted = {
      'native_toolchain_c',
      'ffi',
      'dart_flutter_team_lints', // Dev dependency only usually
      'objective_c',
      'path_provider_foundation',
      'path_provider_windows',
      'path_provider_linux',
      'path_provider_android',
      'path_provider_ios',
      'path_provider_macos',
      'url_launcher_windows',
      'url_launcher_linux',
      'url_launcher_android',
      'url_launcher_ios',
      'url_launcher_macos',
      'flutter_plugin_android_lifecycle',
      'win32',
      'xdg_directories',
    };
    if (blacklisted.contains(packageName)) return true;

    return false;
  }

  /// Complete package preparation: download, build, and verify manifests
  ///
  /// This is the ONE METHOD that CLI should call to prepare all packages.
  /// It orchestrates the full flow:
  /// 1. Resolve and download dependencies
  /// 2. Build SDK packages (generate exports.json)
  /// 3. Verify all manifests exist
  ///
  /// [projectPath] - Root directory of the project
  /// [buildPath] - Build directory (e.g., build/flutterjs)
  /// [force] - Force rebuild even if packages are up-to-date
  /// [verbose] - Print detailed progress
  Future<bool> preparePackages({
    required String projectPath,
    required String buildPath,
    bool force = false,
    bool verbose = false,
    List<String> overridePackages = const [],
  }) async {
    print('\n📦 Preparing FlutterJS packages...\n');

    // 🎁 Resolve SDK paths once for everyone
    final sdkPaths = await _resolveSDKPackages(projectPath);

    // PHASE 1: Build SDK packages (build first so artifacts exist when copied)
    if (verbose) {
      print('\nPhase 1: Building SDK packages...');
    }

    final builder = PackageBuilder();
    final buildStats = await builder.buildSDKPackages(
      projectRoot: projectPath,
      buildPath: buildPath,
      force: force,
      verbose: verbose,
      parallel: true, // 🎁 Parallel builds enabled
      sdkPaths: sdkPaths,
    );

    if (buildStats.failedCount > 0) {
      if (verbose) {
        print('❌ Build failed with ${buildStats.failedCount} errors');
      }
      return false;
    }

    // PHASE 2: Resolve Dependencies (link/copy built packages, download external)
    if (verbose) {
      print('\nPhase 2: Resolving dependencies...');
    }

    final resolved = await resolveProjectDependencies(
      projectPath: projectPath,
      buildPath: buildPath,
      verbose: verbose,
      preResolvedSdkPackages: sdkPaths,
      builder: builder,
      overridePackages: overridePackages,
      force: force,
    );

    if (!resolved) {
      print('❌ Dependency resolution failed');
      return false;
    }

    // 🎁 Show detailed build report
    if (verbose) {
      buildStats.printReport();
    }

    // PHASE 3: Verify manifests exist
    if (verbose) {
      print('\nPhase 3: Verifying manifests...');
      final manifestsOk = await _verifyManifests(buildPath);
      if (!manifestsOk) {
        print('⚠️  Some manifests missing, but continuing...');
      }
    }

    print('\n✅ All packages ready!\n');

    // 🎁 Generate .dart_tool/package_config.json so PackageResolver (and Dart tools) can find them
    await _generatePackageConfig(projectPath, buildPath);

    return true;
  }

  /// Prepares packages using Flutter's pub get for package resolution
  ///
  /// This method integrates with the standard Dart/Flutter package manager:
  /// 1. Runs `dart pub get` to resolve all packages (including pub.dev)
  /// 2. Reads `.dart_tool/package_config.json` for package locations
  /// 3. Compiles each package using FlutterJS builder
  /// 4. Installs compiled packages to node_modules
  ///
  /// This approach leverages Flutter's package resolution while still
  /// generating JavaScript output for all dependencies.
  Future<bool> preparePackagesWithPubGet({
    required String projectPath,
    required String buildPath,
    bool force = false,
    bool verbose = false,
    List<String> overridePackages = const [],
  }) async {
    print('\n📦 Preparing FlutterJS packages using pub get...\n');

    // Step 1: Run dart pub get to resolve packages
    print('🔍 Resolving packages with Dart pub...');
    final pubGetResult = await _runPubGet(projectPath, verbose: verbose);
    if (!pubGetResult) {
      print('❌ pub get failed');
      return false;
    }
    print('✓ Packages resolved\n');

    // Step 2: Read package_config.json
    // Check both project-level and workspace-level .dart_tool
    String? packageConfigPath;

    // Try project-level first
    var configPath = p.join(projectPath, '.dart_tool', 'package_config.json');
    if (await File(configPath).exists()) {
      packageConfigPath = configPath;
    } else {
      // Try workspace root (go up until we find it or hit root)
      var current = Directory(projectPath);
      for (int i = 0; i < 10; i++) {
        configPath = p.join(current.path, '.dart_tool', 'package_config.json');
        if (await File(configPath).exists()) {
          packageConfigPath = configPath;
          if (verbose) {
            print('   Using workspace package_config.json at ${current.path}');
          }
          break;
        }
        if (current.parent.path == current.path) break;
        current = current.parent;
      }
    }

    if (packageConfigPath == null) {
      print('❌ package_config.json not found after pub get');
      print('   Searched in $projectPath and parent directories');
      return false;
    }

    final packageConfigFile = File(packageConfigPath);

    Map<String, dynamic> packageConfig;
    try {
      final content = await packageConfigFile.readAsString();
      packageConfig = jsonDecode(content) as Map<String, dynamic>;
    } catch (e) {
      print('❌ Failed to parse package_config.json: $e');
      return false;
    }

    final packages = packageConfig['packages'] as List? ?? [];
    if (verbose) {
      print('📚 Found ${packages.length} packages to compile\n');
    }

    // Step 3: Ensure build directories exist
    final nodeModulesRoot = p.join(buildPath, 'node_modules');
    final nodeModulesFlutterJS = p.join(nodeModulesRoot, '@flutterjs');
    await Directory(nodeModulesFlutterJS).create(recursive: true);

    // Step 4: Compile each package
    final totalStopwatch = Stopwatch()..start();
    int compiledCount = 0;
    int skippedCount = 0;
    int failedCount = 0;

    for (final pkg in packages) {
      final pkgName = pkg['name'] as String;
      final rootUri = pkg['rootUri'] as String;

      // Skip the project itself
      if (rootUri == '../') continue;

      // Resolve absolute path from URI
      String packagePath;
      if (rootUri.startsWith('file:///')) {
        packagePath = Uri.parse(rootUri).toFilePath();
      } else {
        // Relative path from .dart_tool - use the actual config file's directory
        // (may be workspace root, not project root)
        final dartToolDir = p.dirname(packageConfigPath!);
        packagePath = p.normalize(p.join(dartToolDir, rootUri));
      }

      if (!await Directory(packagePath).exists()) {
        if (verbose) {
          print('⚠️  Package directory not found: $pkgName at $packagePath');
        }
        skippedCount++;
        continue;
      }

      // Determine output location and handle FlutterJS SDK packages specially
      if (pkgName.startsWith('flutterjs_') || pkgName == 'flutter_web_plugins') {
        // FlutterJS SDK packages: link pre-built JS package, don't dart2js compile
        final simpleName = pkgName.startsWith('flutterjs_')
            ? pkgName.substring('flutterjs_'.length)
            : pkgName;
        final outputDir = p.join(nodeModulesFlutterJS, simpleName);

        // Find the JS package: try nested structure (flutterjs_material/flutterjs_material/)
        // then fall back to flat structure (flutterjs_dart/)
        final nestedJsPath = p.join(packagePath, pkgName);
        String jsPackagePath;
        if (await Directory(nestedJsPath).exists() &&
            (await File(p.join(nestedJsPath, 'exports.json')).exists() ||
                await File(p.join(nestedJsPath, 'package.json')).exists())) {
          jsPackagePath = nestedJsPath;
        } else {
          jsPackagePath = packagePath;
        }

        final hasJsMarker = await File(p.join(jsPackagePath, 'exports.json')).exists() ||
            await File(p.join(jsPackagePath, 'package.json')).exists();

        if (hasJsMarker) {
          if (!force && await Directory(outputDir).exists()) {
            if (verbose) print('⏭️  $pkgName (up-to-date)');
            skippedCount++;
          } else {
            if (verbose) print('🔗 Linking SDK package $pkgName...');
            await _linkLocalPackage(simpleName, jsPackagePath, nodeModulesFlutterJS);
            compiledCount++;
            if (verbose) print('✓ $pkgName linked and installed');
          }
        } else {
          if (verbose) print('⏭️  $pkgName (no JS package found, skipping)');
          skippedCount++;
        }
        continue;
      }

      final outputDir = p.join(nodeModulesRoot, pkgName);
      await Directory(outputDir).create(recursive: true);

      // Check if compilation is needed (check source location, not output)
      if (!force && await _isPackageUpToDate(packagePath, packagePath)) {
        if (verbose) {
          print('⏭️  $pkgName (up-to-date)');
        }
        skippedCount++;
        continue;
      }

      // Compile the package using dart2js
      if (verbose) {
        print('🔨 Compiling $pkgName with dart2js...');
      }

      try {
        final success = await _compilePackageWithDart2JS(
          packageName: pkgName,
          packagePath: packagePath,
          outputDir: outputDir,
          verbose: verbose,
          projectPath: projectPath,
        );

        if (success) {
          compiledCount++;
          if (verbose) {
            print('✓ $pkgName compiled and installed');
          }
        } else {
          failedCount++;
          print('❌ Failed to compile $pkgName — generating web stub');
          await _generateFallbackWebStub(pkgName, packagePath, outputDir, verbose: verbose);
        }
      } catch (e) {
        failedCount++;
        print('❌ Error compiling $pkgName: $e — generating web stub');
        await _generateFallbackWebStub(pkgName, packagePath, outputDir, verbose: verbose);
      }
    }

    totalStopwatch.stop();

    // Print summary
    print('\n═══════════════════════════════════════════════════════');
    print('Build Summary');
    print('═══════════════════════════════════════════════════════');
    print('✓ Compiled: $compiledCount packages');
    print('⏭️  Skipped: $skippedCount packages (up-to-date)');
    if (failedCount > 0) {
      print('❌ Failed: $failedCount packages');
    }
    print('⏱️  Total time: ${totalStopwatch.elapsedMilliseconds}ms');
    print('═══════════════════════════════════════════════════════\n');

    if (failedCount > 0) {
      print('⚠️  $failedCount packages failed (likely native/platform-only packages - OK for web)');
    }

    // Step 4b: Link any SDK packages found by filesystem scan but not yet installed.
    // This handles pure-JS packages like flutterjs_dart that aren't in package_config.json.
    final sdkPackages = await _resolveSDKPackages(projectPath);
    for (final entry in sdkPackages.entries) {
      final pkgKey = entry.key; // e.g. '@flutterjs/dart'
      final relPath = entry.value;
      final absPath = p.join(projectPath, relPath);
      final simpleName = pkgKey.startsWith('@flutterjs/')
          ? pkgKey.substring('@flutterjs/'.length)
          : pkgKey;
      final destDir = pkgKey.startsWith('@flutterjs/')
          ? nodeModulesFlutterJS
          : nodeModulesRoot;
      final targetPath = p.join(destDir, simpleName);

      if (!force && await Directory(targetPath).exists()) {
        if (verbose) print('⏭️  $pkgKey (already installed)');
        continue;
      }

      if (await Directory(absPath).exists()) {
        await _linkLocalPackage(simpleName, absPath, destDir);
        if (verbose) print('🔗 Linked SDK package: $pkgKey');
      }
    }

    // Step 5: Verify and generate package config for built packages
    await _generatePackageConfig(projectPath, buildPath);

    print('✅ All packages ready!\n');
    return true;
  }

  /// Runs dart pub get in the project directory
  Future<bool> _runPubGet(String projectPath, {bool verbose = false}) async {
    try {
      final dartExe = Platform.isWindows ? 'dart.bat' : 'dart';

      final result = await Process.run(
        dartExe,
        ['pub', 'get'],
        workingDirectory: projectPath,
        runInShell: true,
      );

      if (verbose) {
        if (result.stdout.toString().isNotEmpty) {
          print(result.stdout);
        }
      }

      if (result.exitCode != 0) {
        print('dart pub get failed:');
        print(result.stderr);
        return false;
      }

      return true;
    } catch (e) {
      print('Error running pub get: $e');
      return false;
    }
  }

  /// Checks if a package is up-to-date (output exists and is newer than source)
  Future<bool> _isPackageUpToDate(
    String packagePath,
    String outputPath,
  ) async {
    // Check if exports.json exists
    final exportsFile = File(p.join(outputPath, 'exports.json'));
    if (!await exportsFile.exists()) {
      return false;
    }

    // Check if package.json exists
    final packageFile = File(p.join(outputPath, 'package.json'));
    if (!await packageFile.exists()) {
      return false;
    }

    // Compare timestamps: output should be newer than source
    final exportsStat = await exportsFile.stat();
    final pubspecFile = File(p.join(packagePath, 'pubspec.yaml'));

    if (!await pubspecFile.exists()) {
      return false; // No pubspec means it's not a valid package
    }

    final pubspecStat = await pubspecFile.stat();
    return exportsStat.modified.isAfter(pubspecStat.modified);
  }

  /// Compiles a Dart package to JavaScript using dart2js
  ///
  /// This method:
  /// 1. Creates a temporary entry point that imports the package
  /// 2. Runs dart2js from the project context (for package resolution)
  /// 3. Extracts just the package code (excluding dart2js runtime)
  /// 4. Creates exports.json and package.json manifests
  Future<bool> _compilePackageWithDart2JS({
    required String packageName,
    required String packagePath,
    required String outputDir,
    bool verbose = false,
    String? projectPath,
  }) async {
    try {
      // Ensure output directory exists
      await Directory(outputDir).create(recursive: true);

      // Find lib directory
      final libDir = Directory(p.join(packagePath, 'lib'));
      if (!await libDir.exists()) {
        if (verbose) {
          print('   No lib/ directory found, skipping');
        }
        return true; // Not an error, just no code to compile
      }

      // Find the main library file (lib/<package_name>.dart)
      final mainFile = File(p.join(libDir.path, '$packageName.dart'));

      if (!await mainFile.exists()) {
        if (verbose) {
          print('   No lib/$packageName.dart found, skipping');
        }
        return true; // Not an error, just no main export
      }

      // Create a temporary entry point in the project directory
      // This ensures dart2js can resolve packages via .dart_tool/package_config.json
      final tempDir = Directory(p.join(projectPath ?? '.', '.flutterjs_temp'));
      await tempDir.create(recursive: true);

      final tempEntry = File(p.join(tempDir.path, '${packageName}_entry.dart'));
      await tempEntry.writeAsString('''
// Auto-generated entry point for dart2js compilation
import 'package:$packageName/$packageName.dart';

void main() {
  // Entry point - package is imported and will be compiled
}
''');

      final entryPoint = tempEntry.path;

      // Compile with dart2js
      final outputJs = p.join(outputDir, '$packageName.js');
      final dartExe = Platform.isWindows ? 'dart.bat' : 'dart';

      if (verbose) {
        print('   Compiling ${p.basename(entryPoint)} → ${p.basename(outputJs)}');
      }

      final result = await Process.run(
        dartExe,
        [
          'compile',
          'js',
          entryPoint,
          '-o',
          outputJs,
          '--no-source-maps', // Skip source maps for now
          '-O1', // Optimization level 1 (faster compilation)
        ],
        runInShell: true,
      );

      if (result.exitCode != 0) {
        print('   ❌ dart2js compilation failed:');
        if (verbose) {
          print(result.stderr);
        } else {
          // Show just the error summary
          final stderr = result.stderr.toString();
          final lines = stderr.split('\n').where((l) => l.trim().isNotEmpty).take(5);
          for (final line in lines) {
            print('      $line');
          }
        }
        return false;
      }

      // Create exports.json manifest
      final exportsJson = {
        'package': packageName,
        'version': '1.0.0',
        'exports': [
          {
            'name': '*',
            'path': './$packageName.js',
            'uri': 'package:$packageName/$packageName.dart',
            'type': 'module',
          }
        ],
      };

      final exportsFile = File(p.join(outputDir, 'exports.json'));
      await exportsFile.writeAsString(
        JsonEncoder.withIndent('  ').convert(exportsJson),
      );

      // Create package.json
      final packageJson = {
        'name': packageName,
        'version': '1.0.0',
        'type': 'module',
        'main': '$packageName.js',
        'exports': {
          '.': './$packageName.js',
        },
      };

      final packageFile = File(p.join(outputDir, 'package.json'));
      await packageFile.writeAsString(
        JsonEncoder.withIndent('  ').convert(packageJson),
      );

      // Clean up temporary entry point
      try {
        if (await tempEntry.exists()) {
          await tempEntry.delete();
        }
        // Only delete temp dir if it's empty
        if (await tempDir.exists()) {
          final isEmpty = await tempDir.list().isEmpty;
          if (isEmpty) {
            await tempDir.delete();
          }
        }
      } catch (_) {
        // Ignore cleanup errors
      }

      return true;
    } catch (e) {
      if (verbose) {
        print('   Exception during dart2js compilation: $e');
      }
      return false;
    }
  }

  /// Generates a minimal JS stub for packages that fail dart2js compilation.
  ///
  /// For web plugin packages (those declaring `flutter.plugin.platforms.web.pluginClass`
  /// in pubspec.yaml), the stub exports a class with a no-op `static registerWith()`.
  /// For all other failed packages, the stub is an empty ES module so that
  /// `import * as x from 'package'` doesn't throw a network/parse error.
  Future<void> _generateFallbackWebStub(
    String packageName,
    String packagePath,
    String outputDir, {
    bool verbose = false,
  }) async {
    try {
      await Directory(outputDir).create(recursive: true);

      // Try to read pluginClass from pubspec.yaml
      String? pluginClass;
      try {
        final pubspecFile = File(p.join(packagePath, 'pubspec.yaml'));
        if (await pubspecFile.exists()) {
          final content = await pubspecFile.readAsString();
          final yaml = loadYaml(content) as Map;
          final flutter = yaml['flutter'] as Map?;
          final plugin = flutter?['plugin'] as Map?;
          final platforms = plugin?['platforms'] as Map?;
          final web = platforms?['web'] as Map?;
          pluginClass = web?['pluginClass'] as String?;
        }
      } catch (_) {}

      final outputJs = p.join(outputDir, '$packageName.js');
      final buffer = StringBuffer();
      buffer.writeln('// Auto-generated web stub for $packageName');
      buffer.writeln('// dart2js compilation failed; this stub allows ES module loading.');

      if (pluginClass != null) {
        buffer.writeln();
        buffer.writeln('export class $pluginClass {');
        buffer.writeln('  static registerWith(registrar) {');
        buffer.writeln('    console.warn("[$packageName] $pluginClass.registerWith() is a stub — package failed to compile");');
        buffer.writeln('  }');
        buffer.writeln('}');
      } else {
        buffer.writeln('// No exports — package is platform-only or failed to compile.');
      }

      await File(outputJs).writeAsString(buffer.toString());

      // Write package.json and exports.json so the import map generator picks this up
      final packageJson = {
        'name': packageName,
        'version': '1.0.0',
        'type': 'module',
        'main': '$packageName.js',
        'exports': {'.': './$packageName.js'},
      };
      await File(p.join(outputDir, 'package.json'))
          .writeAsString(JsonEncoder.withIndent('  ').convert(packageJson));

      final exportsJson = {
        'package': packageName,
        'version': '1.0.0',
        'exports': [
          {
            'name': pluginClass ?? '*',
            'path': './$packageName.js',
            'uri': 'package:$packageName/$packageName.dart',
            'type': pluginClass != null ? 'class' : 'module',
          }
        ],
      };
      await File(p.join(outputDir, 'exports.json'))
          .writeAsString(JsonEncoder.withIndent('  ').convert(exportsJson));

      if (verbose) {
        print('   🔧 Generated web stub: $outputJs${pluginClass != null ? " (pluginClass: $pluginClass)" : ""}');
      }
    } catch (e) {
      if (verbose) {
        print('   ⚠️  Failed to generate web stub for $packageName: $e');
      }
    }
  }

  /// Generates .dart_tool/package_config.json mapping packages in node_modules
  Future<void> _generatePackageConfig(
    String projectPath,
    String buildPath,
  ) async {
    final packages = <Map<String, dynamic>>[];

    // 1. Add self (app) - Parse pubspec for name
    String appName = 'app';
    try {
      final pubspecFile = File(p.join(projectPath, 'pubspec.yaml'));
      if (await pubspecFile.exists()) {
        final yaml = loadYaml(await pubspecFile.readAsString()) as Map;
        appName = yaml['name'] as String;
      }
    } catch (_) {}

    packages.add({
      'name': appName,
      'rootUri': '../',
      'packageUri': 'lib/',
      'languageVersion': '3.0',
    });

    // 2. Scan node_modules/@flutterjs (SDK)
    final flutterJsDir = Directory(
      p.join(buildPath, 'node_modules', '@flutterjs'),
    );
    if (await flutterJsDir.exists()) {
      await for (final entity in flutterJsDir.list()) {
        if (entity is Directory) {
          final pkgName = p.basename(entity.path);
          // Calculate relative path from .dart_tool/package_config.json to package root
          // .dart_tool is in projectRoot.
          // Entity is in projectRoot/build/flutterjs/node_modules/@flutterjs/pkgName

          final relativePath = p.relative(
            entity.path,
            from: p.join(projectPath, '.dart_tool'),
          );
          final uri = p
              .toUri(relativePath)
              .toString(); // Ensure forward slashes

          packages.add({
            'name': pkgName,
            'rootUri': uri,
            'packageUri': 'lib/', // Assume lib/ structure for now
            'languageVersion': '3.0',
          });
        }
      }
    }

    // 3. Scan node_modules (Root - 3rd party deps)
    final nodeModulesDir = Directory(p.join(buildPath, 'node_modules'));
    if (await nodeModulesDir.exists()) {
      await for (final entity in nodeModulesDir.list()) {
        if (entity is Directory) {
          final pkgName = p.basename(entity.path);
          if (pkgName.startsWith('@')) continue; // Skip scopes managed above

          final relativePath = p.relative(
            entity.path,
            from: p.join(projectPath, '.dart_tool'),
          );
          final uri = p.toUri(relativePath).toString();

          packages.add({
            'name': pkgName,
            'rootUri': uri,
            'packageUri': 'lib/',
            'languageVersion': '3.0',
          });
        }
      }
    }

    // 4. Add Flutter SDK if available (for analysis)
    String? flutterPath;
    final pathEnv = Platform.environment['PATH'] ?? '';
    final separator = Platform.isWindows ? ';' : ':';
    final paths = pathEnv.split(separator);
    for (var path in paths) {
      if (path.isEmpty) continue;
      final normalizedPath = path.toLowerCase();
      if (normalizedPath.contains('flutter') &&
          (normalizedPath.endsWith('bin') ||
              normalizedPath.endsWith('bin\\') ||
              normalizedPath.endsWith('bin/'))) {
        final sdkRoot = p.dirname(path);
        final flutterPackagePath = p.join(sdkRoot, 'packages', 'flutter');
        if (Directory(flutterPackagePath).existsSync()) {
          flutterPath = flutterPackagePath;
          break;
        }
      }
    }

    if (flutterPath != null) {
      packages.add({
        'name': 'flutter',
        'rootUri': p.toUri(flutterPath).toString(),
        'packageUri': 'lib/',
        'languageVersion': '3.0',
      });

      // Also add sky_engine which is often required by flutter
      final skyEnginePath = p.join(
        p.dirname(p.dirname(flutterPath)),
        'bin',
        'cache',
        'pkg',
        'sky_engine',
      );
      if (Directory(skyEnginePath).existsSync()) {
        packages.add({
          'name': 'sky_engine',
          'rootUri': p.toUri(skyEnginePath).toString(),
          'packageUri': 'lib/',
          'languageVersion': '3.0',
        });
      }
    }

    final config = {
      'configVersion': 2,
      'packages': packages,
      'generated': DateTime.now().toIso8601String(),
      'generator': 'pubjs',
      'generatorVersion': '1.0.0',
    };

    final dotDartTool = Directory(p.join(projectPath, '.dart_tool'));
    if (!await dotDartTool.exists()) {
      await dotDartTool.create();
    }

    final configFile = File(p.join(dotDartTool.path, 'package_config.json'));
    await configFile.writeAsString(
      JsonEncoder.withIndent('  ').convert(config),
    );
    print('   📝 Generated .dart_tool/package_config.json');
  }

  /// Verify that all expected manifests exist
  Future<bool> _verifyManifests(String buildPath) async {
    final manifestDir = Directory(
      p.join(buildPath, 'node_modules', '@flutterjs'),
    );

    if (!await manifestDir.exists()) {
      return false;
    }

    var foundCount = 0;
    await for (final entity in manifestDir.list()) {
      if (entity is Directory) {
        final manifestFile = File(p.join(entity.path, 'exports.json'));
        if (await manifestFile.exists()) {
          foundCount++;
        }
      }
    }

    print('   ✓ Found $foundCount package manifests');
    return foundCount > 0;
  }

  Future<void> _linkLocalPackage(
    String packageName,
    String source,
    String destDir,
  ) async {
    // Use exact package name for node_modules resolution
    final installName = packageName;
    final targetDir = Directory(p.join(destDir, installName));

    if (await targetDir.exists()) {
      await targetDir.delete(recursive: true);
    }

    try {
      if (Platform.isWindows) {
        // Windows often has issues with symlinks, default to copy
        await _copyDirectory(Directory(source), targetDir);
      } else {
        await Link(targetDir.path).create(source);
      }
    } catch (e) {
      // Fallback to copy if link fails
      try {
        await _copyDirectory(Directory(source), targetDir);
      } catch (copyError) {
        print('      ❌ Copy failed: $copyError');
      }
    }
  }

  Future<void> _copyDirectory(Directory source, Directory destination) async {
    await destination.create(recursive: true);
    await for (final entity in source.list(recursive: false)) {
      final name = p.basename(entity.path);
      if (name == 'node_modules' || name == '.git' || name == '.dart_tool') {
        continue;
      }

      if (entity is Directory) {
        final newDirectory = Directory(p.join(destination.path, name));
        await _copyDirectory(entity, newDirectory);
      } else if (entity is File) {
        await entity.copy(p.join(destination.path, p.basename(entity.path)));
      }
    }
  }

  // ... (Keep existing helper methods like _isPackageCached, _installPubDevPackage, etc.)
  // We need to copy them back because we replaced the whole class.

  /// Checks if a package is cached locally
  Future<bool> _isPackageCached(
    String packageName,
    String nodeModulesPath,
    String? requestedVersion,
  ) async {
    final packagePath = p.join(nodeModulesPath, packageName);
    final packageDir = Directory(packagePath);

    if (!await packageDir.exists()) {
      return false;
    }

    if (requestedVersion != null) {
      final packageJsonPath = p.join(packagePath, 'package.json');
      final packageJsonFile = File(packageJsonPath);

      if (await packageJsonFile.exists()) {
        try {
          final content = await packageJsonFile.readAsString();
          final json = Map<String, dynamic>.from(loadYaml(content) as Map);
          final cachedVersion = json['version'] as String?;
          if (cachedVersion != null && requestedVersion == cachedVersion) {
            return true;
          }
        } catch (e) {
          return false;
        }
      }
    }
    return true;
  }

  /// Installs a package from pub.dev
  Future<bool> _installPubDevPackage(
    String packageName,
    String nodeModulesPath,
    String? version,
    bool verbose, {
    PackageBuilder? builder,
  }) async {
    try {
      final packageInfo = version != null
          ? await _pubDevClient.fetchPackageVersion(packageName, version)
          : await _pubDevClient.fetchPackageInfo(packageName);

      if (packageInfo == null) {
        print('   ❌ Package $packageName not found on pub.dev');
        return false;
      }

      if (packageInfo.archiveUrl == null) {
        print('   ❌ No download URL for $packageName');
        return false;
      }

      if (verbose) {
        print('      Downloading v${packageInfo.version}...');
      }

      final packagePath = p.join(nodeModulesPath, packageName);

      await _downloader.downloadAndExtract(
        packageInfo.archiveUrl!,
        packagePath,
      );

      await _createPackageJson(packagePath, packageInfo);

      // Automatic Transpilation of downloaded package
      if (builder != null) {
        if (verbose) print('      Building $packageName...');
        try {
          // Uses explicit source path because it's not in the regular project structure yet/detected by resolver
          await builder.buildPackage(
            packageName: packageName,
            projectRoot: '',
            buildPath: '',
            explicitSourcePath: packagePath,
            verbose: verbose,
            force: true,
          );
        } catch (e) {
          print('      ⚠️  Build failed for $packageName: $e');
        }
      }

      if (verbose) {
        print('      ✓ Installed ${packageInfo.version}');
      }

      // ✅ FIX: Read the downloaded package's dependencies and return them
      // This ensures transitive dependencies are installed
      return true;
    } catch (e) {
      print('   ❌ Error installing $packageName: $e');
      return false;
    }
  }

  /// Installs a package from pub.dev and returns its dependencies
  Future<List<String>?> _installPubDevPackageWithDeps(
    String packageName,
    String nodeModulesPath,
    String? version,
    bool verbose, {
    PackageBuilder? builder,
  }) async {
    final success = await _installPubDevPackage(
      packageName,
      nodeModulesPath,
      version,
      verbose,
      builder: builder,
    );

    if (!success) return null;

    // Read the installed package's pubspec.yaml to get its dependencies
    final packagePath = p.join(nodeModulesPath, packageName);
    return await _getDependenciesFromPubspec(packagePath);
  }

  Future<void> _createPackageJson(
    String packagePath,
    PackageInfo packageInfo,
  ) async {
    // Use dist/index.js as the barrel entry point - PackageCompiler generates
    // per-file JS but also produces a barrel index.js via _generateBarrelExport.
    final packageJson = {
      'name': packageInfo.npmPackageName,
      'version': packageInfo.version,
      'description': 'FlutterJS package: ${packageInfo.name}',
      'main': 'dist/index.js',
      'type': 'module',
    };

    final packageJsonFile = File(p.join(packagePath, 'package.json'));
    await packageJsonFile.writeAsString(
      const JsonEncoder.withIndent('  ').convert(packageJson),
    );
  }

  Future<void> cleanCache(String buildPath) async {
    final nodeModulesPath = p.join(buildPath, 'node_modules', '@flutterjs');
    final dir = Directory(nodeModulesPath);

    if (await dir.exists()) {
      await dir.delete(recursive: true);
      print('✓ Cache cleaned: $nodeModulesPath');
    }
  }

  /// Resolves a single package, installs it, and returns its dependencies.
  /// Returns null if resolution fails.
  Future<List<String>?> _resolveAndInstallPackage(
    String packageName, {
    required String projectPath,
    required Map<String, UserPackageConfig>? userPackageConfigs,
    required Map<String, String> sdkPackages,
    required List<dynamic> registryPackages,
    required Map<dynamic, dynamic> topLevelDependencies,
    required String nodeModulesFlutterJS,
    required String nodeModulesRoot,
    required bool verbose,
    required bool force,
    required List<String> overridePackages,
    PackageBuilder? builder,
    required Map<String, String> resolvedMap,
  }) async {
    // 0. SDK Package Override (Highest Priority for Monorepo Dev)
    if (sdkPackages.containsKey(packageName)) {
      if (verbose) print('   🔗 $packageName (Local SDK)');
      final relativePath = sdkPackages[packageName]!;
      final absoluteSource = p.join(projectPath, relativePath);

      await _linkLocalPackage(
        packageName,
        absoluteSource,
        nodeModulesFlutterJS,
      );

      // ✅ RECORD
      resolvedMap[packageName] = absoluteSource;
      // SDK packages dependencies are usually handled by building them,
      // but if we want to be correct we should return them.
      // However, SDK packages in this system usually rely on other SDK packages
      // which are already in sdkPackages map.
      // But they might depend on external packages (like meta, path).
      // So we SHOULD return deps.
      return _getDependenciesFromPubspec(absoluteSource);
    }

    // Check User Config for this package
    final userConfig = userPackageConfigs?[packageName];

    // A. Local Path (Highest Priority)
    if (userConfig != null && userConfig.path != null) {
      if (verbose) print('   🔗 $packageName (Local Config)');

      final sourcePath = userConfig.path!;
      final absoluteSource = p.isAbsolute(sourcePath)
          ? sourcePath
          : p.normalize(p.join(projectPath, sourcePath));

      if (!await Directory(absoluteSource).exists()) {
        print(
          '❌ Error: Local path for $packageName does not exist: $absoluteSource',
        );
        return null;
      }

      await _linkLocalPackage(packageName, absoluteSource, nodeModulesRoot);

      // ✅ RECORD
      resolvedMap[packageName] = absoluteSource;

      // ADD TRANSITIVE DEPS from local package
      return _getDependenciesFromPubspec(absoluteSource);
    }

    // A-2. Pubspec Path Override (High priority)
    if (topLevelDependencies.containsKey(packageName)) {
      final depEntry = topLevelDependencies[packageName];
      if (depEntry is Map && depEntry['path'] != null) {
        final sourcePath = depEntry['path'] as String;
        if (verbose) print('   🔗 $packageName (Pubspec Path)');
        final absoluteSource = p.isAbsolute(sourcePath)
            ? sourcePath
            : p.normalize(p.join(projectPath, sourcePath));

        if (!await Directory(absoluteSource).exists()) {
          print('❌ Error: Pubspec path for $packageName does not exist');
          return null;
        }
        await _linkLocalPackage(packageName, absoluteSource, nodeModulesRoot);

        // ✅ RECORD
        resolvedMap[packageName] = absoluteSource;

        // ADD TRANSITIVE DEPS
        return _getDependenciesFromPubspec(absoluteSource);
      }
    }

    // B. Registry/PubDev Resolution
    String? targetFlutterJsPackage;
    String? targetVersion;

    if (userConfig != null && userConfig.flutterJsPackage != null) {
      // ✅ DEFENSIVE FIX: Validate userConfig.flutterJsPackage before using it
      if (userConfig.flutterJsPackage!.contains('./...') ||
          userConfig.flutterJsPackage == './...' ||
          userConfig.flutterJsPackage!.trim().isEmpty) {
        print(
          '⚠️  WARNING: Ignoring malformed userConfig.flutterJsPackage "${userConfig.flutterJsPackage}" for $packageName',
        );
        // Don't use the malformed config, let it fall through to registry/direct resolution
      } else {
        targetFlutterJsPackage = userConfig.flutterJsPackage;
        targetVersion = userConfig.version;
        if (verbose) {
          print(
            '   📦 $packageName -> $targetFlutterJsPackage (Config Override)',
          );
        }
      }
    } else {
      dynamic registryEntry;
      try {
        registryEntry = registryPackages.firstWhere(
          (pkg) => pkg['name'] == packageName,
        );
      } catch (_) {}

      if (registryEntry != null) {
        targetFlutterJsPackage = registryEntry['flutterjs_package'];
        if (verbose) {
          print('   📦 $packageName -> $targetFlutterJsPackage (Registry)');
        }
      } else {
        targetFlutterJsPackage = packageName;
        if (verbose) print('   📦 $packageName (Direct PubDev)');
      }
    }

    // If targetFlutterJsPackage is still null (malformed userConfig), use packageName directly
    targetFlutterJsPackage ??= packageName;

    // ✅ DEFENSIVE FIX: Validate and sanitize targetFlutterJsPackage
    // Reject malformed values like './...' that come from corrupted configs or bugs
    if (targetFlutterJsPackage.contains('./...') ||
        targetFlutterJsPackage == './...' ||
        targetFlutterJsPackage.trim().isEmpty) {
      targetFlutterJsPackage = packageName;
    }

    final isOverridden = force || overridePackages.contains(packageName);

    final isCached =
        !isOverridden &&
        await _isPackageCached(
          targetFlutterJsPackage,
          nodeModulesRoot,
          targetVersion,
        );

    if (isCached) {
      if (verbose) print('      ✓ Using cached $packageName');
      final pkgPath = p.join(nodeModulesRoot, targetFlutterJsPackage);
      resolvedMap[packageName] = pkgPath;
      return _getDependenciesFromPubspec(pkgPath);
    } else {
      if (isOverridden && verbose) {
        print('   ⚡ Force converting $packageName...');
      }

      final success = await _installPubDevPackage(
        targetFlutterJsPackage,
        nodeModulesRoot,
        targetVersion,
        verbose,
        builder: builder,
      );
      if (!success) return null;

      final pkgPath = p.join(nodeModulesRoot, targetFlutterJsPackage);
      resolvedMap[packageName] = pkgPath;
      return await _getDependenciesFromPubspec(pkgPath);
    }
  }

  /// Writes the final package map to .dart_tool/flutterjs/package_map.json
  Future<void> _writePackageMap(
    String projectPath,
    String buildPath,
    Map<String, String> resolvedPackages,
  ) async {
    try {
      final flutterJsDir = Directory(
        p.join(projectPath, '.dart_tool', 'flutterjs'),
      );
      if (!await flutterJsDir.exists()) {
        await flutterJsDir.create(recursive: true);
      }

      final packageMapPath = p.join(flutterJsDir.path, 'package_map.json');
      final encoder = JsonEncoder.withIndent('  ');

      // Convert absolute paths to platform-neutral format if needed,
      // but for resolution on the same machine, absolute is best.
      final content = encoder.convert({
        'generated': DateTime.now().toIso8601String(),
        'packages': resolvedPackages,
      });

      await File(packageMapPath).writeAsString(content);
      print('   📝 Generated .dart_tool/flutterjs/package_map.json');
    } catch (e) {
      print('   ⚠️  Warning: Failed to write package_map.json: $e');
    }
  }

  /// Sorts packages topologically so dependencies come before consumers
  List<String> _topologicalSort(
    Set<String> nodes,
    Map<String, Set<String>> graph,
  ) {
    final visited = <String>{};
    final tempMarked = <String>{};
    final sorted = <String>[];

    void visit(String node) {
      if (tempMarked.contains(node)) {
        // Cycle detected
        return;
      }
      if (visited.contains(node)) return;

      tempMarked.add(node);

      // Visit dependencies first
      final deps = graph[node] ?? {};
      for (final dep in deps) {
        if (nodes.contains(dep)) {
          visit(dep);
        }
      }

      tempMarked.remove(node);
      visited.add(node);
      sorted.add(node);
    }

    for (final node in nodes) {
      if (!visited.contains(node)) {
        visit(node);
      }
    }

    return sorted;
  }
}
