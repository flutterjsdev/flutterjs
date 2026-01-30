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
    bool verbose = false,
  }) async {
    final resolvedPaths = <String, String>{};

    if (verbose) {
      print('📦 Resolving ${packageNames.length} packages...');
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

      // If packageNames is empty, resolve ALL SDK packages
      if (packageNames.isEmpty) {
        resolvedPaths.addAll(sdkPackages);
        if (verbose) {
          for (final pkg in sdkPackages.keys) {
            print('   ✔ $pkg (SDK)');
          }
        }
      } else {
        // Only resolve requested SDK packages
        for (final pkg in packageNames) {
          if (pkg.startsWith('@flutterjs/') && sdkPackages.containsKey(pkg)) {
            resolvedPaths[pkg] = sdkPackages[pkg]!;
            if (verbose) print('   ✔ $pkg (SDK)');
          }
        }
      }
    }

    // 4. Resolve each package
    for (final packageName in packageNames) {
      // Skip if already resolved (SDK)
      if (resolvedPaths.containsKey(packageName)) continue;

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
        // For now, indicate it should be downloaded
        // Registry packages (non-SDK) go to root node_modules
        resolvedPaths[packageName] = 'node_modules/$targetFlutterJsPackage';
        if (verbose)
          print('   ✔ $packageName -> $targetFlutterJsPackage (registry)');
      } else {
        if (verbose) print('   ⚠ $packageName (not found in registry)');
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

            // Check if it's a flutterjs_* package (but not engine or tools)
            if (dirName.startsWith('flutterjs_') &&
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
                }
              }

              // 2. Try flat package (new): packages/flutterjs_dart/
              if (!found) {
                final pubspecPath = p.join(entity.path, 'pubspec.yaml');
                if (await File(pubspecPath).exists()) {
                  // Extract package name: flutterjs_dart -> dart
                  final pkgName = dirName.substring('flutterjs_'.length);
                  final relativePath = p.relative(
                    entity.path,
                    from: projectPath,
                  );
                  sdkPackages['@flutterjs/$pkgName'] = relativePath;
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
    final totalStopwatch = Stopwatch()..start();

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
        if (preResolvedSdkPackages == null)
          print('   💡 Found ${sdkPackages.length} local SDK packages');
      }

      // 🎁 NEW: Explicitly link ALL SDK packages found in monorepo
      // This ensures scoped packages (e.g. @flutterjs/runtime) are available in node_modules
      for (final sdkPkg in sdkPackages.entries) {
        final pkgName = sdkPkg.key;
        final relPath = sdkPkg.value;
        final absPath = p.join(projectPath, relPath);

        // If package is scoped (e.g. @flutterjs/runtime), strip scope because destDir already includes @flutterjs
        var linkName = pkgName;
        if (linkName.startsWith('@flutterjs/')) {
          linkName = linkName.substring('@flutterjs/'.length);
        }

        if (verbose)
          print('   🔗 Pre-linking SDK package: $pkgName -> $linkName');
        await _linkLocalPackage(linkName, absPath, nodeModulesFlutterJS);
      }

      final queue = dependencies.keys.map((k) => k.toString()).toList();
      final processed = <String>{};

      var currentBatch = List<String>.from(queue);

      while (currentBatch.isNotEmpty) {
        final nextBatch = <String>{};
        final futures = <Future<List<String>?>>[];

        for (final pkg in currentBatch) {
          if (processed.contains(pkg)) continue;
          processed.add(pkg);

          if (pkg == 'flutter' || pkg == 'flutter_web_plugins') continue;

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
              overridePackages: overridePackages,
              builder: builder,
            ),
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

        // We need to build packages that are in node_modules now.
        // We can get them from processed list?
        // processed contains ALL dependencies found.

        final buildFutures = <Future>[];
        final packagesToBuild = <String>[];

        for (final pkgName in processed) {
          // Skip SDK packages as they are already built
          if (sdkPackages.containsKey(pkgName) ||
              pkgName.startsWith('@flutterjs/'))
            continue;
          if (pkgName == 'flutter' || pkgName == 'flutter_web_plugins')
            continue;

          packagesToBuild.add(pkgName);
        }

        // Show total package count
        final totalPackages = packagesToBuild.length;
        if (totalPackages > 0) {
          print(
            '\n📦 Building $totalPackages package${totalPackages == 1 ? '' : 's'}...\n',
          );
        }

        var completedPackages = 0;
        final concurrency = 4; // Build 4 packages in parallel

        // Split packages into batches for parallel processing
        for (var i = 0; i < packagesToBuild.length; i += concurrency) {
          final batchEnd = (i + concurrency < packagesToBuild.length)
              ? i + concurrency
              : packagesToBuild.length;
          final batch = packagesToBuild.sublist(i, batchEnd);

          // Show which packages are being built
          if (batch.length > 1) {
            print('🔨 Building: ${batch.join(', ')}');
          }

          // Build packages in parallel
          final futures = batch.map((pkgName) async {
            final sw = Stopwatch()..start();
            await builder.buildPackage(
              packageName: pkgName,
              projectRoot: projectPath,
              buildPath: buildPath,
              verbose: verbose,
            );
            sw.stop();
            
            // Thread-safe increment and display
            completedPackages++;
            final percentage =
                (completedPackages / totalPackages * 100).round();
            final duration = (sw.elapsedMilliseconds / 1000).toStringAsFixed(1);
            print(
              '[$completedPackages/$totalPackages] ($percentage%) ✓ $pkgName (${duration}s)',
            );
          }).toList();

          await Future.wait(futures);
        }

        if (totalPackages > 0) {
          print('\n✅ All packages built successfully!\n');
        }
      }

      totalStopwatch.stop();
      final totalSeconds = (totalStopwatch.elapsedMilliseconds / 1000)
          .toStringAsFixed(1);
      print('⏱️  Total time: ${totalSeconds}s\n');

      return true;
    } catch (e) {
      print('❌ Error resolving dependencies: $e');
      return false;
    }
  }

  /// Helper to read dependencies from a package's pubspec.yaml
  Future<List<String>> _getDependenciesFromPubspec(String packagePath) async {
    try {
      final pubspecPath = p.join(packagePath, 'pubspec.yaml');
      final file = File(pubspecPath);
      if (!await file.exists()) return [];

      final content = await file.readAsString();
      final yaml = loadYaml(content) as Map;
      final deps = yaml['dependencies'] as Map? ?? {};

      return deps.keys
          .map((k) => k.toString())
          .where((d) => d != 'flutter')
          .where((d) => !_isNonWebPlatformPackage(d))
          .toList();
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

    // PHASE 2: Build SDK packages (Build FIRST so artifacts exist when copied)
    if (verbose)
      print(
        '\nPhase 1: Building SDK packages...',
      ); // Renamed to Phase 1 in log logic

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
      if (verbose)
        print('❌ Build failed with ${buildStats.failedCount} errors');
      return false;
    }

    // PHASE 1: Resolve Dependencies (Link/Copy built packages)
    if (verbose)
      print('\nPhase 2: Resolving dependencies...'); // Renamed to Phase 2

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
      if (name == 'node_modules' || name == '.git' || name == '.dart_tool')
        continue;

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

      return true;
    } catch (e) {
      print('   ❌ Error installing $packageName: $e');
      return false;
    }
  }

  Future<void> _createPackageJson(
    String packagePath,
    PackageInfo packageInfo,
  ) async {
    final packageJson = {
      'name': packageInfo.npmPackageName,
      'version': packageInfo.version,
      'description': 'FlutterJS package: ${packageInfo.name}',
      'main': 'dist/${packageInfo.name}.js',
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

        // ADD TRANSITIVE DEPS
        return _getDependenciesFromPubspec(absoluteSource);
      }
    }

    // B. Registry/PubDev Resolution
    String? targetFlutterJsPackage;
    String? targetVersion;

    if (userConfig != null && userConfig.flutterJsPackage != null) {
      targetFlutterJsPackage = userConfig.flutterJsPackage;
      targetVersion = userConfig.version;
      if (verbose)
        print(
          '   📦 $packageName -> $targetFlutterJsPackage (Config Override)',
        );
    } else {
      dynamic registryEntry;
      try {
        registryEntry = registryPackages.firstWhere(
          (pkg) => pkg['name'] == packageName,
        );
      } catch (_) {}

      if (registryEntry != null) {
        targetFlutterJsPackage = registryEntry['flutterjs_package'];
        if (verbose)
          print('   📦 $packageName -> $targetFlutterJsPackage (Registry)');
      } else {
        // Fallback: Assume direct pub.dev package
        targetFlutterJsPackage = packageName;
        if (verbose) print('   📦 $packageName (Direct PubDev)');
      }
    }

    if (targetFlutterJsPackage != null) {
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
        // ADD TRANSITIVE DEPS from cached package
        final pkgPath = p.join(nodeModulesRoot, targetFlutterJsPackage);
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

        // ADD TRANSITIVE DEPS from newly installed package
        final pkgPath = p.join(nodeModulesRoot, targetFlutterJsPackage);
        return _getDependenciesFromPubspec(pkgPath);
      }
    }

    print('\n❌ MISSING CONFIGURATION: "$packageName"');
    return null;
  }
}
