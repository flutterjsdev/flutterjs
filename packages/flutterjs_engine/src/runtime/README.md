# @flutterjs/runtime

**Package**: `@flutterjs/runtime`  
**Description**: The core runtime engine for FlutterJS.

---

## Overview

This package implements the core primitives of the Flutter framework in JavaScript. It mimics the Flutter element tree, state management, and build lifecycle.

## Core Concepts

### 1. Element Tree
Managed by `element.js`. Elements are the mutable instances that handle the lifecycle of widgets.
- `mount()`
- `update()`
- `unmount()`

### 2. Build Context
Implemented in `build_context.js`. It provides the handle to the location in the tree.

### 3. State Management
`state.js` implements the Logic for `StatefulWidget`.
- `setState()`: Schedules a rebuild.

### 4. Scheduler
`update_batcher.js` and `runtime_engine.js` manage the frame scheduling to ensure efficient updates.

## Exports

- `element.js`: Base Element class.
- `state.js`: Base State class.
- `build_context.js`: BuildContext implementation.
- `inherited_element.js`: For propagating data down the tree.

## Relationship

This package depends on `@flutterjs/vdom` for the actual rendering instructions.
