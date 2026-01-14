import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart' as p;
import 'package:yaml/yaml.dart';
import 'pub_dev_client.dart';
import 'npm_client.dart';
import 'package_downloader.dart';
import 'model/package_info.dart';
import 'config_resolver.dart';
import 'config_generator.dart';
import 'flutterjs_registry_client.dart';

/// Runtime package manager for FlutterJS
///
/// Handles package resolution, caching, and downloading from pub.dev or npm
/// at runtime. Enforces strict registry checking.
class RuntimePackageManager {
  final PubDevClient _pubDevClient;
  final NpmClient _npmClient;
  final PackageDownloader _downloader;
  final ConfigResolver _configResolver;
  final ConfigGenerator _configGenerator;
  final FlutterJSRegistryClient _registryClient;

  RuntimePackageManager({
    PubDevClient? pubDevClient,
    NpmClient? npmClient,
    PackageDownloader? downloader,
    ConfigResolver? configResolver,
    ConfigGenerator? configGenerator,
    FlutterJSRegistryClient? registryClient,
  }) : _pubDevClient = pubDevClient ?? PubDevClient(),
       _npmClient = npmClient ?? NpmClient(),
       _downloader = downloader ?? PackageDownloader(),
       _configResolver = configResolver ?? ConfigResolver(),
       _configGenerator = configGenerator ?? ConfigGenerator(),
       _registryClient = registryClient ?? FlutterJSRegistryClient();

  /// Resolves and installs all dependencies for a FlutterJS project
  Future<bool> resolveProjectDependencies({
    required String projectPath,
    required String buildPath,
    bool verbose = false,
  }) async {
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
      final nodeModulesFlutterJS = p.join(
        buildPath,
        'node_modules',
        '@flutterjs',
      );
      await Directory(nodeModulesFlutterJS).create(recursive: true);

      // Pre-fetch registry to check for all packages
      final registry = await _registryClient.fetchRegistry();
      if (registry == null) {
        print(
          '⚠️  Warning: Could not fetch FlutterJS Registry. Only local paths will work.',
        );
      }
      final registryPackages = (registry?['packages'] as List?) ?? [];

      bool configurationNeeded = false;

      for (final entry in dependencies.entries) {
        final String packageName = entry.key as String;

        // Skip Flutter SDK
        if (entry.value is Map && (entry.value as Map)['sdk'] != null) continue;
        if (packageName == 'flutter') continue;

        // Check User Config for this package
        final userConfig = userPackageConfigs[packageName];

        // A. Local Path (Highest Priority)
        // defined in config as { path: '...' }
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
            return false;
          }

          await _linkLocalPackage(
            packageName,
            absoluteSource,
            nodeModulesFlutterJS,
          );
          continue;
        }

        // B. Registry Override (from Config) OR Registry Lookup (Default)
        // If config has string 'flutterjs_pkg:ver', use that.
        // Else check registry.json for mapping.

        String? targetFlutterJsPackage;
        String? targetVersion;

        if (userConfig != null && userConfig.flutterJsPackage != null) {
          // Explicit override from config
          targetFlutterJsPackage = userConfig.flutterJsPackage;
          targetVersion = userConfig.version; // Might be null
          if (verbose)
            print(
              '   📦 $packageName -> $targetFlutterJsPackage (Config Override)',
            );
        } else {
          // Registry Lookup
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
          }
        }

        // Proceed to install if we have a target name
        if (targetFlutterJsPackage != null) {
          final isCached = await _isPackageCached(
            targetFlutterJsPackage,
            nodeModulesFlutterJS,
            targetVersion,
          );

          if (isCached) {
            if (verbose) print('      ✓ Using cached');
          } else {
            final success = await _installPubDevPackage(
              targetFlutterJsPackage,
              nodeModulesFlutterJS,
              targetVersion,
              verbose,
            );
            if (!success) return false;
          }
          continue;
        }

        // C. FALLBACK: Unknown & Unconfigured -> FAIL
        // If the key exists in config but value is null, it means user hasn't configured it yet.
        print('\n❌ MISSING CONFIGURATION: "$packageName"');
        configurationNeeded = true;
      }

      if (configurationNeeded) {
        final configFile = File(configPath);
        if (!await configFile.exists()) {
          print('\n🛠️  Creating default flutterjs.config.js...');
          // Pass full dependencies map to generator
          await _configGenerator.createDefaultConfig(projectPath, dependencies);
          print(
            '👉 Please edit flutterjs.config.js to configure "$dependencies".',
          );
        } else {
          print(
            '👉 Please update flutterjs.config.js for the missing packages.',
          );
        }
        return false;
      }

      return true;
    } catch (e) {
      print('❌ Error resolving dependencies: $e');
      return false;
    }
  }

  Future<void> _linkLocalPackage(
    String packageName,
    String source,
    String destDir,
  ) async {
    // For now, implementing copy to avoid symlink permission issues on Windows
    final target = p.join(
      destDir,
      'flutterjs_$packageName',
    ); // Convention? Or just name?
    // Actually, if it's local, we might want to keep the name generic or prefixed.
    // Let's map it to 'flutterjs_$packageName' to match the system,
    // OR just use the packageName if the user imported it as such?
    // FlutterJS logic usually imports 'package:flutterjs_http/...'
    // But wait, the Dart import is 'package:http'.
    // The rewriting logic expects 'package:flutterjs_http'.
    // So we should install it as 'flutterjs_$packageName' if possible,
    // or relying on the compiler to handle the name.
    // For safety, let's install it as 'flutterjs_$packageName'.

    final installName = 'flutterjs_$packageName';
    final targetDir = Directory(p.join(destDir, installName));

    if (await targetDir.exists()) {
      await targetDir.delete(recursive: true);
    }

    // Simple copy (inefficient but safe)
    // In real dev, we want symlinks.
    // Try creating a junction/symlink first?
    try {
      await Link(targetDir.path).create(source);
    } catch (e) {
      // Fallback to copy if link fails
      await _copyDirectory(Directory(source), targetDir);
    }
  }

  Future<void> _copyDirectory(Directory source, Directory destination) async {
    await destination.create(recursive: true);
    await for (final entity in source.list(recursive: false)) {
      if (entity is Directory) {
        final newDirectory = Directory(
          p.join(destination.path, p.basename(entity.path)),
        );
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
    bool verbose,
  ) async {
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
      'main': 'lib/index.js',
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
}
