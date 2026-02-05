// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS State Analyzer
 * Phase 2 Implementation
 * 
 * Extracts state management information from StatefulWidget/State classes
 * No external dependencies - pure Node.js
 */

// ============================================================================
// STATE ANALYZER CLASS
// ============================================================================

class StateAnalyzer {
  constructor(ast, widgets, options = {}) {
    this.ast = ast;
    this.widgets = widgets; // from Phase 1 WidgetAnalyzer
    this.options = {
      strict: false,
      ...options,
    };

    // Results storage
    this.stateClasses = new Map();
    this.stateFields = new Map();
    this.setStateCalls = [];
    this.lifecycleMethods = [];
    this.eventHandlers = [];
    this.dependencyGraph = null;
    this.validationResults = [];
    this.errors = [];
  }

  /**
   * Main entry point - analyze all state-related code
   */
  analyze() {
    if (!this.ast || !this.ast.body) {
      throw new Error('Invalid AST provided');
    }

    try {
      // Phase 1: Find and link StatefulWidget/State pairs
      this.linkStatefulToState();

      // Phase 2: Extract state fields from State classes
      this.extractStateFields();

      // Phase 3: Find setState calls
      this.findSetStateCalls();

      // Phase 4: Extract lifecycle methods
      this.extractLifecycleMethods();

      // Phase 5: Extract event handlers
      this.extractEventHandlers();

      // Phase 6: Build dependency graph
      this.buildDependencyGraph();

      // Phase 7: Validate everything
      this.validateState();

      return this.getResults();
    } catch (error) {
      this.errors.push(error);
      return this.getResults();
    }
  }

  /**
   * Phase 1: Link StatefulWidget to State class
   * 
   * StatefulWidget.createState() returns State class instance
   * We need to find the return value and match it with State class
   */
  linkStatefulToState() {
    this.widgets.forEach((widget) => {
      if (widget.type !== 'stateful') return;

      // Find the createState method
      const createStateMethod = widget.methods.find(
        (m) => m.name === 'createState'
      );

      if (!createStateMethod) {
        this.errors.push({
          type: 'missing-create-state',
          widget: widget.name,
          message: `StatefulWidget "${widget.name}" has no createState() method`,
        });
        return;
      }

      // Find the corresponding class declaration in AST
      const widgetNode = this.ast.body.find(
        (n) => n.type === 'ClassDeclaration' && n.id.name === widget.name
      );

      if (!widgetNode) return;

      // Find what createState returns
      const createStateNode = widgetNode.body.methods.find(
        (m) => m.key.name === 'createState'
      );

      if (!createStateNode) return;

      // Extract the returned State class name
      const stateClassName = this.extractReturnedClassName(createStateNode.body);

      if (!stateClassName) {
        this.errors.push({
          type: 'cannot-parse-create-state',
          widget: widget.name,
          message: `Cannot determine which State class is returned by ${widget.name}.createState()`,
        });
        return;
      }

      // Find the State class
      const stateClassNode = this.ast.body.find(
        (n) => n.type === 'ClassDeclaration' && n.id.name === stateClassName
      );

      if (!stateClassNode) {
        this.errors.push({
          type: 'missing-state-class',
          widget: widget.name,
          stateClass: stateClassName,
          message: `State class "${stateClassName}" not found`,
        });
        return;
      }

      // Check if it extends State<Widget>
      if (!stateClassNode.superClass || !stateClassNode.superClass.name.startsWith('State')) {
        this.errors.push({
          type: 'invalid-state-class',
          stateClass: stateClassName,
          message: `Class "${stateClassName}" does not extend State`,
        });
        return;
      }

      // Create StateClassMetadata
      const stateMetadata = new StateClassMetadata(
        stateClassName,
        stateClassNode.location,
        widget.name
      );

      this.stateClasses.set(stateClassName, {
        astNode: stateClassNode,
        metadata: stateMetadata,
      });

      // Link bidirectional
      widget.linkedStateClass = stateClassName;
    });
  }

