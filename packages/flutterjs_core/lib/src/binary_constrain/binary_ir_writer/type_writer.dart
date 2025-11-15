import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:crypto/crypto.dart';
mixin  TypeWriter {
    // These methods are provided by BinaryIRWriter
  void _writeByte(int value);
  void _writeUint32(int value);
  int _getStringRef(String str);

  BytesBuilder get _buffer;

   void writeType(TypeIR type) {
    if (type is SimpleTypeIR) {
      _writeByte(BinaryConstants.TYPE_SIMPLE);
      _writeUint32(_getStringRef(type.name));
      _writeByte(type.isNullable ? 1 : 0);
    } else if (type is DynamicTypeIR) {
      _writeByte(BinaryConstants.TYPE_DYNAMIC);
    } else if (type is VoidTypeIR) {
      _writeByte(BinaryConstants.TYPE_VOID);
    } else if (type is NeverTypeIR) {
      _writeByte(BinaryConstants.TYPE_NEVER);
    } else {
      _writeByte(BinaryConstants.TYPE_SIMPLE);
      _writeUint32(_getStringRef(type.displayName()));
      _writeByte(type.isNullable ? 1 : 0);
    }
  }

    void writeChecksum(Uint8List data) {
    try {
      final digest = sha256.convert(data);
      final checksumBytes = digest.bytes;
      _buffer.add(checksumBytes);
    } catch (e) {
      throw SerializationException(
        'Failed to compute checksum: $e',
        offset: _buffer.length,
        context: 'checksum_write',
      );
    }
  }

}