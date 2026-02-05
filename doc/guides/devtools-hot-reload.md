# Development Tools & Hot Reload

> [!NOTE]
> **Status**: Planned for future releases  
> Hot reload and DevTools are currently in development.

---

## Overview

FlutterJS is working on advanced development tools similar to Flutter's DevTools, optimized for web development.

---

## Planned Features

### 🔥 Hot Module Replacement (HMR)

Instant updates during development without page refresh.

**How it will work:**
```
1. Edit lib/main.dart
   ↓
2. FlutterJS detects change
   ↓
3. Recompile only affected code
   ↓
4. Push update via WebSocket
   ↓
5. Browser updates instantly (no refresh!)
   ↓
6. App state preserved
```

**Benefits:**
- Keep app state during development
- Instant feedback
- No page reloads
- Faster iteration

---

### 🐛 Widget Inspector

Browser-based widget tree inspector.

**Features:**
```
┌─────────────────────────────────────────┐
│ 🐛 FlutterJS DevTools                  │
├─────────────────────────────────────────┤
│ [Widget Tree] [Properties] [Performance]│
├─────────────────────────────────────────┤
│ WIDGET TREE                             │
│ ├─ MyApp                                │
│ │  └─ HomePage (StatefulWidget)         │
│ │     ├─ counter: 5 (state)             │
│ │     └─ Column                          │
│ │        ├─ Text: "Count: 5"            │
│ │        └─ ElevatedButton               │
│                                          │
│ PROPERTIES (selected: Text)              │
│ ├─ text: "Count: 5"                     │
│ ├─ style: {size: 16, weight: bold}     │
│ └─ state dependencies: [counter]        │
└─────────────────────────────────────────┘
```

**Capabilities:**
- Inspect widget tree in real-time
- View widget properties and state
- See dependency relationships
- Click to select elements on page

---

### ⚡ Performance Monitor

Track renders and performance metrics.

**Metrics tracked:**
- Render time per widget
- State update frequency
- Why widgets re-rendered
- Memory usage
- Bundle size breakdown

**Example output:**
```
PERFORMANCE
├─ Last rebuild: 2ms
├─ Widgets updated: 3
├─ Re-renders: 1
└─ Reason: state change (counter)
```

---

### 🔄 Incremental Builds

Only rebuild what changed.

**Smart rebuild system:**
```dart
// You change this:
int counter = 5;  // Changed from 0 to 5

// FlutterJS only rebuilds:
✓ _MyHomePageState
✓ Text widget displaying counter
✗ MyApp (unchanged, skipped)
✗ AppBar (unchanged, skipped)
```

**Benefits:**
- Faster rebuilds (seconds → milliseconds)
- Less CPU/memory usage
- Better development experience

---

### 🌐 Live Preview

Preview on multiple devices simultaneously.

**Planned:**
```bash
flutterjs dev --preview

✓ Dev server: http://localhost:3000
✓ Network:    http://192.168.1.100:3000

Scan QR code to preview on mobile:
[QR CODE]
```

- Preview on phone, tablet, desktop simultaneously
- All devices update with hot reload
- Test responsive layouts in real-time

---

## Current Development Workflow

### What Works Now

**Incremental compilation:**
```bash
# Run dev server
dart run bin/flutterjs.dart run --to-js --serve

# Make changes to lib/main.dart
# Run again to see changes
```

**What you get:**
- Changed files detected
- Only affected files recompiled
- Faster than full rebuild
- Manual browser refresh needed

### What's Coming

**True hot reload:**
- No manual refresh
- State preservation
- WebSocket live updates
- Sub-second updates

---

## Timeline

> [!IMPORTANT]
> These features are in active development. Follow the [roadmap](../README.md#roadmap) for updates.

**Estimated releases:**

| Feature | Status | Estimated |
|---------|--------|-----------|
| Incremental builds | ✅ Done | v1.0 (Jan 2026) |
| Browser DevTools extension | 🚧 In progress | v1.1 (Q1 2026) |
| Hot Module Replacement | 📋 Planned | v1.2 (Q2 2026) |
| Widget Inspector | 📋 Planned | v1.2 (Q2 2026) |
| Performance Monitor | 📋 Planned | v1.3 (Q2 2026) |
| Network preview | 📋 Planned | v1.4 (Q3 2026) |

---

## How to Help

Want to contribute to DevTools development?

1. **Try the dev server** and report issues
2. **Suggest features** via [GitHub Discussions](https://github.com/flutterjsdev/flutterjs/discussions)
3. **Contribute code** - see [Contributing Guide](../contributing/CONTRIBUTING.md)
4. **Test new features** when preview builds are available

---

## Comparison with Flutter DevTools

| Feature | Flutter DevTools | FlutterJS DevTools |
|---------|------------------|---------------------|
| **Widget Inspector** | ✅ Yes | 📋 Planned |
| **Performance** | ✅ Yes | 📋 Planned |
| **Memory** | ✅ Yes | 📋 Planned |
| **Network** | ✅ Yes | 📋 Planned |
| **Hot Reload** | ✅ Yes | 🚧 In progress |
| **Browser Integration** | ❌ No | ✅ Native (planned) |
| **Lightweight** | ❌ Separate app | ✅ Built-in panel |

**FlutterJS advantage:** Built directly into browser DevTools, no separate app needed!

---

## Stay Updated

- Watch the [GitHub repository](https://github.com/flutterjsdev/flutterjs)
- Check the [Roadmap](../README.md#roadmap)
- Join [Discussions](https://github.com/flutterjsdev/flutterjs/discussions)

---

**Questions?**  
Ask in [GitHub Discussions](https://github.com/flutterjsdev/flutterjs/discussions) or check the [FAQ](../FAQ.md).
