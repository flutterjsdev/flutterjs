// ============================================================================
// AST TO COMPONENT ADAPTER
// ============================================================================
// Bridges analyzer AST -> Unified Flutter Component Model
// Handles all Dart AST node types

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/ast.dart' as ast;
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:flutterjs_core/src/analyzer_widget_detection_setup.dart';
import 'package:flutterjs_core/src/code_reader/flutter_component_system.dart';

import 'package:flutterjs_core/src/statement_extraction_pass.dart';
/// ============================================================================
/// AST → Flutter Component Adapter
/// ============================================================================
///
/// Converts Dart Analyzer AST nodes into the unified Flutter Component Model
/// used by the FlutterJS UI extraction pipeline.
///
/// # Overview
/// This adapter acts as a bridge between:
///   - **Dart Analyzer AST nodes**  
///   - **Your custom Flutter Component System**
///
/// Dart AST nodes expose low-level syntax structures (constructor calls,
/// conditionals, loops, list literals, spread operators, function expressions,
/// etc.).  
/// The component model expects clean, normalized UI metadata.
///
/// This adapter translates AST → UI Model so the rest of the system does not
/// need to understand raw AST nodes.
///
/// # Responsibilities
///
/// The adapter exposes a generic `call(method, node)` interface and implements:
///
/// ## 1. Detection Methods
/// - `isWidgetCreation` → Identifies widget constructor expressions
/// - `isConditional` → Detects if/else or ternary expressions
/// - `isLoop` → Detects `for`/`forEach` loops
/// - `isCollection` → Detects list/map/set literals
/// - `isBuilder` → Identifies builder-style functions
/// - `isCallback` → Identifies callback functions such as `onTap`, `onPressed`
///
/// ## 2. Widget Extraction
/// - `getWidgetName` → Returns the class name of a widget
/// - `getConstructorName` → Returns named constructors (`.builder` etc.)
/// - `isConst` → Whether widget instantiation is `const`
/// - `getProperties` → Extracts named parameters into `PropertyBinding` objects
/// - `getChildElements` → Extracts children from a widget’s `children:` list
///
/// ## 3. Conditional Extraction
/// - `getCondition` → Expression used in the condition
/// - `getThenBranch` → True branch
/// - `getElseBranch` → False branch
/// - `isTernary` → Whether the node is a `?:` expression
///
/// ## 4. Loop Extraction
/// - `getLoopKind` → `for` or `forEach`
/// - `getLoopVariable` → Declared loop variable
/// - `getIterable` → Iterable used in a `forEach`
/// - `getLoopCondition` → Loop condition for classical `for`
/// - `getLoopBody` → Body of the loop
///
/// ## 5. Collection Extraction
/// - `getCollectionKind` → Identifies list/set/map
/// - `hasSpread` → Detects spread elements (...)
/// - `getCollectionElements` → Returns collection element nodes
///
/// ## 6. Builder/Callback Extraction
/// - `getBuilderName`
/// - `getBuilderParameters`
/// - `isAsyncBuilder`
/// - `getCallbackName`
/// - `getCallbackParameters`
///
///
/// # Requirements
/// The adapter requires the following components:
/// - **Dart Analyzer** (AST node classes)
/// - **WidgetProducerDetector** (to determine likely widgets)
/// - **ComponentRegistry** (to register the adapter)
/// - **ComponentExtractor** (to drive extraction)
/// - **FlutterComponent model classes**:
///   - `PropertyBinding`
///   - `LiteralPropertyBinding`
///   - `CallbackPropertyBinding`
///   - `BuilderPropertyBinding`
///
///
/// # Integration
/// Register the adapter:
///
/// ```dart
/// registerASTAdapter(registry, widgetDetector, filePath, fileContent);
/// ```
///
/// Extract a component from an AST node:
///
/// ```dart
/// final component = extractor.extract(astNode, hint: 'from_ast');
/// ```
///
/// After registration, the rest of the system works entirely with
/// **FlutterComponent** objects instead of low-level AST nodes.
///
///
/// ============================================================================

// Assuming flutter_component_system.dart is imported
// import 'flutter_component_system.dart';

/// Adapter that converts analyzer AST nodes to FlutterComponents
class ASTComponentAdapter implements ComponentDetector {
  final WidgetProducerDetector widgetDetector;
  final String filePath;
  final String fileContent;

  ASTComponentAdapter({
    required this.widgetDetector,
    required this.filePath,
    required this.fileContent,
  });

