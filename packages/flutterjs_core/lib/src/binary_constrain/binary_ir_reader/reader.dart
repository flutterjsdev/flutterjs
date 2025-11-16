import 'dart:convert';
import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

mixin Reader {
  int readByte();

  int readUint16();
  int readUint32();
  int readInt64();
  int readUint64();
  double readDouble();
  String readString();
  void boundsCheck(int bytesNeeded);

  String readStringRef();
  bool bytesEqual(List<int> a, List<int> b);
}

mixin SourceLocation {

  SourceLocationIR readSourceLocation();
}
