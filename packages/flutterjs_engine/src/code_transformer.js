// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * ============================================================================
 * FlutterJS Code Transformer - Complete Implementation
 * ============================================================================
 * 
 * Purpose:
 * - Transform widget classes for runtime execution
 * - Add state management hooks (setState)
 * - Inject lifecycle methods
 * - Transform widget instantiation
 * - Add metadata and debugging info
 * - Ensure proper exports
 * 
 * Location: cli/build/code-transformer.js
 */

import chalk from 'chalk';

// ============================================================================
// TRANSFORMATION DATA TYPES
// ============================================================================

/**
 * Metadata about a widget class
 */
class WidgetMetadata {
  constructor(name, type) {
    this.name = name;                        // 'MyApp', '_MyHomePageState'
    this.type = type;                        // 'stateless', 'stateful', 'state'
    this.superClass = null;                  // 'StatelessWidget', 'State<MyWidget>'
    this.methods = new Map();                // name -> method info
    this.fields = [];                        // class properties
    this.constructorParams = [];             // constructor parameters
    this.stateFields = [];                   // state variables (for State classes)
    this.hasSetState = false;                // uses setState
    this.hasBuildMethod = false;             // has build() method
    this.hasInitState = false;               // has initState() method
    this.hasDispose = false;                 // has dispose() method
    this.linkedWidget = null;                // For State, the StatefulWidget
  }

  addMethod(name, info) {
    this.methods.set(name, info);
    if (name === 'build') this.hasBuildMethod = true;
    if (name === 'initState') this.hasInitState = true;
    if (name === 'dispose') this.hasDispose = true;
  }
}

/**
 * Transformation applied to code
 */
class Transformation {
  constructor(type, name) {
    this.type = type;                        // 'inject-state', 'add-metadata', etc.
    this.name = name;                        // What was transformed
    this.original = '';                      // Original code
    this.transformed = '';                   // New code
    this.lineStart = -1;                     // Starting line
    this.lineEnd = -1;                       // Ending line
  }
}

/**
 * Transformation result
 */
class TransformResult {
  constructor() {
    this.originalCode = '';
    this.transformedCode = '';
    this.widgets = new Map();                // name -> WidgetMetadata
    this.transformations = [];               // All transformations applied
    this.errors = [];
    this.warnings = [];
    this.exports = [];                       // What gets exported
  }

  addWidget(metadata) {
    this.widgets.set(metadata.name, metadata);
  }

