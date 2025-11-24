// // ============================================================================
// // AST TO IR ADAPTER - PRODUCTION GRADE
// // ============================================================================
// // Migration from simplified FlutterComponent to high-fidelity IR:
// // - Analyzes Dart AST using analyzer package
// // - Produces BuildMethodIR with complete widget tree analysis
// // - Tracks: const widgets, conditionals, loops, keys, async builders,
// //   performance metrics, optimization opportunities, and issues
// // - Supports hot reload serialization via JSON
// // ============================================================================

// import 'package:analyzer/dart/ast/ast.dart';
// import 'package:analyzer/dart/element/element.dart';
// import 'package:analyzer/dart/element/type.dart';

// import '../diagnostics/source_location.dart';
// import '../ir/expression_ir.dart';
// import '../ir/ir_node.dart';
// import '../ir/type_ir.dart';
// import '../build_method/build_method_ir.dart';
// import '../build_method/widget_tree_ir.dart';
// import '../build_method/widget_node_ir.dart';
// import '../build_method/key_type_ir.dart';
// import 'flutter_component_system.dart';

// // ============================================================================
// // 1. AST-TO-IR DETECTOR & ADAPTER
// // ============================================================================

// /// Analyzer-based ComponentDetector that produces IR
// class ASTComponentAdapter implements ComponentDetector {
//   final WidgetProducerDetector? widgetDetector;
//   final String filePath;
//   final String fileContent;
//   final ComponentRegistry registry;

//   int _idCounter = 0;

//   ASTComponentAdapter({
//     required this.widgetDetector,
//     required this.filePath,
//     required this.fileContent,
//     required this.registry,
//   });

//   String _generateId(String prefix) => '${prefix}_${++_idCounter}';

//   // =========================================================================
//   // DETECTOR INTERFACE IMPLEMENTATION
//   // =========================================================================

//   @override
//   dynamic call(String method, dynamic node) {
//     switch (method) {
//       // Detection methods
//       case 'isWidgetCreation':
//         return _isWidgetCreation(node);
//       case 'isConditional':
//         return _isConditional(node);
//       case 'isLoop':
//         return _isLoop(node);
//       case 'isCollection':
//         return _isCollection(node);
//       case 'isBuilder':
//         return _isBuilder(node);
//       case 'isCallback':
//         return _isCallback(node);
//       case 'isBuildMethod':
//         return _isBuildMethod(node);

//       // Extraction methods - widget
//       case 'getWidgetName':
//         return _getWidgetName(node);
//       case 'getConstructorName':
//         return _getConstructorName(node);
//       case 'isConst':
//         return _isConst(node);
//       case 'getProperties':
//         return _getProperties(node);
//       case 'getChildElements':
//         return _getChildElements(node);
//       case 'getKeyInfo':
//         return _getKeyInfo(node);

//       // Extraction methods - conditional
//       case 'getCondition':
//         return _getCondition(node);
//       case 'getThenBranch':
//         return _getThenBranch(node);
//       case 'getElseBranch':
//         return _getElseBranch(node);
//       case 'isTernary':
//         return _isTernary(node);

//       // Extraction methods - loop
//       case 'getLoopKind':
//         return _getLoopKind(node);
//       case 'getLoopVariable':
//         return _getLoopVariable(node);
//       case 'getIterable':
//         return _getIterable(node);
//       case 'getLoopCondition':
//         return _getLoopCondition(node);
//       case 'getLoopBody':
//         return _getLoopBody(node);

//       // Extraction methods - collection
//       case 'getCollectionKind':
//         return _getCollectionKind(node);
//       case 'hasSpread':
//         return _hasSpread(node);
//       case 'getCollectionElements':
//         return _getCollectionElements(node);

//       // Extraction methods - builder/callback
//       case 'getBuilderName':
//         return _getBuilderName(node);
//       case 'getBuilderParameters':
//         return _getBuilderParameters(node);
//       case 'isAsyncBuilder':
//         return _isAsyncBuilder(node);
//       case 'getCallbackName':
//         return _getCallbackName(node);
//       case 'getCallbackParameters':
//         return _getCallbackParameters(node);

//       // NEW: High-fidelity IR extraction
//       case 'extractBuildMethod':
//         return _extractBuildMethodIR(node);

//       default:
//         return null;
//     }
//   }

//   // =========================================================================
//   // DETECTION METHODS
//   // =========================================================================

//   bool _isBuildMethod(dynamic node) {
//     if (node is! MethodDeclaration) return false;
//     return node.name.lexeme == 'build' && !node.isStatic;
//   }

//   bool _isWidgetCreation(dynamic node) {
//     if (node is! InstanceCreationExpression) return false;
//     final className = node.constructorName.type.name.toString();
//     return _isLikelyWidget(className);
//   }

//   bool _isConditional(dynamic node) {
//     return node is ConditionalExpression || node is IfStatement;
//   }

//   bool _isLoop(dynamic node) {
//     return node is ForStatement;
//   }

//   bool _isCollection(dynamic node) {
//     return node is ListLiteral ||
//         node is SetOrMapLiteral ||
//         (node is ListLiteral && _hasSpreadElement(node));
//   }

//   bool _isBuilder(dynamic node) {
//     if (node is! FunctionExpression && node is! FunctionDeclaration) {
//       return false;
//     }
//     final name = node is FunctionDeclaration ? node.name.lexeme : 'lambda';
//     return name.toLowerCase().contains('build') ||
//         name.toLowerCase().contains('render') ||
//         name.toLowerCase().contains('create');
//   }

//   bool _isCallback(dynamic node) {
//     if (node is! FunctionExpression && node is! FunctionDeclaration) {
//       return false;
//     }
//     final name = node is FunctionDeclaration ? node.name.lexeme : 'lambda';
//     return name.toLowerCase().startsWith('on') ||
//         name.toLowerCase().startsWith('handle');
//   }

//   // =========================================================================
//   // EXTRACTION METHODS - WIDGET
//   // =========================================================================

