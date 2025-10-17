// lib/src/ir/phase2_example.dart
// Example: How Phase 2 IR is used in practice



import '../expression_ir.dart';
import '../ir_node.dart';
import '../statement/statement_ir.dart';
import '../types/class_type_ir.dart';
import '../types/function_type_ir.dart';
import '../types/parameter_ir.dart';
import '../types/primitive_type_ir.dart';
import 'advanced/advanced.dart';
import 'function_method_calls/function_method_calls.dart';
import 'literals/literals.dart';
import 'operations/operations.dart';
import 'variables_access/vaibales_access.dart';

/// Example 1: Converting a simple binary operation
/// Dart code: int result = a + b * 2;
/// 
/// This shows how nested expressions are represented in the IR
BinaryOpExpr buildMultiplyExpression(
  String id,
  SourceLocationIR sourceLoc,
) {
  // b * 2
  return BinaryOpExpr(
    id: '${id}_mult',
    sourceLocation: sourceLoc,
    left: IdentifierExpr(
      id: '${id}_b_ident',
      sourceLocation: sourceLoc,
      name: 'b',
      resultType: PrimitiveTypeIR(
        kind: PrimitiveKind.double,
        id: '${id}_int_type',
        sourceLocation: sourceLoc,
        name: 'int',
      ),
    ),
    operator: BinaryOperator.multiply,
    right: IntLiteralExpr(
      id: '${id}_2_literal',
      sourceLocation: sourceLoc,
      value: 2,
      resultType: PrimitiveTypeIR(
        id: '${id}_int_type2',
        sourceLocation: sourceLoc,
        name: 'int', 
        kind: PrimitiveKind.double,
      ),
    ),
    resultType: PrimitiveTypeIR(
      kind:  PrimitiveKind.double,
      id: '${id}_result_type',
      sourceLocation: sourceLoc,
      name: 'int',
    ),
    isConstant: false,
  );
}

/// Example 2: Variable declaration with initialization
/// Dart code: final String name = "Flutter";
VariableDeclarationStmt buildFinalStringDeclaration(
  String id,
  SourceLocationIR sourceLoc,
) {
  return VariableDeclarationStmt(
    id: '${id}_var_decl',
    sourceLocation: sourceLoc,
    name: 'name',
    resultType: PrimitiveTypeIR(
      kind:  PrimitiveKind.string,
      id: '${id}_string_type',
      sourceLocation: sourceLoc,
      name: 'String',
    ),
    type: PrimitiveTypeIR(
       kind:  PrimitiveKind.string,
      id: '${id}_string_type_explicit',
      sourceLocation: sourceLoc,
      name: 'String',
    ),
    initializer: StringLiteralExpr(
      id: '${id}_string_literal',
      sourceLocation: sourceLoc,
      value: 'Flutter',
      resultType: PrimitiveTypeIR(
         kind:  PrimitiveKind.string,
        id: '${id}_string_result_type',
        sourceLocation: sourceLoc,
        name: 'String',
      ),
    ),
    isFinal: true,
  );
}

/// Example 3: Method call with named arguments
/// Dart code: widget.setStateCallback(isLoading: true, message: "Done");
MethodCallExpr buildSetStateMethodCall(
  String id,
  SourceLocationIR sourceLoc,
) {
  return MethodCallExpr(
    id: '${id}_method_call',
    sourceLocation: sourceLoc,
    receiver: IdentifierExpr(
      id: '${id}_widget_ident',
      sourceLocation: sourceLoc,
      name: 'widget',
      resultType: ClassTypeIR(
        className: "MyWidget",
        id: '${id}_widget_type',
        sourceLocation: sourceLoc,
        name: 'MyWidget',
      ),
    ),
    methodName: 'setStateCallback',
    resultType: PrimitiveTypeIR(
       kind:  PrimitiveKind.void_,
      id: '${id}_void_type',
      sourceLocation: sourceLoc,
      name: 'void',
    ),
    arguments: [],
    namedArguments: {
      'isLoading': BoolLiteralExpr(
        id: '${id}_bool_true',
        sourceLocation: sourceLoc,
        value: true,
        resultType: PrimitiveTypeIR(
           kind:  PrimitiveKind.bool,
          id: '${id}_bool_type',
          sourceLocation: sourceLoc,
          name: 'bool',
        ),
      ),
      'message': StringLiteralExpr(
        id: '${id}_string_done',
        sourceLocation: sourceLoc,
        value: 'Done',
        resultType: PrimitiveTypeIR(
           kind:  PrimitiveKind.string,
          id: '${id}_string_type2',
          sourceLocation: sourceLoc,
          name: 'String',
        ),
      ),
    },
  );
}

