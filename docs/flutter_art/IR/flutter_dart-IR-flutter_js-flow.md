# Flutter.js Complete Flow Documentation

## Overview

This document details the complete pipeline from Flutter Dart code to your Flutter.js framework output.

---

## Pipeline Architecture

```
┌─────────────────┐
│  Flutter Dart   │
│    Source       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STAGE 1:       │
│  Dart Parser    │
│  (analyzer pkg) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STAGE 2:       │
│  IR Builder     │
│  (Protocol Buf) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  app.ir.pb      │
│  (Binary File)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STAGE 3:       │
│  IR Analyzer    │
│  (Reactivity)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STAGE 4:       │
│  Code Generator │
│  (HTML/CSS/JS)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Flutter.js     │
│  Output         │
└─────────────────┘
```

---

## Stage 1: Dart Parser

### Input
```dart
// lib/main.dart
class CounterWidget extends StatefulWidget {
  @override
  _CounterWidgetState createState() => _CounterWidgetState();
}

class _CounterWidgetState extends State<CounterWidget> {
  int counter = 0;
  
  void increment() {
    setState(() {
      counter++;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Column(
        children: [
          Text('Count: $counter'),
          ElevatedButton(
            onPressed: increment,
            child: Text('Increment'),
          ),
        ],
      ),
    );
  }
}
```

### Parser Implementation

```dart
// lib/parser/dart_parser.dart
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

class FlutterDartParser {
  List<Widget> parsedWidgets = [];
  List<FunctionDefinition> parsedFunctions = [];
  
  void parseFile(String filePath) {
    final result = parseFile(path: filePath);
    final unit = result.unit;
    
    // Visit all class declarations
    for (var declaration in unit.declarations) {
      if (declaration is ClassDeclaration) {
        _parseClass(declaration);
      }
    }
  }
  
  void _parseClass(ClassDeclaration node) {
    // Check if it's a StatefulWidget
    if (_extendsStatefulWidget(node)) {
      final widget = _parseStatefulWidget(node);
      parsedWidgets.add(widget);
    }
    
    // Check if it's a State class
    if (_extendsState(node)) {
      final state = _parseStateClass(node);
      // Extract methods and build function
      _parseMethods(node, state);
    }
  }
  
  void _parseMethods(ClassDeclaration node, Widget widget) {
    for (var member in node.members) {
      if (member is MethodDeclaration) {
        final func = _parseMethod(member);
        parsedFunctions.add(func);
      }
    }
  }
}
```

### Output: Widget Data Structure

```dart
// Parsed widget data (not yet IR)
class ParsedWidget {
  String id;
  String type;
  bool isStateful;
  List<ParsedProperty> properties;
  List<ParsedWidget> children;
  String? buildMethodBody;
}

class ParsedFunction {
  String name;
  List<String> parameters;
  String body;
  bool callsSetState;
}
```

---

## Stage 2: IR Builder (Convert Parsed Data → Protocol Buffers)

### Implementation

```dart
// lib/ir/ir_builder.dart
import 'package:flutter_js_transpiler/ir/flutter_ir.pb.dart';

class IRBuilder {
  FlutterApp buildIR(List<ParsedWidget> widgets, List<ParsedFunction> functions) {
    final app = FlutterApp()
      ..version = '1.0';
    
    // Convert widgets
    for (var widget in widgets) {
      app.widgets.add(_convertWidget(widget));
    }
    
    // Convert functions
    for (var func in functions) {
      app.functions.add(_convertFunction(func));
    }
    
    return app;
  }
  
  Widget _convertWidget(ParsedWidget parsed) {
    final widget = Widget()
      ..id = parsed.id
      ..type = parsed.type
      ..isStateful = parsed.isStateful
      ..classification = _classifyWidget(parsed);
    
    // Add properties
    for (var prop in parsed.properties) {
      widget.properties.add(Property()
        ..name = prop.name
        ..type = prop.type
        ..value = prop.value);
    }
    
    // Add children recursively
    for (var child in parsed.children) {
      widget.children.add(_convertWidget(child));
    }
    
    return widget;
  }
  
  FunctionDefinition _convertFunction(ParsedFunction parsed) {
    final func = FunctionDefinition()
      ..id = 'func_${parsed.name}'
      ..name = parsed.name
      ..type = FunctionType.METHOD
      ..body = (FunctionBody()
        ..dartCode = parsed.body);
    
    // Analyze function
    if (parsed.callsSetState) {
      func.sideEffects.add('state_mutation');
    }
    
    return func;
  }
  
  WidgetClassification _classifyWidget(ParsedWidget widget) {
    if (widget.isStateful) {
      return WidgetClassification.TYPE_B_STATEFUL;
    }
    return WidgetClassification.TYPE_A_STATELESS;
  }
}
```

