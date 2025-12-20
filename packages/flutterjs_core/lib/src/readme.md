# WRITING BUG IDENTIFIED ✓

## Problem Summary
**String reference 48 written when table only has 46 entries (indices 0-45)**

This means `getStringRef()` is writing an invalid index to the binary file.

---

## ROOT CAUSE: `writeInstanceCreationExpression()` in expression_writer.dart

### The Bug (Line ~50-60):
```dart
void writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
  writeType(expr.type);

  // ✗" TRACK: Capture widget class name
  final widgetClassName = expr.type.displayName();
  addString(widgetClassName);  // ← ADDED TO STRING TABLE

  writeByte(expr.constructorName != null ? 1 : 0);
  if (expr.constructorName != null) {
    writeUint32(getStringRef(expr.constructorName!));
  }

  writeByte(expr.isConst ? 1 : 0);

  writeUint32(expr.arguments.length);
  for (final arg in expr.arguments) {
    writeExpression(arg);
  }

  writeUint32(expr.namedArguments.length);
  for (final entry in expr.namedArguments.entries) {
    // ✗" TRACK: Named parameters like "child", "children", "body"
    addString(entry.key);  // ← PROBLEM! ADDING NEW STRINGS DURING WRITE PHASE
    writeUint32(getStringRef(entry.key));
    writeExpression(entry.value);
  }
  // ...
}
```

### The Problem:
1. **String collection phase** happens FIRST - all strings are collected into the table
2. **Writing phase** happens SECOND - should only write references to pre-collected strings
3. **Bug**: `writeInstanceCreationExpression()` calls `addString()` during write phase
4. **Result**: New strings get indices 46, 47, 48, etc. that don't exist in the written string table

---

## Why This Causes the Error

### Timeline:
1. **String Collection Phase**: Collects widget names, but NOT named argument keys (missing!)
2. **String Table Serialization**: Writes 46 strings (0-45)
3. **Writing Expressions**: Calls `addString(entry.key)` → creates string at index 46, 47, 48
4. **Writing String Ref**: `writeUint32(46)` → INVALID! (String table only has 46 entries: 0-45)
5. **Reader tries to read**: Index 48 >= 46 → ERROR!

---

## THE FIX

### In `string_collection.dart`, the `collectStringsFromExpression()` is incomplete:

Current code (INCOMPLETE):
```dart
} else if (expr is InstanceCreationExpressionIR) {
  // ✗" NEW: Add widget class name
  addString(expr.type.displayName());

  if (expr.constructorName != null) {
    addString(expr.constructorName!);
  }

  // ✗" NEW: Add named parameter names (child, children, etc.)
  for (final argName in expr.namedArguments.keys) {
    addString(argName);  // ← THIS MUST HAPPEN IN COLLECTION PHASE!
  }

  // Recursively collect from arguments
  for (final arg in expr.arguments) {
    collectStringsFromExpression(arg);
  }
  for (final arg in expr.namedArguments.values) {
    collectStringsFromExpression(arg);
  }
}
```

### In `expression_writer.dart`, REMOVE string additions:

WRONG (CURRENT):
```dart
void writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
  writeType(expr.type);
  
  final widgetClassName = expr.type.displayName();
  addString(widgetClassName);  // ✗ REMOVE THIS - already collected!

  // ...
  
  for (final entry in expr.namedArguments.entries) {
    addString(entry.key);  // ✗ REMOVE THIS - already collected!
    writeUint32(getStringRef(entry.key));
    writeExpression(entry.value);
  }
}
```

CORRECT (FIXED):
```dart
void writeInstanceCreationExpression(InstanceCreationExpressionIR expr) {
  writeType(expr.type);

  writeByte(expr.constructorName != null ? 1 : 0);
  if (expr.constructorName != null) {
    writeUint32(getStringRef(expr.constructorName!));
  }

  writeByte(expr.isConst ? 1 : 0);

  writeUint32(expr.arguments.length);
  for (final arg in expr.arguments) {
    writeExpression(arg);
  }

  writeUint32(expr.namedArguments.length);
  for (final entry in expr.namedArguments.entries) {
    // ✓ Just write the reference - string already collected!
    writeUint32(getStringRef(entry.key));
    writeExpression(entry.value);
  }

  writeType(expr.resultType);
  writeSourceLocation(expr.sourceLocation);
}
```

---

## How to Identify This Type of Bug

### Pattern to Look For:
Search for `addString()` calls in **writer methods** (not collection methods):

```bash
# DANGER ZONE - These should NOT call addString():
- writeExpression()
- writeStatement()
- writeMethodDecl()
- writeClassDecl()
- writeFieldDecl()

# SAFE - These SHOULD call addString():
- collectStringsFromExpression()
- collectStringsFromStatement()
- collectStringsFromClass()
```

### Checklist for String Table Bugs:
1. ✓ All user strings collected in collection phase?
2. ✓ No `addString()` calls in write phase?
3. ✓ Writer only calls `getStringRef()` (read-only)?
4. ✓ Collection phase runs BEFORE string table serialization?
5. ✓ String indices match collected strings exactly?

---

## Summary

**Issue Type**: Two-phase serialization mismatch
**Root Cause**: `addString()` called during write phase instead of collection phase
**Location**: `expression_writer.dart` - `writeInstanceCreationExpression()`
**Effect**: Creates invalid string indices beyond table size
**Fix**: Move `addString()` calls to collection phase, remove from write phase