/// Example 4: Conditional (ternary) expression
/// Dart code: isLoading ? LoadingWidget() : ContentWidget()
ConditionalExpr buildConditionalWidget(
  String id,
  SourceLocationIR sourceLoc,
) {
  return ConditionalExpr(
    id: '${id}_conditional',
    sourceLocation: sourceLoc,
    condition: IdentifierExpr(
      id: '${id}_is_loading',
      sourceLocation: sourceLoc,
      name: 'isLoading',
      resultType: PrimitiveTypeIR(
         kind:  PrimitiveKind.bool,
        id: '${id}_bool_type',
        sourceLocation: sourceLoc,
        name: 'bool',
      ),
    ),
    thenExpr: ConstructorCallExpr(
      id: '${id}_loading_widget',
      sourceLocation: sourceLoc,
      className: 'LoadingWidget',
      resultType: ClassTypeIR(
        className: 'LoadingWidget',
        id: '${id}_loading_widget_type',
        sourceLocation: sourceLoc,
        name: 'LoadingWidget',
      ),
    ),
    elseExpr: ConstructorCallExpr(
      id: '${id}_content_widget',
      sourceLocation: sourceLoc,
      className: 'ContentWidget',
      resultType: ClassTypeIR(
        className: 'ContentWidget',
        id: '${id}_content_widget_type',
        sourceLocation: sourceLoc,
        name: 'ContentWidget',
      ),
    ),
    resultType: ClassTypeIR(
      className: 'Widget',
      id: '${id}_widget_type',
      sourceLocation: sourceLoc,
      name: 'Widget',
    ),
  );
}

/// Example 5: If-else statement with property access
/// Dart code:
/// if (user.isAdmin) {
///   showAdminPanel();
/// } else {
///   showUserPanel();
/// }
IfStmt buildIfAdminStatement(
  String id,
  SourceLocationIR sourceLoc,
) {
  return IfStmt(
    id: '${id}_if_stmt',
    sourceLocation: sourceLoc,
    condition: PropertyAccessExpr(
      id: '${id}_user_is_admin',
      sourceLocation: sourceLoc,
      target: IdentifierExpr(
        id: '${id}_user_ident',
        sourceLocation: sourceLoc,
        name: 'user',
        resultType: ClassTypeIR(
          className: 'User',
          id: '${id}_user_type',
          sourceLocation: sourceLoc,
          name: 'User',
        ),
      ),
      propertyName: 'isAdmin',
      resultType: PrimitiveTypeIR(
          kind:  PrimitiveKind.bool,
        id: '${id}_bool_type',
        sourceLocation: sourceLoc,
        name: 'bool',
      ),
    ),
    thenBranch: BlockStmt(
      id: '${id}_then_block',
      sourceLocation: sourceLoc,
      statements: [
        ExpressionStmt(
          id: '${id}_show_admin_expr',
          sourceLocation: sourceLoc,
          expression: FunctionCallExpr(
            id: '${id}_show_admin_call',
            sourceLocation: sourceLoc,
            functionName: 'showAdminPanel',
            resultType: PrimitiveTypeIR(
               kind:  PrimitiveKind.void_,
              id: '${id}_void_type',
              sourceLocation: sourceLoc,
              name: 'void',
            ),
          ),
        ),
      ],
    ),
    elseBranch: BlockStmt(
      id: '${id}_else_block',
      sourceLocation: sourceLoc,
      statements: [
        ExpressionStmt(
          id: '${id}_show_user_expr',
          sourceLocation: sourceLoc,
          expression: FunctionCallExpr(
            id: '${id}_show_user_call',
            sourceLocation: sourceLoc,
            functionName: 'showUserPanel',
            resultType: PrimitiveTypeIR(
                kind:  PrimitiveKind.void_,
              id: '${id}_void_type2',
              sourceLocation: sourceLoc,
              name: 'void',
            ),
          ),
        ),
      ],
    ),
  );
}

