# Implementation Plan - Dart Core Libraries (Single Package Strategy)

To avoid cluttering the codebase with many small packages, we will consolidate all Dart standard library implementations into a **single** infrastructure package.

## Architecture Change
**New Package**: `packages/flutterjs_dart`
**NPM Name**: `@flutterjs/dart`

This package will contain implementations for all core libraries as sub-modules. The transpiler will map `dart:` imports to specific paths within this single package.

### Structure
```text
packages/flutterjs_dart/
├── package.json          (exports: @flutterjs/dart)
├── src/
│   ├── math/
│   │   ├── index.js      (exports Point, Random, etc.)
│   │   └── random.js
│   ├── async/
│   │   ├── index.js      (exports Future, Stream, Timer)
│   │   ├── future.js
│   │   └── timer.js
│   ├── convert/
│   │   └── index.js
│   ├── collection/
│   │   └── index.js
│   ├── developer/
│   │   └── index.js
│   └── typed_data/
│       └── index.js
└── index.js              (Main entry point, aggregates exports if needed)
```

## Mappings
The [flutterjs.imports.json](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_engine/flutterjs.imports.json) (or the internal compiler resolution) will be configured to map:

| Dart Import | Maps To (Physical Path) |
| :--- | :--- |
| `dart:math` | `@flutterjs/dart/math` |
| `dart:async` | `@flutterjs/dart/async` |
| `dart:convert` | `@flutterjs/dart/convert` |
| `dart:collection` | `@flutterjs/dart/collection` |
| `dart:developer` | `@flutterjs/dart/developer` |
| `dart:typed_data` | `@flutterjs/dart/typed_data` |

## Execution Steps

### 1. Create `packages/flutterjs_dart`
- Initialize [package.json](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_engine/package.json) with name `@flutterjs/dart`.
- Configure `exports` in [package.json](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_engine/package.json) to expose subpaths `./math`, `./async`, etc.

### 2. Implement Modules
- **Math**: Wrapper for JS `Math`.
- **Async**: `Future` (Promise wrapper), `Timer`.
- **Convert**: `JSON` wrapper.
- **Collection**: `List` (Array), `Map` (Map), `Set` (Set).
- **TypedData**: `Uint8Array` wrapper.

### 3. Update Transpiler
- Modify `flutterjs_gen` to rewrite `dart:<name>` to `@flutterjs/dart/<name>`.

### 4. Register in Engine
- Update [packages/flutterjs_engine/flutterjs.imports.json](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_engine/flutterjs.imports.json) to point `@flutterjs/dart` to the local implementation.

## Benefits
- **Cleanliness**: One folder `packages/flutterjs_dart` instead of 6+.
- **Maintainability**: Shared utilities (like a base JS wrapper class) can live in `packages/flutterjs_dart/src/utils` and be reused across libs.
- **Scalability**: Adding `dart:isolate` or `dart:ui` later just means adding a folder.
