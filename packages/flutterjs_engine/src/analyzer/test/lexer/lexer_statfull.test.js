import { Lexer } from '../../src/ats/lexer.js';   // Adjust path if needed

const source = `
class HomePage extends StatefulWidget {
  createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  build(context) {
    final theme = ThemeProvider.of(context);
    final counter = context.watch<CounterNotifier>();
    
    return Scaffold({
      appBar: new AppBar({
        backgroundColor: theme.primaryColor
      }),
      body: new Center({
        child: new Text({ 
          data: "Count: \${counter.count}"
        })
      })
    });
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