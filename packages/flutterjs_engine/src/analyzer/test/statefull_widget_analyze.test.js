/**
 * Diagnostic for WidgetAnalyzer
 * Understand why widgets are not being detected
 */

import { Lexer } from '../src/ats/lexer.js';
import { Parser } from '../src/ats/flutterjs_parser.js';
import { WidgetAnalyzer } from '../src/ats/flutterjs_widget_analyzer.js';

const source = `
class MyCounter extends StatefulWidget {
  constructor({ key = undefined } = {}) {
    this.key = key;
  }
  
  createState() {
    return new _MyCounterState();
  }
}

class _MyCounterState extends State<MyCounter> {
  _count = 0;
  
  _incrementCounter() {
    this.setState(() => {
      this._count++;
    });
  }
  
  build(context) {
    return Text({ data: "Count: " + this._count });
  }
}

function main() {
  runApp(new MyCounter());
}
`;

console.log('🔍 WIDGET ANALYZER DIAGNOSTIC\n');
console.log('='.repeat(70) + '\n');

// Step 1: Lex
const lexer = new Lexer(source);
const tokens = lexer.tokenize();
console.log(`Step 1: LEXER`);
console.log(`  Tokens: ${tokens.length}`);
console.log('');

// Step 2: Parse
const parser = new Parser(tokens);
const ast = parser.parse();
// ⭐ ADD THIS - Check for parse errors
console.log('\n🔴 PARSER ERRORS:\n');
if (parser.errors.length > 0) {
    parser.errors.forEach((error, idx) => {
        console.log(`[${idx}] ${error.message}`);
        console.log(`    Stack: ${error.stack?.split('\n')[1]}`);
    });
} else {
    console.log('✓ No parser errors reported');
}

console.log('\nAST Body Items:', ast.body.length);
console.log(`Step 2: PARSER`);
console.log(`  AST Body Items: ${ast.body.length}\n`);

console.log('  Body Structure:');
ast.body.forEach((node, idx) => {
    console.log(`    [${idx}] ${node.type}`);

    if (node.type === 'ClassDeclaration') {
        console.log(`        Name: ${node.id?.name}`);
        console.log(`        SuperClass: ${node.superClass?.name}`);
        console.log(`        Body.fields: ${node.body?.fields?.length || 0}`);
        console.log(`        Body.methods: ${node.body?.methods?.length || 0}`);

        if (node.body?.methods) {
            node.body.methods.forEach((method) => {
                console.log(`          - Method: ${method.key?.name}`);
            });
        }
    }

    if (node.type === 'FunctionDeclaration') {
        console.log(`        Name: ${node.id?.name}`);
    }
});
console.log('');

// Step 3: Widget Analysis
console.log(`Step 3: WIDGET ANALYZER`);
console.log('');

console.log('  Creating analyzer...');
const analyzer = new WidgetAnalyzer(ast);

console.log('  Calling analyze()...');
const results = analyzer.analyze();

console.log(`  Results:`);
console.log(`    Total widgets: ${results.widgets.length}`);
console.log(`    Widgets array: ${Array.isArray(results.widgets)}`);
console.log('');

if (results.widgets.length > 0) {
    console.log('  Widgets found:');
    results.widgets.forEach((w) => {
        console.log(`    - ${w.name} (${w.type})`);
    });
} else {
    console.log('  ❌ NO WIDGETS FOUND - Investigating...\n');

    // Debug the analyzer internals
    console.log('  Checking analyzer internals:');
    console.log(`    analyzer.widgets size: ${analyzer.widgets.size}`);

    // Manually check AST for classes
    console.log('\n  Checking AST for ClassDeclaration nodes:');
    ast.body.forEach((node) => {
        if (node.type === 'ClassDeclaration') {
            console.log(`    Found class: ${node.id?.name}`);
            console.log(`      SuperClass: ${node.superClass?.name}`);

            // Check if it's a widget type
            const superClass = node.superClass?.name;
            if (superClass === 'StatelessWidget') {
                console.log(`      ✓ Is StatelessWidget`);
            } else if (superClass === 'StatefulWidget') {
                console.log(`      ✓ Is StatefulWidget`);
            } else if (superClass?.startsWith('State')) {
                console.log(`      ✓ Is State class`);
            } else {
                console.log(`      - Not a Flutter widget class (extends ${superClass})`);
            }
        }
    });
}

console.log('');
console.log('='.repeat(70) + '\n');

console.log('🔧 ANALYSIS:');
console.log('');
console.log('The WidgetAnalyzer.analyze() should:');
console.log('  1. Loop through ast.body');
console.log('  2. Find ClassDeclaration nodes');
console.log('  3. Extract classes and store in this.widgets Map');
console.log('  4. Return array of widgets from this.widgets');
console.log('');

console.log('If widgets are 0, check:');
console.log('  ✓ Are ClassDeclarations in ast.body? YES - ' + (ast.body.some(n => n.type === 'ClassDeclaration') ? 'FOUND' : 'NOT FOUND'));
console.log('  ✓ Are they being extracted? Need to check extractClassesAndFunctions()');
console.log('  ✓ Are they being returned? Check getResults() or analyze()');
console.log('');

// Print full AST for inspection
console.log('='.repeat(70) + '\n');
console.log('FULL AST (filtered for readability):\n');
console.log(JSON.stringify(ast, (key, value) => {
    if (key === 'location') return undefined;
    if (key === 'body' && Array.isArray(value) && value.length > 10) {
        return `[Array of ${value.length} items]`;
    }
    return value;
}, 2).substring(0, 2000));