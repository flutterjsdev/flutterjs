# IR Type System

Type system intermediate representation in FlutterJS Core.

---

## Overview

The IR type system represents Dart's type system in a structured, analyzable format.

```
TypeIR (abstract)
├── NamedTypeIR        - int, String, Widget
├── GenericTypeIR      - List<T>, Map<K,V>
├── FunctionTypeIR     - void Function(int)
├── VoidTypeIR         - void
├── DynamicTypeIR      - dynamic
└── NullTypeIR         - Null
```

---

## Named Types

Simple named types like `int`, `String`, `Widget`.

```dart
class NamedTypeIR extends TypeIR {
  final String name;
  final String? libraryUri;  // package:flutter/material.dart
  
  NamedTypeIR(this.name, {this.libraryUri});
  
  String displayName() => name;
}
```

**Examples:**
```dart
NamedTypeIR('int')
NamedTypeIR('String')
NamedTypeIR('Widget')
NamedTypeIR('BuildContext')
```

---

## Generic Types

Types with type parameters like `List<String>`, `Map<String, int>`.

```dart
class GenericTypeIR extends TypeIR {
  final String baseType;
  final List<TypeIR> typeArguments;
  
  GenericTypeIR({
    required this.baseType,
    required this.typeArguments,
  });
  
  String displayName() => '$baseType<${typeArguments.join(", ")}>';
}
```

**Examples:**
```dart
GenericTypeIR(
  baseType: 'List',
  typeArguments: [NamedTypeIR('String')],
) // List<String>

GenericTypeIR(
  baseType: 'Map',
  typeArguments: [
    NamedTypeIR('String'),
    NamedTypeIR('int'),
  ],
) // Map<String, int>
```

---

## Function Types

Function signatures.

```dart
class FunctionTypeIR extends TypeIR {
  final TypeIR returnType;
  final List<ParameterTypeIR> parameters;
  final List<ParameterTypeIR> namedParameters;
  
  FunctionTypeIR({
    required this.returnType,
    this.parameters = const [],
    this.namedParameters = const [],
  });
}
```

**Examples:**
```dart
// void Function()
FunctionTypeIR(
  returnType: VoidTypeIR(),
  parameters: [],
)

// void Function(int)
FunctionTypeIR(
  returnType: VoidTypeIR(),
  parameters: [ParameterTypeIR(type: NamedTypeIR('int'))],
)

// String Function(int x, {bool isRequired})
FunctionTypeIR(
  returnType: NamedTypeIR('String'),
  parameters: [ParameterTypeIR(name: 'x', type: NamedTypeIR('int'))],
  namedParameters: [ParameterTypeIR(name: 'isRequired', type: NamedTypeIR('bool'))],
)
```

---

## Special Types

### VoidTypeIR

```dart
class VoidTypeIR extends TypeIR {
  String displayName() => 'void';
}
```

### DynamicTypeIR

```dart
class DynamicTypeIR extends TypeIR {
  String displayName() => 'dynamic';
}
```

### NullTypeIR

```dart
class NullTypeIR extends TypeIR {
  String displayName() => 'Null';
}
```

---

## Type Operations

### Type Compatibility

```dart
bool isAssignable(TypeIR from, TypeIR to) {
  // dynamic is assignable to everything
  if (from is DynamicTypeIR) return true;
  
  // Everything is assignable to dynamic
  if (to is DynamicTypeIR) return true;
  
  // Same types
  if (from.displayName() == to.displayName()) return true;
  
  // Subtype relationship
  return isSubtype(from, to);
}
```

### Type Unification

```dart
TypeIR unifyTypes(TypeIR type1, TypeIR type2) {
  if (type1 == type2) return type1;
  if (type1 is DynamicTypeIR || type2 is DynamicTypeIR) {
    return DynamicTypeIR();
  }
  // Find common supertype
  return findCommonSupertype(type1, type2);
}
```

---

## See Also

- [IR System Overview](ir-system-overview.md)
- [Analysis Passes](analysis-passes.md)
- [Type Inference](type-inference.md)
