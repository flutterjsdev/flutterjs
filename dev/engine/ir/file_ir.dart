// lib/src/ir/file_ir.dart

import 'dart:typed_data';

import '../BinaryConstants/binary_constants.dart';
import '../analyzer/analying_project.dart';
import 'Statement/statement_ir.dart';
import 'widget/widget_ir.dart';
import 'Expression/expression_ir.dart';

/// Represents the complete IR for a single Dart file
/// 
/// This is the main output of the per-file analysis phase and contains
/// all extracted information about widgets, classes, functions, etc.
class FileIR {
  /// Absolute path to the source file
  final String filePath;
  
  /// All widgets (StatelessWidget and StatefulWidget) defined in this file
  final List<WidgetIR> widgets;
  
  /// All State classes defined in this file
  final List<StateClassIR> stateClasses;
  
  /// Regular classes (models, utilities, etc.) defined in this file
  final List<ClassIR> classes;
  
  /// Top-level and class methods defined in this file
  final List<FunctionIR> functions;
  
  /// Provider classes (ChangeNotifier, etc.) defined in this file
  final List<ProviderIR> providers;
  
  /// All import directives in this file
  final List<ImportInfo> imports;
  
  /// All export directives in this file
  final List<String> exports;
  
  /// File-level metadata (comments, annotations, etc.)
  final FileMetadata metadata;
  
  /// Hash of the file content (for incremental compilation)
  final String contentHash;
  
  /// Analysis errors and warnings found in this file
  final List<AnalysisIssue> issues;
  
  /// Dependencies on other files (resolved import paths)
  final List<String> dependencies;
  
  /// Files that depend on this file
  final List<String> dependents;

  FileIR({
    required this.filePath,
    required this.widgets,
    required this.stateClasses,
    required this.classes,
    required this.functions,
    required this.providers,
    required this.imports,
    required this.exports,
    required this.metadata,
    required this.contentHash,
    this.issues = const [],
    this.dependencies = const [],
    this.dependents = const [],
  });

  // ==========================================================================
  // CONVENIENCE GETTERS
  // ==========================================================================

  /// Get all type declarations in this file (widgets + classes)
  List<String> get typeDeclarations => [
    ...widgets.map((w) => w.name),
    ...stateClasses.map((s) => s.name),
    ...classes.map((c) => c.name),
    ...providers.map((p) => p.name),
  ];

  /// Check if this file defines a specific type
  bool definesType(String typeName) {
    return typeDeclarations.contains(typeName);
  }

  /// Get a widget by name
  WidgetIR? getWidget(String name) {
    return widgets.firstWhere(
      (w) => w.name == name,
      orElse: () => throw StateError('Widget $name not found'),
    );
  }

  /// Get a state class by name
  StateClassIR? getStateClass(String name) {
    return stateClasses.firstWhere(
      (s) => s.name == name,
      orElse: () => throw StateError('StateClass $name not found'),
    );
  }

  /// Get a class by name
  ClassIR? getClass(String name) {
    return classes.firstWhere(
      (c) => c.name == name,
      orElse: () => throw StateError('Class $name not found'),
    );
  }

  /// Check if this file has any errors
  bool get hasErrors => issues.any((i) => i.severity == IssueSeverity.error);

  /// Check if this file has any warnings
  bool get hasWarnings => issues.any((i) => i.severity == IssueSeverity.warning);

  /// Get all errors
  List<AnalysisIssue> get errors => 
      issues.where((i) => i.severity == IssueSeverity.error).toList();

  /// Get all warnings
  List<AnalysisIssue> get warnings => 
      issues.where((i) => i.severity == IssueSeverity.warning).toList();

  /// Check if this file imports a specific package or file
  bool isImports(String uri) {
    return imports.any((i) => i.uri == uri);
  }

  /// Check if this file exports anything
  bool get hasExports => exports.isNotEmpty;

  /// Get all stateful widgets (those with associated State classes)
  List<WidgetIR> get statefulWidgets => 
      widgets.where((w) => w.isStateful).toList();

