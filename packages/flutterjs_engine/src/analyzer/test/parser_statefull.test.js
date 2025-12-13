/**
 * Detailed diagnostic to identify exact parsing issues
 */

import { Lexer } from '../src/ats/lexer.js';
import { Parser } from '../src/ats/flutterjs_parser.js';

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

const lexer = new Lexer(source);
const tokens = lexer.tokenize();

// Print tokens with line numbers
console.log('\n=== TOKENS BY LINE ===\n');
const lines = source.split('\n');
lines.forEach((line, lineIdx) => {
  const lineNum = lineIdx + 1;
  const lineTokens = tokens.filter(t => t.line === lineNum);
  
  console.log(`Line ${lineNum}: ${line}`);
  if (lineTokens.length > 0) {
    lineTokens.forEach(t => {
      console.log(`  [${t.column}] ${t.type} = "${t.value}"`);
    });
  }
  console.log('');
});

// Now show what's at the error lines
console.log('\n=== ERROR LOCATIONS ===\n');
const errorLines = [4, 16, 22, 23];
errorLines.forEach(lineNum => {
  console.log(`\n--- Line ${lineNum} (Column 8) ---`);
  const line = lines[lineNum - 1];
  console.log(`Source: "${line}"`);
  
  const lineTokens = tokens.filter(t => t.line === lineNum);
  console.log(`Tokens on this line:`);
  lineTokens.forEach(t => {
    const marker = t.column === 8 ? ' <-- ERROR HERE' : '';
    console.log(`  Col ${t.column}: ${t.type} = "${t.value}"${marker}`);
  });
});