  @override
  dynamic call(String method, dynamic node) {
    switch (method) {
      // Detection methods
      case 'isWidgetCreation':
        return _isWidgetCreation(node);
      case 'isConditional':
        return _isConditional(node);
      case 'isLoop':
        return _isLoop(node);
      case 'isCollection':
        return _isCollection(node);
      case 'isBuilder':
        return _isBuilder(node);
      case 'isCallback':
        return _isCallback(node);

      // Extraction methods
      case 'getWidgetName':
        return _getWidgetName(node);
      case 'getConstructorName':
        return _getConstructorName(node);
      case 'isConst':
        return _isConst(node);
      case 'getProperties':
        return _getProperties(node);
      case 'getChildElements':
        return _getChildElements(node);

      case 'getCondition':
        return _getCondition(node);
      case 'getThenBranch':
        return _getThenBranch(node);
      case 'getElseBranch':
        return _getElseBranch(node);
      case 'isTernary':
        return _isTernary(node);

      case 'getLoopKind':
        return _getLoopKind(node);
      case 'getLoopVariable':
        return _getLoopVariable(node);
      case 'getIterable':
        return _getIterable(node);
      case 'getLoopCondition':
        return _getLoopCondition(node);
      case 'getLoopBody':
        return _getLoopBody(node);

      case 'getCollectionKind':
        return _getCollectionKind(node);
      case 'hasSpread':
        return _hasSpread(node);
      case 'getCollectionElements':
        return _getCollectionElements(node);

      case 'getBuilderName':
        return _getBuilderName(node);
      case 'getBuilderParameters':
        return _getBuilderParameters(node);
      case 'isAsyncBuilder':
        return _isAsyncBuilder(node);

      case 'getCallbackName':
        return _getCallbackName(node);
      case 'getCallbackParameters':
        return _getCallbackParameters(node);

      default:
        return null;
    }
  }

  // =========================================================================
  // DETECTION METHODS
  // =========================================================================

  bool _isWidgetCreation(dynamic node) {
    if (node is! InstanceCreationExpression) return false;

    final className = node.constructorName.type.name.toString();
    return _isLikelyWidget(className);
  }

  bool _isConditional(dynamic node) {
    return node is ConditionalExpression || node is IfStatement;
    //todo:: need to add If Expression support in analyzer package
    // ||
    // (node is IfExpression);
  }

  bool _isLoop(dynamic node) {
    return node is ForStatement || (node is ForStatement && (node).isForEach);
  }

  bool _isCollection(dynamic node) {
    return node is ListLiteral ||
        node is SetOrMapLiteral ||
        (node is ListLiteral && _hasSpreadElement(node));
  }

  bool _isBuilder(dynamic node) {
    if (node is! FunctionExpression && node is! FunctionDeclaration) {
      return false;
    }

    final name = node is FunctionDeclaration ? node.name.lexeme : 'lambda';
    return name.toLowerCase().contains('build') ||
        name.toLowerCase().contains('render') ||
        name.toLowerCase().contains('create');
  }

  bool _isCallback(dynamic node) {
    if (node is! FunctionExpression && node is! FunctionDeclaration) {
      return false;
    }

    final name = node is FunctionDeclaration ? node.name.lexeme : 'lambda';
    return name.toLowerCase().startsWith('on') ||
        name.toLowerCase().startsWith('handle');
  }

  // =========================================================================
  // EXTRACTION METHODS - WIDGET
  // =========================================================================

  String _getWidgetName(dynamic node) {
    if (node is InstanceCreationExpression) {
      return node.constructorName.type.name.toString();
    }
    return 'Unknown';
  }

  String? _getConstructorName(dynamic node) {
    if (node is InstanceCreationExpression) {
      final ctor = node.constructorName.name?.name;
      return ctor?.isNotEmpty == true ? ctor : null;
    }
    return null;
  }

  bool _isConst(dynamic node) {
    if (node is InstanceCreationExpression) {
      return node.isConst;
    }
    return false;
  }

  List<PropertyBinding> _getProperties(dynamic node) {
    if (node is! InstanceCreationExpression) return [];

    final props = <PropertyBinding>[];

    for (final arg in node.argumentList.arguments) {
      if (arg is NamedExpression) {
        final name = arg.name.label.name;
        final value = arg.expression.toString();

        // Detect property type
        if (_isCallbackName(name)) {
          props.add(
            CallbackPropertyBinding(
              name: name,
              value: value,
              parameters: _extractParameters(arg.expression),
            ),
          );
        } else if (_isBuilderName(name)) {
          props.add(
            BuilderPropertyBinding(
              name: name,
              value: value,
              parameters: _extractParameters(arg.expression),
            ),
          );
        } else {
          props.add(LiteralPropertyBinding(name: name, value: value));
        }
      }
    }

    return props;
  }

  List<dynamic> _getChildElements(dynamic node) {
    if (node is! InstanceCreationExpression) return [];

    final children = <dynamic>[];

    // Find 'children' argument
    for (final arg in node.argumentList.arguments) {
      if (arg is NamedExpression && arg.name.label.name == 'children') {
        if (arg.expression is ListLiteral) {
          final list = arg.expression as ListLiteral;
          children.addAll(list.elements);
        }
        break;
      }
    }

    return children;
  }

  // =========================================================================
  // EXTRACTION METHODS - CONDITIONAL
  // =========================================================================

  String _getCondition(dynamic node) {
    if (node is ConditionalExpression) {
      return node.condition.toString();
    }
    if (node is IfStatement) {
      return node.expression.toString();
    }
    return 'true';
  }

