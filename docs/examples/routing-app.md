# Example: Routing App

A walkthrough of a multi-page app demonstrating navigation, routing, and state management across screens.

---

## What You'll Learn

- Creating multiple screens
- Navigation with `Navigator.push()` and `Navigator.pop()`
- Passing data between screens
- Named routes
- AppBar back button

---

## App Structure

The routing app has three screens:

```
Home Screen → Detail Screen → Settings Screen
     ↑              ↓
     └──────────────┘
```

---

## Complete Code

### Main Entry Point

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'screens/detail_screen.dart';
import 'screens/settings_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FlutterJS Routing Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => HomeScreen(),
        '/detail': (context) => DetailScreen(),
        '/settings': (context) => SettingsScreen(),
      },
    );
  }
}
```

### Home Screen

```dart
// lib/screens/home_screen.dart
import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Home'),
        actions: [
          IconButton(
            icon: Icon(Icons.settings),
            onPressed: () {
              Navigator.pushNamed(context, '/settings');
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome to FlutterJS!',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(
                  context,
                  '/detail',
                  arguments: {
                    'title': 'Item 1',
                    'description': 'Details about Item 1',
                  },
                );
              },
              child: Text('View Item 1'),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(
                  context,
                  '/detail',
                  arguments: {
                    'title': 'Item 2',
                    'description': 'Details about Item 2',
                  },
                );
              },
              child: Text('View Item 2'),
            ),
          ],
        ),
      ),
    );
  }
}
```

### Detail Screen

```dart
// lib/screens/detail_screen.dart
import 'package:flutter/material.dart';

class DetailScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Extract arguments
    final args = ModalRoute.of(context)!.settings.arguments as Map;
    final title = args['title'] as String;
    final description = args['description'] as String;

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
      ),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Details',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            SizedBox(height: 16),
            Text(
              description,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
              },
              child: Text('Go Back'),
            ),
          ],
        ),
      ),
    );
  }
}
```

### Settings Screen

```dart
// lib/screens/settings_screen.dart
import 'package:flutter/material.dart';

class SettingsScreen extends StatefulWidget {
  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _darkModeEnabled = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Settings'),
      ),
      body: ListView(
        children: [
          SwitchListTile(
            title: Text('Enable Notifications'),
            value: _notificationsEnabled,
            onChanged: (bool value) {
              setState(() {
                _notificationsEnabled = value;
              });
            },
          ),
          SwitchListTile(
            title: Text('Dark Mode'),
            value: _darkModeEnabled,
            onChanged: (bool value) {
              setState(() {
                _darkModeEnabled = value;
              });
            },
          ),
          Divider(),
          ListTile(
            title: Text('App Version'),
            subtitle: Text('1.0.0'),
          ),
        ],
      ),
    );
  }
}
```

---

## Code Breakdown

### 1. Named Routes

```dart
MaterialApp(
  initialRoute: '/',  // Starting route
  routes: {
    '/': (context) => HomeScreen(),
    '/detail': (context) => DetailScreen(),
    '/settings': (context) => SettingsScreen(),
  },
)
```

**Benefits:**
- Clean navigation: `Navigator.pushNamed(context, '/detail')`
- Centralized route management
- Easy to maintain

### 2. Passing Data

**Send data:**
```dart
Navigator.pushNamed(
  context,
  '/detail',
  arguments: {
    'title': 'Item 1',
    'description': 'Details about Item 1',
  },
);
```

**Receive data:**
```dart
final args = ModalRoute.of(context)!.settings.arguments as Map;
final title = args['title'] as String;
```

### 3. AppBar Navigation

```dart
AppBar(
  title: Text('Home'),
  actions: [
    IconButton(
      icon: Icon(Icons.settings),
      onPressed: () {
        Navigator.pushNamed(context, '/settings');
      },
    ),
  ],
)
```

The back button appears automatically when there are routes in the stack!

---

## Navigation Flow

### Push Navigation

```
1. User on HomeScreen (/)
   ↓
2. Clicks "View Item 1"
   ↓
3. Navigator.pushNamed('/detail') called
   ↓
4. DetailScreen pushed onto stack
   ↓
5. Stack: [HomeScreen, DetailScreen]
   ↓
6. User sees DetailScreen
```

### Pop Navigation

```
1. User on DetailScreen
   ↓
2. Clicks "Go Back" or AppBar back button
   ↓
3. Navigator.pop() called
   ↓
4. DetailScreen removed from stack
   ↓
5. Stack: [HomeScreen]
   ↓
6. User sees HomeScreen again
```

---

## Running the Example

### 1. Navigate to Example

```bash
cd examples/routing_app
```

### 2. Run Development Server

```bash
dart run ../../bin/flutterjs.dart run --to-js --serve
```

### 3. Test Navigation

- Navigate to different screens
- Use back buttons
- Pass different data to detail screen
- Change settings toggles

---

## Generated HTML

FlutterJS generates proper navigation:

```html
<!-- Home Screen -->
<div class="flutter-scaffold">
  <header class="flutter-appbar">
    <h1>Home</h1>
    <button class="flutter-icon-button">
      <svg><!-- settings icon --></svg>
    </button>
  </header>
  <main>
    <!-- Content -->
  </main>
</div>

<!-- When navigating to Detail Screen -->
<div class="flutter-scaffold">
  <header class="flutter-appbar">
    <button class="flutter-back-button">
      <svg><!-- back arrow --></svg>
    </button>
    <h1>Item 1</h1>
  </header>
  <main>
    <p>Details about Item 1</p>
  </main>
</div>
```

**Notice:**
- Back button appears automatically
- Clean URL routing (planned feature)
- Browser back/forward buttons work (planned)

---

## Customizations

### Add More Screens

```dart
routes: {
  '/': (context) => HomeScreen(),
  '/detail': (context) => DetailScreen(),
  '/settings': (context) => SettingsScreen(),
  '/profile': (context) => ProfileScreen(),  // New screen
},
```

### Add Transitions

```dart
Navigator.push(
  context,
  PageRouteBuilder(
    pageBuilder: (context, animation, secondaryAnimation) => DetailScreen(),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return FadeTransition(opacity: animation, child: child);
    },
  ),
);
```

*(Note: Custom transitions are planned for future releases)*

### Protect Routes

```dart
void _navigateIfLoggedIn(BuildContext context) {
  if (isUserLoggedIn) {
    Navigator.pushNamed(context, '/profile');
  } else {
    Navigator.pushNamed(context, '/login');
  }
}
```

---

## Best Practices

### 1. Organize by Screens

```
lib/
├── main.dart
├── screens/
│   ├── home_screen.dart
│   ├── detail_screen.dart
│   └── settings_screen.dart
└── widgets/
    └── custom_card.dart
```

### 2. Define Route Names

```dart
// lib/routes.dart
class Routes {
  static const String home = '/';
  static const String detail = '/detail';
  static const String settings = '/settings';
}

// Usage
Navigator.pushNamed(context, Routes.detail);
```

### 3. Handle Missing Routes

```dart
MaterialApp(
  onUnknownRoute: (settings) {
    return MaterialPageRoute(
      builder: (context) => NotFoundScreen(),
    );
  },
)
```

---

## Key Takeaways

1. **Named routes** make navigation cleaner
2. **Arguments** pass data between screens
3. **AppBar back button** appears automatically
4. **Navigator stack** manages route history
5. **FlutterJS preserves routing** in generated HTML

---

## Next Steps

- Learn more about [Routing & Navigation](../guides/routing-navigation.md)
- Try the [Counter App Example](counter-app.md)
- Explore [State Management](../guides/state-management.md) across routes
