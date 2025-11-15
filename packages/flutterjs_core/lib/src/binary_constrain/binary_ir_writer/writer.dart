import 'dart:convert';
import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

mixin Writer {
  bool get _verbose;
  BytesBuilder get _buffer;

  void printlog(String message) {
    if (_verbose) {
      print(message);
    }
  }

  void writeByte(int value) {
    _buffer.addByte(value & 0xFF);
  }

  void writeUint16(int value) {
    _buffer.addByte((value & 0xFF));
    _buffer.addByte((value >> 8) & 0xFF);
  }

  void writeUint32(int value) {
    _buffer.addByte((value & 0xFF));
    _buffer.addByte((value >> 8) & 0xFF);
    _buffer.addByte((value >> 16) & 0xFF);
    _buffer.addByte((value >> 24) & 0xFF);
  }

  void writeInt64(int value) {
    writeUint32(value & 0xFFFFFFFF);
    writeUint32((value >> 32) & 0xFFFFFFFF);
  }

  void writeUint64(int value) {
    writeInt64(value);
  }

  void writeDouble(double value) {
    final bytes = Float64List(1)..[0] = value;
    _buffer.add(bytes.buffer.asUint8List());
  }

  void writeString(String str) {
    final bytes = utf8.encode(str);
    if (bytes.length > BinaryConstants.MAX_STRING_LENGTH) {
      throw SerializationException(
        'String too long: ${bytes.length} bytes (max ${BinaryConstants.MAX_STRING_LENGTH})',
        offset: _buffer.length,
        context: 'string_write',
      );
    }
    writeUint16(bytes.length);
    _buffer.add(bytes);
  }
}

mixin SourceLocation {
  void writeUint32(int value);
  int _getStringRef(String str);
  void writeSourceLocation(SourceLocationIR location) {
    writeUint32(_getStringRef(location.file));
    writeUint32(location.line);
    writeUint32(location.column);
    writeUint32(location.offset);
    writeUint32(location.length);
  }
}
