// ============================================================================
// IMPROVED: Widget Detection - Handles Custom Widgets
// ============================================================================
// Real Widget Requirements:
// 1. Class extends any class that ultimately extends Widget (from Flutter)
// 2. Class has build() method that returns Widget (or any Widget subclass)
// 3. Function returns Widget or any Widget subclass (via type resolution)
// ============================================================================

import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/nullability_suffix.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:flutterjs_core/ast_it.dart';

// <---------------------------------------------------------------------------->
/// analyzer_widget_detection_setup.dart
/// ----------------------------------------------------------------------------
///
/// Production-grade widget detection utilities for a Flutter static analyzer.
///
/// This module focuses on robust, recursive identification of code that produces
/// Flutter widgets, handling both classes and functions. It integrates with the
/// Dart Analyzer's AST and element model to trace inheritance chains, return types,
/// and builder patterns without relying on unstable APIs.
///
/// Core entity: [WidgetProducerDetector] – a stateful detector that resolves
/// whether any Dart element (class, method, constructor, field) ultimately produces
/// a Widget subtype. It uses:
/// • Type resolution via [InterfaceType] and [DartType]
/// • Recursion guards and caching to handle circular dependencies
/// • Heuristics for common patterns (e.g., builder functions, const constructors)
///
/// Key features:
/// • Detects direct Widget subclasses, StatefulWidget States, and indirect producers
/// • Handles generics, factories, redirects, and inherited types
/// • Stable ID generation for elements to enable caching and cycle detection
/// • Extensible for custom widget-like types (e.g., third-party frameworks)
///
/// Typical usage in an analysis pass:
/// dart:disable-run /// final detector = WidgetProducerDetector(widgetInterfaceType); /// if (detector.producesWidget(classElement)) { /* process as widget */ } ///
///
/// Designed for:
/// • IDE plugins / linters needing precise widget identification
/// • Architecture auditors (e.g., count Stateful vs Stateless)
/// • Refactoring tools (e.g., extract-widget)
/// • Performance analyzers (widget tree depth / rebuild tracking)
///
/// All methods are pure and thread-safe except for the detector's internal cache,
/// which is per-instance. Classes provide rich toString for debugging.
/// <---------------------------------------------------------------------------->
///
class WidgetProducerDetector {
  final InterfaceType widgetType;
  final LibraryElement flutterWidgetsLibrary;

  // Prevent infinite loops in circular dependencies
  final Set<String> _visitedIds = {};

  // Cache results for performance
  final Map<String, bool> _cache = {};

  WidgetProducerDetector(this.widgetType)
    : flutterWidgetsLibrary = widgetType.element.library;

  /// Generate stable ID for element
  String _stableId(Element e) {
    final name = e.name ?? 'unnamed';
    final libName = e.library?.name ?? 'no_lib';
    return '$libName:$name:${e.hashCode}';
  }

