# Flutter.js Analyze Command

A comprehensive tool for analyzing Flutter-to-Web transpilation, providing insights into bundle analysis, widget usage, reactivity, and optimization suggestions.

## What `flutterjs analyze` Does

The `flutterjs analyze` command provides detailed insights into the Flutter-to-Web transpilation process, focusing on four key areas:

### 1. Bundle Analysis
Analyzes the output of the transpilation process:
- Reads `build/app.min.js` size
- Parses `build/styles.min.css`
- Calculates compression ratios
- Identifies largest components
- Shows bundle contents

### 2. Widget Usage Analysis
Parses Flutter source code to understand widget usage:
- Counts widget instances (e.g., `Container: 8×`, `Text: 12×`)
- Identifies which widgets will be transpiled
- Shows Material vs Cupertino usage
- Lists unsupported widgets (e.g., `CustomPaint`)

### 3. Reactivity Analysis
Analyzes reactive dependencies in the application:
- Counts `StatefulWidget` vs `StatelessWidget`
- Identifies `Provider`/`Riverpod` usage
- Maps state dependencies
- Estimates runtime size needed

### 4. Optimization Suggestions
Provides actionable suggestions based on analysis:
- "3 identical `Text` widgets could share CSS classes"
- "`Route X` could be lazy-loaded"
- "`Theme` not used, can remove 4KB"
- "Replace `CustomPaint` with SVG for 12KB savings"

## Practical Implementation Strategy

### Phase 1: Basic Bundle Analysis (Week 15-16)
Implement basic bundle analysis to read the `build/` directory and report file sizes and compression ratios.

```bash
flutterjs analyze
# Reads build/ directory
# Shows file sizes, compression ratios
# Simple but useful immediately
```

### Phase 2: Widget Detection (Week 17-18)
Add widget detection using the Phase 1 parser to count widget types and identify unsupported widgets.

```bash
# Uses parser from Phase 1
# Counts widget types in source code
# Identifies unsupported widgets
# Helps users know what will/won't work
```

### Phase 3: Integration with `dead_code_analyzer` (Week 19+)
Integrate the `dead_code_analyzer` package to identify unused code and suggest optimizations.

```bash
flutterjs analyze --dead-code
# Runs dead_code_analyzer package
# Shows unused Flutter widgets
# Suggests removing unused imports
```

## Updated `flutterjs analyze` Command

### Usage Examples

```bash
# Full analysis (default)
flutterjs analyze

# Only bundle analysis (requires build/)
flutterjs analyze --no-widgets --no-reactivity

# Only widget usage (no build required)
flutterjs analyze --no-bundle --no-reactivity

# Run dead_code_analyzer
flutterjs analyze --dead-code

# Everything in verbose mode
flutterjs analyze -v

# Only dead code analysis
flutterjs analyze --no-bundle --no-widgets --no-reactivity --dead-code

# Custom source path
flutterjs analyze --source=lib/features
```

### Analysis Types

| Analysis Type | Description | Requirements |
|---------------|-------------|--------------|
| **Bundle Analysis (--bundle)** | Reads `build/` directory, shows file sizes and compression, breaks down bundle contents | `build/` directory exists |
| **Widget Usage Analysis (--widgets)** | Scans `lib/` for widget counts, supported/unsupported widgets, Material vs Cupertino usage | Flutter source code in `lib/` |
| **Reactivity Analysis (--reactivity)** | Analyzes `setState`, `Provider`/`Riverpod` usage, state dependencies, and runtime size | Flutter source code |
| **Dead Code Analysis (--dead-code)** | Runs `dead_code_analyzer` to show unused imports, variables, functions, and savings | `dead_code_analyzer` package installed |

## Integration with `dead_code_analyzer`

Integrate the `dead_code_analyzer` package to detect unused code and provide optimization suggestions.

```dart
Future _runDeadCodeAnalyzer(String sourcePath) async {
  print('═══ Dead Code Analysis ═══');
  print('Running dead_code_analyzer package...\n');

  try {
    // Option 1: Run as subprocess
    final result = await Process.run(
      'dart',
      ['run', 'dead_code_analyzer', sourcePath],
    );
    print(result.stdout);
    
    // Option 2: Import directly (if it's a library)
    // import 'package:dead_code_analyzer/dead_code_analyzer.dart';
    // final analyzer = DeadCodeAnalyzer(sourcePath);
    // final results = await analyzer.analyze();
    // print(results.format());
    
  } catch (e) {
    print('⚠️  dead_code_analyzer not found. Install it with:');
    print('   dart pub add dead_code_analyzer\n');
  }
}
```

## Recommended Implementation Order

1. **Week 15-16**: Implement basic bundle analysis (read `build/` directory)
2. **Week 17**: Add widget detection using Phase 1 parser
3. **Week 18**: Add reactivity analysis
4. **Week 19+**: Integrate `dead_code_analyzer` package

*Generated on October 04, 2025*