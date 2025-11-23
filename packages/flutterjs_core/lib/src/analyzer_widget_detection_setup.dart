// ============================================================================
// IMPROVED: Widget Detection - Handles Custom Widgets
// ============================================================================
// Real Widget Requirements:
// 1. Class extends any class that ultimately extends Widget (from Flutter)
// 2. Class has build() method that returns Widget (or any Widget subclass)
// 3. Function returns Widget or any Widget subclass (via type resolution)
// ============================================================================

import 'package:analyzer/dart/analysis/analysis_context_collection.dart';
import 'package:analyzer/dart/analysis/results.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/element/element.dart';
import 'package:analyzer/dart/element/type.dart';
import 'package:analyzer/file_system/physical_file_system.dart';
import 'package:analyzer/dart/ast/visitor.dart';

/// Simplified, production-grade Widget detection
/// Uses only stable analyzer APIs (^8.4.1+)
class WidgetProducerDetector {
  final InterfaceType widgetType;
  final LibraryElement flutterWidgetsLibrary;

  // Prevent infinite loops in circular dependencies
  final Set<String> _visitedIds = {};

  // Cache results for performance
  final Map<String, bool> _cache = {};

  WidgetProducerDetector(this.widgetType)
    : flutterWidgetsLibrary = widgetType.element.library!;

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

// ─────────────────────────────────────────────────────────────────
// AST VISITOR - For analyzing widget expressions in method bodies
// ─────────────────────────────────────────────────────────────────

// class WidgetExpressionVisitor extends RecursiveAstVisitor<void> {
//   final InterfaceType widgetType;
//   final LibraryElement flutterWidgetsLibrary;

//   bool foundWidget = false;

//   WidgetExpressionVisitor(this.widgetType, this.flutterWidgetsLibrary);

//   @override
//   void visitInstanceCreationExpression(InstanceCreationExpression node) {
//     if (_isWidgetCreation(node)) {
//       foundWidget = true;
//       return;
//     }
//     super.visitInstanceCreationExpression(node);
//   }

//   @override
//   void visitReturnStatement(ReturnStatement node) {
//     if (node.expression != null && _isWidgetExpression(node.expression!)) {
//       foundWidget = true;
//       return;
//     }
//     super.visitReturnStatement(node);
//   }

//   bool _isWidgetCreation(InstanceCreationExpression expr) {
//     try {
//       final staticType = expr.staticType;
//       return _isWidgetType(staticType);
//     } catch (_) {
//       return false;
//     }
//   }

//   bool _isWidgetExpression(Expression expr) {
//     try {
//       final staticType = expr.staticType;
//       return _isWidgetType(staticType);
//     } catch (_) {
//       return false;
//     }
//   }

//   bool _isWidgetType(DartType? type) {
//     if (type == null) return false;

//     if (type is TypeParameterType) {
//       return _isWidgetType(type.bound);
//     }

//     if (type is! InterfaceType) return false;

//     // Direct check
//     if (type.element.name == 'Widget' &&
//         type.element.library == flutterWidgetsLibrary) {
//       return true;
//     }

//     // Check supertypes
//     try {
//       return type.element.allSupertypes.any(
//         (t) =>
//             t.element.name == 'Widget' &&
//             t.element.library == flutterWidgetsLibrary,
//       );
//     } catch (_) {
//       return false;
//     }
//   }
// }

// /// Analyzer setup
// class AnalyzerWidgetDetectionSetup {
//   late final AnalysisContextCollection collection;
//   bool initialized = false;

//   bool initialize(String projectRoot) {
//     try {
//       print('🔍 Initializing Analyzer for: $projectRoot');

//       collection = AnalysisContextCollection(
//         includedPaths: [projectRoot],
//         resourceProvider: PhysicalResourceProvider.INSTANCE,
//       );

//       initialized = true;
//       print('✅ Analyzer initialized successfully');
//       return true;
//     } catch (e) {
//       print('❌ Analyzer initialization failed: $e');
//       return false;
//     }
//   }

//   /// Get resolved unit for a file
//   Future<ResolvedUnitResult?> getResolvedUnit(String filePath) async {
//     if (!initialized) {
//       print('❌ Analyzer not initialized');
//       return null;
//     }

//     try {
//       final context = collection.contextFor(filePath);
//       final result = await context.currentSession.getResolvedUnit(filePath);

//       if (result is ResolvedUnitResult) {
//         print('✅ Resolved: $filePath');
//         return result;
//       } else {
//         print('❌ Resolution failed: $result');
//         return null;
//       }
//     } catch (e) {
//       print('❌ Exception during resolution: $e');
//       return null;
//     }
//   }
// }

/// IMPROVED: Widget Detection via Type Resolution
/// No hardcoded widget names - checks inheritance chain!
// class VerifiedWidgetDetection {
//   static String getWidgetKind(ExecutableElement element) {
//     final returnType = element.returnType;

//     if (returnType is InterfaceType) {
//       final returnTypeName = returnType.element.name;

//       // Check if it's the Widget base type or a specific widget
//       if (returnTypeName == 'Widget') {
//         return 'generic-Widget';
//       }

//       // Return the specific widget type
//       return returnTypeName ?? 'unknown-Widget';
//     }

//     return 'unknown';
//   }

//   /// Is this ClassElement a Widget?
//   /// REQUIREMENTS:
//   /// 1. Extends (directly or indirectly) StatelessWidget or StatefulWidget
//   /// 2. Has build() method that returns Widget
//   static bool isWidgetClass(ClassElement? classElement) {
//     if (classElement == null) return false;

//     print('   🔍 Checking class: ${classElement.name}');

//     // ✅ STEP 1: Check direct parent
//     final supertype = classElement.supertype;
//     if (supertype == null) {
//       print('      ❌ No supertype');
//       return false;
//     }

//     print('      Parent: ${supertype.element.name}');

//     // ✅ STEP 2: Handle special Flutter base types
//     return _checkInheritanceChain(classElement.name ?? 'Unknown', supertype);
//   }

//   /// Is this ExecutableElement a widget function?
//   /// REQUIREMENT: Returns Widget type (or any class that inherits from Widget)
//   static bool isWidgetFunction(ExecutableElement? element) {
//     if (element == null) return false;

//     print('   🔍 Checking function: ${element.name}');

//     // ✅ Skip abstract/external
//     if (element.isAbstract) {
//       print('      ℹ️  Abstract - skipping');
//       return false;
//     }

//     final returnType = element.returnType;
//     print(
//       '      Return type: ${returnType.getDisplayString(withNullability: true)}',
//     );

//     // ✅ Check if return type is Widget or subclass
//     if (returnType is InterfaceType) {
//       return _checkInheritanceChain('Function ${element.name}', returnType);
//     }

//     return false;
//   }
//   // =========================================================================
//   // CORE LOGIC: Type Resolution (No Hardcoded Lists!)
//   // =========================================================================

//   /// Check if a class inherits from Widget (anywhere in the hierarchy)
//   /// This walks the ENTIRE superclass chain
//   static bool _checkInheritanceChain(String context, InterfaceType? type) {
//     if (type == null) return false;

//     InterfaceType? current = type;
//     int depth = 0;

//     print('      🔄 Inheritance chain:');

//     while (current != null && depth < 10) {
//       final name = current.element.name;
//       final library = current.element.library?.identifier ?? 'unknown';

//       print('         [$depth] $name ← $library');

//       // ✅ WIDGET FOUND
//       if (name == 'Widget' && _isFlutterLibrary(library)) {
//         print('      ✅ IS A WIDGET (via $name)');
//         return true;
//       }

//       // ✅ SPECIAL: StatelessWidget, StatefulWidget also indicate widgets
//       if ((name == 'StatelessWidget' || name == 'StatefulWidget') &&
//           _isFlutterLibrary(library)) {
//         print('      ✅ IS A WIDGET (extends $name)');
//         return true;
//       }

//       // ✅ SPECIAL: State<T> indicates stateful widget
//       if (name == 'State' && _isFlutterLibrary(library)) {
//         print('      ✅ IS A WIDGET STATE (extends State<T>)');
//         return true;
//       }

//       current = current.superclass;
//       depth++;
//     }

//     print('      ❌ NO WIDGET FOUND');
//     return false;
//   }

//   static bool _isFlutterLibrary(String libraryUri) {
//     final isFlutter =
//         libraryUri.contains('package:flutter') ||
//         libraryUri.contains('dart:ui');

//     if (isFlutter) {
//       print('         📚 Flutter library: $libraryUri');
//     }

//     return isFlutter;
//   }

//   /// Check if a type is Widget or any subclass of Widget
//   /// This handles: Widget, StatelessWidget, StatefulWidget, CustomButton, etc.
//   static bool _returnsWidgetOrSubclass(InterfaceType type) {
//     InterfaceType? current = type;

//     while (current != null) {
//       final element = current.element;
//       final name = element.name;
//       final library = element.library?.identifier ?? '';

//       // ✅ Found Widget base class from Flutter
//       if (name == 'Widget' && _isFlutterLibrary(library)) {
//         print('   ✅ Type inherits from Widget (from $library)');
//         return true;
//       }

//       // Continue up the chain
//       current = current.superclass;
//     }

//     return false;
//   }

//   /// Check if a class has a valid build() method
//   /// build() must:
//   /// - Be named "build"
//   /// - Not be static
//   /// - Return Widget or a Widget subclass
//   static bool _hasBuildMethod(ClassElement classElement) {
//     // Find build() method (including inherited)
//     final buildMethod = classElement.methods.firstWhereOrNull(
//       (m) => m.name == 'build' && !m.isStatic,
//     );

//     if (buildMethod == null) {
//       print('   ❌ No build() method found');
//       return false;
//     }

//     print('   ✅ Found build() method');

//     // Check if build() returns Widget or Widget subclass
//     final returnType = buildMethod.returnType;
//     if (returnType is InterfaceType) {
//       final isWidget = _returnsWidgetOrSubclass(returnType);
//       if (isWidget) {
//         print('   ✅ build() returns Widget (or subclass)');
//         return true;
//       }
//     }

//     print('   ❌ build() does not return Widget');
//     return false;
//   }

//   /// Check if library is from Flutter
//   /// Handles: package:flutter, dart:ui, etc.

//   /// Get the direct superclass type name
//   /// For: class MyButton extends StatelessWidget → returns "StatelessWidget"
//   /// For: class MyButton extends CustomButton → returns "CustomButton"
//   static String? _getDirectSuperclassName(ClassElement classElement) {
//     return classElement.supertype?.element.name;
//   }

//   /// Get ALL ancestor classes in the chain
//   /// For: class MyButton extends CustomButton extends StatelessWidget
//   /// Returns: [CustomButton, StatelessWidget, Widget]
//   static List<String> _getInheritanceChain(ClassElement classElement) {
//     final chain = <String>[];
//     var current = classElement.supertype;

//     while (current != null) {
//       chain.add(current.element.name ?? '<unknown>');
//       current = current.superclass;
//     }

//     return chain;
//   }
// }

// /// Widget analysis pass
// class WidgetAnalysisPass {
//   final AnalyzerWidgetDetectionSetup setup;
//   final List<WidgetFound> foundWidgets = [];

//   WidgetAnalysisPass({required this.setup});

//   /// Analyze all files for widgets
//   Future<void> analyzeFiles(List<String> filePaths) async {
//     print('\n🔍 Analyzing ${filePaths.length} files for widgets...\n');

//     for (final filePath in filePaths) {
//       print('📄 Analyzing: $filePath');

//       final resolved = await setup.getResolvedUnit(filePath);
//       if (resolved == null) {
//         print('   ⚠️  Could not resolve file\n');
//         continue;
//       }

//       final compilationUnit = resolved.unit;

//       // Analyze classes
//       final classes = compilationUnit.declarations
//           .whereType<ClassDeclaration>()
//           .toList();

//       print('   📦 Classes found: ${classes.length}');
//       for (final classDecl in classes) {
//         final classElement = classDecl.declaredFragment?.element;

//         if (VerifiedWidgetDetection.isWidgetClass(classElement)) {
//           print('   ✅ Widget Class: ${classElement!.name}');

//           final superclassName =
//               VerifiedWidgetDetection._getDirectSuperclassName(classElement);
//           final inheritanceChain = VerifiedWidgetDetection._getInheritanceChain(
//             classElement,
//           );

//           final isStateful = superclassName == 'StatefulWidget';
//           final isStateless = superclassName == 'StatelessWidget';
//           final isCustomWidget = !isStateful && !isStateless;

//           // Get build method parameters
//           final buildMethod = classElement.methods.firstWhereOrNull(
//             (m) => m.name == 'build',
//           );
//           final List<String> buildParams =
//               buildMethod?.formalParameters
//                   .map<String>((p) => p.name ?? '')
//                   .where((name) => name.isNotEmpty)
//                   .toList() ??
//               <String>[];

//           // Get constructor parameters
//           final List<String> constructorParams =
//               classElement.constructors.isNotEmpty
//               ? classElement.constructors.first.formalParameters
//                     .map<String>((p) => p.name ?? '')
//                     .where((name) => name.isNotEmpty)
//                     .toList()
//               : <String>[];

//           foundWidgets.add(
//             WidgetFound(
//               name: classElement.name ?? '<unknown>',
//               type: WidgetType.widgetClass,
//               filePath: filePath,
//               superclass: superclassName,
//               isStateful: isStateful,
//               isStateless: isStateless,
//               isCustomWidget: isCustomWidget,
//               inheritanceChain: inheritanceChain,
//               parameters: constructorParams,
//               buildMethodParams: buildParams,
//               hasBuildMethod: true,
//             ),
//           );

//           print('      - Direct superclass: $superclassName');
//           print('      - Inheritance chain: ${inheritanceChain.join(' -> ')}');
//           print('      - Custom widget: $isCustomWidget');
//           print('      - Constructor params: $constructorParams');
//           print('      - build() params: $buildParams');
//         }
//       }

//       // Analyze functions
//       final functions = compilationUnit.declarations
//           .whereType<FunctionDeclaration>()
//           .toList();

//       print('   📦 Functions found: ${functions.length}');
//       for (final funcDecl in functions) {
//         final execElement = funcDecl.declaredFragment?.element;

//         if (VerifiedWidgetDetection.isWidgetFunction(execElement)) {
//           print('   ✅ Widget Function: ${execElement!.name}');

//           final params = execElement.formalParameters
//               .map((p) => p.name ?? '')
//               .where((name) => name.isNotEmpty)
//               .toList();

//           final returnTypeName = execElement.returnType.getDisplayString();

//           foundWidgets.add(
//             WidgetFound(
//               name: execElement.name ?? '<unknown>',
//               type: WidgetType.widgetFunction,
//               filePath: filePath,
//               parameters: params,
//               returnType: returnTypeName,
//             ),
//           );

//           print('      - Parameters: $params');
//           print('      - Returns: $returnTypeName');
//         }
//       }

//       print('');
//     }

//     _printSummary();
//   }

//   void _printSummary() {
//     print('\n${'=' * 60}');
//     print('📊 ANALYSIS SUMMARY');
//     print('=' * 60);
//     print('Total widgets found: ${foundWidgets.length}');

//     final classes = foundWidgets.where((w) => w.type == WidgetType.widgetClass);
//     final functions = foundWidgets.where(
//       (w) => w.type == WidgetType.widgetFunction,
//     );

//     final stateful = classes.where((w) => w.isStateful).length;
//     final stateless = classes.where((w) => w.isStateless).length;
//     final custom = classes.where((w) => w.isCustomWidget).length;

//     print('  - Widget Classes: ${classes.length}');
//     print('    • Stateful: $stateful');
//     print('    • Stateless: $stateless');
//     print('    • Custom: $custom');
//     print('  - Widget Functions: ${functions.length}');
//     print('=' * 60 + '\n');
//   }

//   void printReport() {
//     print('\n📋 DETAILED WIDGET REPORT\n');

//     final byType = <WidgetType, List<WidgetFound>>{};
//     for (final widget in foundWidgets) {
//       byType.putIfAbsent(widget.type, () => []).add(widget);
//     }

//     for (final entry in byType.entries) {
//       print('${entry.key.toString().split('.').last}:');
//       for (final widget in entry.value) {
//         print('  ✅ ${widget.name}');
//         if (widget.superclass != null) {
//           print('     extends: ${widget.superclass}');
//         }
//         if (widget.inheritanceChain.isNotEmpty) {
//           print('     chain: ${widget.inheritanceChain.join(' -> ')}');
//         }
//         if (widget.isStateful) print('     ⚙️  Stateful');
//         if (widget.isStateless) print('     🎨 Stateless');
//         if (widget.isCustomWidget) print('     🎯 Custom Widget');
//         if (widget.hasBuildMethod) {
//           print('     🔨 build(${widget.buildMethodParams.join(', ')})');
//         }
//         if (widget.returnType != null) {
//           print('     returns: ${widget.returnType}');
//         }
//         if (widget.parameters.isNotEmpty) {
//           print('     📋 params: ${widget.parameters.join(', ')}');
//         }
//         print('     📁 ${widget.filePath}');
//       }
//       print('');
//     }
//   }
// }

// class WidgetFound {
//   final String name;
//   final WidgetType type;
//   final String filePath;
//   final String? superclass;
//   final bool isStateful;
//   final bool isStateless;
//   final bool isCustomWidget;
//   final List<String> inheritanceChain;
//   final List<String> parameters;
//   final List<String> buildMethodParams;
//   final bool hasBuildMethod;
//   final String? returnType;

//   WidgetFound({
//     required this.name,
//     required this.type,
//     required this.filePath,
//     this.superclass,
//     this.isStateful = false,
//     this.isStateless = false,
//     this.isCustomWidget = false,
//     this.inheritanceChain = const [],
//     this.parameters = const [],
//     this.buildMethodParams = const [],
//     this.hasBuildMethod = false,
//     this.returnType,
//   });
// }

// enum WidgetType { widgetClass, widgetFunction }

// // ============================================================================
// // EXTENSION: For easier null-safe access
// // ============================================================================
// extension ListExtension<T> on List<T> {
//   T? firstWhereOrNull(bool Function(T) test) {
//     try {
//       return firstWhere(test);
//     } catch (e) {
//       return null;
//     }
//   }
// }
