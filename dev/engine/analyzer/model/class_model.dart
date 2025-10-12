// lib/src/ir/widget/widget_ir.dart

import 'dart:convert';

import 'sate.dart';

/// Represents a Flutter Widget in Declaration  form
class WidgetDeclaration  {
  final String id;
  final String name;
  final String filePath;
  final WidgetType type;
  final String? superClass;
  final List<WidgetPropertyDeclaration > properties;
  final List<WidgetMethodDeclaration > methods;
  final BuildMethodDeclaration ? buildMethod;
  final List<String> mixins;
  final List<String> interfaces;
  final bool isStateful;
  final String? stateClassName;
  final SourceLocation location;
  final String? documentation;

  WidgetDeclaration ({
    required this.id,
    required this.name,
    required this.filePath,
    required this.type,
    this.superClass,
    this.properties = const [],
    this.methods = const [],
    this.buildMethod,
    this.mixins = const [],
    this.interfaces = const [],
    this.isStateful = false,
    this.stateClassName,
    required this.location,
    this.documentation,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'filePath': filePath,
    'type': type.toString(),
    'superClass': superClass,
    'properties': properties.map((p) => p.toJson()).toList(),
    'methods': methods.map((m) => m.toJson()).toList(),
    'buildMethod': buildMethod?.toJson(),
    'mixins': mixins,
    'interfaces': interfaces,
    'isStateful': isStateful,
    'stateClassName': stateClassName,
    'location': location.toJson(),
    'documentation': documentation,
  };
  factory WidgetDeclaration.fromJson(Map<String, dynamic> json) {
    return WidgetDeclaration(
      id: json['id'],
      name: json['name'],
      filePath: json['filePath'],
      type: WidgetType.values.firstWhere(
        (t) => t.toString() == json['type'],
        orElse: () => WidgetType.customWidget,
      ),
      superClass: json['superClass'],
      properties: (json['properties'] as List?)
          ?.map((p) => WidgetPropertyDeclaration.fromJson(p))
          .toList() ?? [],
      methods: (json['methods'] as List?)
          ?.map((m) => WidgetMethodDeclaration.fromJson(m))
          .toList() ?? [],
      buildMethod: json['buildMethod'] != null 
          ? BuildMethodDeclaration.fromJson(json['buildMethod']) 
          : null,
      mixins: (json['mixins'] as List?)?.cast<String>() ?? [],
      interfaces: (json['interfaces'] as List?)?.cast<String>() ?? [],
      isStateful: json['isStateful'] ?? false,
      stateClassName: json['stateClassName'],
      location: SourceLocation.fromJson(json['location']),
      documentation: json['documentation'],
    );
  }
 factory WidgetDeclaration.empty(String filePath) {
    return WidgetDeclaration(
      id: '',
      name: '',
      filePath: filePath,
      type: WidgetType.customWidget,
      location: SourceLocation(line: 0, column: 0, offset: 0),
    );
  }
}

enum WidgetType {
  statelessWidget,
  statefulWidget,
  inheritedWidget,
  customWidget,
}

class WidgetPropertyDeclaration  {
  final String name;
  final String type;
  final bool isFinal;
  final bool isRequired;
  final String? defaultValue;
  final SourceLocation location;

