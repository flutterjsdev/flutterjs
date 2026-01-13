# Guide: Adding Widget Support

Step-by-step guide for adding support for new Flutter widgets in FlutterJS.

---

## Overview

To add support for a new widget, you need to:
1. Identify the widget pattern in Dart AST
2. Create/update IR model
3. Update declaration pass
4. Add validation rules
5. Test the implementation

---

## Example: Adding `ListTile` Support

Let's walk through adding support for the `ListTile` widget.

### Step 1: Analyze the Widget

First, understand the widget's API:

```dart
ListTile(
  leading: Icon(Icons.star),
  title: Text('Title'),
  subtitle: Text('Subtitle'),
  trailing: Icon(Icons.arrow_forward),
  onTap: () {},
)
```

**Key properties:**
- `leading` - Widget (optional)
- `title` - Widget (required)
- `subtitle` - Widget (optional)
- `trailing` - Widget (optional)
- `onTap` - Function (optional)

---

### Step 2: Create IR Model

Create `lib/src/ir/widgets/list_tile_ir.dart`:

```dart
/// IR representation of a Flutter ListTile widget
class ListTileIR extends WidgetIR {
  /// Widget to display before the title
  final ExpressionIR? leading;
  
  /// The primary content (required)
  final ExpressionIR title;
  
  /// Additional content below title
  final ExpressionIR? subtitle;
  
  /// Widget to display after the title
  final ExpressionIR? trailing;
  
  /// Callback when tile is tapped
  final ExpressionIR? onTap;
  
  ListTileIR({
    required String name,
    required this.title,
    this.leading,
    this.subtitle,
    this.trailing,
    this.onTap,
    required SourceLocation sourceLocation,
  }) : super(
    name: name,
    type: WidgetType.material,
    sourceLocation: sourceLocation,
  );
  
  @override
  Map<String, dynamic> toJson() {
    return {
      'type': 'ListTile',
      'leading': leading?.toJson(),
      'title': title.toJson(),
      'subtitle': subtitle?.toJson(),
      'trailing': trailing?.toJson(),
      'onTap': onTap?.toJson(),
    };
  }
}
```

---

### Step 3: Update Declaration Pass

In `lib/src/analysis/visitors/declaration_pass.dart`:

```dart
class DeclarationPass extends RecursiveAstVisitor<void> {
  // ...
  
  @override
  void visitInstanceCreationExpression(
    InstanceCreationExpression node
  ) {
    final typeName = node.constructorName.type.name.name;
    
    // Add ListTile detection
    if (typeName == 'ListTile') {
      final listTileIR = _extractListTile(node);
      _widgets.add(listTileIR);
    }
    
    super.visitInstanceCreationExpression(node);
  }
  
  ListTileIR _extractListTile(
    InstanceCreationExpression node
  ) {
    ExpressionIR? leading;
    ExpressionIR? title;
    ExpressionIR? subtitle;
    ExpressionIR? trailing;
    ExpressionIR? onTap;
    
    // Extract named arguments
    for (final arg in node.argumentList.arguments) {
      if (arg is NamedExpression) {
        final name = arg.name.label.name;
        final expr = _extractExpression(arg.expression);
        
        switch (name) {
          case 'leading':
            leading = expr;
            break;
          case 'title':
            title = expr;
            break;
          case 'subtitle':
            subtitle = expr;
            break;
          case 'trailing':
            trailing = expr;
            break;
          case 'onTap':
            onTap = expr;
            break;
        }
      }
    }
    
    if (title == null) {
      throw AnalysisException(
        'ListTile requires a title',
        location: _getLocation(node),
      );
    }
    
    return ListTileIR(
      name: 'ListTile',
      leading: leading,
      title: title,
      subtitle: subtitle,
      trailing: trailing,
      onTap: onTap,
      sourceLocation: _getLocation(node),
    );
  }
}
```

---

### Step 4: Add Validation

In `lib/src/analysis/passes/validation_pass.dart`:

```dart
class ValidationPass {
  List<DiagnosticMessage> validate(FileIR fileIR) {
    final errors = <DiagnosticMessage>[];
    
    for (final widget in fileIR.widgets) {
      if (widget is ListTileIR) {
        errors.addAll(_validateListTile(widget));
      }
    }
    
    return errors;
  }
  
  List<DiagnosticMessage> _validateListTile(ListTileIR tile) {
    final errors = <DiagnosticMessage>[];
    
    // Validate title is provided
    if (tile.title == null) {
      errors.add(DiagnosticMessage(
        severity: DiagnosticSeverity.error,
        message: 'ListTile requires a title property',
        location: tile.sourceLocation,
      ));
    }
    
    // Validate onTap is a function
    if (tile.onTap != null) {
      if (tile.onTap!.resultType is! FunctionTypeIR) {
        errors.add(DiagnosticMessage(
          severity: DiagnosticSeverity.warning,
          message: 'onTap should be a function',
          location: tile.sourceLocation,
        ));
      }
    }
    
    return errors;
  }
}
```

