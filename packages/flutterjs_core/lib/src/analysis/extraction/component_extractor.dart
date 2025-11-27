// ============================================================================
// ENHANCED WIDGET EXTRACTION SYSTEM
// ============================================================================
// Improved extraction with better detection, recursion, and edge case handling
// ============================================================================

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:flutterjs_core/flutterjs_core.dart';
import '../passes/statement_extraction_pass.dart';
import 'component_registry.dart';
import 'flutter_component_system.dart';


class ComponentExtractor {
  final String filePath;
  final String fileContent;
  final EnhancedComponentRegistry registry;
  final String id;

  // ID generator
  int _idCounter = 0;

  ComponentExtractor({
    required this.filePath,
    required this.fileContent,
    required this.id,
    EnhancedComponentRegistry? registry,
  }) : registry = registry ?? EnhancedComponentRegistry();

  String _generateId(String prefix) => '${prefix}_${++_idCounter}';

  SourceLocationIR _makeLocation(int offset, int length) {
    int line = 1, column = 1;
    for (int i = 0; i < offset && i < fileContent.length; i++) {
      if (fileContent[i] == '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return SourceLocationIR(
      id: id,
      file: filePath,
      line: line,
      column: column,
      offset: offset,
      length: length,
    );
  }

  /// Main extraction method - handles ANY component
  FlutterComponent extract(dynamic astNode, {String? hint}) {
    try {
      // Try to detect component type
      final component = _detectAndExtract(astNode, hint);
      return component;
    } catch (e) {
      // Fallback to unsupported
      return UnsupportedComponent(
        id: _generateId('unsupported'),
        sourceCode: astNode.toString(),
        sourceLocation: _makeLocation(0, 0),
        reason: 'Error during extraction: $e',
      );
    }
  }

  FlutterComponent _detectAndExtract(dynamic node, String? hint) {
    // Widget creation
    if (registry.isWidgetCreation(node)) {
      return _extractWidget(node);
    }

    // Conditional (ternary or if)
    if (registry.isConditional(node)) {
      return _extractConditional(node);
    }

    // Loop (for, forEach, while)
    if (registry.isLoop(node)) {
      return _extractLoop(node);
    }

    // Collection (list, map, set)
    if (registry.isCollection(node)) {
      return _extractCollection(node);
    }

    // Builder function
    if (registry.isBuilder(node)) {
      return _extractBuilder(node);
    }

    // Callback function
    if (registry.isCallback(node)) {
      return _extractCallback(node);
    }

    // Unknown
    return UnsupportedComponent(
      id: _generateId('unsupported'),
      sourceCode: node.toString(),
      sourceLocation: _makeLocation(0, 0),
      reason: 'No extractor matched this component type',
    );
  }

  FlutterComponent _extractWidget(dynamic node) {
    final widgetName = registry.getWidgetName(node);
    final ctor = registry.getConstructorName(node);
    final isConst = registry.isConst(node);
    final properties = registry.getProperties(node);

    final children = <FlutterComponent>[];
    final childElements = registry.getChildElements(node);

    for (final child in childElements) {
      children.add(extract(child));
    }

    return WidgetComponent(
      id: _generateId('widget_$widgetName'),
      widgetName: widgetName,
      constructorName: ctor,
      sourceLocation: _makeLocation(0, 0),
      isConst: isConst,
      properties: properties,
      children: children,
    );
  }

  FlutterComponent _extractConditional(dynamic node) {
    final condition = registry.getCondition(node);
    final thenNode = registry.getThenBranch(node);
    final elseNode = registry.getElseBranch(node);
    final isTernary = registry.isTernary(node);

    return ConditionalComponent(
      id: _generateId('conditional'),
      conditionCode: condition,
      thenComponent: extract(thenNode),
      elseComponent: elseNode != null ? extract(elseNode) : null,
      sourceLocation: _makeLocation(0, 0),
      isTernary: isTernary,
    );
  }

  FlutterComponent _extractLoop(dynamic node) {
    final loopKind = registry.getLoopKind(node);
    final loopVar = registry.getLoopVariable(node);
    final iterable = registry.getIterable(node);
    final condition = registry.getLoopCondition(node);
    final bodyNode = registry.getLoopBody(node);

    return LoopComponent(
      id: _generateId('loop_$loopKind'),
      loopKind: loopKind,
      loopVariable: loopVar,
      iterableCode: iterable,
      conditionCode: condition,
      bodyComponent: extract(bodyNode),
      sourceLocation: _makeLocation(0, 0),
    );
  }

  FlutterComponent _extractCollection(dynamic node) {
    final kind = registry.getCollectionKind(node);
    final hasSpread = registry.hasSpread(node);
    final elements = registry.getCollectionElements(node);

    final componentElements = <FlutterComponent>[];
    for (final elem in elements) {
      componentElements.add(extract(elem));
    }

    return CollectionComponent(
      id: _generateId('collection_$kind'),
      collectionKind: kind,
      elements: componentElements,
      sourceLocation: _makeLocation(0, 0),
      hasSpread: hasSpread,
    );
  }

  FlutterComponent _extractBuilder(dynamic node) {
    final name = registry.getBuilderName(node);
    final params = registry.getBuilderParameters(node);
    final isAsync = registry.isAsyncBuilder(node);

    return BuilderComponent(
      id: _generateId('builder_$name'),
      builderName: name,
      parameters: params,
      isAsync: isAsync,
      sourceLocation: _makeLocation(0, 0),
    );
  }

  FlutterComponent _extractCallback(dynamic node) {
    final name = registry.getCallbackName(node);
    final params = registry.getCallbackParameters(node);

    return BuilderComponent(
      id: _generateId('callback_$name'),
      builderName: name,
      parameters: params,
      sourceLocation: _makeLocation(0, 0),
    );
  }
}


/// Enhanced component extractor with improved detection
class EnhancedComponentExtractor extends ComponentExtractor {
  final Map<String, dynamic> extractionStats = {};
  int _recursionDepth = 0;
  static const int MAX_RECURSION_DEPTH = 50;

