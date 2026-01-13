# Using the Analyzer

The analyzer can be used as a CLI tool or programmatically as a library.

## CLI Usage

Run the analyzer directly on a source file:

```bash
# Basic analysis
node analyzer.js src/main.js

# Output to detailed JSON file
node analyzer.js src/main.js --output report.json --format json

# Check for SSR compatibility only
node analyzer.js src/main.js --phase1 --no-imports --no-context
```

### Options

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Path to save the report |
| `-f, --format <fmt>` | `json`, `markdown`, or `console` |
| `--debug <level>` | Log level: `trace`, `debug`, `info` |
| `--phase1` | Run only structural analysis (fastest) |
| `--no-ssr` | Skip SSR validation checks |

## Programmatic Usage

Import the `Analyzer` class to run analysis within your own Node.js tools (e.g., in a webpack plugin or build script).

```javascript
import { Analyzer, analyzeCode } from '@flutterjs/analyzer';

// 1. Analyze a string of code
const code = `
class MyApp extends StatelessWidget {
  build(context) { return Text('Hi'); }
}
`;

const results = await analyzeCode(code, {
  includeSsr: true,
  strict: false
});

console.log(`Found ${results.widgets.count} widgets`);

// 2. Analyze a file with fine-grained control
const analyzer = new Analyzer({
  sourceFile: './src/app.js',
  verbose: true,
  debugLevel: 'warn'
});

const fullReport = await analyzer.analyze();
```

## Output Structure

The analysis result is a comprehensive JSON object:

```javascript
{
  "widgets": {
    "stateless": ["MyApp", "Header"],
    "stateful": ["Counter"],
    "all": [ ... ] // Full AST details
  },
  "state": {
    "setStateCalls": 5
  },
  "ssr": {
    "compatibility": "high",
    "unsafePatterns": []
  },
  "imports": { ... }
}
```