  /// Get all stateless widgets
  List<WidgetIR> get statelessWidgets => 
      widgets.where((w) => !w.isStateful).toList();

  /// Get total count of all declarations
  int get declarationCount => 
      widgets.length + 
      stateClasses.length + 
      classes.length + 
      functions.length + 
      providers.length;

  // ==========================================================================
  // SERIALIZATION
  // ==========================================================================

  /// Serialize to binary format (for caching)
  Uint8List toBinary() {
    final writer = BinaryIRWriter();
    return writer.writeFileIR(this);
  }

  /// Deserialize from binary format
  static FileIR fromBinary(Uint8List bytes) {
    final reader = BinaryIRReader();
    return reader.readFileIR(bytes);
  }

  /// Convert to JSON (for debugging/inspection)
  Map<String, dynamic> toJson() {
    return {
      'filePath': filePath,
      'contentHash': contentHash,
      'metadata': metadata.toJson(),
      'widgets': widgets.map((w) => w.toJson()).toList(),
      'stateClasses': stateClasses.map((s) => s.toJson()).toList(),
      'classes': classes.map((c) => c.toJson()).toList(),
      'functions': functions.map((f) => f.toJson()).toList(),
      'providers': providers.map((p) => p.toJson()).toList(),
      'imports': imports.map((i) => i.toJson()).toList(),
      'exports': exports,
      'issues': issues.map((i) => i.toJson()).toList(),
      'dependencies': dependencies,
      'dependents': dependents,
      'statistics': {
        'widgetCount': widgets.length,
        'stateClassCount': stateClasses.length,
        'classCount': classes.length,
        'functionCount': functions.length,
        'providerCount': providers.length,
        'importCount': imports.length,
        'exportCount': exports.length,
        'errorCount': errors.length,
        'warningCount': warnings.length,
      },
    };
  }

  /// Create from JSON
  static FileIR fromJson(Map<String, dynamic> json) {
    return FileIR(
      filePath: json['filePath'] as String,
      contentHash: json['contentHash'] as String,
      metadata: FileMetadata.fromJson(json['metadata'] as Map<String, dynamic>),
      widgets: (json['widgets'] as List)
          .map((w) => WidgetIR.fromJson(w as Map<String, dynamic>))
          .toList(),
      stateClasses: (json['stateClasses'] as List)
          .map((s) => StateClassIR.fromJson(s as Map<String, dynamic>))
          .toList(),
      classes: (json['classes'] as List)
          .map((c) => ClassIR.fromJson(c as Map<String, dynamic>))
          .toList(),
      functions: (json['functions'] as List)
          .map((f) => FunctionIR.fromJson(f as Map<String, dynamic>))
          .toList(),
      providers: (json['providers'] as List)
          .map((p) => ProviderIR.fromJson(p as Map<String, dynamic>))
          .toList(),
      imports: (json['imports'] as List)
          .map((i) => ImportInfo.fromJson(i as Map<String, dynamic>))
          .toList(),
      exports: (json['exports'] as List).cast<String>(),
      issues: (json['issues'] as List)
          .map((i) => AnalysisIssue.fromJson(i as Map<String, dynamic>))
          .toList(),
      dependencies: (json['dependencies'] as List?)?.cast<String>() ?? [],
      dependents: (json['dependents'] as List?)?.cast<String>() ?? [],
    );
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /// Create a copy with updated fields
  FileIR copyWith({
    String? filePath,
    List<WidgetIR>? widgets,
    List<StateClassIR>? stateClasses,
    List<ClassIR>? classes,
    List<FunctionIR>? functions,
    List<ProviderIR>? providers,
    List<ImportInfo>? imports,
    List<String>? exports,
    FileMetadata? metadata,
    String? contentHash,
    List<AnalysisIssue>? issues,
    List<String>? dependencies,
    List<String>? dependents,
  }) {
    return FileIR(
      filePath: filePath ?? this.filePath,
      widgets: widgets ?? this.widgets,
      stateClasses: stateClasses ?? this.stateClasses,
      classes: classes ?? this.classes,
      functions: functions ?? this.functions,
      providers: providers ?? this.providers,
      imports: imports ?? this.imports,
      exports: exports ?? this.exports,
      metadata: metadata ?? this.metadata,
      contentHash: contentHash ?? this.contentHash,
      issues: issues ?? this.issues,
      dependencies: dependencies ?? this.dependencies,
      dependents: dependents ?? this.dependents,
    );
  }

  @override
  String toString() {
    return 'FileIR('
        'path: $filePath, '
        'widgets: ${widgets.length}, '
        'states: ${stateClasses.length}, '
        'classes: ${classes.length}, '
        'functions: ${functions.length}, '
        'providers: ${providers.length}, '
        'errors: ${errors.length}'
        ')';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is FileIR &&
            runtimeType == other.runtimeType &&
            filePath == other.filePath &&
            contentHash == other.contentHash;
  }

  @override
  int get hashCode => filePath.hashCode ^ contentHash.hashCode;
}

// ==========================================================================
// FILE METADATA
// ==========================================================================

/// Metadata about a file (comments, pragmas, etc.)
class FileMetadata {
  /// Top-level documentation comment
  final String? documentation;
  