  EnhancedComponentExtractor({
    required super.filePath,
    required super.fileContent,
    required super.id,
    super.registry,
  });

  /// Main extraction with better error handling
  @override
  FlutterComponent extract(dynamic astNode, {String? hint}) {
    if (_recursionDepth >= MAX_RECURSION_DEPTH) {
      return _createFallback(
        astNode,
        'Maximum recursion depth exceeded',
      );
    }

    _recursionDepth++;
    try {
      _recordStat('extract_attempts', incrementValue: 1);

      // Null check
      if (astNode == null) {
        return _createFallback(astNode, 'Node is null');
      }

      // Try enhanced detection
      final component = _detectAndExtractEnhanced(astNode, hint);
      _recordStat('extract_success', incrementValue: 1);
      return component;
    } catch (e, st) {
      _recordStat('extract_errors', incrementValue: 1);
      print('❌ [Extraction Error] $e\n$st');
      return _createFallback(astNode, 'Error: $e');
    } finally {
      _recursionDepth--;
    }
  }

  /// Enhanced detection with better type checking
  FlutterComponent _detectAndExtractEnhanced(
    dynamic node,
    String? hint,
  ) {
    // Type-based detection (most reliable)
    if (node is InstanceCreationExpression) {
      return _extractWidgetEnhanced(node);
    }

    if (node is ConditionalExpression) {
      return _extractConditionalEnhanced(node);
    }

    if (node is IfStatement) {
      return _extractIfStatementAsConditional(node);
    }

    if (node is ForStatement) {
      return _extractLoopEnhanced(node);
    }

    if (node is ListLiteral) {
      return _extractCollectionEnhanced(node);
    }

    if (node is SetOrMapLiteral) {
      return _extractCollectionEnhanced(node);
    }

    if (node is FunctionExpression) {
      return _extractFunctionEnhanced(node);
    }

    if (node is FunctionDeclaration) {
      return _extractFunctionEnhanced(node.functionExpression);
    }

    if (node is CascadeExpression) {
      return _extractCascadeEnhanced(node);
    }

    if (node is BinaryExpression) {
      return _extractBinaryExpressionEnhanced(node);
    }

    if (node is MethodInvocation) {
      return _extractMethodInvocationEnhanced(node);
    }

    if (node is ParenthesizedExpression) {
      return extract(node.expression, hint: hint);
    }

    if (node is PropertyAccess) {
      return _extractPropertyAccessEnhanced(node);
    }

    // Fallback
    return _createFallback(node, 'Unknown node type: ${node.runtimeType}');
  }

