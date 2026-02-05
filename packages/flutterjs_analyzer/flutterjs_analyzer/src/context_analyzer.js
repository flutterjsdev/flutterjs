// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS Context Analyzer - Phase 3
 * Detects InheritedWidget, Provider, BuildContext usage patterns
 * Analyzes context flow and SSR compatibility
 * 
 * Phase 3 focuses on: Context detection, Provider patterns, SSR analysis
 * Does NOT implement actual context providers (that's Phase 4+)
 */
import { getLogger } from './flutterjs_logger.js';

import {  InheritedWidgetMetadata,
  ChangeNotifierAnalysis,
  ProviderAnalysis,
  ContextUsagePattern, } from  './context_analyzer_data.js';
class ContextAnalyzer {
  constructor(ast, widgets = [], options = {}) {
    this.ast = ast;
    this.widgets = widgets;
     this.logger = getLogger().createComponentLogger('ContextAnalyzer');
    this.options = {
      strict: false,
      ...options,
    };

    // Results storage
    this.inheritedWidgets = new Map();     // name -> InheritedWidgetMetadata
    this.changeNotifiers = new Map();      // name -> ChangeNotifierAnalysis
    this.providers = new Map();            // type -> ProviderAnalysis
    this.contextAccessPoints = [];         // All places context is used
    this.inheritedWidgetGraph = {};        // Inheritance relationships
    this.providerGraph = {};               // Provider relationships
    this.errors = [];
  }

  /**
   * Main entry point - analyze context patterns
   */
  analyze() {
      this.logger.startSession('ContextAnalysis');
    this.logger.trace('[ContextAnalyzer] Starting analysis...\n');
      this.logger.startSession('WidgetAnalyzer');
     this.logger.trace('[ContextAnalyzer] Starting analysis...\n');

    try {
      // Phase 1: Detect InheritedWidget classes
      this.detectInheritedWidgets();
       this.logger.trace(`[ContextAnalyzer] Found ${this.inheritedWidgets.size} InheritedWidgets\n`);

      // Phase 2: Detect ChangeNotifier classes
      this.detectChangeNotifiers();
       this.logger.trace(`[ContextAnalyzer] Found ${this.changeNotifiers.size} ChangeNotifiers\n`);

      // Phase 3: Detect Provider patterns
      this.detectProviders();
       this.logger.trace(`[ContextAnalyzer] Found ${this.providers.size} Providers\n`);

      // Phase 4: Find context access points
      this.findContextAccessPoints();
       this.logger.trace(`[ContextAnalyzer] Found ${this.contextAccessPoints.length} context usage points\n`);

      // Phase 5: Build graphs
      this.buildInheritedWidgetGraph();
      this.buildProviderGraph();
       this.logger.trace('[ContextAnalyzer] Built dependency graphs\n');

      return this.getResults();
    } catch (error) {
      this.errors.push(error);
      console.error('[ContextAnalyzer] Error:', error.message);
      return this.getResults();
    }
  }

  /**
   * Phase 1: Detect InheritedWidget classes
   * 
   * Looks for:
   * - class MyProvider extends InheritedWidget
   * - Properties: data, child
   * - Methods: of(), updateShouldNotify()
   */
  detectInheritedWidgets() {
    if (!this.ast || !this.ast.body) return;

    this.ast.body.forEach((node) => {
      if (node.type !== 'ClassDeclaration') return;

      const className = node.id?.name;
      const superClass = node.superClass?.name;

      // Check if extends InheritedWidget
      if (!superClass || !superClass.includes('InheritedWidget')) return;

       this.logger.trace(`[ContextAnalyzer.detectInheritedWidgets] Found: ${className}`);

      const metadata = new InheritedWidgetMetadata(
        className,
        node.location,
        superClass
      );

      // Extract properties
      if (node.body?.fields) {
        node.body.fields.forEach((field) => {
          const fieldName = field.key?.name;
          metadata.properties.push({
            name: fieldName,
            type: this.inferType(field.initialValue),
            required: !this.hasDefaultValue(field),
          });
        });
      }

      // Extract static accessors (of() method)
      if (node.body?.methods) {
        node.body.methods.forEach((method) => {
          const methodName = method.key?.name;

          // Check for static accessor pattern
          if (methodName === 'of' && this.isStaticAccessor(method)) {
            metadata.staticAccessors.push({
              name: methodName,
              signature: `static ${methodName}(BuildContext context)`,
              usesInheritedWidgetLookup: this.checksInheritedWidgetLookup(method),
              location: method.location,
            });
          }

          // Check for updateShouldNotify
          if (methodName === 'updateShouldNotify') {
            metadata.updateShouldNotifyImplemented = true;
          }
        });
      }

      this.inheritedWidgets.set(className, metadata);
    });
  }

  /**
   * Check if method is static (phase 3 simplified - assumes 'of' is usually static)
   */
  isStaticAccessor(method) {
    // In a real implementation, check for @static decorator or static keyword
    return method.key?.name === 'of';
  }

  /**
   * Check if method body contains dependOnInheritedWidgetOfExactType call
   */
  checksInheritedWidgetLookup(method) {
    if (!method.body) return false;

    const code = JSON.stringify(method.body);
    return code.includes('dependOnInheritedWidgetOfExactType') ||
           code.includes('inheritedWidgetOfExactType');
  }

  /**
   * Phase 2: Detect ChangeNotifier classes
   * 
   * Looks for:
   * - class MyNotifier extends ChangeNotifier
   * - Methods that call notifyListeners()
   * - Properties that get/set
   */
  detectChangeNotifiers() {
    if (!this.ast || !this.ast.body) return;

    this.ast.body.forEach((node) => {
      if (node.type !== 'ClassDeclaration') return;

      const className = node.id?.name;
      const superClass = node.superClass?.name;

      // Check if extends ChangeNotifier
      if (!superClass || superClass !== 'ChangeNotifier') return;

       this.logger.trace(`[ContextAnalyzer.detectChangeNotifiers] Found: ${className}`);

      const analysis = new ChangeNotifierAnalysis(
        className,
        node.location
      );

      // Extract properties
      if (node.body?.fields) {
        node.body.fields.forEach((field) => {
          const fieldName = field.key?.name;
          analysis.properties.push({
            name: fieldName,
            type: this.inferType(field.initialValue),
            initialValue: this.expressionToString(field.initialValue),
          });
        });
      }

      // Extract getters, methods, and notifyListeners calls
      if (node.body?.methods) {
        node.body.methods.forEach((method) => {
          const methodName = method.key?.name;

          // Check for getter pattern (get count => _count)
          if (methodName && !method.params?.length && method.body) {
            const isGetter = JSON.stringify(method).includes('return');
            if (isGetter) {
              analysis.getters.push({
                name: methodName,
                returnType: this.inferReturnType(method.body),
                location: method.location,
              });
            }
          }

          // Check for notifyListeners call
          const callsNotify = this.callsNotifyListeners(method.body);
          if (callsNotify || methodName === 'increment' || methodName === 'decrement') {
            const mutations = this.extractMutationsInMethod(method.body);
            analysis.methods.push({
              name: methodName,
              callsNotifyListeners: callsNotify,
              location: method.location,
              mutations: mutations,
            });
          }
        });
      }

      this.changeNotifiers.set(className, analysis);
    });
  }

  /**
   * Check if method calls notifyListeners()
   */
  callsNotifyListeners(body) {
    if (!body) return false;
    const code = JSON.stringify(body);
    return code.includes('notifyListeners');
  }

  /**
   * Extract field mutations in method (this._field = x, this._field++, etc.)
   */
  extractMutationsInMethod(body) {
    const mutations = [];
    if (!body) return mutations;

    const code = JSON.stringify(body);
    
    // Simple pattern matching for mutations
    const patterns = [
      /this\._(\w+)\s*[=+\-*]/g,  // this._field = or +=, -=, etc.
      /this\.(\w+)\s*[=+\-*]/g,   // this.field = or +=, -=, etc.
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        mutations.push(match[1]);
      }
    });

    return [...new Set(mutations)]; // Remove duplicates
  }

  /**
   * Phase 3: Detect Provider<T> patterns
   * 
   * Looks for:
   * - Provider<CounterNotifier>(create: ..., child: ...)
   * - Detects consumer patterns: context.watch(), context.read()
   */
  detectProviders() {
    if (!this.ast || !this.ast.body) return;

    this.ast.body.forEach((node) => {
      if (node.type === 'ClassDeclaration') {
        // Check if class contains Provider creation in build()
        const buildMethod = node.body?.methods?.find((m) => m.key?.name === 'build');
        if (buildMethod) {
          this.findProvidersInMethod(buildMethod, node);
        }
      }

      // Also check in function bodies
      if (node.type === 'FunctionDeclaration') {
        this.findProvidersInMethod(node, null);
      }
    });
  }

  /**
   * Find Provider instantiations in a method
   */
  findProvidersInMethod(method, classNode) {
    if (!method.body) return;

    const body = method.body.type === 'BlockStatement' ? method.body.body : [method.body];

    body.forEach((stmt) => {
      this.findProvidersInStatement(stmt);
    });
  }

  /**
   * Recursively find Provider patterns in statements
   */
  findProvidersInStatement(stmt) {
    if (!stmt) return;

    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      this.findProvidersInExpression(stmt.expression);
    }

    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      this.findProvidersInExpression(stmt.argument);
    }

    if (stmt.type === 'BlockStatement' && stmt.body) {
      stmt.body.forEach((s) => this.findProvidersInStatement(s));
    }
  }

  /**
   * Find Provider patterns in expressions
   * Looks for: new Provider<CounterNotifier>(...)
   */
  findProvidersInExpression(expr) {
    if (!expr) return;

    // Check for NewExpression: new Provider<T>(...)
    if (expr.type === 'NewExpression') {
      const calleeName = expr.callee?.name;

      if (calleeName === 'Provider' || calleeName?.startsWith('Provider')) {
        // Extract generic type: Provider<CounterNotifier>
        const genericType = this.extractGenericType(expr);

        if (genericType) {
           this.logger.trace(`[ContextAnalyzer.detectProviders] Found Provider<${genericType}>`);

          const analysis = new ProviderAnalysis(
            `Provider<${genericType}>`,
            expr.location,
            genericType
          );

          // Extract create function
          if (expr.args) {
            expr.args.forEach((arg) => {
              if (arg.type === 'ObjectLiteral') {
                arg.properties?.forEach((prop) => {
                  if (prop.key?.name === 'create') {
                    analysis.createFunction = this.expressionToString(prop.value);
                  }
                  if (prop.key?.name === 'child') {
                    // Child widget - may use this provider
                  }
                });
              }
            });
          }

          // Identify access patterns (watch, read, select)
          this.identifyAccessPatterns(genericType, analysis);

          this.providers.set(`Provider<${genericType}>`, analysis);
        }
      }
    }

    // Check call expressions
    if (expr.type === 'CallExpression' && expr.args) {
      expr.args.forEach((arg) => {
        this.findProvidersInExpression(arg);
      });
    }

    // Check object literals
    if (expr.type === 'ObjectLiteral' && expr.properties) {
      expr.properties.forEach((prop) => {
        this.findProvidersInExpression(prop.value);
      });
    }
  }

  /**
   * Extract generic type from Provider<T>
   * In simplified version, returns T or null
   */
  extractGenericType(expr) {
    // In real implementation, parse the full generic syntax
    // For now, look for the callee name pattern
    const code = JSON.stringify(expr.callee);

    // Simple heuristic: if it mentions Provider and contains type info
    if (code.includes('Provider')) {
      // Try to find type in expression string representation
      const exprStr = this.expressionToString(expr.callee);
      const match = exprStr.match(/Provider<(\w+)>/);
      return match ? match[1] : null;
    }

    return null;
  }

  /**
   * Identify how this provider is consumed
   */
  identifyAccessPatterns(providerType, analysis) {
    if (!this.ast || !this.ast.body) return;

    // Search for context.watch(), context.read(), context.select()
    this.ast.body.forEach((node) => {
      if (node.type === 'ClassDeclaration') {
        const buildMethod = node.body?.methods?.find((m) => m.key?.name === 'build');
        if (buildMethod) {
          this.scanForAccessPatterns(buildMethod, providerType, analysis);
        }
      }
    });
  }

  /**
   * Scan method for watch/read/select patterns
   */
  scanForAccessPatterns(method, providerType, analysis) {
    if (!method.body) return;

    const code = JSON.stringify(method.body);

    // Check for access patterns
    if (code.includes('context.watch')) {
      analysis.accessPatterns.push('watch');
    }
    if (code.includes('context.read')) {
      analysis.accessPatterns.push('read');
    }
    if (code.includes('context.select')) {
      analysis.accessPatterns.push('select');
    }

    // Find consumer widgets
    if (code.includes('Consumer')) {
      analysis.accessPatterns.push('Consumer');
    }
  }

  /**
   * Phase 4: Find all context access points
   * 
   * Maps:
   * - Which widgets use context
   * - How they access it (context.theme(), context.mediaQuery(), etc.)
   * - SSR compatibility
   */
  findContextAccessPoints() {
    if (!this.ast || !this.ast.body) return;

    this.ast.body.forEach((node) => {
      if (node.type !== 'ClassDeclaration') return;

      const className = node.id?.name;
      const buildMethod = node.body?.methods?.find((m) => m.key?.name === 'build');

      if (buildMethod) {
        const usagePoints = this.extractContextUsageInMethod(buildMethod, className);
        this.contextAccessPoints.push(...usagePoints);
      }
    });
  }

  /**
   * Extract all context.X() calls in a method
   */
  extractContextUsageInMethod(method, className) {
    const usages = [];

    if (!method.body) return usages;

    const stmts = method.body.type === 'BlockStatement' ? method.body.body : [method.body];

    stmts.forEach((stmt) => {
      const foundUsages = this.findContextUsageInStatement(stmt, className);
      usages.push(...foundUsages);
    });

    return usages;
  }

  /**
   * Recursively find context usage patterns
   */
  findContextUsageInStatement(stmt, className) {
    const usages = [];

    if (!stmt) return usages;

    if (stmt.type === 'ExpressionStatement' && stmt.expression) {
      const stmtUsages = this.findContextUsageInExpression(stmt.expression, className);
      usages.push(...stmtUsages);
    }

    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      const retUsages = this.findContextUsageInExpression(stmt.argument, className);
      usages.push(...retUsages);
    }

    if (stmt.type === 'BlockStatement' && stmt.body) {
      stmt.body.forEach((s) => {
        const blockUsages = this.findContextUsageInStatement(s, className);
        usages.push(...blockUsages);
      });
    }

    return usages;
  }

  /**
   * Find context usage in expressions
   * Looks for: Theme.of(context), context.watch(), context.read(), etc.
   */
  findContextUsageInExpression(expr, className) {
    const usages = [];

    if (!expr) return usages;

    const exprStr = JSON.stringify(expr);

    // Pattern 1: Theme.of(context)
    if (exprStr.includes('Theme.of') && exprStr.includes('context')) {
      usages.push(new ContextUsagePattern(
        'Theme.of(context)',
        'inherited-widget-lookup',
        expr.location,
        'ThemeData',
        true,
        'Pure value access, no subscription required'
      ));
    }

    // Pattern 2: context.theme()
    if (exprStr.includes('context.theme')) {
      usages.push(new ContextUsagePattern(
        'context.theme()',
        'context-service',
        expr.location,
        'ThemeData',
        true,
        'Service access during build'
      ));
    }

    // Pattern 3: context.watch<T>()
    if (exprStr.includes('context.watch')) {
      usages.push(new ContextUsagePattern(
        'context.watch<T>()',
        'provider-watch',
        expr.location,
        'T',
        false,
        'Requires reactive subscription - not SSR safe'
      ));
    }

    // Pattern 4: context.read<T>()
    if (exprStr.includes('context.read')) {
      usages.push(new ContextUsagePattern(
        'context.read<T>()',
        'provider-read',
        expr.location,
        'T',
        true,
        'Single read at render time - SSR safe'
      ));
    }

    // Pattern 5: context.mediaQuery()
    if (exprStr.includes('context.mediaQuery') || exprStr.includes('MediaQuery.of')) {
      usages.push(new ContextUsagePattern(
        'context.mediaQuery()',
        'context-service',
        expr.location,
        'MediaQueryData',
        true,
        'Read-only responsive info'
      ));
    }

    // Pattern 6: State mutations in handlers
    if (exprStr.includes('notifyListeners') || exprStr.includes('increment')) {
      usages.push(new ContextUsagePattern(
        'notifyListeners()',
        'global-state-mutation',
        expr.location,
        'void',
        false,
        'Mutations do not trigger re-render in SSR'
      ));
    }

    // Recursively search nested expressions
    if (expr.type === 'CallExpression' && expr.args) {
      expr.args.forEach((arg) => {
        const argUsages = this.findContextUsageInExpression(arg, className);
        usages.push(...argUsages);
      });
    }

    if (expr.type === 'ObjectLiteral' && expr.properties) {
      expr.properties.forEach((prop) => {
        const propUsages = this.findContextUsageInExpression(prop.value, className);
        usages.push(...propUsages);
      });
    }

    if (expr.type === 'MemberExpression') {
      const memberUsages = this.findContextUsageInExpression(expr.object, className);
      usages.push(...memberUsages);
    }

    return usages;
  }

  /**
   * Phase 5a: Build InheritedWidget graph
   * Maps provider -> consumer relationships
   */
  buildInheritedWidgetGraph() {
    this.inheritedWidgets.forEach((widget) => {
      this.inheritedWidgetGraph[widget.name] = {
        providedBy: this.findWhoProvides(widget.name),
        consumedBy: this.findWhoConsumes(widget.name),
        providedValue: widget.properties[0]?.type || 'unknown',
        flowPath: this.traceContextFlow(widget.name),
      };
    });
  }

  /**
   * Phase 5b: Build Provider graph
   * Maps provider -> consumer relationships
   */
  buildProviderGraph() {
    this.providers.forEach((provider) => {
      const key = provider.providerType;
      this.providerGraph[key] = {
        providedBy: this.findWhoCreatesProvider(provider.providerType),
        providedType: provider.valueType,
        consumedBy: this.findWhoConsumesProvider(provider.providerType),
        accessPatterns: provider.accessPatterns,
        flowPath: this.traceProviderFlow(provider.providerType),
      };
    });
  }

  /**
   * Find which widget provides this inherited widget
   */
  findWhoProvides(widgetName) {
    // Simplified: return widget name of class that instantiates it
    // In real implementation, search AST for instantiation
    return 'MyApp';
  }

  /**
   * Find which widgets consume this inherited widget
   */
  findWhoConsumes(widgetName) {
    const consumers = [];
    // Search for calls to widgetName.of()
    this.contextAccessPoints.forEach((usage) => {
      if (usage.pattern.includes(widgetName)) {
        consumers.push(usage.dependent);
      }
    });
    return consumers;
  }

  /**
   * Find where this inherited widget's context flows
   */
  traceContextFlow(widgetName) {
    // Simplified path tracing
    return `${this.findWhoProvides(widgetName)} -> ${widgetName} -> ${this.findWhoConsumes(widgetName).join(', ')}`;
  }

  /**
   * Find who creates this provider
   */
  findWhoCreatesProvider(providerType) {
    // Simplified: return app root
    return 'MyApp';
  }

  /**
   * Find who consumes this provider
   */
  findWhoConsumesProvider(providerType) {
    const consumers = [];
    this.contextAccessPoints.forEach((usage) => {
      if (usage.pattern.includes('watch') || usage.pattern.includes('read')) {
        consumers.push(usage.dependent);
      }
    });
    return consumers;
  }

  /**
   * Find provider flow path through widget tree
   */
  traceProviderFlow(providerType) {
    return `MyApp -> Provider -> MaterialApp -> [consumers]`;
  }

  /**
   * Helper: Infer type from expression
   */
  inferType(expr) {
    if (!expr) return 'any';
    if (expr.type === 'Literal') {
      const val = expr.value;
      if (typeof val === 'string') return 'string';
      if (typeof val === 'number') return 'number';
      if (typeof val === 'boolean') return 'boolean';
    }
    return 'any';
  }

  /**
   * Helper: Infer return type from method body
   */
  inferReturnType(body) {
    // Simplified
    return 'any';
  }

  /**
   * Helper: Check if field has default value
   */
  hasDefaultValue(field) {
    return field.initialValue !== null && field.initialValue !== undefined;
  }

  /**
   * Helper: Convert expression to string
   */
  expressionToString(expr) {
    if (!expr) return 'null';
    if (expr.type === 'Identifier') return expr.name;
    if (expr.type === 'Literal') return String(expr.value);
    return JSON.stringify(expr).substring(0, 50);
  }

  /**
   * Get analysis results
   */
  getResults() {
    return {
      inheritedWidgets: Array.from(this.inheritedWidgets.values()),
      changeNotifiers: Array.from(this.changeNotifiers.values()),
      providers: Array.from(this.providers.values()),
      contextAccessPoints: this.contextAccessPoints,
      inheritedWidgetGraph: this.inheritedWidgetGraph,
      providerGraph: this.providerGraph,
      errors: this.errors,
    };
  }
}

export { ContextAnalyzer };
