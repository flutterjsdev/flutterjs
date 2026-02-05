// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * WidgetAnalyzer Enhancement - Track field references
 * 
 * Understand that:
 *   _count = 0;        <- field declaration
 *   this._count        <- field reference
 * 
 * These are the same thing!
 */

import { getLogger } from './flutterjs_logger.js';

class WidgetAnalyzer {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.options = {
      strict: false,
      ...options,
    };
    this.logger = getLogger().createComponentLogger('WidgetAnalyzer');
    this.widgets = new Map();        // key: className, value: Widget object
    this.functions = new Map();      // key: functionName, value: Function object
    this.imports = [];
    this.externalDependencies = new Set();
    this.entryPoint = null;
    this.rootWidget = null;
    this.widgetTree = null;
    this.errors = [];
  }

  /**
   * Main entry point - analyze entire AST
   */
  analyze() {
    this.logger.startSession('WidgetAnalyzer');
    if (!this.ast || !this.ast.body) {
      throw new Error('Invalid AST provided');
    }

    this.logger.trace('[WidgetAnalyzer] Starting analysis...');

    try {
      // Phase 1: Extract all classes and functions
      this.logger.trace('[WidgetAnalyzer] Phase 1: Extracting classes and functions...');
      this.extractClassesAndFunctions();
      this.logger.trace(`[WidgetAnalyzer]   Found ${this.widgets.size} classes in total`);

      // Phase 2: Detect which classes are widgets
      this.logger.trace('[WidgetAnalyzer] Phase 2: Detecting widgets...');
      this.detectWidgets();
      this.logger.trace(`[WidgetAnalyzer]   Detected widgets: ${Array.from(this.widgets.values()).filter(w => w.type !== 'class').length}`);

      // Phase 3: Extract imports and dependencies
      this.logger.trace('[WidgetAnalyzer] Phase 3: Extracting imports...');
      this.extractImports();
      this.logger.trace(`[WidgetAnalyzer]   Found ${this.imports.length} imports`);

      // Phase 4: Find entry point
      this.logger.trace('[WidgetAnalyzer] Phase 4: Finding entry point...');
      this.findEntryPoint();
      this.logger.trace(`[WidgetAnalyzer]   Entry point: ${this.entryPoint || 'NOT FOUND'}`);

      // Phase 5: Build widget tree
      this.logger.trace('[WidgetAnalyzer] Phase 5: Building widget tree...');
      this.buildWidgetTree();
      this.logger.trace(`[WidgetAnalyzer]   Tree root: ${this.rootWidget || 'NOT FOUND'}`);

      this.logger.trace('[WidgetAnalyzer] Analysis complete\n');

      return this.getResults();
    } catch (error) {
      this.errors.push({
        type: 'analysis-error',
        message: error.message,
        stack: error.stack,
      });
      return this.getResults();
    }
  }

  /**
   * Phase 1: Extract all classes and functions from AST
   */
  extractClassesAndFunctions() {
    if (!this.ast.body) return;

    for (const node of this.ast.body) {
      if (node.type === 'ClassDeclaration') {
        this.extractClassDeclaration(node);
      } else if (node.type === 'FunctionDeclaration') {
        this.extractFunctionDeclaration(node);
      }
    }
  }

  /**
   * Extract a single class declaration
   * Handles both field declarations and method declarations
   */
  extractClassDeclaration(classNode) {
    const name = classNode.id?.name;
    if (!name) return;

    const superClass = classNode.superClass?.name || null;
    const location = classNode.location;

    const widget = {
      name,
      type: 'class',
      location,
      superClass,
      constructor: null,
      properties: [],      // Fields with their initial values
      methods: [],
      fieldReferences: {}, // Map of which methods use which fields
      imports: [],
      children: [],
      linkedStateClass: null,
    };

    // Extract fields (declared with _count = 0; syntax)
    if (classNode.body?.fields) {
      classNode.body.fields.forEach((field) => {
        const fieldName = field.key?.name;
        const initialValue = field.initialValue ? this.expressionToString(field.initialValue) : null;

        widget.properties.push({
          name: fieldName,
          initialValue: initialValue,
          type: this.inferFieldType(field.initialValue),
        });

        // Track that this field exists
        if (!widget.fieldReferences[fieldName]) {
          widget.fieldReferences[fieldName] = [];
        }
      });
    }

    // Extract constructor
    if (classNode.body?.methods) {
      const constructorMethod = classNode.body.methods.find(
        (m) => m.key?.name === 'constructor'
      );
      if (constructorMethod) {
        widget.constructor = {
          name: 'constructor',
          params: constructorMethod.params || [],
          location: constructorMethod.location,
        };
      }

      // Extract other methods and track field usage
      classNode.body.methods.forEach((method) => {
        if (method.key?.name !== 'constructor') {
          const methodName = method.key?.name;
          const methodData = {
            name: methodName,
            params: method.params || [],
            location: method.location,
            hasBody: method.body !== null,
            usesFields: [], // Which fields this method references
          };

          // Track field references in this method
          if (method.body) {
            const fieldRefs = this.findFieldReferencesInBody(method.body);
            methodData.usesFields = fieldRefs;

            // Update the field reference map
            fieldRefs.forEach((fieldName) => {
              if (widget.fieldReferences[fieldName]) {
                widget.fieldReferences[fieldName].push(methodName);
              }
            });
          }

          widget.methods.push(methodData);
        }
      });
    }

    this.widgets.set(name, widget);
    this.logger.trace(`[WidgetAnalyzer]     Extracted class: ${name} extends ${superClass}`);
    if (widget.properties.length > 0) {
      this.logger.trace(`[WidgetAnalyzer]       Fields: ${widget.properties.map(p => `${p.name}=${p.initialValue}`).join(', ')}`);
    }
  }

  /**
   * Find all field references (this._fieldName) in a method body
   */
  findFieldReferencesInBody(body) {
    const fields = [];

    // Simple traversal to find this.fieldName patterns
    // This is a basic implementation - enhance as needed
    const traverse = (node) => {
      if (!node) return;

      // Look for MemberExpression: this._fieldName
      if (node.type === 'MemberExpression') {
        if (node.object?.name === 'this' && node.property?.name) {
          fields.push(node.property.name);
        }
      }

      // Recursively traverse all node properties
      for (const key in node) {
        if (key !== 'location' && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(traverse);
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(body);
    return [...new Set(fields)]; // Remove duplicates
  }

  /**
   * Infer the type of a field from its initializer
   */
  inferFieldType(initialValue) {
    if (!initialValue) return 'any';

    if (initialValue.type === 'Literal') {
      const val = initialValue.value;
      if (typeof val === 'number') return 'int' | 'double';
      if (typeof val === 'boolean') return 'bool';
      if (typeof val === 'string') return 'String';
      if (val === null) return 'null';
    }

    if (initialValue.type === 'Identifier') {
      return initialValue.name;
    }

    if (initialValue.type === 'ArrayExpression') {
      return 'List';
    }

    if (initialValue.type === 'ObjectExpression') {
      return 'Map';
    }

    return 'dynamic';
  }

  /**
   * Extract a function declaration
   */
  extractFunctionDeclaration(funcNode) {
    const name = funcNode.id?.name || 'anonymous';
    const location = funcNode.location;

    const func = {
      name,
      type: 'function',
      location,
      params: funcNode.params?.map((p) => ({
        name: p.name?.name || 'param',
        optional: p.optional || false,
      })) || [],
      isAsync: funcNode.isAsync || false,
      isEntryPoint: false,
    };

    this.functions.set(name, func);
  }

  /**
   * Phase 2: Detect which classes are widgets
   */
  detectWidgets() {
    this.widgets.forEach((widget) => {
      if (!widget.superClass) {
        widget.type = 'class';
        return;
      }

      const superClass = widget.superClass;

      if (superClass === 'StatelessWidget') {
        widget.type = 'stateless';
        this.logger.trace(`[WidgetAnalyzer]     ${widget.name} is StatelessWidget`);
      } else if (superClass === 'StatefulWidget') {
        widget.type = 'stateful';
        this.logger.trace(`[WidgetAnalyzer]     ${widget.name} is StatefulWidget`);
      } else if (superClass?.startsWith('State')) {
        widget.type = 'state';
        this.logger.trace(`[WidgetAnalyzer]     ${widget.name} is State class`);
      } else {
        widget.type = 'component';
      }
    });
  }

  /**
   * Phase 3: Extract imports
   */
  // In flutterjs_widget_analyzer.js
  extractImports() {
    if (!this.ast.body) return;

    this.ast.body.forEach((node) => {
      if (node.type === 'ImportDeclaration') {
        const source = node.source?.value;

        // ✅ Get all imported items (handles multi-line properly)
        const items = node.specifiers?.map((spec) => {
          // Use the local name (after 'as')
          return spec.local?.name || spec.imported?.name;
        }) || [];

        this.imports.push({
          source,
          items,
          specifiers: node.specifiers, // Keep raw specifiers for later
        });

        this.externalDependencies.add(source);
      }
    });
  }

  /**
   * Phase 4: Find entry point
   */
  findEntryPoint() {
    if (this.functions.has('main')) {
      this.entryPoint = 'main';
      const mainFunc = this.functions.get('main');
      mainFunc.isEntryPoint = true;

      const mainAstNode = this.ast.body.find(
        (n) => n.type === 'FunctionDeclaration' && n.id?.name === 'main'
      );

      if (mainAstNode?.body?.body) {
        this.rootWidget = this.findRunAppWidget(mainAstNode.body.body);
      }
    }
  }

  /**
   * Find which widget is passed to runApp()
   */
  findRunAppWidget(statements) {
    for (const stmt of statements) {
      if (stmt.type === 'ExpressionStatement' && stmt.expression?.type === 'CallExpression') {
        const call = stmt.expression;
        if (call.callee?.name === 'runApp' && call.args?.length > 0) {
          return this.getWidgetNameFromExpression(call.args[0]);
        }
      }
      if (stmt.type === 'ReturnStatement' && stmt.argument?.type === 'CallExpression') {
        const call = stmt.argument;
        if (call.callee?.name === 'runApp' && call.args?.length > 0) {
          return this.getWidgetNameFromExpression(call.args[0]);
        }
      }
    }
    return null;
  }

  /**
   * Extract widget name from expression
   */
  getWidgetNameFromExpression(expr) {
    if (!expr) return null;

    if (expr.type === 'NewExpression') {
      return expr.callee?.name;
    }

    if (expr.type === 'CallExpression') {
      return expr.callee?.name;
    }

    if (expr.type === 'Identifier') {
      return expr.name;
    }

    return null;
  }

  /**
   * Phase 5: Build widget tree
   */
  buildWidgetTree() {
    if (!this.rootWidget || !this.widgets.has(this.rootWidget)) {
      return;
    }

    const rootWidget = this.widgets.get(this.rootWidget);
    this.widgetTree = {
      widget: rootWidget,
      depth: 0,
      children: [],
    };
  }

  /**
   * Convert expression to string representation
   */
  expressionToString(expr) {
    if (!expr) return null;

    if (expr.type === 'Literal') {
      return expr.value;
    }

    if (expr.type === 'Identifier') {
      const name = expr.name;
      if (name === 'true' || name === 'false') return name === 'true';
      if (name === 'null') return null;
      if (name === 'undefined') return undefined;
      return name;
    }

    return undefined;
  }

  /**
   * Get results
   */
  getResults() {
    const widgetArray = Array.from(this.widgets.values()).filter(
      (w) => w.type === 'stateless' || w.type === 'stateful' || w.type === 'state' || w.type === 'component'
    );

    this.logger.trace(`[WidgetAnalyzer] getResults() returning ${widgetArray.length} widgets`);

    return {
      widgets: widgetArray,
      functions: Array.from(this.functions.values()),
      imports: this.imports,
      externalDependencies: Array.from(this.externalDependencies),
      entryPoint: this.entryPoint,
      rootWidget: this.rootWidget,
      widgetTree: this.widgetTree,
      errors: this.errors,
    };
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const widgets = Array.from(this.widgets.values());
    const statelessCount = widgets.filter((w) => w.type === 'stateless').length;
    const statefulCount = widgets.filter((w) => w.type === 'stateful').length;
    const stateCount = widgets.filter((w) => w.type === 'state').length;

    return {
      totalWidgets: widgets.length,
      statelessWidgets: statelessCount,
      statefulWidgets: statefulCount,
      stateClasses: stateCount,
      totalFunctions: this.functions.size,
      totalImports: this.imports.length,
      externalPackages: this.externalDependencies.size,
      entryPoint: this.entryPoint,
      rootWidget: this.rootWidget,
    };
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.errors;
  }
}

export { WidgetAnalyzer };