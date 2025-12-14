import { Lexer } from '../../src/ats/lexer.js';
import { Parser } from '../../src/ats/flutterjs_parser.js';
import { WidgetAnalyzer } from '../../src/ats/flutterjs_widget_analyzer.js';

const source = `
import { MaterialApp, Text, Container } from '@flutterjs/material';

class MyApp extends StatelessWidget {
  build(context) {
    return MaterialApp({
      title: "Flutter Demo",
      home: new Container()
    });
  }
}

class MyHomePage extends StatelessWidget {
  title;

  build(context) {
    return Container({
      child: new Text()
    });
  }
}

function main() {
  runApp(new MyApp());
}
`;

console.log('🔍 Testing Widget Analyzer...\n');
console.log('Input Source:');
console.log(source);
console.log('\n' + '='.repeat(60) + '\n');

// Step 1: Lex
console.log('📝 Step 1: Lexing...\n');
const lexer = new Lexer(source);
const tokens = lexer.tokenize();
console.log(`✅ Tokenization complete: ${tokens.length} tokens\n`);

// Step 2: Parse
console.log('📝 Step 2: Parsing...\n');
const parser = new Parser(tokens);
const ast = parser.parse();
console.log(`✅ Parsing complete\n`);

if (parser.getErrors().length > 0) {
  console.log('⚠️  Parse warnings:');
  parser.getErrors().forEach(err => {
    console.log(`  - ${err.message}`);
  });
  console.log();
}

// Step 3: Analyze
console.log('📝 Step 3: Widget Analysis...\n');
const analyzer = new WidgetAnalyzer(ast);
const analysis = analyzer.analyze();
console.log(`✅ Analysis complete\n`);

// Step 4: Display Results
console.log('📊 Analysis Results:\n');

console.log('Widgets Found:');
analysis.widgets.forEach(widget => {
  console.log(`  - ${widget.name} (${widget.type})`);
  if (widget.superClass) {
    console.log(`    extends: ${widget.superClass}`);
  }
  if (widget.methods.length > 0) {
    console.log(`    methods: ${widget.methods.map(m => m.name).join(', ')}`);
  }
  if (widget.properties.length > 0) {
    console.log(`    properties: ${widget.properties.map(p => p.name).join(', ')}`);
  }
});

console.log('\nFunctions Found:');
analysis.functions.forEach(func => {
  console.log(`  - ${func.name}(${func.params.map(p => p.name).join(', ')})`);
  if (func.isEntryPoint) {
    console.log(`    [ENTRY POINT]`);
  }
});

console.log('\nImports:');
analysis.imports.forEach(imp => {
  console.log(`  from ${imp.source}:`);
  console.log(`    ${imp.items.join(', ')}`);
});

console.log('\nDependencies:');
console.log(`  External: ${Array.from(analysis.externalDependencies).join(', ')}`);

console.log('\nEntry Point:');
console.log(`  ${analysis.entryPoint || 'none'}`);

console.log('\nRoot Widget:');
console.log(`  ${analysis.rootWidget || 'none'}`);

console.log('\nWidget Tree:');
if (analysis.widgetTree) {
  analyzer.printWidgetTree();
} else {
  console.log('  (no tree)');
}

console.log('\n' + '='.repeat(60) + '\n');

// Step 5: Summary
const summary = analyzer.getSummary();
console.log('📊 Summary Statistics:\n');
console.log(`  Total Widgets: ${summary.totalWidgets}`);
console.log(`    - Stateless: ${summary.statelessWidgets}`);
console.log(`    - Stateful: ${summary.statefulWidgets}`);
console.log(`    - Components: ${summary.componentWidgets}`);
console.log(`  Total Functions: ${summary.totalFunctions}`);
console.log(`  Total Imports: ${summary.totalImports}`);
console.log(`  External Packages: ${summary.externalPackages}`);
console.log(`  Entry Point: ${summary.entryPoint}`);
console.log(`  Root Widget: ${summary.rootWidget}`);
console.log(`  Widget Tree Depth: ${summary.widgetTreeDepth}`);

console.log('\n📋 Full Analysis (JSON):\n');
console.log(JSON.stringify({
  widgets: analysis.widgets.map(w => ({ name: w.name, type: w.type })),
  functions: analysis.functions.map(f => ({ name: f.name, isEntryPoint: f.isEntryPoint })),
  imports: analysis.imports,
  externalDependencies: analysis.externalDependencies,
  entryPoint: analysis.entryPoint,
  rootWidget: analysis.rootWidget,
  widgetTree: analyzer.treeToObject(),
}, null, 2));
