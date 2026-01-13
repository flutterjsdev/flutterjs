# IR Widget Models

Flutter widget intermediate representation models in FlutterJS Core.

---

## Overview

Widget IR models represent Flutter widgets in a structured, JavaScript-generation-ready format.

### Widget Types

```dart
enum WidgetType {
  stateless,   // StatelessWidget
  stateful,    // StatefulWidget
  inherited,   // InheritedWidget
  material,    // Material Design widgets
  custom,      // Custom widgets
}
```

---

## Core Widget IR

### WidgetIR

Base class for all widget representations.

```dart
class WidgetIR {
  final String name;
  final WidgetType type;
  final MethodDeclIR? buildMethod;
  final List<FieldDeclIR> fields;
  final List<ConstructorDeclIR> constructors;
  final String? superClass;
  final SourceLocation sourceLocation;
  
  WidgetIR({
    required this.name,
    required this.type,
    this.buildMethod,
    this.fields = const [],
    this.constructors = const [],
    this.superClass,
    required this.sourceLocation,
  });
}
```

**Example:**

```dart
// Dart code
class MyWidget extends StatelessWidget {
  final String title;
  
  MyWidget({required this.title});
  
  Widget build(BuildContext context) {
    return Text(title);
  }
}

// IR
WidgetIR(
  name: 'MyWidget',
  type: WidgetType.stateless,
  superClass: 'StatelessWidget',
  fields: [
    FieldDeclIR(name: 'title', type: NamedTypeIR('String')),
  ],
  buildMethod: MethodDeclIR(name: 'build', ...),
)
```

---

## StateClassIR

Represents State class for StatefulWidget.

```dart
class StateClassIR {
  final String name;
  final String widgetClass;
  final MethodDeclIR buildMethod;
  final List<FieldDeclIR> stateFields;
  final MethodDeclIR? initState;
  final MethodDeclIR? dispose;
  final List<MethodDeclIR> stateMethods;
  
  StateClassIR({
    required this.name,
    required this.widgetClass,
    required this.buildMethod,
    this.stateFields = const [],
    this.initState,
    this.dispose,
    this.stateMethods = const [],
  });
}
```

**Example:**

```dart
// Dart code
class _MyWidgetState extends State<MyWidget> {
  int _count = 0;
  
  void _increment() {
    setState(() => _count++);
  }
  
  Widget build(BuildContext context) {
    return Text('$_count');
  }
}

// IR
StateClassIR(
  name: '_MyWidgetState',
  widgetClass: 'MyWidget',
  stateFields: [
    FieldDeclIR(name: '_count', type: NamedTypeIR('int')),
  ],
  stateMethods: [
    MethodDeclIR(name: '_increment', ...),
  ],
  buildMethod: MethodDeclIR(name: 'build', ...),
)
```

---

## Material Widgets

### Common Material Widget Properties

```dart
class MaterialWidgetIR extends WidgetIR {
  final ExpressionIR? key;
  final Map<String, ExpressionIR> properties;
  
  MaterialWidgetIR({
    required String name,
    this.key,
    required this.properties,
  }) : super(name: name, type: WidgetType.material);
}
```

### Popular Material Widgets

**ScaffoldIR:**
```dart
ScaffoldIR(
  appBar: AppBarIR(...),
  body: CenterIR(...),
  floatingActionButton: FloatingActionButtonIR(...),
)
```

**AppBarIR:**
```dart
AppBarIR(
  title: TextIR('My App'),
  actions: [IconButtonIR(...)],
)
```

**ContainerIR:**
```dart
ContainerIR(
  child: TextIR('Content'),
  color: ColorIR(0xFF000000),
  padding: EdgeInsetsIR.all(16),
)
```

---

## Widget Tree IR

Represents the widget tree structure.

```dart
class WidgetTreeIR {
  final WidgetNodeIR root;
  final Map<String, WidgetNodeIR> nodesById;
  
  WidgetTreeIR({
    required this.root,
    required this.nodesById,
  });
  
  // Traverse tree depth-first
  void traverseDepthFirst(void Function(WidgetNodeIR) visitor);
  
  // Find widget by ID
  WidgetNodeIR? findById(String id);
  
  // Get parent of widget
  WidgetNodeIR? getParent(WidgetNodeIR node);
}
```

**WidgetNodeIR:**

```dart
class WidgetNodeIR {
  final String id;
  final String widgetType;
  final Map<String, ExpressionIR> properties;
  final List<WidgetNodeIR> children;
  final WidgetNodeIR? parent;
  
  WidgetNodeIR({
    required this.id,
    required this.widgetType,
    this.properties = const {},
    this.children = const [],
    this.parent,
  });
}
```

---

## Best Practices

1. **Always include source locations** for error reporting
2. **Preserve widget hierarchy** in the IR
3. **Validate required properties** before creating IR
4. **Use type-safe representations** for colors, padding, etc.

---

## See Also

- [IR System Overview](ir-system-overview.md)
- [Guide: Adding Widgets](guide-adding-widgets.md)
- [Analysis Passes](analysis-passes.md)
