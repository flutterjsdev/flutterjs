// ============================================================================
// ENHANCED COMPONENT REGISTRY (AST-Aware Detection)
// ============================================================================
// Improved registry with better detection, caching, and extensibility
// ============================================================================

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_core/src/analysis/extraction/flutter_component_system.dart';

import '../visitors/analyzer_widget_detection_setup.dart';
import 'statement_extraction_pass.dart';

/// Enhanced detector interface
abstract class ComponentDetector {
  bool isWidgetCreation(dynamic node);
  bool isConditional(dynamic node);
  bool isLoop(dynamic node);
  bool isCollection(dynamic node);
  bool isBuilder(dynamic node);
  bool isCallback(dynamic node);

  String getWidgetName(dynamic node);
  String? getConstructorName(dynamic node);
  bool isConst(dynamic node);
  List<PropertyBinding> getProperties(dynamic node);
  List<dynamic> getChildElements(dynamic node);

  String getCondition(dynamic node);
  dynamic getThenBranch(dynamic node);
  dynamic getElseBranch(dynamic node);
  bool isTernary(dynamic node);

  String getLoopKind(dynamic node);
  String? getLoopVariable(dynamic node);
  String? getIterable(dynamic node);
  String? getLoopCondition(dynamic node);
  dynamic getLoopBody(dynamic node);

  String getCollectionKind(dynamic node);
  bool hasSpread(dynamic node);
  List<dynamic> getCollectionElements(dynamic node);

  String getBuilderName(dynamic node);
  List<String> getBuilderParameters(dynamic node);
  bool isAsyncBuilder(dynamic node);

  String getCallbackName(dynamic node);
  List<String> getCallbackParameters(dynamic node);
}

/// Default AST-aware detector implementation
class ASTComponentDetector implements ComponentDetector {
  final Map<String, dynamic> detectionCache = {};
  static const int CACHE_SIZE_LIMIT = 5000;

  @override
  bool isWidgetCreation(dynamic node) {
    return node is InstanceCreationExpression;
  }

  @override
  bool isConditional(dynamic node) {
    return node is ConditionalExpression || node is IfStatement;
  }

  @override
  bool isLoop(dynamic node) {
    return node is ForStatement;
  }

  @override
  bool isCollection(dynamic node) {
    return node is ListLiteral || node is SetOrMapLiteral;
  }

  @override
  bool isBuilder(dynamic node) {
    if (node is! FunctionExpression && node is! FunctionDeclaration) {
      return false;
    }
    return _hasBuilderSignature(node);
  }

  @override
  bool isCallback(dynamic node) {
    if (node is! FunctionExpression && node is! FunctionDeclaration) {
      return false;
    }
    return _hasCallbackSignature(node);
  }

  @override
  String getWidgetName(dynamic node) {
    if (node is! InstanceCreationExpression) return 'Unknown';
    try {
      return node.constructorName.type.name.toString();
    } catch (_) {
      return 'Unknown';
    }
  }

  @override
  String? getConstructorName(dynamic node) {
    if (node is! InstanceCreationExpression) return null;
    try {
      return node.constructorName.name?.name;
    } catch (_) {
      return null;
    }
  }

  @override
  bool isConst(dynamic node) {
    if (node is! InstanceCreationExpression) return false;
    return node.isConst;
  }

  @override
  List<PropertyBinding> getProperties(dynamic node) {
    if (node is! InstanceCreationExpression) return [];
    return _extractPropertiesFromWidget(node);
  }

  @override
  List<dynamic> getChildElements(dynamic node) {
    if (node is! InstanceCreationExpression) return [];
    return _extractChildElements(node);
  }

  @override
  String getCondition(dynamic node) {
    if (node is ConditionalExpression) {
      return node.condition.toString();
    }
    if (node is IfStatement) {
      return node.expression.toString();
    }
    return 'unknown';
  }

  @override
  dynamic getThenBranch(dynamic node) {
    if (node is ConditionalExpression) {
      return node.thenExpression;
    }
    if (node is IfStatement) {
      return node.thenStatement;
    }
    return null;
  }

  @override
  dynamic getElseBranch(dynamic node) {
    if (node is ConditionalExpression) {
      return node.elseExpression;
    }
    if (node is IfStatement) {
      return node.elseStatement;
    }
    return null;
  }

