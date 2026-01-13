# Styling & Theming

Learn how to style your FlutterJS applications with Material Design and custom themes.

## Material Design

FlutterJS implements Material Design 3 by default, giving your app a modern, professional look.

---

## Using Colors

### Predefined Colors

```dart
Container(
  color: Colors.blue,
  child: Text('Blue background'),
)
```

**Available colors:**
- `Colors.red`, `Colors.blue`, `Colors.green`, `Colors.yellow`
- `Colors.orange`, `Colors.purple`, `Colors.pink`, `Colors.teal`
- `Colors.grey`, `Colors.black`, `Colors.white`
- `Colors.transparent`

### Custom Colors

Use hex color codes:

```dart
Container(
  color: Color(0xFF6750A4),  // Purple
  child: Text('Custom color'),
)
```

### Color with Opacity

```dart
Container(
  color: Colors.blue.withOpacity(0.5),  // 50% transparent blue
  child: Text('Semi-transparent'),
)
```

---

## Text Styling

### Basic Text Styles

```dart
Text(
  'Styled Text',
  style: TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.blue,
    fontStyle: FontStyle.italic,
    letterSpacing: 2.0,
  ),
)
```

### TextStyle Properties

| Property | Description | Example |
|----------|-------------|---------|
| `fontSize` | Size in pixels | `24`, `16` |
| `fontWeight` | Thickness | `FontWeight.bold`, `FontWeight.normal` |
| `fontStyle` | Style | `FontStyle.italic`, `FontStyle.normal` |
| `color` | Text color | `Colors.blue` |
| `letterSpacing` | Space between letters | `1.0`, `2.0` |
| `height` | Line height multiplier | `1.5`, `2.0` |

### Font Weights

```dart
FontWeight.w100  // Thin
FontWeight.w300  // Light
FontWeight.w400  // Normal (same as FontWeight.normal)
FontWeight.w500  // Medium
FontWeight.w700  // Bold (same as FontWeight.bold)
FontWeight.w900  // Black
```

---

## Material Theme

### Using Theme Colors

Access theme colors from context:

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      color: theme.colorScheme.primary,
      child: Text(
        'Themed text',
        style: theme.textTheme.headlineMedium,
      ),
    );
  }
}
```

### Theme Color Scheme

FlutterJS uses Material Design 3 color system:

```dart
final theme = Theme.of(context);

// Primary colors
theme.colorScheme.primary           // Main brand color
theme.colorScheme.onPrimary         // Text on primary
theme.colorScheme.primaryContainer  // Lighter primary variant
theme.colorScheme.onPrimaryContainer

// Secondary colors
theme.colorScheme.secondary
theme.colorScheme.onSecondary
theme.colorScheme.secondaryContainer
theme.colorScheme.onSecondaryContainer

// Surface colors
theme.colorScheme.surface           // Card, sheet backgrounds
theme.colorScheme.onSurface         // Text on surface
theme.colorScheme.background        // App background
theme.colorScheme.onBackground

// Error colors
theme.colorScheme.error
theme.colorScheme.onError
```

---

## Custom Theme

### Define Custom Theme

```dart
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.purple,
        ),
        textTheme: TextTheme(
          displayLarge: TextStyle(
            fontSize: 57,
            fontWeight: FontWeight.bold,
          ),
          bodyLarge: TextStyle(
            fontSize: 16,
          ),
        ),
      ),
      home: HomeScreen(),
    );
  }
}
```

### Text Theme Styles

Material Design provides 13 predefined text styles:

```dart
final theme = Theme.of(context);

// Display (largest)
theme.textTheme.displayLarge   // 57px
theme.textTheme.displayMedium  // 45px
theme.textTheme.displaySmall   // 36px

// Headline
theme.textTheme.headlineLarge  // 32px
theme.textTheme.headlineMedium // 28px
theme.textTheme.headlineSmall  // 24px

// Title
theme.textTheme.titleLarge     // 22px
theme.textTheme.titleMedium    // 16px
theme.textTheme.titleSmall     // 14px

// Body (most common)
theme.textTheme.bodyLarge      // 16px
theme.textTheme.bodyMedium     // 14px
theme.textTheme.bodySmall      // 12px

// Label
theme.textTheme.labelLarge     // 14px (buttons)
```

### Usage Example

```dart
Text(
  'Page Title',
  style: Theme.of(context).textTheme.headlineLarge,
)

Text(
  'Body text here...',
  style: Theme.of(context).textTheme.bodyMedium,
)
```

---

## Container Decoration

### BoxDecoration

Advanced styling for containers:

```dart
Container(
  width: 200,
  height: 100,
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(12),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.1),
        blurRadius: 8,
        offset: Offset(0, 4),
      ),
    ],
    border: Border.all(
      color: Colors.grey,
      width: 2,
    ),
  ),
  child: Center(
    child: Text('Decorated Box'),
  ),
)
```

### Border Radius

```dart
// All corners
BorderRadius.circular(12)