//   String _getWidgetName(dynamic node) {
//     if (node is InstanceCreationExpression) {
//       return node.constructorName.type.name.toString();
//     }
//     return 'Unknown';
//   }

//   String? _getConstructorName(dynamic node) {
//     if (node is InstanceCreationExpression) {
//       final ctor = node.constructorName.name?.name;
//       return ctor?.isNotEmpty == true ? ctor : null;
//     }
//     return null;
//   }

//   bool _isConst(dynamic node) {
//     if (node is InstanceCreationExpression) {
//       return node.isConst;
//     }
//     return false;
//   }

//   List<PropertyBinding> _getProperties(dynamic node) {
//     if (node is! InstanceCreationExpression) return [];
//     final props = <PropertyBinding>[];

//     for (final arg in node.argumentList.arguments) {
//       if (arg is NamedExpression) {
//         final name = arg.name.label.name;
//         final value = arg.expression.toString();

//         if (_isCallbackName(name)) {
//           props.add(CallbackPropertyBinding(
//             name: name,
//             value: value,
//             parameters: _extractParameters(arg.expression),
//           ));
//         } else if (_isBuilderName(name)) {
//           props.add(BuilderPropertyBinding(
//             name: name,
//             value: value,
//             parameters: _extractParameters(arg.expression),
//           ));
//         } else {
//           props.add(LiteralPropertyBinding(name: name, value: value));
//         }
//       }
//     }

//     return props;
//   }

//   List<dynamic> _getChildElements(dynamic node) {
//     if (node is! InstanceCreationExpression) return [];
//     final children = <dynamic>[];

//     for (final arg in node.argumentList.arguments) {
//       if (arg is NamedExpression && arg.name.label.name == 'children') {
//         if (arg.expression is ListLiteral) {
//           final list = arg.expression as ListLiteral;
//           children.addAll(list.elements);
//         }
//         break;
//       }
//     }

//     return children;
//   }

//   KeyTypeIR? _getKeyInfo(dynamic node) {
//     if (node is! InstanceCreationExpression) return null;

//     for (final arg in node.argumentList.arguments) {
//       if (arg is NamedExpression && arg.name.label.name == 'key') {
//         return _extractKeyType(arg.expression);
//       }
//     }

//     return null;
//   }

//   KeyTypeIR? _extractKeyType(Expression expr) {
//     if (expr is InstanceCreationExpression) {
//       final keyClass = expr.constructorName.type.name.toString();
//       final isConst = expr.isConst;

//       switch (keyClass) {
//         case 'ValueKey':
//           return KeyTypeIR(
//             id: _generateId('key_value'),
//             sourceLocation: SourceLocationIR(
//               id: 'key_loc',
//               file: filePath,
//               line: 0,
//               column: 0,
//               offset: 0,
//               length: 0,
//             ),
//             kind: KeyKindIR.valueKey,
//             valueType: TypeIR.dynamic_(),
//             isConst: isConst,
//           );
//         case 'ObjectKey':
//           return KeyTypeIR(
//             id: _generateId('key_object'),
//             sourceLocation: SourceLocationIR(
//               id: 'key_loc',
//               file: filePath,
//               line: 0,
//               column: 0,
//               offset: 0,
//               length: 0,
//             ),
//             kind: KeyKindIR.objectKey,
//             isConst: isConst,
//           );
//         case 'UniqueKey':
//           return KeyTypeIR(
//             id: _generateId('key_unique'),
//             sourceLocation: SourceLocationIR(
//               id: 'key_loc',
//               file: filePath,
//               line: 0,
//               column: 0,
//               offset: 0,
//               length: 0,
//             ),
//             kind: KeyKindIR.uniqueKey,
//             isConst: isConst,
//           );
//         case 'GlobalKey':
//           return KeyTypeIR(
//             id: _generateId('key_global'),
//             sourceLocation: SourceLocationIR(
//               id: 'key_loc',
//               file: filePath,
//               line: 0,
//               column: 0,
//               offset: 0,
//               length: 0,
//             ),
//             kind: KeyKindIR.globalKey,
//             isConst: isConst,
//           );
//         case 'PageStorageKey':
//           return KeyTypeIR(
//             id: _generateId('key_pagestorage'),
//             sourceLocation: SourceLocationIR(
//               id: 'key_loc',
//               file: filePath,
//               line: 0,
//               column: 0,
//               offset: 0,
//               length: 0,
//             ),
//             kind: KeyKindIR.pageStorageKey,
//             isConst: isConst,
//           );
//         default:
//           if (keyClass.endsWith('Key')) {
//             return KeyTypeIR(
//               id: _generateId('key_local'),
//               sourceLocation: SourceLocationIR(
//                 id: 'key_loc',
//                 file: filePath,
//                 line: 0,
//                 column: 0,
//                 offset: 0,
//                 length: 0,
//               ),
//               kind: KeyKindIR.localKey,
//               isConst: isConst,
//             );
//           }
//       }
//     }

//     return null;
//   }

//   // =========================================================================
//   // EXTRACTION METHODS - CONDITIONAL
//   // =========================================================================

//   String _getCondition(dynamic node) {
//     if (node is ConditionalExpression) {
//       return node.condition.toString();
//     }
//     if (node is IfStatement) {
//       return node.expression.toString();
//     }
//     return 'true';
//   }

//   dynamic _getThenBranch(dynamic node) {
//     if (node is ConditionalExpression) {
//       return node.thenExpression;
//     }
//     if (node is IfStatement) {
//       return node.thenStatement;
//     }
//     return null;
//   }

//   dynamic _getElseBranch(dynamic node) {
//     if (node is ConditionalExpression) {
//       return node.elseExpression;
//     }
//     if (node is IfStatement) {
//       return node.elseStatement;
//     }
//     return null;
//   }

//   bool _isTernary(dynamic node) {
//     return node is ConditionalExpression;
//   }

//   // =========================================================================
//   // EXTRACTION METHODS - LOOP
//   // =========================================================================

//   String _getLoopKind(dynamic node) {
//     if (node is! ForStatement) return 'unknown';
//     return node.isForEach ? 'forEach' : 'for';
//   }

