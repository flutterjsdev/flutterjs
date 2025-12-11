# Flutter Widget Architecture - What We Should Implement

## 1. **InheritedWidget** - Data Propagation Down Tree

**What it does:** Pass data down to all descendants without explicit props

```javascript
// Example: Theme data
InheritedWidget({
  data: { color: '#FF5722', font: 'Roboto' },
  child: Column({
    children: [
      Text("Uses theme automatically"),  // Can access theme without passing
      Button("Also gets theme")
    ]
  })
})

// In descendant widget
const theme = context.dependOnInheritedWidgetOfExactType(ThemeData);
// Gets theme without it being passed as prop
```

**When to use:**
- Global app theme
- Locale/language settings
- Authentication state
- Media queries (screen size)

---

## 2. **ProxyWidget** - Wrapper for Other Widgets

**What it does:** Wraps another widget and can intercept/modify its behavior

```javascript
class Padding extends ProxyWidget {
  constructor({ padding, child }) {
    super(child);
    this.padding = padding;
  }

  build(context) {
    return new VNode({
      tag: 'div',
      props: { 
        style: { 
          padding: `${this.padding}px` 
        }
      },
      children: [this.child.build(context)]
    });
  }
}

// Usage
Padding({
  padding: 16,
  child: Text("Padded text")
})
```

**Common examples:**
- Padding
- Margin
- Opacity
- Transform
- Visibility

---

## 3. **ParentDataWidget** - Pass Info to Parent

**What it does:** Child tells parent how to layout it

```javascript
// Flexible tells Column/Row how much space to take
Flexible({
  flex: 1,
  fit: FlexFit.tight,
  child: Text("Takes 1/3 of space")
})

Column({
  children: [
    Flexible(flex: 1, child: Text("1/3")),
    Flexible(flex: 2, child: Text("2/3"))  // 2x the space
  ]
})
```

**Real use cases:**
- Flexible - flex layout sizing
- Expanded - force child to expand
- Positioned - absolute positioning in Stack

---

## 4. **SingleChildRenderObjectWidget** - Direct DOM Control

**What it does:** Direct access to rendering, for custom layout

```javascript
class CustomBox extends SingleChildRenderObjectWidget {
  constructor({ width, height, child }) {
    super(child);
    this.width = width;
    this.height = height;
  }

  build(context) {
    return new VNode({
      tag: 'div',
      props: {
        style: {
          width: `${this.width}px`,
          height: `${this.height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      },
      children: [this.child.build(context)]
    });
  }
}
```

**When to use:**
- Custom layouts
- Complex rendering logic
- Direct DOM manipulation

---

## 5. **MultiChildRenderObjectWidget** - Multiple Children with Custom Layout

**What it does:** Like Column/Row but you control layout algorithm

```javascript
class Grid extends MultiChildRenderObjectWidget {
  constructor({ columns, children }) {
    super(children);
    this.columns = columns;
  }

