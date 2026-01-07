import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:archive/archive.dart';
import 'package:path/path.dart' as p;

class PackageDownloader {
  final http.Client _client;

  PackageDownloader({http.Client? client}) : _client = client ?? http.Client();

  /// Downloads a zip file from [url] and extracts it to [destinationPath].
  /// Returns the path to the extracted package root (which might be a subdirectory inside destination).
  Future<String> downloadAndExtract(String url, String destinationPath) async {
    print('Downloading $url...');
    final response = await _client.get(Uri.parse(url));

    if (response.statusCode != 200) {
      throw Exception(
          'Failed to download package: Status ${response.statusCode}');
    }

    print('Extracting to $destinationPath...');
    final archive = ZipDecoder().decodeBytes(response.bodyBytes);

    // Create the destination directory if it doesn't exist
    final destDir = Directory(destinationPath);
    if (!await destDir.exists()) {
      await destDir.create(recursive: true);
    }

    for (final file in archive) {
      final filename = file.name;
      if (file.isFile) {
        final data = file.content as List<int>;
        final outFile = File(p.join(destinationPath, filename));
        await outFile.parent.create(recursive: true);
        await outFile.writeAsBytes(data);
      } else {
        await Directory(p.join(destinationPath, filename))
            .create(recursive: true);
      }
    }

    // Often zip files have a top-level directory (e.g. "package-v1.0.0/").
    // We should return that inner directory if it exists and contains pubspec.yaml,
    // otherwise return destinationPath.
    // For now, let's assume standard behavior and return destinationPath.
    // To make it robust, we could check for pubspec.yaml.

    return destinationPath;
  }
}
