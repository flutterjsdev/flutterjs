import 'package:flutterjs_core/flutterjs_core.dart';

mixin TypeReader {
  TypeIR readType();

  TypeIR simpleTypeIR(String name, bool isNullable) {
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
  }

  TypeIR dynamicTypeIR() {
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
  }

  TypeIR voidTypeIR() {
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
  }

  TypeIR neverTypeIR() {
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
  }
}