### Save IR to File

```dart
// lib/ir/ir_writer.dart
import 'dart:io';
import 'package:flutter_js_transpiler/ir/flutter_ir.pb.dart';

class IRWriter {
  void writeIR(FlutterApp app, String outputPath) {
    final bytes = app.writeToBuffer();
    File(outputPath).writeAsBytesSync(bytes);
    print('IR saved: ${bytes.length} bytes');
  }
  
  FlutterApp readIR(String inputPath) {
    final bytes = File(inputPath).readAsBytesSync();
    return FlutterApp.fromBuffer(bytes);
  }
}
```

---

## Stage 3: IR Analyzer (Reactivity & Dependencies)

### Implementation

```dart
// lib/analyzer/reactivity_analyzer.dart
class ReactivityAnalyzer {
  void analyze(FlutterApp app) {
    for (var widget in app.widgets) {
      _analyzeWidget(widget);
    }
  }
  
  void _analyzeWidget(Widget widget) {
    // Analyze data dependencies
    widget.dataDependencies = DataDependencies();
    
    // Find setState calls
    final setStateCalls = _findSetStateCalls(widget);
    
    // Build reactivity info
    widget.reactivityInfo = ReactivityInfo()
      ..propagatesToChildren = widget.isStateful;
    
    for (var call in setStateCalls) {
      widget.reactivityInfo.triggers.add(ReactivityTrigger()
        ..source = 'setState'
        ..variables.addAll(_extractVariables(call)));
    }
    
    // Analyze children
    for (var child in widget.children) {
      _analyzeWidget(child);
    }
  }
  
  List<String> _findSetStateCalls(Widget widget) {
    // Search through associated functions
    final calls = <String>[];
    // Implementation: parse function bodies for setState
    return calls;
  }
}
```

---

## Stage 4: Code Generator (IR → Flutter.js Framework)

### Main Generator

```dart
// lib/generator/code_generator.dart
class FlutterJSGenerator {
  String outputDir;
  
  FlutterJSGenerator(this.outputDir);
  
  void generate(FlutterApp app) {
    // Generate HTML
    final html = _generateHTML(app);
    File('$outputDir/index.html').writeAsStringSync(html);
    
    // Generate JavaScript (Flutter.js framework usage)
    final js = _generateJS(app);
    File('$outputDir/app.js').writeAsStringSync(js);
    
    // Generate CSS
    final css = _generateCSS(app);
    File('$outputDir/styles.css').writeAsStringSync(css);
  }
}
```

---

## Converting IR to Flutter.js Framework

### Understanding the Mapping

**Flutter Dart Code:**
```dart
class CounterWidget extends StatefulWidget {
  @override
  _CounterWidgetState createState() => _CounterWidgetState();
}

class _CounterWidgetState extends State<CounterWidget> {
  int counter = 0;
  
  void increment() {
    setState(() { counter++; });
  }
  
  @override
  Widget build(BuildContext context) {
    return Container(
      child: Text('Count: $counter'),
    );
  }
}
```

**IR Representation:**
```dart
Widget()
  ..id = 'widget_counter'
  ..type = 'CounterWidget'
  ..isStateful = true
  ..classification = TYPE_B_STATEFUL
  ..reactivityInfo = (ReactivityInfo()
    ..triggers.add(ReactivityTrigger()
      ..source = 'setState'
      ..variables.add('counter')))
```

