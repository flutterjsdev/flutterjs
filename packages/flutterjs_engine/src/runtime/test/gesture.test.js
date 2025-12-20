/**
 * FlutterJS Gesture Recognizer Test Suite
 * 
 * Comprehensive tests for all gesture recognizers
 */

import {  GestureRecognizer,
  TapRecognizer,
  LongPressRecognizer,
  SwipeRecognizer,
  PanRecognizer,
  ScaleRecognizer,
  GestureArena,
  GestureManager} from "../src/gesture_recognizer.js";

// Test utilities
class TestUtils {
  static createMouseEvent(type, x = 0, y = 0, options = {}) {
    return {
      type: type,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      ...options
    };
  }
  
  static createTouchEvent(type, touches = [], changedTouches = []) {
    return {
      type: type,
      touches: touches,
      changedTouches: changedTouches
    };
  }
  
  static createTouch(x, y) {
    return {
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y
    };
  }
  
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    console.log('\n🧪 Running Gesture Recognizer Tests\n');
    console.log('='.repeat(60));
    
    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        if (error.stack) {
          console.log(`   ${error.stack.split('\n').slice(1, 3).join('\n   ')}`);
        }
      }
    }
    
    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);
    
    return this.failed === 0;
  }
}

// Assertions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected} but got ${actual}`
    );
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected non-null value');
  }
}

// Test suite
const runner = new TestRunner();

// ============================================================================
// Base GestureRecognizer Tests
// ============================================================================

runner.test('GestureRecognizer - constructor requires callback', () => {
  try {
    new GestureRecognizer();
    assert(false, 'Should have thrown error');
  } catch (error) {
    assert(error.message.includes('callback'), 'Should mention callback in error');
  }
});

runner.test('GestureRecognizer - callback must be function', () => {
  try {
    new GestureRecognizer('not a function');
    assert(false, 'Should have thrown error');
  } catch (error) {
    assert(error.message.includes('function'), 'Should mention function in error');
  }
});

runner.test('GestureRecognizer - initial state is ready', () => {
  let called = false;
  const recognizer = new TapRecognizer(() => { called = true; });
  assertEquals(recognizer.state, 'ready', 'Initial state should be ready');
});

runner.test('GestureRecognizer - reset returns to ready state', () => {
  let called = false;
  const recognizer = new TapRecognizer(() => { called = true; });
  recognizer.state = 'recognized';
  recognizer.reset();
  assertEquals(recognizer.state, 'ready', 'State should reset to ready');
});

runner.test('GestureRecognizer - dispose cleans up', () => {
  let called = false;
  const recognizer = new TapRecognizer(() => { called = true; });
  recognizer.dispose();
  assert(recognizer.isDisposed, 'Should be marked as disposed');
  assertEquals(recognizer.callback, null, 'Callback should be cleared');
});

// ============================================================================
// TapRecognizer Tests
// ============================================================================

runner.test('TapRecognizer - detects single tap', () => {
  let tapDetected = false;
  let tapData = null;
  
  const recognizer = new TapRecognizer((data) => {
    tapDetected = true;
    tapData = data;
  });
  
  // Simulate tap
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  assert(tapDetected, 'Tap should be detected');
  assertNotNull(tapData, 'Tap data should be provided');
  assertEquals(tapData.type, 'tap', 'Event type should be tap');
  assertEquals(tapData.tapCount, 1, 'Tap count should be 1');
});

runner.test('TapRecognizer - fails on excessive movement', () => {
  let tapDetected = false;
  
  const recognizer = new TapRecognizer(() => {
    tapDetected = true;
  }, { maxMovement: 10 });
  
  // Simulate tap with movement
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 150, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 150, 100));
  
  assert(!tapDetected, 'Tap should not be detected with excessive movement');
  assertEquals(recognizer.state, 'failed', 'State should be failed');
});

runner.test('TapRecognizer - handles touch events', () => {
  let tapDetected = false;
  
  const recognizer = new TapRecognizer(() => {
    tapDetected = true;
  });
  
  const touch = TestUtils.createTouch(100, 100);
  
  recognizer.handleEvent('touchstart', TestUtils.createTouchEvent('touchstart', [touch]));
  recognizer.handleEvent('touchend', TestUtils.createTouchEvent('touchend', [], [touch]));
  
  assert(tapDetected, 'Tap should be detected from touch events');
});

