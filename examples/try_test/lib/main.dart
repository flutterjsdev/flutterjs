// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Minimal test for try/catch/finally transpilation

void main() {
  print('Testing try/finally');
  testTryFinally();
}

// Test 1: try-finally (no catch)
void testTryFinally() {
  var resource = 'opened';
  try {
    print('Using resource: $resource');
  } finally {
    resource = 'closed';
    print('Cleanup: $resource');
  }
}

// Test 2: try-catch-finally
void testTryCatchFinally() {
  try {
    throw Exception('Test error');
  } catch (e) {
    print('Caught: $e');
  } finally {
    print('Finally block executed');
  }
}

// Test 3: try-catch (no finally)
void testTryCatch() {
  try {
    throw Exception('Another error');
  } catch (e) {
    print('Handled: $e');
  }
}