  addTransformation(transformation) {
    this.transformations.push(transformation);
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}

// ============================================================================
// MAIN CODE TRANSFORMER CLASS
// ============================================================================

class CodeTransformer {
  constructor(analysisResult, config = {}) {
    this.analysisResult = analysisResult;   // From analyzer
    this.config = {
      debugMode: config.debugMode || false,
      injectState: config.injectState !== false,
      injectLifecycle: config.injectLifecycle !== false,
      addMetadata: config.addMetadata !== false,
      validateExports: config.validateExports !== false,
      ...config
    };

    this.result = new TransformResult();
    this.classRegex = /class\s+(\w+)(?:\s+extends\s+([\w<>\.]+))?\s*\{/g;
    this.methodRegex = /(\w+)\s*\(\s*([^)]*)\s*\)\s*\{/g;
    this.stringMap = new Map();
  }

  /**
   * Mask string literals to prevent transformation inside them
   */
  maskStrings(code) {
    this.stringMap.clear();
    let counter = 0;

    // Regex for strings:
    // 1. Template literals (backticks) - capturing group 1
    // 2. Double quoted strings - capturing group 2
    // 3. Single quoted strings - capturing group 3
    // We prioritize backticks for multiline support
    const stringRegex = /(`(?:\\.|[^`\\])*`)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')/g;

    return code.replace(stringRegex, (match) => {
      const placeholder = `__FJS_STRING_LITERAL_${counter++}__`;
      this.stringMap.set(placeholder, match);
      return placeholder;
    });
  }

  /**
   * Restore masked strings
   */
  restoreStrings(code) {
    let result = code;
    this.stringMap.forEach((value, key) => {
      // Use split/join to replace all instances
      result = result.split(key).join(value);
    });
    return result;
  }

  /**
   * MAIN ENTRY POINT: Transform code
   */
  transform(sourceCode) {
    this.result.originalCode = sourceCode;

    if (this.config.debugMode) {
      console.log(chalk.blue('\n' + '='.repeat(60)));
      console.log(chalk.blue('CODE TRANSFORMATION STARTED'));
      console.log(chalk.blue('='.repeat(60)) + '\n');
    }

    try {
      // Step 1: Rewrite package imports (must be done BEFORE masking)
      let processingCode = this.rewriteImports(sourceCode);

      // Step 2: Mask strings to prevent transformation inside them
      processingCode = this.maskStrings(processingCode);

      // Step 3: Extract widget metadata
      this.extractWidgetMetadata(processingCode);

      // Step 4: Inject state management
      if (this.config.injectState) {
        processingCode = this.injectStateManagement(processingCode);
      }

      // Step 5: Inject lifecycle hooks
      if (this.config.injectLifecycle) {
        processingCode = this.injectLifecycleHooks(processingCode);
      }

      // Step 6: Add metadata
      if (this.config.addMetadata) {
        processingCode = this.addMetadata(processingCode);
      }

      // Step 7: Restore strings
      processingCode = this.restoreStrings(processingCode);

      // Step 8: Ensure exports
      if (this.config.validateExports) {
        processingCode = this.ensureExports(processingCode);
      }

      this.result.transformedCode = processingCode;

      if (this.config.debugMode) {
        this.printSummary();
      }

      return this.result;

    } catch (error) {
      this.result.addError(`Transformation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract metadata from widget classes
   */
  extractWidgetMetadata(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.gray('📊 Extracting widget metadata...\n'));
    }

    const lines = sourceCode.split('\n');
    let lineNumber = 1;

    for (const line of lines) {
      // Find class declarations
      const classMatch = line.match(/class\s+(\w+)(?:\s+extends\s+([\w<>\.]+))?\s*\{/);

      if (classMatch) {
        const className = classMatch[1];
        const superClass = classMatch[2];

        const metadata = new WidgetMetadata(className, this.determineType(superClass));
        metadata.superClass = superClass;

        if (this.config.debugMode) {
          console.log(chalk.gray(`${className} (${metadata.type}) at line ${lineNumber}`));
        }

        this.result.addWidget(metadata);
      }

      // Find methods
      const methodMatch = line.match(/^\s*(\w+)\s*\(\s*([^)]*)\s*\)\s*\{/);
      if (methodMatch) {
        const methodName = methodMatch[1];
        const params = methodMatch[2];

        // Add to last widget found
        const lastWidget = Array.from(this.result.widgets.values()).pop();
        if (lastWidget) {
          lastWidget.addMethod(methodName, {
            name: methodName,
            params: params.split(',').map(p => p.trim()),
            line: lineNumber
          });
        }
      }

      lineNumber++;
    }

    if (this.config.debugMode) {
      console.log(`\nFound ${this.result.widgets.size} widgets\n`);
    }
  }

  /**
   * Determine widget type from superclass
   */
  determineType(superClass) {
    if (!superClass) return 'unknown';
    if (superClass.includes('StatelessWidget')) return 'stateless';
    if (superClass.includes('StatefulWidget')) return 'stateful';
    if (superClass.includes('State')) return 'state';
    return 'widget';
  }

  /**
   * Inject state management for StatefulWidget
   */
  injectStateManagement(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.blue('💾 Injecting state management...\n'));
    }

    let transformed = sourceCode;

