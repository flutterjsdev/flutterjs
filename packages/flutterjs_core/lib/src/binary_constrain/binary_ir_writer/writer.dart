import 'package:flutterjs_core/flutterjs_core.dart';

mixin Writer {
  void printlog(String message);

  void writeByte(int value);

  void writeUint16(int value);

  void writeUint32(int value);

  void writeInt64(int value);

  void writeUint64(int value);

  void writeDouble(double value);

  void writeString(String str);
  void addString(String str);
  int getStringRef(String str);
}

mixin SourceLocation {
  void writeSourceLocation(SourceLocationIR location);
}
