import 'dart:io';
import 'dart:convert';

Future<void> checkUrl(String path) async {
  final client = HttpClient();
  try {
    final url = Uri.parse('http://localhost:3000$path');
    print('Checking $url ...');
    final req = await client.getUrl(url);
    final res = await req.close();
    print('Status: ${res.statusCode}');
    if (res.statusCode != 200) {
      final body = await utf8.decodeStream(res);
      print('Body: $body');
    } else {
      print('Content-Type: ${res.headers.contentType}');
    }
  } catch (e) {
    print('Failed: $e');
  } finally {
    client.close();
  }
}

void main() async {
  await checkUrl('/');
  await checkUrl('/url_launcher');
  await checkUrl('/url_launcher.js');
  await checkUrl('/node_modules/url_launcher/dist/url_launcher.js');
}
