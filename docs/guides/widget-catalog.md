# Widget Catalog

Complete reference of all supported widgets in FlutterJS.

> [!NOTE]
> FlutterJS implements the most commonly used Flutter widgets. More widgets are being added regularly.

---

> [!TIP]
> Want to know how these widgets render to HTML? Check out the [VDOM Rendering Architecture](../architecture/vdom-rendering.md).

---


## Layout Widgets

### Container

A versatile widget for styling and positioning.

```dart
Container(
  color: Colors.blue,
  padding: EdgeInsets.all(16.0),
  margin: EdgeInsets.symmetric(vertical: 8.0),
  width: 200,
  height: 100,
  child: Text('Hello FlutterJS'),
)
```

**Properties:**
- `child` — Single child widget
- `color` — Background color
- `padding` — Internal spacing
- `margin` — External spacing
- `width`, `height` — Dimensions
- `decoration` — BoxDecoration for advanced styling
- `alignment` — Child alignment

### Center

Centers its child widget.

```dart
Center(
  child: Text('Centered Text'),
)
```

### Padding

Adds padding around a child.

```dart
Padding(
  padding: EdgeInsets.all(16.0),
  child: Text('Padded Text'),
)
```

### SizedBox

A box with a specified size.

```dart
SizedBox(
  width: 100,
  height: 50,
  child: ElevatedButton(
    onPressed: () {},
    child: Text('Button'),
  ),
)
```

---

## Flexbox Widgets

### Row

Arranges children horizontally.

```dart
Row(
  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
  crossAxisAlignment: CrossAxisAlignment.center,
  children: [
    Icon(Icons.star),
    Text('Rating'),
    Text('4.5'),
  ],
)
```

**Properties:**
- `mainAxisAlignment` — Horizontal alignment
- `crossAxisAlignment` — Vertical alignment
- `mainAxisSize` — `max` or `min`
- `children` — List of widgets

### Column

Arranges children vertically.

```dart
Column(
  mainAxisAlignment: MainAxisAlignment.start,
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: [
    Text('Title'),
    Text('Subtitle'),
    ElevatedButton(
      onPressed: () {},
      child: Text('Action'),
    ),
  ],
)
```

### Expanded

Expands a child to fill available space in a Row or Column.

```dart
Row(
  children: [
    Text('Left'),
    Expanded(
      child: Text('Fills remaining space'),
    ),
    Text('Right'),
  ],
)
```

### Flexible

A more flexible version of Expanded with custom flex factor.

```dart
Row(
  children: [
    Flexible(
      flex: 2,
      child: Container(color: Colors.red, height: 100),
    ),
    Flexible(
      flex: 1,
      child: Container(color: Colors.blue, height: 100),
    ),
  ],
)
```

### Spacer

Creates flexible empty space.

```dart
Row(
  children: [
    Text('Left'),
    Spacer(),
    Text('Right'),
  ],
)
```

---

## Stack & Positioning

### Stack

Overlays widgets on top of each other.

```dart
Stack(
  children: [
    Container(width: 300, height: 300, color: Colors.blue),
    Positioned(
      top: 50,
      left: 50,
      child: Container(width: 100, height: 100, color: Colors.red),
    ),
  ],
)
```

### Positioned

Positions a child within a Stack.

```dart
Positioned(
  top: 10,
  right: 10,
  child: Icon(Icons.close),
)
```

---

## Material Design Widgets

### Scaffold

The basic structure for a Material Design page.

```dart
Scaffold(
  appBar: AppBar(
    title: Text('My App'),
  ),
  body: Center(
    child: Text('Content'),
  ),
  floatingActionButton: FloatingActionButton(
    onPressed: () {},
    child: Icon(Icons.add),
  ),
)
```

**Properties:**
- `appBar` — AppBar widget
- `body` — Main content
- `floatingActionButton` — FAB widget
- `drawer` — Side navigation drawer (planned)
- `bottomNavigationBar` — Bottom nav bar (planned)

### AppBar

Application header bar.

```dart
AppBar(
  title: Text('Page Title'),
  backgroundColor: Colors.blue,
  leading: IconButton(
    icon: Icon(Icons.menu),
    onPressed: () {},
  ),
  actions: [
    IconButton(
      icon: Icon(Icons.search),
      onPressed: () {},
    ),
  ],
)
```

### Card

Material Design card.

```dart
Card(
  elevation: 4.0,
  margin: EdgeInsets.all(8.0),
  child: Padding(
    padding: EdgeInsets.all(16.0),
    child: Text('Card Content'),
  ),
)
```

### Divider

A horizontal line divider.

```dart
Divider(
  height: 1,
  color: Colors.grey,
)
```

---

## Buttons

### ElevatedButton

Filled Material Design button.

