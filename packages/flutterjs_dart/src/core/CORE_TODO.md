# dart:core Implementation Checklist

## Status
- ✅ = Implemented
- 🔄 = Partially implemented
- ❌ = Not implemented
- 🚫 = Not needed for web (VM/native only)

## Core Classes

### Time & Date
- ✅ **Duration** - Time span representation (COMPLETED)
- ❌ **DateTime** - Point in time (HIGH PRIORITY - widely used)
- ❌ **Stopwatch** - Time measurement (MEDIUM - used for performance monitoring)

### Numbers & Math
- 🔄 **num** - Base numeric type (JS handles natively)
- 🔄 **int** - Integer type (JS handles natively)
- 🔄 **double** - Floating point (JS handles natively)
- 🔄 **BigInt** - Arbitrary precision integers (JS has BigInt)

### Strings
- 🔄 **String** - String type (JS handles natively)
- ❌ **StringBuffer** - Efficient string building (MEDIUM - used in code generation)
- 🔄 **StringSink** - String output interface
- ❌ **RegExp** - Regular expressions (LOW - JS RegExp works)
- ❌ **Pattern** - String pattern interface

### Collections
- 🔄 **List** - Array/list (JS Array)
- 🔄 **Map** - Key-value pairs (JS Map/Object)
- 🔄 **Set** - Unique values (JS Set)
- ✅ **Iterable** - Iteration interface (DONE in index.js)
- ✅ **Iterator** - Iterator interface (DONE in index.js)

### Core Types
- 🔄 **Object** - Base object type
- 🔄 **bool** - Boolean type (JS boolean)
- 🔄 **Null** - Null type (JS null)
- ❌ **Symbol** - Symbolic name (LOW)
- ❌ **Type** - Runtime type representation (LOW)
- ❌ **Record** - Record types (Dart 3.0 - LOW)

### Comparison & Ordering
- ✅ **Comparable** - Comparison interface (DONE in index.js)

### Errors & Exceptions
- ❌ **Error** - Base error class (HIGH - error handling)
- ❌ **Exception** - Base exception class (HIGH - error handling)
- ❌ **ArgumentError** - Invalid argument (HIGH)
- ❌ **RangeError** - Out of range (HIGH)
- ❌ **StateError** - Invalid state (MEDIUM)
- ❌ **UnsupportedError** - Unsupported operation (MEDIUM)
- ❌ **UnimplementedError** - Not implemented (LOW)
- ❌ **FormatException** - Invalid format (MEDIUM)

### Functions & Reflection
- 🔄 **Function** - Function type (JS function)
- ❌ **Invocation** - Method invocation (LOW - reflection)

### URI
- ✅ **Uri** - URI parsing (DONE)

### Other
- 🔄 **Sink** - Data sink interface
- 🚫 **StackTrace** - Stack trace (Browser provides this)
- 🚫 **Weak** - Weak references (JS WeakRef)

## Priority Implementation Order

### P0 - Critical (Needed for runtime)
1. ✅ Duration
2. DateTime
3. Error/Exception hierarchy

### P1 - High (Common usage)
4. StringBuffer
5. ArgumentError, RangeError
6. Stopwatch

### P2 - Medium (Less common)
7. StateError, UnsupportedError
8. FormatException
9. Symbol, Type

### P3 - Low (Rare or JS-native)
10. Pattern, RegExp wrappers
11. Record types
12. Invocation

## Notes

- Many types like `int`, `double`, `bool`, `String`, `List`, `Map`, `Set` are natively supported by JavaScript and don't need full implementations
- Focus on classes that have specific Dart behaviors that differ from JS (Duration, DateTime)
- Error/Exception hierarchy is important for proper error handling in generated code
- StringBuffer is used heavily in Flutter's rendering code
