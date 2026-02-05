// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS Report Generator - Enhanced Phase 3 (FIXED)
 * Generates JSON, Markdown, and Console reports from analysis results
 * 
 * Integrates Phase 1 (Widget Analysis), Phase 2 (State Analysis),
 * and Phase 3 (Context + SSR Analysis)
 */

import { getLogger } from './flutterjs_logger.js';

// ============================================================================
// REPORT GENERATOR CLASS
// ============================================================================

class ReportGenerator {
  constructor(widgetResults, stateResults, contextResults = null, ssrResults = null, options = {}) {
    this.widgetResults = widgetResults;
    this.stateResults = stateResults;
    this.contextResults = contextResults;
    this.ssrResults = ssrResults;

    this.options = {
      format: 'json',
      includeMetrics: true,
      includeTree: true,
      includeValidation: true,
      includeSuggestions: true,
      includeContext: true,
      includeSsr: true,
      prettyPrint: true,
      ...options,
    };

    // Initialize logger
    this.logger = getLogger().createComponentLogger('ReportGenerator');

    this.metadata = {};
    this.report = {};
  }

  /**
   * Main entry point - generate report
   */
  generate() {
    this.logger.startSession('ReportGeneration');
    this.logger.info('Generating report');

    try {
      this.calculateMetrics();
      this.buildReport();

      let output;
      switch (this.options.format) {
        case 'json':
          output = this.toJSON();
          break;
        case 'markdown':
          output = this.toMarkdown();
          break;
        case 'console':
          output = this.toConsole();
          break;
        default:
          output = this.toJSON();
      }

      this.logger.success('Report generation complete');
      this.logger.endSession('ReportGeneration');
      return output;
    } catch (error) {
      this.logger.failure('Report generation failed', error.message);
      this.logger.endSession('ReportGeneration');
      throw error;
    }
  }

  /**
   * Calculate metrics from analysis results
   */
  calculateMetrics() {
    const widgets = this.widgetResults.widgets || [];
    const functions = this.widgetResults.functions || [];
    const imports = this.widgetResults.imports || [];
    const stateClasses = this.stateResults.stateClasses || [];
    const stateFields = this.stateResults.stateFields || [];
    const setStateCalls = this.stateResults.setStateCalls || [];
    const lifecycleMethods = this.stateResults.lifecycleMethods || [];
    const eventHandlers = this.stateResults.eventHandlers || [];

    // Phase 3: Context metrics
    const inheritedWidgets = this.contextResults?.inheritedWidgets || [];
    const changeNotifiers = this.contextResults?.changeNotifiers || [];
    const providers = this.contextResults?.providers || [];
    const contextAccessPoints = this.contextResults?.contextAccessPoints || [];

    // Phase 3: SSR metrics
    const ssrScore = this.ssrResults?.ssrCompatibilityScore || 0;
    const ssrSafePatterns = this.ssrResults?.ssrSafePatterns || [];
    const ssrUnsafePatterns = this.ssrResults?.ssrUnsafePatterns || [];
    const hydrationRequirements = this.ssrResults?.hydrationRequirements || [];

    this.metadata = {
      // Widget metrics (Phase 1)
      totalWidgets: widgets.length,
      statelessWidgets: widgets.filter((w) => w.type === 'stateless').length,
      statefulWidgets: widgets.filter((w) => w.type === 'stateful').length,
      componentWidgets: widgets.filter((w) => w.type === 'component').length,
      stateClasses: stateClasses.length,

      // State metrics (Phase 2)
      totalStateFields: stateFields.length,
      setStateCallCount: setStateCalls.length,
      lifecycleMethodCount: lifecycleMethods.length,
      eventHandlerCount: eventHandlers.length,

      // Context metrics (Phase 3)
      inheritedWidgets: inheritedWidgets.length,
      changeNotifiers: changeNotifiers.length,
      providers: providers.length,
      contextAccessPoints: contextAccessPoints.length,

      // SSR metrics (Phase 3)
      ssrCompatibilityScore: ssrScore,
      ssrCompatibility: this.ssrResults?.overallCompatibility || 'unknown',
      ssrSafePatterns: ssrSafePatterns.length,
      ssrUnsafePatterns: ssrUnsafePatterns.length,
      hydrationRequired: hydrationRequirements.length > 0,
      hydrationCount: hydrationRequirements.length,

      // Function metrics
      totalFunctions: functions.length,
      entryPoint: this.widgetResults.entryPoint,
      rootWidget: this.widgetResults.rootWidget,

      // Import metrics
      totalImports: imports.length,
      externalPackages: new Set(imports.map((imp) => imp.source)).size,

      // Widget tree metrics
      treeDepth: this.calculateTreeDepth(this.widgetResults.widgetTree),

      // Validation metrics
      errorCount: this.countValidationIssues(this.stateResults.validationResults, 'error'),
      warningCount: this.countValidationIssues(this.stateResults.validationResults, 'warning'),
      infoCount: this.countValidationIssues(this.stateResults.validationResults, 'info'),
    };

    // Calculate scores
    this.metadata.healthScore = this.calculateHealthScore();
    this.metadata.complexityScore = this.calculateComplexityScore();
  }

