import 'package:flutterjs_core/flutterjs_core.dart';
/// ============================================================================
/// type_reader.dart
/// Type Reader — Deserializes Type Definitions and References from Binary IR
/// ============================================================================
///
/// Responsible for decoding all **type-related structures** previously encoded
/// by `type_writer.dart`.  
///
/// Types form the backbone of the FlutterJS IR system:
/// - variable types  
/// - function signatures  
/// - class references  
/// - generic parameters  
/// - list/map type structures  
///
/// A correct type reader is essential for reconstructing semantic integrity of
/// the IR.
///
///
/// # Purpose
///
/// Every declaration, parameter, and expression may reference a type.
/// This file ensures these types are reconstructed **exactly** as originally
/// encoded, including:
///
/// - nullability  
/// - generics  
/// - class names  
/// - primitive kinds  
/// - nested type definitions  
///
///
/// # Responsibilities
///
/// ## 1. Read Type Tags
///
/// Each type begins with a tag that defines its kind:
///
/// - `kTypePrimitive`  
/// - `kTypeClass`  
/// - `kTypeFunction`  
/// - `kTypeGeneric`  
/// - `kTypeList`  
/// - `kTypeMap`  
/// - `kTypeNullable`  
///
/// This tag determines which decoding path to follow.
///
///
/// ## 2. Primitive Types
///
/// Reads simple built-in types:
/// - int  
/// - double  
/// - bool  
/// - String  
///
/// Payload is typically a small int or enum code.
///
///
/// ## 3. Class Types
///
/// Reads:
/// - type name index (from StringTable)  
/// - generic argument count  
/// - recursively decoded generic types  
///
/// Example:
/// ```dart
/// MyClass<String, int>
/// ```
///
///
/// ## 4. Nullable Types
///
/// Nullability is encoded using:
///
/// ```dart
/// TAG_NULLABLE
///   [INNER_TYPE]
/// ```
///
///
/// ## 5. Function Types
///
/// Decodes:
/// - return type  
/// - positional parameter types  
/// - named parameter types (if schema supports)  
/// - optional/required flags  
///
/// Binary structure:
/// ```dart
/// TAG_FUNCTION
///   [RETURN_TYPE]
///   [PARAM_COUNT]
///     [PARAM_TYPES...]
/// ```
///
///
/// ## 6. Collection Types
///
/// ### List Type
/// ```dart
/// TAG_LIST
///   [ELEMENT_TYPE]
/// ```
///
/// ### Map Type
/// ```dart
/// TAG_MAP
///   [KEY_TYPE]
///   [VALUE_TYPE]
/// ```
///
///
/// ## 7. Generic Type Parameters
///
/// Supports reading generic type variables:
///
/// ```dart
/// TAG_GENERIC
///   [GENERIC_NAME_INDEX]
/// ```
///
///
/// ## 8. Recursive Type Reconstruction
///
/// Types may nest deeply:
/// - List<Map<String, List<int>>>  
/// - Function(List<T>, Map<K, V>) → bool  
///
/// TypeReader must recursively reconstruct nested structures.
///
///
/// ## 9. Type Table Integration
///
/// Works alongside:
/// - `string_table` (names)  
/// - IR declaration table (for class resolution)  
///
/// Ensures type references map correctly to IR node indices.
///
///
/// # Example Usage
///
/// ```dart
/// final type = typeReader.readType();
/// ```
///
/// Used in:
/// - declaration_reader (fields, params)  
/// - expression_reader (function types)  
/// - relationship restoration  
///
///
/// # Error Handling
///
/// Throws:
/// - unknown type tag  
/// - missing or malformed payload  
/// - out-of-range string table reference  
/// - invalid generic type structure  
///
///
/// # Notes
///
/// - Must remain perfectly symmetric with type_writer.dart.  
/// - Type decoding order must match writer’s deterministic ordering.  
/// - Must run *before* declarations and statements fully link types.  
///
///
/// ============================================================================
///

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