  dynamic _getThenBranch(dynamic node) {
    if (node is ConditionalExpression) {
      return node.thenExpression;
    }
    if (node is IfStatement) {
      return node.thenStatement;
    }
    return null;
  }

  dynamic _getElseBranch(dynamic node) {
    if (node is ConditionalExpression) {
      return node.elseExpression;
    }
    if (node is IfStatement) {
      return node.elseStatement;
    }
    return null;
  }

  bool _isTernary(dynamic node) {
    return node is ConditionalExpression;
  }

  // =========================================================================
  // EXTRACTION METHODS - LOOP
  // =========================================================================

  String _getLoopKind(dynamic node) {
    if (node is! ForStatement) return 'unknown';

    if (node.isForEach) {
      return 'forEach';
    }

    return 'for';
  }

  String? _getLoopVariable(dynamic node) {
    if (node is! ForStatement) return null;

    if (node.isForEach) {
      final parts = node.forLoopParts;
      if (parts is ForEachPartsWithDeclaration) {
        return parts.loopVariable.name.lexeme;
      }
      if (parts is ForEachPartsWithIdentifier) {
        return parts.identifier.name;
      }
    }

    return null;
  }

  String? _getIterable(dynamic node) {
    if (node is! ForStatement || !node.isForEach) return null;

    final parts = node.forLoopParts;
    if (parts is ForEachPartsWithDeclaration) {
      return parts.iterable.toString();
    }
    if (parts is ForEachPartsWithIdentifier) {
      return parts.iterable.toString();
    }

    return null;
  }

  String? _getLoopCondition(dynamic node) {
    if (node is! ForStatement || node.isForEach) return null;

    final parts = node.forLoopParts;
    if (parts is ForPartsWithDeclarations) {
      return parts.condition?.toString();
    }
    if (parts is ForPartsWithExpression) {
      return parts.condition?.toString();
    }

    return null;
  }

  dynamic _getLoopBody(dynamic node) {
    if (node is ForStatement) {
      return node.body;
    }
    return null;
  }

  // =========================================================================
  // EXTRACTION METHODS - COLLECTION
  // =========================================================================

  String _getCollectionKind(dynamic node) {
    if (node is ListLiteral) return 'list';
    if (node is SetOrMapLiteral) {
      return node.isMap ? 'map' : 'set';
    }
    return 'unknown';
  }

  bool _hasSpread(dynamic node) {
    return _hasSpreadElement(node);
  }

  bool _hasSpreadElement(dynamic node) {
    if (node is ListLiteral) {
      return node.elements.any((e) => e is SpreadElement);
    }
    if (node is SetOrMapLiteral) {
      return node.elements.any((e) => e is SpreadElement);
    }
    return false;
  }

  List<dynamic> _getCollectionElements(dynamic node) {
    if (node is ListLiteral) {
      return node.elements;
    }
    if (node is SetOrMapLiteral) {
      return node.elements;
    }
    return [];
  }

  // =========================================================================
  // EXTRACTION METHODS - BUILDER/CALLBACK
  // =========================================================================

  String _getBuilderName(dynamic node) {
    if (node is FunctionDeclaration) {
      return node.name.lexeme;
    }
    return 'builder';
  }

  List<String> _getBuilderParameters(dynamic node) {
    return _extractParameters(node);
  }

  bool _isAsyncBuilder(dynamic node) {
    if (node is FunctionDeclaration) {
      return node.functionExpression.body.isAsynchronous;
    }
    if (node is FunctionExpression) {
      return node.body.isAsynchronous;
    }
    return false;
  }

  String _getCallbackName(dynamic node) {
    if (node is FunctionDeclaration) {
      return node.name.lexeme;
    }
    return 'callback';
  }

  List<String> _getCallbackParameters(dynamic node) {
    return _extractParameters(node);
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  bool _isLikelyWidget(String className) {
    final commonWidgets = {
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
    };

    if (commonWidgets.contains(className)) return true;
    if (className.endsWith('Widget') || className.endsWith('Button'))
      return true;
    if (className[0].toUpperCase() == className[0]) return true;

    return false;
  }

  bool _isCallbackName(String name) {
    return name.startsWith('on') ||
        name == 'onTap' ||
        name == 'onPressed' ||
        name == 'onChanged';
  }

  bool _isBuilderName(String name) {
    return name == 'builder' ||
        name.endsWith('Builder') ||
        name.contains('builder');
  }

  List<String> _extractParameters(dynamic node) {
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
    return [];
  }
}

// ============================================================================
// INTEGRATION HELPER
// ============================================================================

/// Register adapter with component registry
void registerASTAdapter(
  ComponentRegistry registry,
  WidgetProducerDetector widgetDetector,
  String filePath,
  String fileContent,
) {
  final adapter = ASTComponentAdapter(
    widgetDetector: widgetDetector,
    filePath: filePath,
    fileContent: fileContent,
  );

  registry.register('ast', adapter);
}

/// Quick extraction from AST node
FlutterComponent extractFromAST(dynamic astNode, ComponentExtractor extractor) {
  return extractor.extract(astNode, hint: 'from_ast');
}
