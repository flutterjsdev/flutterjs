import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:yaml/yaml.dart';
import 'pub_dev_client.dart';
import 'npm_client.dart';
import 'package_downloader.dart';
import 'model/package_info.dart';
import 'config_resolver.dart';

/// Runtime package manager for FlutterJS
///
/// Handles package resolution, caching, and downloading from pub.dev or npm
/// at runtime. Stores packages in project-level directory:
/// `build/flutterjs/node_modules/@flutterjs/`
class RuntimePackageManager {
  final PubDevClient _pubDevClient;
  final NpmClient _npmClient;
  final PackageDownloader _downloader;
  final ConfigResolver _configResolver;

  RuntimePackageManager({
    PubDevClient? pubDevClient,
    NpmClient? npmClient,
    PackageDownloader? downloader,
    ConfigResolver? configResolver,
  }) : _pubDevClient = pubDevClient ?? PubDevClient(),
       _npmClient = npmClient ?? NpmClient(),
       _downloader = downloader ?? PackageDownloader(),
       _configResolver = configResolver ?? ConfigResolver();

  /// Resolves and installs all dependencies for a FlutterJS project
  ///
  /// Reads pubspec.yaml, merges with flutterjs.config.js overrides,
  /// and installs packages to build/flutterjs/node_modules/@flutterjs/
  ///
  /// [projectPath] - Root directory of the FlutterJS project
  /// [buildPath] - Build directory (usually projectPath/build/flutterjs)
  /// [verbose] - Enable verbose logging
  Future<bool> resolveProjectDependencies({
    required String projectPath,
    required String buildPath,
    bool verbose = false,
  }) async {
    if (verbose) {
      print('🔍 Resolving FlutterJS project dependencies...');
      print('   Project: $projectPath');
      print('   Build: $buildPath');
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

      if (verbose) {
        print('   Found ${dependencies.length} dependencies in pubspec.yaml');
      }

      // 2. Read flutterjs.config.js overrides
      final configPath = p.join(buildPath, 'flutterjs.config.js');
      final configOverrides = await _configResolver.resolvePubDevDependencies(
        configPath,
      );

      if (configOverrides.isNotEmpty && verbose) {
        print('   Found ${configOverrides.length} version overrides in config');
      }

      // 3. Resolve each dependency
      final nodeModulesPath = p.join(buildPath, 'node_modules', '@flutterjs');
      await Directory(nodeModulesPath).create(recursive: true);

      int installedCount = 0;
      int cachedCount = 0;

      for (final entry in dependencies.entries) {
        final packageName = entry.key as String;

        // Skip Flutter SDK dependencies
        if (entry.value is Map && (entry.value as Map)['sdk'] != null) {
          continue;
        }

        // Check for version override in config
        final version = configOverrides[packageName];

        // Check if this is an external package (has flutterjs metadata)
        final isExternal = await _isExternalPackage(packageName, projectPath);

        if (isExternal) {
          // External package - fetch from npm
          if (verbose) {
            print('   📦 $packageName (external, from npm)');
          }

          final success = await _installExternalPackage(
            packageName,
            nodeModulesPath,
            version,
            verbose,
          );

          if (success) {
            installedCount++;
          }
        } else {
          // Standard pub.dev package
          if (verbose) {
            print('   📦 $packageName');
          }

          final isCached = await _isPackageCached(
            packageName,
            nodeModulesPath,
            version,
          );

          if (isCached) {
            if (verbose) {
              print('      ✓ Using cached version');
            }
            cachedCount++;
          } else {
            final success = await _installPubDevPackage(
              packageName,
              nodeModulesPath,
              version,
              verbose,
            );

            if (success) {
              installedCount++;
            }
          }
        }
      }

      if (verbose) {
        print('✅ Dependency resolution complete');
        print('   Installed: $installedCount');
        print('   Cached: $cachedCount');
      }

      return true;
    } catch (e) {
      print('❌ Error resolving dependencies: $e');
      return false;
    }
  }

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

    // Check version in package.json if version specified
    if (requestedVersion != null) {
      final packageJsonPath = p.join(packagePath, 'package.json');
      final packageJsonFile = File(packageJsonPath);

      if (await packageJsonFile.exists()) {
        try {
          final content = await packageJsonFile.readAsString();
          final json = Map<String, dynamic>.from(loadYaml(content) as Map);
          final cachedVersion = json['version'] as String?;

          // Simple version match (can be enhanced with semver later)
          if (cachedVersion != null && requestedVersion == cachedVersion) {
            return true;
          }
        } catch (e) {
          // If we can't read/parse, treat as not cached
          return false;
        }
      }
    }

    // If no version specified, just check existence
    return true;
  }

  /// Installs a package from pub.dev
  Future<bool> _installPubDevPackage(
    String packageName,
    String nodeModulesPath,
    String? version,
    bool verbose,
  ) async {
    try {
      // Fetch package info
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

      // Download and extract
      final packagePath = p.join(nodeModulesPath, packageName);
      await _downloader.downloadAndExtract(
        packageInfo.archiveUrl!,
        packagePath,
      );

      // Create package.json for compatibility
      await _createPackageJson(packagePath, packageInfo);

      if (verbose) {
        print('      ✓ Installed ${packageInfo.version}');
      }

      return true;
    } catch (e) {
      print('   ❌ Error installing $packageName: $e');
      return false;
    }
  }

  /// Installs an external package from npm
  Future<bool> _installExternalPackage(
    String packageName,
    String nodeModulesPath,
    String? version,
    bool verbose,
  ) async {
    // For external packages, use npm to install
    // This will be implemented when we have the npm integration ready
    if (verbose) {
      print('      External package installation not yet implemented');
    }
    return false;
  }

  /// Checks if a package is external (has flutterjs metadata in pubspec)
  Future<bool> _isExternalPackage(
    String packageName,
    String projectPath,
  ) async {
    // Check if package pubspec has flutterjs.npm_package field
    // This would require fetching the package pubspec from pub.dev
    // For now, return false (treat all as standard packages)
    return false;
  }

  /// Creates a package.json file for a pub.dev package
  Future<void> _createPackageJson(
    String packagePath,
    PackageInfo packageInfo,
  ) async {
    final packageJson = {
      'name': packageInfo.npmPackageName,
      'version': packageInfo.version,
      'description': 'FlutterJS package: ${packageInfo.name}',
      'main': 'lib/index.js',
      'type': 'module',
    };

    final packageJsonFile = File(p.join(packagePath, 'package.json'));
    await packageJsonFile.writeAsString(
      const JsonEncoder.withIndent('  ').convert(packageJson),
    );
  }

  /// Cleans the package cache
  Future<void> cleanCache(String buildPath) async {
    final nodeModulesPath = p.join(buildPath, 'node_modules', '@flutterjs');
    final dir = Directory(nodeModulesPath);

    if (await dir.exists()) {
      await dir.delete(recursive: true);
      print('✓ Cache cleaned: $nodeModulesPath');
    }
  }
}
