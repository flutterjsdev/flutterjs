import 'dart:io';

class Tracer {
  static void log(String msg) {
    try {
      final file = File(
        'c:/Jay/_Plugin/flutterjs/examples/routing_app/trace.log',
      );
      file.writeAsStringSync(
        '${DateTime.now().toIso8601String()} - $msg\n',
        mode: FileMode.append,
      );
    } catch (e) {
      // ignore
    }
  }
}