**Flutter.js Framework Output:**
```javascript
// Generated JavaScript using your Flutter.js framework

const CounterWidget = FlutterJS.createWidget({
  id: 'widget_counter',
  
  // Initial state
  initState() {
    return {
      counter: 0
    };
  },
  
  // Methods
  methods: {
    increment() {
      this.setState({ counter: this.state.counter + 1 });
    }
  },
  
  // Build function (returns HTML structure)
  build(context) {
    return FlutterJS.createElement('div', {
      className: 'flutter-container',
      children: [
        FlutterJS.createElement('span', {
          children: [`Count: ${this.state.counter}`]
        })
      ]
    });
  },
  
  // Lifecycle
  didMount() {
    console.log('CounterWidget mounted');
  },
  
  dispose() {
    console.log('CounterWidget disposed');
  }
});

// Mount to DOM
FlutterJS.mount(CounterWidget, document.getElementById('root'));
```

### Generator Implementation

```dart
// lib/generator/js_generator.dart
class JavaScriptGenerator {
  String generateWidget(Widget widget) {
    if (widget.isStateful) {
      return _generateStatefulWidget(widget);
    } else {
      return _generateStatelessWidget(widget);
    }
  }
  
  String _generateStatefulWidget(Widget widget) {
    final buffer = StringBuffer();
    
    buffer.writeln('const ${widget.type} = FlutterJS.createWidget({');
    buffer.writeln("  id: '${widget.id}',");
    
    // Generate initState
    buffer.writeln('  initState() {');
    buffer.writeln('    return {');
    for (var trigger in widget.reactivityInfo.triggers) {
      for (var variable in trigger.variables) {
        buffer.writeln('      $variable: 0,');
      }
    }
    buffer.writeln('    };');
    buffer.writeln('  },');
    
    // Generate methods
    buffer.writeln('  methods: {');
    final functions = _findWidgetFunctions(widget);
    for (var func in functions) {
      buffer.writeln('    ${func.name}() {');
      buffer.writeln('      ${_convertDartToJS(func.body.dartCode)}');
      buffer.writeln('    },');
    }
    buffer.writeln('  },');
    
    // Generate build function
    buffer.writeln('  build(context) {');
    buffer.writeln('    return ${_generateElement(widget)};');
    buffer.writeln('  }');
    
    buffer.writeln('});');
    
    return buffer.toString();
  }
  
  String _generateElement(Widget widget) {
    final buffer = StringBuffer();
    
    buffer.write("FlutterJS.createElement('${_mapWidgetToHTML(widget.type)}', {");
    
    // Add properties
    buffer.write("className: '${_generateClassName(widget)}',");
    
    // Add children
    if (widget.children.isNotEmpty) {
      buffer.write('children: [');
      for (var child in widget.children) {
        buffer.write(_generateElement(child));
        buffer.write(',');
      }
      buffer.write('],');
    }
    
    buffer.write('})');
    
    return buffer.toString();
  }
  
  String _convertDartToJS(String dartCode) {
    // Convert setState
    dartCode = dartCode.replaceAll(
      RegExp(r'setState\(\(\)\s*{\s*([^}]+)\s*}\)'),
      'this.setState({ \$1 })'
    );
    
    // Convert counter++ to counter: counter + 1
    dartCode = dartCode.replaceAll(
      RegExp(r'(\w+)\+\+'),
      '\$1: this.state.\$1 + 1'
    );
    
    return dartCode;
  }
}
```

---

## Complete Build Command

