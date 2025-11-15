
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutterjs_core/flutterjs_core.dart';

mixin Reader {
  ByteData get _data;
   List<String> get _stringTable;
  int get _offset;
   set _offset(int value);
  
   int readByte() {
    boundsCheck(1);
    return _data.getUint8(_offset++) & 0xFF;
  }

  int readUint16() {
    boundsCheck(2);
    final value = _data.getUint16(_offset, Endian.little);
    _offset += 2;
    return value;
  }

  int readUint32() {
    boundsCheck(4);
    final value = _data.getUint32(_offset, Endian.little);
    _offset += 4;
    return value;
  }

  int readInt64() {
    boundsCheck(8);
    final value = _data.getInt64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  int readUint64() {
    boundsCheck(8);
    final value = _data.getUint64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  double readDouble() {
    boundsCheck(8);
    final value = _data.getFloat64(_offset, Endian.little);
    _offset += 8;
    return value;
  }

  String readString() {
    final length = readUint16();
    if (length > BinaryConstants.MAX_STRING_LENGTH) {
      throw SerializationException(
        'String length too large: $length',
        offset: _offset - 2,
      );
    }

    boundsCheck(length);
    final bytes = _data.buffer.asUint8List(_offset, length);
    _offset += length;

    return utf8.decode(bytes);
  }

   void boundsCheck(int bytesNeeded) {
    if (_offset + bytesNeeded > _data.lengthInBytes) {
      throw SerializationException(
        'Unexpected end of data: need $bytesNeeded bytes, '
        'but only ${_data.lengthInBytes - _offset} available',
        offset: _offset,
      );
    }
  }



 String readStringRef() {
    final index = readUint32();
    if (index >= _stringTable.length) {
      throw SerializationException(
        'String reference $index out of bounds (table size: ${_stringTable.length})',
        offset: _offset - 4,
      );
    }
    return _stringTable[index];
  }


  bool bytesEqual(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}

mixin SourceLocation{
  String readStringRef() ;
  int readUint32();
    SourceLocationIR readSourceLocation() {
    final file = readStringRef();
    final line = readUint32();
    final column = readUint32();
    final offset = readUint32();
    final length = readUint32();

    return SourceLocationIR(
      id: 'loc_${file}_$line',
      file: file,
      line: line,
      column: column,
      offset: offset,
      length: length,
    );
  }
}