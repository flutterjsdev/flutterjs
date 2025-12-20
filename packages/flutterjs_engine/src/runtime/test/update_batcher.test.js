/**
 * Update Batcher Tests
 * 
 * Test suite for UpdateBatcher class
 * Tests batching behavior, scheduling, and performance
 */


import {UpdateBatcher} from "../src/update_batcher.js";

// Mock runtime
class MockRuntime {
  constructor() {
    this.config = { debugMode: false };
  }
}

// Mock element
class MockElement {
  constructor(id = 'el_1') {
    this.id = id;
    this.mounted = true;
    this.dirty = false;
    this.depth = 0;
    this.state = new MockState();
  }
  
  markNeedsBuild() {
    this.dirty = true;
  }
}

// Mock state
class MockState {
  constructor() {
    this.count = 0;
    this.updates = [];
  }
}

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }
  
  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }
  
  it(name, fn) {
    this.tests.push({ name, fn });
    
    try {
      fn();
      console.log(`  ✅ ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}`);
      console.log(`     ${error.message}`);
      this.failed++;
    }
  }
  
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }
  
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected} but got ${actual}`
      );
    }
  }
  
  summary() {
    const total = this.passed + this.failed;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests: ${total} | ✅ Passed: ${this.passed} | ❌ Failed: ${this.failed}`);
    console.log(`${'='.repeat(50)}\n`);
    
    return this.failed === 0;
  }
}