---

### Step 5: Export from Core

Add to `lib/flutterjs_core.dart`:

```dart
// Widget IR exports
export 'src/ir/widgets/list_tile_ir.dart';
```

---

### Step 6: Write Tests

Create `test/widgets/list_tile_test.dart`:

```dart
import 'package:test/test.dart';
import 'package:flutterjs_core/flutterjs_core.dart';

void main() {
  group('ListTile IR', () {
    test('extracts basic ListTile', () {
      final dartCode = '''
        ListTile(
          title: Text('Title'),
        )
      ''';
      
      final fileIR = analyzeDartCode(dartCode);
      final widgets = fileIR.widgets;
      
      expect(widgets, hasLength(2)); // ListTile + Text
      expect(widgets.first, isA<ListTileIR>());
      
      final listTile = widgets.first as ListTileIR;
      expect(listTile.title, isNotNull);
    });
    
    test('extracts ListTile with all properties', () {
      final dartCode = '''
        ListTile(
          leading: Icon(Icons.star),
          title: Text('Title'),
          subtitle: Text('Subtitle'),
          trailing: Icon(Icons.arrow_forward),
          onTap: () {},
        )
      ''';
      
      final fileIR = analyzeDartCode(dartCode);
      final listTile = fileIR.widgets
          .firstWhere((w) => w is ListTileIR) as ListTileIR;
      
      expect(listTile.leading, isNotNull);
      expect(listTile.title, isNotNull);
      expect(listTile.subtitle, isNotNull);
      expect(listTile.trailing, isNotNull);
      expect(listTile.onTap, isNotNull);
    });
    
    test('validates missing title', () {
      final dartCode = '''
        ListTile(
          leading: Icon(Icons.star),
        )
      ''';
      
      expect(
        () => analyzeDartCode(dartCode),
        throwsA(isA<AnalysisException>()),
      );
    });
  });
}
```

Run tests:
```bash
cd packages/flutterjs_core
dart test test/widgets/list_tile_test.dart
```

---

## Advanced: Complex Widgets

For more complex widgets like `ListView.builder`:

### 1. Handle Constructor Variants

```dart
if (typeName == 'ListView') {
  final constructorName = node.constructorName.name?.name;
  
  if (constructorName == 'builder') {
    return _extractListViewBuilder(node);
  } else {
    return _extractListView(node);
  }
}
```

### 2. Handle Callbacks

```dart
// Extract builder callback
if (name == 'itemBuilder') {
  if (arg.expression is FunctionExpression) {
    final funcExpr = arg.expression as FunctionExpression;
    itemBuilder = _extractFunction(funcExpr);
  }
}
```

### 3. Handle Generic Types

```dart
// For List<Widget>
final typeArgs = node.constructorName.type.typeArguments;
if (typeArgs != null) {
  for (final typeArg in typeArgs.arguments) {
    // Extract type information
  }
}
```

---

## Checklist

When adding a new widget, ensure:

- [ ] IR model created in `lib/src/ir/widgets/`
- [ ] Extraction logic in declaration pass
- [ ] Validation rules added
- [ ] Exported from `flutterjs_core.dart`
- [ ] Unit tests written
- [ ] Documentation added (DartDoc)
- [ ] JSON serialization supported
- [ ] Source location preserved

---

## Common Pitfalls

### 1. Forgetting Required Properties

```dart
// ❌ Bad
ListTileIR({
  this.title,  // Optional
});

// ✅ Good
ListTileIR({
  required this.title,  // Required
});
```

### 2. Not Handling Null Safely

```dart
// ❌ Bad
final title = extractExpression(node.title);  // May be null

// ✅ Good
final title = node.title != null
    ? extractExpression(node.title!)
    : null;
```

### 3. Missing Source Locations

```dart
// ❌ Bad
return ListTileIR(title: title);

// ✅ Good
return ListTileIR(
  title: title,
  sourceLocation: _getLocation(node),
);
```

---

## Next Steps

- See [IR Widgets](ir-widgets.md) for more widget IR examples
- See [Analysis Passes](analysis-passes.md) for extraction details
- See [IR System Overview](ir-system-overview.md) for IR design

---

## Need Help?

- Check existing widget IR implementations in `lib/src/ir/widgets/`
- Look at tests in `test/widgets/`
- Ask in [GitHub Discussions](https://github.com/flutterjsdev/flutterjs/discussions)