  WidgetPropertyDeclaration ({
    required this.name,
    required this.type,
    this.isFinal = false,
    this.isRequired = false,
    this.defaultValue,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'type': type,
    'isFinal': isFinal,
    'isRequired': isRequired,
    'defaultValue': defaultValue,
    'location': location.toJson(),
  };

  factory WidgetPropertyDeclaration.fromJson(Map<String, dynamic> json) {
    return WidgetPropertyDeclaration(
      name: json['name'],
      type: json['type'],
      isFinal: json['isFinal'] ?? false,
      isRequired: json['isRequired'] ?? false,
      defaultValue: json['defaultValue'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class WidgetMethodDeclaration  {
  final String name;
  final String returnType;
  final List<ParameterDeclaration > parameters;
  final List<StatementDeclaration > body;
  final SourceLocation location;

  WidgetMethodDeclaration ({
    required this.name,
    required this.returnType,
    this.parameters = const [],
    this.body = const [],
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'returnType': returnType,
    'parameters': parameters.map((p) => p.toJson()).toList(),
    'body': body.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };
  factory WidgetMethodDeclaration.fromJson(Map<String, dynamic> json) {
    return WidgetMethodDeclaration(
      name: json['name'],
      returnType: json['returnType'],
      parameters: (json['parameters'] as List?)
          ?.map((p) => ParameterDeclaration.fromJson(p))
          .toList() ?? [],
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class BuildMethodDeclaration  {
  final List<StatementDeclaration > body;
  final ExpressionDeclaration  returnWidget;
  final SourceLocation location;

  BuildMethodDeclaration ({
    required this.body,
    required this.returnWidget,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'body': body.map((s) => s.toJson()).toList(),
    'returnWidget': returnWidget.toJson(),
    'location': location.toJson(),
  };
  factory BuildMethodDeclaration.fromJson(Map<String, dynamic> json) {
    return BuildMethodDeclaration(
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      returnWidget: ExpressionDeclaration.fromJson(json['returnWidget']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// STATE CLASS Declaration 
// =============================================================================

class StateClassDeclaration  {
  final String id;
  final String name;
  final String widgetName;
  final String filePath;
  final List<StatePropertyDeclaration > stateVariables;
  final List<WidgetMethodDeclaration > methods;
  final InitStateDeclaration ? initState;
  final DisposeDeclaration ? dispose;
  final List<LifecycleMethodDeclaration > lifecycleMethods;
  final SourceLocation location;

  StateClassDeclaration ({
    required this.id,
    required this.name,
    required this.widgetName,
    required this.filePath,
    this.stateVariables = const [],
    this.methods = const [],
    this.initState,
    this.dispose,
    this.lifecycleMethods = const [],
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'widgetName': widgetName,
    'filePath': filePath,
    'stateVariables': stateVariables.map((s) => s.toJson()).toList(),
    'methods': methods.map((m) => m.toJson()).toList(),
    'initState': initState?.toJson(),
    'dispose': dispose?.toJson(),
    'lifecycleMethods': lifecycleMethods.map((l) => l.toJson()).toList(),
    'location': location.toJson(),
  };
  factory StateClassDeclaration.fromJson(Map<String, dynamic> json) {
    return StateClassDeclaration(
      id: json['id'],
      name: json['name'],
      widgetName: json['widgetName'],
      filePath: json['filePath'],
      stateVariables: (json['stateVariables'] as List?)
          ?.map((s) => StatePropertyDeclaration.fromJson(s))
          .toList() ?? [],
      methods: (json['methods'] as List?)
          ?.map((m) => WidgetMethodDeclaration.fromJson(m))
          .toList() ?? [],
      initState: json['initState'] != null 
          ? InitStateDeclaration.fromJson(json['initState']) 
          : null,
      dispose: json['dispose'] != null 
          ? DisposeDeclaration.fromJson(json['dispose']) 
          : null,
      lifecycleMethods: (json['lifecycleMethods'] as List?)
          ?.map((l) => LifecycleMethodDeclaration.fromJson(l))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class StatePropertyDeclaration  {
  final String name;
  final String type;
  final bool isMutable;
  final String? initialValue;
  final SourceLocation location;

  StatePropertyDeclaration ({
    required this.name,
    required this.type,
    this.isMutable = true,
    this.initialValue,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'type': type,
    'isMutable': isMutable,
    'initialValue': initialValue,
    'location': location.toJson(),
  };
  factory StatePropertyDeclaration.fromJson(Map<String, dynamic> json) {
    return StatePropertyDeclaration(
      name: json['name'],
      type: json['type'],
      isMutable: json['isMutable'] ?? true,
      initialValue: json['initialValue'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class InitStateDeclaration  {
  final List<StatementDeclaration > body;
  final SourceLocation location;

  InitStateDeclaration ({
    required this.body,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'body': body.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };
  factory InitStateDeclaration.fromJson(Map<String, dynamic> json) {
    return InitStateDeclaration(
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class DisposeDeclaration  {
  final List<StatementDeclaration > body;
  final SourceLocation location;

  DisposeDeclaration ({
    required this.body,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'body': body.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };
  factory DisposeDeclaration.fromJson(Map<String, dynamic> json) {
    return DisposeDeclaration(
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class LifecycleMethodDeclaration  {
  final String name;
  final List<StatementDeclaration > body;
  final SourceLocation location;

  LifecycleMethodDeclaration ({
    required this.name,
    required this.body,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'body': body.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };
  factory LifecycleMethodDeclaration.fromJson(Map<String, dynamic> json) {
    return LifecycleMethodDeclaration(
      name: json['name'],
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
  
}

// =============================================================================
// FUNCTION Declaration 
// =============================================================================

class FunctionDeclaration  {
  final String id;
  final String name;
  final String filePath;
  final String returnType;
  final List<ParameterDeclaration > parameters;
  final List<StatementDeclaration > body;
  final bool isAsync;
  final bool isGenerator;
  final FunctionType type;
  final SourceLocation location;
  final String? documentation;

  FunctionDeclaration ({
    required this.id,
    required this.name,
    required this.filePath,
    required this.returnType,
    this.parameters = const [],
    this.body = const [],
    this.isAsync = false,
    this.isGenerator = false,
    this.type = FunctionType.topLevel,
    required this.location,
    this.documentation,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'filePath': filePath,
    'returnType': returnType,
    'parameters': parameters.map((p) => p.toJson()).toList(),
    'body': body.map((s) => s.toJson()).toList(),
    'isAsync': isAsync,
    'isGenerator': isGenerator,
    'type': type.toString(),
    'location': location.toJson(),
    'documentation': documentation,
  };
  factory FunctionDeclaration.fromJson(Map<String, dynamic> json) {
    return FunctionDeclaration(
      id: json['id'],
      name: json['name'],
      filePath: json['filePath'],
      returnType: json['returnType'],
      parameters: (json['parameters'] as List?)
          ?.map((p) => ParameterDeclaration.fromJson(p))
          .toList() ?? [],
      body: (json['body'] as List?)
          ?.map((s) => StatementDeclaration.fromJson(s))
          .toList() ?? [],
      isAsync: json['isAsync'] ?? false,
      isGenerator: json['isGenerator'] ?? false,
      type: FunctionType.values.firstWhere(
        (t) => t.toString() == json['type'],
        orElse: () => FunctionType.topLevel,
      ),
      location: SourceLocation.fromJson(json['location']),
      documentation: json['documentation'],
    );
  }
}

enum FunctionType {
  topLevel,
  method,
  closure,
  callback,
}



// =============================================================================
// ROUTE Declaration 
// =============================================================================

class RouteDeclaration  {
  final String id;
  final String name;
  final String path;
  final String widgetName;
  final List<RouteParameterDeclaration > parameters;
  final RouteTransition? transition;
  final List<RouteGuardDeclaration > guards;
  final SourceLocation location;

  RouteDeclaration ({
    required this.id,
    required this.name,
    required this.path,
    required this.widgetName,
    this.parameters = const [],
    this.transition,
    this.guards = const [],
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'path': path,
    'widgetName': widgetName,
    'parameters': parameters.map((p) => p.toJson()).toList(),
    'transition': transition?.toJson(),
    'guards': guards.map((g) => g.toJson()).toList(),
    'location': location.toJson(),
  };
}

class RouteParameterDeclaration  {
  final String name;
  final String type;
  final bool isRequired;

  RouteParameterDeclaration ({
    required this.name,
    required this.type,
    this.isRequired = false,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'type': type,
    'isRequired': isRequired,
  };
}

class RouteTransition {
  final TransitionType type;
  final int durationMs;

  RouteTransition({
    required this.type,
    this.durationMs = 300,
  });

  Map<String, dynamic> toJson() => {
    'type': type.toString(),
    'durationMs': durationMs,
  };
}

enum TransitionType {
  fade,
  slide,
  scale,
  rotate,
  none,
}

class RouteGuardDeclaration  {
  final String name;
  final String condition;

  RouteGuardDeclaration ({
    required this.name,
    required this.condition,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'condition': condition,
  };
}

// =============================================================================
// ANIMATION Declaration 
// =============================================================================

class AnimationDeclaration  {
  final String id;
  final String name;
  final String filePath;
  final AnimationType type;
  final int durationMs;
  final String curve;
  final List<AnimationKeyframeDeclaration > keyframes;
  final SourceLocation location;

  AnimationDeclaration ({
    required this.id,
    required this.name,
    required this.filePath,
    required this.type,
    this.durationMs = 300,
    this.curve = 'linear',
    this.keyframes = const [],
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'filePath': filePath,
    'type': type.toString(),
    'durationMs': durationMs,
    'curve': curve,
    'keyframes': keyframes.map((k) => k.toJson()).toList(),
    'location': location.toJson(),
  };
}

enum AnimationType {
  tween,
  physics,
  controller,
  implicit,
}

class AnimationKeyframeDeclaration  {
  final double time;
  final Map<String, dynamic> values;

  AnimationKeyframeDeclaration ({
    required this.time,
    required this.values,
  });

  Map<String, dynamic> toJson() => {
    'time': time,
    'values': values,
  };
}

// =============================================================================
// PROVIDER Declaration 
// =============================================================================

class ProviderDeclaration  {
  final String id;
  final String name;
  final String filePath;
  final ProviderType type;
  final String valueType;
  final List<ProviderMethodDeclaration > methods;
  final List<StatePropertyDeclaration > state;
  final SourceLocation location;

  ProviderDeclaration ({
    required this.id,
    required this.name,
    required this.filePath,
    required this.type,
    required this.valueType,
    this.methods = const [],
    this.state = const [],
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'filePath': filePath,
    'type': type.toString(),
    'valueType': valueType,
    'methods': methods.map((m) => m.toJson()).toList(),
    'state': state.map((s) => s.toJson()).toList(),
    'location': location.toJson(),
  };

  factory ProviderDeclaration.empty(String filePath) {
    return ProviderDeclaration(
      id: '',
      name: '',
      filePath: filePath,
      type: ProviderType.changeNotifier,
      valueType: 'void',
      location: SourceLocation(line: 0, column: 0, offset: 0),
    );
  }
}

enum ProviderType {
  changeNotifier,
  valueNotifier,
  streamProvider,
  futureProvider,
  stateNotifier,
}

class ProviderMethodDeclaration  {
  final String name;
  final String returnType;
  final List<ParameterDeclaration > parameters;
  final bool notifiesListeners;

  ProviderMethodDeclaration ({
    required this.name,
    required this.returnType,
    this.parameters = const [],
    this.notifiesListeners = false,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'returnType': returnType,
    'parameters': parameters.map((p) => p.toJson()).toList(),
    'notifiesListeners': notifiesListeners,
  };
}

// =============================================================================
// IMPORT Declaration 
// =============================================================================

class ImportDeclaration  {
  final String uri;
  final String? prefix;
  final bool isDeferred;
  final List<String> showCombinators;
  final List<String> hideCombinators;
  final String filePath;
  final SourceLocation location;

  ImportDeclaration ({
    required this.uri,
    this.prefix,
    this.isDeferred = false,
    this.showCombinators = const [],
    this.hideCombinators = const [],
    required this.filePath,
    required this.location,
  });

  bool get isRelative =>
      !uri.startsWith('dart:') && !uri.startsWith('package:');
  bool get isPackageImport => uri.startsWith('package:');
  bool get isDartCoreImport => uri.startsWith('dart:');

  Map<String, dynamic> toJson() => {
    'uri': uri,
    'prefix': prefix,
    'isDeferred': isDeferred,
    'showCombinators': showCombinators,
    'hideCombinators': hideCombinators,
    'filePath': filePath,
    'location': location.toJson(),
  };
  factory ImportDeclaration.fromJson(Map<String, dynamic> json) {
    return ImportDeclaration(
      uri: json['uri'],
      prefix: json['prefix'],
      isDeferred: json['isDeferred'] ?? false,
      showCombinators: (json['showCombinators'] as List?)?.cast<String>() ?? [],
      hideCombinators: (json['hideCombinators'] as List?)?.cast<String>() ?? [],
      filePath: json['filePath'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// THEME Declaration 
// =============================================================================

class ThemeDeclaration  {
  final String id;
  final String name;
  final String filePath;
  final Map<String, ColorDeclaration > colors;
  final Map<String, TextStyleDeclaration > textStyles;
  final Map<String, double> spacing;
  final Map<String, double> borderRadius;
  final SourceLocation location;

  ThemeDeclaration ({
    required this.id,
    required this.name,
    required this.filePath,
    this.colors = const {},
    this.textStyles = const {},
    this.spacing = const {},
    this.borderRadius = const {},
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'filePath': filePath,
    'colors': colors.map((k, v) => MapEntry(k, v.toJson())),
    'textStyles': textStyles.map((k, v) => MapEntry(k, v.toJson())),
    'spacing': spacing,
    'borderRadius': borderRadius,
    'location': location.toJson(),
  };
}

class ColorDeclaration  {
  final int value;
  final String? name;

  ColorDeclaration ({
    required this.value,
    this.name,
  });

  Map<String, dynamic> toJson() => {
    'value': value,
    'name': name,
  };
}

class TextStyleDeclaration  {
  final String? fontFamily;
  final double? fontSize;
  final String? fontWeight;
  final ColorDeclaration ? color;

  TextStyleDeclaration ({
    this.fontFamily,
    this.fontSize,
    this.fontWeight,
    this.color,
  });

  Map<String, dynamic> toJson() => {
    'fontFamily': fontFamily,
    'fontSize': fontSize,
    'fontWeight': fontWeight,
    'color': color?.toJson(),
  };
}

// =============================================================================
// FILE Declaration 
// =============================================================================

class FileDeclaration  {
  final String filePath;
  final List<WidgetDeclaration > widgets;
  final List<StateClassDeclaration > stateClasses;
  final List<FunctionDeclaration > functions;
  final List<ClassDeclaration > classes;
  final List<ImportDeclaration > imports;
  final List<String> exports;
  final String? libraryName;
  final SourceLocation location;

  FileDeclaration ({
    required this.filePath,
    this.widgets = const [],
    this.stateClasses = const [],
    this.functions = const [],
    this.classes = const [],
    this.imports = const [],
    this.exports = const [],
    this.libraryName,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'filePath': filePath,
    'widgets': widgets.map((w) => w.toJson()).toList(),
    'stateClasses': stateClasses.map((s) => s.toJson()).toList(),
    'functions': functions.map((f) => f.toJson()).toList(),
    'classes': classes.map((c) => c.toJson()).toList(),
    'imports': imports.map((i) => i.toJson()).toList(),
    'exports': exports,
    'libraryName': libraryName,
    'location': location.toJson(),
  };

  // Binary serialization for caching
  List<int> toBinary() {
    // Implement binary serialization
    final jsonStr = jsonEncode(toJson());
    return utf8.encode(jsonStr);
  }

  static FileDeclaration  fromBinary(List<int> bytes) {
    // Implement binary deserialization
    final jsonStr = utf8.decode(bytes);
    final json = jsonDecode(jsonStr);
    return FileDeclaration .fromJson(json);
  }

  factory FileDeclaration .fromJson(Map<String, dynamic> json) {
    return FileDeclaration (
      filePath: json['filePath'],
      widgets: (json['widgets'] as List?)
          ?.map((w) => WidgetDeclaration.fromJson(w))
          .toList() ?? [],
      stateClasses: (json['stateClasses'] as List?)
          ?.map((s) => StateClassDeclaration.fromJson(s))
          .toList() ?? [],
      functions: (json['functions'] as List?)
          ?.map((f) => FunctionDeclaration.fromJson(f))
          .toList() ?? [],
      classes: (json['classes'] as List?)
          ?.map((c) => ClassDeclaration .fromJson(c))
          .toList() ?? [],
      imports: (json['imports'] as List?)
          ?.map((i) => ImportDeclaration .fromJson(i))
          .toList() ?? [],
      exports: (json['exports'] as List?)?.cast<String>() ?? [],
      libraryName: json['libraryName'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class ClassDeclaration  {
  final String id;
  final String name;
  final String filePath;
  final String? superClass;
  final List<String> mixins;
  final List<String> interfaces;
  final List<StatePropertyDeclaration > properties;
  final List<WidgetMethodDeclaration > methods;
  final SourceLocation location;

  ClassDeclaration ({
    required this.id,
    required this.name,
    required this.filePath,
    this.superClass,
    this.mixins = const [],
    this.interfaces = const [],
    this.properties = const [],
    this.methods = const [],
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'filePath': filePath,
    'superClass': superClass,
    'mixins': mixins,
    'interfaces': interfaces,
    'properties': properties.map((p) => p.toJson()).toList(),
    'methods': methods.map((m) => m.toJson()).toList(),
    'location': location.toJson(),
  };

  factory ClassDeclaration .fromJson(Map<String, dynamic> json) {
    return ClassDeclaration (
      id: json['id'],
      name: json['name'],
      filePath: json['filePath'],
      superClass: json['superClass'],
      mixins: (json['mixins'] as List?)?.cast<String>() ?? [],
      interfaces: (json['interfaces'] as List?)?.cast<String>() ?? [],
      properties: (json['properties'] as List?)
          ?.map((p) => StatePropertyDeclaration .fromJson(p))
          .toList() ?? [],
      methods: (json['methods'] as List?)
          ?.map((m) => WidgetMethodDeclaration .fromJson(m))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// =============================================================================
// SOURCE LOCATION
// =============================================================================

class SourceLocation {
  final int line;
  final int column;
  final int offset;
  final int length;

  SourceLocation({
    required this.line,
    required this.column,
    required this.offset,
    this.length = 0,
  });

  Map<String, dynamic> toJson() => {
    'line': line,
    'column': column,
    'offset': offset,
    'length': length,
  };

  factory SourceLocation.fromJson(Map<String, dynamic> json) {
    return SourceLocation(
      line: json['line'],
      column: json['column'],
      offset: json['offset'],
      length: json['length'] ?? 0,
    );
  }
}

// =============================================================================
// fromJson factory methods for other classes
// =============================================================================

extension WidgetDeclarationFromJson on WidgetDeclaration {
  static WidgetDeclaration fromJson(Map<String, dynamic> json) {
    return WidgetDeclaration(
      id: json['id'],
      name: json['name'],
      filePath: json['filePath'],
      type: WidgetType.values.firstWhere(
        (t) => t.toString() == json['type'],
        orElse: () => WidgetType.customWidget,
      ),
      superClass: json['superClass'],
      properties: (json['properties'] as List?)
          ?.map((p) => WidgetPropertyDeclaration.fromJson(p))
          .toList() ?? [],
      methods: (json['methods'] as List?)
          ?.map((m) => WidgetMethodDeclaration.fromJson(m))
          .toList() ?? [],
      buildMethod: json['buildMethod'] != null 
          ? BuildMethodDeclaration.fromJson(json['buildMethod']) 
          : null,
      mixins: (json['mixins'] as List?)?.cast<String>() ?? [],
      interfaces: (json['interfaces'] as List?)?.cast<String>() ?? [],
      isStateful: json['isStateful'] ?? false,
      stateClassName: json['stateClassName'],
      location: SourceLocation.fromJson(json['location']),
      documentation: json['documentation'],
    );
  }
}

extension StateClassDeclarationFromJson on StateClassDeclaration {
  static StateClassDeclaration fromJson(Map<String, dynamic> json) {
    return StateClassDeclaration(
      id: json['id'],
      name: json['name'],
      widgetName: json['widgetName'],
      filePath: json['filePath'],
      stateVariables: (json['stateVariables'] as List?)
          ?.map((s) => StatePropertyDeclaration.fromJson(s))
          .toList() ?? [],
      methods: (json['methods'] as List?)
          ?.map((m) => WidgetMethodDeclaration.fromJson(m))
          .toList() ?? [],
      initState: json['initState'] != null 
          ? InitStateDeclaration.fromJson(json['initState']) 
          : null,
      dispose: json['dispose'] != null 
          ? DisposeDeclaration.fromJson(json['dispose']) 
          : null,
      lifecycleMethods: (json['lifecycleMethods'] as List?)
          ?.map((l) => LifecycleMethodDeclaration.fromJson(l))
          .toList() ?? [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension FunctionDeclarationFromJson on FunctionDeclaration {
  static FunctionDeclaration fromJson(Map<String, dynamic> json) {
    return FunctionDeclaration(
      id: json['id'],
      name: json['name'],
      filePath: json['filePath'],
      returnType: json['returnType'],
      parameters: (json['parameters'] as List?)
          ?.map((p) => ParameterDeclaration.fromJson(p))
          .toList() ?? [],
      body: [], // Body would need custom deserialization
      isAsync: json['isAsync'] ?? false,
      isGenerator: json['isGenerator'] ?? false,
      type: FunctionType.values.firstWhere(
        (t) => t.toString() == json['type'],
        orElse: () => FunctionType.topLevel,
      ),
      location: SourceLocation.fromJson(json['location']),
      documentation: json['documentation'],
    );
  }
}

// Add fromJson for remaining classes
extension ImportDeclarationFromJson on ImportDeclaration {
  static ImportDeclaration fromJson(Map<String, dynamic> json) {
    return ImportDeclaration(
      uri: json['uri'],
      prefix: json['prefix'],
      isDeferred: json['isDeferred'] ?? false,
      showCombinators: (json['showCombinators'] as List?)?.cast<String>() ?? [],
      hideCombinators: (json['hideCombinators'] as List?)?.cast<String>() ?? [],
      filePath: json['filePath'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

// Helper fromJson methods for nested classes
extension WidgetPropertyDeclarationFromJson on WidgetPropertyDeclaration {
  static WidgetPropertyDeclaration fromJson(Map<String, dynamic> json) {
    return WidgetPropertyDeclaration(
      name: json['name'],
      type: json['type'],
      isFinal: json['isFinal'] ?? false,
      isRequired: json['isRequired'] ?? false,
      defaultValue: json['defaultValue'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension WidgetMethodDeclarationFromJson on WidgetMethodDeclaration {
  static WidgetMethodDeclaration fromJson(Map<String, dynamic> json) {
    return WidgetMethodDeclaration(
      name: json['name'],
      returnType: json['returnType'],
      parameters: (json['parameters'] as List?)
          ?.map((p) => ParameterDeclaration.fromJson(p))
          .toList() ?? [],
      body: [], // Would need custom deserialization
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension ParameterDeclarationFromJson on ParameterDeclaration {
  static ParameterDeclaration fromJson(Map<String, dynamic> json) {
    return ParameterDeclaration(
      name: json['name'],
      type: json['type'],
      isRequired: json['isRequired'] ?? false,
      isNamed: json['isNamed'] ?? false,
      defaultValue: json['defaultValue'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension StatePropertyDeclarationFromJson on StatePropertyDeclaration {
  static StatePropertyDeclaration fromJson(Map<String, dynamic> json) {
    return StatePropertyDeclaration(
      name: json['name'],
      type: json['type'],
      isMutable: json['isMutable'] ?? true,
      initialValue: json['initialValue'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension BuildMethodDeclarationFromJson on BuildMethodDeclaration {
  static BuildMethodDeclaration fromJson(Map<String, dynamic> json) {
    return BuildMethodDeclaration(
      body: [], // Would need custom deserialization
      returnWidget: ExpressionDeclaration.fromJson(json['returnWidget']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension InitStateDeclarationFromJson on InitStateDeclaration {
  static InitStateDeclaration fromJson(Map<String, dynamic> json) {
    return InitStateDeclaration(
      body: [], // Would need custom deserialization
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension DisposeDeclarationFromJson on DisposeDeclaration {
  static DisposeDeclaration fromJson(Map<String, dynamic> json) {
    return DisposeDeclaration(
      body: [], // Would need custom deserialization
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

extension LifecycleMethodDeclarationFromJson on LifecycleMethodDeclaration {
  static LifecycleMethodDeclaration fromJson(Map<String, dynamic> json) {
    return LifecycleMethodDeclaration(
      name: json['name'],
      body: [], // Would need custom deserialization
      location: SourceLocation.fromJson(json['location']),
    );
  }
}