  /// Main detection method - handles all element types
  bool producesWidget(Element? element) {
    if (element == null) return false;

    final id = _stableId(element);

    // Check cache first
    if (_cache.containsKey(id)) {
      return _cache[id]!;
    }

    // Prevent infinite recursion on circular dependencies
    if (_visitedIds.contains(id)) return false;
    _visitedIds.add(id);

    bool result = false;

    if (element is ClassElement) {
      result = _classProducesWidget(element);
    } else if (element is MethodElement) {
      result = _executableProducesWidget(element);
    } else if (element is PropertyAccessorElement) {
      result = _executableProducesWidget(element);
    } else if (element is ConstructorElement) {
      result = _constructorProducesWidget(element);
    } else if (element is FieldElement) {
      result = _fieldProducesWidget(element);
    }

    // Cache the result
    _cache[id] = result;
    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // CLASS DETECTION
  // ─────────────────────────────────────────────────────────────

  bool _classProducesWidget(ClassElement cls) {
    // Direct widget subclass
    if (_typeIsWidget(cls.thisType)) return true;

    // StatefulWidget with build method
    if (_extendsState(cls)) {
      return cls.methods.any((m) => m.name == 'build');
    }

    // Check methods, constructors, fields
    return cls.methods.any(producesWidget) ||
        cls.constructors.any(producesWidget) ||
        cls.fields.any(producesWidget);
  }

  bool _constructorProducesWidget(ConstructorElement ctor) {
    if (ctor.isConst && _typeIsWidget(ctor.enclosingElement.thisType)) {
      return true;
    }

    // Follow factory redirects
    if (ctor.isFactory && ctor.redirectedConstructor != null) {
      return producesWidget(ctor.redirectedConstructor!);
    }

    // Check return type
    return _typeIsWidget(ctor.returnType);
  }

  bool _executableProducesWidget(ExecutableElement exec) {
    // Check return type first (fast path)
    if (_typeIsWidget(exec.returnType)) return true;
    if (_typeIsWidgetContainer(exec.returnType)) return true;

    // Check if it matches builder pattern
    if (_isBuilderFunction(exec)) return true;

    return false;
  }

  bool _fieldProducesWidget(FieldElement field) {
    if (field.getter != null && producesWidget(field.getter!)) return true;
    if (_typeIsWidget(field.type)) return true;
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // TYPE CHECKING
  // ─────────────────────────────────────────────────────────────

  /// Check if type is Widget or assignable to Widget
  bool _typeIsWidget(DartType? type) {
    if (type == null) return false;
    if (type.isBottom) return false;

    // Handle type parameters: T extends Widget
    if (type is TypeParameterType) {
      return _typeIsWidget(type.bound);
    }

    if (type is! InterfaceType) return false;

    // Direct comparison
    if (type.element.name == 'Widget' &&
        type.element.library == flutterWidgetsLibrary) {
      return true;
    }

    // Check supertype hierarchy
    try {
      return type.element.allSupertypes.any(
        (t) =>
            t.element.name == 'Widget' &&
            t.element.library == flutterWidgetsLibrary,
      );
    } catch (_) {
      return false;
    }
  }

  /// Check for container types: List<Widget>, Future<Widget>, etc.
  bool _typeIsWidgetContainer(DartType? type) {
    if (type is! InterfaceType) return false;

    bool containsWidget(DartType t) {
      if (_typeIsWidget(t)) return true;

      if (t is InterfaceType) {
        return t.typeArguments.any(containsWidget);
      }

      if (t is TypeParameterType) {
        return containsWidget(t.bound);
      }

      return false;
    }

    return type.typeArguments.any(containsWidget);
  }

  // ─────────────────────────────────────────────────────────────
  // PATTERN DETECTION
  // ─────────────────────────────────────────────────────────────

  /// Check if executable is a builder function
  bool _isBuilderFunction(ExecutableElement e) {
    // Type-based check first
    if (_typeIsWidget(e.returnType)) return true;
    if (_typeIsWidgetContainer(e.returnType)) return true;

    // Name + parameter heuristic
    final name = e.name.toString().toLowerCase();
    if ((name.contains('build') || name.contains('render')) && _hasParams(e)) {
      return true;
    }

    return false;
  }

  /// Check if executable has BuildContext parameter
  bool _hasParams(ExecutableElement e) {
    try {
      List<dynamic> params = [];

      if (e is MethodElement) {
        params = e.formalParameters;
      } else if (e is PropertyAccessorElement) {
        params = e.formalParameters;
      }

      if (params.isNotEmpty) {
        for (final p in params) {
          if (_isBuildContextParam(p)) return true;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Check if parameter is BuildContext
  bool _isBuildContextParam(dynamic p) {
    try {
      final paramType = p.type;

      if (paramType is InterfaceType) {
        final elem = paramType.element;
        if (elem.name == 'BuildContext' &&
            elem.library == flutterWidgetsLibrary) {
          return true;
        }
      }

      final typeName = paramType.getDisplayString(withNullability: false);
      return typeName == 'BuildContext' || typeName.contains('BuildContext');
    } catch (_) {
      return false;
    }
  }

  /// Check if class extends State<T>
  bool _extendsState(ClassElement cls) {
    try {
      for (final supertype in cls.allSupertypes) {
        if (supertype.element.name == 'State' &&
            supertype.element.library == flutterWidgetsLibrary) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  void resetCache() {
    _cache.clear();
    _visitedIds.clear();
  }
}

class MethodCallExpressionType {
  final String filePath;

  final DartFileBuilder builder;

  MethodCallExpressionType({required this.builder, required this.filePath});
  TypeIR extractTypeFromDartType(DartType dartType, int offset) {
    // ✅ Create SourceLocationIR directly
    final sourceLoc = SourceLocationIR(
      id: builder.generateId('loc'),
      file: filePath,
      line: 0,
      column: 0,
      offset: offset,
      length: 0,
    );
    final id = builder.generateId('type');

    // Case 1: Dynamic type
    if (dartType is DynamicType) {
      return DynamicTypeIR(id: id, sourceLocation: sourceLoc);
    }

    // Case 2: Void type
    if (dartType is VoidType) {
      return VoidTypeIR(id: id, sourceLocation: sourceLoc);
    }

    // Case 3: Never type
    if (dartType is NeverType) {
      return NeverTypeIR(id: id, sourceLocation: sourceLoc);
    }

    // Case 4: Interface types (classes like CounterModel, List<String>, etc.)
    if (dartType is InterfaceType) {
      final typeArgs = dartType.typeArguments.isEmpty
          ? <TypeIR>[]
          : dartType.typeArguments
                .map((t) => extractTypeFromDartType(t, offset))
                .toList();

      return ClassTypeIR(
        name: dartType.element.name ?? '<unknown>',
        id: id,
        className: dartType.element.name ?? '<unknown>',
        typeArguments: typeArgs,
        sourceLocation: sourceLoc,
      );
    }

    // Case 5: Type parameters (generics like T, U)
    if (dartType is TypeParameterType) {
      // ✅ Return SimpleTypeIR instead of TypeParameterIR (which may not exist)
      return SimpleTypeIR(
        id: id,
        name: dartType.element.name ?? 'T',
        isNullable: false,
        sourceLocation: sourceLoc,
      );
    }

    // Case 6: Function types
    if (dartType is FunctionType) {
      // ✅ Extract all parameters using normalParameterTypes
      final allParams = <TypeIR>[];

      // Add normal/positional parameters
      for (final param in dartType.normalParameterTypes) {
        allParams.add(extractTypeFromDartType(param, offset));
      }

      return SimpleTypeIR(
        id: id,
        name: 'Function', // ✅ Simplified function type representation
        isNullable: false,
        sourceLocation: sourceLoc,
      );
    }

    // Case 7: Fallback for other types
    // Treat as a simple type using string representation
    final typeName = dartType.toString().replaceAll('?', '').trim();

    return SimpleTypeIR(
      id: id,
      name: typeName,
      isNullable: dartType.nullabilitySuffix == NullabilitySuffix.question,
      sourceLocation: sourceLoc,
    );
  }
}
