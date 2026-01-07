/// Represents information about a package in the registry.
class PackageInfo {
  final String name; // Original pubspec name
  final String npmPackageName; // npm scoped name (@flutterjs/name)
  final String version; // Latest version
  final String? tarballUrl; // npm tarball download URL

  PackageInfo({
    required this.name,
    required this.npmPackageName,
    required this.version,
    this.tarballUrl,
  });

  /// Create PackageInfo from npm registry JSON response
  factory PackageInfo.fromNpmJson(
      Map<String, dynamic> json, String originalName) {
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
  @Deprecated('Use fromNpmJson instead')
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