    for (const [name, metadata] of this.result.widgets) {
      if (metadata.type !== 'state') continue;

      // Find the State class and inject state tracking
      const classPattern = new RegExp(
        `(class\\s+${name}\\s+extends\\s+State[^{]*\\{)`,
        'g'
      );

      transformed = transformed.replace(classPattern, (match) => {
        const injected = match + `
  __stateChanged = false;
  __pendingUpdates = [];
  
  __setState(updates) {
    Object.assign(this, updates);
    this.__stateChanged = true;
    this.__pendingUpdates.push(updates);
    this.__notifyStateChange();
  }
  
  __notifyStateChange() {
    if (typeof this.__onStateChange === 'function') {
      this.__onStateChange(this);
    }
  }
`;

        const transformation = new Transformation('inject-state', name);
        transformation.original = match;
        transformation.transformed = injected;
        this.result.addTransformation(transformation);

        if (this.config.debugMode) {
          console.log(chalk.green(`✓ ${name} - State management injected`));
        }

        return injected;
      });
    }

    if (this.config.debugMode) {
      console.log();
    }

    return transformed;
  }

  /**
   * Inject lifecycle hooks
   */
  injectLifecycleHooks(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.blue('🔄 Injecting lifecycle hooks...\n'));
    }

    let transformed = sourceCode;

    for (const [name, metadata] of this.result.widgets) {
      if (metadata.type !== 'state') continue;

      // Inject __onMount hook if doesn't exist
      if (!metadata.hasInitState) {
        const classEnd = new RegExp(
          `(class\\s+${name}[^}]*\\n)(\\}\\s*$)`,
          'gm'
        );

        transformed = transformed.replace(classEnd, (match, classBody, closing) => {
          const mounted = `${classBody}
  __onMount() {
    if (this.initState) {
      this.initState();
    }
  }
${closing}`;

          if (this.config.debugMode) {
            console.log(chalk.green(`✓ ${name} - __onMount hook added`));
          }

          return mounted;
        });
      }

      // Inject __onUnmount hook if doesn't exist
      if (!metadata.hasDispose) {
        const classEnd = new RegExp(
          `(class\\s+${name}[^}]*\\n)(\\}\\s*$)`,
          'gm'
        );

        transformed = transformed.replace(classEnd, (match, classBody, closing) => {
          const unmounted = `${classBody}
  __onUnmount() {
    if (this.dispose) {
      this.dispose();
    }
  }
${closing}`;

          if (this.config.debugMode) {
            console.log(chalk.green(`✓ ${name} - __onUnmount hook added`));
          }

          return unmounted;
        });
      }
    }

    if (this.config.debugMode) {
      console.log();
    }

    return transformed;
  }

  /**
   * Add metadata to classes
   */
  addMetadata(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.blue('📝 Adding metadata...\n'));
    }

    let transformed = sourceCode;
    let injectionCount = 0;

    for (const [name, metadata] of this.result.widgets) {
      // Add static metadata to class
      const classPattern = new RegExp(
        `(class\\s+${name}[^{]*\\{)`,
        'g'
      );

      transformed = transformed.replace(classPattern, (match) => {
        const metadataStr = JSON.stringify({
          name: metadata.name,
          type: metadata.type,
          superClass: metadata.superClass,
          methods: Array.from(metadata.methods.keys()),
          hasSetState: metadata.hasSetState,
          hasBuildMethod: metadata.hasBuildMethod
        });

        const withMetadata = `${match}
  static __metadata = ${metadataStr};
`;

        const transformation = new Transformation('add-metadata', name);
        transformation.original = match;
        transformation.transformed = withMetadata;
        this.result.addTransformation(transformation);

        injectionCount++;

        if (this.config.debugMode) {
          console.log(chalk.green(`✓ ${name} - Metadata added`));
        }

        return withMetadata;
      });
    }

    if (this.config.debugMode) {
      console.log(`\nAdded metadata to ${injectionCount} widgets\n`);
    }

    return transformed;
  }

  /**
   * Ensure proper exports
   */
  ensureExports(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.blue('📦 Ensuring exports...\n'));
    }

    // Check if file already has exports
    if (sourceCode.includes('export {') || sourceCode.includes('export default')) {
      if (this.config.debugMode) {
        console.log(chalk.green('✓ Exports already present\n'));
      }
      return sourceCode;
    }

    // Collect all top-level classes and functions
    const classes = [];
    const functions = [];

    for (const [name, metadata] of this.result.widgets) {
      classes.push(name);
    }

    // Find top-level functions
    const funcRegex = /^function\s+(\w+)|^const\s+(\w+)\s*=|^let\s+(\w+)\s*=/gm;
    let match;
    while ((match = funcRegex.exec(sourceCode)) !== null) {
      const name = match[1] || match[2] || match[3];
      if (name && name !== 'main') {
        functions.push(name);
      }
    }

    // Always export main function
    classes.push('main');

    // Generate export statement
    const allExports = [...new Set([...classes, ...functions])];
    const exportStmt = `\n\nexport {\n  ${allExports.join(',\n  ')}\n};\n`;

    if (this.config.debugMode) {
      console.log(chalk.gray(`Adding exports for: ${allExports.join(', ')}\n`));
    }

    const result = sourceCode + exportStmt;

    this.result.exports = allExports;

    return result;
  }

  /**
   * Rewrite package imports
   * package:flutterjs_seo/flutterjs_seo.js -> @flutterjs/seo
   */
  rewriteImports(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.blue('🔄 Rewriting package imports...\n'));
    }

    // specific fix for flutterjs_seo
    // Regex matches: './package:flutterjs_seo/flutterjs_seo.js'
    const packageRegex = /(['"])(?:\.\/)?package:([a-zA-Z0-9_]+)\/(.+?)\1/g;

    let transformed = sourceCode;
    let count = 0;

    transformed = transformed.replace(packageRegex, (match, quote, pkgName, path) => {
      // Heuristic: flutterjs_seo -> @flutterjs/seo
      let newPkgName = pkgName;
      if (pkgName.startsWith('flutterjs_')) {
        newPkgName = '@flutterjs/' + pkgName.replace('flutterjs_', '');
      }

      // Explicit fix for seo package
      if (pkgName === 'flutterjs_seo') {
        return `${quote}@flutterjs/seo${quote}`;
      }

      // If path matches package name (index), simplify
      // e.g. flutterjs_seo/flutterjs_seo.js -> @flutterjs/seo
      const pathBase = path.replace('.js', '');
      let newImport = match;

      if (pathBase === pkgName) {
        newImport = `${quote}${newPkgName}${quote}`;
      } else {
        newImport = `${quote}${newPkgName}/${path}${quote}`;
      }

      if (this.config.debugMode) {
        console.log(chalk.green(`  Mapped: ${pkgName} -> ${newPkgName}`));
        console.log(chalk.gray(`    ${match} -> ${newImport}`));
      }

      count++;
      return newImport;
    });

    if (this.config.debugMode) {
      console.log(chalk.gray(`\nRewrote ${count} package imports\n`));
    }

    return transformed;
  }

  /**
   * Transform setState calls
   */
  transformSetStateCalls(sourceCode) {
    if (this.config.debugMode) {
      console.log(chalk.blue('🔧 Transforming setState calls...\n'));
    }

    // Match this.setState(() => { ... })
    const setStateRegex = /this\.setState\(\s*\(\s*\)\s*=>\s*\{([^}]*)\}\s*\)/g;

    let transformed = sourceCode;
    let count = 0;

    transformed = transformed.replace(setStateRegex, (match, body) => {
      // Extract state changes from body
      const updates = this.extractStateUpdates(body);
      const updateObj = JSON.stringify(updates);

      const replacement = `this.__setState(${updateObj})`;

      count++;

      if (this.config.debugMode) {
        console.log(chalk.green(`✓ Found setState at: ${match.substring(0, 50)}...`));
      }

      return replacement;
    });

    if (this.config.debugMode) {
      console.log(chalk.gray(`\nTransformed ${count} setState calls\n`));
    }

    return transformed;
  }

  /**
   * Extract state updates from setState body
   */
  extractStateUpdates(body) {
    const updates = {};

    // Match patterns like: this._counter++, this._text = 'value'
    const patterns = [
      /this\.(\w+)\+\+/g,           // this._counter++
      /this\.(\w+)--/g,             // this._counter--
      /this\.(\w+)\s*=\s*([^;]+)/g  // this._counter = 5
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const fieldName = match[1];
        const value = match[2] || '1';
        updates[fieldName] = value.trim();
      }
    }

    return updates;
  }

  /**
   * Print transformation summary
   */
  printSummary() {
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.blue('TRANSFORMATION SUMMARY'));
    console.log(chalk.blue('='.repeat(60)));

    console.log(chalk.gray(`\nWidgets Found: ${this.result.widgets.size}`));

    for (const [name, metadata] of this.result.widgets) {
      console.log(chalk.gray(`  ${name} (${metadata.type})`));
      if (metadata.hasBuildMethod) {
        console.log(chalk.gray(`    ✓ build()`));
      }
      if (metadata.hasInitState) {
        console.log(chalk.gray(`    ✓ initState()`));
      }
      if (metadata.hasDispose) {
        console.log(chalk.gray(`    ✓ dispose()`));
      }
    }

    console.log(chalk.gray(`\nTransformations Applied: ${this.result.transformations.length}`));
    for (const transform of this.result.transformations) {
      console.log(chalk.gray(`  • ${transform.type} - ${transform.name}`));
    }

    console.log(chalk.gray(`\nExports: ${this.result.exports.join(', ')}`));

    if (this.result.errors.length > 0) {
      console.log(chalk.red(`\nErrors: ${this.result.errors.length}`));
      for (const error of this.result.errors) {
        console.log(chalk.red(`  ✗ ${error}`));
      }
    }

    if (this.result.warnings.length > 0) {
      console.log(chalk.yellow(`\nWarnings: ${this.result.warnings.length}`));
      for (const warning of this.result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    }

    if (!this.result.hasErrors()) {
      console.log(chalk.green('\n✅ Transformation successful!\n'));
    } else {
      console.log(chalk.red('\n❌ Transformation completed with errors\n'));
    }

    console.log(chalk.blue('='.repeat(60) + '\n'));
  }

  /**
   * Get transformed code
   */
  getTransformedCode() {
    return this.result.transformedCode;
  }

  /**
   * Get detailed report
   */
  getReport() {
    return {
      success: !this.result.hasErrors(),
      widgets: Array.from(this.result.widgets.entries()).map(([name, meta]) => ({
        name: meta.name,
        type: meta.type,
        superClass: meta.superClass,
        methods: Array.from(meta.methods.keys()),
        hasBuild: meta.hasBuildMethod,
        hasInitState: meta.hasInitState,
        hasDispose: meta.hasDispose
      })),
      transformations: this.result.transformations.map(t => ({
        type: t.type,
        name: t.name,
        lineStart: t.lineStart,
        lineEnd: t.lineEnd
      })),
      exports: this.result.exports,
      errors: this.result.errors,
      warnings: this.result.warnings
    };
  }

  /**
   * Get transformation statistics
   */
  getStats() {
    return {
      widgetsTransformed: this.result.widgets.size,
      transformationsApplied: this.result.transformations.length,
      exportsGenerated: this.result.exports.length,
      errors: this.result.errors.length,
      warnings: this.result.warnings.length
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CodeTransformer,
  WidgetMetadata,
  Transformation,
  TransformResult
};