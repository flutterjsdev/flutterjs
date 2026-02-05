// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ============================================================================
// MODEL-TO-JS CODE GEN DIAGNOSTIC & VALIDATOR
// ============================================================================
// Comprehensive validation of Dart IR → JavaScript conversion pipeline
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';
import 'package:flutterjs_gen/flutterjs_gen.dart';
import 'package:flutterjs_gen/src/widget_generation/registry/flutter_widget_registry.dart';
import 'package:flutterjs_core/src/ir/expressions/cascade_expression_ir.dart';

// ============================================================================
// DIAGNOSTIC REPORT TYPES
// ============================================================================

enum DiagnosticSeverity { fatal, error, warning, info }

class DiagnosticIssue {
  final DiagnosticSeverity severity;
  final String code;
  final String message;
  final String? suggestion;
  final String? affectedNode;
  final int? lineNumber;
  final Map<String, dynamic>? context;
  final StackTrace? stackTrace;
  DiagnosticIssue({
    required this.severity,
    required this.code,
    required this.message,
    this.suggestion,
    this.affectedNode,
    this.lineNumber,
    this.context,
    this.stackTrace,
  });

  @override
  String toString() =>
      '[${severity.name.toUpperCase()}] $code: $message${suggestion != null ? '\n  💡 $suggestion' : ''}';
}

class DiagnosticReport {
  final List<DiagnosticIssue> issues = [];
  final DateTime timestamp = DateTime.now();
  final Map<String, dynamic> metadata = {};

  DiagnosticReport();

  int get fatalCount =>
      issues.where((i) => i.severity == DiagnosticSeverity.fatal).length;

  int get errorCount =>
      issues.where((i) => i.severity == DiagnosticSeverity.error).length;

  int get warningCount =>
      issues.where((i) => i.severity == DiagnosticSeverity.warning).length;

  int get infoCount =>
      issues.where((i) => i.severity == DiagnosticSeverity.info).length;
  void addIssue(DiagnosticIssue issue) {
    issues.add(issue);
    // ✅ No need to call _updateCounts() - getters calculate on demand
  }

  bool get hasCriticalIssues => fatalCount > 0 || errorCount > 0;
  int get totalIssues => fatalCount + errorCount + warningCount + infoCount;

  String generateReport() {
    final buffer = StringBuffer();

    buffer.writeln(
      '\n╔═══════════════════════════════════════════════════════════════════════╗',
    );
    buffer.writeln(
      '║              MODEL-TO-JS CODE GEN DIAGNOSTIC REPORT                   ║',
    );
    buffer.writeln(
      '╚═══════════════════════════════════════════════════════════════════════╝\n',
    );

    buffer.writeln('Status: ${hasCriticalIssues ? '❌ FAILED' : '✅ PASSED'}');
    buffer.writeln('Total Issues: $totalIssues');
    buffer.writeln('  Fatal:   $fatalCount');
    buffer.writeln('  Error:   $errorCount');
    buffer.writeln('  Warning: $warningCount');
    buffer.writeln('  Info:    $infoCount\n');

    if (issues.isEmpty) {
      buffer.writeln('✅ No issues found!\n');
      return buffer.toString();
    }

    buffer.writeln('DETAILS:\n');
    for (int i = 0; i < issues.length; i++) {
      final issue = issues[i];
      buffer.writeln('[$i] ${issue.toString()}');
      if (issue.affectedNode != null) {
        buffer.writeln('    Node: ${issue.affectedNode}');
      }
      if (issue.context != null) {
        buffer.writeln('    Context: ${issue.context}');
      }
      buffer.writeln();
    }

    return buffer.toString();
  }

  Map<String, dynamic> toJson() => {
    'total_issues': totalIssues,
    'fatal': fatalCount,
    'errors': errorCount,
    'warnings': warningCount,
    'info': infoCount,
    'has_critical': hasCriticalIssues,
    'issues': issues
        .map(
          (i) => {
            'severity': i.severity.name,
            'code': i.code,
            'message': i.message,
            'suggestion': i.suggestion,
          },
        )
        .toList(),
  };
}

// ============================================================================
// PHASE 0: IR STRUCTURE VALIDATOR
// ============================================================================

class IRStructureValidator {
  final DiagnosticReport report = DiagnosticReport();