  /**
   * Calculate tree depth
   */
  calculateTreeDepth(node, depth = 1) {
    if (!node || !node.children || node.children.length === 0) {
      return depth;
    }
    return 1 + Math.max(...node.children.map((child) => this.calculateTreeDepth(child, depth + 1)));
  }

  /**
   * Count validation issues by severity
   */
  countValidationIssues(results, severity) {
    if (!results) return 0;
    return results.filter((r) => r.severity === severity).length;
  }

  /**
   * Calculate health score (0-100)
   */
  calculateHealthScore() {
    let score = 100;

    score -= this.metadata.errorCount * 10;
    score -= this.metadata.warningCount * 2;

    if (this.metadata.entryPoint) {
      score += 5;
    }

    if (this.metadata.statefulWidgets > this.metadata.statelessWidgets) {
      score -= 10;
    }

    if (this.metadata.treeDepth > 5) {
      score -= 5;
    }

    if (this.metadata.ssrCompatibilityScore < 50) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate complexity score (0-100)
   */
  calculateComplexityScore() {
    let score = 0;

    score += Math.min(this.metadata.totalStateFields * 10, 40);
    score += Math.min(this.metadata.setStateCallCount * 5, 30);
    score += Math.min(this.metadata.eventHandlerCount * 2, 20);

    if (this.metadata.treeDepth > 5) {
      score += 10;
    }

    score += Math.min(this.metadata.contextAccessPoints * 3, 15);

    return Math.min(100, score);
  }

  /**
   * Build comprehensive report object
   */
  buildReport() {
    const widgets = this.widgetResults.widgets || [];
    const stateClasses = this.stateResults.stateClasses || [];
    const validationResults = this.stateResults.validationResults || [];

    this.report = {
      analysis: {
        file: this.widgetResults.file || 'analysis',
        timestamp: new Date().toISOString(),
        status: validationResults.some((r) => r.severity === 'error') ? 'warning' : 'success',
        phase: 'phase1+phase2+phase3',
      },

      summary: {
        widgets: {
          total: this.metadata.totalWidgets,
          stateless: this.metadata.statelessWidgets,
          stateful: this.metadata.statefulWidgets,
          components: this.metadata.componentWidgets,
        },
        state: {
          stateClasses: this.metadata.stateClasses,
          stateFields: this.metadata.totalStateFields,
          setStateCalls: this.metadata.setStateCallCount,
          lifecycleMethods: this.metadata.lifecycleMethodCount,
          eventHandlers: this.metadata.eventHandlerCount,
        },
        context: this.options.includeContext ? {
          inheritedWidgets: this.metadata.inheritedWidgets,
          changeNotifiers: this.metadata.changeNotifiers,
          providers: this.metadata.providers,
          contextAccessPoints: this.metadata.contextAccessPoints,
        } : null,
        ssr: this.options.includeSsr ? {
          compatibility: this.metadata.ssrCompatibility,
          compatibilityScore: this.metadata.ssrCompatibilityScore,
          safePatterns: this.metadata.ssrSafePatterns,
          unsafePatterns: this.metadata.ssrUnsafePatterns,
          hydrationRequired: this.metadata.hydrationRequired,
          hydrationCount: this.metadata.hydrationCount,
        } : null,
        functions: this.metadata.totalFunctions,
        imports: this.metadata.totalImports,
        externalPackages: this.metadata.externalPackages,
        entryPoint: this.metadata.entryPoint,
        rootWidget: this.metadata.rootWidget,
        treeDepth: this.metadata.treeDepth,
        healthScore: this.metadata.healthScore,
        complexityScore: this.metadata.complexityScore,
      },

      widgets: this.formatWidgets(),
      stateClasses: this.formatStateClasses(),
      imports: this.formatImports(),
      functions: this.formatFunctions(),

      context: this.options.includeContext ? this.formatContext() : null,
      ssr: this.options.includeSsr ? this.formatSsr() : null,

      widgetTree: this.options.includeTree ? this.formatWidgetTree() : null,
      dependencyGraph: this.formatDependencyGraph(),
      validation: this.options.includeValidation ? this.formatValidation() : null,
      suggestions: this.options.includeSuggestions ? this.generateSuggestions() : null,

      metrics: this.options.includeMetrics ? this.getDetailedMetrics() : null,
    };
  }

  /**
   * Phase 3: Format context analysis results
   */
  formatContext() {
    if (!this.contextResults) {
      return {
        inheritedWidgets: [],
        changeNotifiers: [],
        providers: [],
        contextFlow: {},
      };
    }

    return {
      inheritedWidgets: this.contextResults.inheritedWidgets?.map((widget) => ({
        name: widget.name,
        properties: widget.properties,
        staticAccessors: widget.staticAccessors?.map((a) => a.name),
        updateShouldNotifyImplemented: widget.updateShouldNotifyImplemented,
        usedIn: widget.usedIn,
        usageCount: widget.usageCount,
      })) || [],

      changeNotifiers: this.contextResults.changeNotifiers?.map((notifier) => ({
        name: notifier.name,
        properties: notifier.properties?.length || 0,
        getters: notifier.getters?.map((g) => g.name) || [],
        methods: notifier.methods?.map((m) => ({
          name: m.name,
          callsNotifyListeners: m.callsNotifyListeners,
          mutations: m.mutations,
        })) || [],
        consumers: notifier.consumers || [],
      })) || [],

      providers: this.contextResults.providers?.map((provider) => ({
        type: provider.providerType,
        valueType: provider.valueType,
        consumers: provider.consumers || [],
        accessPatterns: provider.accessPatterns || [],
      })) || [],

      contextFlow: {
        inheritedWidgetGraph: this.contextResults.inheritedWidgetGraph || {},
        providerGraph: this.contextResults.providerGraph || {},
      },

      contextAccessPoints: this.contextResults.contextAccessPoints?.map((usage) => ({
        pattern: usage.pattern,
        type: usage.type,
        location: usage.location,
        ssrSafe: usage.ssrSafe,
        reason: usage.reason,
      })) || [],
    };
  }

  /**
   * Phase 3: Format SSR analysis results
   */
  formatSsr() {
    if (!this.ssrResults) {
      return {
        compatibility: 'unknown',
        score: 0,
        patterns: { safe: [], unsafe: [] },
        hydration: [],
        migration: [],
      };
    }

    return {
      overallCompatibility: this.ssrResults.overallCompatibility,
      compatibilityScore: this.ssrResults.ssrCompatibilityScore,
      readinessScore: this.ssrResults.ssrReadinessScore || this.ssrResults.ssrCompatibilityScore,
      estimatedEffort: this.ssrResults.estimatedEffort,

      patterns: {
        safe: this.ssrResults.ssrSafePatterns?.map((p) => ({
          pattern: p.pattern,
          example: p.example,
          why: p.why,
          confidence: p.confidence,
        })) || [],

        unsafe: this.ssrResults.ssrUnsafePatterns?.map((p) => ({
          pattern: p.pattern,
          example: p.example,
          why: p.why,
          severity: p.severity,
          suggestion: p.suggestion,
          location: p.location,
        })) || [],
      },

      hydration: {
        required: this.ssrResults.hydrationCount > 0,
        count: this.ssrResults.hydrationCount,
        requirements: this.ssrResults.hydrationRequirements?.map((r) => ({
          dependency: r.dependency,
          reason: r.reason,
          order: r.order,
          requiredProviders: r.requiredProviders,
          requiredState: r.requiredState,
        })) || [],
      },

      lazyLoadingOpportunities: this.ssrResults.lazyLoadOpportunities?.map((opp) => ({
        target: opp.target,
        reason: opp.reason,
        estimatedSize: opp.estimatedSize,
        priority: opp.priority,
        recommendation: opp.recommendation,
      })) || [],

      migrationPath: this.ssrResults.ssrMigrationPath?.map((step) => ({
        step: step.step,
        action: step.action,
        description: step.description,
        example: step.example,
        effort: step.effort,
        priority: step.priority,
        locations: step.locations,
      })) || [],

      validationIssues: {
        critical: this.ssrResults.criticalIssues?.map((i) => ({
          type: i.type,
          message: i.message,
          suggestion: i.suggestion,
          location: i.location,
        })) || [],

        warnings: this.ssrResults.warningIssues?.map((i) => ({
          type: i.type,
          message: i.message,
          suggestion: i.suggestion,
        })) || [],
      },
    };
  }

  /**
   * Format widgets for report
   */
  formatWidgets() {
    const widgets = {};

    (this.widgetResults.widgets || []).forEach((widget) => {
      widgets[widget.name] = {
        type: widget.type,
        superClass: widget.superClass || null,
        location: widget.location,
        constructor: widget.constructor
          ? {
            params: widget.constructor.params || [],
          }
          : null,
        methods: widget.methods.map((m) => ({
          name: m.name,
          params: m.params || [],
        })),
        properties: widget.properties || [],
        linkedStateClass: widget.linkedStateClass || null,
        imports: widget.imports || [],
      };
    });

    return widgets;
  }

  /**
   * FIXED: Format state classes for report
   * Properly handle StateField objects which may or may not have isUsed method
   */
  formatStateClasses() {
    const stateClasses = {};

    (this.stateResults.stateClasses || []).forEach((sc) => {
      const metadata = sc.metadata || sc;  // Handle both wrapped and unwrapped formats
      
      stateClasses[metadata.name] = {
        name: metadata.name,
        linkedStatefulWidget: metadata.linkedStatefulWidget,
        location: metadata.location,

        stateFields: (metadata.stateFields || []).map((field) => {
          // FIXED: Check if isUsed is a function before calling it
          const isUsed = typeof field.isUsed === 'function' 
            ? field.isUsed() 
            : (field.usedInMethods && field.usedInMethods.length > 0);

          return {
            name: field.name,
            type: field.type || 'any',
            initialValue: field.initialValueString || field.initialValue?.toString() || 'undefined',
            isUsed: isUsed,
            usedInMethods: field.usedInMethods || [],
            mutatedInMethods: field.mutatedInMethods || [],
            mutationCount: (field.mutations && field.mutations.length) || 0,
          };
        }),

        lifecycleMethods: (metadata.lifecycleMethods || []).map((lc) => {
          // FIXED: Check if isValid is a function
          const isValid = typeof lc.isValid === 'function' 
            ? lc.isValid() 
            : true;

          return {
            name: lc.name,
            callsSuper: lc.callsSuper || false,
            hasSideEffects: lc.hasSideEffects || false,
            isValid: isValid,
            issues: lc.validationIssues || [],
          };
        }),

        otherMethods: (metadata.otherMethods || []).map((m) => ({
          name: m.name,
          params: m.params || [],
        })),
      };
    });

    return stateClasses;
  }

  /**
   * Format imports for report
   */
  formatImports() {
    const imports = {};

    (this.widgetResults.imports || []).forEach((imp) => {
      imports[imp.source] = imp.items || [];
    });

    return imports;
  }

  /**
   * Format functions for report
   */
  formatFunctions() {
    const functions = {};

    (this.widgetResults.functions || []).forEach((func) => {
      functions[func.name] = {
        type: func.type,
        location: func.location,
        params: (func.params || []).map((p) => ({
          name: p.name,
          optional: p.optional,
        })),
        isEntryPoint: func.isEntryPoint || false,
      };
    });

    return functions;
  }

  /**
   * Format widget tree for report
   */
  formatWidgetTree() {
    if (!this.widgetResults.widgetTree) {
      return null;
    }

    return this.treeNodeToObject(this.widgetResults.widgetTree);
  }

  /**
   * Convert tree node to object recursively
   */
  treeNodeToObject(node) {
    if (!node) return null;

    return {
      name: node.widget?.name || 'Unknown',
      type: node.widget?.type || 'unknown',
      depth: node.depth || 0,
      children: (node.children || []).map((child) => this.treeNodeToObject(child)),
    };
  }

  /**
   * Format dependency graph for report
   */
  formatDependencyGraph() {
    const graph = this.stateResults.dependencyGraph;
    if (!graph) return null;

    return {
      stateToMethods: Object.fromEntries(graph.stateToMethods || []),
      methodToState: Object.fromEntries(graph.methodToState || []),
      eventToState: Object.fromEntries(graph.eventToState || []),
    };
  }

  /**
   * Format validation results for report
   */
  formatValidation() {
    const results = this.stateResults.validationResults || [];

    return {
      totalIssues: results.length,
      errors: results.filter((r) => r.severity === 'error'),
      warnings: results.filter((r) => r.severity === 'warning'),
      info: results.filter((r) => r.severity === 'info'),
    };
  }

  /**
   * Generate suggestions based on analysis
   */
  generateSuggestions() {
    const suggestions = [];

    // Phase 1 & 2 Suggestions
    if (this.metadata.statefulWidgets > this.metadata.statelessWidgets) {
      suggestions.push({
        type: 'structure',
        severity: 'info',
        message: 'More stateful than stateless widgets',
        suggestion: 'Consider using stateless widgets where possible for better performance',
      });
    }

    if (this.metadata.treeDepth > 5) {
      suggestions.push({
        type: 'structure',
        severity: 'warning',
        message: 'Deep widget tree detected',
        suggestion: 'Consider refactoring to reduce nesting depth (aim for < 5 levels)',
      });
    }

    // Phase 3: SSR Suggestions
    if (this.options.includeSsr && this.ssrResults) {
      if (this.metadata.ssrCompatibilityScore < 50) {
        suggestions.push({
          type: 'ssr-compatibility',
          severity: 'warning',
          message: `Low SSR compatibility score (${this.metadata.ssrCompatibilityScore}/100)`,
          suggestion: `Follow the ${this.ssrResults.ssrMigrationPath?.length || 0} migration steps to improve SSR support`,
          migrationSteps: this.ssrResults.ssrMigrationPath?.length || 0,
        });
      }

      if (this.metadata.ssrUnsafePatterns > 5) {
        suggestions.push({
          type: 'ssr-patterns',
          severity: 'warning',
          message: `Found ${this.metadata.ssrUnsafePatterns} SSR-unsafe patterns`,
          suggestion: 'Refactor unsafe patterns to enable server-side rendering',
          unsafePatterns: this.metadata.ssrUnsafePatterns,
        });
      }

      if (this.metadata.hydrationRequired) {
        suggestions.push({
          type: 'hydration',
          severity: 'info',
          message: `App requires hydration for ${this.metadata.hydrationCount} dependencies`,
          suggestion: 'Implement hydration layer to re-attach listeners after server render',
          hydrationDependencies: this.metadata.hydrationCount,
        });
      }

      if (this.ssrResults.lazyLoadOpportunities?.length > 0) {
        suggestions.push({
          type: 'optimization',
          severity: 'info',
          message: `Found ${this.ssrResults.lazyLoadOpportunities.length} lazy-load opportunities`,
          suggestion: 'Implement code splitting to reduce initial bundle size',
          opportunities: this.ssrResults.lazyLoadOpportunities.length,
        });
      }
    }

    // Phase 3: Context Suggestions
    if (this.options.includeContext && this.contextResults) {
      if (this.metadata.inheritedWidgets > 3) {
        suggestions.push({
          type: 'context-hierarchy',
          severity: 'info',
          message: `Multiple InheritedWidgets detected (${this.metadata.inheritedWidgets})`,
          suggestion: 'Consider consolidating context providers to reduce nesting',
          inheritedWidgets: this.metadata.inheritedWidgets,
        });
      }

      if (this.metadata.providers > 0) {
        suggestions.push({
          type: 'state-management',
          severity: 'info',
          message: `Using Provider pattern (${this.metadata.providers} providers)`,
          suggestion: 'Ensure providers are properly organized and lazy-initialized where possible',
          providers: this.metadata.providers,
        });
      }
    }

    return suggestions;
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics() {
    return {
      widgetMetrics: {
        total: this.metadata.totalWidgets,
        byType: {
          stateless: this.metadata.statelessWidgets,
          stateful: this.metadata.statefulWidgets,
          component: this.metadata.componentWidgets,
          state: this.metadata.stateClasses,
        },
      },

      stateMetrics: {
        stateClasses: this.metadata.stateClasses,
        totalFields: this.metadata.totalStateFields,
        setStateCalls: this.metadata.setStateCallCount,
        lifecycleMethods: this.metadata.lifecycleMethodCount,
        eventHandlers: this.metadata.eventHandlerCount,
      },

      contextMetrics: this.options.includeContext ? {
        inheritedWidgets: this.metadata.inheritedWidgets,
        changeNotifiers: this.metadata.changeNotifiers,
        providers: this.metadata.providers,
        contextAccessPoints: this.metadata.contextAccessPoints,
      } : null,

      ssrMetrics: this.options.includeSsr ? {
        compatibilityScore: this.metadata.ssrCompatibilityScore,
        compatibility: this.metadata.ssrCompatibility,
        safePatterns: this.metadata.ssrSafePatterns,
        unsafePatterns: this.metadata.ssrUnsafePatterns,
        hydrationRequired: this.metadata.hydrationRequired,
        hydrationCount: this.metadata.hydrationCount,
      } : null,

      functionMetrics: {
        total: this.metadata.totalFunctions,
        entryPoint: this.metadata.entryPoint || 'none',
      },

      dependencyMetrics: {
        totalImports: this.metadata.totalImports,
        externalPackages: this.metadata.externalPackages,
      },

      structureMetrics: {
        widgetTreeDepth: this.metadata.treeDepth,
        rootWidget: this.metadata.rootWidget || 'none',
      },

      healthMetrics: {
        healthScore: this.metadata.healthScore,
        complexityScore: this.metadata.complexityScore,
        errors: this.metadata.errorCount,
        warnings: this.metadata.warningCount,
      },
    };
  }

  /**
   * Generate JSON report
   */
  toJSON() {
    if (this.options.prettyPrint) {
      return JSON.stringify(this.report, null, 2);
    } else {
      return JSON.stringify(this.report);
    }
  }

  /**
   * Generate Markdown report
   */
  toMarkdown() {
    let md = '# FlutterJS Code Analysis Report (Phase 1 + 2 + 3)\n\n';

    md += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Summary Table
    md += '## Summary\n\n';
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Widgets | ${this.metadata.totalWidgets} |\n`;
    md += `| Stateless | ${this.metadata.statelessWidgets} |\n`;
    md += `| Stateful | ${this.metadata.statefulWidgets} |\n`;
    md += `| State Classes | ${this.metadata.stateClasses} |\n`;
    md += `| State Fields | ${this.metadata.totalStateFields} |\n`;
    md += `| Health Score | ${this.metadata.healthScore}/100 |\n`;
    md += `| Complexity Score | ${this.metadata.complexityScore}/100 |\n`;

    if (this.options.includeContext) {
      md += `| InheritedWidgets | ${this.metadata.inheritedWidgets} |\n`;
      md += `| ChangeNotifiers | ${this.metadata.changeNotifiers} |\n`;
      md += `| Providers | ${this.metadata.providers} |\n`;
    }

    if (this.options.includeSsr) {
      md += `| SSR Compatibility | ${this.metadata.ssrCompatibility} |\n`;
      md += `| SSR Score | ${this.metadata.ssrCompatibilityScore}/100 |\n`;
      md += `| Hydration Required | ${this.metadata.hydrationRequired ? 'Yes' : 'No'} |\n`;
    }

    md += '\n';

    // Context Section
    if (this.options.includeContext && this.contextResults) {
      md += '## Context Analysis (Phase 3)\n\n';

      if (this.metadata.inheritedWidgets > 0) {
        md += '### InheritedWidgets\n\n';
        (this.contextResults.inheritedWidgets || []).forEach((widget) => {
          md += `- **${widget.name}**\n`;
          if (widget.properties && widget.properties.length > 0) {
            md += `  - Properties: ${widget.properties.map((p) => p.name).join(', ')}\n`;
          }
          if (widget.usedIn && widget.usedIn.length > 0) {
            md += `  - Used in: ${widget.usedIn.join(', ')}\n`;
          }
        });
        md += '\n';
      }

      if (this.metadata.changeNotifiers > 0) {
        md += '### ChangeNotifiers\n\n';
        (this.contextResults.changeNotifiers || []).forEach((notifier) => {
          md += `- **${notifier.name}**\n`;
          if (notifier.consumers && notifier.consumers.length > 0) {
            md += `  - Consumed by: ${notifier.consumers.join(', ')}\n`;
          }
        });
        md += '\n';
      }
    }

    // SSR Section
    if (this.options.includeSsr && this.ssrResults) {
      md += '## SSR Compatibility Analysis (Phase 3)\n\n';
      md += `**Overall Compatibility:** ${this.metadata.ssrCompatibility}\n`;
      md += `**Score:** ${this.metadata.ssrCompatibilityScore}/100\n`;
      md += `**Effort to fix:** ${this.ssrResults.estimatedEffort}\n\n`;

      if (this.metadata.ssrUnsafePatterns > 0) {
        md += `### Unsafe Patterns (${this.metadata.ssrUnsafePatterns})\n\n`;
        (this.ssrResults.ssrUnsafePatterns || []).slice(0, 10).forEach((pattern) => {
          md += `- **${pattern.pattern}**: ${pattern.why}\n`;
        });
        if (this.metadata.ssrUnsafePatterns > 10) {
          md += `- ... and ${this.metadata.ssrUnsafePatterns - 10} more\n`;
        }
        md += '\n';
      }

      if (this.ssrResults.hydrationCount > 0) {
        md += `### Hydration Requirements (${this.ssrResults.hydrationCount})\n\n`;
        (this.ssrResults.hydrationRequirements || []).forEach((req) => {
          md += `- **${req.dependency}**: ${req.reason}\n`;
        });
        md += '\n';
      }

      if (this.ssrResults.ssrMigrationPath && this.ssrResults.ssrMigrationPath.length > 0) {
        md += `### Migration Path (${this.ssrResults.ssrMigrationPath.length} steps)\n\n`;
        (this.ssrResults.ssrMigrationPath || []).forEach((step) => {
          md += `**Step ${step.step}: ${step.action}**\n`;
          if (step.description) {
            md += `${step.description}\n`;
          }
          if (step.effort) {
            md += `- Effort: ${step.effort}\n`;
          }
          md += '\n';
        });
      }
    }

    md += '\n';

    // Suggestions
    if (this.options.includeSuggestions) {
      const suggestions = this.generateSuggestions();
      if (suggestions.length > 0) {
        md += '## Suggestions\n\n';
        suggestions.forEach((sug) => {
          md += `- **${sug.message}**: ${sug.suggestion}\n`;
        });
        md += '\n';
      }
    }

    return md;
  }

