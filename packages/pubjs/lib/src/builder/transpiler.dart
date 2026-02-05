// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:path/path.dart' as p;

/// Transpiles Dart code to JavaScript ES6 modules
class Transpiler {
  final _TranspilerVisitor _visitor = _TranspilerVisitor();

  String transpile(String dartCode) {
    // Note: In a real implementation, we would use parseString from package:analyzer
    // But since we are inside a package, we'll need to set up the resolver.
    // For this initial implementation, we assume the AST is passed or we basic parsing.
    //
    // However, to keep this file simple and compilable without complex setup,
    // we will rely on the visitor logic.
    return '// Transpiled from Dart\n' +
        dartCode; // Placeholder until we connect the parser
  }

  String visitNode(AstNode node) {
    return node.accept(_visitor) ?? '';
  }
}

class _TranspilerVisitor extends GeneralizingAstVisitor<String> {
  final StringBuffer _buffer = StringBuffer();

  @override
  String? visitCompilationUnit(CompilationUnit node) {
    final buffer = StringBuffer();

    // 1. Handle Directives (Imports/Exports)
    for (final directive in node.directives) {
      final trans = directive.accept(this);
      if (trans != null) buffer.writeln(trans);
    }

    buffer.writeln();

    // 2. Handle Declarations (Classes, Top-level functions)
    for (final declaration in node.declarations) {
      final trans = declaration.accept(this);
      if (trans != null) buffer.writeln(trans);
    }

    return buffer.toString();
  }

  @override
  String? visitImportDirective(ImportDirective node) {
    final uri = node.uri.stringValue;
    if (uri == null) return null;

    // Rewrite Imports
    final jsImport = _rewriteImport(uri);
    return "import * as ${node.prefix?.name ?? 'module_${uri.hashCode}'} from '$jsImport';";
  }

  String _rewriteImport(String uri) {
    if (uri.startsWith('package:flutter/material.dart')) {
      return '@flutterjs/material';
    }
    if (uri.startsWith('package:flutter/widgets.dart')) {
      return '@flutterjs/widgets';
    }
    if (uri.startsWith('dart:async')) {
      // No import needed for native JS promises, but maybe polyfills
      return './_polyfills/async.js';
    }
    // Relative imports
    if (!uri.startsWith('package:') && !uri.startsWith('dart:')) {
      return uri.replaceAll('.dart', '.js');
    }
    return uri; // Placeholder
  }

  @override
  String? visitClassDeclaration(ClassDeclaration node) {
    final buffer = StringBuffer();
    final name = node.name.lexeme;
    final superClause = node.extendsClause;

    buffer.write('export class $name');

    if (superClause != null) {
      buffer.write(' extends ${superClause.superclass.name.lexeme}');
    }

    buffer.writeln(' {');

    // Members
    for (final member in node.members) {
      final trans = member.accept(this);
      if (trans != null) buffer.writeln(trans);
    }

    buffer.writeln('}');
    return buffer.toString();
  }

  @override
  String? visitMethodDeclaration(MethodDeclaration node) {
    final name = node.name.lexeme;
    final isStatic = node.isStatic ? 'static ' : '';
    // Async handling
    final isAsync = node.body.keyword?.lexeme == 'async' ? 'async ' : '';

    // Params (simplified)
    final params =
        node.parameters?.parameters.map((p) => p.name?.lexeme).join(', ') ?? '';

    final body = node.body.accept(this);

    return '  $isStatic$isAsync$name($params) $body';
  }

  @override
  String? visitBlockFunctionBody(BlockFunctionBody node) {
    final block = node.block.accept(this);
    return block;
  }

  @override
  String? visitBlock(Block node) {
    final buffer = StringBuffer();
    buffer.writeln('{');
    for (final stmt in node.statements) {
      final trans = stmt.accept(this);
      if (trans != null) buffer.writeln('    $trans');
    }
    buffer.write('  }');
    return buffer.toString();
  }

  // -- Basic Expressions --

  @override
  String? visitMethodInvocation(MethodInvocation node) {
    final target = node.target?.accept(this);
    final method = node.methodName.name;
    final args = node.argumentList.arguments
        .map((a) => a.accept(this))
        .join(', ');

    if (target != null) {
      return '$target.$method($args)';
    } else {
      // Handle print -> console.log
      if (method == 'print') return 'console.log($args)';
      return '$method($args)';
    }
  }

  @override
  String? visitSimpleStringLiteral(SimpleStringLiteral node) {
    return "'${node.value}'";
  }

  @override
  String? visitIntegerLiteral(IntegerLiteral node) {
    return node.literal.lexeme;
  }

  @override
  String? visitExpressionStatement(ExpressionStatement node) {
    final expr = node.expression.accept(this);
    return '$expr;';
  }

  @override
  String? visitReturnStatement(ReturnStatement node) {
    final expr = node.expression?.accept(this) ?? '';
    return 'return $expr;';
  }
}
