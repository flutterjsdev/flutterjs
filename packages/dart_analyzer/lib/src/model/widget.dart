// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'core.dart';
import 'other.dart';
import 'state.dart';

/// Represents a Flutter Widget in Declaration  form
class WidgetDeclaration {
  final String id;
  final String name;
  final String filePath;
  final WidgetType type;
  final String? superClass;
  final List<WidgetPropertyDeclaration> properties;
  final List<WidgetMethodDeclaration> methods;
  final BuildMethodDeclaration? buildMethod;
  final List<String> mixins;
  final List<String> interfaces;
  final bool isStateful;
  final String? stateClassName;
  final SourceLocation location;
  final String? documentation;

  WidgetDeclaration({
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
      properties:
          (json['properties'] as List?)
              ?.map((p) => WidgetPropertyDeclaration.fromJson(p))
              .toList() ??
          [],
      methods:
          (json['methods'] as List?)
              ?.map((m) => WidgetMethodDeclaration.fromJson(m))
              .toList() ??
          [],
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

class WidgetMethodDeclaration {
  final String name;
  final String returnType;
  final List<ParameterDeclaration> parameters;
  final List<StatementDeclaration> body;
  final SourceLocation location;

  WidgetMethodDeclaration({
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
      parameters:
          (json['parameters'] as List?)
              ?.map((p) => ParameterDeclaration.fromJson(p))
              .toList() ??
          [],
      body:
          (json['body'] as List?)
              ?.map((s) => StatementDeclaration.fromJson(s))
              .toList() ??
          [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

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
      properties:
          (json['properties'] as List?)
              ?.map((p) => WidgetPropertyDeclaration.fromJson(p))
              .toList() ??
          [],
      methods:
          (json['methods'] as List?)
              ?.map((m) => WidgetMethodDeclaration.fromJson(m))
              .toList() ??
          [],
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

abstract class StatementDeclaration {
  final StatementType type;
  final SourceLocation location;

  StatementDeclaration({required this.type, required this.location});

  Map<String, dynamic> toJson();

  factory StatementDeclaration.fromJson(Map<String, dynamic> json) {
    final type = StatementType.values.firstWhere(
      (t) => t.toString() == json['type'],
      orElse: () => StatementType.unknown,
    );

    switch (type) {
      case StatementType.variableDeclaration:
        return VariableDeclarationDeclaration.fromJson(json);
      case StatementType.expressionStatement:
        return ExpressionStatementDeclaration.fromJson(json);
      case StatementType.returnStatement:
        return ReturnStatementDeclaration.fromJson(json);
      case StatementType.ifStatement:
        return IfStatementDeclaration.fromJson(json);
      case StatementType.forStatement:
        return ForStatementDeclaration.fromJson(json);
      case StatementType.whileStatement:
        return WhileStatementDeclaration.fromJson(json);
      case StatementType.switchStatement:
        return SwitchStatementDeclaration.fromJson(json);
      case StatementType.tryStatement:
        return TryStatementDeclaration.fromJson(json);
      case StatementType.block:
        return BlockStatementDeclaration.fromJson(json);
      case StatementType.breakStatement:
        return BreakStatementDeclaration.fromJson(json);
      case StatementType.continueStatement:
        return ContinueStatementDeclaration.fromJson(json);
      case StatementType.throwStatement:
        return ThrowStatementDeclaration.fromJson(json);
      case StatementType.assertStatement:
        return AssertStatementDeclaration.fromJson(json);
      default:
        throw UnimplementedError('Unknown statement type: $type');
    }
  }
}

class WidgetPropertyDeclaration {
  final String name;
  final String type;
  final bool isFinal;
  final bool isRequired;
  final String? defaultValue;
  final SourceLocation location;

  WidgetPropertyDeclaration({
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

class BuildMethodDeclaration {
  final List<StatementDeclaration> body;
  final ExpressionDeclaration returnWidget;
  final SourceLocation location;

  BuildMethodDeclaration({
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
      body:
          (json['body'] as List?)
              ?.map((s) => StatementDeclaration.fromJson(s))
              .toList() ??
          [],
      returnWidget: ExpressionDeclaration.fromJson(json['returnWidget']),
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class FunctionDeclaration {
  final String id;
  final String name;
  final String filePath;
  final String returnType;
  final List<ParameterDeclaration> parameters;
  final List<StatementDeclaration> body;
  final bool isAsync;
  final bool isGenerator;
  final FunctionType type;
  final SourceLocation location;
  final String? documentation;

  FunctionDeclaration({
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
      parameters:
          (json['parameters'] as List?)
              ?.map((p) => ParameterDeclaration.fromJson(p))
              .toList() ??
          [],
      body:
          (json['body'] as List?)
              ?.map((s) => StatementDeclaration.fromJson(s))
              .toList() ??
          [],
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

class ClassDeclaration {
  final String id;
  final String name;
  final String filePath;
  final String? superClass;
  final List<String> mixins;
  final List<String> interfaces;
  final List<StatePropertyDeclaration> properties;
  final List<WidgetMethodDeclaration> methods;
  final SourceLocation location;

  ClassDeclaration({
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

  factory ClassDeclaration.fromJson(Map<String, dynamic> json) {
    return ClassDeclaration(
      id: json['id'],
      name: json['name'],
      filePath: json['filePath'],
      superClass: json['superClass'],
      mixins: (json['mixins'] as List?)?.cast<String>() ?? [],
      interfaces: (json['interfaces'] as List?)?.cast<String>() ?? [],
      properties:
          (json['properties'] as List?)
              ?.map((p) => StatePropertyDeclaration.fromJson(p))
              .toList() ??
          [],
      methods:
          (json['methods'] as List?)
              ?.map((m) => WidgetMethodDeclaration.fromJson(m))
              .toList() ??
          [],
      location: SourceLocation.fromJson(json['location']),
    );
  }
}

class AnimationDeclaration {
  final String id;
  final String name;
  final String filePath;
  final AnimationType type;
  final int durationMs;
  final String curve;
  final List<AnimationKeyframeDeclaration> keyframes;
  final SourceLocation location;

  AnimationDeclaration({
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

enum AnimationType { tween, physics, controller, implicit }

class AnimationKeyframeDeclaration {
  final double time;
  final Map<String, dynamic> values;

  AnimationKeyframeDeclaration({required this.time, required this.values});

  Map<String, dynamic> toJson() => {'time': time, 'values': values};
}
