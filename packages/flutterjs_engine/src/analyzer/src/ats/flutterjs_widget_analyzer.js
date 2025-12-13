/**
 * FlutterJS Widget Analyzer
 * Phase 1.3 MVP Implementation
 * 
 * Extracts widget metadata from AST and builds widget hierarchy
 */

// ============================================================================
// WIDGET CLASSES
// ============================================================================

class Widget {
  constructor(name, type, location) {
    this.name = name;
    this.type = type; // 'stateless', 'stateful', 'state', 'functional', 'component'
    this.location = location;
    this.superClass = null;
    this.constructor = null;
    this.properties = [];
    this.methods = [];
    this.imports = [];
    this.children = [];
  }
}

class WidgetNode {
  constructor(widget, depth = 0) {
    this.widget = widget;
    this.depth = depth;
    this.children = [];
    this.parent = null;
  }

  addChild(childNode) {
    childNode.parent = this;
    this.children.push(childNode);
  }
}

class Dependency {
  constructor(source, items = []) {
    this.source = source;
    this.items = items;
  }
}

// ============================================================================
// WIDGET ANALYZER CLASS
// ============================================================================

class WidgetAnalyzer {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.options = {
      strict: false,
      ...options,
    };

    this.widgets = new Map();
    this.functions = new Map();
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
    if (!this.ast || !this.ast.body) {
      throw new Error('Invalid AST provided');
    }

    // Phase 1: Extract all classes and functions
    this.extractClassesAndFunctions();

    // Phase 2: Detect which classes are widgets
    this.detectWidgets();

    // Phase 3: Extract imports and dependencies
    this.extractImports();

    // Phase 4: Find entry point
    this.findEntryPoint();

    // Phase 5: Build widget tree
    this.buildWidgetTree();

    return {
      widgets: Array.from(this.widgets.values()),
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
   * Phase 1: Extract all classes and functions from AST
   */
  extractClassesAndFunctions() {
    this.ast.body.forEach((node) => {
      if (node.type === 'ClassDeclaration') {
        this.extractClassDeclaration(node);
      } else if (node.type === 'FunctionDeclaration') {
        this.extractFunctionDeclaration(node);
      }
    });
  }

  /**
   * Extract class declaration
   */
  extractClassDeclaration(classNode) {
    const name = classNode.id.name;
    const superClass = classNode.superClass ? classNode.superClass.name : null;
    const location = classNode.location;

    const widget = new Widget(name, 'class', location);
    widget.superClass = superClass;

    // Extract constructor
    if (classNode.body && classNode.body.methods) {
      const constructorMethod = classNode.body.methods.find(
        (m) => m.key.name === 'constructor'
      );
      if (constructorMethod) {
        widget.constructor = this.extractMethodInfo(constructorMethod);
      }

      // Extract other methods
      classNode.body.methods.forEach((method) => {
        if (method.key.name !== 'constructor') {
          widget.methods.push(this.extractMethodInfo(method));
        }
      });
    }

    // Extract fields
    if (classNode.body && classNode.body.fields) {
      classNode.body.fields.forEach((field) => {
        widget.properties.push({
          name: field.key.name,
          initialValue: field.initialValue ? this.expressionToString(field.initialValue) : null,
        });
      });
    }

    this.widgets.set(name, widget);
  }

  /**
   * Extract function declaration
   */
  extractFunctionDeclaration(funcNode) {
    const name = funcNode.id ? funcNode.id.name : 'anonymous';
    const location = funcNode.location;

    const func = {
      name,
      type: 'function',
      location,
      params: funcNode.params.map((p) => ({
        name: p.name ? p.name.name : 'param',
        optional: p.optional,
      })),
      isAsync: funcNode.isAsync,
      isEntryPoint: false,
    };

    this.functions.set(name, func);
  }

  /**
   * Extract method information
   */
  extractMethodInfo(method) {
    return {
      name: method.key.name,
      params: method.params.map((p) => ({
        name: p.name ? p.name.name : 'param',
        optional: p.optional,
      })),
      location: method.location,
      hasBody: method.body !== null,
    };
  }

  /**
   * Phase 2: Detect which classes are widgets
   */
  detectWidgets() {
    this.widgets.forEach((widget) => {
      if (!widget.superClass) return;

      const superClass = widget.superClass;

      // Detect stateless widget
      if (superClass === 'StatelessWidget') {
        widget.type = 'stateless';
      }
      // Detect stateful widget
      else if (superClass === 'StatefulWidget') {
        widget.type = 'stateful';
      }
      // Detect state class
      else if (superClass.startsWith('State')) {
        widget.type = 'state';
      }
      // Unknown widget type
      else {
        widget.type = 'component';
      }
    });
  }

  /**
   * Phase 3: Extract imports and external dependencies
   */
  extractImports() {
    this.ast.body.forEach((node) => {
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value;
        const items = node.specifiers.map((spec) => spec.imported.name);

        this.imports.push(new Dependency(source, items));
        this.externalDependencies.add(source);
      }
    });
  }

