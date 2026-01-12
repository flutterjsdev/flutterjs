import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:archive/archive.dart';
import 'package:path/path.dart' as p;

class PackageDownloader {
  final http.Client _client;

  PackageDownloader({http.Client? client}) : _client = client ?? http.Client();

  /// Downloads a tarball from [url] and extracts it to [destinationPath].
  ///
  /// Handles both npm and pub.dev tarball formats:
  /// - npm: typically has package/ subdirectory
  /// - pub.dev: may have package-version/ or just files
  ///
  /// Returns the path to the extracted package root.
  Future<String> downloadAndExtract(String url, String destinationPath) async {
    print('Downloading $url...');
    final response = await _client.get(Uri.parse(url));

    if (response.statusCode != 200) {
      throw Exception(
        'Failed to download package: Status ${response.statusCode}',
      );
    }

    print('Extracting to $destinationPath...');

    // Detect archive type by URL or try both decoders
    Archive archive;
    try {
      if (url.endsWith('.tar.gz') || url.endsWith('.tgz')) {
        // Decompress gzip first, then extract tar
        final gzipDecoded = GZipDecoder().decodeBytes(response.bodyBytes);
        archive = TarDecoder().decodeBytes(gzipDecoded);
      } else if (url.endsWith('.zip')) {
        archive = ZipDecoder().decodeBytes(response.bodyBytes);
      } else {
        // Try tar.gz by default for pub.dev
        final gzipDecoded = GZipDecoder().decodeBytes(response.bodyBytes);
        archive = TarDecoder().decodeBytes(gzipDecoded);
      }
    } catch (e) {
      throw Exception('Failed to decode archive: $e');
    }

    // Create the destination directory if it doesn't exist
    final destDir = Directory(destinationPath);
    if (!await destDir.exists()) {
      await destDir.create(recursive: true);
    }

    // Check if archive has a common root directory (like "package/")
    String? commonRoot;
    if (archive.files.isNotEmpty) {
      final firstFilePath = archive.files.first.name;
      final parts = p.split(firstFilePath);
      if (parts.isNotEmpty && parts[0].isNotEmpty) {
        // Check if all files start with the same root
        final possibleRoot = parts[0];
        final allHaveSameRoot = archive.files.every((file) {
          final fileParts = p.split(file.name);
          return fileParts.isNotEmpty && fileParts[0] == possibleRoot;
        });

        if (allHaveSameRoot) {
          commonRoot = possibleRoot;
        }
      }
    }

    // Extract files
    for (final file in archive.files) {
      var filename = file.name;

      // Strip common root directory if present
      if (commonRoot != null && filename.startsWith('$commonRoot/')) {
        filename = filename.substring(commonRoot.length + 1);
      }

      // Skip if filename is empty after stripping root
      if (filename.isEmpty) continue;

      if (file.isFile) {
        final data = file.content as List<int>;
        final outFile = File(p.join(destinationPath, filename));
        await outFile.parent.create(recursive: true);
        await outFile.writeAsBytes(data);
      } else {
        await Directory(
          p.join(destinationPath, filename),
        ).create(recursive: true);
      }
    }

    print('Extraction complete: $destinationPath');
    return destinationPath;
  }
}