```dart
// bin/flutter_js.dart
import 'dart:io';
import 'package:flutter_js_transpiler/parser/dart_parser.dart';
import 'package:flutter_js_transpiler/ir/ir_builder.dart';
import 'package:flutter_js_transpiler/ir/ir_writer.dart';
import 'package:flutter_js_transpiler/analyzer/reactivity_analyzer.dart';
import 'package:flutter_js_transpiler/generator/code_generator.dart';

void main(List<String> args) {
  print('Flutter.js Transpiler v1.0');
  
  // Stage 1: Parse Dart
  print('\n[1/4] Parsing Flutter Dart files...');
  final parser = FlutterDartParser();
  parser.parseFile('lib/main.dart');
  print('  ✓ Found ${parser.parsedWidgets.length} widgets');
  
  // Stage 2: Build IR
  print('\n[2/4] Building IR...');
  final irBuilder = IRBuilder();
  final app = irBuilder.buildIR(parser.parsedWidgets, parser.parsedFunctions);
  
  final irWriter = IRWriter();
  irWriter.writeIR(app, 'build/app.ir.pb');
  print('  ✓ IR saved (${File("build/app.ir.pb").lengthSync()} bytes)');
  
  // Stage 3: Analyze
  print('\n[3/4] Analyzing reactivity...');
  final analyzer = ReactivityAnalyzer();
  analyzer.analyze(app);
  
  // Re-save enhanced IR
  irWriter.writeIR(app, 'build/app.analyzed.ir.pb');
  print('  ✓ Reactivity analysis complete');
  
  // Stage 4: Generate code
  print('\n[4/4] Generating Flutter.js code...');
  final generator = FlutterJSGenerator('build/output');
  generator.generate(app);
  print('  ✓ Generated files:');
  print('    - index.html');
  print('    - app.js');
  print('    - styles.css');
  
  print('\n✅ Build complete!');
  print('Run: cd build/output && python -m http.server 8000');
}
```

---

## File Structure

```
flutter_js_transpiler/
├── lib/
│   ├── parser/
│   │   └── dart_parser.dart          # Stage 1: Parse Dart
│   ├── ir/
│   │   ├── flutter_ir.proto          # IR schema
│   │   ├── flutter_ir.pb.dart        # Generated (by protoc)
│   │   ├── ir_builder.dart           # Stage 2: Build IR
│   │   └── ir_writer.dart            # Save/load IR
│   ├── analyzer/
│   │   └── reactivity_analyzer.dart  # Stage 3: Analyze
│   └── generator/
│       ├── code_generator.dart       # Stage 4: Generate
│       ├── html_generator.dart
│       ├── js_generator.dart
│       └── css_generator.dart
├── bin/
│   └── flutter_js.dart               # CLI entry point
└── build/
    ├── app.ir.pb                     # Intermediate IR
    ├── app.analyzed.ir.pb            # Enhanced IR
    └── output/
        ├── index.html
        ├── app.js
        └── styles.css
```

---

## Testing Each Stage

### Stage 1 Test
```dart
void testParser() {
  final parser = FlutterDartParser();
  parser.parseFile('test/fixtures/counter.dart');
  
  assert(parser.parsedWidgets.length == 1);
  assert(parser.parsedWidgets[0].type == 'CounterWidget');
  assert(parser.parsedWidgets[0].isStateful == true);
}
```

### Stage 2 Test
```dart
void testIRBuilder() {
  final parsed = ParsedWidget(
    id: 'test',
    type: 'Container',
    isStateful: false,
  );
  
  final builder = IRBuilder();
  final app = builder.buildIR([parsed], []);
  
  assert(app.widgets.length == 1);
  assert(app.widgets[0].type == 'Container');
}
```

### Stage 3 Test
```dart
void testAnalyzer() {
  final app = FlutterApp()
    ..widgets.add(Widget()
      ..id = 'test'
      ..isStateful = true);
  
  final analyzer = ReactivityAnalyzer();
  analyzer.analyze(app);
  
  assert(app.widgets[0].hasReactivityInfo());
}
```

### Stage 4 Test
```dart
void testGenerator() {
  final app = FlutterApp()
    ..widgets.add(Widget()
      ..id = 'test'
      ..type = 'Container');
  
  final generator = FlutterJSGenerator('test_output');
  generator.generate(app);
  
  assert(File('test_output/app.js').existsSync());
}
```

---

## Summary

1. **Dart Parser** → Extracts widget/function structure from Dart files
2. **IR Builder** → Converts to Protocol Buffers format
3. **IR Analyzer** → Enriches IR with reactivity/dependency data
4. **Code Generator** → Converts IR to Flutter.js framework calls

The IR is the bridge that allows you to:
- Separate parsing from generation
- Run multiple analysis passes
- Debug intermediate state
- Optimize before generating output
- Support multiple output targets (web, documentation, etc.)
