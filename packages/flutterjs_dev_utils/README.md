# FlutterJS Dev Utils

**Package**: `flutterjs_dev_utils`  
**Purpose**: Development utilities and helper functions for FlutterJS

---

## Overview

`flutterjs_dev_utils` provides utility functions and helper classes for FlutterJS development. This package contains shared utilities used across multiple FlutterJS packages.

> [!NOTE]
> This is currently a minimal utility package. Additional utilities will be added as needed.

---

## Features

### Logger Utilities

Lightweight logging helpers for development.

**Planned features:**
- Simple console logging
- File logging
- Log formatters
- Log level filtering

---

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  flutterjs_dev_utils: ^1.0.0
```

---

## Usage

```dart
import 'package:flutterjs_dev_utils/dev_utils.dart';

// Logger usage (when implemented)
// final logger = Logger('MyComponent');
// logger.info('Message');
// logger.debug('Debug info');
```

---

## Planned Utilities

The following utilities are planned for future releases:

### File System Helpers
- Path manipulation utilities
- File reading/writing helpers
- Directory traversal

### String Utilities
- Case conversion
- Template rendering
- String formatting

### Collection Helpers
- List utilities
- Map utilities
- Set operations

### Timing Utilities
- Stopwatch helpers
- Debouncing
- Throttling

---

## Development

This package serves as a lightweight shared utility layer for FlutterJS development tools.

### Adding New Utilities

1. Create utility file in `lib/src/`
2. Export from `lib/dev_utils.dart`
3. Write tests in `test/`
4. Update this README

---

## See Also

- [FlutterJS Dev Tools](../flutterjs_dev_tools/README.md) - Development tools
- [FlutterJS Core](../flutterjs_core/README.md) - Core IR engine
- [Contributing Guide](../../docs/contributing/CONTRIBUTING.md)