//   String? _getLoopVariable(dynamic node) {
//     if (node is! ForStatement) return null;

//     if (node.isForEach) {
//       final parts = node.forLoopParts;
//       if (parts is ForEachPartsWithDeclaration) {
//         return parts.loopVariable.name.lexeme;
//       }
//       if (parts is ForEachPartsWithIdentifier) {
//         return parts.identifier.name;
//       }
//     }

//     return null;
//   }

//   String? _getIterable(dynamic node) {
//     if (node is! ForStatement || !node.isForEach) return null;

//     final parts = node.forLoopParts;
//     if (parts is ForEachPartsWithDeclaration) {
//       return parts.iterable.toString();
//     }
//     if (parts is ForEachPartsWithIdentifier) {
//       return parts.iterable.toString();
//     }

//     return null;
//   }

//   String? _getLoopCondition(dynamic node) {
//     if (node is! ForStatement || node.isForEach) return null;

//     final parts = node.forLoopParts;
//     if (parts is ForPartsWithDeclarations) {
//       return parts.condition?.toString();
//     }
//     if (parts is ForPartsWithExpression) {
//       return parts.condition?.toString();
//     }

//     return null;
//   }

//   dynamic _getLoopBody(dynamic node) {
//     if (node is ForStatement) {
//       return node.body;
//     }
//     return null;
//   }

//   // =========================================================================
//   // EXTRACTION METHODS - COLLECTION
//   // =========================================================================

//   String _getCollectionKind(dynamic node) {
//     if (node is ListLiteral) return 'list';
//     if (node is SetOrMapLiteral) {
//       return node.isMap ? 'map' : 'set';
//     }
//     return 'unknown';
//   }

//   bool _hasSpread(dynamic node) {
//     return _hasSpreadElement(node);
//   }

//   bool _hasSpreadElement(dynamic node) {
//     if (node is ListLiteral) {
//       return node.elements.any((e) => e is SpreadElement);
//     }
//     if (node is SetOrMapLiteral) {
//       return node.elements.any((e) => e is SpreadElement);
//     }
//     return false;
//   }

//   List<dynamic> _getCollectionElements(dynamic node) {
//     if (node is ListLiteral) {
//       return node.elements;
//     }
//     if (node is SetOrMapLiteral) {
//       return node.elements;
//     }
//     return [];
//   }

//   // =========================================================================
//   // EXTRACTION METHODS - BUILDER/CALLBACK
//   // =========================================================================

//   String _getBuilderName(dynamic node) {
//     if (node is FunctionDeclaration) {
//       return node.name.lexeme;
//     }
//     return 'builder';
//   }

//   List<String> _getBuilderParameters(dynamic node) {
//     return _extractParameters(node);
//   }

//   bool _isAsyncBuilder(dynamic node) {
//     if (node is FunctionDeclaration) {
//       return node.functionExpression.body.isAsynchronous;
//     }
//     if (node is FunctionExpression) {
//       return node.body.isAsynchronous;
//     }
//     return false;
//   }

//   String _getCallbackName(dynamic node) {
//     if (node is FunctionDeclaration) {
//       return node.name.lexeme;
//     }
//     return 'callback';
//   }

//   List<String> _getCallbackParameters(dynamic node) {
//     return _extractParameters(node);
//   }

//   // =========================================================================
//   // NEW: HIGH-FIDELITY IR EXTRACTION
//   // =========================================================================

//   /// Extract a build method into complete BuildMethodIR with WidgetTreeIR
//   BuildMethodIR? _extractBuildMethodIR(dynamic node) {
//     if (node is! MethodDeclaration) return null;
//     if (node.name.lexeme != 'build') return null;

//     final methodId = _generateId('build_method');
//     final location = SourceLocationIR(
//       id: methodId,
//       file: filePath,
//       line: 0,
//       column: 0,
//       offset: 0,
//       length: 0,
//     );

//     // Extract return expression
//     final returnExpr = _extractReturnExpression(node.body);

//     // Build widget tree
//     WidgetNodeIR? rootWidget;
//     List<WidgetInstantiationIR> instantiatedWidgets = [];
//     List<ConditionalWidgetIR> conditionalWidgets = [];
//     List<LoopWidgetIR> loopWidgets = [];
//     List<AsyncBuilderIR> futureBuilders = [];
//     List<AsyncBuilderIR> streamBuilders = [];

//     if (returnExpr != null) {
//       // Traverse and build IR nodes
//       final traversal = _traverseExpression(
//         returnExpr,
//         treeDepth: 0,
//         inConditional: false,
//         inLoop: false,
//       );

//       rootWidget = traversal.widgetNode;
//       instantiatedWidgets = traversal.allInstantiations;
//       conditionalWidgets = traversal.conditionalWidgets;
//       loopWidgets = traversal.loopWidgets;
//       futureBuilders = traversal.futureBuilders;
//       streamBuilders = traversal.streamBuilders;
//     }

//     // Build WidgetTreeIR
//     final widgetTree = rootWidget != null
//         ? _buildWidgetTreeIR(
//             rootWidget,
//             instantiatedWidgets,
//             conditionalWidgets,
//             loopWidgets,
//           )
//         : null;

//     // Count const/non-const
//     int constCount = 0;
//     int nonConstCount = 0;
//     for (final widget in instantiatedWidgets) {
//       if (widget.isConst) {
//         constCount++;
//       } else {
//         nonConstCount++;
//       }
//     }

//     // Extract control flow
//     final controlFlow = _extractControlFlow(node.body, location);

//     // Extract performance metrics
//     final performance = _extractPerformanceMetrics(
//       instantiatedWidgets,
//       rootWidget,
//       location,
//     );

//     // Extract issues and suggestions
//     final issues = <BuildMethodIssueIR>[];
//     final suggestions = <BuildOptimizationSuggestionIR>[];