  /**
   * Generate Console report
   */
  toConsole() {
    const lines = [];

    lines.push('\n' + '='.repeat(80));
    lines.push('FlutterJS CODE ANALYSIS REPORT (Phase 1 + 2 + 3)');
    lines.push('='.repeat(80) + '\n');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(80));
    lines.push(`  Widgets: ${this.metadata.totalWidgets} (${this.metadata.statelessWidgets} stateless, ${this.metadata.statefulWidgets} stateful)`);
    lines.push(`  State Classes: ${this.metadata.stateClasses}`);
    lines.push(`  State Fields: ${this.metadata.totalStateFields}`);
    lines.push(`  Health Score: ${this.metadata.healthScore}/100`);
    lines.push(`  Complexity: ${this.metadata.complexityScore}/100`);

    if (this.options.includeContext) {
      lines.push(`  InheritedWidgets: ${this.metadata.inheritedWidgets}`);
      lines.push(`  ChangeNotifiers: ${this.metadata.changeNotifiers}`);
      lines.push(`  Providers: ${this.metadata.providers}`);
    }

    if (this.options.includeSsr) {
      lines.push(`  SSR Compatibility: ${this.metadata.ssrCompatibility}`);
      lines.push(`  SSR Score: ${this.metadata.ssrCompatibilityScore}/100`);
      lines.push(`  Migration Steps: ${this.ssrResults?.ssrMigrationPath?.length || 0}`);
    }