// Run tests
async function runTests() {
  const test = new TestRunner();
  
  // Test 1: Basic initialization
  test.describe('UpdateBatcher: Initialization', () => {
    test.it('should create with runtime', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      
      test.assert(batcher !== null, 'Batcher should be created');
      test.assertEqual(batcher.stats.totalBatches, 0, 'Should start with 0 batches');
    });
    
    test.it('should throw without runtime', () => {
      try {
        new UpdateBatcher(null);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(
          error.message.includes('Runtime'),
          'Should throw error mentioning runtime'
        );
      }
    });
    
    test.it('should have default config', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      
      test.assert(batcher.config.enableBatching === true, 'Batching should be enabled');
      test.assert(batcher.config.flushOnMicrotask === true, 'Microtask flush should be enabled');
    });
  });
  
  // Test 2: Queueing updates
  test.describe('UpdateBatcher: Queueing Updates', () => {
    test.it('should queue single update', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      const updateFn = function() { this.count++; };
      batcher.queueUpdate(element, updateFn);
      
      test.assertEqual(
        batcher.getPendingCount(element),
        1,
        'Should have 1 pending update'
      );
    });
    
    test.it('should queue multiple updates for same element', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.queueUpdate(element, function() { this.count++; });
      
      test.assertEqual(
        batcher.getPendingCount(element),
        3,
        'Should have 3 pending updates'
      );
    });
    
    test.it('should queue updates for multiple elements', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      const el3 = new MockElement('el_3');
      
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el2, function() { this.count++; });
      batcher.queueUpdate(el3, function() { this.count++; });
      
      test.assertEqual(
        batcher.getBatchedElements().length,
        3,
        'Should have 3 batched elements'
      );
    });
    
    test.it('should throw on invalid element', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      
      try {
        batcher.queueUpdate(null, () => {});
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(
          error.message.includes('Element'),
          'Should throw about element'
        );
      }
    });
    
    test.it('should throw on invalid update function', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      try {
        batcher.queueUpdate(element, 'not a function');
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(
          error.message.includes('function'),
          'Should throw about function'
        );
      }
    });
  });
  
  // Test 3: Scheduling flushes
  test.describe('UpdateBatcher: Scheduling', () => {
    test.it('should schedule flush once', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      batcher.queueUpdate(element, function() { this.count++; });
      
      test.assert(
        batcher.isScheduled(),
        'Should have scheduled flush'
      );
    });
    
    test.it('should not schedule multiple times', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.queueUpdate(element, function() { this.count++; });
      
      test.assertEqual(
        batcher.stats.flushScheduledCount,
        1,
        'Should only schedule once'
      );
    });
    
    test.it('should record scheduled count', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.forceFlush();
      
      batcher.queueUpdate(el2, function() { this.count++; });
      batcher.forceFlush();
      
      test.assertEqual(
        batcher.stats.flushScheduledCount,
        2,
        'Should record 2 schedule calls'
      );
    });
  });
  
  // Test 4: Flushing updates
  test.describe('UpdateBatcher: Flushing', () => {
    test.it('should apply updates during flush', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.queueUpdate(element, function() { this.count++; });
      
      batcher.forceFlush();
      
      test.assertEqual(
        element.state.count,
        2,
        'State should be updated to 2'
      );
    });
    
    test.it('should mark element dirty', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      element.dirty = false;
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.forceFlush();
      
      test.assert(
        element.dirty === true,
        'Element should be marked dirty'
      );
    });
    
    test.it('should clear pending updates', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      batcher.queueUpdate(element, function() { this.count++; });
      test.assertEqual(batcher.getPendingCount(), 1, 'Should have 1 pending');
      
      batcher.forceFlush();
      test.assertEqual(batcher.getPendingCount(), 0, 'Should have 0 pending after flush');
    });
    
    test.it('should update statistics', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el2, function() { this.count++; });
      
      batcher.forceFlush();
      
      test.assertEqual(batcher.stats.totalBatches, 1, 'Should have 1 batch');
      test.assertEqual(batcher.stats.totalUpdates, 3, 'Should have 3 total updates');
      test.assertEqual(batcher.stats.updatesInLastBatch, 3, 'Last batch had 3 updates');
    });
    
    test.it('should track largest batch', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      
      // First batch: 2 updates
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.forceFlush();
      
      // Second batch: 5 updates
      for (let i = 0; i < 5; i++) {
        batcher.queueUpdate(el2, function() { this.count++; });
      }
      batcher.forceFlush();
      
      test.assertEqual(
        batcher.stats.largestBatchSize,
        5,
        'Largest batch should be 5'
      );
    });
    
    test.it('should skip unmounted elements', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      element.mounted = false;
      
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.forceFlush();
      
      test.assertEqual(
        element.state.count,
        0,
        'Unmounted element should not be updated'
      );
    });
    
    test.it('should skip elements without state', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      element.state = null;
      
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.forceFlush();
      
      // Should not throw, just skip
      test.assert(true, 'Should skip without error');
    });
  });
  
  // Test 5: Batching behavior
  test.describe('UpdateBatcher: Batching', () => {
    test.it('should handle disabled batching', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      batcher.setBatchingEnabled(false);
      
      const element = new MockElement();
      batcher.queueUpdate(element, function() { this.count++; });
      
      test.assertEqual(
        element.state.count,
        1,
        'Should update immediately'
      );
      test.assert(
        !batcher.isScheduled(),
        'Should not schedule'
      );
    });
    
    test.it('should enable/disable batching', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      
      test.assert(batcher.config.enableBatching === true, 'Initially enabled');
      
      batcher.setBatchingEnabled(false);
      test.assert(batcher.config.enableBatching === false, 'Should be disabled');
      
      batcher.setBatchingEnabled(true);
      test.assert(batcher.config.enableBatching === true, 'Should be enabled');
    });
  });
  
  // Test 6: Clearing updates
  test.describe('UpdateBatcher: Clearing', () => {
    test.it('should clear all pending updates', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el2, function() { this.count++; });
      
      test.assertEqual(batcher.getPendingCount(), 2, 'Should have 2 pending');
      
      batcher.clear();
      
      test.assertEqual(batcher.getPendingCount(), 0, 'Should have 0 after clear');
    });
    
    test.it('should clear specific element', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el2, function() { this.count++; });
      
      batcher.clear(el1);
      
      test.assertEqual(batcher.getPendingCount(el1), 0, 'el1 should be cleared');
      test.assertEqual(batcher.getPendingCount(el2), 1, 'el2 should still have 1');
    });
  });
  
  // Test 7: Statistics and reporting
  test.describe('UpdateBatcher: Statistics', () => {
    test.it('should track statistics', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const el1 = new MockElement('el_1');
      const el2 = new MockElement('el_2');
      
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el1, function() { this.count++; });
      batcher.queueUpdate(el2, function() { this.count++; });
      batcher.forceFlush();
      
      const stats = batcher.getStats();
      
      test.assertEqual(stats.totalBatches, 1, 'Should record batch');
      test.assertEqual(stats.totalUpdates, 3, 'Should record updates');
      test.assertEqual(stats.updatesInLastBatch, 3, 'Should record last batch size');
    });
    
    test.it('should generate detailed report', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      batcher.queueUpdate(element, function() { this.count++; });
      
      const report = batcher.getDetailedReport();
      
      test.assert(report.stats !== undefined, 'Should have stats');
      test.assert(report.batchedElements !== undefined, 'Should have batchedElements');
      test.assert(report.config !== undefined, 'Should have config');
      test.assert(report.timestamp !== undefined, 'Should have timestamp');
    });
    
    test.it('should reset statistics', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      batcher.queueUpdate(element, function() { this.count++; });
      batcher.forceFlush();
      
      test.assertEqual(batcher.stats.totalBatches, 1, 'Should have batch before reset');
      
      batcher.resetStats();
      
      test.assertEqual(batcher.stats.totalBatches, 0, 'Should be 0 after reset');
      test.assertEqual(batcher.stats.totalUpdates, 0, 'Should be 0 after reset');
    });
  });
  
  // Test 8: Edge cases
  test.describe('UpdateBatcher: Edge Cases', () => {
    test.it('should handle empty flush', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      
      batcher.forceFlush();
      
      test.assertEqual(batcher.stats.totalBatches, 0, 'Should not count empty flush');
    });
    
    test.it('should handle error in update function', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      const element = new MockElement();
      
      // This should not throw
      batcher.queueUpdate(element, function() {
        throw new Error('Update error');
      });
      batcher.queueUpdate(element, function() { this.count++; });
      
      batcher.forceFlush();
      
      // Second update should still execute
      test.assertEqual(element.state.count, 1, 'Should continue after error');
    });
    
    test.it('should handle max batch size warning', () => {
      const runtime = new MockRuntime();
      const batcher = new UpdateBatcher(runtime);
      batcher.config.maxBatchSize = 3;
      const element = new MockElement();
      
      for (let i = 0; i < 5; i++) {
        batcher.queueUpdate(element, function() { this.count++; });
      }
      
      test.assertEqual(
        batcher.getPendingCount(element),
        5,
        'Should queue all updates'
      );
    });
  });
  
  // Print summary
  return test.summary();
}

// Run async tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
