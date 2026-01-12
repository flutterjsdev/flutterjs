/// Represents information about a package in the registry.
class PackageInfo {
  final String name; // Original package name
  final String
  npmPackageName; // npm scoped name (@flutterjs/name) - for compatibility
  final String version; // Version
  final String? tarballUrl; // npm tarball download URL (deprecated)
  final String? archiveUrl; // pub.dev archive URL

  PackageInfo({
    required this.name,
    required this.npmPackageName,
    required this.version,
    this.tarballUrl,
    this.archiveUrl,
  });

  /// Create PackageInfo from pub.dev API JSON response
  ///
  /// Parses the latest version information from pub.dev API.
  ///
  /// Example JSON structure:
  /// ```json
  /// {
  ///   "name": "http",
  ///   "latest": {
  ///     "version": "1.1.0",
  ///     "archive_url": "https://pub.dartlang.org/packages/http/versions/1.1.0.tar.gz",
  ///     "pubspec": { ... }
  ///   }
  /// }
  /// ```
  factory PackageInfo.fromPubDevJson(
    Map<String, dynamic> json,
    String originalName,
  ) {
    // Get latest version info
    final latest = json['latest'] as Map<String, dynamic>?;
    final latestVersion = latest?['version'] as String? ?? '1.0.0';
    final archiveUrl = latest?['archive_url'] as String?;

    return PackageInfo(
      name: originalName,
      npmPackageName: '@flutterjs/$originalName', // Convention
      version: latestVersion,
      archiveUrl: archiveUrl,
    );
  }

  /// Create PackageInfo from pub.dev version-specific JSON
  ///
  /// Parses a specific version entry from the versions list.
  ///
  /// Example JSON structure:
  /// ```json
  /// {
  ///   "version": "1.1.0",
  ///   "archive_url": "https://pub.dartlang.org/packages/http/versions/1.1.0.tar.gz",
  ///   "pubspec": { ... }
  /// }
  /// ```
  factory PackageInfo.fromPubDevVersionJson(
    Map<String, dynamic> json,
    String originalName,
  ) {
    final version = json['version'] as String;
    final archiveUrl = json['archive_url'] as String?;

    return PackageInfo(
      name: originalName,
      npmPackageName: '@flutterjs/$originalName',
      version: version,
      archiveUrl: archiveUrl,
    );
  }

  /// Create PackageInfo from npm registry JSON response
  factory PackageInfo.fromNpmJson(
    Map<String, dynamic> json,
    String originalName,
  ) {
    final npmName = json['name'] as String;

    // Get latest version from dist-tags
    final distTags = json['dist-tags'] as Map<String, dynamic>?;
    final latestVersion = distTags?['latest'] as String? ?? '1.0.0';

    // Get tarball URL from latest version
    String? tarball;
    final versions = json['versions'] as Map<String, dynamic>?;
    if (versions != null && versions.containsKey(latestVersion)) {
      final versionInfo = versions[latestVersion] as Map<String, dynamic>;
      final dist = versionInfo['dist'] as Map<String, dynamic>?;
      tarball = dist?['tarball'] as String?;
    }

    return PackageInfo(
      name: originalName,
      npmPackageName: npmName,
      version: latestVersion,
      tarballUrl: tarball,
    );
  }

  /// Legacy support for old registry format (deprecated)
  @Deprecated('Use fromNpmJson or fromPubDevJson instead')
  factory PackageInfo.fromJson(Map<String, dynamic> json) {
    final name = json['name'] as String;
    final flutterjsMapping =
        json['flutterjs_mapping'] as String? ?? '@flutterjs/$name';
    final version = json['version'] as String? ?? '1.0.0';

    return PackageInfo(
      name: name,
      npmPackageName: flutterjsMapping,
      version: version,
    );
  }

  /// Get the download URL (prefers archiveUrl over tarballUrl)
  String? get downloadUrl => archiveUrl ?? tarballUrl;
}

class PackageOption {
  final String packageName;
  final String? description;

  PackageOption({required this.packageName, this.description});

  factory PackageOption.fromJson(Map<String, dynamic> json) {
    return PackageOption(
      packageName: json['package'] as String,
      description: json['description'] as String?,
    );
  }
}
