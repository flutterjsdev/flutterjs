/**
 * FlutterJS Report Generator - Enhanced Phase 2
 * Generates JSON, Markdown, and Console reports from analysis results
 * 
 * Integrates Phase 1 (Widget Analysis) and Phase 2 (State Analysis)
 */

// ============================================================================
// REPORT GENERATOR CLASS
// ============================================================================

class ReportGenerator {
  constructor(widgetResults, stateResults, options = {}) {
    this.widgetResults = widgetResults;  // From Phase 1 WidgetAnalyzer
    this.stateResults = stateResults;    // From Phase 2 StateAnalyzer
    
    this.options = {
      format: 'json',                    // 'json', 'markdown', 'console'
      includeMetrics: true,
      includeTree: true,
      includeValidation: true,
      includeSuggestions: true,
      prettyPrint: true,
      ...options,
    };

    this.metadata = {};
    this.report = {};
  }

  /**
   * Main entry point - generate report
   */
  generate() {
    console.log('[ReportGenerator] Generating report...');
    
    this.calculateMetrics();
    this.buildReport();

    switch (this.options.format) {
      case 'json':
        return this.toJSON();
      case 'markdown':
        return this.toMarkdown();
      case 'console':
        return this.toConsole();
      default:
        return this.toJSON();
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

    this.metadata = {
      // Widget metrics
      totalWidgets: widgets.length,
      statelessWidgets: widgets.filter((w) => w.type === 'stateless').length,
      statefulWidgets: widgets.filter((w) => w.type === 'stateful').length,
      componentWidgets: widgets.filter((w) => w.type === 'component').length,
      stateClasses: stateClasses.length,

      // State metrics
      totalStateFields: stateFields.length,
      setStateCallCount: setStateCalls.length,
      lifecycleMethodCount: lifecycleMethods.length,
      eventHandlerCount: eventHandlers.length,

      // Function metrics
      totalFunctions: functions.length,
      entryPoint: this.widgetResults.entryPoint,
      rootWidget: this.widgetResults.rootWidget,

      // Import metrics
      totalImports: imports.length,
      externalPackages: new Set(
        imports.map((imp) => imp.source)
      ).size,

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

    // Deduct for errors
    score -= this.metadata.errorCount * 10;

    // Deduct for warnings
    score -= this.metadata.warningCount * 2;

    // Bonus for having entry point
    if (this.metadata.entryPoint) {
      score += 5;
    }

    // Deduct if more stateful than stateless
    if (this.metadata.statefulWidgets > this.metadata.statelessWidgets) {
      score -= 10;
    }

    // Deduct if tree too deep
    if (this.metadata.treeDepth > 5) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate complexity score (0-100)
   */
  calculateComplexityScore() {
    let score = 0;

    // State fields add complexity
    score += Math.min(this.metadata.totalStateFields * 10, 40);

    // setState calls add complexity
    score += Math.min(this.metadata.setStateCallCount * 5, 30);

    // Event handlers add complexity
    score += Math.min(this.metadata.eventHandlerCount * 2, 20);

    // Deep trees add complexity
    if (this.metadata.treeDepth > 5) {
      score += 10;
    }

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
        phase: 'phase1+phase2',
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
      
      widgetTree: this.options.includeTree ? this.formatWidgetTree() : null,
      dependencyGraph: this.formatDependencyGraph(),
      validation: this.options.includeValidation ? this.formatValidation() : null,
      suggestions: this.options.includeSuggestions ? this.generateSuggestions() : null,

      metrics: this.options.includeMetrics ? this.getDetailedMetrics() : null,
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
        constructor: widget.constructor ? {
          params: widget.constructor.params || [],
        } : null,
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
   * Format state classes for report
   */
  formatStateClasses() {
    const stateClasses = {};

    (this.stateResults.stateClasses || []).forEach((sc) => {
      const metadata = sc.metadata;
      stateClasses[metadata.name] = {
        name: metadata.name,
        linkedStatefulWidget: metadata.linkedStatefulWidget,
        location: metadata.location,
        
        stateFields: metadata.stateFields.map((field) => ({
          name: field.name,
          type: field.type,
          initialValue: field.initialValueString,
          isUsed: field.isUsed(),
          usedInMethods: field.usedInMethods,
          mutatedInMethods: field.mutatedInMethods,
          mutationCount: field.mutations.length,
        })),

        lifecycleMethods: metadata.lifecycleMethods.map((lc) => ({
          name: lc.name,
          callsSuper: lc.callsSuper,
          hasSideEffects: lc.hasSideEffects,
          isValid: lc.isValid(),
          issues: lc.validationIssues,
        })),

        otherMethods: metadata.otherMethods.map((m) => ({
          name: m.name,
          params: m.params || [],
        })),
      };
    });

    return stateClasses;
  }

  /**
   * Format setState calls for report
   */
  formatSetStateCalls() {
    return (this.stateResults.setStateCalls || []).map((call) => ({
      location: call.location,
      method: call.method,
      updates: call.updates,
      isValid: call.isValid,
      issues: call.issues,
    }));
  }

  /**
   * Format event handlers for report
   */
  formatEventHandlers() {
    return (this.stateResults.eventHandlers || []).map((handler) => ({
      event: handler.event,
      handler: handler.handler,
      component: handler.component,
      location: handler.location,
      triggersSetState: handler.triggersSetState,
      isValid: handler.isValid,
      issues: handler.issues,
    }));
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

    // Widget structure suggestions
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

    // State field suggestions
    const unusedFields = Object.values(this.formatStateClasses())
      .flatMap((sc) => sc.stateFields)
      .filter((f) => !f.isUsed);

    if (unusedFields.length > 0) {
      unusedFields.forEach((field) => {
        suggestions.push({
          type: 'state',
          severity: 'warning',
          message: `State field "${field.name}" is unused`,
          suggestion: 'Remove the field or implement its usage',
        });
      });
    }

    // Missing lifecycle suggestions
    const stateClasses = this.stateResults.stateClasses || [];
    stateClasses.forEach((sc) => {
      const hasInitState = sc.metadata.lifecycleMethods.some((m) => m.name === 'initState');
      const hasDispose = sc.metadata.lifecycleMethods.some((m) => m.name === 'dispose');

      if (!hasDispose && sc.metadata.stateFields.length > 0) {
        suggestions.push({
          type: 'lifecycle',
          severity: 'info',
          message: `State class "${sc.metadata.name}" has no dispose() method`,
          suggestion: 'Add a dispose() method to clean up resources',
        });
      }
    });

    // Entry point suggestion
    if (!this.metadata.entryPoint) {
      suggestions.push({
        type: 'critical',
        severity: 'error',
        message: 'No entry point (main function) found',
        suggestion: 'Add a main() function that calls runApp()',
      });
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
        averageMethodsPerWidget:
          this.metadata.totalWidgets > 0
            ? (this.widgetResults.widgets || []).reduce(
                (sum, w) => sum + (w.methods || []).length,
                0
              ) / this.metadata.totalWidgets
            : 0,
      },

      stateMetrics: {
        stateClasses: this.metadata.stateClasses,
        totalFields: this.metadata.totalStateFields,
        averageFieldsPerClass:
          this.metadata.stateClasses > 0
            ? this.metadata.totalStateFields / this.metadata.stateClasses
            : 0,
        setStateCalls: this.metadata.setStateCallCount,
        lifecycleMethods: this.metadata.lifecycleMethodCount,
        eventHandlers: this.metadata.eventHandlerCount,
      },

      functionMetrics: {
        total: this.metadata.totalFunctions,
        entryPoint: this.metadata.entryPoint || 'none',
        averageParamsPerFunction:
          this.metadata.totalFunctions > 0
            ? (this.widgetResults.functions || []).reduce(
                (sum, f) => sum + (f.params || []).length,
                0
              ) / this.metadata.totalFunctions
            : 0,
      },

      dependencyMetrics: {
        totalImports: this.metadata.totalImports,
        externalPackages: this.metadata.externalPackages,
        imports: (this.widgetResults.imports || []).map((imp) => ({
          source: imp.source,
          itemCount: imp.items.length,
        })),
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
    let md = '# FlutterJS Code Analysis Report\n\n';

    // Header
    md += `**Generated:** ${new Date().toISOString()}\n\n`;

    // Summary
    md += '## Summary\n\n';
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Widgets | ${this.metadata.totalWidgets} |\n`;
    md += `| Stateless | ${this.metadata.statelessWidgets} |\n`;
    md += `| Stateful | ${this.metadata.statefulWidgets} |\n`;
    md += `| State Classes | ${this.metadata.stateClasses} |\n`;
    md += `| State Fields | ${this.metadata.totalStateFields} |\n`;
    md += `| setState Calls | ${this.metadata.setStateCallCount} |\n`;
    md += `| Lifecycle Methods | ${this.metadata.lifecycleMethodCount} |\n`;
    md += `| Event Handlers | ${this.metadata.eventHandlerCount} |\n`;
    md += `| Health Score | ${this.metadata.healthScore}/100 |\n`;
    md += `| Complexity Score | ${this.metadata.complexityScore}/100 |\n\n`;

    // Widgets
    md += '## Widgets\n\n';
    (this.widgetResults.widgets || []).forEach((widget) => {
      md += `### ${widget.name}\n`;
      md += `- **Type:** ${widget.type}\n`;
      if (widget.superClass) {
        md += `- **Extends:** ${widget.superClass}\n`;
      }
      if (widget.methods.length > 0) {
        md += `- **Methods:** ${widget.methods.map((m) => m.name).join(', ')}\n`;
      }
      if (widget.properties.length > 0) {
        md += `- **Properties:** ${widget.properties.map((p) => p.name).join(', ')}\n`;
      }
      md += '\n';
    });

    // State Classes
    if (this.stateResults.stateClasses && this.stateResults.stateClasses.length > 0) {
      md += '## State Classes\n\n';
      (this.stateResults.stateClasses || []).forEach((sc) => {
        const metadata = sc.metadata;
        md += `### ${metadata.name}\n`;
        md += `- **Extends:** State<${metadata.linkedStatefulWidget}>\n`;
        
        if (metadata.stateFields.length > 0) {
          md += `- **State Fields:**\n`;
          metadata.stateFields.forEach((field) => {
            md += `  - \`${field.name}\`: ${field.type} = ${field.initialValueString}\n`;
          });
        }
        
        if (metadata.lifecycleMethods.length > 0) {
          md += `- **Lifecycle Methods:** ${metadata.lifecycleMethods.map((m) => m.name).join(', ')}\n`;
        }
        md += '\n';
      });
    }

    // Validation
    if (this.stateResults.validationResults && this.stateResults.validationResults.length > 0) {
      md += '## Validation Issues\n\n';
      const issues = this.stateResults.validationResults;
      
      const errors = issues.filter((i) => i.severity === 'error');
      if (errors.length > 0) {
        md += '### Errors\n';
        errors.forEach((issue) => {
          md += `- **${issue.type}:** ${issue.message}\n`;
          if (issue.suggestion) {
            md += `  - _Suggestion:_ ${issue.suggestion}\n`;
          }
        });
        md += '\n';
      }

      const warnings = issues.filter((i) => i.severity === 'warning');
      if (warnings.length > 0) {
        md += '### Warnings\n';
        warnings.forEach((issue) => {
          md += `- **${issue.type}:** ${issue.message}\n`;
          if (issue.suggestion) {
            md += `  - _Suggestion:_ ${issue.suggestion}\n`;
          }
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
    lines.push('FlutterJS CODE ANALYSIS REPORT');
    lines.push('='.repeat(80) + '\n');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(80));
    lines.push(`  Widgets: ${this.metadata.totalWidgets} (${this.metadata.statelessWidgets} stateless, ${this.metadata.statefulWidgets} stateful)`);
    lines.push(`  State Classes: ${this.metadata.stateClasses}`);
    lines.push(`  State Fields: ${this.metadata.totalStateFields}`);
    lines.push(`  setState Calls: ${this.metadata.setStateCallCount}`);
    lines.push(`  Lifecycle Methods: ${this.metadata.lifecycleMethodCount}`);
    lines.push(`  Event Handlers: ${this.metadata.eventHandlerCount}`);
    lines.push(`  Health Score: ${this.metadata.healthScore}/100`);
    lines.push(`  Complexity: ${this.metadata.complexityScore}/100`);
    lines.push(`  Entry Point: ${this.metadata.entryPoint || 'NOT FOUND'}`);
    lines.push(`  Root Widget: ${this.metadata.rootWidget || 'NOT FOUND'}\n`);

    // State Classes
    if (this.stateResults.stateClasses && this.stateResults.stateClasses.length > 0) {
      lines.push('STATE CLASSES');
      lines.push('-'.repeat(80));
      (this.stateResults.stateClasses || []).forEach((sc) => {
        const metadata = sc.metadata;
        lines.push(`  ${metadata.name}`);
        lines.push(`    Extends: State<${metadata.linkedStatefulWidget}>`);
        lines.push(`    Fields: ${metadata.stateFields.map((f) => f.name).join(', ')}`);
        lines.push(`    Lifecycle: ${metadata.lifecycleMethods.map((m) => m.name).join(', ')}`);
      });
      lines.push('');
    }

    // Validation
    if (this.stateResults.validationResults && this.stateResults.validationResults.length > 0) {
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