    lines.push('');

    // Context Section
    if (this.options.includeContext && this.contextResults && this.metadata.inheritedWidgets > 0) {
      lines.push('CONTEXT ANALYSIS (Phase 3)');
      lines.push('-'.repeat(80));

      if (this.metadata.inheritedWidgets > 0) {
        lines.push('  InheritedWidgets:');
        (this.contextResults.inheritedWidgets || []).forEach((widget) => {
          lines.push(`    - ${widget.name}`);
          if (widget.usedIn && widget.usedIn.length > 0) {
            lines.push(`      Used in: ${widget.usedIn.join(', ')}`);
          }
        });
      }

      if (this.metadata.changeNotifiers > 0) {
        lines.push('  ChangeNotifiers:');
        (this.contextResults.changeNotifiers || []).forEach((notifier) => {
          lines.push(`    - ${notifier.name}`);
          if (notifier.consumers && notifier.consumers.length > 0) {
            lines.push(`      Consumers: ${notifier.consumers.join(', ')}`);
          }
        });
      }

      lines.push('');
    }

    // SSR Section
    if (this.options.includeSsr && this.ssrResults) {
      lines.push('SSR COMPATIBILITY ANALYSIS (Phase 3)');
      lines.push('-'.repeat(80));
      lines.push(`  Overall: ${this.metadata.ssrCompatibility} (${this.metadata.ssrCompatibilityScore}/100)`);
      lines.push(`  Safe Patterns: ${this.metadata.ssrSafePatterns}`);
      lines.push(`  Unsafe Patterns: ${this.metadata.ssrUnsafePatterns}`);

      if (this.ssrResults.hydrationCount > 0) {
        lines.push(`  Hydration Required: Yes (${this.ssrResults.hydrationCount} dependencies)`);
      }

      if (this.ssrResults.ssrMigrationPath && this.ssrResults.ssrMigrationPath.length > 0) {
        lines.push(`  Migration Steps: ${this.ssrResults.ssrMigrationPath.length}`);
        lines.push(`  Estimated Effort: ${this.ssrResults.estimatedEffort}`);
      }

      lines.push('');
    }

    // Validation
    if (this.stateResults && this.stateResults.validationResults && this.stateResults.validationResults.length > 0) {
      lines.push('VALIDATION ISSUES');
      lines.push('-'.repeat(80));
      (this.stateResults.validationResults || []).forEach((result) => {
        const icon = result.severity === 'error' ? '❌' : result.severity === 'warning' ? '⚠️ ' : 'ℹ️ ';
        lines.push(`  ${icon} [${result.severity.toUpperCase()}] ${result.message}`);
        if (result.suggestion) {
          lines.push(`     → ${result.suggestion}`);
        }
      });
      lines.push('');
    }

    lines.push('='.repeat(80) + '\n');

    return lines.join('\n');
  }

  /**
   * Save report to file
   */
  saveToFile(filePath, fs) {
    const content = this.generate();
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ReportGenerator };