  /// Library name (from library directive)
  final String? libraryName;
  
  /// Part directives
  final List<String> parts;
  
  /// Part-of directive (if this is a part file)
  final String? partOf;
  
  /// File-level annotations
  final List<AnnotationIR> annotations;
  
  /// Analysis timestamp
  final DateTime analyzedAt;
  
  /// Analyzer version used
  final String analyzerVersion;

  FileMetadata({
    this.documentation,
    this.libraryName,
    this.parts = const [],
    this.partOf,
    this.annotations = const [],
    DateTime? analyzedAt,
    this.analyzerVersion = '2.0.0',
  }) : analyzedAt = analyzedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'documentation': documentation,
    'libraryName': libraryName,
    'parts': parts,
    'partOf': partOf,
    'annotations': annotations.map((a) => a.toJson()).toList(),
    'analyzedAt': analyzedAt.toIso8601String(),
    'analyzerVersion': analyzerVersion,
  };

  static FileMetadata fromJson(Map<String, dynamic> json) {
    return FileMetadata(
      documentation: json['documentation'] as String?,
      libraryName: json['libraryName'] as String?,
      parts: (json['parts'] as List?)?.cast<String>() ?? [],
      partOf: json['partOf'] as String?,
      annotations: (json['annotations'] as List?)
          ?.map((a) => AnnotationIR.fromJson(a as Map<String, dynamic>))
          .toList() ?? [],
      analyzedAt: json['analyzedAt'] != null 
          ? DateTime.parse(json['analyzedAt'] as String)
          : DateTime.now(),
      analyzerVersion: json['analyzerVersion'] as String? ?? '2.0.0',
    );
  }
}

// ==========================================================================
// ANALYSIS ISSUE
// ==========================================================================

/// Represents an error, warning, or info found during analysis
class AnalysisIssue {
  final IssueSeverity severity;
  final String message;
  final String code;
  final SourceLocationIR location;
  final String? correction;
  final List<String> contextMessages;

  AnalysisIssue({
    required this.severity,
    required this.message,
    required this.code,
    required this.location,
    this.correction,
    this.contextMessages = const [],
  });

  bool get isError => severity == IssueSeverity.error;
  bool get isWarning => severity == IssueSeverity.warning;
  bool get isInfo => severity == IssueSeverity.info;

  Map<String, dynamic> toJson() => {
    'severity': severity.name,
    'message': message,
    'code': code,
    'location': location.toJson(),
    'correction': correction,
    'contextMessages': contextMessages,
  };

  static AnalysisIssue fromJson(Map<String, dynamic> json) {
    return AnalysisIssue(
      severity: IssueSeverity.values.firstWhere(
        (s) => s.name == json['severity'],
        orElse: () => IssueSeverity.info,
      ),
      message: json['message'] as String,
      code: json['code'] as String,
      location: SourceLocationIR.fromJson(
        json['location'] as Map<String, dynamic>,
      ),
      correction: json['correction'] as String?,
      contextMessages: (json['contextMessages'] as List?)?.cast<String>() ?? [],
    );
  }