  /// Enhanced widget extraction with full property analysis
  FlutterComponent _extractWidgetEnhanced(
    InstanceCreationExpression expr,
  ) {
    try {
      final className = expr.constructorName.type.name.toString();
      final constructorName = expr.constructorName.name?.name;

      _recordStat('widgets_extracted', incrementValue: 1);

      // Extract all properties with proper binding
      final properties = _extractPropertiesEnhanced(expr);
      final children = _extractChildrenEnhanced(expr, properties);

      final widget = WidgetComponent(
        id: _generateId('widget_$className'),
        widgetName: className,
        constructorName: constructorName,
        properties: properties,
        children: children,
        isConst: expr.isConst,
        sourceLocation: _makeLocation(expr.offset, expr.length),
      );

      print(
        '✅ [Widget] $className${constructorName != null ? ".${constructorName}" : ""}${children.isNotEmpty ? " (${children.length} children)" : ""}',
      );

      return widget;
    } catch (e) {
      return _createFallback(
        expr,
        'Widget extraction failed: $e',
      );
    }
  }

  /// Enhanced property extraction with callback/builder detection
  List<PropertyBinding> _extractPropertiesEnhanced(
    InstanceCreationExpression expr,
  ) {
    final properties = <PropertyBinding>[];

    for (final arg in expr.argumentList.arguments) {
      if (arg is! NamedExpression) continue;

      final propName = arg.name.label.name;
      final propValue = arg.expression;
      final valueStr = propValue.toString();

      // Detect property type
      if (_isCallbackProperty(propName, propValue)) {
        properties.add(
          CallbackPropertyBinding(
            name: propName,
            value: valueStr,
            parameters: _extractFunctionParams(propValue),
            isAsync: _isAsyncFunction(propValue),
          ),
        );
      } else if (_isBuilderProperty(propName, propValue)) {
        properties.add(
          BuilderPropertyBinding(
            name: propName,
            value: valueStr,
            parameters: _extractFunctionParams(propValue),
          ),
        );
      } else if (_isWidgetProperty(propName, propValue)) {
        // Recursively extract nested widgets
        try {
          final nestedComponent = extract(propValue, hint: 'nested_widget');
          if (nestedComponent is! UnsupportedComponent) {
            properties.add(
              LiteralPropertyBinding(
                name: propName,
                value: nestedComponent.describe(),
              ),
            );
            continue;
          }
        } catch (_) {}

        properties.add(
          LiteralPropertyBinding(name: propName, value: valueStr),
        );
      } else {
        properties.add(
          LiteralPropertyBinding(name: propName, value: valueStr),
        );
      }
    }

    return properties;
  }

