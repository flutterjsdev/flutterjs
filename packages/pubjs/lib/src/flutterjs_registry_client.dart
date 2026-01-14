import 'dart:convert';
import 'package:http/http.dart' as http;

class FlutterJSRegistryClient {
  // TODO: Replace with your actual deployed URL or raw GitHub URL
  static const String _registryUrl =
      'https://raw.githubusercontent.com/flutterjsdev/flutterjs_website/master/content/registry.json';

  final http.Client _client;

  FlutterJSRegistryClient({http.Client? client})
    : _client = client ?? http.Client();

  Future<Map<String, dynamic>?> fetchRegistry() async {
    try {
      final response = await _client.get(Uri.parse(_registryUrl));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        print('Failed to fetch registry: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('Error fetching registry: $e');
      return null;
    }
  }

  Future<String?> getReplacementPackage(String originalPackage) async {
    final registry = await fetchRegistry();
    if (registry == null) return null;

    final packages = registry['packages'] as List<dynamic>;
    for (var pkg in packages) {
      if (pkg['name'] == originalPackage) {
        return pkg['flutterjs_package'] as String?;
      }
    }
    return null;
  }
}
