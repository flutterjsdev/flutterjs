# Routing & Navigation

Learn how to navigate between screens in FlutterJS.

## Overview

FlutterJS supports Flutter's `Navigator` API for managing multiple screens in your app.

**Key concepts:**
- **Route** — A screen or page in your app
- **Navigator** — Manages the route stack (push, pop)
- **MaterialPageRoute** — Defines a route with Material Design transitions

---

## Basic Navigation

### Push a New Route

Navigate to a new screen:

```dart
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => SecondScreen()),
);
```

### Pop (Go Back)

Return to the previous screen:

```dart
Navigator.pop(context);
```

---

## Complete Example

### Main App with Navigation

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Navigation Demo',
      home: HomeScreen(),
    );
  }
}

// Home Screen
class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Home'),
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            // Navigate to second screen
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => SecondScreen()),
            );
          },
          child: Text('Go to Second Screen'),
        ),
      ),
    );
  }
}

// Second Screen
class SecondScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Second Screen'),
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            // Go back to previous screen
            Navigator.pop(context);
          },
          child: Text('Go Back'),
        ),
      ),
    );
  }
}
```

---

## Passing Data to Routes

### Forward Data

Pass data when navigating:

```dart
// Navigate with data
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => DetailScreen(
      userId: 123,
      userName: 'Alice',
    ),
  ),
);

// Receive data in destination screen
class DetailScreen extends StatelessWidget {
  final int userId;
  final String userName;

  DetailScreen({required this.userId, required this.userName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('User Details'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('User ID: $userId'),
            Text('Name: $userName'),
          ],
        ),
      ),
    );
  }
}
```

### Return Data

Return data from a route:

```dart
// Screen that returns data
class SelectionScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Select')),
      body: Center(
        child: Column(
          children: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context, 'Option A');
              },
              child: Text('Option A'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context, 'Option B');
              },
              child: Text('Option B'),
            ),
          ],
        ),
      ),
    );
  }
}

// Screen that receives returned data
class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _selectedOption = 'None';

  Future<void> _navigateAndGetResult(BuildContext context) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => SelectionScreen()),
    );

    if (result != null) {
      setState(() {
        _selectedOption = result;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Home')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Selected: $_selectedOption'),
            ElevatedButton(
              onPressed: () => _navigateAndGetResult(context),
              child: Text('Select Option'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## Named Routes

Define routes with names for easier navigation.

### Setup Named Routes

```dart
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Named Routes Demo',
      initialRoute: '/',
      routes: {
        '/': (context) => HomeScreen(),
        '/second': (context) => SecondScreen(),
        '/third': (context) => ThirdScreen(),
      },
    );
  }
}
```

### Navigate Using Named Routes

```dart
// Navigate to named route
Navigator.pushNamed(context, '/second');

// Navigate with arguments
Navigator.pushNamed(
  context,
  '/detail',
  arguments: {'id': 123, 'name': 'Alice'},
);

// Extract arguments in destination screen
class DetailScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)!.settings.arguments as Map;
    final id = args['id'];
    final name = args['name'];
    
    return Scaffold(
      appBar: AppBar(title: Text('Details')),
      body: Text('ID: $id, Name: $name'),
    );
  }
}
```

---

## Navigation Patterns

### Replace Current Route

Replace the current screen instead of pushing:

```dart
Navigator.pushReplacement(
  context,
  MaterialPageRoute(builder: (context) => NewScreen()),
);
```

**Use case:** Login flow — after successful login, replace login screen with home screen.

### Pop Until First Route

Return to the first screen, removing all others:

```dart
Navigator.popUntil(context, (route) => route.isFirst);
```

### Push and Remove Until

Navigate and clear the stack:

```dart
Navigator.pushAndRemoveUntil(
  context,
  MaterialPageRoute(builder: (context) => HomeScreen()),
  (route) => false,  // Remove all previous routes
);
```

**Use case:** Logout — clear all screens and show login screen.

---

## AppBar Back Button

The AppBar automatically shows a back button when there are routes in the stack.

```dart
Scaffold(
  appBar: AppBar(
    title: Text('Screen Title'),
    // Back button appears automatically
  ),
  body: YourContent(),
)
```

### Custom Back Button

Override the back button behavior:

```dart
AppBar(
  title: Text('Custom Back'),
  leading: IconButton(
    icon: Icon(Icons.arrow_back),
    onPressed: () {
      // Custom back logic
      print('Going back...');
      Navigator.pop(context);
    },
  ),
)
```

---

## Navigation Guards

Prevent navigation under certain conditions:

```dart
class HomeScreen extends StatelessWidget {
  bool _canNavigate = false;

  void _navigateIfAllowed(BuildContext context) {
    if (_canNavigate) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => SecondScreen()),
      );
    } else {
      // Show error or require action
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('Access Denied'),
          content: Text('Complete requirements first'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ElevatedButton(
        onPressed: () => _navigateIfAllowed(context),
        child: Text('Try to Navigate'),
      ),
    );
  }
}
```

---

## Best Practices

### 1. Use Context Carefully

Always use the correct `BuildContext`:

```dart
// ✅ Good: Use context from builder
MaterialPageRoute(
  builder: (context) => DetailScreen(),
)

// ❌ Bad: Using stale context
```

### 2. Clean Up Resources

Dispose resources when leaving a screen:

```dart
class MyScreen extends StatefulWidget {
  @override
  _MyScreenState createState() => _MyScreenState();
}

class _MyScreenState extends State<MyScreen> {
  late Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(Duration(seconds: 1), (_) {});
  }

  @override
  void dispose() {
    _timer.cancel();  // Clean up!
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: Text('Content'));
  }
}
```

### 3. Handle Back Button on Android

Users expect the back button to work:

```dart
// FlutterJS handles this automatically
// Navigator.pop(context) works with browser back button
```

---

## Current Limitations

> [!NOTE]
> Some advanced navigation features are not yet supported in FlutterJS v1.

**Not yet supported:**
- `onGenerateRoute` callback
- Deep linking
- Hero animations (transitions between routes)
- Bottom navigation with persistent state
- Tab views with navigation

**Planned for future releases.**

---

## Next Steps

- Explore [Examples](../examples/routing-app.md) for complete routing demos
- Learn about [State Management](state-management.md) across routes
- Check out [Styling & Theming](styling-theming.md)
