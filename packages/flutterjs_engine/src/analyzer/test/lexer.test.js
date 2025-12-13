import { Lexer } from '../src/ats/lexer.js';   // Adjust path if needed


const source = `
class MyApp extends StatelessWidget {
  build(context) {
    return Text("Hello");
  }
}
`;

const lexer = new Lexer(source);
const tokens = lexer.tokenize();
lexer.printTokens();

// Check for errors
if (lexer.getErrors().length > 0) {
  console.log('Lexing errors:', lexer.getErrors());
}