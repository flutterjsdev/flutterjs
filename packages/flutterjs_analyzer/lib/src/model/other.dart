import 'dart:convert';

import 'core.dart';
import 'state.dart';
import 'widget.dart';

class FileDeclaration {
  final String filePath;
  final List<WidgetDeclaration> widgets;
  final List<StateClassDeclaration> stateClasses;
  final List<FunctionDeclaration> functions;
  final List<ClassDeclaration> classes;
  final List<ImportDeclaration> imports;
  final List<String> exports;
  final String? libraryName;
  final SourceLocation location;

  FileDeclaration({
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

  static FileDeclaration fromBinary(List<int> bytes) {
    // Implement binary deserialization
    final jsonStr = utf8.decode(bytes);
    final json = jsonDecode(jsonStr);
    return FileDeclaration.fromJson(json);
  }

  factory FileDeclaration.fromJson(Map<String, dynamic> json) {
    return FileDeclaration(
      filePath: json['filePath'],
      widgets:
          (json['widgets'] as List?)
              ?.map((w) => WidgetDeclaration.fromJson(w))
              .toList() ??
          [],
      stateClasses:
          (json['stateClasses'] as List?)
              ?.map((s) => StateClassDeclaration.fromJson(s))
              .toList() ??
          [],
      functions:
          (json['functions'] as List?)
              ?.map((f) => FunctionDeclaration.fromJson(f))
              .toList() ??
          [],
      classes:
          (json['classes'] as List?)
              ?.map((c) => ClassDeclaration.fromJson(c))
              .toList() ??
          [],
      imports:
          (json['imports'] as List?)
              ?.map((i) => ImportDeclaration.fromJson(i))
              .toList() ??
          [],
      exports: (json['exports'] as List?)?.cast<String>() ?? [],
      libraryName: json['libraryName'],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class RouteDeclaration {
  final String id;
  final String name;
  final String path;
  final String widgetName;
  final List<RouteParameterDeclaration> parameters;
  final RouteTransition? transition;
  final List<RouteGuardDeclaration> guards;
  final SourceLocation location;

  RouteDeclaration({
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

class RouteParameterDeclaration {
  final String name;
  final String type;
  final bool isRequired;

  RouteParameterDeclaration({
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

  RouteTransition({required this.type, this.durationMs = 300});

  Map<String, dynamic> toJson() => {
    'type': type.toString(),
    'durationMs': durationMs,
  };
}

enum TransitionType { fade, slide, scale, rotate, none }

class RouteGuardDeclaration {
  final String name;
  final String condition;

  RouteGuardDeclaration({required this.name, required this.condition});

  Map<String, dynamic> toJson() => {'name': name, 'condition': condition};
}

class ProviderDeclaration {
  final String id;
  final String name;
  final String filePath;
  final ProviderType type;
  final String valueType;
  final List<ProviderMethodDeclaration> methods;
  final List<StatePropertyDeclaration> state;
  final SourceLocation location;

  ProviderDeclaration({
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

class ProviderMethodDeclaration {
  final String name;
  final String returnType;
  final List<ParameterDeclaration> parameters;
  final bool notifiesListeners;

  ProviderMethodDeclaration({
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

class ParameterDeclaration {
  final String name;
  final String type;
  final bool isRequired;
  final bool isNamed;
  final String? defaultValue;
  final SourceLocation location;

  ParameterDeclaration({
    required this.name,
    required this.type,
    this.isRequired = false,
    this.isNamed = false,
    this.defaultValue,
    required this.location,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'type': type,
    'isRequired': isRequired,
    'isNamed': isNamed,
    'defaultValue': defaultValue,
    'location': location.toJson(),
  };

  factory ParameterDeclaration.fromJson(Map<String, dynamic> json) {
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

class ImportDeclaration {
  final String uri;
  final String? prefix;
  final bool isDeferred;
  final List<String> showCombinators;
  final List<String> hideCombinators;
  final String filePath;
  final SourceLocation location;

  ImportDeclaration({
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

class ThemeDeclaration {
  final String id;
  final String name;
  final String filePath;
  final Map<String, ColorDeclaration> colors;
  final Map<String, TextStyleDeclaration> textStyles;
  final Map<String, double> spacing;
  final Map<String, double> borderRadius;
  final SourceLocation location;

  ThemeDeclaration({
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

class ColorDeclaration {
  final int value;
  final String? name;

  ColorDeclaration({required this.value, this.name});

  Map<String, dynamic> toJson() => {'value': value, 'name': name};
}

class TextStyleDeclaration {
  final String? fontFamily;
  final double? fontSize;
  final String? fontWeight;
  final ColorDeclaration? color;

  TextStyleDeclaration({
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