  @override
  bool isTernary(dynamic node) {
    return node is ConditionalExpression;
  }

  @override
  String getLoopKind(dynamic node) {
    if (node is! ForStatement) return 'unknown';
    return node.isForEach ? 'forEach' : 'for';
  }

  @override
  String? getLoopVariable(dynamic node) {
    if (node is! ForStatement) return null;

    final parts = node.forLoopParts;
    if (parts is ForEachPartsWithDeclaration) {
      return parts.loopVariable.name.lexeme;
    }
    if (parts is ForEachPartsWithIdentifier) {
      return parts.identifier.name;
    }
    return null;
  }

  @override
  String? getIterable(dynamic node) {
    if (node is! ForStatement) return null;

    final parts = node.forLoopParts;
    if (parts is ForEachPartsWithDeclaration) {
      return parts.iterable.toString();
    }
    if (parts is ForEachPartsWithIdentifier) {
      return parts.iterable.toString();
    }
    return null;
  }

  @override
  String? getLoopCondition(dynamic node) {
    if (node is! ForStatement) return null;

    final parts = node.forLoopParts;
    if (parts is ForParts) {
      return parts.condition?.toString();
    }
    return null;
  }

  @override
  dynamic getLoopBody(dynamic node) {
    if (node is! ForStatement) return null;
    return node.body;
  }

  @override
  String getCollectionKind(dynamic node) {
    if (node is ListLiteral) return 'list';
    if (node is SetOrMapLiteral) {
      return node.isMap ? 'map' : 'set';
    }
    return 'unknown';
  }

  @override
  bool hasSpread(dynamic node) {
    if (node is ListLiteral) {
      return node.elements.any((e) => e is SpreadElement);
    }
    if (node is SetOrMapLiteral) {
      return node.elements.any((e) => e is SpreadElement);
    }
    return false;
  }

  @override
  List<dynamic> getCollectionElements(dynamic node) {
    if (node is ListLiteral) {
      return node.elements;
    }
    if (node is SetOrMapLiteral) {
      return node.elements;
    }
    return [];
  }

  @override
  String getBuilderName(dynamic node) {
    if (node is FunctionExpression) return 'anonymous_builder';
    if (node is FunctionDeclaration) return node.name.lexeme;
    return 'builder';
  }

  @override
  List<String> getBuilderParameters(dynamic node) {
    return _extractFunctionParams(node);
  }

  @override
  bool isAsyncBuilder(dynamic node) {
    if (node is FunctionExpression) {
      return node.body.isAsynchronous;
    }
    if (node is FunctionDeclaration) {
      return node.functionExpression.body.isAsynchronous;
    }
    return false;
  }

  @override
  String getCallbackName(dynamic node) {
    if (node is FunctionExpression) return 'anonymous_callback';
    if (node is FunctionDeclaration) return node.name.lexeme;
    return 'callback';
  }