  void validateDartFile(DartFile dartFile) {
    _validateFileMetadata(dartFile);
    _validateClassDeclarations(dartFile);
    _validateFunctionDeclarations(dartFile);
    _validateImports(dartFile);
  }

  void _validateFileMetadata(DartFile dartFile) {
    if (dartFile.filePath.isEmpty) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'IR001',
          message: 'DartFile has empty filePath',
          suggestion: 'Ensure file path is properly set',
        ),
      );
    }

    if (dartFile.contentHash.isEmpty) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'IR002',
          message: 'DartFile has empty contentHash',
          suggestion: 'Content hash should be computed for verification',
        ),
      );
    }
  }

  void _validateClassDeclarations(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      // Validate class name
      if (cls.name.isEmpty) {
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'IR003',
            message: 'Class has empty name',
            affectedNode: 'ClassDecl',
          ),
        );
      }

      // Validate methods
      for (final method in cls.methods) {
        _validateMethod(method, cls.name);
      }

      // Validate fields
      for (final field in cls.instanceFields) {
        _validateField(field, cls.name);
      }

      // Validate constructors
      for (final ctor in cls.constructors) {
        _validateConstructor(ctor, cls.name);
      }
    }
  }

  void _validateMethod(MethodDecl method, String className) {
    if (method.name.isEmpty) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'IR004',
          message: 'Method in class $className has empty name',
          affectedNode: 'MethodDecl',
        ),
      );
    }

    // ✅ NEW: Check body structure
    if (method.body == null && !method.isAbstract) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'IR005',
          message: 'Non-abstract method ${method.name} has null body',
          suggestion: 'Provide method implementation or mark as abstract',
          context: {'className': className, 'methodName': method.name},
        ),
      );
    }

    // ✅ NEW: Check if FunctionBodyIR has required fields
    if (method.body != null) {
      _validateFunctionBody(method.body!, 'Method ${method.name}');
    }
  }

  void _validateField(FieldDecl field, String className) {
    if (field.name.isEmpty) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'IR006',
          message: 'Field in class $className has empty name',
          affectedNode: 'FieldDecl',
        ),
      );
    }

    if (field.type.displayName().isEmpty) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'IR007',
          message: 'Field ${field.name} has invalid type',
          context: {'className': className},
        ),
      );
    }
  }

  void _validateConstructor(ConstructorDecl ctor, String className) {
    if (ctor.constructorClass != className) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'IR008',
          message:
              'Constructor class mismatch: ${ctor.constructorClass} vs $className',
          affectedNode: 'ConstructorDecl',
        ),
      );
    }

    // ✅ NEW: Check constructor body
    if (ctor.body != null) {
      _validateFunctionBody(ctor.body!, 'Constructor $className');
    }
  }

  void _validateFunctionDeclarations(DartFile dartFile) {
    for (final func in dartFile.functionDeclarations) {
      if (func.name.isEmpty) {
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'IR009',
            message: 'Function has empty name',
            affectedNode: 'FunctionDecl',
          ),
        );
      }

      // ✅ NEW: Validate function body
      if (func.body != null) {
        _validateFunctionBody(func.body!, 'Function ${func.name}');
      }

      // Validate parameters
      for (final param in func.parameters) {
        _validateParameter(param, func.name);
      }
    }
  }

  void _validateParameter(ParameterDecl param, String funcName) {
    if (param.name.isEmpty) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'IR010',
          message: 'Parameter in function $funcName has empty name',
          affectedNode: 'ParameterDecl',
        ),
      );
    }

    // ✅ NEW: Check isPositional field
    if (!param.isPositional && !param.isNamed) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'IR011',
          message: 'Parameter ${param.name} is neither positional nor named',
          context: {'funcName': funcName},
        ),
      );
    }
  }

  void _validateFunctionBody(FunctionBodyIR body, String context) {
    // ✅ NEW: Validate FunctionBodyIR fields
    if (body.statements.isEmpty && !body.isEmpty) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'IR012',
          message: 'FunctionBodyIR has empty statements but isEmpty=false',
          affectedNode: context,
          suggestion: 'Check FunctionBodyIR initialization',
        ),
      );
    }

    if (body.totalItems != body.statements.length) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'IR013',
          message:
              'FunctionBodyIR totalItems (${body.totalItems}) != statements.length (${body.statements.length})',
          affectedNode: context,
          suggestion: 'Ensure totalItems is correctly calculated',
        ),
      );
    }
  }

  void _validateImports(DartFile dartFile) {
    for (final import in dartFile.imports) {
      if (import.uri.isEmpty) {
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'IR014',
            message: 'Import has empty URI',
            affectedNode: 'ImportDecl',
          ),
        );
      }
    }
  }
}

