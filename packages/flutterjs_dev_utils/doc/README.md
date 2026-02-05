# FlutterJS Dev Utils - Documentation

Technical documentation for the `flutterjs_dev_utils` package.

---

## Overview

This package provides lightweight utilities for FlutterJS development. It's currently minimal but will grow as needed.

---

## Current Status

**Status**: Minimal/Placeholder Package

This package is currently minimal with basic dependencies. Utilities will be added as development needs arise.

---

## Structure

```
flutterjs_dev_utils/
├── lib/
│   ├── dev_utils.dart      # Main export file
│   └── src/
│       └── logger.dart/    # Logger utilities (empty)
├── test/                   # Unit tests
└── README.md              # Package documentation
```

---

## Planned Development

### Phase 1: Logging
- Simple logger implementation
- Log formatters
- File logging support

### Phase 2: File Utilities
- Path helpers
- File I/O utilities
- Directory operations

### Phase 3: String & Collection Utilities
- String manipulation
- Template rendering
- Collection helpers

---

## Usage Guidelines

### For Contributors

When adding utilities to this package:

1. **Keep it lightweight** - Only add truly reusable utilities
2. **No dependencies** - Minimize external dependencies
3. **Well tested** - Add comprehensive tests
4. **Well documented** - Document all public APIs

### For Consumers

This package should be used for:
- ✅ Simple utility functions
- ✅ Shared helper classes
- ✅ Common patterns

This package should NOT be used for:
- ❌ Complex business logic
- ❌ Package-specific code
- ❌ Large dependencies

---

## Contributing

See the [Contributing Guide](../../../docs/contributing/CONTRIBUTING.md) for details on how to contribute.

---

## See Also

- [Package README](../README.md)
- [FlutterJS Dev Tools](../../flutterjs_dev_tools/README.md)