  build(context) {
    return new VNode({
      tag: 'div',
      props: {
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${this.columns}, 1fr)`,
          gap: '16px'
        }
      },
      children: this.children.map(child => 
        child instanceof Widget ? child.build(context) : child
      )
    });
  }
}

// Usage
Grid({
  columns: 3,
  children: [
    Container(...),
    Container(...),
    Container(...)
  ]
})
```

---

## 6. **Theme & InheritedModel** - Advanced State Propagation

**What it does:** Only rebuild widgets that depend on changed data

```javascript
class AppTheme extends InheritedWidget {
  constructor({ theme, child }) {
    super(child);
    this.theme = theme;
  }

  // Only notify dependents when theme changes
  updateShouldNotify(oldWidget) {
    return oldWidget.theme !== this.theme;
  }

  // In child widgets
  static of(context) {
    return context.dependOnInheritedWidgetOfExactType(AppTheme).theme;
  }
}

// Usage
AppTheme({
  theme: { primaryColor: '#FF5722' },
  child: MyApp()
})

// In child
class MyButton extends StatelessWidget {
  build(context) {
    const theme = AppTheme.of(context);
    return Container({
      color: theme.primaryColor,  // Automatically updates on theme change
      child: Text("Themed Button")
    });
  }
}
```

---

## 7. **LayoutBuilder** - Respond to Constraints

**What it does:** Build widget based on available space

```javascript
LayoutBuilder({
  builder: (context, constraints) => {
    if (constraints.maxWidth > 600) {
      return Row({ children: [...] });  // Wide screen
    } else {
      return Column({ children: [...] });  // Mobile
    }
  }
})
```

**Use cases:**
- Responsive layouts
- Adaptive design
- Screen-size dependent UI

---

## 8. **Semantics & Accessibility**

**What it does:** Add accessibility metadata

```javascript
Semantics({
  label: 'Submit button',
  onTap: handleSubmit,
  enabled: isEnabled,
  child: Button({ label: "Submit" })
})
```

**Important for:**
- Screen readers
- Voice control
- Keyboard navigation
- Testing

---

## 9. **Listenable/ValueNotifier** - Observable State

**What it does:** Widget rebuilds when listened value changes

```javascript
class Counter extends StatefulWidget {
  createState() {
    return CounterState();
  }
}

class CounterState extends State {
  count = new ValueNotifier(0);

  build(context) {
    return Column({
      children: [
        ValueListenableBuilder({
          valueListenable: this.count,
          builder: (context, value, child) => {
            return Text(`Count: ${value}`);  // Rebuilds when count changes
          }
        }),
        Button({
          onPressed: () => this.count.value++
        })
      ]
    });
  }
}
```

---

## 10. **Stream & Future Builders** - Async Handling

**What it does:** Build UI based on async data

```javascript
StreamBuilder({
  stream: fetchUserDataStream(),
  builder: (context, snapshot) => {
    if (snapshot.connectionState === ConnectionState.waiting) {
      return CircularProgressIndicator();
    }
    if (snapshot.hasError) {
      return Text(`Error: ${snapshot.error}`);
    }
    return UserProfile({ data: snapshot.data });
  }
})
```

**Use cases:**
- API calls
- Real-time data
- File uploads
- WebSocket data

---

## 11. **AnimatedWidget** - Automatic Animation

**What it does:** Rebuilds automatically as animation progresses

```javascript
class FadeIn extends AnimatedWidget {
  constructor({ animation, child }) {
    super(animation);
    this.child = child;
  }

  build(context) {
    return Opacity({
      opacity: this.listenable.value,  // Updates as animation runs
      child: this.child
    });
  }
}

// Usage
FadeIn({
  animation: animationController,
  child: Text("Fading in...")
})
```

---

## Priority Implementation Order

**Phase 1 (Essential):**
1. InheritedWidget - needed for theme/state
2. ProxyWidget - wrappers (Padding, Margin)
3. ParentDataWidget - layout flexibility

**Phase 2 (Common):**
4. SingleChildRenderObjectWidget - custom single layouts
5. MultiChildRenderObjectWidget - custom multi layouts
6. LayoutBuilder - responsive

**Phase 3 (Advanced):**
7. Accessibility/Semantics
8. ValueNotifier - observable state
9. StreamBuilder - async
10. AnimatedWidget - animations

---

## Architecture Overview

```
Widget (Base)
├── StatelessWidget
│   └── StatelessElement
├── StatefulWidget
│   └── StatefulElement
├── InheritedWidget ✨
│   └── InheritedElement
├── ProxyWidget ✨
│   └── ProxyElement
├── ParentDataWidget ✨
│   └── ParentDataElement
├── SingleChildRenderObjectWidget ✨
│   └── RenderObjectElement
├── MultiChildRenderObjectWidget ✨
│   └── RenderObjectElement
├── LayoutBuilder ✨
├── ValueListenableBuilder ✨
├── StreamBuilder ✨
└── AnimatedWidget ✨
```

---

## Key Advantages of Full Architecture

1. **Composition over Inheritance** - Small, reusable pieces
2. **Data Flow** - Clear top-down (props) and bottom-up (state)
3. **Performance** - Fine-grained rebuild control
4. **Flexibility** - Can build almost any UI pattern
5. **Testability** - Widgets are just functions
6. **Scalability** - Works for small apps and huge codebases