// ============================================================================
// PHASE 1-2: CODE GENERATION VALIDATOR
// ============================================================================

class CodeGenerationValidator {
  final DiagnosticReport report = DiagnosticReport();

  void validateExpressionGeneration(ExpressionIR expr, String context) {
    try {
      final exprGen = ExpressionCodeGen();
      final code = exprGen.generate(expr);

      if (code.isEmpty) {
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'CG001',
            message: 'Expression generator produced empty code',
            affectedNode: context,
            context: {'exprType': expr.runtimeType.toString()},
          ),
        );
      }

      if (code.contains('TODO') || code.contains('FIXME')) {
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.warning,
            code: 'CG002',
            message: 'Generated code contains TODO/FIXME markers',
            affectedNode: context,
            suggestion: 'Review generated code for incomplete implementation',
          ),
        );
      }

      _validateGeneratedSyntax(code, context);
    } catch (e, st) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'CG003',
          message: 'Expression generation failed: $e',
          affectedNode: context,
          suggestion: 'Check expression structure and types',
          stackTrace: st,
        ),
      );
    }
  }

  void validateStatementGeneration(StatementIR stmt, String context) {
    try {
      final stmtGen = StatementCodeGen();
      final code = stmtGen.generate(stmt);

      if (code.isEmpty) {
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'CG004',
            message: 'Statement generator produced empty code',
            affectedNode: context,
            context: {'stmtType': stmt.runtimeType.toString()},
          ),
        );
      }

      _validateGeneratedSyntax(code, context);
    } catch (e, stackTrace) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'CG005',
          message: 'Statement generation failed: $e',
          affectedNode: context,
          suggestion: 'Check statement structure and types',
          stackTrace: stackTrace,
        ),
      );
    }
  }

  void _validateGeneratedSyntax(String code, String context) {
    // Check for unmatched braces
    final openBraces = code.split('{').length - 1;
    final closeBraces = code.split('}').length - 1;
    if (openBraces != closeBraces) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.error,
          code: 'CG006',
          message: 'Unmatched braces: $openBraces open, $closeBraces close',
          affectedNode: context,
        ),
      );
    }

    // Check for unmatched parentheses
    final openParens = code.split('(').length - 1;
    final closeParens = code.split(')').length - 1;
    if (openParens != closeParens) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'CG007',
          message:
              'Unmatched parentheses: $openParens open, $closeParens close',
          affectedNode: context,
        ),
      );
    }

    // Check for unclosed strings
    if (code.split('"').length % 2 != 1 || code.split("'").length % 2 != 1) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.warning,
          code: 'CG008',
          message: 'Potential unclosed string literals',
          affectedNode: context,
        ),
      );
    }
  }
}

// ============================================================================
// PHASE 3: WIDGET VALIDATION
// ============================================================================

class WidgetValidationValidator {
  final DiagnosticReport report = DiagnosticReport();

  void validateWidget(InstanceCreationExpressionIR widget, String context) {
    final widgetName = widget.type.displayName();

    // Check if widget is known
    if (!FlutterWidgetRegistry.isKnownWidget(widgetName)) {
      report.addIssue(
        DiagnosticIssue(
          severity: DiagnosticSeverity.info,
          code: 'WG001',
          message: 'Unknown widget: $widgetName',
          affectedNode: context,
          suggestion: 'Widget may be custom or from external package',
        ),
      );
      return;
    }

    final jsInfo = FlutterWidgetRegistry.getWidget(widgetName);
    if (jsInfo == null) return;

    // Check widget stability
    switch (jsInfo.stability) {
      case WidgetStability.deprecated:
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.error,
            code: 'WG002',
            message: 'Widget "$widgetName" is DEPRECATED',
            affectedNode: context,
            suggestion: jsInfo.alternatives.isNotEmpty
                ? 'Use: ${jsInfo.alternatives.join(", ")}'
                : null,
          ),
        );
        break;

