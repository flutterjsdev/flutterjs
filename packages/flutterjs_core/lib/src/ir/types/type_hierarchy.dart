import 'type_ir.dart';
import 'class_type_ir.dart';
import 'unresolved_type_ir.dart';

/// =============================================================================
///  DART TYPE HIERARCHY & RELATIONSHIP CHECKER
///  Subtype, assignability, and common supertype logic
/// =============================================================================
///
/// PURPOSE
/// -------
/// Provides correct Dart type system semantics:
/// • isSubtypeOf(A, B)
/// • isAssignableTo(A, B)
/// • commonSupertype(A, B)
///
/// Handles:
/// • Null safety rules
/// • Promotion (int → double)
/// • Built-in hierarchy (num, Iterable, etc.)
/// • Never and dynamic special cases
///
/// STATUS
/// ------
/// Currently partially implemented — full version requires inheritance
/// metadata from ClassDeclaration analysis.
///
/// FUTURE WORK
/// -----------
/// • Integrate with ClassIR inheritance graph
/// • Support extension types
/// • Add promotion rules (int → num)
///
/// RELATED FILES
/// -------------
/// • type_ir.dart
/// • class_type_ir.dart
/// • primitive_type_ir.dart
///
/// AUTHOR:  Your Name / Team
/// UPDATED: 2025-11-26
/// =============================================================================
/// Type relationship utilities for Dart type hierarchy
class TypeHierarchy {
  // Dart standard type hierarchy
  // Maps type name to its supertypes
  static const Map<String, List<String>> hierarchy = {
    'dynamic': [], // Top type - supertype of everything
    'Object': ['dynamic'],
    'Comparable': ['Object'],
    'int': ['num', 'Comparable', 'Object'],
    'double': ['num', 'Object'],
    'num': ['Comparable', 'Object'],
    'String': ['Comparable', 'Object'],
    'bool': ['Object'],
    'List': ['Iterable', 'Object'],
    'Map': ['Object'],
    'Iterable': ['Object'],
    'Set': ['Iterable', 'Object'],
    'Runes': ['Iterable', 'Object'],
    'Never': [], // Bottom type - subtype of everything
  };

  /// Check if type [a] is a subtype of type [b]
  /// A subtype can be used anywhere its supertype is expected
  static bool isSubtypeOf(TypeIR a, TypeIR b) {
    // Identical types
    if (a.name == b.name) return true;

    // Never is a subtype of everything
    if (a.name == 'Never') return true;

    // Everything is a subtype of dynamic
    if (b.name == 'dynamic') return true;

    // Handle nullability: T? is subtype of U? if T is subtype of U
    if (a.isNullable && b.isNullable) {
      return isSubtypeOf(_stripNullable(a), _stripNullable(b));
    }

    // Non-nullable can't be subtype of nullable
    if (!a.isNullable && b.isNullable) {
      return false;
    }

    // Nullable can be subtype of non-nullable only for identical types
    if (a.isNullable && !b.isNullable) {
      return a.name == b.name;
    }

    // Check hierarchy for standard types
    if (_hasHierarchyEntry(a.name)) {
      return _isInHierarchy(a.name, b.name);
    }

    // Check if both are class types with inheritance info
    if (a is ClassTypeIR && b is ClassTypeIR) {
      return _isClassSubtypeOf(a, b);
    }

    // Unresolved types - be conservative
    if (a is UnresolvedTypeIR || b is UnresolvedTypeIR) {
      return false;
    }

    return false;
  }

  /// Check if type [a] can be assigned to type [b]
  /// Similar to isSubtypeOf but with additional compatibility checks
  static bool isAssignableTo(TypeIR a, TypeIR b) {
    // Same as subtype relation for most cases
    if (isSubtypeOf(a, b)) return true;

    // int can be assigned to double
    if (a.name == 'int' && b.name == 'double') return true;

    // num can be assigned to int/double for numeric operations
    if (a.name == 'num' && (b.name == 'int' || b.name == 'double')) {
      return true;
    }

    return false;
  }

  /// Find the most specific common supertype of [a] and [b]
  /// Returns the lowest common ancestor in the type hierarchy
  static TypeIR? commonSupertype(TypeIR a, TypeIR b) {
    // Identical types
    if (a.name == b.name) return a;

    // Dynamic is common supertype of everything
    if (a.name == 'dynamic' || b.name == 'dynamic') {
      return TypeIR.fromJson({
        'id': 'common_dynamic',
        'name': 'dynamic',
        'type': 'DynamicTypeIR',
      });
    }

    // Never is subtype, so other type is the supertype
    if (a.name == 'Never') return b;
    if (b.name == 'Never') return a;

    // For standard types, find common ancestors
    final aAncestors = _getAncestors(a.name);
    final bAncestors = _getAncestors(b.name);

    // Find most specific common ancestor
    for (final ancestor in aAncestors) {
      if (bAncestors.contains(ancestor)) {
        return _createTypeFromName(ancestor);
      }
    }

    // Fall back to Object if no common ancestor found
    return _createTypeFromName('Object');
  }

  /// Get all ancestors of a type (including itself)
  static List<String> _getAncestors(String typeName) {
    final ancestors = <String>[typeName];
    final queue = <String>[typeName];
    final visited = <String>{typeName};

    while (queue.isNotEmpty) {
      final current = queue.removeAt(0);
      final supertypes = hierarchy[current] ?? [];

      for (final supertype in supertypes) {
        if (!visited.contains(supertype)) {
          ancestors.add(supertype);
          queue.add(supertype);
          visited.add(supertype);
        }
      }
    }

    return ancestors;
  }

  /// Check if [subtype] is in the hierarchy of [supertype]
  static bool _isInHierarchy(String subtype, String supertype) {
    return _getAncestors(subtype).contains(supertype);
  }

  /// Check if a hierarchy entry exists for the given type
  static bool _hasHierarchyEntry(String typeName) {
    return hierarchy.containsKey(typeName);
  }

  /// Strip nullable wrapper from a type
  static TypeIR _stripNullable(TypeIR type) {
    if (type.isNullable && type is ClassTypeIR) {
      return type.toNonNullable();
    }
    return type;
  }

  /// Check ClassTypeIR subtype relationship
  /// (In a real implementation, this would check inheritance metadata)
  static bool _isClassSubtypeOf(ClassTypeIR a, ClassTypeIR b) {
    // Same class
    if (a.className == b.className) return true;

    // Object is supertype of all classes
    if (b.className == 'Object') return true;

    // In a full implementation, would check class inheritance from metadata
    // For now, return false for unknown relationships
    return false;
  }

  /// Create a TypeIR from a standard type name
  static TypeIR _createTypeFromName(String name) {
    // This is a simplified version - in production would use proper factory
    return TypeIR.fromJson({
      'id': 'type_$name',
      'name': name,
      'type': name == 'dynamic'
          ? 'DynamicTypeIR'
          : name == 'Never'
          ? 'NeverTypeIR'
          : 'SimpleTypeIR',
    });
  }
}