//     return BuildMethodIR(
//       id: methodId,
//       name: node.name.lexeme,
//       className: node.parent is ClassDeclaration
//           ? (node.parent as ClassDeclaration).name.lexeme
//           : 'Unknown',
//       sourceLocation: location,
//       rootWidget: rootWidget,
//       widgetTree: widgetTree,
//       instantiatedWidgets: instantiatedWidgets,
//       conditionalWidgets: conditionalWidgets,
//       loopWidgets: loopWidgets,
//       constWidgetCount: constCount,
//       nonConstWidgetCount: nonConstCount,
//       futureBuilders: futureBuilders,
//       streamBuilders: streamBuilders,
//       controlFlow: controlFlow,
//       performance: performance,
//       issues: issues,
//     );
//   }

//   /// Traverse expression tree and collect widget IR nodes
//   _ExpressionTraversal _traverseExpression(
//     Expression expr, {
//     required int treeDepth,
//     required bool inConditional,
//     required bool inLoop,
//   }) {
//     final result = _ExpressionTraversal();

//     if (expr is InstanceCreationExpression) {
//       final widgetName = expr.constructorName.type.name.toString();
//       final isWidget = _isLikelyWidget(widgetName);

//       if (isWidget) {
//         // Extract widget instantiation
//         final instantiation = WidgetInstantiationIR(
//           id: _generateId('widget_inst_$widgetName'),
//           sourceLocation: SourceLocationIR(
//             id: _generateId('loc'),
//             file: filePath,
//             line: 0,
//             column: 0,
//             offset: 0,
//             length: 0,
//           ),
//           widgetType: widgetName,
//           constructorName: expr.constructorName.name?.name,
//           isConst: expr.isConst,
//           isConditional: inConditional,
//           isInLoop: inLoop,
//           treeDepth: treeDepth,
//         );

//         result.allInstantiations.add(instantiation);

//         // Extract key info
//         KeyTypeIR? keyType;
//         for (final arg in expr.argumentList.arguments) {
//           if (arg is NamedExpression && arg.name.label.name == 'key') {
//             keyType = _extractKeyType(arg.expression);
//             break;
//           }
//         }

//         // Extract child widgets
//         final children = <WidgetNodeIR>[];
//         for (final arg in expr.argumentList.arguments) {
//           if (arg is NamedExpression && arg.name.label.name == 'child') {
//             final childTraversal = _traverseExpression(
//               arg.expression,
//               treeDepth: treeDepth + 1,
//               inConditional: inConditional,
//               inLoop: inLoop,
//             );
//             if (childTraversal.widgetNode != null) {
//               children.add(childTraversal.widgetNode!);
//             }
//             result.merge(childTraversal);
//           } else if (arg is NamedExpression && arg.name.label.name == 'children') {
//             if (arg.expression is ListLiteral) {
//               final list = arg.expression as ListLiteral;
//               for (final elem in list.elements) {
//                 final childTraversal = _traverseExpression(
//                   elem as Expression,
//                   treeDepth: treeDepth + 1,
//                   inConditional: inConditional,
//                   inLoop: inLoop,
//                 );
//                 if (childTraversal.widgetNode != null) {
//                   children.add(childTraversal.widgetNode!);
//                 }
//                 result.merge(childTraversal);
//               }
//             }
//           }
//         }

//         // Detect async builders
//         if (widgetName == 'FutureBuilder') {
//           final asyncBuilder = _extractAsyncBuilder(expr, AsyncBuilderKindIR.futureBuilder);
//           if (asyncBuilder != null) {
//             result.futureBuilders.add(asyncBuilder);
//           }
//         } else if (widgetName == 'StreamBuilder') {
//           final asyncBuilder = _extractAsyncBuilder(expr, AsyncBuilderKindIR.streamBuilder);
//           if (asyncBuilder != null) {
//             result.streamBuilders.add(asyncBuilder);
//           }
//         }

//         // Create WidgetNodeIR
//         result.widgetNode = WidgetNodeIR(
//           id: _generateId('node_$widgetName'),
//           sourceLocation: SourceLocationIR(
//             id: _generateId('loc'),
//             file: filePath,
//             line: 0,
//             column: 0,
//             offset: 0,
//             length: 0,
//           ),
//           widgetType: widgetName,
//           constructorName: expr.constructorName.name?.name,
//           children: children,
//           key: keyType,
//           isConst: expr.isConst,
//           treeDepth: treeDepth,
//           isConditional: inConditional,
//           isInLoop: inLoop,
//         );
//       }
//     } else if (expr is ConditionalExpression) {
//       // Handle ternary operator
//       final conditionCode = expr.condition.toString();

//       final thenTraversal = _traverseExpression(
//         expr.thenExpression,
//         treeDepth: treeDepth,
//         inConditional: true,
//         inLoop: inLoop,
//       );

//       final elseTraversal = _traverseExpression(
//         expr.elseExpression,
//         treeDepth: treeDepth,
//         inConditional: true,
//         inLoop: inLoop,
//       );

//       result.merge(thenTraversal);
//       result.merge(elseTraversal);

//       if (thenTraversal.widgetNode != null || elseTraversal.widgetNode != null) {
//         result.conditionalWidgets.add(
//           ConditionalWidgetIR(
//             id: _generateId('cond_widget'),
//             sourceLocation: SourceLocationIR(
//               id: _generateId('loc'),
//               file: filePath,
//               line: 0,
//               column: 0,
//               offset: 0,
//               length: 0,
//             ),
//             condition: LiteralExpressionIR(
//               id: _generateId('expr'),
//               sourceLocation: SourceLocationIR(
//                 id: _generateId('loc'),
//                 file: filePath,
//                 line: 0,
//                 column: 0,
//                 offset: 0,
//                 length: 0,
//               ),
//               value: conditionCode,
//             ),
//             thenWidget: thenTraversal.widgetNode != null
//                 ? WidgetInstantiationIR(
//                     id: _generateId('widget_inst'),
//                     sourceLocation: thenTraversal.widgetNode!.sourceLocation,
//                     widgetType: thenTraversal.widgetNode!.widgetType,
//                     isConst: thenTraversal.widgetNode!.isConst,
//                   )
//                 : null,
//             elseWidget: elseTraversal.widgetNode != null
//                 ? WidgetInstantiationIR(
//                     id: _generateId('widget_inst'),
//                     sourceLocation: elseTraversal.widgetNode!.sourceLocation,
//                     widgetType: elseTraversal.widgetNode!.widgetType,
//                     isConst: elseTraversal.widgetNode!.isConst,
//                   )
//                 : null,
//             patternType: ConditionalPatternType.ternary,
//           ),
//         );
//       }

