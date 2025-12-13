import { Lexer } from '../src/ats/lexer.js';
import { Parser } from '../src/ats/flutterjs_parser.js';

const source = `class MyApp extends StatelessWidget {
  build(context) {
    return Text("Hello");
  }
}

class MyHomePage extends StatelessWidget {
  title;

  constructor({ key = undefined, title } = {}) {
    this.title = title;
  }

  build(context) {
    return Scaffold({
      appBar: new AppBar({ title: new Text({ data: "Demo" }) }),
      body: new Center({
        child: new Text({ data: "Hello World" })
      })
    });
  }
}

function main() {
  runApp(new MyApp());
}

const buildUserCard = (name, age) => Card({ child: Text(name) });
`;

console.log('🔍 Testing Parser...\n');
console.log('Input Source:');
console.log(source);
console.log('\n' + '='.repeat(60) + '\n');

// Step 1: Tokenize
console.log('📝 Step 1: Lexing...\n');
const lexer = new Lexer(source);
const tokens = lexer.tokenize();
console.log(`✅ Tokenization complete: ${tokens.length} tokens\n`);

// Step 2: Parse
console.log('📝 Step 2: Parsing...\n');
const parser = new Parser(tokens);
const ast = parser.parse();
console.log(`✅ Parsing complete\n`);

// Check for errors
if (parser.getErrors().length > 0) {
  console.log('❌ Parsing errors found:');
  parser.getErrors().forEach(err => {
    console.log(`  - ${err.message}`);
  });
} else {
  console.log('✅ No parsing errors\n');
}

// Step 3: Display AST structure
console.log('📊 AST Structure:\n');
console.log(JSON.stringify(ast, (key, value) => {
  // Skip some verbose properties for readability
  if (key === 'location') return undefined;
  return value;
}, 2));

console.log('\n' + '='.repeat(60) + '\n');

// Step 4: Summary
console.log('📊 Summary:');
console.log(`  Program body items: ${ast.body.length}`);

// Count different statement types
const classCount = ast.body.filter(n => n.type === 'ClassDeclaration').length;
const funcCount = ast.body.filter(n => n.type === 'FunctionDeclaration').length;
const exprCount = ast.body.filter(n => n.type === 'ExpressionStatement').length;

console.log(`  Classes: ${classCount}`);
console.log(`  Functions: ${funcCount}`);
console.log(`  Expressions: ${exprCount}`);
console.log(`  Errors: ${parser.getErrors().length}`);
