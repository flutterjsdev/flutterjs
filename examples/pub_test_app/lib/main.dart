import 'package:uuid/uuid.dart';

void main() {
  var uuid = Uuid();
  print('Generated UUID: ${uuid.v4()}');
}