  @override
  String toString() {
    return '${severity.name.toUpperCase()}: $message (${location.file}:${location.line}:${location.column})';
  }
}

enum IssueSeverity {
  error,
  warning,
  info,
  hint,
}

// ==========================================================================
// FILE IR BUILDER
// ==========================================================================

/// Builder class for constructing FileIR incrementally during analysis
class FileIRBuilder {
  final FileAnalysisContext context;
  
  final List<WidgetIR> _widgets = [];
  final List<StateClassIR> _stateClasses = [];
  final List<ClassIR> _classes = [];
  final List<FunctionIR> _functions = [];
  final List<ProviderIR> _providers = [];
  final List<ImportInfo> _imports = [];
  final List<String> _exports = [];
  final List<AnalysisIssue> _issues = [];
  
  String? _libraryName;
  String? _documentation;
  final List<String> _parts = [];
  String? _partOf;
  final List<AnnotationIR> _annotations = [];
  
  // Build method context tracking
  bool _inBuildMethod = false;
  final List<ConditionalBranchIR> _conditionalBranches = [];
  final List<IterationIR> _iterations = [];
  
  // ID generation
  int _idCounter = 0;

  FileIRBuilder(this.context);

  // ==========================================================================
  // ID GENERATION
  // ==========================================================================

  String generateId(String prefix) {
    return '${prefix}_${context.currentFile}_${_idCounter++}';
  }

  // ==========================================================================
  // ADDING DECLARATIONS
  // ==========================================================================

  void addWidget(WidgetIR widget) {
    _widgets.add(widget);
  }

  void addStateClass(StateClassIR stateClass) {
    _stateClasses.add(stateClass);
  }

  void addClass(ClassIR classIR) {
    _classes.add(classIR);
  }

  void addFunction(FunctionIR function) {
    _functions.add(function);
  }

  void addProvider(ProviderIR provider) {
    _providers.add(provider);
  }

  void addImport(ImportInfo import) {
    _imports.add(import);
  }

  void addExport(String export) {
    _exports.add(export);
  }

  void addIssue(AnalysisIssue issue) {
    _issues.add(issue);
  }

  // ==========================================================================
  // LIBRARY METADATA
  // ==========================================================================

  void setLibraryName(String name) {
    _libraryName = name;
  }

  void setDocumentation(String doc) {
    _documentation = doc;
  }

  void addPart(String part) {
    _parts.add(part);
  }

  void setPartOf(String partOf) {
    _partOf = partOf;
  }

  void addFileAnnotation(AnnotationIR annotation) {
    _annotations.add(annotation);
  }

  // ==========================================================================
  // BUILD METHOD TRACKING
  // ==========================================================================

  void enterBuildMethod() {
    _inBuildMethod = true;
    _conditionalBranches.clear();
    _iterations.clear();
  }

  void exitBuildMethod() {
    _inBuildMethod = false;
  }

  bool get isInBuildMethod => _inBuildMethod;

  void recordConditionalBranch({
    required ExpressionIR condition,
    required SourceLocationIR sourceLocation,
  }) {
    if (_inBuildMethod) {
      _conditionalBranches.add(ConditionalBranchIR(
        condition: condition,
        thenWidget: null, // Will be filled later
        elseWidget: null,
        type: ConditionalType.ifStatement,
      ));
    }
  }

  void addConditionalBranch(ConditionalBranchIR branch) {
    _conditionalBranches.add(branch);
  }

  void recordIteration({
    required IterationType type,
    required SourceLocationIR sourceLocation,
  }) {
    if (_inBuildMethod) {
      _iterations.add(IterationIR(
        type: type,
        iterable: null,
        builder: null,
        sourceLocation: sourceLocation,
      ));
    }
  }

  List<ConditionalBranchIR> getConditionalBranches() {
    return List.from(_conditionalBranches);
  }