  /**
   * Extract the class name returned from a method
   * Looks for: return new ClassName(); or return new ClassName();
   */
  extractReturnedClassName(methodBody) {
    if (!methodBody) return null;

    // Handle BlockStatement: { return new ClassName(); }
    if (methodBody.type === 'BlockStatement' && methodBody.body) {
      for (const stmt of methodBody.body) {
        if (stmt.type === 'ReturnStatement' && stmt.argument) {
          const className = this.getClassNameFromExpression(stmt.argument);
          if (className) return className;
        }
      }
    }

    // Handle direct expression: return new ClassName();
    if (methodBody.type === 'NewExpression') {
      return methodBody.callee.name;
    }

    return null;
  }

  /**
   * Extract class name from expression (new ClassName or ClassName)
   */
  getClassNameFromExpression(expr) {
    if (!expr) return null;

    if (expr.type === 'NewExpression' && expr.callee) {
      return expr.callee.name;
    }

    if (expr.type === 'Identifier') {
      return expr.name;
    }

    if (expr.type === 'CallExpression' && expr.callee) {
      if (expr.callee.type === 'Identifier') {
        return expr.callee.name;
      }
    }

    return null;
  }

  /**
   * Phase 2: Extract state fields from State classes
   * 
   * State fields are class properties that can be mutated
   * Examples: _count = 0, _isLoading = false
   */
  extractStateFields() {
    this.stateClasses.forEach(({ astNode, metadata }) => {
      if (!astNode.body || !astNode.body.fields) return;

      astNode.body.fields.forEach((field) => {
        const fieldName = field.key.name;
        const initialValue = field.initialValue;

        // Infer type from initial value
        const type = this.inferFieldType(initialValue);

        const stateField = new StateField(
          fieldName,
          type,
          this.expressionToValue(initialValue),
          initialValue ? initialValue.location : field.location
        );

        // Track in global map and in metadata
        this.stateFields.set(`${metadata.name}.${fieldName}`, stateField);
        metadata.stateFields.push(stateField);
      });
    });
  }

  /**
   * Infer field type from initial value expression
   */
  inferFieldType(expr) {
    if (!expr) return 'any';

    if (expr.type === 'Literal') {
      if (typeof expr.value === 'number') return 'number';
      if (typeof expr.value === 'string') return 'string';
      if (typeof expr.value === 'boolean') return 'boolean';
      if (expr.value === null) return 'null';
    }

    if (expr.type === 'Identifier') {
      const name = expr.name;
      if (name === 'true' || name === 'false') return 'boolean';
      if (name === 'null') return 'null';
      if (name === 'undefined') return 'undefined';
    }

    // Array literal
    if (expr.type === 'ArrayLiteral') return 'array';

    // Object literal
    if (expr.type === 'ObjectLiteral') return 'object';

    // Function call - unknown return type
    if (expr.type === 'CallExpression') return 'any';

    return 'any';
  }

  /**
   * Convert expression to actual value (for initialization)
   */
  expressionToValue(expr) {
    if (!expr) return undefined;

    if (expr.type === 'Literal') {
      return expr.value;
    }

    if (expr.type === 'Identifier') {
      const name = expr.name;
      if (name === 'true') return true;
      if (name === 'false') return false;
      if (name === 'null') return null;
      if (name === 'undefined') return undefined;
    }

    return undefined;
  }

  /**
   * Phase 3: Find all setState() calls
   */
  findSetStateCalls() {
    this.stateClasses.forEach(({ astNode, metadata }) => {
      if (!astNode.body || !astNode.body.methods) return;

      // Search all methods for setState calls
      astNode.body.methods.forEach((method) => {
        const setStateCalls = this.findSetStateInMethod(method, metadata.name);
        this.setStateCalls.push(...setStateCalls);
      });
    });
  }

  /**
   * Find setState calls within a method
   */
  findSetStateInMethod(method, stateClassName) {
    const calls = [];
    const methodName = method.key.name;

    // Search method body for setState calls
    if (method.body) {
      const stmts = method.body.type === 'BlockStatement'
        ? method.body.body
        : [method.body];

      stmts.forEach((stmt) => {
        this.findSetStateInStatement(stmt, calls, methodName, stateClassName);
      });
    }

    return calls;
  }

  /**
   * Recursively find setState in statements
   */
  findSetStateInStatement(stmt, calls, methodName, stateClassName) {
    if (!stmt) return;

    // Handle expression statements
    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      this.findSetStateInExpression(stmt.expression, calls, methodName, stateClassName);
    }