```dart
ElevatedButton(
  onPressed: () {
    print('Button pressed');
  },
  child: Text('Click Me'),
)
```

### TextButton

Flat Material Design button.

```dart
TextButton(
  onPressed: () {},
  child: Text('Text Button'),
)
```

### IconButton

Button with an icon, no background.

```dart
IconButton(
  icon: Icon(Icons.favorite),
  onPressed: () {},
  tooltip: 'Like',
)
```

### FloatingActionButton

Circular floating action button.

```dart
FloatingActionButton(
  onPressed: () {},
  child: Icon(Icons.add),
  backgroundColor: Colors.blue,
)
```

---

## Text & Icons

### Text

Displays text.

```dart
Text(
  'Hello World',
  style: TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.blue,
  ),
  textAlign: TextAlign.center,
  maxLines: 2,
  overflow: TextOverflow.ellipsis,
)
```

### Icon

Displays a Material Design icon.

```dart
Icon(
  Icons.star,
  size: 48,
  color: Colors.yellow,
)
```

**Available Icons:**
- `Icons.add`, `Icons.remove`
- `Icons.home`, `Icons.settings`, `Icons.menu`
- `Icons.favorite`, `Icons.star`
- `Icons.search`, `Icons.close`
- And many more from Material Icons

---

## Images

### Image

Displays an image.

```dart
// Network image
Image.network(
  'https://example.com/image.jpg',
  width: 200,
  height: 200,
)

// Asset image
Image.asset(
  'assets/logo.png',
  width: 100,
  height: 100,
)
```

---

## Input Widgets

### TextField

Text input field.

```dart
TextField(
  decoration: InputDecoration(
    labelText: 'Enter your name',
    hintText: 'John Doe',
    border: OutlineInputBorder(),
  ),
  onChanged: (value) {
    print('Input: $value');
  },
)
```

### Checkbox

Boolean checkbox input.

```dart
Checkbox(
  value: isChecked,
  onChanged: (bool? value) {
    setState(() {
      isChecked = value ?? false;
    });
  },
)
```

### Switch

Boolean switch toggle.

```dart
Switch(
  value: isSwitched,
  onChanged: (bool value) {
    setState(() {
      isSwitched = value;
    });
  },
)
```

---

## Navigation

### Navigator

Manages app navigation. See [Routing & Navigation Guide](routing-navigation.md) for details.

```dart
// Push new route
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => SecondScreen()),
);

// Pop route
Navigator.pop(context);
```

### MaterialPageRoute

Defines a route with Material Design transition.

```dart
MaterialPageRoute(
  builder: (context) => MyScreen(),
)
```

---

## Gesture Detection

### GestureDetector

Detects various gestures.

```dart
GestureDetector(
  onTap: () {
    print('Tapped');
  },
  onDoubleTap: () {
    print('Double tapped');
  },
  child: Container(
    width: 100,
    height: 100,
    color: Colors.blue,
  ),
)
```

---

## Scrolling Widgets

### ListView

Scrollable list of widgets.

```dart
ListView(
  children: [
    ListTile(title: Text('Item 1')),
    ListTile(title: Text('Item 2')),
    ListTile(title: Text('Item 3')),
  ],
)
```

### ListView.builder

Efficiently builds long lists.

```dart
ListView.builder(
  itemCount: 100,
  itemBuilder: (context, index) {
    return ListTile(
      title: Text('Item $index'),
    );
  },
)
```

---

## Common Patterns

### EdgeInsets

Padding/margin values.

```dart
EdgeInsets.all(16.0)                        // All sides
EdgeInsets.symmetric(horizontal: 16.0)      // Left & right
EdgeInsets.symmetric(vertical: 8.0)         // Top & bottom
EdgeInsets.only(left: 8.0, top: 16.0)       // Specific sides
```

### BoxDecoration

Advanced container styling.

```dart
BoxDecoration(
  color: Colors.white,
  borderRadius: BorderRadius.circular(8.0),
  boxShadow: [
    BoxShadow(
      color: Colors.black.withOpacity(0.1),
      blurRadius: 4.0,
      offset: Offset(0, 2),
    ),
  ],
)
```

---

## Widget Limitations

> [!WARNING]
> Not all Flutter widgets are supported yet. Focus is on commonly used widgets.

**Planned additions:**
- `ListView.separated`
- `GridView`
- `Drawer`
- `BottomNavigationBar`
- `TabBar` / `TabBarView`
- `AlertDialog`
- `SnackBar`

See the [GitHub Issues](https://github.com/flutterjsdev/flutterjs/issues) for the latest widget roadmap.

---

## Next Steps

- Learn [State Management](state-management.md)
- Explore [Routing & Navigation](routing-navigation.md)
- Check out [Examples](../examples/counter-app.md)
