import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:crypto/crypto.dart';
mixin  TypeWriter {
    // These methods are provided by BinaryIRWriter
  void writeByte(int value);
  void writeUint32(int value);
  int getStringRef(String str);

  BytesBuilder get buffer;

  BytesBuilder get _buffer=>buffer;


   void writeType(TypeIR type) {
    if (type is SimpleTypeIR) {
      writeByte(BinaryConstants.TYPE_SIMPLE);
      writeUint32(getStringRef(type.name));
      writeByte(type.isNullable ? 1 : 0);
    } else if (type is DynamicTypeIR) {
      writeByte(BinaryConstants.TYPE_DYNAMIC);
    } else if (type is VoidTypeIR) {
      writeByte(BinaryConstants.TYPE_VOID);
    } else if (type is NeverTypeIR) {
      writeByte(BinaryConstants.TYPE_NEVER);
    } else {
      writeByte(BinaryConstants.TYPE_SIMPLE);
      writeUint32(getStringRef(type.displayName()));
      writeByte(type.isNullable ? 1 : 0);
    }
  }

    void writeChecksum(Uint8List data) {
    try {
      final digest = sha256.convert(data);
      final checksumBytes = digest.bytes;
      buffer.add(checksumBytes);
    } catch (e) {
      throw SerializationException(
        'Failed to compute checksum: $e',
        offset: buffer.length,
        context: 'checksum_write',
      );
    }
  }

}