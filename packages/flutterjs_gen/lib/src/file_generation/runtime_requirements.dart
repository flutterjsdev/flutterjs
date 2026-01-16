// ============================================================================
// RUNTIME REQUIREMENTS (UPDATED WITH ASYNC)
// ============================================================================

import 'package:flutterjs_core/flutterjs_core.dart';

class RuntimeRequirements {
  final Set<String> requiredHelpers = {};

  void addHelper(String helperName) {
    requiredHelpers.add(helperName);
  }

  List<String> getRequiredHelpers() {
    return requiredHelpers.toList()..sort();
  }

  Future<void> analyzeAsync(DartFile dartFile) async {
    if (_hasTypeChecks(dartFile)) {
      addHelper('isType_String');
      addHelper('isType_int');
      addHelper('isType_double');
      addHelper('isType_bool');
      addHelper('isType_List');
      addHelper('isType_Map');
    }

    if (_hasNullableTypes(dartFile)) {
      addHelper('nullCheck');
    }

    if (_hasCollections(dartFile)) {
      addHelper('listCast');
      addHelper('mapCast');
    }

    if (_hasArrayAccess(dartFile)) {
      addHelper('boundsCheck');
    }

    addHelper('typeAssertion');
    addHelper('nullAssert');
  }

  bool _hasTypeChecks(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      for (final method in cls.methods) {
        if (method.body != null) {
          if (_exprHasTypeCheck(method.body)) {
            return true;
          }
        }
      }
    }

    for (final func in dartFile.functionDeclarations) {
      if (func.body != null) {
        if (_exprHasTypeCheck(func.body)) {
          return true;
        }
      }
    }

    return false;
  }

  bool _exprHasTypeCheck(dynamic expr) {
    if (expr is TypeCheckExpr || expr is CastExpressionIR) {
      return true;
    }
    if (expr is BlockStmt) {
      for (final stmt in expr.statements) {
        if (stmt is ExpressionStmt && _exprHasTypeCheck(stmt.expression)) {
          return true;
        }
      }
    }
    return false;
  }

  bool _hasNullableTypes(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      for (final field in cls.instanceFields) {
        final typeName = field.type.displayName();
        if (typeName.endsWith('?')) {
          return true;
        }
      }

      for (final method in cls.methods) {
        final returnTypeName = method.returnType.displayName();
        if (returnTypeName.endsWith('?')) {
          return true;
        }
      }
    }

    return false;
  }

  bool _hasCollections(DartFile dartFile) {
    for (final cls in dartFile.classDeclarations) {
      for (final field in cls.instanceFields) {
        final typeName = field.type.displayName();
        if (typeName.contains('List') ||
            typeName.contains('Map') ||
            typeName.contains('Set')) {
          return true;
        }
      }
    }

    return false;
  }

  bool _hasArrayAccess(DartFile dartFile) {
    return false;
  }
}