  List<IterationIR> getIterations() {
    return List.from(_iterations);
  }

  // ==========================================================================
  // ANALYSIS TRACKING (for current method/class context)
  // ==========================================================================

  final List<SetStateCallIR> _currentSetStateCalls = [];
  final List<NavigationCallIR> _currentNavigationCalls = [];
  final List<AsyncOperationIR> _currentAsyncOps = [];
  final List<ControllerIR> _currentControllers = [];
  final List<ContextDependencyIR> _currentContextDeps = [];
  final List<ProviderUsageIR> _currentProviderUsages = [];
  final List<WidgetInstantiationIR> _currentWidgetInstantiations = [];
  final List<AnimationControllerIR> _currentAnimControllers = [];
  final List<AsyncBuilderIR> _currentAsyncBuilders = [];
  final List<MethodIR> _currentMethods = [];
  final List<LifecycleMethodIR> _currentLifecycleMethods = [];

  void addSetStateCall(SetStateCallIR call) {
    _currentSetStateCalls.add(call);
  }

  void addNavigationCall(NavigationCallIR call) {
    _currentNavigationCalls.add(call);
  }

  void addAsyncOperation(AsyncOperationIR op) {
    _currentAsyncOps.add(op);
  }

  void addController(ControllerIR controller) {
    _currentControllers.add(controller);
  }

  void addContextDependency(ContextDependencyIR dep) {
    _currentContextDeps.add(dep);
  }

  void addProviderUsage(ProviderUsageIR usage) {
    _currentProviderUsages.add(usage);
  }

  void addWidgetInstantiation(WidgetInstantiationIR instantiation) {
    _currentWidgetInstantiations.add(instantiation);
  }

  void addAnimationController(AnimationControllerIR controller) {
    _currentAnimControllers.add(controller);
  }

  void addAsyncBuilder(AsyncBuilderIR builder) {
    _currentAsyncBuilders.add(builder);
  }

  void addMethod(MethodIR method) {
    _currentMethods.add(method);
  }

  void addLifecycleMethod(LifecycleMethodIR method) {
    _currentLifecycleMethods.add(method);
  }

  void addCallbackToCurrentMethod(FunctionExpressionIR callback) {
    // Store callback for later association with method
    // Implementation depends on how you track method context
  }

  void recordStateVariableAccess(String name, SourceLocationIR location) {
    // Track state variable access for reactivity analysis
  }

  // ==========================================================================
  // BUILD FINAL IR
  // ==========================================================================

  /// Build the final FileIR from collected data
  FileIR build() {
    return FileIR(
      filePath: context.currentFile,
      widgets: List.from(_widgets),
      stateClasses: List.from(_stateClasses),
      classes: List.from(_classes),
      functions: List.from(_functions),
      providers: List.from(_providers),
      imports: List.from(_imports),
      exports: List.from(_exports),
      metadata: FileMetadata(
        documentation: _documentation,
        libraryName: _libraryName,
        parts: List.from(_parts),
        partOf: _partOf,
        annotations: List.from(_annotations),
      ),
      contentHash: _computeContentHash(),
      issues: List.from(_issues),
      dependencies: context.getDependencies(),
      dependents: context.getDependents(),
    );
  }

  String _computeContentHash() {
    // This would typically use the file's actual content hash
    // For now, return a placeholder
    return 'hash_${DateTime.now().millisecondsSinceEpoch}';
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /// Validate the built IR for consistency
  List<String> validate() {
    final errors = <String>[];

    // Check that all stateful widgets have corresponding State classes
    for (final widget in _widgets.where((w) => w.isStateful)) {
      final stateClassName = widget.stateBinding?.stateClassName;
      if (stateClassName != null) {
        final hasState = _stateClasses.any((s) => s.name == stateClassName);
        if (!hasState) {
          errors.add(
            'StatefulWidget ${widget.name} references State class '
            '$stateClassName which is not found in this file',
          );
        }
      }
    }

    // Check that State classes reference valid widgets
    for (final state in _stateClasses) {
      final widgetType = state.widgetType;
      final hasWidget = _widgets.any((w) => w.name == widgetType);
      if (!hasWidget && widgetType != 'UnknownWidget') {
        errors.add(
          'State class ${state.name} references widget $widgetType '
          'which is not found in this file',
        );
      }
    }

    // Validate imports
    for (final import in _imports) {
      if (import.uri.isEmpty) {
        errors.add('Import with empty URI found');
      }
    }

    return errors;
  }
}

// ==========================================================================
// SOURCE LOCATION IR
// ==========================================================================

/// Represents a location in source code
class SourceLocationIR {
  final String file;
  final int line;
  final int column;
  final int offset;
  final int length;