//       // Return the then widget as primary (else is conditional fallback)
//       result.widgetNode = thenTraversal.widgetNode;
//     } else if (expr is IfStatement) {
//       // Handle if statement - similar to ternary but at statement level
//       final thenTraversal = _traverseStatement(
//         expr.thenStatement,
//         treeDepth: treeDepth,
//         inConditional: true,
//         inLoop: inLoop,
//       );
//       result.merge(thenTraversal);
//     }

//     return result;
//   }

//   /// Similar to _traverseExpression but for statements
//   _ExpressionTraversal _traverseStatement(
//     Statement stmt, {
//     required int treeDepth,
//     required bool inConditional,
//     required bool inLoop,
//   }) {
//     final result = _ExpressionTraversal();

//     if (stmt is ExpressionStatement) {
//       return _traverseExpression(
//         stmt.expression,
//         treeDepth: treeDepth,
//         inConditional: inConditional,
//         inLoop: inLoop,
//       );
//     } else if (stmt is Block) {
//       // Traverse first return statement in block
//       for (final s in stmt.statements) {
//         if (s is ReturnStatement && s.expression != null) {
//           return _traverseExpression(
//             s.expression!,
//             treeDepth: treeDepth,
//             inConditional: inConditional,
//             inLoop: inLoop,
//           );
//         }
//       }
//     } else if (stmt is ForStatement) {
//       final loopKind = stmt.isForEach ? LoopTypeIR.forEach : LoopTypeIR.forLoop;
//       final loopVar = stmt.isForEach
//           ? (stmt.forLoopParts as ForEachPartsWithDeclaration).loopVariable.name.lexeme
//           : 'i';
//       final iterable = stmt.isForEach
//           ? (stmt.forLoopParts as ForEachPartsWithDeclaration).iterable.toString()
//           : '';

//       final bodyTraversal = _traverseStatement(
//         stmt.body,
//         treeDepth: treeDepth,
//         inConditional: inConditional,
//         inLoop: true,
//       );

//       result.merge(bodyTraversal);

//       if (bodyTraversal.widgetNode != null) {
//         result.loopWidgets.add(
//           LoopWidgetIR(
//             id: _generateId('loop_widget'),
//             sourceLocation: SourceLocationIR(
//               id: _generateId('loc'),
//               file: filePath,
//               line: 0,
//               column: 0,
//               offset: 0,
//               length: 0,
//             ),
//             loopType: loopKind,
//             iterable: LiteralExpressionIR(
//               id: _generateId('expr'),
//               sourceLocation: SourceLocationIR(
//                 id: _generateId('loc'),
//                 file: filePath,
//                 line: 0,
//                 column: 0,
//                 offset: 0,
//                 length: 0,
//               ),
//               value: iterable,
//             ),
//             loopVariableName: loopVar,
//             widget: WidgetInstantiationIR(
//               id: _generateId('widget_inst'),
//               sourceLocation: bodyTraversal.widgetNode!.sourceLocation,
//               widgetType: bodyTraversal.widgetNode!.widgetType,
//               isConst: bodyTraversal.widgetNode!.isConst,
//               isInLoop: true,
//             ),
//           ),
//         );
//       }
//     }

//     return result;
//   }

//   /// Extract return expression from method body
//   Expression? _extractReturnExpression(Block body) {
//     for (final stmt in body.statements) {
//       if (stmt is ReturnStatement) {
//         return stmt.expression;
//       }
//     }
//     return null;
//   }

//   /// Build WidgetTreeIR from root widget
//   WidgetTreeIR _buildWidgetTreeIR(
//     WidgetNodeIR root,
//     List<WidgetInstantiationIR> instantiatedWidgets,
//     List<ConditionalWidgetIR> conditionalWidgets,
//     List<LoopWidgetIR> loopWidgets,
//   ) {
//     // Calculate tree metrics
//     final nodeCount = _calculateNodeCount(root);
//     final depth = _calculateDepth(root);
//     final constCount = instantiatedWidgets.where((w) => w.isConst).length;
//     final nonConstCount = instantiatedWidgets.where((w) => !w.isConst).length;
//     final unkeyedCount = instantiatedWidgets.where((w) => w.isInLoop && !w.hasKey).length;

//     // Extract conditional branches
//     final conditionalBranches = conditionalWidgets
//         .map((cw) => ConditionalBranchIR(
//               id: cw.id,
//               sourceLocation: cw.sourceLocation,
//               conditionExpression: cw.condition.toString(),
//               thenWidgetType: cw.thenWidget?.widgetType ?? 'null',
//               elseWidgetType: cw.elseWidget?.widgetType,
//               branchType: cw.patternType == ConditionalPatternType.ternary
//                   ? BranchTypeIR.ternary
//                   : BranchTypeIR.ifStatement,
//             ))
//         .toList();

//     // Extract iteration patterns
//     final iterationPatterns = loopWidgets
//         .map((lw) => IterationPatternIR(
//               id: lw.id,
//               sourceLocation: lw.sourceLocation,
//               loopType: lw.loopType,
//               iterableExpression: lw.iterable.toString(),
//               loopVariableName: lw.loopVariableName,
//               generatedWidgetType: lw.widget.widgetType,
//               hasKeys: lw.hasKey,
//               expectedItemCount: lw.expectedItemCount,
//             ))
//         .toList();

//     // Build metrics
//     final metrics = TreeMetricsIR(
//       id: _generateId('metrics'),
//       sourceLocation: root.sourceLocation,
//       averageBranchingFactor: _calculateBranchingFactor(root),
//       leafNodeCount: _calculateLeafCount(root),
//       estimatedBuildTimeUs: _estimateBuildTime(instantiatedWidgets),
//       estimatedMemoryBytes: _estimateMemory(nodeCount),
//     );

