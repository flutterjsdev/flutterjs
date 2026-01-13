# Quick Start

Build your first FlutterJS app in 5 minutes!

## 1. Create a New Project

```bash
flutterjs init my-app
cd my-app
```

This creates a new FlutterJS project with the following structure:

```
my-app/
├── lib/
│   └── main.dart          # Your Flutter/Dart code
├── build/
│   └── flutterjs/         # Generated JavaScript (auto-created)
├── pubspec.yaml           # Dart dependencies
└── README.md
```

---

## 2. Write Your First App

The `lib/main.dart` file contains a simple counter app by default:

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
      title: 'FlutterJS Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MyHomePage(title: 'FlutterJS Counter'),
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
            ),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headline4,
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

## 3. Run the Development Server

Navigate to your project directory and run:

```bash
cd examples/counter  # or your project directory

# Run the full pipeline: Dart → IR → JavaScript → Dev Server
dart run ../../bin/flutterjs.dart run --to-js --serve
```

This will:
1. Analyze your Dart code
2. Generate intermediate representation (IR)
3. Convert IR to JavaScript
4. Start a development server
5. Open your browser automatically

You should see:

```
✅ Dev Server running at http://localhost:3000
   📁 Project root: C:\...\my-app\build\flutterjs
   🌐 Opening browser...
```

---

## 4. View Your App

Open your browser to [http://localhost:3000](http://localhost:3000)

**Inspect the page source** — you'll see real HTML elements, not canvas!

```html
<div class="flutter-scaffold">
  <header class="flutter-appbar">
    <h1>FlutterJS Counter</h1>
  </header>
  <main>
    <div class="flutter-center">
      <div class="flutter-column">
        <span class="flutter-text">You have pushed the button this many times:</span>
        <span class="flutter-text">0</span>
      </div>
    </div>
  </main>
  <button class="flutter-fab">
    <svg>...</svg>
  </button>
</div>
```

---

## 5. Make Changes

Try editing `lib/main.dart`:

Change the title:
```dart
home: MyHomePage(title: 'My Awesome Counter App'),
```

Save the file and the Dart CLI will detect changes. Run the development server again to see your updates!

---

## 6. Build for Production

When ready to deploy:

```bash
flutterjs build
```

This creates optimized, production-ready files in the `dist/` directory:

```
dist/
├── index.html
├── app.min.js         # Minified JavaScript
└── styles.min.css     # Minified CSS
```

Deploy these files to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any web server

---

## What's Next?

- **Learn more widgets**: Check out the [Widget Catalog](../guides/widget-catalog.md)
- **Understand state management**: See [State Management Guide](../guides/state-management.md)
- **Add routing**: Build multi-page apps with [Routing & Navigation](../guides/routing-navigation.md)
- **Explore examples**: See [Examples](../examples/counter-app.md) for more patterns

---

## Common Issues

### Port Already in Use

If port 3000 is already in use:

```bash
dart run bin/flutterjs.dart run --to-js --serve --server-port 4000
```

### Browser Doesn't Open Automatically

Manually navigate to [http://localhost:3000](http://localhost:3000)

### Build Errors

Make sure you have:
- Dart SDK installed
- Run `dart pub get` in your project directory
- Valid Dart syntax in `lib/main.dart`