// Specific corners
BorderRadius.only(
  topLeft: Radius.circular(12),
  topRight: Radius.circular(12),
)

// Vertical or horizontal
BorderRadius.vertical(top: Radius.circular(12))
BorderRadius.horizontal(left: Radius.circular(12))
```

### Box Shadow

```dart
BoxShadow(
  color: Colors.black.withOpacity(0.2),
  blurRadius: 10,        // Softness
  spreadRadius: 2,       // Size
  offset: Offset(0, 5),  // Position (x, y)
)
```

---

## Gradients

### Linear Gradient

```dart
Container(
  decoration: BoxDecoration(
    gradient: LinearGradient(
      colors: [Colors.blue, Colors.purple],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
  ),
  child: Text('Gradient Background'),
)
```

### Radial Gradient

```dart
Container(
  decoration: BoxDecoration(
    gradient: RadialGradient(
      colors: [Colors.yellow, Colors.orange, Colors.red],
      center: Alignment.center,
      radius: 0.8,
    ),
  ),
)
```

---

## Spacing & Sizing

### EdgeInsets (Padding/Margin)

```dart
// All sides equal
EdgeInsets.all(16)

// Symmetric
EdgeInsets.symmetric(
  horizontal: 16,  // left & right
  vertical: 8,     // top & bottom
)

// Specific sides
EdgeInsets.only(
  left: 16,
  top: 8,
  right: 16,
  bottom: 8,
)

// Different values
EdgeInsets.fromLTRB(16, 8, 16, 8)  // left, top, right, bottom
```

### Sizing

```dart
// Fixed size
Container(width: 200, height: 100)

// Full width
Container(width: double.infinity)

// Percentage (use with parent constraints)
SizedBox(
  width: MediaQuery.of(context).size.width * 0.8,  // 80% width
)
```

---

## Elevation & Shadows

### Material Elevation

Cards and surfaces can have elevation:

```dart
Card(
  elevation: 4,  // Shadow depth (0-24)
  child: Padding(
    padding: EdgeInsets.all(16),
    child: Text('Elevated Card'),
  ),
)
```

### Custom Shadows

```dart
Container(
  decoration: BoxDecoration(
    boxShadow: [
      // Soft shadow
      BoxShadow(
        color: Colors.black.withOpacity(0.05),
        blurRadius: 10,
        offset: Offset(0, 2),
      ),
      // Stronger shadow
      BoxShadow(
        color: Colors.black.withOpacity(0.1),
        blurRadius: 20,
        offset: Offset(0, 10),
      ),
    ],
  ),
)
```

---

## Responsive Design

### MediaQuery

Get screen dimensions:

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    
    return Container(
      width: screenWidth * 0.9,  // 90% of screen width
      height: screenHeight * 0.5, // 50% of screen height
      child: Text('Responsive Container'),
    );
  }
}
```

### Breakpoints

```dart
class ResponsiveWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    
    if (width < 600) {
      // Mobile layout
      return MobileLayout();
    } else if (width < 1200) {
      // Tablet layout
      return TabletLayout();
    } else {
      // Desktop layout
      return DesktopLayout();
    }
  }
}
```

---

## Dark Mode

### Detect Dark Mode

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final brightness = MediaQuery.of(context).platformBrightness;
    final isDarkMode = brightness == Brightness.dark;
    
    return Container(
      color: isDarkMode ? Colors.black : Colors.white,
      child: Text(
        'Adaptive content',
        style: TextStyle(
          color: isDarkMode ? Colors.white : Colors.black,
        ),
      ),
    );
  }
}
```

### Define Dark Theme

```dart
MaterialApp(
  theme: ThemeData.light(),       // Light theme
  darkTheme: ThemeData.dark(),    // Dark theme
  themeMode: ThemeMode.system,    // Follows system setting
  home: HomeScreen(),
)
```

---

## Best Practices

### 1. Use Theme Colors

```dart
// ✅ Good: Uses theme
Container(
  color: Theme.of(context).colorScheme.primary,
)

// ❌ Bad: Hardcoded color
Container(color: Color(0xFF6750A4))
```

### 2. Consistent Spacing

```dart
// Use multiples of 4 or 8
EdgeInsets.all(8)
EdgeInsets.all(16)
EdgeInsets.all(24)
```

### 3. Semantic Text Styles

```dart
// ✅ Good: Semantic
Text('Title', style: theme.textTheme.headlineMedium)

// ❌ Bad: Manual styling everywhere
Text('Title', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w500))
```

---

## Next Steps

- Learn about [Rendering Modes](ssr-modes.md)
- Check out [Examples](../examples/counter-app.md)
- Explore [Widget Catalog](widget-catalog.md) for more widgets