  /// Enhanced children extraction
  List<FlutterComponent> _extractChildrenEnhanced(
    InstanceCreationExpression expr,
    List<PropertyBinding> properties,
  ) {
    final children = <FlutterComponent>[];

    // Look for 'child' property
    for (final arg in expr.argumentList.arguments) {
      if (arg is! NamedExpression) continue;

      final propName = arg.name.label.name;

      if (propName == 'child' && arg.expression is InstanceCreationExpression) {
        try {
          final childComponent = extract(arg.expression, hint: 'child');
          children.add(childComponent);
        } catch (_) {}
      }

      // Look for 'children' list
      if (propName == 'children' && arg.expression is ListLiteral) {
        final listExpr = arg.expression as ListLiteral;

        for (final element in listExpr.elements) {
          // Skip spread elements for now
          if (element is SpreadElement) {
            try {
              final spreadComponent = extract(
                element.expression,
                hint: 'spread_children',
              );
              children.add(spreadComponent);
            } catch (_) {}
            continue;
          }

          try {
            final childComponent = extract(element, hint: 'list_child');
            if (childComponent is! UnsupportedComponent) {
              children.add(childComponent);
            }
          } catch (_) {}
        }
      }
    }

    return children;
  }

  /// Enhanced conditional extraction
  FlutterComponent _extractConditionalEnhanced(
    ConditionalExpression expr,
  ) {
    try {
      final thenComponent = extract(
        expr.thenExpression,
        hint: 'conditional_then',
      );
      final elseComponent = extract(
        expr.elseExpression,
        hint: 'conditional_else',
      );

      return ConditionalComponent(
        id: _generateId('conditional'),
        conditionCode: expr.condition.toString(),
        thenComponent: thenComponent,
        elseComponent: elseComponent,
        isTernary: true,
        sourceLocation: _makeLocation(expr.offset, expr.length),
      );
    } catch (e) {
      return _createFallback(expr, 'Conditional extraction failed: $e');
    }
  }

  /// Extract if statements as conditionals
  FlutterComponent _extractIfStatementAsConditional(IfStatement stmt) {
    try {
      final thenComponent = extract(stmt.thenStatement, hint: 'if_then');
      final elseComponent = stmt.elseStatement != null
          ? extract(stmt.elseStatement, hint: 'if_else')
          : null;

      return ConditionalComponent(
        id: _generateId('if_conditional'),
        conditionCode: stmt.expression.toString(),
        thenComponent: thenComponent,
        elseComponent: elseComponent,
        isTernary: false,
        sourceLocation: _makeLocation(stmt.offset, stmt.length),
      );
    } catch (e) {
      return _createFallback(stmt, 'If statement extraction failed: $e');
    }
  }

  /// Enhanced loop extraction
  FlutterComponent _extractLoopEnhanced(ForStatement stmt) {
    try {
      if (stmt.isForEach) {
        return _extractForEachEnhanced(stmt);
      }
      return _extractTraditionalForEnhanced(stmt);
    } catch (e) {
      return _createFallback(stmt, 'Loop extraction failed: $e');
    }
  }

  FlutterComponent _extractForEachEnhanced(ForStatement stmt) {
    final parts = stmt.forLoopParts;

    String loopVariable = 'item';
    String? iterableCode;

    if (parts is ForEachPartsWithDeclaration) {
      loopVariable = parts.loopVariable.name.lexeme;
      iterableCode = parts.iterable.toString();
    } else if (parts is ForEachPartsWithIdentifier) {
      loopVariable = parts.identifier.name;
      iterableCode = parts.iterable.toString();
    }

    try {
      final bodyComponent = extract(stmt.body, hint: 'loop_body');

      return LoopComponent(
        id: _generateId('loop_forEach'),
        loopKind: 'forEach',
        loopVariable: loopVariable,
        iterableCode: iterableCode,
        bodyComponent: bodyComponent,
        sourceLocation: _makeLocation(stmt.offset, stmt.length),
      );
    } catch (e) {
      return _createFallback(stmt, 'ForEach extraction failed: $e');
    }
  }

