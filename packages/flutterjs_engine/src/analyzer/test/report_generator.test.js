import { Lexer } from '../src/ats/lexer.js';
import { Parser } from '../src/ats/flutterjs_parser.js';
import { WidgetAnalyzer } from '../src/ats/flutterjs_widget_analyzer.js';
import { ReportGenerator } from '../src/ats/flutterjs_report_generator.js';

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

console.log('🔍 Testing Report Generator...\n');

// Step 1: Lex
const lexer = new Lexer(source);
const tokens = lexer.tokenize();

// Step 2: Parse
const parser = new Parser(tokens);
const ast = parser.parse();

// Step 3: Analyze
const analyzer = new WidgetAnalyzer(ast);
const analysis = analyzer.analyze();

console.log('📝 Step 1: Generating JSON Report...\n');
const jsonReporter = new ReportGenerator(analysis, {
  format: 'json',
  includeMetrics: true,
  includeTree: true,
  includeSuggestions: true,
  prettyPrint: true,
});
const jsonReport = jsonReporter.generate();
console.log(jsonReport);

console.log('\n' + '='.repeat(70) + '\n');

console.log('📝 Step 2: Generating Markdown Report...\n');
const mdReporter = new ReportGenerator(analysis, {
  format: 'markdown',
  includeSuggestions: true,
});
const mdReport = mdReporter.generate();
console.log(mdReport);

console.log('='.repeat(70) + '\n');

console.log('📝 Step 3: Generating Console Report...\n');
const consoleReporter = new ReportGenerator(analysis, {
  format: 'console',
  includeSuggestions: true,
});
const consoleReport = consoleReporter.generate();
console.log(consoleReport);

console.log('✅ All reports generated successfully!');
