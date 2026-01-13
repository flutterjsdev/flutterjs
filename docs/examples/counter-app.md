# Example: Counter App

A walkthrough of the classic counter app demonstrating stateful widgets and state management.

---

## What You'll Learn

- Creating a `StatefulWidget`
- Using `setState()` to update UI
- Handling button clicks
- Basic Material Design layout

---

## Complete Code

```dart
// lib/main.dart
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FlutterJS Counter',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: MyHomePage(title: 'FlutterJS Counter Demo'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key? key, required this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'You have pushed the button this many times:',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.displayLarge,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: Icon(Icons.add),
      ),
    );
  }
}
```

---

## Code Breakdown

### 1. Main Entry Point

```dart
void main() {
  runApp(MyApp());
}
```

Every FlutterJS app starts with `main()` which calls `runApp()`.

### 2. App Widget (StatelessWidget)

```dart
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FlutterJS Counter',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: MyHomePage(title: 'FlutterJS Counter Demo'),
    );
  }
}
```

**`MaterialApp`:**
- Provides Material Design styling
- Sets app title and theme
- Defines the home screen

### 3. Home Page (StatefulWidget)

```dart
class MyHomePage extends StatefulWidget {
  MyHomePage({Key? key, required this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}
```

**StatefulWidget** has two parts:
1. The widget itself (`MyHomePage`) — immutable, holds configuration
2. The state (`_MyHomePageState`) — mutable, holds changing data

### 4. State Class

```dart
class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;  // State variable

  void _incrementCounter() {
    setState(() {
      _counter++;  // Update state
    });
  }

  @override
  Widget build(BuildContext context) {
    // Build UI based on current state
  }
}
```

**Key points:**
- `_counter` is the state — it can change over time
- `_incrementCounter()` modifies state using `setState()`
- `build()` is called whenever state changes

### 5. Building the UI

```dart
Widget build(BuildContext context) {
  return Scaffold(
    appBar: AppBar(
      title: Text(widget.title),  // Access widget property
    ),
    body: Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(
            'You have pushed the button this many times:',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(
            '$_counter',  // Display current counter value
            style: Theme.of(context).textTheme.displayLarge,
          ),
        ],
      ),
    ),
    floatingActionButton: FloatingActionButton(
      onPressed: _incrementCounter,  // Call increment function
      tooltip: 'Increment',
      child: Icon(Icons.add),
    ),
  );
}
```

**Layout structure:**
```
Scaffold
├── AppBar (title)
├── Body
│   └── Center
│       └── Column (vertical layout)
│           ├── Text (description)
│           └── Text (counter value)
└── FloatingActionButton
```

---

## How It Works

### Flow Diagram

```
1. App starts
   ↓
2. MyApp created (MaterialApp)
   ↓
3. MyHomePage created (StatefulWidget)
   ↓
4. _MyHomePageState created
   ↓
5. build() called → UI rendered
   ↓
6. User clicks FAB
   ↓
7. _incrementCounter() called
   ↓
8. setState() called → _counter++
   ↓
9. build() called again → UI updated with new counter
```

### State Update Cycle

```dart
// Initial state
_counter = 0

// User clicks button
onPressed: _incrementCounter

// Function executes
void _incrementCounter() {
  setState(() {
    _counter++;  // Now _counter = 1
  });
  // After setState, build() is called automatically
}

// UI rebuilds with new value
Text('$_counter')  // Shows "1"
```

---

## Running the Example

### 1. Navigate to Example

```bash
cd examples/counter
```

### 2. Run Development Server

```bash
dart run ../../bin/flutterjs.dart run --to-js --serve
```

### 3. Open Browser

The app will open automatically at `http://localhost:3000`

### 4. Test It

- Click the blue **+** button
- Counter increments each time
- Check browser DevTools — you'll see real HTML!

---

## Generated HTML

FlutterJS generates semantic HTML:

```html
<div class="flutter-scaffold">
  <header class="flutter-appbar">
    <h1>FlutterJS Counter Demo</h1>
  </header>
  
  <main>
    <div class="flutter-center">
      <div class="flutter-column">
        <span class="flutter-text">
          You have pushed the button this many times:
        </span>
        <span class="flutter-text" style="font-size: 57px;">
          5
        </span>
      </div>
    </div>
  </main>
  
  <button class="flutter-fab" aria-label="Increment">
    <svg><!-- add icon --></svg>
  </button>
</div>
```

**Notice:**
- Real HTML elements (not canvas!)
- Semantic tags (`<header>`, `<main>`)
- Accessible (aria-label)
- SEO-friendly

---

## Customizations

### Change Theme Color

```dart
theme: ThemeData(
  primarySwatch: Colors.purple,  // Change to purple
  useMaterial3: true,
),
```

### Add Reset Button

```dart
void _resetCounter() {
  setState(() {
    _counter = 0;
  });
}

// In build():
Row(
  mainAxisAlignment: MainAxisAlignment.center,
  children: [
    FloatingActionButton(
      onPressed: _incrementCounter,
      child: Icon(Icons.add),
    ),
    SizedBox(width: 16),
    FloatingActionButton(
      onPressed: _resetCounter,
      child: Icon(Icons.refresh),
    ),
  ],
)
```

### Add Decrement

```dart
void _decrementCounter() {
  setState(() {
    if (_counter > 0) _counter--;
  });
}

// Add another FAB
```

---

## Key Takeaways

1. **StatefulWidget** = Widget that can change over time
2. **setState()** = Updates state and triggers UI rebuild
3. **State lives in State class**, not in the widget
4. **build() is called whenever state changes**
5. **FlutterJS generates semantic HTML** from your Flutter code

---

## Next Steps

- Try the [Routing App Example](routing-app.md)
- Learn more about [State Management](../guides/state-management.md)
- Explore the [Widget Catalog](../guides/widget-catalog.md)