  FlutterComponent _extractTraditionalForEnhanced(ForStatement stmt) {
    try {
      final bodyComponent = extract(stmt.body, hint: 'loop_body');

      return LoopComponent(
        id: _generateId('loop_for'),
        loopKind: 'for',
        bodyComponent: bodyComponent,
        sourceLocation: _makeLocation(stmt.offset, stmt.length),
      );
    } catch (e) {
      return _createFallback(stmt, 'For loop extraction failed: $e');
    }
  }

  /// Enhanced collection extraction
  FlutterComponent _extractCollectionEnhanced(dynamic expr) {
    try {
      final elements = <FlutterComponent>[];
      final hasSpread = false;
      String kind = 'list';

      if (expr is ListLiteral) {
        kind = 'list';
        for (final element in expr.elements) {
          if (element is SpreadElement) {
            try {
              elements.add(extract(element.expression, hint: 'spread'));
            } catch (_) {}
          } else {
            try {
              elements.add(extract(element, hint: 'list_element'));
            } catch (_) {}
          }
        }
      } else if (expr is SetOrMapLiteral) {
        kind = expr.isMap ? 'map' : 'set';
        for (final element in expr.elements) {
          if (element is SpreadElement) {
            try {
              elements.add(extract(element.expression, hint: 'spread'));
            } catch (_) {}
          } else {
            try {
              elements.add(extract(element, hint: 'collection_element'));
            } catch (_) {}
          }
        }
      }

      return CollectionComponent(
        id: _generateId('collection_$kind'),
        collectionKind: kind,
        elements: elements,
        hasSpread: hasSpread,
        sourceLocation: _makeLocation(expr.offset, expr.length),
      );
    } catch (e) {
      return _createFallback(expr, 'Collection extraction failed: $e');
    }
  }

  /// Extract cascade expressions
  FlutterComponent _extractCascadeEnhanced(CascadeExpression expr) {
    try {
      final target = extract(expr.target, hint: 'cascade_target');

      final sections = <FlutterComponent>[];
      for (final section in expr.cascadeSections) {
        try {
          sections.add(extract(section, hint: 'cascade_section'));
        } catch (_) {}
      }

      return ConditionalComponent(
        id: _generateId('cascade'),
        conditionCode: 'cascade',
        thenComponent: target,
        sourceLocation: _makeLocation(expr.offset, expr.length),
      );
    } catch (e) {
      return _createFallback(expr, 'Cascade extraction failed: $e');
    }
  }

  /// Extract binary expressions (null coalesce, etc.)
  FlutterComponent _extractBinaryExpressionEnhanced(
    BinaryExpression expr,
  ) {
    try {
      // Handle null coalescing specially
      if (expr.operator.lexeme == '??') {
        final left = extract(expr.leftOperand, hint: 'null_coalesce_left');
        final right = extract(expr.rightOperand, hint: 'null_coalesce_right');

        return ConditionalComponent(
          id: _generateId('null_coalesce'),
          conditionCode: 'left ?? right',
          thenComponent: left,
          elseComponent: right,
          sourceLocation: _makeLocation(expr.offset, expr.length),
        );
      }

      // For other binary operations, return unsupported
      return _createFallback(expr, 'Binary operator: ${expr.operator.lexeme}');
    } catch (e) {
      return _createFallback(expr, 'Binary expression extraction failed: $e');
    }
  }

  /// Extract method invocations
  FlutterComponent _extractMethodInvocationEnhanced(
    MethodInvocation expr,
  ) {
    try {
      final methodName = expr.methodName.name;

      // Common builder methods
      if (methodName == 'map' ||
          methodName == 'where' ||
          methodName == 'expand') {
        return extract(expr.target, hint: 'method_target');
      }

      // Try to extract target widget
      if (expr.target != null) {
        return extract(expr.target, hint: 'method_invocation_target');
      }

      return _createFallback(expr, 'Method invocation: $methodName');
    } catch (e) {
      return _createFallback(
        expr,
        'Method invocation extraction failed: $e',
      );
    }
  }