//     return WidgetTreeIR(
//       id: _generateId('widget_tree'),
//       sourceLocation: root.sourceLocation,
//       root: root,
//       nodeCount: nodeCount,
//       depth: depth,
//       conditionalBranches: conditionalBranches,
//       iterationPatterns: iterationPatterns,
//       constWidgetCount: constCount,
//       nonConstWidgetCount: nonConstCount,
//       unkeyedDynamicWidgetCount: unkeyedCount,
//       metrics: metrics,
//     );
//   }

//   /// Extract async builder (FutureBuilder/StreamBuilder)
//   AsyncBuilderIR? _extractAsyncBuilder(
//     InstanceCreationExpression expr,
//     AsyncBuilderKindIR kind,
//   ) {
//     String? futureOrStreamExpr;
//     String builderExpr = '';
//     TypeIR dataType = TypeIR.dynamic_();
//     bool handlesErrors = false;
//     bool handlesLoading = false;

//     for (final arg in expr.argumentList.arguments) {
//       if (arg is NamedExpression) {
//         final argName = arg.name.label.name;
//         if (argName == 'future' || argName == 'stream') {
//           futureOrStreamExpr = arg.expression.toString();
//         } else if (argName == 'builder') {
//           builderExpr = arg.expression.toString();
//           // Check if builder handles error/loading states
//           final builderCode = builderExpr;
//           handlesErrors = builderCode.contains('snapshot.hasError');
//           handlesLoading = builderCode.contains('snapshot.connectionState');
//         }
//       }
//     }

//     if (futureOrStreamExpr == null) return null;

//     return AsyncBuilderIR(
//       id: _generateId('async_builder'),
//       sourceLocation: _makeLocation(0, 0),
//       kind: kind,
//       futureOrStreamExpression: futureOrStreamExpr,
//       dataType: dataType,
//       builderExpression: builderExpr,
//       canFail: true,
//       handlesErrors: handlesErrors,
//       handlesLoading: handlesLoading,
//     );
//   }

//   /// Extract control flow information
//   BuildControlFlowIR _extractControlFlow(
//     Block body,
//     SourceLocationIR location,
//   ) {
//     int ifCount = 0;
//     int loopCount = 0;
//     int maxDepth = 0;
//     int tryCatchCount = 0;
//     bool hasUnreachable = false;

//     void visitStatement(Statement stmt, int depth) {
//       maxDepth = maxDepth > depth ? maxDepth : depth;
      
//       if (stmt is IfStatement) {
//         ifCount++;
//         if (stmt.thenStatement != null) visitStatement(stmt.thenStatement!, depth + 1);
//         if (stmt.elseStatement != null) visitStatement(stmt.elseStatement!, depth + 1);
//       } else if (stmt is ForStatement || stmt is WhileStatement) {
//         loopCount++;
//       } else if (stmt is TryStatement) {
//         tryCatchCount++;
//       } else if (stmt is Block) {
//         for (final s in stmt.statements) {
//           visitStatement(s, depth);
//         }
//       }
//     }

//     for (final stmt in body.statements) {
//       visitStatement(stmt, 0);
//     }

//     final complexityScore = (ifCount + loopCount * 2 + tryCatchCount).clamp(0, 10);

//     return BuildControlFlowIR(
//       id: _generateId('control_flow'),
//       sourceLocation: location,
//       ifStatements: [], // Populated elsewhere
//       loops: [], // Populated elsewhere
//       hasUnreachableCode: hasUnreachable,
//       maxControlFlowDepth: maxDepth,
//       tryCatchCount: tryCatchCount,
//       complexityScore: complexityScore,
//     );
//   }

//   /// Extract performance metrics
//   BuildPerformanceIR _extractPerformanceMetrics(
//     List<WidgetInstantiationIR> widgets,
//     WidgetNodeIR? root,
//     SourceLocationIR location,
//   ) {
//     final nonConstCount = widgets.where((w) => !w.isConst).length;
//     final buildTimeUs = _estimateBuildTime(widgets);
//     final isExpensive = widgets.length > 50 || (root?.treeDepth ?? 0) > 20;
//     final jankRisk = isExpensive ? 7 : 2;

//     return BuildPerformanceIR(
//       id: _generateId('performance'),
//       sourceLocation: location,
//       estimatedBuildTimeMs: buildTimeUs / 1000.0,
//       widgetsRebuildOnStateChange: nonConstCount,
//       constWidgetCount: widgets.where((w) => w.isConst).length,
//       memoizedWidgetCount: 0,
//       isExpensive: isExpensive,
//       suggestedFrameRateCap: 60,
//       jankRisk: jankRisk,
//     );
//   }

//   // =========================================================================
//   // DETECTION METHODS
//   // =========================================================================

//   bool _isBuildMethod(dynamic node) {
//     if (node is! MethodDeclaration) return false;
//     return node.name.lexeme == 'build' && !node.isStatic;
//   }

//   bool _isWidgetCreation(dynamic node) {
//     if (node is! InstanceCreationExpression) return false;
//     final className = node.constructorName.type.name.toString();
//     return _isLikelyWidget(className);
//   }

//   bool _isConditional(dynamic node) {
//     return node is ConditionalExpression || node is IfStatement;
//   }

//   bool _isLoop(dynamic node) {
//     return node is ForStatement;
//   }

//   bool _isCollection(dynamic node) {
//     return node is ListLiteral ||
//         node is SetOrMapLiteral ||
//         (node is ListLiteral && _hasSpreadElement(node));
//   }

//   bool _isBuilder(dynamic node) {
//     if (node is! FunctionExpression && node is! FunctionDeclaration) {
//       return false;
//     }
//     final name = node is FunctionDeclaration ? node.name.lexeme : 'lambda';
//     return name.toLowerCase().contains('build') ||
//         name.toLowerCase().contains('render') ||
//         name.toLowerCase().contains('create');
//   }

