# State Management

Learn how to manage state in FlutterJS applications.

## Understanding State

**State** is any data that can change over time in your application.

Examples:
- User input (text fields, checkboxes)
- Counter values
- Loading states
- User preferences
- Shopping cart items

---

## StatelessWidget

Widgets that **don't have state** — they're purely a function of their inputs.

### Example: Greeting Widget

```dart
class Greeting extends StatelessWidget {
  final String name;

  Greeting({required this.name});

  @override
  Widget build(BuildContext context) {
    return Text('Hello, $name!');
  }
}

// Usage
Greeting(name: 'Alice')  // Always shows "Hello, Alice!"
```

**When to use:**
- Display static content
- Show data passed from parent
- No interactivity needed

---

## StatefulWidget

Widgets that **have state** — they can change over time.

### Example: Counter Widget

```dart
class Counter extends StatefulWidget {
  @override
  _CounterState createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;  // ← This is state!

  void _increment() {
    setState(() {
      _count++;  // Modify state
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: $_count'),
        ElevatedButton(
          onPressed: _increment,
          child: Text('Increment'),
        ),
      ],
    );
  }
}
```

**Key points:**
- State lives in the `State` class (e.g., `_CounterState`)
- Call `setState()` to update state and trigger rebuild
- The `build()` method re-runs when state changes

---

> [!TIP]
> Curious about how `setState` triggers a rebuild? Read about the [Runtime Engine Architecture](../architecture/runtime-engine.md).

---


## setState()

The **most important** method for state management.

### How setState() Works

```dart
void _updateData() {
  setState(() {
    // Modify state variables here
    _count++;
    _isLoading = false;
    _items.add('New Item');
  });
  // FlutterJS automatically rebuilds the widget
}
```

### Rules for setState()

**✅ Do:**
```dart
setState(() {
  _count++;           // Modify state variables
  _text = 'Updated';  // Update strings
  _items.add('X');    // Modify lists
});
```

**❌ Don't:**
```dart
// DON'T call setState() in build()
Widget build(BuildContext context) {
  setState(() {  // ❌ INFINITE LOOP!
    _count++;
  });
  return Text('$_count');
}

// DON'T forget to call setState()
_count++;  // ❌ Widget won't rebuild!
```

---

## State Lifecycle

### Common Lifecycle Methods

```dart
class _MyWidgetState extends State<MyWidget> {
  @override
  void initState() {
    super.initState();
    // Called once when widget is created
    // Initialize state, start timers, fetch data
    print('Widget initialized');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Called when inherited widgets change
  }

  @override
  void didUpdateWidget(MyWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Called when widget configuration changes
    if (oldWidget.id != widget.id) {
      // React to prop changes
    }
  }

  @override
  void dispose() {
    super.dispose();
    // Called when widget is removed
    // Clean up: cancel timers, close streams
    print('Widget disposed');
  }

  @override
  Widget build(BuildContext context) {
    // Called every time state changes
    return Text('Hello');
  }
}
```

### Lifecycle Flow

```
1. Constructor called
   ↓
2. initState() called (once)
   ↓
3. build() called
   ↓
4. Widget displayed
   ↓
5. setState() called → build() called again
   ↓
6. dispose() called (when removed)
```

---

## Passing Data Between Widgets

### Parent to Child (Props)

```dart
// Parent widget
class ParentWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChildWidget(
      name: 'Alice',
      age: 25,
    );
  }
}

// Child widget
class ChildWidget extends StatelessWidget {
  final String name;
  final int age;

  ChildWidget({required this.name, required this.age});

  @override
  Widget build(BuildContext context) {
    return Text('$name is $age years old');
  }
}
```

### Child to Parent (Callbacks)

```dart
// Parent widget
class ParentWidget extends StatefulWidget {
  @override
  _ParentWidgetState createState() => _ParentWidgetState();
}

class _ParentWidgetState extends State<ParentWidget> {
  String _message = '';

  void _handleMessage(String msg) {
    setState(() {
      _message = msg;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Message: $_message'),
        ChildWidget(onMessage: _handleMessage),
      ],
    );
  }
}

// Child widget
class ChildWidget extends StatelessWidget {
  final Function(String) onMessage;

  ChildWidget({required this.onMessage});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () => onMessage('Hello from child!'),
      child: Text('Send Message'),
    );
  }
}
```

---

## InheritedWidget

Share data across the widget tree without passing props manually.

### Basic Example

```dart
// 1. Create InheritedWidget
class AppState extends InheritedWidget {
  final String username;
  final int notificationCount;

  AppState({
    required this.username,
    required this.notificationCount,
    required Widget child,
  }) : super(child: child);

  static AppState of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppState>()!;
  }

  @override
  bool updateShouldNotify(AppState oldWidget) {
    return username != oldWidget.username ||
           notificationCount != oldWidget.notificationCount;
  }
}

// 2. Wrap app with provider
void main() {
  runApp(
    AppState(
      username: 'Alice',
      notificationCount: 5,
      child: MyApp(),
    ),
  );
}

// 3. Access data anywhere in the tree
class ProfileWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final appState = AppState.of(context);
    
    return Column(
      children: [
        Text('User: ${appState.username}'),
        Text('Notifications: ${appState.notificationCount}'),
      ],
    );
  }
}
```

### When to Use InheritedWidget

**✅ Good for:**
- Theme data
- User authentication state
- App configuration
- Data needed by many widgets

**❌ Not ideal for:**
- Frequently changing data (use setState locally)
- One-off data passing (use props)

---

## Best Practices

### 1. Keep State Close to Where It's Used

```dart
// ❌ Bad: State too high in tree
class MyApp extends StatefulWidget {
  // Counter state here affects entire app
}

// ✅ Good: State local to component
class CounterWidget extends StatefulWidget {
  // Counter state only affects this widget
}
```

### 2. Lift State Up When Needed

If multiple widgets need the same state, move it to their common parent.

```dart
class ParentWidget extends StatefulWidget {
  @override
  _ParentWidgetState createState() => _ParentWidgetState();
}

class _ParentWidgetState extends State<ParentWidget> {
  int _sharedValue = 0;  // Shared by both children

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ChildA(value: _sharedValue, onUpdate: (v) => setState(() => _sharedValue = v)),
        ChildB(value: _sharedValue, onUpdate: (v) => setState(() => _sharedValue = v)),
      ],
    );
  }
}
```

### 3. Don't Mutate State Directly

```dart
// ❌ Bad
_items.add('new');  // No setState!

// ✅ Good
setState(() {
  _items.add('new');
});
```

### 4. Use const Widgets When Possible

```dart
// ✅ const prevents unnecessary rebuilds
const Text('Static text')
const Icon(Icons.home)
```

---

## Common Patterns

### Toggle Boolean

```dart
void _toggle() {
  setState(() {
    _isEnabled = !_isEnabled;
  });
}
```

### Update Text Field

```dart
final _controller = TextEditingController();

TextField(
  controller: _controller,
  onChanged: (value) {
    setState(() {
      _searchQuery = value;
    });
  },
)
```

### Update List

```dart
void _addItem(String item) {
  setState(() {
    _items.add(item);
  });
}

void _removeItem(int index) {
  setState(() {
    _items.removeAt(index);
  });
}
```

---

## Next Steps

- Explore [Routing & Navigation](routing-navigation.md)
- Learn about [Styling & Theming](styling-theming.md)
- Check out [Examples](../examples/counter-app.md)
