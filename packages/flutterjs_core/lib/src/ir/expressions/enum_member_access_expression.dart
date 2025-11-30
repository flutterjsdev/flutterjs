// ============================================================================
// IMPROVED: EnumMemberAccessExpressionIR
// ============================================================================
// Handles Dart 3.0+ enum member access syntax:
// - Shorthand: .center, .start, .end
// - Full path: MainAxisAlignment.center, Colors.red
// ============================================================================
import 'package:meta/meta.dart';
import 'package:flutterjs_core/flutterjs_core.dart';

/// Classification of enum member access patterns
enum EnumMemberAccessKind {
  /// Shorthand syntax: .center, .start (Dart 3.0+)
  /// Type is inferred from context
  shorthand,

  /// Full qualified: MainAxisAlignment.center, Colors.red
  qualified,

  /// Static constant: Colors.BLACK, kSomeValue (similar pattern)
  staticConstant,
}

/// Represents Dart 3.0+ enum member access expression
/// This is a VALID Dart expression, not an error case
@immutable
class EnumMemberAccessExpressionIR extends ExpressionIR {
  /// The raw source text as it appears in code
  /// Examples: ".center", "MainAxisAlignment.center", "Colors.red"
  final String source;

  /// Type of enum member access
  final EnumMemberAccessKind kind;

  /// The enum/class type name (null if using shorthand syntax)
  /// Examples: "MainAxisAlignment", "Colors", "FontWeight"
  final String? typeName;

  /// The member name being accessed
  /// Examples: "center", "red", "bold", "start"
  final String memberName;

  /// The inferred enum type from context (populated after type inference)
  /// Used when syntax is `.center` and we need to know it's `MainAxisAlignment.center`
  final String? inferredTypeName;

  /// Context information for better error handling
  final String? parentContext;

  /// Whether type inference was successful
  final bool typeInferenceSuccessful;

  EnumMemberAccessExpressionIR({
    required super.id,
    required super.sourceLocation,
    required this.source,
    required this.memberName,
    this.kind = EnumMemberAccessKind.shorthand,
    this.typeName,
    this.inferredTypeName,
    this.parentContext,
    this.typeInferenceSuccessful = false,
    super.metadata,
  }) : super(
    resultType: DynamicTypeIR(
      id: 'dynamic',
      sourceLocation: SourceLocationIR(
        id: 'loc_dynamic',
        file: 'builtin',
        line: 0,
        column: 0,
        offset: 0,
        length: 0,
      ),
    ),
  );

  /// Factory: Parse from source text with automatic classification
  factory EnumMemberAccessExpressionIR.parse({
    required String id,
    required SourceLocationIR sourceLocation,
    required String source,
    String? parentContext,
    Map<String, dynamic>? metadata,
  }) {
    final trimmed = source.trim();
    final (kind, typeName, memberName) = _parseSource(trimmed);

    return EnumMemberAccessExpressionIR(
      id: id,
      sourceLocation: sourceLocation,
      source: source,
      kind: kind,
      typeName: typeName,
      memberName: memberName,
      parentContext: parentContext,
      typeInferenceSuccessful: typeName != null,
      metadata: metadata,
    );
  }

  /// Parse source text to extract kind, type, and member
  static (EnumMemberAccessKind, String?, String) _parseSource(String source) {
    // Case 1: Shorthand syntax - .center, .start, .end
    if (source.startsWith('.')) {
      final memberName = source.substring(1);
      return (EnumMemberAccessKind.shorthand, null, memberName);
    }

    // Case 2: Qualified syntax - MainAxisAlignment.center, Colors.red
    if (source.contains('.')) {
      final parts = source.split('.');
      if (parts.length == 2) {
        final typeName = parts[0];
        final memberName = parts[1];

        // Determine if it's enum member or static constant based on naming
        final kind = _isEnumType(typeName)
            ? EnumMemberAccessKind.qualified
            : EnumMemberAccessKind.staticConstant;

        return (kind, typeName, memberName);
      }
    }

    // Case 3: Just member name (shouldn't happen, but handle gracefully)
    return (EnumMemberAccessKind.shorthand, null, source);
  }

  /// Check if a name looks like an enum/class type (PascalCase)
  static bool _isEnumType(String name) {
    return RegExp(r'^[A-Z][a-zA-Z0-9]*$').hasMatch(name);
  }

  /// Get the full qualified name (useful for JavaScript generation)
  String getFullyQualifiedName() {
    if (typeName != null) {
      return '$typeName.$memberName';
    }
    if (inferredTypeName != null) {
      return '$inferredTypeName.$memberName';
    }
    return memberName;
  }

  /// Convert to JavaScript friendly format
  String toJavaScript() {
    // Convert enum member names to lowercase strings
    return '"${memberName.toLowerCase()}"';
  }

  @override
  String toShortString() => source;

  /// Detailed debugging information
  String toDebugString() {
    final buffer = StringBuffer();
    buffer.writeln('EnumMemberAccessExpressionIR {');
    buffer.writeln('  source: "$source"');
    buffer.writeln('  kind: $kind');

    if (typeName != null) {
      buffer.writeln('  typeName: $typeName');
    }
    buffer.writeln('  memberName: $memberName');

    if (inferredTypeName != null) {
      buffer.writeln('  inferredType: $inferredTypeName');
      buffer.writeln('  inferenceSuccessful: $typeInferenceSuccessful');
    }

    if (parentContext != null) {
      buffer.writeln('  parentContext: $parentContext');
    }

    buffer.writeln('  qualifiedName: ${getFullyQualifiedName()}');
    buffer.writeln('  jsOutput: ${toJavaScript()}');
    buffer.write('}');

    return buffer.toString();
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EnumMemberAccessExpressionIR &&
          runtimeType == other.runtimeType &&
          source == other.source &&
          kind == other.kind;

  @override
  int get hashCode => source.hashCode ^ kind.hashCode;
}