  SourceLocationIR({
    required this.file,
    required this.line,
    required this.column,
    required this.offset,
    required this.length,
  });

  Map<String, dynamic> toJson() => {
    'file': file,
    'line': line,
    'column': column,
    'offset': offset,
    'length': length,
  };
  

  static SourceLocationIR fromJson(Map<String, dynamic> json) {
    return SourceLocationIR(
      file: json['file'] as String,
      line: json['line'] as int,
      column: json['column'] as int,
      offset: json['offset'] as int,
      length: json['length'] as int,
    );
  }

  @override
  String toString() => '$file:$line:$column';
}

// ==========================================================================
// HELPER IR CLASSES
// ==========================================================================

/// Represents conditional rendering in widget tree
class ConditionalBranchIR {
  final ExpressionIR condition;
  final WidgetNodeIR? thenWidget;
  final WidgetNodeIR? elseWidget;
  final ConditionalType type;

  ConditionalBranchIR({
    required this.condition,
    this.thenWidget,
    this.elseWidget,
    required this.type,
  });

  Map<String, dynamic> toJson() => {
    'condition': condition.toJson(),
    'thenWidget': thenWidget?.toJson(),
    'elseWidget': elseWidget?.toJson(),
    'type': type.name,
  };
}

enum ConditionalType {
  ifStatement,
  ternary,
  switchCase,
}

/// Represents iteration (lists, maps) in widget tree
class IterationIR {
  final IterationType type;
  final ExpressionIR? iterable;
  final ExpressionIR? builder;
  final SourceLocationIR sourceLocation;

  IterationIR({
    required this.type,
    this.iterable,
    this.builder,
    required this.sourceLocation,
  });

  Map<String, dynamic> toJson() => {
    'type': type.name,
    'iterable': iterable?.toJson(),
    'builder': builder?.toJson(),
    'sourceLocation': sourceLocation.toJson(),
  };
}

enum IterationType {
  forLoop,
  forEachLoop,
  mapMethod,
  listBuilder,
  gridBuilder,
}

/// Represents a widget node in the widget tree
class WidgetNodeIR {
  final String id;
  final String widgetType;
  final Map<String, ExpressionIR> properties;
  final List<WidgetNodeIR> children;
  final KeyIR? key;
  final bool isConst;
  

  WidgetNodeIR({
    required this.id,
    required this.widgetType,
    required this.properties,
    required this.children,
    this.key,
    required this.isConst,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'widgetType': widgetType,
    'properties': properties.map((k, v) => MapEntry(k, v.toJson())),
    'children': children.map((c) => c.toJson()).toList(),
    'key': key?.toJson(),
    'isConst': isConst,
  };
  factory WidgetNodeIR.fromJson(Map<String, dynamic> json) {
    return WidgetNodeIR(
      id: json['id'] as String,
      widgetType: json['widgetType'] as String,
      properties: (json['properties'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(k, ExpressionIR.fromJson(v as Map<String, dynamic>)),
      ),
      children: (json['children'] as List)
          .map((c) => WidgetNodeIR.fromJson(c as Map<String, dynamic>))
          .toList(),
      key: json['key'] != null 
          ? KeyIR.fromJson(json['key'] as Map<String, dynamic>) 
          : null,
      isConst: json['isConst'] as bool,
    );
  }

}