runner.test('TapRecognizer - double tap detection', async () => {
  let tapCount = 0;
  let finalTapCount = 0;
  
  const recognizer = new TapRecognizer((data) => {
    tapCount++;
    finalTapCount = data.tapCount;
  }, { minTaps: 2, maxTaps: 2 });
  
  // First tap
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  await TestUtils.sleep(50);
  
  // Second tap
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  assert(tapCount === 1, 'Callback should be called once for double tap');
  assertEquals(finalTapCount, 2, 'Tap count should be 2');
});

runner.test('TapRecognizer - cancels on pointercancel', () => {
  let tapDetected = false;
  
  const recognizer = new TapRecognizer(() => {
    tapDetected = true;
  });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointercancel', TestUtils.createMouseEvent('pointercancel'));
  
  assert(!tapDetected, 'Tap should not be detected after cancel');
  assertEquals(recognizer.state, 'failed', 'State should be failed');
});

// ============================================================================
// LongPressRecognizer Tests
// ============================================================================

runner.test('LongPressRecognizer - detects long press', async () => {
  let longPressDetected = false;
  let longPressData = null;
  
  const recognizer = new LongPressRecognizer((data) => {
    longPressDetected = true;
    longPressData = data;
  }, { duration: 100 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  
  await TestUtils.sleep(150);
  
  assert(longPressDetected, 'Long press should be detected');
  assertNotNull(longPressData, 'Long press data should be provided');
  assertEquals(longPressData.type, 'longpress', 'Event type should be longpress');
});

runner.test('LongPressRecognizer - fails on movement', async () => {
  let longPressDetected = false;
  
  const recognizer = new LongPressRecognizer(() => {
    longPressDetected = true;
  }, { duration: 100, maxMovement: 10 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  
  await TestUtils.sleep(50);
  
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 150, 100));
  
  await TestUtils.sleep(100);
  
  assert(!longPressDetected, 'Long press should not be detected with movement');
});

runner.test('LongPressRecognizer - cancels on pointerup', async () => {
  let longPressDetected = false;
  
  const recognizer = new LongPressRecognizer(() => {
    longPressDetected = true;
  }, { duration: 200 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  
  await TestUtils.sleep(50);
  
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  await TestUtils.sleep(200);
  
  assert(!longPressDetected, 'Long press should not be detected after release');
});

runner.test('LongPressRecognizer - cleanup on dispose', () => {
  const recognizer = new LongPressRecognizer(() => {}, { duration: 100 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  
  recognizer.dispose();
  
  assertEquals(recognizer.timer, null, 'Timer should be cleared');
  assert(recognizer.isDisposed, 'Should be marked as disposed');
});

// ============================================================================
// SwipeRecognizer Tests
// ============================================================================

runner.test('SwipeRecognizer - detects right swipe', () => {
  let swipeDetected = false;
  let swipeData = null;
  
  const recognizer = new SwipeRecognizer((data) => {
    swipeDetected = true;
    swipeData = data;
  }, { minDistance: 50 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 200, 100));
  
  assert(swipeDetected, 'Swipe should be detected');
  assertNotNull(swipeData, 'Swipe data should be provided');
  assertEquals(swipeData.type, 'swipe', 'Event type should be swipe');
  assertEquals(swipeData.direction, 'right', 'Direction should be right');
});

runner.test('SwipeRecognizer - detects left swipe', () => {
  let swipeData = null;
  
  const recognizer = new SwipeRecognizer((data) => {
    swipeData = data;
  }, { minDistance: 50 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 200, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  assertNotNull(swipeData, 'Swipe should be detected');
  assertEquals(swipeData.direction, 'left', 'Direction should be left');
});

runner.test('SwipeRecognizer - detects up swipe', () => {
  let swipeData = null;
  
  const recognizer = new SwipeRecognizer((data) => {
    swipeData = data;
  }, { minDistance: 50 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 200));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  assertNotNull(swipeData, 'Swipe should be detected');
  assertEquals(swipeData.direction, 'up', 'Direction should be up');
});

runner.test('SwipeRecognizer - detects down swipe', () => {
  let swipeData = null;
  
  const recognizer = new SwipeRecognizer((data) => {
    swipeData = data;
  }, { minDistance: 50 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 200));
  
  assertNotNull(swipeData, 'Swipe should be detected');
  assertEquals(swipeData.direction, 'down', 'Direction should be down');
});

runner.test('SwipeRecognizer - fails on insufficient distance', () => {
  let swipeDetected = false;
  
  const recognizer = new SwipeRecognizer(() => {
    swipeDetected = true;
  }, { minDistance: 100 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 120, 100));
  
  assert(!swipeDetected, 'Swipe should not be detected with insufficient distance');
});

runner.test('SwipeRecognizer - horizontal constraint', () => {
  let swipeDetected = false;
  let swipeData = null;
  
  const recognizer = new SwipeRecognizer((data) => {
    swipeDetected = true;
    swipeData = data;
  }, { minDistance: 50, direction: 'horizontal' });
  
  // Horizontal swipe - should work
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 200, 100));
  
  assert(swipeDetected, 'Horizontal swipe should be detected');
  
  // Vertical swipe - should fail
  swipeDetected = false;
  recognizer.reset();
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 100, 200));
  
  assert(!swipeDetected, 'Vertical swipe should not be detected with horizontal constraint');
});

runner.test('SwipeRecognizer - calculates velocity', () => {
  let swipeData = null;
  
  const recognizer = new SwipeRecognizer((data) => {
    swipeData = data;
  }, { minDistance: 50 });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 200, 100));
  
  assertNotNull(swipeData, 'Swipe should be detected');
  assert(swipeData.velocity > 0, 'Velocity should be calculated');
  assert(swipeData.distance >= 100, 'Distance should be calculated');
});

// ============================================================================
// PanRecognizer Tests
// ============================================================================

runner.test('PanRecognizer - detects pan gesture', () => {
  let panStartCalled = false;
  let panUpdateCalled = false;
  let panEndCalled = false;
  let panData = null;
  
  const recognizer = new PanRecognizer((data) => {
    panData = data;
  }, {
    minDistance: 10,
    onStart: () => { panStartCalled = true; },
    onUpdate: () => { panUpdateCalled = true; },
    onEnd: () => { panEndCalled = true; }
  });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 120, 100));
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 140, 100));
  recognizer.handleEvent('pointerup', TestUtils.createMouseEvent('pointerup', 150, 100));
  
  assert(panStartCalled, 'onStart should be called');
  assert(panUpdateCalled, 'onUpdate should be called');
  assert(panEndCalled, 'onEnd should be called');
  assertNotNull(panData, 'Pan data should be provided');
  assertEquals(panData.type, 'pan', 'Event type should be pan');
});

