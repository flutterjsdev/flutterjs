import { Lexer } from '../src/ats/lexer.js';
import { Parser } from '../src/ats/flutterjs_parser.js';

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

console.log('🔍 DIAGNOSTIC TEST\n');
console.log('Source Code:');
console.log(source);
console.log('\n' + '='.repeat(70) + '\n');

// Lex
const lexer = new Lexer(source);
const tokens = lexer.tokenize();

console.log('📊 TOKEN ANALYSIS:\n');
console.log(`Total tokens: ${tokens.length}`);

// Find class and function tokens
const classTokens = tokens.filter((t) => t.type === 'KEYWORD' && t.value === 'class');
const functionTokens = tokens.filter((t) => t.type === 'KEYWORD' && t.value === 'function');
const importTokens = tokens.filter((t) => t.type === 'KEYWORD' && t.value === 'import');

console.log(`Class keywords found: ${classTokens.length}`);
console.log(`Function keywords found: ${functionTokens.length}`);
console.log(`Import keywords found: ${importTokens.length}`);

console.log('\n' + '='.repeat(70) + '\n');

// Parse
const parser = new Parser(tokens);
const ast = parser.parse();

console.log('📊 AST ANALYSIS:\n');
console.log(`Total body items: ${ast.body.length}`);

console.log('\nBody items:');
ast.body.forEach((item, idx) => {
    console.log(`  [${idx}] ${item.type}`);
    if (item.type === 'ImportDeclaration') {
        console.log(`       Source: ${item.source.value}`);
    }
    if (item.type === 'ClassDeclaration') {
        console.log(`       Name: ${item.id.name}`);
        console.log(`       Extends: ${item.superClass?.name}`);
        console.log(`       Fields: ${item.body.fields.length}`);
        console.log(`       Methods: ${item.body.methods.length}`);
    }
    if (item.type === 'FunctionDeclaration') {
        console.log(`       Name: ${item.id?.name}`);
    }
});

console.log('\n' + '='.repeat(70) + '\n');

if (parser.getErrors().length > 0) {
    console.log('❌ PARSER ERRORS:\n');
    parser.getErrors().forEach((err) => {
        console.log(`  - ${err.message}`);
    });
} else {
    console.log('✅ No parser errors\n');
}

console.log('\n' + '='.repeat(70) + '\n');
console.log('Full AST (filtered):');
console.log(JSON.stringify(ast, (key, value) => {
    if (key === 'location') return undefined;
    if (key === 'body' && Array.isArray(value)) {
        return value.map((item) => ({
            type: item.type,
            name: item.id?.name || item.key?.name,
            ...(item.superClass && { superClass: item.superClass.name }),
        }));
    }
    return value;
}, 2));