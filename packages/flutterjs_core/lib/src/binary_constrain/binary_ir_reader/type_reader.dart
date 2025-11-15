import 'package:flutterjs_core/flutterjs_core.dart';

mixin TypeReader {
  int readByte();
  String readStringRef();
  int get _offset;
  TypeIR readType() {
    final typeKind = readByte();

    switch (typeKind) {
      case BinaryConstants.TYPE_SIMPLE:
        final name = readStringRef();
        final isNullable = readByte() != 0;
        return SimpleTypeIR(
          id: 'type_${name}_simple',
          name: name,
          isNullable: isNullable,
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      case BinaryConstants.TYPE_DYNAMIC:
        return DynamicTypeIR(
          id: 'type_dynamic',
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      case BinaryConstants.TYPE_VOID:
        return VoidTypeIR(
          id: 'type_void',
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      case BinaryConstants.TYPE_NEVER:
        return NeverTypeIR(
          id: 'type_never',
          sourceLocation: SourceLocationIR(
            id: 'loc_type',
            file: 'builtin',
            line: 0,
            column: 0,
            offset: 0,
            length: 0,
          ),
        );

      default:
        throw SerializationException(
          'Return type error Unknown type kind: $typeKind',
          offset: _offset - 1,
        );
    }
  }
}