  /**
   * Phase 4: Find entry point (main function, runApp call)
   */
  findEntryPoint() {
    // Look for main() function
    if (this.functions.has('main')) {
      this.entryPoint = 'main';
      this.functions.get('main').isEntryPoint = true;

      // Find what widget is passed to runApp
      const mainFunc = this.ast.body.find(
        (n) => n.type === 'FunctionDeclaration' && n.id.name === 'main'
      );

      if (mainFunc && mainFunc.body && mainFunc.body.body) {
        const runAppCall = this.findRunAppCall(mainFunc.body.body);
        if (runAppCall) {
          this.rootWidget = runAppCall;
        }
      }
    }
  }

  /**
   * Find runApp() call in statements
   */
  findRunAppCall(statements) {
    for (const stmt of statements) {
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        return this.extractWidgetFromExpression(stmt.argument);
      } else if (stmt.type === 'ExpressionStatement' && stmt.expression) {
        const expr = stmt.expression;
        if (expr.type === 'CallExpression' && expr.callee.name === 'runApp') {
          if (expr.args && expr.args.length > 0) {
            return this.extractWidgetFromExpression(expr.args[0]);
          }
        }
      }
    }
    return null;
  }

  /**
   * Extract widget name from expression
   */
  extractWidgetFromExpression(expr) {
    if (!expr) return null;

    // new ClassName()
    if (expr.type === 'NewExpression') {
      return expr.callee.name;
    }

    // ClassName (function call)
    if (expr.type === 'CallExpression') {
      if (expr.callee && expr.callee.name) {
        return expr.callee.name;
      }
    }

    // Identifier
    if (expr.type === 'Identifier') {
      return expr.name;
    }

    return null;
  }

  /**
   * Phase 5: Build widget tree from widget hierarchy
   */
  buildWidgetTree() {
    if (!this.rootWidget) return null;

    const rootWidget = this.widgets.get(this.rootWidget);
    if (!rootWidget) return null;

    this.widgetTree = new WidgetNode(rootWidget, 0);
    this.traverseWidgetTree(this.widgetTree, rootWidget);
  }

  /**
   * Traverse and build widget tree
   */
  traverseWidgetTree(node, widget) {
    // Find the build method
    const buildMethod = widget.methods.find((m) => m.name === 'build');
    if (!buildMethod) return;

    // Find build method in AST
    const widgetNode = this.ast.body.find(
      (n) => n.type === 'ClassDeclaration' && n.id.name === widget.name
    );

    if (widgetNode && widgetNode.body && widgetNode.body.methods) {
      const buildMethodNode = widgetNode.body.methods.find(
        (m) => m.key.name === 'build'
      );

      if (buildMethodNode && buildMethodNode.body) {
        if (buildMethodNode.body.type === 'BlockStatement') {
          // Extract widgets from return statements
          const childWidgets = this.extractChildWidgets(buildMethodNode.body.body);
          childWidgets.forEach((childName) => {
            if (childName) {
              const childWidget = this.widgets.get(childName) || {
                name: childName,
                type: 'component',
                location: null,
              };

              const childNode = new WidgetNode(childWidget, node.depth + 1);
              node.addChild(childNode);

              // Recursively traverse if it's a known widget
              if (this.widgets.has(childName)) {
                this.traverseWidgetTree(childNode, childWidget);
              }
            }
          });
        }
      }
    }
  }

  /**
   * Extract child widget names from statements
   */
  extractChildWidgets(statements) {
    const children = [];

    for (const stmt of statements) {
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        children.push(this.extractWidgetFromExpression(stmt.argument));

        // Also extract nested widgets from arguments
        const nested = this.extractNestedWidgets(stmt.argument);
        children.push(...nested);
      }
    }

    return children.filter((c) => c !== null);
  }

  /**
   * Extract nested widgets from call arguments
   */
  extractNestedWidgets(expr) {
    const widgets = [];

    if (!expr) return widgets;

    // CallExpression: Widget({ child: new OtherWidget() })
    if (expr.type === 'CallExpression' && expr.args) {
      expr.args.forEach((arg) => {
        if (arg.type === 'ObjectLiteral' && arg.properties) {
          arg.properties.forEach((prop) => {
            const widgetName = this.extractWidgetFromExpression(prop.value);
            if (widgetName) {
              widgets.push(widgetName);
            }
            // Recursively check nested widgets
            widgets.push(...this.extractNestedWidgets(prop.value));
          });
        }
      });
    }

    // NewExpression: new Widget({ ... })
    if (expr.type === 'NewExpression' && expr.args) {
      expr.args.forEach((arg) => {
        if (arg.type === 'ObjectLiteral' && arg.properties) {
          arg.properties.forEach((prop) => {
            const widgetName = this.extractWidgetFromExpression(prop.value);
            if (widgetName) {
              widgets.push(widgetName);
            }
            widgets.push(...this.extractNestedWidgets(prop.value));
          });
        }
      });
    }

    // ObjectLiteral
    if (expr.type === 'ObjectLiteral' && expr.properties) {
      expr.properties.forEach((prop) => {
        const widgetName = this.extractWidgetFromExpression(prop.value);
        if (widgetName) {
          widgets.push(widgetName);
        }
        widgets.push(...this.extractNestedWidgets(prop.value));
      });
    }

    return widgets;
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
      return expr.name;
    }

    if (expr.type === 'CallExpression') {
      return `${expr.callee.name}()`;
    }

    if (expr.type === 'NewExpression') {
      return `new ${expr.callee.name}()`;
    }

    return String(expr);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const statelessCount = Array.from(this.widgets.values()).filter(
      (w) => w.type === 'stateless'
    ).length;
    const statefulCount = Array.from(this.widgets.values()).filter(
      (w) => w.type === 'stateful'
    ).length;
    const componentCount = Array.from(this.widgets.values()).filter(
      (w) => w.type === 'component'
    ).length;

    return {
      totalWidgets: this.widgets.size,
      statelessWidgets: statelessCount,
      statefulWidgets: statefulCount,
      componentWidgets: componentCount,
      totalFunctions: this.functions.size,
      totalImports: this.imports.length,
      externalPackages: this.externalDependencies.size,
      entryPoint: this.entryPoint,
      rootWidget: this.rootWidget,
      widgetTreeDepth: this.widgetTree ? this.getTreeDepth(this.widgetTree) : 0,
    };
  }

  /**
   * Get tree depth
   */
  getTreeDepth(node) {
    if (!node.children || node.children.length === 0) {
      return 1;
    }
    return 1 + Math.max(...node.children.map((child) => this.getTreeDepth(child)));
  }

  /**
   * Pretty print widget tree
   */
  printWidgetTree(node = null, indent = 0) {
    if (!node) {
      node = this.widgetTree;
    }

    if (!node) {
      console.log('No widget tree available');
      return;
    }

    const prefix = '  '.repeat(indent);
    const widget = node.widget;
    const typeLabel = widget.type ? `[${widget.type}]` : '';

    console.log(`${prefix}${widget.name} ${typeLabel}`);

    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        this.printWidgetTree(child, indent + 1);
      });
    }
  }

  /**
   * Convert tree to object
   */
  treeToObject(node = null) {
    if (!node) {
      node = this.widgetTree;
    }

    if (!node) {
      return null;
    }

    return {
      name: node.widget.name,
      type: node.widget.type,
      children: node.children.map((child) => this.treeToObject(child)),
    };
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.errors;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  WidgetAnalyzer,
  Widget,
  WidgetNode,
  Dependency,
};
