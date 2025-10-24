import '../type_ir.dart';
import '../../diagnostics/source_location.dart';

/// Represents unresolved type references during multi-pass analysis
/// Acts as a placeholder that can be resolved in a second pass
class UnresolvedTypeIR extends TypeIR {
  final String typeName;
  final String? hint; // "Could not find in package:flutter"
  final List<String> resolutionAttempts; // Track where we looked
  final int passNumber; // Which analysis pass created this

  UnresolvedTypeIR({
    required super.id,
    required super.name,
    required super.sourceLocation,
    required this.typeName,
    this.hint,
    this.resolutionAttempts = const [],
    this.passNumber = 1,
    super.isNullable = false,
  });

  @override
  bool get isBuiltIn => false;

  @override
  bool get isGeneric => false; // Unknown until resolved

  /// Check if this type has been attempted to resolve before
  bool get hasBeenAttempted => resolutionAttempts.isNotEmpty;

  /// Get a detailed error message about resolution failure
  String getDetailedErrorMessage() {
    final buffer = StringBuffer('Type "$typeName" could not be resolved');

    if (hint != null) {
      buffer.write(': $hint');
    }

    if (resolutionAttempts.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('Resolution attempts (${resolutionAttempts.length}):');
      for (final attempt in resolutionAttempts) {
        buffer.writeln('  - $attempt');
      }
    }

    return buffer.toString();
  }

  @override
  String displayName() => '$typeName (unresolved)';

  /// Track a failed resolution attempt
  UnresolvedTypeIR withResolutionAttempt(String location) {
    return UnresolvedTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      typeName: typeName,
      hint: hint,
      resolutionAttempts: [...resolutionAttempts, location],
      passNumber: passNumber,
      isNullable: isNullable,
    );
  }

  /// Create a nullable version
  UnresolvedTypeIR toNullable() {
    if (isNullable) return this;
    return UnresolvedTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      typeName: typeName,
      hint: hint,
      resolutionAttempts: resolutionAttempts,
      passNumber: passNumber,
      isNullable: true,
    );
  }

  /// Create a non-nullable version
  UnresolvedTypeIR toNonNullable() {
    if (!isNullable) return this;
    return UnresolvedTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      typeName: typeName,
      hint: hint,
      resolutionAttempts: resolutionAttempts,
      passNumber: passNumber,
      isNullable: false,
    );
  }

  /// Mark this type for resolution in next pass
  UnresolvedTypeIR markForNextPass() {
    return UnresolvedTypeIR(
      id: id,
      name: name,
      sourceLocation: sourceLocation,
      typeName: typeName,
      hint: hint,
      resolutionAttempts: resolutionAttempts,
      passNumber: passNumber + 1,
      isNullable: isNullable,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'typeName': typeName,
      'hint': hint,
      'resolutionAttempts': resolutionAttempts,
      'passNumber': passNumber,
      'type': 'UnresolvedTypeIR',
    };
  }

  factory UnresolvedTypeIR.fromJson(
    Map<String, dynamic> json,
    SourceLocationIR sourceLocation,
  ) {
    final resolutionAttemptsJson =
        json['resolutionAttempts'] as List<dynamic>? ?? [];
    final resolutionAttempts = resolutionAttemptsJson.cast<String>().toList();

    return UnresolvedTypeIR(
      id: json['id'] as String,
      name: json['name'] as String,
      sourceLocation: sourceLocation,
      typeName: json['typeName'] as String,
      hint: json['hint'] as String?,
      resolutionAttempts: resolutionAttempts,
      passNumber: json['passNumber'] as int? ?? 1,
      isNullable: json['isNullable'] as bool? ?? false,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UnresolvedTypeIR &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          typeName == other.typeName &&
          hint == other.hint &&
          isNullable == other.isNullable &&
          passNumber == other.passNumber &&
          _listEquals(resolutionAttempts, other.resolutionAttempts);

  @override
  int get hashCode => Object.hash(
    id,
    typeName,
    hint,
    isNullable,
    passNumber,
    Object.hashAll(resolutionAttempts),
  );

  static bool _listEquals<T>(List<T> a, List<T> b) {
    if (a.length != b.length) return false;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
