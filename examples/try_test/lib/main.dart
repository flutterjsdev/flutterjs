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