  /// Extract property access
  FlutterComponent _extractPropertyAccessEnhanced(PropertyAccess expr) {
    try {
      return extract(expr.target, hint: 'property_access_target');
    } catch (e) {
      return _createFallback(expr, 'Property access extraction failed: $e');
    }
  }

  /// Extract function expressions
  FlutterComponent _extractFunctionEnhanced(FunctionExpression expr) {
    try {
      final params =
          expr.parameters?.parameters
              .map((p) => p.name?.lexeme ?? '')
              .where((n) => n.isNotEmpty)
              .toList() ??
          [];

      return BuilderComponent(
        id: _generateId('function'),
        builderName: 'function',
        parameters: params,
        isAsync: expr.body.isAsynchronous,
        sourceLocation: _makeLocation(expr.offset, expr.length),
      );
    } catch (e) {
      return _createFallback(expr, 'Function extraction failed: $e');
    }
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  bool _isCallbackProperty(String propName, dynamic value) {
    return propName.startsWith('on') ||
        propName.endsWith('Callback') ||
        (value is FunctionExpression && !_isAsyncFunction(value));
  }

  bool _isBuilderProperty(String propName, dynamic value) {
    return propName == 'builder' ||
        propName.endsWith('Builder') ||
        (propName.contains('builder') && value is FunctionExpression);
  }

  bool _isWidgetProperty(String propName, dynamic value) {
    return propName == 'child' ||
        propName == 'children' ||
        propName == 'fallback' ||
        propName == 'error' ||
        (value is InstanceCreationExpression);
  }

  bool _isAsyncFunction(dynamic value) {
    if (value is FunctionExpression) {
      return value.body.isAsynchronous;
    }
    if (value is FunctionDeclaration) {
      return value.functionExpression.body.isAsynchronous;
    }
    return false;
  }

  List<String> _extractFunctionParams(dynamic value) {
    if (value is FunctionExpression) {
      return value.parameters?.parameters
              .map((p) => p.name?.lexeme ?? '')
              .where((n) => n.isNotEmpty)
              .toList() ??
          [];
    }
    if (value is FunctionDeclaration) {
      return value.functionExpression.parameters?.parameters
              .map((p) => p.name?.lexeme ?? '')
              .where((n) => n.isNotEmpty)
              .toList() ??
          [];
    }
    return [];
  }

  /// Create fallback component
  FlutterComponent _createFallback(dynamic node, String reason) {
    _recordStat('fallback_components', incrementValue: 1);

    return UnsupportedComponent(
      id: _generateId('unsupported'),
      sourceCode: node?.toString() ?? 'null',
      sourceLocation: _makeLocation(0, 0),
      reason: reason,
    );
  }

  /// Recording extraction statistics
  void _recordStat(String key, {int incrementValue = 0}) {
    if (incrementValue > 0) {
      extractionStats[key] = (extractionStats[key] ?? 0) + incrementValue;
    }
  }

  /// Print extraction statistics
  void printStats() {
    print('\n📊 [Extraction Statistics]');
    extractionStats.forEach((key, value) {
      print('  $key: $value');
    });
  }
}

// ============================================================================
// INTEGRATION HELPER
// ============================================================================

/// Register enhanced extractor with better detection
// void registerEnhancedExtractor(
//   ComponentRegistry registry,
//   String filePath,
//   String fileContent,
//   String extractorId,
// ) {
//   final extractor = EnhancedComponentExtractor(
//     filePath: filePath,
//     fileContent: fileContent,
//     id: extractorId,
//     registry: registry,
//   );

//   registry.register('enhanced', extractor);
// }

/// Create enhanced extractor directly
EnhancedComponentExtractor createEnhancedExtractor({
  required String filePath,
  required String fileContent,
  required String id,
}) {
  return EnhancedComponentExtractor(
    filePath: filePath,
    fileContent: fileContent,
    id: id,
  );
}