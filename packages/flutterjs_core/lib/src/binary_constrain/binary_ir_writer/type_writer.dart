import 'package:flutterjs_core/flutterjs_core.dart';

mixin  TypeWriter {
    // These methods are provided by BinaryIRWriter
  void _writeByte(int value);
  void _writeUint32(int value);
  int _getStringRef(String str);

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
}