/// Example 6: For loop iterating over a list
/// Dart code:
/// for (int i = 0; i < items.length; i++) {
///   print(items[i]);
/// }
ForStmt buildForLoopStatement(
  String id,
  SourceLocationIR sourceLoc,
) {
  return ForStmt(
    id: '${id}_for_stmt',
    sourceLocation: sourceLoc,
    initialization: AssignmentExpr(
      id: '${id}_i_init',
      sourceLocation: sourceLoc,
      target: IdentifierExpr(
        id: '${id}_i_ident',
        sourceLocation: sourceLoc,
        name: 'i',
        resultType: PrimitiveTypeIR(
           kind:  PrimitiveKind.int,
          id: '${id}_int_type',
          sourceLocation: sourceLoc,
          name: 'int',
        ),
      ),
      value: IntLiteralExpr(
        id: '${id}_zero_literal',
        sourceLocation: sourceLoc,
        value: 0,
        resultType: PrimitiveTypeIR(
           kind:  PrimitiveKind.int,
          id: '${id}_int_type2',
          sourceLocation: sourceLoc,
          name: 'int',
        ),
      ),
      resultType: PrimitiveTypeIR(
        id: '${id}_int_type3',
        sourceLocation: sourceLoc,
        name: 'int',
        kind:  PrimitiveKind.int,
      ),
    ),
    condition: BinaryOpExpr(
      id: '${id}_i_less_length',
      sourceLocation: sourceLoc,
      left: IdentifierExpr(
        id: '${id}_i_check',
        sourceLocation: sourceLoc,
        name: 'i',
        resultType: PrimitiveTypeIR(
          id: '${id}_int_check_type',
          sourceLocation: sourceLoc,
          name: 'int',
          kind:  PrimitiveKind.int,
        ),
      ),
      operator: BinaryOperator.lessThan,
      right: PropertyAccessExpr(
        id: '${id}_items_length',
        sourceLocation: sourceLoc,
        target: IdentifierExpr(
          id: '${id}_items_ident',
          sourceLocation: sourceLoc,
          name: 'items',
          resultType: ClassTypeIR(
            id: '${id}_list_type',
            className: 'List',
            sourceLocation: sourceLoc,
            name: 'List',
            typeArguments: [
              PrimitiveTypeIR(
                id: '${id}_dynamic_elem',
                sourceLocation: sourceLoc,
                name: 'dynamic',
                kind: PrimitiveKind.dynamic_,
              ),
            ],
          ),
        ),
        propertyName: 'length',
        resultType: PrimitiveTypeIR(
          id: '${id}_int_length_type',
          sourceLocation: sourceLoc,
          name: 'int',
          kind:  PrimitiveKind.int,
        ),
      ),
      resultType: PrimitiveTypeIR(
        id: '${id}_bool_compare_type',
        sourceLocation: sourceLoc,
        name: 'bool',
        kind:  PrimitiveKind.bool,
      ),
    ),
    updaters: [
      UnaryOpExpr(
        id: '${id}_i_increment',
        sourceLocation: sourceLoc,
        operator: UnaryOperator.postIncrement,
        operand: IdentifierExpr(
          id: '${id}_i_post_inc',
          sourceLocation: sourceLoc,
          name: 'i',
          resultType: PrimitiveTypeIR(
            id: '${id}_int_inc_type',
            sourceLocation: sourceLoc,
            name: 'int',
            kind:  PrimitiveKind.int,
          ),
        ),
        resultType: PrimitiveTypeIR(
          id: '${id}_int_post_inc_result',
          sourceLocation: sourceLoc,
          name: 'int',
          kind:  PrimitiveKind.int,
        ),
      ),
    ],
    body: BlockStmt(
      id: '${id}_for_body',
      sourceLocation: sourceLoc,
      statements: [
        ExpressionStmt(
          id: '${id}_print_expr',
          sourceLocation: sourceLoc,
          expression: FunctionCallExpr(
            id: '${id}_print_call',
            sourceLocation: sourceLoc,
            functionName: 'print',
            resultType: PrimitiveTypeIR(
              id: '${id}_void_print',
              sourceLocation: sourceLoc,
              name: 'void',
              kind:  PrimitiveKind.void_,
            ),
            arguments: [
              IndexAccessExpr(
                id: '${id}_items_index',
                sourceLocation: sourceLoc,
                target: IdentifierExpr(
                  id: '${id}_items_in_loop',
                  sourceLocation: sourceLoc,
                  name: 'items',
                  resultType: ClassTypeIR(
                    id: '${id}_list_in_loop',
                    sourceLocation: sourceLoc,
                    name: 'List',
                      className: 'List',
                  ),
                ),
                index: IdentifierExpr(
                  id: '${id}_i_index',
                  sourceLocation: sourceLoc,
                  name: 'i',
                  resultType: PrimitiveTypeIR(
                    id: '${id}_int_index',
                    sourceLocation: sourceLoc,
                    name: 'int',
                    kind:  PrimitiveKind.int,
                  ),
                ),
                resultType: PrimitiveTypeIR(
                  id: '${id}_dynamic_item',
                  sourceLocation: sourceLoc,
                  name: 'dynamic',
                  kind: PrimitiveKind.dynamic_,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

/// Example 7: Lambda/Anonymous function passed as callback
/// Dart code: items.map((item) => item.toUpperCase()).toList()
MethodCallExpr buildMapTransformation(
  String id,
  SourceLocationIR sourceLoc,
) {
  return MethodCallExpr(
    id: '${id}_map_call',
    sourceLocation: sourceLoc,
    receiver: IdentifierExpr(
      id: '${id}_items_for_map',
      sourceLocation: sourceLoc,
      name: 'items',
      resultType: ClassTypeIR(
        id: '${id}_list_for_map',
        sourceLocation: sourceLoc,
        name: 'List',
        className: 'List',
      ),
    ),
    methodName: 'map',
    resultType: ClassTypeIR(
      id: '${id}_iterable_result',
      sourceLocation: sourceLoc,
      name: 'Iterable',
      className: 'Iterable',
    ),
    arguments: [
      LambdaExpr(
        id: '${id}_map_lambda',
        sourceLocation: sourceLoc,
        parameters: [
          ParameterIR(
            id: '${id}_item_param',
            sourceLocation: sourceLoc,
            name: 'item',
            type: PrimitiveTypeIR(
              id: '${id}_string_param_type',
              sourceLocation: sourceLoc,
              name: 'String',
              kind:  PrimitiveKind.string,
            ),
          ),
        ],
        resultType: FunctionTypeIR(
          id: '${id}_lambda_func_type',
          sourceLocation: sourceLoc,
          name: "(String) => String",
          parameters: [
            ParameterIR(
              id: '${id}_lambda_param',
              sourceLocation: sourceLoc,
              name: 'item',
              type: PrimitiveTypeIR(
                id: '${id}_string_lambda_type',
                sourceLocation: sourceLoc,
                name: 'String',
                kind:  PrimitiveKind.string,
              ),
            ),
          ],
          returnType: PrimitiveTypeIR(
            id: '${id}_string_return_type',
            sourceLocation: sourceLoc,
            name: 'String',
            kind:  PrimitiveKind.string,
          ),
        ),
        body: MethodCallExpr(
          id: '${id}_to_upper_call',
          sourceLocation: sourceLoc,
          receiver: IdentifierExpr(
            id: '${id}_item_in_lambda',
            sourceLocation: sourceLoc,
            name: 'item',
            resultType: PrimitiveTypeIR(
              id: '${id}_string_in_lambda',
              sourceLocation: sourceLoc,
              name: 'String',
              kind:  PrimitiveKind.string,
            ),
          ),
          methodName: 'toUpperCase',
          resultType: PrimitiveTypeIR(
            id: '${id}_string_upper_result',
            sourceLocation: sourceLoc,
            name: 'String',
            kind:  PrimitiveKind.string,
          ),
        ),
      ),
    ],
  );
}

/// Example 8: Try-catch statement
/// Dart code:
/// try {
///   await fetchData();
/// } catch (e) {
///   handleError(e);
/// }
TryStmt buildTryCatchStatement(
  String id,
  SourceLocationIR sourceLoc,
) {
  return TryStmt(
    id: '${id}_try_stmt',
    sourceLocation: sourceLoc,
    tryBlock: BlockStmt(
      id: '${id}_try_block',
      sourceLocation: sourceLoc,
      statements: [
        ExpressionStmt(
          id: '${id}_await_fetch',
          sourceLocation: sourceLoc,
          expression: AwaitExpr(
            id: '${id}_await_expr',
            sourceLocation: sourceLoc,
            futureExpression: FunctionCallExpr(
              id: '${id}_fetch_data_call',
              sourceLocation: sourceLoc,
              functionName: 'fetchData',
              resultType: ClassTypeIR(
                id: '${id}_future_type',
                sourceLocation: sourceLoc,
                name: 'Future',
                className: 'Future',
              ),
            ),
            resultType: PrimitiveTypeIR(
              id: '${id}_dynamic_future_result',
              sourceLocation: sourceLoc,
              name: 'dynamic',
              kind: PrimitiveKind.dynamic_,
            ),
          ),
        ),
      ],
    ),
    catchClauses: [
      CatchClauseStmt(
        id: '${id}_catch_clause',
        sourceLocation: sourceLoc,
        exceptionType: ClassTypeIR(
          id: '${id}_exception_type',
          sourceLocation: sourceLoc,
          name: 'Exception',
          className: 'Exception',
        ),
        exceptionParameter: 'e',
        body: BlockStmt(
          id: '${id}_catch_block',
          sourceLocation: sourceLoc,
          statements: [
            ExpressionStmt(
              id: '${id}_handle_error_expr',
              sourceLocation: sourceLoc,
              expression: FunctionCallExpr(
                id: '${id}_handle_error_call',
                sourceLocation: sourceLoc,
                functionName: 'handleError',
                resultType: PrimitiveTypeIR(
                  id: '${id}_void_handle',
                  sourceLocation: sourceLoc,
                  name: 'void',
                  kind:  PrimitiveKind.void_,
                ),
                arguments: [
                  IdentifierExpr(
                    id: '${id}_e_ref',
                    sourceLocation: sourceLoc,
                    name: 'e',
                    resultType: ClassTypeIR(
                      id: '${id}_exception_ref_type',
                      sourceLocation: sourceLoc,
                      name: 'Exception',
                      className: 'Exception',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

// =============================================================================
// ANALYSIS EXAMPLE: Using the Visitor Pattern
// =============================================================================

// /// Demonstrates how to analyze IR using visitors
// class AnalysisExample {
//   /// Analyzes an expression's complexity
//   static int analyzeComplexity(ExpressionIR expr) {
//     final calculator = ExpressionDepthCalculator();
//     return calculator._visit(expr);
//   }

//   /// Collects all variables referenced in an expression
//   static Set<String> findVariableReferences(ExpressionIR expr) {
//     final collector = VariableCollector();
//     collector._visit(expr);
//     return collector.variables;
//   }

//   /// Example analysis workflow
//   static void demonstrateAnalysis() {
//     final sourceLoc = SourceLocationIR(
//       file: 'main.dart',
//       line: 42,
//       column: 10,
//       offset: 1204,
//       length: 50,
//     );

//     // Create a moderately complex expression: a + b * c
//     final expr = BinaryOpExpr(
//       id: 'expr_add',
//       sourceLocation: sourceLoc,
//       left: IdentifierExpr(
//         id: 'ident_a',
//         sourceLocation: sourceLoc,
//         name: 'a',
//         resultType: PrimitiveTypeIR(
//           id: 'type_int',
//           sourceLocation: sourceLoc,
//           name: 'int',
//           kind: PrimitiveKind .int
//         ),
//       ),
//       operator: BinaryOperator.add,
//       right: BinaryOpExpr(
//         id: 'expr_mult',
//         sourceLocation: sourceLoc,
//         left: IdentifierExpr(
//           id: 'ident_b',
//           sourceLocation: sourceLoc,
//           name: 'b',
//           resultType: PrimitiveTypeIR(
//             id: 'type_int2',
//             sourceLocation: sourceLoc,
//             name: 'int',
//             kind: PrimitiveKind .int
//           ),
//         ),
//         operator: BinaryOperator.multiply,
//         right: IdentifierExpr(
//           id: 'ident_c',
//           sourceLocation: sourceLoc,
//           name: 'c',
//           resultType: PrimitiveTypeIR(
//             id: 'type_int3',
//             sourceLocation: sourceLoc,
//             name: 'int',
//             kind: PrimitiveKind .int
//           ),
//         ),
//         resultType: PrimitiveTypeIR(
//           id: 'type_int_result',
//           sourceLocation: sourceLoc,
//           name: 'int',
//           kind: PrimitiveKind .int
//         ),
//       ),
//       resultType: PrimitiveTypeIR(
//         id: 'type_int_final',
//         sourceLocation: sourceLoc,
//         name: 'int',
//         kind: PrimitiveKind .int
//       ),
//     );

//     // Analyze complexity
//     final complexity = analyzeComplexity(expr);
//     print('Expression complexity (depth): $complexity');
//     // Output: Expression complexity (depth): 3

//     // Find variable references
//     final variables = findVariableReferences(expr);
//     print('Variables referenced: $variables');
//     // Output: Variables referenced: {a, b, c}

//     // This IR structure enables:
//     // 1. Type checking - all expressions know their result type
//     // 2. Performance analysis - depth calculation identifies nested expressions
//     // 3. Dependency tracking - variable collection for state analysis
//     // 4. Serialization - binary format (Phase 8)
//     // 5. Linting - identifying problematic patterns
//     // 6. Optimization - constant folding, dead code elimination
//   }
// }