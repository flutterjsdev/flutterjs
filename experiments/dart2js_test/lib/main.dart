import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;

void main() {
  // Use http
  final url = Uri.parse('https://example.com');
  http.get(url);
  
  // Use path  
  final p = path.join('foo', 'bar');
  print(p);
}