      case WidgetStability.alpha:
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.warning,
            code: 'WG003',
            message: 'Widget "$widgetName" is ALPHA (experimental)',
            affectedNode: context,
            suggestion: 'Not recommended for production',
          ),
        );
        break;

      case WidgetStability.beta:
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.info,
            code: 'WG004',
            message: 'Widget "$widgetName" is BETA (feature complete)',
            affectedNode: context,
          ),
        );
        break;

      default:
        break;
    }

    // Check properties
    _validateWidgetProperties(widget, jsInfo, context);
  }

  void _validateWidgetProperties(
    InstanceCreationExpressionIR widget,
    JSWidgetInfo jsInfo,
    String context,
  ) {
    for (final entry in widget.namedArguments.entries) {
      final propName = entry.key;

      if (!jsInfo.props.containsKey(propName)) {
        report.addIssue(
          DiagnosticIssue(
            severity: DiagnosticSeverity.warning,
            code: 'WG005',
            message:
                'Unknown property "$propName" for widget "${jsInfo.jsClass}"',
            affectedNode: context,
            suggestion: 'Check property name spelling',
          ),
        );
      } else {
        final propInfo = jsInfo.props[propName]!;
        if (propInfo.isDeprecated) {
          report.addIssue(
            DiagnosticIssue(
              severity: DiagnosticSeverity.warning,
              code: 'WG006',
              message: 'Property "$propName" is deprecated',
              affectedNode: context,
              suggestion: 'Use: ${propInfo.replacedBy}',
            ),
          );
        }
      }
    }
  }
}

// ============================================================================
// MAIN DIAGNOSTIC ENGINE
// ============================================================================

class ModelToJSDiagnosticEngine {
  final irValidator = IRStructureValidator();
  final codeGenValidator = CodeGenerationValidator();
  final widgetValidator = WidgetValidationValidator();

  DiagnosticReport performFullDiagnostics(DartFile dartFile) {
    // Phase 0: IR Structure
    irValidator.validateDartFile(dartFile);

    // Phase 1-2: Code Generation
    for (final cls in dartFile.classDeclarations) {
      for (final method in cls.methods) {
        if (method.name == 'build' && method.body != null) {
          // Validate build method body
          for (final stmt in method.body!.statements) {
            codeGenValidator.validateStatementGeneration(
              stmt,
              '${cls.name}.${method.name}',
            );
          }
        }
      }
    }

    // Phase 3: Widget Validation
    _validateWidgets(dartFile);

    // Merge reports
    final merged = DiagnosticReport();
    merged.issues.addAll(irValidator.report.issues);
    merged.issues.addAll(codeGenValidator.report.issues);
    merged.issues.addAll(widgetValidator.report.issues);

    return merged;
  }

  void _validateWidgets(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      for (final method in cls.methods) {
        if (method.body != null) {
          _findWidgetsInBody(method.body!, '${cls.name}.${method.name}');
        }
      }
    }
  }

  void _findWidgetsInBody(FunctionBodyIR body, String context) {
    for (final stmt in body.statements) {
      _findWidgetsInStatement(stmt, context);
    }
  }

  void _findWidgetsInStatement(StatementIR stmt, String context) {
    if (stmt is ReturnStmt && stmt.expression != null) {
      _findWidgetsInExpression(stmt.expression!, context);
    } else if (stmt is ExpressionStmt) {
      _findWidgetsInExpression(stmt.expression, context);
    }
  }

  void _findWidgetsInExpression(ExpressionIR expr, String context) {
    if (expr is InstanceCreationExpressionIR) {
      widgetValidator.validateWidget(expr, context);
    } else if (expr is MethodCallExpressionIR) {
      for (final arg in expr.arguments) {
        _findWidgetsInExpression(arg, context);
      }
    }
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
void main() {
  final dartFile = ... // Your DartFile from conversion_report.json
  final engine = ModelToJSDiagnosticEngine();
  final report = engine.performFullDiagnostics(dartFile);
  
  print(report.generateReport());
  
  if (report.hasCriticalIssues) {
    print('❌ Critical issues found. Fix before proceeding.');
  } else {
    print('✅ Ready for code generation.');
  }
}
*/
