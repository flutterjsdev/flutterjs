library flutterjs_url_launcher;

import 'package:flutter/services.dart';

class UrlLauncher {
  static const MethodChannel _channel = MethodChannel('flutterjs/url_launcher');

  /// Launches the given [url] in a new window/tab.
  static Future<bool> launch(String url) async {
    try {
      // In FlutterJS, this should be intercepted by the JS runtime or handle via MethodChannel logic provided by the engine.
      // For now, we define the standard interface.
      await _channel.invokeMethod('launch', {'url': url});
      return true;
    } catch (e) {
      print('UrlLauncher Error: $e');
      return false;
    }
  }
}