  @override
  List<String> getCallbackParameters(dynamic node) {
    return _extractFunctionParams(node);
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  List<PropertyBinding> _extractPropertiesFromWidget(
    InstanceCreationExpression expr,
  ) {
    final properties = <PropertyBinding>[];

    try {
      for (final arg in expr.argumentList.arguments) {
        if (arg is! NamedExpression) continue;

        final propName = arg.name.label.name;
        final propValue = arg.expression;
        final valueStr = propValue.toString();

        properties.add(LiteralPropertyBinding(name: propName, value: valueStr));
      }
    } catch (_) {}

    return properties;
  }

  List<dynamic> _extractChildElements(InstanceCreationExpression expr) {
    final children = <dynamic>[];

    try {
      for (final arg in expr.argumentList.arguments) {
        if (arg is! NamedExpression) continue;

        final propName = arg.name.label.name;

        if (propName == 'child') {
          children.add(arg.expression);
        } else if (propName == 'children' && arg.expression is ListLiteral) {
          final listExpr = arg.expression as ListLiteral;
          children.addAll(listExpr.elements);
        }
      }
    } catch (_) {}

    return children;
  }

  List<String> _extractFunctionParams(dynamic node) {
    try {
      if (node is FunctionExpression) {
        return node.parameters?.parameters
                .map((p) => p.name?.lexeme ?? '')
                .where((n) => n.isNotEmpty)
                .toList() ??
            [];
      }
      if (node is FunctionDeclaration) {
        return node.functionExpression.parameters?.parameters
                .map((p) => p.name?.lexeme ?? '')
                .where((n) => n.isNotEmpty)
                .toList() ??
            [];
      }
    } catch (_) {}

    return [];
  }

  bool _hasBuilderSignature(dynamic node) {
    final params = _extractFunctionParams(node);
    return params.isNotEmpty;
  }

  bool _hasCallbackSignature(dynamic node) {
    final params = _extractFunctionParams(node);
    return params.isEmpty || params.length <= 2;
  }
}

void registerASTAdapter(
  EnhancedComponentRegistry registry,
  WidgetProducerDetector widgetDetector,
  String filePath,
  String fileContent,
) {
  final adapter = ASTComponentDetector();

  registry.registerDetector('ast', adapter);
  // .register('ast', adapter);
}

/// Enhanced registry with caching and statistics
class EnhancedComponentRegistry {
  final Map<String, ComponentDetector> detectors = {};
  final Set<String> knownWidgets = {};
  final Map<String, dynamic> detectionCache = {};
  final Map<String, int> detectionStats = {};

  int _cacheHits = 0;
  int _cacheMisses = 0;
  static const int CACHE_SIZE_LIMIT = 5000;

  EnhancedComponentRegistry() {
    _registerDefaultDetectors();
    _registerCommonWidgets();
  }

  void _registerDefaultDetectors() {
    final astDetector = ASTComponentDetector();
    detectors['ast'] = astDetector;
    detectors['default'] = astDetector;
  }

  void _registerCommonWidgets() {
    const widgets = {
      'Scaffold',
      'AppBar',
      'Container',
      'Column',
      'Row',
      'Center',
      'Text',
      'Button',
      'FloatingActionButton',
      'ListView',
      'GridView',
      'Stack',
      'Positioned',
      'GestureDetector',
      'InkWell',
      'MaterialApp',
      'ElevatedButton',
      'Icon',
      'Padding',
      'SizedBox',
      'Expanded',
      'Flexible',
      'Dialog',
      'AlertDialog',
      'Card',
      'ListTile',
      'Drawer',
      'TabBar',
      'TabBarView',
      'StatelessWidget',
      'StatefulWidget',
    };
    knownWidgets.addAll(widgets);
  }

  /// Register custom detector
  void registerDetector(String key, ComponentDetector detector) {
    detectors[key] = detector;
  }

  /// Register multiple detectors
  void registerDetectors(Map<String, ComponentDetector> detectorMap) {
    detectors.addAll(detectorMap);
  }

  /// Register widget
  void registerWidget(String widgetName) {
    knownWidgets.add(widgetName);
  }

  /// Register multiple widgets
  void registerWidgets(Iterable<String> names) {
    knownWidgets.addAll(names);
  }

  /// Check if widget is known
  bool isKnownWidget(String name) {
    return knownWidgets.contains(name);
  }

  // =========================================================================
  // CACHED DETECTION METHODS
  // =========================================================================

  bool isWidgetCreation(dynamic node) {
    return _cachedCall('isWidgetCreation', node) ?? false;
  }

  bool isConditional(dynamic node) {
    return _cachedCall('isConditional', node) ?? false;
  }

  bool isLoop(dynamic node) {
    return _cachedCall('isLoop', node) ?? false;
  }

  bool isCollection(dynamic node) {
    return _cachedCall('isCollection', node) ?? false;
  }

  bool isBuilder(dynamic node) {
    return _cachedCall('isBuilder', node) ?? false;
  }

  bool isCallback(dynamic node) {
    return _cachedCall('isCallback', node) ?? false;
  }

  String getWidgetName(dynamic node) {
    return _cachedCall('getWidgetName', node) ?? 'Unknown';
  }

  String? getConstructorName(dynamic node) {
    return _cachedCall('getConstructorName', node);
  }

  bool isConst(dynamic node) {
    return _cachedCall('isConst', node) ?? false;
  }