    // Handle return statements
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      this.findSetStateInExpression(stmt.argument, calls, methodName, stateClassName);
    }

    // Handle blocks
    if (stmt.type === 'BlockStatement' && stmt.body) {
      stmt.body.forEach((s) => {
        this.findSetStateInStatement(s, calls, methodName, stateClassName);
      });
    }
  }

  /**
   * Find setState in expression tree
   */
  findSetStateInExpression(expr, calls, methodName, stateClassName) {
    if (!expr) return;

    // Check if this is a setState call: this.setState(callback)
    if (expr.type === 'CallExpression') {
      // Check if it's this.setState(...)
      const isSetState = this.isSetStateCall(expr);

      if (isSetState) {
        const updatedFields = this.extractSetStateUpdates(expr, stateClassName);
        const call = new StateUpdateCall(
          expr.location,
          methodName,
          updatedFields,
          stateClassName
        );
        calls.push(call);
      }

      // Also check arguments for nested setState calls
      expr.args.forEach((arg) => {
        this.findSetStateInExpression(arg, calls, methodName, stateClassName);
      });
    }

    // Recursively check nested expressions
    if (expr.type === 'ObjectLiteral' && expr.properties) {
      expr.properties.forEach((prop) => {
        this.findSetStateInExpression(prop.value, calls, methodName, stateClassName);
      });
    }
  }

  /**
   * Check if expression is this.setState(...)
   */
  isSetStateCall(expr) {
    if (expr.type !== 'CallExpression') return false;
    if (!expr.callee) return false;

    // Check for member expression: this.setState
    if (expr.callee.type === 'MemberExpression') {
      const obj = expr.callee.object;
      const prop = expr.callee.property;

      // this.setState
      if (obj.type === 'Identifier' && obj.name === 'this' &&
        prop.type === 'Identifier' && prop.name === 'setState') {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract which state fields are updated in setState
   * setState(() => { this._count++; })
   */
  extractSetStateUpdates(setStateCall, stateClassName) {
    const updated = [];

    if (!setStateCall.args || setStateCall.args.length === 0) return updated;

    // First argument is the callback: () => { ... }
    const callback = setStateCall.args[0];

    if (callback.type === 'ArrowFunctionExpression') {
      // Extract body
      const body = callback.body;

      if (body.type === 'BlockStatement' && body.body) {
        // Search for field mutations: this._field = value, this._field++, etc.
        body.body.forEach((stmt) => {
          const mutated = this.extractMutatedFields(stmt, stateClassName);
          updated.push(...mutated);
        });
      } else if (body.type === 'UpdateExpression' || body.type === 'AssignmentExpression') {
        // Direct mutation in arrow body
        const mutated = this.extractMutatedFields(body, stateClassName);
        updated.push(...mutated);
      }
    }

    return [...new Set(updated)]; // Remove duplicates
  }

  /**
   * Extract mutated fields from statement
   * Looks for: this._field = x, this._field++, this._field += x
   */
  extractMutatedFields(stmt, stateClassName) {
    const fields = [];

    if (!stmt) return fields;

    // Assignment: this._field = value
    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      const expr = stmt.expression;

      if (expr.type === 'AssignmentExpression') {
        const fieldName = this.getFieldNameFromTarget(expr.left);
        if (fieldName) fields.push(fieldName);
      }

      // Update expression: this._field++, this._field--
      if (expr.type === 'UpdateExpression') {
        const fieldName = this.getFieldNameFromTarget(expr.argument);
        if (fieldName) fields.push(fieldName);
      }
    }

    // Direct assignment/update (arrow body)
    if (stmt.type === 'AssignmentExpression') {
      const fieldName = this.getFieldNameFromTarget(stmt.left);
      if (fieldName) fields.push(fieldName);
    }

    if (stmt.type === 'UpdateExpression') {
      const fieldName = this.getFieldNameFromTarget(stmt.argument);
      if (fieldName) fields.push(fieldName);
    }

    return fields;
  }

  /**
   * Get field name from assignment target
   * Handles: this._field, obj.field, etc.
   */
  getFieldNameFromTarget(target) {
    if (!target) return null;

    // this._field
    if (target.type === 'MemberExpression') {
      const obj = target.object;
      const prop = target.property;

      // this._field
      if (obj.type === 'Identifier' && obj.name === 'this' &&
        prop.type === 'Identifier') {
        return prop.name;
      }
    }

    // _field (direct identifier)
    if (target.type === 'Identifier') {
      return target.name;
    }

    return null;
  }

  /**
   * Phase 4: Extract lifecycle methods
   * 
   * Lifecycle methods: initState, dispose, didUpdateWidget, build
   */
  extractLifecycleMethods() {
    const lifecycleNames = ['initState', 'dispose', 'didUpdateWidget', 'build'];

    this.stateClasses.forEach(({ astNode, metadata }) => {
      if (!astNode.body || !astNode.body.methods) return;

      astNode.body.methods.forEach((method) => {
        const methodName = method.key.name;

        if (lifecycleNames.includes(methodName)) {
          const lifecycle = new LifecycleMethod(
            methodName,
            method.location,
            method.params || [],
            this.checkCallsSuper(method),
            this.checkHasSideEffects(method)
          );

          this.lifecycleMethods.push(lifecycle);
          metadata.lifecycleMethods.push(lifecycle);
        }
      });
    });
  }

  /**
   * Check if method calls super.methodName()
   */
  checkCallsSuper(method) {
    if (!method.body) return false;

    const stmts = method.body.type === 'BlockStatement'
      ? method.body.body
      : [method.body];

    for (const stmt of stmts) {
      if (stmt.type === 'ExpressionStatement' && stmt.expression) {
        const expr = stmt.expression;

        // super.initState() pattern
        if (expr.type === 'CallExpression' && expr.callee.type === 'MemberExpression') {
          const obj = expr.callee.object;
          const prop = expr.callee.property;

          if (obj.type === 'Identifier' && obj.name === 'super' &&
            prop.type === 'Identifier' && prop.name === method.key.name) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if method has side effects (console.log, assignments, etc.)
   */
  checkHasSideEffects(method) {
    if (!method.body) return false;

    const stmts = method.body.type === 'BlockStatement'
      ? method.body.body
      : [method.body];

    for (const stmt of stmts) {
      // Assignment has side effect
      if (stmt.type === 'ExpressionStatement' && stmt.expression) {
        const expr = stmt.expression;

        if (expr.type === 'AssignmentExpression' || expr.type === 'UpdateExpression') {
          return true;
        }

        // Function calls might have side effects
        if (expr.type === 'CallExpression') {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Phase 5: Extract event handlers from build method
   * 
   * Looks for: onPressed: () => handler(), onChange: handler, etc.
   */
  extractEventHandlers() {
    this.stateClasses.forEach(({ astNode, metadata }) => {
      if (!astNode.body || !astNode.body.methods) return;

      // Find build method
      const buildMethod = astNode.body.methods.find((m) => m.key.name === 'build');
      if (!buildMethod) return;

      // Extract event handlers from the build method body
      const handlers = this.findEventHandlersInMethod(buildMethod, metadata.name);
      this.eventHandlers.push(...handlers);
    });
  }

  /**
   * Find event handlers in method body
   */
  findEventHandlersInMethod(method, stateClassName) {
    const handlers = [];

    if (!method.body) return handlers;

    const stmts = method.body.type === 'BlockStatement'
      ? method.body.body
      : [method.body];

    stmts.forEach((stmt) => {
      this.findEventHandlersInStatement(stmt, handlers, stateClassName);
    });

    return handlers;
  }

  /**
   * Recursively find event handlers in statements
   */
  findEventHandlersInStatement(stmt, handlers, stateClassName) {
    if (!stmt) return;

    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      this.findEventHandlersInExpression(stmt.expression, handlers, stateClassName);
    }

    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      this.findEventHandlersInExpression(stmt.argument, handlers, stateClassName);
    }

    if (stmt.type === 'BlockStatement' && stmt.body) {
      stmt.body.forEach((s) => {
        this.findEventHandlersInStatement(s, handlers, stateClassName);
      });
    }
  }

  /**
   * Find event handlers in expressions
   * Looks for: { onPressed: () => handler(), onChange: handler }
   */
  findEventHandlersInExpression(expr, handlers, stateClassName) {
    if (!expr) return;

    // Check object literals for event properties
    if (expr.type === 'ObjectLiteral' && expr.properties) {
      expr.properties.forEach((prop) => {
        // Property key is the event name (onPressed, onChange, etc.)
        const eventName = this.getPropertyKey(prop.key);
        const eventPattern = /^on[A-Z]/; // onPressed, onChange, etc.

        if (eventPattern.test(eventName)) {
          // Extract handler from property value
          const handler = this.extractEventHandler(prop.value, stateClassName);

          if (handler) {
            handlers.push({
              event: eventName,
              handler: handler,
              location: prop.location,
              component: this.getComponentNameFromContext(expr),
            });
          }
        }

        // Also search nested values
        this.findEventHandlersInExpression(prop.value, handlers, stateClassName);
      });
    }

    // Check call expressions (widget calls)
    if (expr.type === 'CallExpression' && expr.args) {
      expr.args.forEach((arg) => {
        this.findEventHandlersInExpression(arg, handlers, stateClassName);
      });
    }

    // Check new expressions
    if (expr.type === 'NewExpression' && expr.args) {
      expr.args.forEach((arg) => {
        this.findEventHandlersInExpression(arg, handlers, stateClassName);
      });
    }
  }

  /**
   * Get property key from object property
   */
  getPropertyKey(keyExpr) {
    if (!keyExpr) return null;

    if (keyExpr.type === 'Identifier') {
      return keyExpr.name;
    }

    if (keyExpr.type === 'Literal') {
      return String(keyExpr.value);
    }

    return null;
  }

  /**
   * Extract handler reference from property value
   * Can be: () => handler(), handler, () => { ... }
   */
  extractEventHandler(value, stateClassName) {
    if (!value) return null;

    // Arrow function: () => handler()
    if (value.type === 'ArrowFunctionExpression') {
      if (value.body.type === 'CallExpression') {
        const handlerName = this.getClassNameFromExpression(value.body.callee);
        return handlerName;
      }

      // Check if body is identifier: () => handler
      if (value.body.type === 'Identifier') {
        return value.body.name;
      }
    }

    // Direct identifier: handler
    if (value.type === 'Identifier') {
      return value.name;
    }

    // Member expression: this.handler
    if (value.type === 'MemberExpression') {
      if (value.property.type === 'Identifier') {
        return value.property.name;
      }
    }

    return null;
  }

  /**
   * Get component name (for context, since we don't have full widget info here)
   */
  getComponentNameFromContext(expr) {
    // This is simplified - in a real scenario you'd track which widget
    // contains this object literal
    if (expr.type === 'CallExpression' && expr.callee) {
      return this.getClassNameFromExpression(expr.callee);
    }

    return 'Unknown';
  }

  /**
   * Phase 6: Build state dependency graph
   * 
   * Maps:
   * - stateToMethods: which methods use which state
   * - methodToState: which state each method uses
   * - eventToState: which state each event updates
   */
  buildDependencyGraph() {
    this.dependencyGraph = new DependencyGraph();

    // State to methods
    this.stateFields.forEach((field, key) => {
      const methods = this.findMethodsUsingField(field.name);
      if (methods.length > 0) {
        this.dependencyGraph.stateToMethods.set(field.name, methods);
      }
    });

    // Methods to state
    this.stateClasses.forEach(({ metadata }) => {
      metadata.stateFields.forEach((field) => {
        const methodsUsing = this.findMethodsReadingField(metadata.name, field.name);
        if (methodsUsing.length > 0) {
          this.dependencyGraph.methodToState.set(field.name, methodsUsing);
        }
      });
    });

    // Event to state
    this.eventHandlers.forEach((event) => {
      const stateChanged = this.findStateChangedByMethod(event.handler);
      if (stateChanged.length > 0) {
        this.dependencyGraph.eventToState.set(event.event, stateChanged);
      }
    });
  }

  /**
   * Find methods that use a state field
   */
  findMethodsUsingField(fieldName) {
    const methods = new Set();

    this.setStateCalls.forEach((call) => {
      if (call.updates.includes(fieldName)) {
        methods.add(call.method);
      }
    });

    // Also check if field is used in build (for reading)
    this.stateClasses.forEach(({ astNode, metadata }) => {
      if (!astNode.body || !astNode.body.methods) return;

      const buildMethod = astNode.body.methods.find((m) => m.key.name === 'build');
      if (buildMethod && this.methodUsesField(buildMethod, fieldName)) {
        methods.add('build');
      }
    });

    return Array.from(methods);
  }

  /**
   * Check if method uses a field
   */
  methodUsesField(method, fieldName) {
    if (!method.body) return false;

    const stmts = method.body.type === 'BlockStatement'
      ? method.body.body
      : [method.body];

    for (const stmt of stmts) {
      if (this.statementUsesField(stmt, fieldName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if statement contains field reference
   */
  statementUsesField(stmt, fieldName) {
    if (!stmt) return false;

    // Simple search for this._fieldName pattern
    const code = JSON.stringify(stmt);
    return code.includes(fieldName);
  }

  /**
   * Find methods that are triggered by reading state
   */
  findMethodsReadingField(stateClassName, fieldName) {
    const methods = [];

    this.stateClasses.forEach(({ metadata }) => {
      if (metadata.name !== stateClassName) return;

      metadata.stateFields.forEach((field) => {
        if (field.name === fieldName) {
          methods.push(...field.usedInMethods);
        }
      });
    });

    return methods;
  }

  /**
   * Find state changed by a method
   */
  findStateChangedByMethod(methodName) {
    const changed = new Set();

    this.setStateCalls.forEach((call) => {
      if (call.method === methodName) {
        call.updates.forEach((update) => changed.add(update));
      }
    });

    return Array.from(changed);
  }

  /**
   * Phase 7: Validate all state patterns
   */
  validateState() {
    this.validateSetStatePatterns();
    this.validateStateFieldUsage();
    this.validateLifecyclePatterns();
    this.validateEventHandlers();
  }

  /**
   * Validate setState usage patterns
   */
  validateSetStatePatterns() {
    this.setStateCalls.forEach((call) => {
      const issues = [];

      // Check if called from valid context (State class method)
      const stateClass = this.stateClasses.get(call.stateClassName);
      if (!stateClass) {
        issues.push({
          type: 'invalid-context',
          message: `setState called outside of ${call.stateClassName}`,
        });
      }

      // Check if updates valid fields
      if (call.updates.length === 0) {
        issues.push({
          type: 'empty-update',
          message: 'setState called with no state updates',
          severity: 'warning',
        });
      }

      call.updates.forEach((field) => {
        if (!this.stateFields.has(`${call.stateClassName}.${field}`)) {
          issues.push({
            type: 'unknown-field',
            message: `setState updates unknown field "${field}"`,
            field,
          });
        }
      });

      // Record validation
      call.isValid = issues.length === 0;
      call.issues = issues;
    });
  }

  /**
   * Validate state field usage
   */
  validateStateFieldUsage() {
    this.stateFields.forEach((field, key) => {
      const parts = key.split('.');
      const stateClassName = parts[0];
      const fieldName = parts[1];

      // Check if field is used
      if (!this.fieldIsUsed(fieldName, stateClassName)) {
        this.validationResults.push({
          type: 'unused-state-field',
          severity: 'warning',
          field: fieldName,
          location: field.location,
          message: `State field "${fieldName}" is defined but never used`,
          suggestion: 'Remove unused field or implement its usage',
        });
      }

      // Check if field is mutated outside setState
      const mutationsOutsideSetState = this.findMutationsOutsideSetState(
        fieldName,
        stateClassName
      );
      if (mutationsOutsideSetState.length > 0) {
        this.validationResults.push({
          type: 'mutation-outside-setstate',
          severity: 'error',
          field: fieldName,
          locations: mutationsOutsideSetState,
          message: `State field "${fieldName}" is mutated outside setState()`,
          suggestion: 'Always use setState() to update state fields',
        });
      }
    });
  }

  /**
   * Check if field is used anywhere
   */
  fieldIsUsed(fieldName, stateClassName) {
    // Check if read in build
    const stateClass = this.stateClasses.get(stateClassName);
    if (!stateClass) return false;

    const buildMethod = stateClass.astNode.body.methods.find(
      (m) => m.key.name === 'build'
    );

    if (buildMethod && this.methodUsesField(buildMethod, fieldName)) {
      return true;
    }

    // Check if modified in setState
    return this.setStateCalls.some((call) => call.updates.includes(fieldName));
  }

  /**
   * Find mutations outside setState
   */
  findMutationsOutsideSetState(fieldName, stateClassName) {
    const locations = [];
    const inSetState = new Set();

    // Collect all fields modified in setState
    this.setStateCalls.forEach((call) => {
      call.updates.forEach((field) => {
        inSetState.add(field);
      });
    });

    // If field is only in setState, it's good
    if (!inSetState.has(fieldName)) {
      return locations;
    }

    // For now, we assume mutations are only through setState
    // In a full implementation, you'd scan all methods for direct assignments
    return locations;
  }

  /**
   * Validate lifecycle patterns
   */
  validateLifecyclePatterns() {
    this.stateClasses.forEach(({ metadata }) => {
      const methodMap = {};

      metadata.lifecycleMethods.forEach((method) => {
        methodMap[method.name] = method;
      });

      // dispose should call super.dispose
      if (methodMap.dispose && !methodMap.dispose.callsSuper) {
        this.validationResults.push({
          type: 'lifecycle-issue',
          severity: 'error',
          method: 'dispose',
          location: methodMap.dispose.location,
          message: 'dispose() should call super.dispose()',
          suggestion: 'Add super.dispose() call at the end of dispose()',
        });
      }

      // initState should call super.initState
      if (methodMap.initState && !methodMap.initState.callsSuper) {
        this.validationResults.push({
          type: 'lifecycle-issue',
          severity: 'warning',
          method: 'initState',
          location: methodMap.initState.location,
          message: 'initState() should call super.initState()',
          suggestion: 'Add super.initState() call',
        });
      }
    });
  }

  /**
   * Validate event handlers
   */
  validateEventHandlers() {
    this.eventHandlers.forEach((handler) => {
      // Check if handler method exists
      const handlerExists = this.stateClasses.values().some((sc) => {
        return sc.metadata.stateFields.some((f) => f.name === handler.handler) ||
          sc.astNode.body.methods.some((m) => m.key.name === handler.handler);
      });

      if (!handlerExists && handler.handler) {
        this.validationResults.push({
          type: 'missing-handler',
          severity: 'error',
          handler: handler.handler,
          event: handler.event,
          location: handler.location,
          message: `Event handler "${handler.handler}" not found`,
          suggestion: `Create a method called ${handler.handler} in the State class`,
        });
      }
    });
  }

  /**
   * Get final results
   */
  getResults() {
    return {
      stateClasses: Array.from(this.stateClasses.entries()).map(([name, data]) => ({
        name,
        metadata: data.metadata,
      })),
      stateFields: Array.from(this.stateFields.values()),
      setStateCalls: this.setStateCalls,
      lifecycleMethods: this.lifecycleMethods,
      eventHandlers: this.eventHandlers,
      dependencyGraph: this.dependencyGraph,
      validationResults: this.validationResults,
      errors: this.errors,
    };
  }
}

// ============================================================================
// DATA CLASSES
// ============================================================================

class StateClassMetadata {
  constructor(name, location, linkedStatefulWidget) {
    this.name = name;
    this.location = location;
    this.linkedStatefulWidget = linkedStatefulWidget;
    this.stateFields = [];
    this.lifecycleMethods = [];
    this.methods = [];
  }
}

class StateField {
  constructor(name, type, initialValue, location) {
    this.name = name;
    this.type = type;
    this.initialValue = initialValue;
    this.location = location;
    this.isMutable = true;
    this.mutations = [];
    this.usedInMethods = [];
    this.usedInBuild = false;
  }
}

class LifecycleMethod {
  constructor(name, location, params, callsSuper, hasSideEffects) {
    this.name = name;
    this.location = location;
    this.params = params;
    this.callsSuper = callsSuper;
    this.hasSideEffects = hasSideEffects;
  }
}

class StateUpdateCall {
  constructor(location, method, updates, stateClassName) {
    this.location = location;
    this.method = method;
    this.updates = updates || [];
    this.stateClassName = stateClassName;
    this.isValid = true;
    this.issues = [];
  }
}

class DependencyGraph {
  constructor() {
    this.stateToMethods = new Map();
    this.methodToState = new Map();
    this.eventToState = new Map();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  StateAnalyzer,
  StateClassMetadata,
  StateField,
  LifecycleMethod,
  StateUpdateCall,
  DependencyGraph,
};