//   bool _isCallback(dynamic node) {
//     if (node is! FunctionExpression && node is! FunctionDeclaration) {
//       return false;
//     }
//     final name = node is FunctionDeclaration ? node.name.lexeme : 'lambda';
//     return name.toLowerCase().startsWith('on') ||
//         name.toLowerCase().startsWith('handle');
//   }

//   // =========================================================================
//   // WIDGET EXTRACTION
//   // =========================================================================

//   String _getWidgetName(dynamic node) {
//     if (node is InstanceCreationExpression) {
//       return node.constructorName.type.name.toString();
//     }
//     return 'Unknown';
//   }

//   String? _getConstructorName(dynamic node) {
//     if (node is InstanceCreationExpression) {
//       return node.constructorName.name?.name;
//     }
//     return null;
//   }

//   bool _isConst(dynamic node) {
//     if (node is InstanceCreationExpression) {
//       return node.isConst;
//     }
//     return false;
//   }

//   List<PropertyBinding> _getProperties(dynamic node) {
//     if (node is! InstanceCreationExpression) return [];
//     final props = <PropertyBinding>[];

//     for (final arg in node.argumentList.arguments) {
//       if (arg is NamedExpression) {
//         final name = arg.name.label.name;
//         final value = arg.expression.toString();

//         if (_isCallbackName(name)) {
//           props.add(CallbackPropertyBinding(
//             name: name,
//             value: value,
//             parameters: _extractParameters(arg.expression),
//           ));
//         } else if (_isBuilderName(name)) {
//           props.add(BuilderPropertyBinding(
//             name: name,
//             value: value,
//             parameters: _extractParameters(arg.expression),
//           ));
//         } else {
//           props.add(LiteralPropertyBinding(name: name, value: value));
//         }
//       }
//     }

//     return props;
//   }

//   List<dynamic> _getChildElements(dynamic node) {
//     if (node is! InstanceCreationExpression) return [];
//     final children = <dynamic>[];

//     for (final arg in node.argumentList.arguments) {
//       if (arg is NamedExpression && arg.name.label.name == 'children') {
//         if (arg.expression is ListLiteral) {
//           final list = arg.expression as ListLiteral;
//           children.addAll(list.elements);
//         }
//         break;
//       }
//     }

//     return children;
//   }

//   KeyTypeIR? _getKeyInfo(dynamic node) {
//     if (node is! InstanceCreationExpression) return null;

//     for (final arg in node.argumentList.arguments) {
//       if (arg is NamedExpression && arg.name.label.name == 'key') {
//         return _extractKeyType(arg.expression);
//       }
//     }

//     return null;
//   }

//   KeyTypeIR? _extractKeyType(Expression expr) {
//     if (expr is! InstanceCreationExpression) return null;

//     final keyClass = expr.constructorName.type.name.toString();
//     final isConst = expr.isConst;
//     final location = _makeLocation(0, 0);

//     switch (keyClass) {
//       case 'ValueKey':
//         return KeyTypeIR(
//           id: _generateId('key_value'),
//           sourceLocation: location,
//           kind: KeyKindIR.valueKey,
//           valueType: TypeIR.dynamic_(),
//           isConst: isConst,
//         );
//       case 'ObjectKey':
//         return KeyTypeIR(
//           id: _generateId('key_object'),
//           sourceLocation: location,
//           kind: KeyKindIR.objectKey,
//           isConst: isConst,
//         );
//       case 'UniqueKey':
//         return KeyTypeIR(
//           id: _generateId('key_unique'),
//           sourceLocation: location,
//           kind: KeyKindIR.uniqueKey,
//           isConst: isConst,
//         );
//       case 'GlobalKey':
//         return KeyTypeIR(
//           id: _generateId('key_global'),
//           sourceLocation: location,
//           kind: KeyKindIR.globalKey,
//           isConst: isConst,
//         );
//       case 'PageStorageKey':
//         return KeyTypeIR(
//           id: _generateId('key_pagestorage'),
//           sourceLocation: location,
//           kind: KeyKindIR.pageStorageKey,
//           isConst: isConst,
//         );
//       default:
//         if (keyClass.endsWith('Key')) {
//           return KeyTypeIR(
//             id: _generateId('key_local'),
//             sourceLocation: location,
//             kind: KeyKindIR.localKey,
//             isConst: isConst,
//           );
//         }
//         return null;
//     }
//   }

//   // =========================================================================
//   // CONDITIONAL EXTRACTION
//   // =========================================================================

//   String _getCondition(dynamic node) {
//     if (node is ConditionalExpression) {
//       return node.condition.toString();
//     }
//     if (node is IfStatement) {
//       return node.expression.toString();
//     }
//     return 'true';
//   }

//   dynamic _getThenBranch(dynamic node) {
//     if (node is ConditionalExpression) {
//       return node.thenExpression;
//     }
//     if (node is IfStatement) {
//       return node.thenStatement;
//     }
//     return null;
//   }

//   dynamic _getElseBranch(dynamic node) {
//     if (node is ConditionalExpression) {
//       return node.elseExpression;
//     }
//     if (node is IfStatement) {
//       return node.elseStatement;
//     }
//     return null;
//   }

//   bool _isTernary(dynamic node) => node is ConditionalExpression;

//   // =========================================================================
//   // LOOP EXTRACTION
//   // =========================================================================

//   String _getLoopKind(dynamic node) {
//     if (node is! ForStatement) return 'unknown';
//     return node.isForEach ? 'forEach' : 'for';
//   }

//   String? _getLoopVariable(dynamic node) {
//     if (node is! ForStatement) return null;
//     if (node.isForEach) {
//       final parts = node.forLoopParts;
//       if (parts is ForEachPartsWithDeclaration) {
//         return parts.loopVariable.name.lexeme;
//       }
//       if (parts is ForEachPartsWithIdentifier) {
//         return parts.identifier.name;
//       }
//     }
//     return null;
//   }

