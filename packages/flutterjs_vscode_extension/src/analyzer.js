class FJSAnalyzer {
  constructor() {
    // Flutter Material Components
    this.flutterWidgets = {
      // Layout
      'Scaffold': { package: '@flutterjs/material', type: 'widget' },
      'AppBar': { package: '@flutterjs/material', type: 'widget' },
      'Container': { package: '@flutterjs/material', type: 'widget' },
      'Column': { package: '@flutterjs/material', type: 'widget' },
      'Row': { package: '@flutterjs/material', type: 'widget' },
      'Center': { package: '@flutterjs/material', type: 'widget' },
      'Padding': { package: '@flutterjs/material', type: 'widget' },
      'Expanded': { package: '@flutterjs/material', type: 'widget' },
      'Stack': { package: '@flutterjs/material', type: 'widget' },
      'SingleChildScrollView': { package: '@flutterjs/material', type: 'widget' },
      
      // Lists & Builders
      'ListView': { package: '@flutterjs/material', type: 'widget' },
      'GridView': { package: '@flutterjs/material', type: 'widget' },
      'ListView.builder': { package: '@flutterjs/material', type: 'widget' },
      'ListView.separated': { package: '@flutterjs/material', type: 'widget' },
      
      // Input & Form
      'TextField': { package: '@flutterjs/material', type: 'widget' },
      'TextFormField': { package: '@flutterjs/material', type: 'widget' },
      'ElevatedButton': { package: '@flutterjs/material', type: 'widget' },
      'TextButton': { package: '@flutterjs/material', type: 'widget' },
      'IconButton': { package: '@flutterjs/material', type: 'widget' },
      'FloatingActionButton': { package: '@flutterjs/material', type: 'widget' },
      'Checkbox': { package: '@flutterjs/material', type: 'widget' },
      'Radio': { package: '@flutterjs/material', type: 'widget' },
      'DropdownButton': { package: '@flutterjs/material', type: 'widget' },
      
      // Display
      'Text': { package: '@flutterjs/material', type: 'widget' },
      'Image': { package: '@flutterjs/material', type: 'widget' },
      'Icon': { package: '@flutterjs/material', type: 'widget' },
      'Card': { package: '@flutterjs/material', type: 'widget' },
      'ListTile': { package: '@flutterjs/material', type: 'widget' },
      'Divider': { package: '@flutterjs/material', type: 'widget' },
      'CircleAvatar': { package: '@flutterjs/material', type: 'widget' },
      'SizedBox': { package: '@flutterjs/material', type: 'widget' },
      
      // Navigation
      'MaterialApp': { package: '@flutterjs/material', type: 'widget' },
      'Navigator': { package: '@flutterjs/material', type: 'widget' },
      'GestureDetector': { package: '@flutterjs/material', type: 'widget' },
      
      // Providers
      'ChangeNotifier': { package: '@flutterjs/provider', type: 'class' },
      'Provider': { package: '@flutterjs/provider', type: 'widget' },
      'ChangeNotifierProvider': { package: '@flutterjs/provider', type: 'widget' },
      'Consumer': { package: '@flutterjs/provider', type: 'widget' },
      
      // State Management
      'StatelessWidget': { package: '@flutterjs/material', type: 'class' },
      'StatefulWidget': { package: '@flutterjs/material', type: 'class' },
      'State': { package: '@flutterjs/material', type: 'class' },
      
      // Theme & Styling
      'ThemeData': { package: '@flutterjs/material', type: 'class' },
      'TextStyle': { package: '@flutterjs/material', type: 'class' },
      'BoxDecoration': { package: '@flutterjs/material', type: 'class' },
      'BorderRadius': { package: '@flutterjs/material', type: 'class' },
      'Colors': { package: '@flutterjs/material', type: 'class' },
      'EdgeInsets': { package: '@flutterjs/material', type: 'class' },
      'MainAxisAlignment': { package: '@flutterjs/material', type: 'class' },
      'CrossAxisAlignment': { package: '@flutterjs/material', type: 'class' },
    };

    this.dartGlobals = {
      'jsonDecode': '@flutterjs/convert',
      'jsonEncode': '@flutterjs/convert',
      'runApp': '@flutterjs/material',
      'main': '@flutterjs/material',
      'DateTime': '@flutterjs/core',
      'setState': '@flutterjs/material',
    };

    // Runtime Helper Functions
    this.runtimeHelpers = {
      'listCast': { package: '@flutterjs/runtime', type: 'helper', description: 'Type-safe list casting' },
      'mapCast': { package: '@flutterjs/runtime', type: 'helper', description: 'Type-safe map casting' },
      'typeCheck': { package: '@flutterjs/runtime', type: 'helper', description: 'Runtime type checking' },
      'assertType': { package: '@flutterjs/runtime', type: 'helper', description: 'Assert type at runtime' },
      'isType': { package: '@flutterjs/runtime', type: 'helper', description: 'Check if value is type' },
      'castObject': { package: '@flutterjs/runtime', type: 'helper', description: 'Safe object casting' },
      'validateType': { package: '@flutterjs/runtime', type: 'helper', description: 'Validate type with error' },
      'TypeErrorException': { package: '@flutterjs/runtime', type: 'class', description: 'Type error exception' },
      'CastException': { package: '@flutterjs/runtime', type: 'class', description: 'Cast exception' },
    };

    this.widgetPattern = /\b([A-Z][a-zA-Z0-9]*)\s*\(/g;
    this.methodCallPattern = /(\w+)\s*\(/g;
    this.generatedMarker = /Generated from Dart IR|Generated by FlutterJS/i;
  }

  analyze(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    const imports = this.extractImports(lines);
    const usedComponents = this.extractUsedComponents(lines);

    // Check if file is generated (skip certain validations)
    const isGenerated = this.isGeneratedFile(lines);

    // 1. Find all undefined widget/class usages
    for (const [component, locations] of usedComponents) {
      if (!imports.has(component) && !this.isBuiltinJS(component)) {
        const pkg = this.flutterWidgets[component];
        if (pkg) {
          locations.forEach(({ line, column }) => {
            if (lines[line].includes('import') && lines[line].includes('from')) {
              return;
            }

            issues.push({
              line,
              column,
              length: component.length,
              message: `Widget "${component}" used but not imported`,
              code: 'MISSING-WIDGET-IMPORT',
              severity: 'error',
              fix: {
                package: pkg.package,
                importType: this.getImportType(component, pkg),
              },
            });
          });
        }
      }
    }

    // 2. Check for unused imports
    const unusedImports = this.findUnusedImports(imports, content, lines);
    unusedImports.forEach(imp => {
      issues.push({
        line: imp.line,
        column: imp.column,
        length: imp.length,
        message: `Unused import: "${imp.name}"`,
        code: 'UNUSED-IMPORT',
        severity: 'warning',
      });
    });

    // 3. Check for Dart-specific syntax not converted
    if (!isGenerated) {
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes('import')) {
          issues.push(...this.checkDartSyntax(lines[i], i));
        }
      }
    }

    // 4. Check missing global functions
    for (const [global, pkg] of Object.entries(this.dartGlobals)) {
      if (global === 'main') continue;

      const regex = new RegExp(`\\b${global}\\s*\\(`, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (!imports.has(global)) {
          const lineNum = content.substring(0, match.index).split('\n').length - 1;
          
          if (lines[lineNum].includes('import') || this.isInComment(lines[lineNum])) {
            continue;
          }

          issues.push({
            line: lineNum,
            column: match.index,
            length: global.length,
            message: `Function "${global}()" used but not imported from '${pkg}'`,
            code: 'MISSING-FUNCTION-IMPORT',
            severity: 'error',
            fix: {
              package: pkg,
              importType: 'named',
            },
          });
        }
      }
    }

    // 5. Check missing runtime helpers
    for (const [helper, helperInfo] of Object.entries(this.runtimeHelpers)) {
      const regex = new RegExp(`\\b${helper}\\s*\\(`, 'g');
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (!imports.has(helper)) {
          const lineNum = content.substring(0, match.index).split('\n').length - 1;
          
          if (lines[lineNum].includes('import') || this.isInComment(lines[lineNum])) {
            continue;
          }

          issues.push({
            line: lineNum,
            column: match.index,
            length: helper.length,
            message: `Runtime helper "${helper}()" used but not imported from '${helperInfo.package}'`,
            code: 'MISSING-RUNTIME-HELPER',
            severity: 'error',
            fix: {
              package: helperInfo.package,
              importType: 'named',
            },
          });
        }
      }
    }

    return issues;
  }

  extractImports(lines) {
    const imports = new Set();
    const fullText = lines.join('\n');

    const multilineImportRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/gs;
    let match;
    while ((match = multilineImportRegex.exec(fullText)) !== null) {
      const items = match[1]
        .split(',')
        .map(i => i.trim().split(' as ')[0].split('//')[0].trim())
        .filter(i => i && !i.startsWith('//'));
      items.forEach(item => imports.add(item));
    }

    const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = defaultImportRegex.exec(fullText)) !== null) {
      imports.add(match[1]);
    }

    const namespaceRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = namespaceRegex.exec(fullText)) !== null) {
      imports.add(match[1]);
    }

    return imports;
  }

  extractUsedComponents(lines) {
    const used = new Map();

    lines.forEach((line, lineNum) => {
      if (this.isInComment(line)) return;

      const pattern = /(?:new\s+)?([A-Z][a-zA-Z0-9]*)\s*\(/g;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        const component = match[1];
        if (!this.isInCommentOrString(line, match.index).isComment) {
          if (!used.has(component)) {
            used.set(component, []);
          }
          used.get(component).push({
            line: lineNum,
            column: match.index,
          });
        }
      }
    });

    return used;
  }

  checkDartSyntax(line, lineIndex) {
    const issues = [];
    const patterns = [
      {
        pattern: /\bconst\s+new\s+/,
        message: 'Dart syntax: `const new` → convert to `new` (const ensures immutability in Dart, new instantiates in JS)',
        code: 'DART-SYNTAX-CONST-NEW',
        severity: 'warning',
      },
      {
        pattern: /runApp\s*\(\s*(?:const\s+)?new\s+/,
        message: '`runApp(const new Widget())` → use `runApp(new Widget())` (remove const for JS)',
        code: 'RUNAPP-CONST-USAGE',
        severity: 'warning',
      },
      {
        pattern: /}\s*\(\s*\)/,
        message: 'Invalid syntax `}()` - remove or fix immediately-invoked function expression',
        code: 'INVALID-IIFE-SYNTAX',
        severity: 'error',
      },
      {
        pattern: /\bfinal\s+\w+\s*=/,
        message: 'Dart keyword `final` detected - use `const` or `let`',
        code: 'DART-SYNTAX-FINAL',
        severity: 'warning',
      },
      {
        pattern: /\blate\s+\w+/,
        message: 'Dart keyword `late` detected - convert to `let` with proper initialization',
        code: 'DART-SYNTAX-LATE',
        severity: 'warning',
      },
      {
        pattern: /\brequired\s+/,
        message: 'Dart keyword `required` detected - use JS destructuring defaults',
        code: 'DART-SYNTAX-REQUIRED',
        severity: 'warning',
      },
      {
        pattern: /@override/,
        message: 'Dart annotation `@override` detected - not needed in JavaScript',
        code: 'DART-SYNTAX-OVERRIDE',
        severity: 'warning',
      },
      {
        pattern: /\bconst\s+(?!new\s+)/,
        message: 'Dart keyword `const` detected - use `const` or `let` as appropriate',
        code: 'DART-SYNTAX-CONST',
        severity: 'warning',
      },
    ];

    patterns.forEach(({ pattern, message, code, severity }) => {
      const match = pattern.exec(line);
      if (match && !this.isInCommentOrString(line, match.index).isComment) {
        issues.push({
          line: lineIndex,
          column: match.index,
          length: match[0].length,
          message,
          code,
          severity: severity || 'warning',
        });
      }
    });

    return issues;
  }

  findUnusedImports(imports, content, lines) {
    const unused = [];

    imports.forEach(imp => {
      const contentWithoutImports = content.replace(/import\s+.*from\s+['"][^'"]+['"]/g, '');
      const usagePattern = new RegExp(`\\b${imp}\\b`, 'g');

      if (!usagePattern.test(contentWithoutImports)) {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(imp) && lines[i].includes('import')) {
            const match = lines[i].indexOf(imp);
            unused.push({
              name: imp,
              line: i,
              column: match,
              length: imp.length,
            });
            break;
          }
        }
      }
    });

    return unused;
  }

  isGeneratedFile(lines) {
    return lines.slice(0, 10).some(line => this.generatedMarker.test(line));
  }

  isInComment(line) {
    return /^\s*(\/\/|\/\*|\*)/.test(line);
  }

  isInCommentOrString(line, position) {
    let inString = false;
    let stringChar = null;
    let inComment = false;

    for (let i = 0; i < position; i++) {
      const c = line[i];
      const next = line[i + 1];

      if (c === '\\') continue;

      if (inString && c === stringChar) {
        inString = false;
      } else if (!inString && (c === '"' || c === "'" || c === '`')) {
        inString = true;
        stringChar = c;
      } else if (!inString && c === '/' && next === '/') {
        inComment = true;
        break;
      }
    }

    return { isString: inString, isComment: inComment };
  }

  isBuiltinJS(name) {
    const builtins = ['Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Map', 'Set', 'WeakMap', 'WeakSet'];
    return builtins.includes(name);
  }

  getImportType(component, pkg) {
    if (pkg.type === 'widget' || pkg.type === 'class') {
      return 'named';
    }
    return 'default';
  }
}

module.exports = { FJSAnalyzer };