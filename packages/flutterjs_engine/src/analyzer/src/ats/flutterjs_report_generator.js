/**
 * FlutterJS Report Generator
 * Phase 1.4 MVP Implementation
 * 
 * Formats analysis results into structured reports (JSON, Markdown, Console)
 */

// ============================================================================
// REPORT GENERATOR CLASS
// ============================================================================

class ReportGenerator {
  constructor(analysis, options = {}) {
    this.analysis = analysis;
    this.options = {
      format: 'json', // 'json', 'markdown', 'console'
      includeMetrics: true,
      includeTree: true,
      includeSuggestions: true,
      prettyPrint: true,
      ...options,
    };
    this.metadata = null;
  }

  /**
   * Main entry point - generate report
   */
  generate() {
    this.calculateMetrics();

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
   * Calculate metrics from analysis
   */
  calculateMetrics() {
    const widgets = this.analysis.widgets || [];
    const functions = this.analysis.functions || [];
    const imports = this.analysis.imports || [];

    // Initialize metadata first
    this.metadata = {
      totalWidgets: widgets.length,
      statelessWidgets: widgets.filter((w) => w.type === 'stateless').length,
      statefulWidgets: widgets.filter((w) => w.type === 'stateful').length,
      componentWidgets: widgets.filter((w) => w.type === 'component').length,
      stateClasses: widgets.filter((w) => w.type === 'state').length,
      totalFunctions: functions.length,
      totalImports: imports.length,
      externalPackages: new Set(this.analysis.externalDependencies || []).size,
      treeDepth: this.calculateTreeDepth(this.analysis.widgetTree),
      healthScore: 0, // Will be calculated below
    };

    // Now calculate health score with metadata available
    this.metadata.healthScore = this.calculateHealthScore();
  }

  /**
   * Calculate tree depth
   */
  calculateTreeDepth(node) {
    if (!node || !node.children || node.children.length === 0) {
      return 1;
    }
    return 1 + Math.max(...node.children.map((child) => this.calculateTreeDepth(child)));
  }

  /**
   * Calculate health score (0-100)
   */
  calculateHealthScore() {
    let score = 100;

    // Deduct for poor structure
    if (this.metadata.statefulWidgets > this.metadata.statelessWidgets) {
      score -= 10;
    }

    if (this.metadata.treeDepth > 5) {
      score -= 5;
    }

    if (this.metadata.totalFunctions > this.metadata.totalWidgets * 2) {
      score -= 5;
    }

    // Bonus for having entry point
    if (this.analysis.entryPoint) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate JSON report
   */
  toJSON() {
    const report = {
      analysis: {
        file: this.analysis.file || 'unknown',
        timestamp: new Date().toISOString(),
        status: this.analysis.errors.length === 0 ? 'success' : 'warning',
        errorCount: this.analysis.errors.length,
      },
      summary: {
        totalWidgets: this.metadata.totalWidgets,
        statelessWidgets: this.metadata.statelessWidgets,
        statefulWidgets: this.metadata.statefulWidgets,
        componentWidgets: this.metadata.componentWidgets,
        stateClasses: this.metadata.stateClasses,
        totalFunctions: this.metadata.totalFunctions,
        totalImports: this.metadata.totalImports,
        externalPackages: this.metadata.externalPackages,
        entryPoint: this.analysis.entryPoint || null,
        rootWidget: this.analysis.rootWidget || null,
        widgetTreeDepth: this.metadata.treeDepth,
        healthScore: this.metadata.healthScore,
      },
      widgets: this.formatWidgets(),
      functions: this.formatFunctions(),
      imports: this.formatImports(),
      widgetTree: this.options.includeTree ? this.formatWidgetTree() : null,
      metrics: this.options.includeMetrics ? this.getDetailedMetrics() : null,
      suggestions: this.options.includeSuggestions ? this.generateSuggestions() : null,
      errors: this.analysis.errors || [],
    };

    if (this.options.prettyPrint) {
      return JSON.stringify(report, null, 2);
    } else {
      return JSON.stringify(report);
    }
  }

  /**
   * Format widgets for report
   */
  formatWidgets() {
    const widgets = {};

    (this.analysis.widgets || []).forEach((widget) => {
      widgets[widget.name] = {
        type: widget.type,
        superClass: widget.superClass || null,
        location: widget.location,
        properties: widget.properties || [],
        methods: (widget.methods || []).map((m) => ({
          name: m.name,
          params: m.params || [],
        })),
        constructor: widget.constructor ? {
          name: widget.constructor.name,
          params: widget.constructor.params || [],
        } : null,
        imports: widget.imports || [],
      };
    });

    return widgets;
  }

  /**
   * Format functions for report
   */
  formatFunctions() {
    const functions = {};

    (this.analysis.functions || []).forEach((func) => {
      functions[func.name] = {
        type: func.type,
        location: func.location,
        params: (func.params || []).map((p) => ({
          name: p.name,
          optional: p.optional,
        })),
        isEntryPoint: func.isEntryPoint || false,
        isAsync: func.isAsync || false,
      };
    });

    return functions;
  }

  /**
   * Format imports for report
   */
  formatImports() {
    const imports = {};

    (this.analysis.imports || []).forEach((imp) => {
      imports[imp.source] = imp.items || [];
    });

    return imports;
  }

  /**
   * Format widget tree for report
   */
  formatWidgetTree() {
    if (!this.analysis.widgetTree) {
      return null;
    }

    return this.treeNodeToObject(this.analysis.widgetTree);
  }

  /**
   * Convert tree node to object recursively
   */
  treeNodeToObject(node) {
    if (!node) return null;

    return {
      name: node.widget.name,
      type: node.widget.type,
      depth: node.depth,
      children: (node.children || []).map((child) => this.treeNodeToObject(child)),
    };
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
            ? (this.analysis.widgets || []).reduce((sum, w) => sum + (w.methods || []).length, 0) /
              this.metadata.totalWidgets
            : 0,
        averagePropertiesPerWidget:
          this.metadata.totalWidgets > 0
            ? (this.analysis.widgets || []).reduce((sum, w) => sum + (w.properties || []).length, 0) /
              this.metadata.totalWidgets
            : 0,
      },
      functionMetrics: {
        total: this.metadata.totalFunctions,
        averageParamsPerFunction:
          this.metadata.totalFunctions > 0
            ? (this.analysis.functions || []).reduce(
              (sum, f) => sum + (f.params || []).length,
              0
            ) / this.metadata.totalFunctions
            : 0,
      },
      dependencyMetrics: {
        totalImports: this.metadata.totalImports,
        externalPackages: this.metadata.externalPackages,
        imports: (this.analysis.imports || []).map((imp) => ({
          source: imp.source,
          itemCount: imp.items.length,
        })),
      },
      structureMetrics: {
        widgetTreeDepth: this.metadata.treeDepth,
        rootWidget: this.analysis.rootWidget || 'none',
        entryPoint: this.analysis.entryPoint || 'none',
      },
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
        type: 'warning',
        category: 'structure',
        message: 'More stateful than stateless widgets',
        suggestion: 'Consider using stateless widgets where possible for better performance',
        severity: 'low',
      });
    }

    if (this.metadata.treeDepth > 5) {
      suggestions.push({
        type: 'warning',
        category: 'structure',
        message: 'Deep widget tree detected',
        suggestion: 'Consider refactoring to reduce nesting depth (aim for < 5 levels)',
        severity: 'medium',
      });
    }

    // Function suggestions
    if (this.metadata.totalFunctions === 0 && this.metadata.totalWidgets > 0) {
      suggestions.push({
        type: 'info',
        category: 'code-organization',
        message: 'No helper functions found',
        suggestion: 'Consider extracting common widget patterns into functions',
        severity: 'low',
      });
    }

    // Import suggestions
    if (this.metadata.externalPackages > 5) {
      suggestions.push({
        type: 'info',
        category: 'dependencies',
        message: `${this.metadata.externalPackages} external packages imported`,
        suggestion: 'Monitor dependencies for maintenance burden',
        severity: 'low',
      });
    }

    // Entry point suggestion
    if (!this.analysis.entryPoint) {
      suggestions.push({
        type: 'error',
        category: 'critical',
        message: 'No entry point (main function) found',
        suggestion: 'Add a main() function that calls runApp()',
        severity: 'high',
      });
    }

    // Root widget suggestion
    if (!this.analysis.rootWidget && this.metadata.totalWidgets > 0) {
      suggestions.push({
        type: 'warning',
        category: 'critical',
        message: 'Root widget not found',
        suggestion: 'Ensure main() passes a widget to runApp()',
        severity: 'high',
      });
    }

    return suggestions;
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
    md += `| Stateless Widgets | ${this.metadata.statelessWidgets} |\n`;
    md += `| Stateful Widgets | ${this.metadata.statefulWidgets} |\n`;
    md += `| Component Widgets | ${this.metadata.componentWidgets} |\n`;
    md += `| Total Functions | ${this.metadata.totalFunctions} |\n`;
    md += `| Total Imports | ${this.metadata.totalImports} |\n`;
    md += `| External Packages | ${this.metadata.externalPackages} |\n`;
    md += `| Widget Tree Depth | ${this.metadata.treeDepth} |\n`;
    md += `| Health Score | ${this.metadata.healthScore}/100 |\n\n`;

    // Widgets
    md += '## Widgets\n\n';
    (this.analysis.widgets || []).forEach((widget) => {
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

    // Functions
    if (this.analysis.functions.length > 0) {
      md += '## Functions\n\n';
      (this.analysis.functions || []).forEach((func) => {
        const params = (func.params || []).map((p) => p.name).join(', ');
        md += `- **${func.name}(${params})**`;
        if (func.isEntryPoint) {
          md += ' [ENTRY POINT]';
        }
        md += '\n';
      });
      md += '\n';
    }

    // Imports
    if (this.analysis.imports.length > 0) {
      md += '## Imports\n\n';
      (this.analysis.imports || []).forEach((imp) => {
        md += `- **${imp.source}**\n`;
        md += `  - ${imp.items.join(', ')}\n`;
      });
      md += '\n';
    }

    // Suggestions
    if (this.options.includeSuggestions) {
      const suggestions = this.generateSuggestions();
      if (suggestions.length > 0) {
        md += '## Suggestions\n\n';
        suggestions.forEach((sug) => {
          md += `- **${sug.message}**\n`;
          md += `  - ${sug.suggestion}\n`;
        });
        md += '\n';
      }
    }

    return md;
  }

  /**
   * Generate Console output
   */
  toConsole() {
    const lines = [];

    lines.push('\n' + '='.repeat(70));
    lines.push('FlutterJS CODE ANALYSIS REPORT');
    lines.push('='.repeat(70) + '\n');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(70));
    lines.push(`  Widgets: ${this.metadata.totalWidgets} (${this.metadata.statelessWidgets} stateless, ${this.metadata.statefulWidgets} stateful)`);
    lines.push(`  Functions: ${this.metadata.totalFunctions}`);
    lines.push(`  External Packages: ${this.metadata.externalPackages}`);
    lines.push(`  Widget Tree Depth: ${this.metadata.treeDepth}`);
    lines.push(`  Health Score: ${this.metadata.healthScore}/100`);
    lines.push(`  Entry Point: ${this.analysis.entryPoint || 'NOT FOUND'}`);
    lines.push(`  Root Widget: ${this.analysis.rootWidget || 'NOT FOUND'}\n`);

    // Widgets
    if (this.analysis.widgets.length > 0) {
      lines.push('WIDGETS');
      lines.push('-'.repeat(70));
      (this.analysis.widgets || []).forEach((widget) => {
        lines.push(`  ${widget.name}`);
        lines.push(`    Type: ${widget.type}`);
        if (widget.superClass) {
          lines.push(`    Extends: ${widget.superClass}`);
        }
        if (widget.methods.length > 0) {
          lines.push(`    Methods: ${widget.methods.map((m) => m.name).join(', ')}`);
        }
        if (widget.properties.length > 0) {
          lines.push(`    Properties: ${widget.properties.map((p) => p.name).join(', ')}`);
        }
      });
      lines.push('');
    }

    // Functions
    if (this.analysis.functions.length > 0) {
      lines.push('FUNCTIONS');
      lines.push('-'.repeat(70));
      (this.analysis.functions || []).forEach((func) => {
        const params = (func.params || []).map((p) => p.name).join(', ');
        const label = func.isEntryPoint ? ' [ENTRY POINT]' : '';
        lines.push(`  ${func.name}(${params})${label}`);
      });
      lines.push('');
    }

    // Imports
    if (this.analysis.imports.length > 0) {
      lines.push('IMPORTS');
      lines.push('-'.repeat(70));
      (this.analysis.imports || []).forEach((imp) => {
        lines.push(`  From: ${imp.source}`);
        lines.push(`    Items: ${imp.items.join(', ')}`);
      });
      lines.push('');
    }

    // Suggestions
    if (this.options.includeSuggestions) {
      const suggestions = this.generateSuggestions();
      if (suggestions.length > 0) {
        lines.push('SUGGESTIONS');
        lines.push('-'.repeat(70));
        suggestions.forEach((sug) => {
          lines.push(`  [${sug.type.toUpperCase()}] ${sug.message}`);
          lines.push(`    → ${sug.suggestion}`);
        });
        lines.push('');
      }
    }

    lines.push('='.repeat(70) + '\n');

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

export {
  ReportGenerator,
};