runner.test('PanRecognizer - tracks delta correctly', () => {
  let updateData = null;
  
  const recognizer = new PanRecognizer(() => {}, {
    minDistance: 10,
    onUpdate: (data) => { updateData = data; }
  });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 120, 100));
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 150, 100));
  
  assertNotNull(updateData, 'Update data should be provided');
  assert(updateData.totalDelta.dx > 0, 'Total delta X should be positive');
  assert(Math.abs(updateData.totalDelta.dy) < 1, 'Total delta Y should be near zero');
});

runner.test('PanRecognizer - horizontal constraint', () => {
  let panStarted = false;
  
  const recognizer = new PanRecognizer(() => {}, {
    minDistance: 10,
    direction: 'horizontal',
    onStart: () => { panStarted = true; }
  });
  
  // Vertical movement - should fail
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 100, 150));
  
  assert(!panStarted, 'Pan should not start with vertical movement');
  assertEquals(recognizer.state, 'failed', 'State should be failed');
});

runner.test('PanRecognizer - handles cancel', () => {
  let endCalled = false;
  let endData = null;
  
  const recognizer = new PanRecognizer(() => {}, {
    minDistance: 10,
    onEnd: (data) => {
      endCalled = true;
      endData = data;
    }
  });
  
  recognizer.handleEvent('pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  recognizer.handleEvent('pointermove', TestUtils.createMouseEvent('pointermove', 120, 100));
  recognizer.handleEvent('pointercancel', TestUtils.createMouseEvent('pointercancel'));
  
  assert(endCalled, 'onEnd should be called on cancel');
  assertEquals(endData.type, 'pancancel', 'Event type should be pancancel');
});

// ============================================================================
// ScaleRecognizer Tests
// ============================================================================

runner.test('ScaleRecognizer - detects scale gesture', () => {
  let scaleStartCalled = false;
  let scaleUpdateCalled = false;
  let scaleEndCalled = false;
  let scaleData = null;
  
  const recognizer = new ScaleRecognizer((data) => {
    scaleData = data;
  }, {
    onStart: () => { scaleStartCalled = true; },
    onUpdate: () => { scaleUpdateCalled = true; },
    onEnd: () => { scaleEndCalled = true; }
  });
  
  const touch1Start = TestUtils.createTouch(100, 100);
  const touch2Start = TestUtils.createTouch(200, 100);
  
  recognizer.handleEvent('touchstart', TestUtils.createTouchEvent('touchstart', [touch1Start, touch2Start]));
  
  const touch1Move = TestUtils.createTouch(50, 100);
  const touch2Move = TestUtils.createTouch(250, 100);
  
  recognizer.handleEvent('touchmove', TestUtils.createTouchEvent('touchmove', [touch1Move, touch2Move]));
  recognizer.handleEvent('touchend', TestUtils.createTouchEvent('touchend', [touch1Move]));
  
  assert(scaleStartCalled, 'onStart should be called');
  assert(scaleUpdateCalled, 'onUpdate should be called');
  assert(scaleEndCalled, 'onEnd should be called');
  assertNotNull(scaleData, 'Scale data should be provided');
  assertEquals(scaleData.type, 'scale', 'Event type should be scale');
});

runner.test('ScaleRecognizer - calculates scale correctly', () => {
  let updateData = null;
  
  const recognizer = new ScaleRecognizer(() => {}, {
    onUpdate: (data) => { updateData = data; }
  });
  
  // Initial distance: 100px
  const touch1Start = TestUtils.createTouch(100, 100);
  const touch2Start = TestUtils.createTouch(200, 100);
  
  recognizer.handleEvent('touchstart', TestUtils.createTouchEvent('touchstart', [touch1Start, touch2Start]));
  
  // New distance: 200px (2x scale)
  const touch1Move = TestUtils.createTouch(50, 100);
  const touch2Move = TestUtils.createTouch(250, 100);
  
  recognizer.handleEvent('touchmove', TestUtils.createTouchEvent('touchmove', [touch1Move, touch2Move]));
  
  assertNotNull(updateData, 'Update data should be provided');
  assert(Math.abs(updateData.scale - 2.0) < 0.1, 'Scale should be approximately 2.0');
});

runner.test('ScaleRecognizer - clamps scale to limits', () => {
  let updateData = null;
  
  const recognizer = new ScaleRecognizer(() => {}, {
    minScale: 0.5,
    maxScale: 2.0,
    onUpdate: (data) => { updateData = data; }
  });
  
  // Initial distance: 100px
  const touch1Start = TestUtils.createTouch(100, 100);
  const touch2Start = TestUtils.createTouch(200, 100);
  
  recognizer.handleEvent('touchstart', TestUtils.createTouchEvent('touchstart', [touch1Start, touch2Start]));
  
  // New distance: 500px (5x scale - should be clamped to 2.0)
  const touch1Move = TestUtils.createTouch(0, 100);
  const touch2Move = TestUtils.createTouch(500, 100);
  
  recognizer.handleEvent('touchmove', TestUtils.createTouchEvent('touchmove', [touch1Move, touch2Move]));
  
  assertNotNull(updateData, 'Update data should be provided');
  assertEquals(updateData.scale, 2.0, 'Scale should be clamped to maxScale');
  assert(updateData.rawScale > 2.0, 'Raw scale should exceed limit');
});

runner.test('ScaleRecognizer - requires two touches', () => {
  let scaleStartCalled = false;
  
  const recognizer = new ScaleRecognizer(() => {}, {
    onStart: () => { scaleStartCalled = true; }
  });
  
  const touch1 = TestUtils.createTouch(100, 100);
  
  recognizer.handleEvent('touchstart', TestUtils.createTouchEvent('touchstart', [touch1]));
  
  assert(!scaleStartCalled, 'Scale should not start with single touch');
});

// ============================================================================
// GestureArena Tests
// ============================================================================

runner.test('GestureArena - registers recognizers', () => {
  const arena = new GestureArena();
  const recognizer = new TapRecognizer(() => {});
  
  arena.register('element1', recognizer);
  
  const recognizers = arena.getRecognizers('element1');
  assertEquals(recognizers.length, 1, 'Should have 1 recognizer');
  assertEquals(recognizers[0], recognizer, 'Should be the same recognizer');
});

runner.test('GestureArena - handles multiple recognizers per element', () => {
  const arena = new GestureArena();
  const tap = new TapRecognizer(() => {});
  const longPress = new LongPressRecognizer(() => {});
  
  arena.register('element1', tap);
  arena.register('element1', longPress);
  
  const recognizers = arena.getRecognizers('element1');
  assertEquals(recognizers.length, 2, 'Should have 2 recognizers');
});

runner.test('GestureArena - dispatches events to recognizers', () => {
  const arena = new GestureArena();
  let tapCalled = false;
  
  const tap = new TapRecognizer(() => { tapCalled = true; });
  arena.register('element1', tap);
  
  arena.handleEvent('element1', 'pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  arena.handleEvent('element1', 'pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  assert(tapCalled, 'Tap recognizer should be called');
});

runner.test('GestureArena - unregisters all recognizers', () => {
  const arena = new GestureArena();
  const tap = new TapRecognizer(() => {});
  
  arena.register('element1', tap);
  arena.unregister('element1');
  
  const recognizers = arena.getRecognizers('element1');
  assertEquals(recognizers.length, 0, 'Should have no recognizers');
  assert(tap.isDisposed, 'Recognizer should be disposed');
});

runner.test('GestureArena - clear disposes all', () => {
  const arena = new GestureArena();
  const tap1 = new TapRecognizer(() => {});
  const tap2 = new TapRecognizer(() => {});
  
  arena.register('element1', tap1);
  arena.register('element2', tap2);
  
  arena.clear();
  
  const stats = arena.getStats();
  assertEquals(stats.elements, 0, 'Should have no elements');
  assert(tap1.isDisposed, 'Tap1 should be disposed');
  assert(tap2.isDisposed, 'Tap2 should be disposed');
});

runner.test('GestureArena - getStats returns correct counts', () => {
  const arena = new GestureArena();
  
  arena.register('element1', new TapRecognizer(() => {}));
  arena.register('element1', new LongPressRecognizer(() => {}));
  arena.register('element2', new SwipeRecognizer(() => {}));
  
  const stats = arena.getStats();
  assertEquals(stats.elements, 2, 'Should have 2 elements');
  assertEquals(stats.totalRecognizers, 3, 'Should have 3 total recognizers');
});

// ============================================================================
// GestureManager Tests
// ============================================================================

runner.test('GestureManager - registers tap gesture', () => {
  const manager = new GestureManager();
  let tapCalled = false;
  
  manager.registerTap('element1', () => { tapCalled = true; });
  
  manager.handleEvent('element1', 'pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  manager.handleEvent('element1', 'pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  assert(tapCalled, 'Tap callback should be called');
});

runner.test('GestureManager - registers double tap', () => {
  const manager = new GestureManager();
  let doubleTapCalled = false;
  
  manager.registerDoubleTap('element1', (data) => {
    if (data.tapCount === 2) {
      doubleTapCalled = true;
    }
  });
  
  // First tap
  manager.handleEvent('element1', 'pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  manager.handleEvent('element1', 'pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  // Second tap
  manager.handleEvent('element1', 'pointerdown', TestUtils.createMouseEvent('pointerdown', 100, 100));
  manager.handleEvent('element1', 'pointerup', TestUtils.createMouseEvent('pointerup', 100, 100));
  
  // Note: In real scenario would need to wait for timeout
  // For test purposes, checking if doubleTap was eventually called
  assert(doubleTapCalled, 'Double tap callback should be called');
});

// runner.test('GestureManager - registers all gesture types', () => {
//   const manager = new GestureManager();
  
//   manager.registerTap('element1', () => {});
//   manager.registerLongPress('element1', () => {});
//   manager.registerSwipe('element1', () => {