  List<PropertyBinding> getProperties(dynamic node) {
    return _cachedCall('getProperties', node) ?? [];
  }

  List<dynamic> getChildElements(dynamic node) {
    return _cachedCall('getChildElements', node) ?? [];
  }

  String getCondition(dynamic node) {
    return _cachedCall('getCondition', node) ?? 'true';
  }

  dynamic getThenBranch(dynamic node) {
    return _cachedCall('getThenBranch', node);
  }

  dynamic getElseBranch(dynamic node) {
    return _cachedCall('getElseBranch', node);
  }

  bool isTernary(dynamic node) {
    return _cachedCall('isTernary', node) ?? false;
  }

  String getLoopKind(dynamic node) {
    return _cachedCall('getLoopKind', node) ?? 'for';
  }

  String? getLoopVariable(dynamic node) {
    return _cachedCall('getLoopVariable', node);
  }

  String? getIterable(dynamic node) {
    return _cachedCall('getIterable', node);
  }

  String? getLoopCondition(dynamic node) {
    return _cachedCall('getLoopCondition', node);
  }

  dynamic getLoopBody(dynamic node) {
    return _cachedCall('getLoopBody', node);
  }

  String getCollectionKind(dynamic node) {
    return _cachedCall('getCollectionKind', node) ?? 'list';
  }

  bool hasSpread(dynamic node) {
    return _cachedCall('hasSpread', node) ?? false;
  }

  List<dynamic> getCollectionElements(dynamic node) {
    return _cachedCall('getCollectionElements', node) ?? [];
  }

  String getBuilderName(dynamic node) {
    return _cachedCall('getBuilderName', node) ?? 'builder';
  }

  List<String> getBuilderParameters(dynamic node) {
    return _cachedCall('getBuilderParameters', node) ?? [];
  }

  bool isAsyncBuilder(dynamic node) {
    return _cachedCall('isAsyncBuilder', node) ?? false;
  }

  String getCallbackName(dynamic node) {
    return _cachedCall('getCallbackName', node) ?? 'callback';
  }

  List<String> getCallbackParameters(dynamic node) {
    return _cachedCall('getCallbackParameters', node) ?? [];
  }

  // =========================================================================
  // CACHING LOGIC
  // =========================================================================

  dynamic _cachedCall(String method, dynamic node) {
    final cacheKey = '${method}_${node.hashCode}';

    if (detectionCache.containsKey(cacheKey)) {
      _cacheHits++;
      _recordStat('cache_hits', increment: 1);
      return detectionCache[cacheKey];
    }

    _cacheMisses++;
    _recordStat('cache_misses', increment: 1);

    final result = _call(method, node);
    _cacheDetection(cacheKey, result);

    return result;
  }

  void _cacheDetection(String key, dynamic result) {
    if (detectionCache.length >= CACHE_SIZE_LIMIT) {
      _clearOldestCache();
    }
    detectionCache[key] = result;
  }

  void _clearOldestCache() {
    if (detectionCache.isEmpty) return;
    final firstKey = detectionCache.keys.first;
    detectionCache.remove(firstKey);
  }

  dynamic _call(String method, dynamic node) {
    for (final detector in detectors.values) {
      try {
        final result = (detector as dynamic).call(method, node);
        return result;
      } catch (_) {}
    }
    return null;
  }

  void _recordStat(String key, {int increment = 0}) {
    if (increment > 0) {
      detectionStats[key] = (detectionStats[key] ?? 0) + increment;
    }
  }

  void clearCache() {
    detectionCache.clear();
    _cacheHits = 0;
    _cacheMisses = 0;
  }

  void printStats() {
    print('\n📊 [Registry Statistics]');
    print('  Known widgets: ${knownWidgets.length}');
    print('  Registered detectors: ${detectors.length}');
    print('  Cache hits: $_cacheHits');
    print('  Cache misses: $_cacheMisses');
    print('  Cache size: ${detectionCache.length}');
    print(
      '  Hit rate: ${_cacheHits > 0 ? ((_cacheHits / (_cacheHits + _cacheMisses)) * 100).toStringAsFixed(2) : 0}%',
    );
    detectionStats.forEach((key, value) {
      print('  $key: $value');
    });
  }
}
