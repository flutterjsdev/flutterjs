import 'package:meta/meta.dart';
import 'ir_node.dart';
import 'types/function_type_ir.dart';
import 'types/generic_type_ir.dart';

/// Base class for all type representations in the IR
abstract class TypeIR extends IRNode {
  final String name;
  final bool isNullable;

  const TypeIR({
    required super.id,
    required this.name,
    this.isNullable = false,
    required super.sourceLocation,
  });

  /// Human-readable type representation (e.g., "List<String>?", "int")
  /// Override in subclasses for custom formatting
  String displayName() {
    return isNullable ? '$name?' : name;
  }

 bool get isBuiltIn => false;
  bool get isGeneric => false;

  /// Get the base type without nullability wrapper
  TypeIR unwrapNullable() {
    // Default implementation - override in wrapper types like NullableTypeIR
    return this;
  }

  /// Check if this type can be assigned to another type
  bool isAssignableTo(TypeIR other) {
    // Default: same type is always assignable
    if (name == other.name && isNullable == other.isNullable) return true;
    
    // Null safety: non-nullable can't be assigned to nullable in strict mode
    if (isNullable && !other.isNullable) return false;
    
    // dynamic accepts anything
    if (other.name == 'dynamic') return true;
    
    // Override in subclasses for proper type hierarchy checking
    return false;
  }

  /// Check if this type is a subtype of another type
  bool isSubtypeOf(TypeIR other) => isAssignableTo(other);

  @override
  bool contentEquals(IRNode other) {
    if (other is! TypeIR) return false;
    return name == other.name && isNullable == other.isNullable;
  }

  @override
  String toShortString() => displayName();

  factory TypeIR.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String?;
    final sourceLocation = SourceLocationIR.fromJson(
      json['sourceLocation'] as Map<String, dynamic>? ?? {},
    );

    switch (type) {
      case 'SimpleTypeIR':
        return SimpleTypeIR.fromJson(json, sourceLocation);
      case 'FunctionTypeIR':
        return FunctionTypeIR.fromJson(json, sourceLocation);
      case 'GenericTypeIR':
        return GenericTypeIR.fromJson(json, sourceLocation);
      case 'DynamicTypeIR':
        return DynamicTypeIR(
          id: json['id'] as String,
          sourceLocation: sourceLocation,
        );
      case 'VoidTypeIR':
        return VoidTypeIR(
          id: json['id'] as String,
          sourceLocation: sourceLocation,
        );
      case 'NeverTypeIR':
        return NeverTypeIR(
          id: json['id'] as String,
          sourceLocation: sourceLocation,
        );
      default:
        throw UnimplementedError('Unknown TypeIR type: $type');
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'isNullable': isNullable,
      'type': runtimeType.toString(),
      'sourceLocation': sourceLocation.toJson(),
    };
  }
}

/// Represents a simple class type (non-generic)
@immutable
class SimpleTypeIR extends TypeIR {
  final List<TypeIR> typeArguments;

  const SimpleTypeIR({
    required super.id,
    required super.name,
    super.isNullable = false,
    this.typeArguments = const [],
    required super.sourceLocation,
  });

  @override
  String displayName() {
    final baseName = name;
    final withArgs = typeArguments.isNotEmpty
        ? '$baseName<${typeArguments.map((t) => t.displayName()).join(', ')}>'
        : baseName;
    return isNullable ? '$withArgs?' : withArgs;
  }
  @override
  bool get isBuiltIn => false;

  @override
  bool get isGeneric => typeArguments.isNotEmpty;

  factory SimpleTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    return SimpleTypeIR(
      id: json['id'] as String,
      name: json['name'] as String,
      isNullable: json['isNullable'] as bool? ?? false,
      typeArguments: (json['typeArguments'] as List<dynamic>?)
              ?.map((e) => TypeIR.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      sourceLocation: sourceLocation,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'typeArguments': typeArguments.map((t) => t.toJson()).toList(),
    };
  }
}



class TypeParameterIR {
  final String name;
  final TypeIR? bound;

  TypeParameterIR({required this.name, this.bound});

  factory TypeParameterIR.fromJson(Map<String, dynamic> json) {
    return TypeParameterIR(
      name: json['name'] as String,
      bound: json['bound'] != null
          ? TypeIR.fromJson(json['bound'] as Map<String, dynamic>)
          : null,
    );
  }

    @override
  bool operator == (Object other) =>
      identical(this, other) ||
      other is TypeParameterIR &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          bound == other.bound;

  Map<String, dynamic> toJson() {
    return {'name': name, 'bound': bound?.toJson()};
  }
}

class DynamicTypeIR extends TypeIR {
  DynamicTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'dynamic', isNullable: true);
    
  @override
  bool get isBuiltIn => true;

  @override
  bool get isGeneric => false;

  @override
  String displayName() => name;
}

class VoidTypeIR extends TypeIR {
  VoidTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'void', isNullable: false);

     @override
  bool get isBuiltIn => true;

  @override
  bool get isGeneric => false;

  @override
  String displayName() => name;
}

class NeverTypeIR extends TypeIR {
  NeverTypeIR({required super.id, required super.sourceLocation})
    : super(name: 'Never', isNullable: false);
     @override
  bool get isBuiltIn => true;

  @override
  bool get isGeneric => false;

  @override
  String displayName() => name;
}


