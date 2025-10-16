// lib/src/ir/ir_node.dart

import 'package:meta/meta.dart';

/// Base class for all IR (Intermediate Representation) nodes
/// 
/// Every piece of information extracted from Dart code is an IRNode.
/// This ensures consistent identity, traceability, and debugging across the system.
@immutable
abstract class IRNode {
  /// Unique identifier for this node (format: "type_uniqueKey")
  /// Examples: "widget_MyWidget_abc123", "method_build_def456"
  final String id;

  /// Where this node came from in the source code
  final SourceLocationIR sourceLocation;

  /// When this IR was created (milliseconds since epoch)
  final int createdAtMillis;

  /// Optional metadata for extensibility
  /// Can store analyzer directives, lint levels, custom data, etc.
  final Map<String, dynamic> metadata;

  const IRNode({
    required this.id,
    required this.sourceLocation,
    int? createdAtMillis,
    Map<String, dynamic>? metadata,
  })  : createdAtMillis = createdAtMillis ?? 0,
        metadata = metadata ?? const {};

  /// Human-readable representation for debugging
  String get debugName => runtimeType.toString();

  /// Short description of this node
  String toShortString() => '$debugName($id)';

  @override
  String toString() => toShortString();

  /// For testing: compare meaningful content (not identity)
  bool contentEquals(IRNode other) {
    if (runtimeType != other.runtimeType) return false;
    return id == other.id;
  }
}

/// Represents a physical location in source code
@immutable
class SourceLocationIR extends IRNode {
  /// Full path to the .dart file
  final String file;

  /// 1-based line number
  final int line;

  /// 1-based column number
  final int column;

  /// 0-based byte offset from start of file
  final int offset;

  /// Length of this element in bytes
  final int length;

   SourceLocationIR({
    required this.file,
    required this.line,
    required this.column,
    required this.offset,
    required this.length,
  }) : super(
    id: 'location_${file}_${line}_${column}',
    sourceLocation:  SourceLocationIR(
      file: '',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    ),
  );

  /// Create an empty/unknown location
  factory SourceLocationIR.unknown() {
    return  SourceLocationIR(
      file: '<unknown>',
      line: 0,
      column: 0,
      offset: 0,
      length: 0,
    );
  }

  /// Human-readable format: "path/to/file.dart:42:8"
  String get humanReadable => '$file:$line:$column';

  @override
  String toShortString() => humanReadable;

  @override
  bool contentEquals(IRNode other) {
    if (other is! SourceLocationIR) return false;
    return file == other.file &&
        line == other.line &&
        column == other.column &&
        offset == other.offset &&
        length == other.length;
  }

  factory SourceLocationIR.fromJson(Map<String, dynamic> json) {
    return SourceLocationIR(
      file: json['file'] as String,
      line: json['line'] as int,
      column: json['column'] as int,
      offset: json['offset'] as int,
      length: json['length'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'file': file,
      'line': line,
      'column': column,
      'offset': offset,
      'length': length,
    };
  }
}

/// Represents a problem found during analysis
@immutable
class AnalysisIssueIR extends IRNode {
  /// Severity level of this issue
  final IssueSeverity severity;

  /// What went wrong (human-readable message)
  final String message;

  /// Machine-readable issue code for IDE integration (e.g., "dart.unused_import")
  final String code;

  /// Suggested fix (if any)
  final String? suggestion;

  /// Related locations that provide context
  final List<SourceLocationIR> relatedLocations;

  /// This issue is a duplicate of another (for deduplication)
  final bool isDuplicate;

  const AnalysisIssueIR({
    required super.id,
    required this.severity,
    required this.message,
    required this.code,
    required super.sourceLocation,
    this.suggestion,
    this.relatedLocations = const [],
    this.isDuplicate = false,
  });

  /// Convenience constructor for errors
  factory AnalysisIssueIR.error({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
    String? suggestion,
  }) {
    return AnalysisIssueIR(
      id: id,
      severity: IssueSeverity.error,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
      suggestion: suggestion,
    );
  }

  /// Convenience constructor for warnings
  factory AnalysisIssueIR.warning({
    required String id,
    required String message,
    required String code,
    required SourceLocationIR sourceLocation,
  }) {
    return AnalysisIssueIR(
      id: id,
      severity: IssueSeverity.warning,
      message: message,
      code: code,
      sourceLocation: sourceLocation,
    );
  }

  @override
  String toShortString() => '[$severity] $message ($code)';

