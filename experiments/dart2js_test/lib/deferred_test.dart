import 'package:http/http.dart' deferred as http;
import 'package:path/path.dart' deferred as path;

void main() async {
  print('Loading libraries...');
  
  await http.loadLibrary();
  http.get(Uri.parse('https://example.com'));
  
  await path.loadLibrary();
  print(path.join('foo', 'bar'));
}