//   String? _getIterable(dynamic node) {
//     if (node is! ForStatement || !node.isForEach) return null;
//     final parts = node.forLoopParts;
//     if (parts is ForEachPartsWithDeclaration) {
//       return parts.iterable.toString();
//     }
//     if (parts is ForEachPartsWithIdentifier) {
//       return parts.iterable.toString();
//     }
//     return null;
//   }

//   String? _getLoopCondition(dynamic node) {
//     if (node is! ForStatement || node.isForEach) return null;
//     final parts = node.forLoopParts;
//     if (parts is ForPartsWithDeclarations) {
//       return parts.condition?.toString();
//     }
//     if (parts is ForPartsWithExpression) {
//       return parts.condition?.toString();
//     }
//     return null;
//   }

//   dynamic _getLoopBody(dynamic node) {
//     if (node is ForStatement) return node.body;
//     return null;
//   }

//   // =========================================================================
//   // COLLECTION EXTRACTION
//   // =========================================================================

//   String _getCollectionKind(dynamic node) {
//     if (node is ListLiteral) return 'list';
//     if (node is SetOrMapLiteral) return node.isMap ? 'map' : 'set';
//     return 'unknown';
//   }

//   bool _hasSpread(dynamic node) => _hasSpreadElement(node);

//   bool _hasSpreadElement(dynamic node) {
//     if (node is ListLiteral) {
//       return node.elements.any((e) => e is SpreadElement);
//     }
//     if (node is SetOrMapLiteral) {
//       return node.elements.any((e) => e is SpreadElement);
//     }
//     return false;
//   }

//   List<dynamic> _getCollectionElements(dynamic node) {
//     if (node is ListLiteral) return node.elements;
//     if (node is SetOrMapLiteral) return node.elements;
//     return [];
//   }

//   // =========================================================================
//   // BUILDER/CALLBACK EXTRACTION
//   // =========================================================================

//   String _getBuilderName(dynamic node) {
//     if (node is FunctionDeclaration) return node.name.lexeme;
//     return 'builder';
//   }

//   List<String> _getBuilderParameters(dynamic node) => _extractParameters(node);

//   bool _isAsyncBuilder(dynamic node) {
//     if (node is FunctionDeclaration) {
//       return node.functionExpression.body.isAsynchronous;
//     }
//     if (node is FunctionExpression) {
//       return node.body.isAsynchronous;
//     }
//     return false;
//   }

//   String _getCallbackName(dynamic node) {
//     if (node is FunctionDeclaration) return node.name.lexeme;
//     return 'callback';
//   }

//   List<String> _getCallbackParameters(dynamic node) => _extractParameters(node);

//   // =========================================================================
//   // HELPER METHODS
//   // =========================================================================

//   bool _isLikelyWidget(String className) {
//     final common = {
//       'Scaffold', 'AppBar', 'Container', 'Column', 'Row', 'Center', 'Text',
//       'Button', 'FloatingActionButton', 'ListView', 'GridView', 'Stack',
//       'Positioned', 'GestureDetector', 'InkWell', 'MaterialApp',
//       'ElevatedButton', 'Icon', 'Padding', 'SizedBox', 'Expanded',
//       'Flexible', 'Dialog', 'AlertDialog', 'Card', 'ListTile', 'Drawer',
//       'FutureBuilder', 'StreamBuilder', 'AnimatedContainer', 'AnimatedOpacity',
//     };
//     if (common.contains(className)) return true;
//     if (className.endsWith('Widget')) return true;
//     if (className[0].toUpperCase() == className[0]) return true;
//     return false;
//   }

//   bool _isCallbackName(String name) =>
//       name.startsWith('on') || name == 'onTap' || name == 'onPressed' || name == 'onChanged';

//   bool _isBuilderName(String name) =>
//       name == 'builder' || name.endsWith('Builder') || name.contains('builder');

//   List<String> _extractParameters(dynamic node) {
//     if (node is FunctionExpression) {
//       return node.parameters?.parameters
//               .map((p) => p.name?.lexeme ?? '')
//               .where((n) => n.isNotEmpty)
//               .toList() ??
//           [];
//     }
//     if (node is FunctionDeclaration) {
//       return node.functionExpression.parameters?.parameters
//               .map((p) => p.name?.lexeme ?? '')
//               .where((n) => n.isNotEmpty)
//               .toList() ??
//           [];
//     }
//     return [];
//   }

//   // =========================================================================
//   // METRICS CALCULATIONS
//   // =========================================================================

//   int _calculateNodeCount(WidgetNodeIR node) {
//     return 1 + node.children.fold(0, (sum, child) => sum + _calculateNodeCount(child));
//   }

//   int _calculateDepth(WidgetNodeIR node) {
//     if (node.children.isEmpty) return 1;
//     return 1 + node.children.map(_calculateDepth).reduce((a, b) => a > b ? a : b);
//   }

//   double _calculateBranchingFactor(WidgetNodeIR node) {
//     final total = _calculateNodeCount(node);
//     final childrenCount = node.children.fold(0, (sum, child) => sum + child.children.length);
//     return total > 0 ? childrenCount / total : 0.0;
//   }

//   int _calculateLeafCount(WidgetNodeIR node) {
//     if (node.children.isEmpty) return 1;
//     return node.children.fold(0, (sum, child) => sum + _calculateLeafCount(child));
//   }

//   int _estimateBuildTime(List<WidgetInstantiationIR> widgets) {
//     int estimate = 100; // base time
//     estimate += widgets.length * 10;
//     estimate += widgets.where((w) => !w.isConst).length * 15;
//     return estimate;
//   }

//   int _estimateMemory(int nodeCount) {
//     return 256 + (nodeCount * 64); // bytes
//   }
// }

// // ============================================================================
// // REGISTRATION
// // ============================================================================

// void registerASTAdapterV2(
//   ComponentRegistry registry,
//   WidgetProducerDetector? widgetDetector,
//   String filePath,
//   String fileContent,
// ) {
//   final adapter = ASTComponentAdapter(
//     widgetDetector: widgetDetector,
//     filePath: filePath,
//     fileContent: fileContent,
//     registry: registry,
//   );
//   registry.register('ast_v2', adapter);
// }