  @override
  bool contentEquals(IRNode other) {
    if (other is! AnalysisIssueIR) return false;
    return message == other.message &&
        code == other.code &&
        sourceLocation.contentEquals(other.sourceLocation);
  }
}

/// Severity levels for issues
enum IssueSeverity {
  error,      // Blocks execution or violates Dart rules
  warning,    // Likely bug or poor practice
  info,       // Suggestion for improvement
  hint,       // Low-priority note
}

// =============================================================================
// EXTENSION GUIDE: How to use IRNode in your AST Visitor
// =============================================================================

/*

BASIC PATTERN - Every IR class extends IRNode:

```dart
@immutable
class MyNodeIR extends IRNode {
  final String name;
  final int value;
  final List<OtherIR> children;

  const MyNodeIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.name,
    required this.value,
    required this.children,
    Map<String, dynamic>? metadata,
  }) : super(
    id: id,
    sourceLocation: sourceLocation,
    metadata: metadata,
  );

  @override
  String toShortString() => '$name($value)';

  @override
  bool contentEquals(IRNode other) {
    if (other is! MyNodeIR) return false;
    return name == other.name &&
        value == other.value &&
        children.length == other.children.length;
  }
}
```

VISITOR INTEGRATION:

In your EnhancedASTVisitor, create a helper for generating IDs:

```dart
class EnhancedASTVisitor extends RecursiveAstVisitor<void> {
  final FileAnalysisContext context;
  int _idCounter = 0;
  
  // Generate unique IDs
  String _generateId(String type, String name) {
    return '${type}_${name}_${++_idCounter}';
  }
  
  SourceLocationIR _sourceLocation(AstNode node) {
    final lineInfo = node.root.lineInfo;
    final location = lineInfo?.getLocation(node.offset);
    return SourceLocationIR(
      file: context.filePath,
      line: location?.lineNumber ?? 0,
      column: location?.columnNumber ?? 0,
      offset: node.offset,
      length: node.length,
    );
  }

  // Use when creating any IR node
  @override
  void visitClassDeclaration(ClassDeclaration node) {
    final classId = _generateId('class', node.name.lexeme);
    final sourceLoc = _sourceLocation(node);
    
    final classIR = ClassIR(
      id: classId,
      sourceLocation: sourceLoc,
      name: node.name.lexeme,
      // ... other fields
    );
    
    builder.addClass(classIR);
  }
}
```

CREATING ISSUES DURING ANALYSIS:

```dart
// When you find a problem:
final issue = AnalysisIssueIR.error(
  id: 'issue_missing_dispose_${controller.id}',
  message: 'Controller "$controllerName" created but never disposed',
  code: 'flutter.missing_dispose',
  sourceLocation: controller.sourceLocation,
  suggestion: 'Add ${controllerName}.dispose() in the dispose() method',
);
builder.addIssue(issue);
```

TRAVERSING THE TREE:

Since all nodes extend IRNode, you can write generic visitors:

```dart
class IRValidator extends IRVisitor {
  void validateNode(IRNode node) {
    // Check all nodes have non-empty IDs
    if (node.id.isEmpty) {
      throw Exception('IRNode has empty id: ${node.runtimeType}');
    }
    
    // Check source location is reasonable
    if (node.sourceLocation.line < 0 || node.sourceLocation.column < 0) {
      throw Exception('Invalid source location: ${node.sourceLocation}');
    }
    
    // Continue traversing
    if (node is ParentNodeType) {
      for (final child in node.children) {
        validateNode(child);
      }
    }
  }
}
```

SERIALIZATION (Binary & JSON):

Since every node is an IRNode with consistent structure:

```dart
// Pseudo-code for binary writer
void _writeIRNode(IRNode node) {
  // Every node has these:
  _writeString(node.id);
  _writeSourceLocation(node.sourceLocation);
  _writeInt64(node.createdAtMillis);
  _writeMetadata(node.metadata);
  
  // Then type-specific data
  if (node is ClassIR) {
    _writeString(node.name);
    _writeInt32(node.fields.length);
    for (final field in node.fields) {
      _writeIRNode(field);  // Recursive!
    }
  }
}
```

EXAMPLE: Complete Widget IR:

```dart
@immutable
class WidgetIR extends IRNode {
  final String name;
  final WidgetType type;  // stateless, stateful, inherited, etc.
  final List<PropertyIR> properties;
  final List<MethodIR> methods;
  final ConstructorIR? constructor;
  final BuildMethodIR? buildMethod;
  final List<AnnotationIR> annotations;

  const WidgetIR({
    required String id,
    required SourceLocationIR sourceLocation,
    required this.name,
    required this.type,
    required this.properties,
    required this.methods,
    this.constructor,
    this.buildMethod,
    this.annotations = const [],
    Map<String, dynamic>? metadata,
  }) : super(
    id: id,
    sourceLocation: sourceLocation,
    metadata: metadata,
  );

  @override
  String toShortString() => '$name($type)';

  @override
  bool contentEquals(IRNode other) {
    if (other is! WidgetIR) return false;
    return name == other.name && type == other.type;
  }

  /// For IDE tooltips
  String get documentation {
    final methodDocs = methods.where((m) => m.name == 'build').firstOrNull?.documentation;
    return methodDocs ?? '// Widget: $name';
  }
}
```

*/