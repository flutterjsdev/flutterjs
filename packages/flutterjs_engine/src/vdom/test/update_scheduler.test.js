/**
 * UpdateScheduler Tests - Comprehensive Scheduling & Batching Testing
 * Tests all scheduling strategies, priorities, batching, and performance
 */

import { UpdateScheduler, UpdatePriority } from '../src/vnode/update_scheduler.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 UPDATE SCHEDULER TESTS');
console.log('='.repeat(80) + '\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    if (error.stack) {
      console.log(`  ${error.stack.split('\n')[1]}`);
    }
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected "${expected}", got "${actual}"`
    );
  }
}

function assertGreater(actual, expected, message) {
  if (actual <= expected) {
    throw new Error(
      message || `Expected ${actual} > ${expected}`
    );
  }
}

function assertLess(actual, expected, message) {
  if (actual >= expected) {
    throw new Error(
      message || `Expected ${actual} < ${expected}`
    );
  }
}

// ============================================================================
// TEST SUITE 1: Basic Scheduling
// ============================================================================

console.log('TEST SUITE 1: Basic Scheduling\n');

test('Create UpdateScheduler', () => {
  const scheduler = new UpdateScheduler();
  assert(scheduler !== null, 'Should create scheduler');
  assertEquals(scheduler.enableAutoFlushing, true, 'Should enable auto flushing');
});

test('Schedule single update', () => {
  const scheduler = new UpdateScheduler();
  let executed = false;

  const id = scheduler.schedule(() => {
    executed = true;
  });

  assert(typeof id === 'string', 'Should return update ID');
  assert(scheduler.hasUpdates(), 'Should have pending update');
});

test('Schedule update with custom ID', () => {
  const scheduler = new UpdateScheduler();
  const customId = 'my-update-123';

  const id = scheduler.schedule(() => {}, UpdatePriority.NORMAL, customId);

  assertEquals(id, customId, 'Should use custom ID');
});

test('Schedule multiple updates', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  const stats = scheduler.getQueueStats();
  assertEquals(stats.total, 3, 'Should have 3 updates');
});

test('Reject non-function callback', () => {
  const scheduler = new UpdateScheduler();

  try {
    scheduler.schedule('not a function');
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message.includes('function'), 'Should mention function');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 2: Priority Levels
// ============================================================================

console.log('TEST SUITE 2: Priority Levels\n');

test('Schedule IMMEDIATE priority', () => {
  const scheduler = new UpdateScheduler();
  let executed = false;

  scheduler.schedule(() => {
    executed = true;
  }, UpdatePriority.IMMEDIATE);

  assert(executed === true, 'IMMEDIATE should execute immediately');
});

test('Schedule HIGH priority', () => {
  const scheduler = new UpdateScheduler();
  const order = [];

  scheduler.schedule(() => {
    order.push('normal');
  }, UpdatePriority.NORMAL);

  scheduler.schedule(() => {
    order.push('high');
  }, UpdatePriority.HIGH);

  scheduler.flushAll();

  assertEquals(order[0], 'high', 'HIGH should execute before NORMAL');
});

test('Schedule in priority order', () => {
  const scheduler = new UpdateScheduler();
  const order = [];

  scheduler.schedule(() => order.push('normal'), UpdatePriority.NORMAL);
  scheduler.schedule(() => order.push('high'), UpdatePriority.HIGH);
  scheduler.schedule(() => order.push('low'), UpdatePriority.LOW);

  scheduler.flushAll();

  assertEquals(order[0], 'high', 'HIGH first');
  assertEquals(order[1], 'normal', 'NORMAL second');
  assertEquals(order[2], 'low', 'LOW third');
});

test('Reject invalid priority', () => {
  const scheduler = new UpdateScheduler();

  try {
    scheduler.schedule(() => {}, 'invalid-priority');
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message.includes('Invalid priority'), 'Should mention priority');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 3: Batching
// ============================================================================

console.log('TEST SUITE 3: Batching\n');

test('Schedule batch of updates', () => {
  const scheduler = new UpdateScheduler();
  const callbacks = [
    () => console.log('1'),
    () => console.log('2'),
    () => console.log('3')
  ];

  const batchId = scheduler.scheduleBatch(callbacks);

  assert(typeof batchId === 'string', 'Should return batch ID');
  assert(scheduler.hasUpdates(), 'Should have updates');
});

test('Execute batch in order', () => {
  const scheduler = new UpdateScheduler();
  const order = [];

  const callbacks = [
    () => order.push(1),
    () => order.push(2),
    () => order.push(3)
  ];

  scheduler.scheduleBatch(callbacks);
  scheduler.flushAll();

  assertEquals(order[0], 1, 'First callback first');
  assertEquals(order[1], 2, 'Second callback second');
  assertEquals(order[2], 3, 'Third callback third');
});

test('Batch with custom priority', () => {
  const scheduler = new UpdateScheduler();
  const order = [];

  scheduler.schedule(() => order.push('normal'), UpdatePriority.NORMAL);
  scheduler.scheduleBatch(
    [() => order.push('high-1'), () => order.push('high-2')],
    UpdatePriority.HIGH
  );

  scheduler.flushAll();

  assertEquals(order[0], 'high-1', 'HIGH batch first');
  assertEquals(order[1], 'high-2', 'HIGH batch continues');
  assertEquals(order[2], 'normal', 'NORMAL after batch');
});

test('Reject non-array batch', () => {
  const scheduler = new UpdateScheduler();

  try {
    scheduler.scheduleBatch(() => {});
    throw new Error('Should have thrown');
  } catch (error) {
    assert(error.message.includes('array'), 'Should mention array');
  }
});

console.log('');

// ============================================================================
// TEST SUITE 4: Execution & Flushing
// ============================================================================

console.log('TEST SUITE 4: Execution & Flushing\n');

test('Flush executes updates', () => {
  const scheduler = new UpdateScheduler();
  let executed = false;

  scheduler.schedule(() => {
    executed = true;
  }, UpdatePriority.NORMAL);

  const result = scheduler.flush();

  assertEquals(result.success, true, 'Should succeed');
  assert(executed === true, 'Should execute callback');
  assertEquals(result.processed, 1, 'Should process 1 update');
});

test('Flush returns results', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  const result = scheduler.flush();

  assertEquals(result.processed, 2, 'Should process 2');
  assertEquals(result.results.length, 2, 'Should have 2 results');
  assert(result.results[0].success === true, 'First successful');
  assert(result.results[1].success === true, 'Second successful');
});

test('Flush all pending updates', () => {
  const scheduler = new UpdateScheduler();
  let count = 0;

  for (let i = 0; i < 100; i++) {
    scheduler.schedule(() => { count++; }, UpdatePriority.NORMAL);
  }

  const result = scheduler.flushAll();

  assertEquals(count, 100, 'Should execute all');
  assertEquals(result.totalProcessed, 100, 'Should report all processed');
  assertEquals(scheduler.hasUpdates(), false, 'Should be empty');
});

test('Flush respects batch size', () => {
  const scheduler = new UpdateScheduler({
    maxBatchSize: 5,
    enableAutoFlushing: false
  });

  for (let i = 0; i < 20; i++) {
    scheduler.schedule(() => {});
  }

  const result1 = scheduler.flush();
  assertEquals(result1.processed, 5, 'First flush: 5 updates');

  const result2 = scheduler.flush();
  assertEquals(result2.processed, 5, 'Second flush: 5 updates');

  assertEquals(scheduler.getPendingCount(), 10, 'Should have 10 remaining');
});

test('Flush all iterates until empty', () => {
  const scheduler = new UpdateScheduler({
    maxBatchSize: 3,
    enableAutoFlushing: false
  });

  for (let i = 0; i < 10; i++) {
    scheduler.schedule(() => {});
  }

  const result = scheduler.flushAll();

  assertGreater(result.iterations, 1, 'Should iterate multiple times');
  assertEquals(result.totalProcessed, 10, 'Should process all');
  assertEquals(scheduler.hasUpdates(), false, 'Should be empty');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Error Handling
// ============================================================================

console.log('TEST SUITE 5: Error Handling\n');

test('Catch update errors', () => {
  const scheduler = new UpdateScheduler();
  let successCount = 0;

  scheduler.schedule(() => {
    throw new Error('Update failed');
  });
  scheduler.schedule(() => {
    successCount++;
  });

  const result = scheduler.flush();

  assertEquals(result.failed, 1, 'Should report 1 failure');
  assertEquals(successCount, 1, 'Should continue after error');
  assertEquals(result.processed, 1, 'Should process 1 success');
});

test('Track error metrics', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {
    throw new Error('Error 1');
  });
  scheduler.schedule(() => {
    throw new Error('Error 2');
  });

  scheduler.flushAll();

  const metrics = scheduler.getMetrics();
  assertEquals(metrics.errors, 2, 'Should track 2 errors');
});

test('Call onError hook', () => {
  const scheduler = new UpdateScheduler();
  let errorHandled = false;
  let errorInfo = null;

  scheduler.onError = (error, update) => {
    errorHandled = true;
    errorInfo = { error, updateId: update.id };
  };

  scheduler.schedule(() => {
    throw new Error('Test error');
  });

  scheduler.flush();

  assert(errorHandled === true, 'Should call onError');
  assert(errorInfo.error.message === 'Test error', 'Should have error');
});

test('Continue on error with multiple updates', () => {
  const scheduler = new UpdateScheduler();
  const results = [];

  scheduler.schedule(() => { results.push(1); });
  scheduler.schedule(() => { throw new Error('Fail'); });
  scheduler.schedule(() => { results.push(3); });

  const flushResult = scheduler.flush();

  assertEquals(results.length, 2, 'Should execute non-failing updates');
  assertEquals(flushResult.failed, 1, 'Should report 1 failure');
  assertEquals(flushResult.processed, 2, 'Should process 2 successes');
});

console.log('');

// ============================================================================
// TEST SUITE 6: Cancellation
// ============================================================================

console.log('TEST SUITE 6: Cancellation\n');

test('Cancel single update', () => {
  const scheduler = new UpdateScheduler();
  let executed = false;

  const id = scheduler.schedule(() => {
    executed = true;
  }, UpdatePriority.NORMAL);

  const cancelled = scheduler.cancel(id);

  assertEquals(cancelled, true, 'Should return true');
  assertEquals(scheduler.hasUpdates(), false, 'Should be empty');
  scheduler.flushAll();
  assertEquals(executed, false, 'Should not execute');
});

test('Cancel non-existent update returns false', () => {
  const scheduler = new UpdateScheduler();

  const cancelled = scheduler.cancel('non-existent-id');

  assertEquals(cancelled, false, 'Should return false');
});

test('Cancel batch of updates', () => {
  const scheduler = new UpdateScheduler();
  let count = 0;

  const batchId = scheduler.scheduleBatch([
    () => { count++; },
    () => { count++; },
    () => { count++; }
  ]);

  const cancelled = scheduler.cancelBatch(batchId);

  assertEquals(cancelled, 3, 'Should cancel 3 updates');
  scheduler.flushAll();
  assertEquals(count, 0, 'Should not execute any');
});

test('Track cancelled metrics', () => {
  const scheduler = new UpdateScheduler();

  const id1 = scheduler.schedule(() => {});
  const id2 = scheduler.schedule(() => {});

  scheduler.cancel(id1);
  scheduler.cancel(id2);

  const metrics = scheduler.getMetrics();
  assertEquals(metrics.skipped, 2, 'Should track 2 skipped');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Callbacks & Hooks
// ============================================================================

console.log('TEST SUITE 7: Callbacks & Hooks\n');

test('Call onBeforeFlushed hook', () => {
  const scheduler = new UpdateScheduler();
  let hookCalled = false;
  let updateCount = 0;

  scheduler.onBeforeFlushed = (updates) => {
    hookCalled = true;
    updateCount = updates.length;
  };

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  scheduler.flush();

  assertEquals(hookCalled, true, 'Should call hook');
  assertEquals(updateCount, 2, 'Should pass updates');
});

test('Call onAfterFlushed hook', () => {
  const scheduler = new UpdateScheduler();
  let hookCalled = false;
  let resultsCount = 0;

  scheduler.onAfterFlushed = (results) => {
    hookCalled = true;
    resultsCount = results.length;
  };

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  scheduler.flush();

  assertEquals(hookCalled, true, 'Should call hook');
  assertEquals(resultsCount, 2, 'Should pass results');
});

test('Handle hook errors gracefully', () => {
  const scheduler = new UpdateScheduler();

  scheduler.onBeforeFlushed = () => {
    throw new Error('Hook error');
  };

  scheduler.schedule(() => {});

  // Should not throw
  const result = scheduler.flush();
  assertEquals(result.processed, 1, 'Should still execute updates');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Metrics & Statistics
// ============================================================================

console.log('TEST SUITE 8: Metrics & Statistics\n');

test('Track total updates', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  scheduler.flushAll();

  const metrics = scheduler.getMetrics();
  assertEquals(metrics.totalUpdates, 3, 'Should track total');
});

test('Track execution time', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  scheduler.flush();

  const metrics = scheduler.getMetrics();
  assertGreater(metrics.totalTime, 0, 'Should measure time');
  assertGreater(metrics.maxTime, 0, 'Should have max time');
});

test('Calculate average time', () => {
  const scheduler = new UpdateScheduler();

  for (let i = 0; i < 10; i++) {
    scheduler.schedule(() => {});
  }

  scheduler.flushAll();

  const metrics = scheduler.getMetrics();
  assertEquals(metrics.averageTime, metrics.totalTime / metrics.totalUpdates, 'Should calculate average');
});

test('Get queue statistics', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {}, UpdatePriority.HIGH);
  scheduler.schedule(() => {}, UpdatePriority.NORMAL);
  scheduler.schedule(() => {}, UpdatePriority.NORMAL);
  scheduler.schedule(() => {}, UpdatePriority.LOW);

  const stats = scheduler.getQueueStats();

  assertEquals(stats.total, 4, 'Should count total');
  assertEquals(stats.byPriority[UpdatePriority.HIGH], 1, 'Should count HIGH');
  assertEquals(stats.byPriority[UpdatePriority.NORMAL], 2, 'Should count NORMAL');
  assertEquals(stats.byPriority[UpdatePriority.LOW], 1, 'Should count LOW');
});

test('Get pending count', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  assertEquals(scheduler.getPendingCount(), 3, 'Should count pending');

  scheduler.flush();

  assertEquals(scheduler.getPendingCount(), 0, 'Should be empty after flush');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Reset & Cleanup
// ============================================================================

console.log('TEST SUITE 9: Reset & Cleanup\n');

test('Reset clears all state', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {});
  scheduler.schedule(() => {});

  scheduler.reset();

  assertEquals(scheduler.hasUpdates(), false, 'Should be empty');
  assertEquals(scheduler.getPendingCount(), 0, 'Should have no pending');
  assertEquals(scheduler.getMetrics().totalUpdates, 0, 'Should reset metrics');
});

test('Clear metrics only', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {});
  scheduler.flushAll();

  const before = scheduler.getMetrics().totalUpdates;
  assertEquals(before, 1, 'Should have tracked 1');

  scheduler.schedule(() => {});
  scheduler.clearMetrics();

  assertEquals(scheduler.getMetrics().totalUpdates, 0, 'Should reset metrics');
  assertEquals(scheduler.getPendingCount(), 1, 'Should keep pending');
});

test('Drain updates without executing', () => {
  const scheduler = new UpdateScheduler();
  let count = 0;

  scheduler.schedule(() => { count++; });
  scheduler.schedule(() => { count++; });

  const drained = scheduler.drain();

  assertEquals(drained.length, 2, 'Should drain 2 updates');
  assertEquals(count, 0, 'Should not execute');
  assertEquals(scheduler.hasUpdates(), false, 'Should be empty');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Async & Frame Scheduling
// ============================================================================

console.log('TEST SUITE 10: Async & Frame Scheduling\n');

test('Wait for flush completion', async () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: true
  });
  let executed = false;

  scheduler.schedule(() => {
    executed = true;
  }, UpdatePriority.NORMAL);

  await scheduler.waitForFlush();

  assertEquals(executed, true, 'Should execute before resolving');
});

test('WaitForFlush resolves immediately if empty', async () => {
  const scheduler = new UpdateScheduler();

  const start = Date.now();
  await scheduler.waitForFlush();
  const elapsed = Date.now() - start;

  assertLess(elapsed, 50, 'Should resolve quickly');
});

test('Create priority updater', () => {
  const scheduler = new UpdateScheduler();
  const highUpdater = scheduler.createUpdater(UpdatePriority.HIGH);

  highUpdater(() => {});
  highUpdater(() => {});

  const stats = scheduler.getQueueStats();
  assertEquals(stats.byPriority[UpdatePriority.HIGH], 2, 'Should schedule at HIGH priority');
});

console.log('');

// ============================================================================
// TEST SUITE 11: Configuration Options
// ============================================================================

console.log('TEST SUITE 11: Configuration Options\n');

test('Custom max batch size', () => {
  const scheduler = new UpdateScheduler({
    maxBatchSize: 2,
    enableAutoFlushing: false
  });

  for (let i = 0; i < 10; i++) {
    scheduler.schedule(() => {});
  }

  const result1 = scheduler.flush();
  assertEquals(result1.processed, 2, 'First batch: 2 items');

  const result2 = scheduler.flush();
  assertEquals(result2.processed, 2, 'Second batch: 2 items');
});

test('Disable auto flushing', () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: false
  });

  scheduler.schedule(() => {}, UpdatePriority.NORMAL);

  assertEquals(scheduler.frameScheduled, false, 'Should not schedule frame');
  assertEquals(scheduler.hasUpdates(), true, 'Should have updates pending');
});

test('Disable prioritization', () => {
  const scheduler = new UpdateScheduler({
    enablePrioritization: false,
    enableAutoFlushing: false
  });

  const order = [];

  scheduler.schedule(() => order.push('low'), UpdatePriority.LOW);
  scheduler.schedule(() => order.push('high'), UpdatePriority.HIGH);
  scheduler.schedule(() => order.push('normal'), UpdatePriority.NORMAL);

  scheduler.flushAll();

  // Without prioritization, should be FIFO
  assertEquals(order[0], 'low', 'First scheduled first');
  assertEquals(order[1], 'high', 'Second scheduled second');
  assertEquals(order[2], 'normal', 'Third scheduled third');
});

test('Disable metrics', () => {
  const scheduler = new UpdateScheduler({
    enableMetrics: false
  });

  scheduler.schedule(() => {});
  scheduler.flushAll();

  // Should still work, just not track metrics
  assertEquals(scheduler.hasUpdates(), false, 'Should execute');
});

console.log('');

// ============================================================================
// TEST SUITE 12: Edge Cases
// ============================================================================

console.log('TEST SUITE 12: Edge Cases\n');

test('Handle empty flush', () => {
  const scheduler = new UpdateScheduler();

  const result = scheduler.flush();

  assertEquals(result.success, true, 'Should succeed');
  assertEquals(result.processed, 0, 'Should process 0');
});

test('Handle flush while processing', () => {
  const scheduler = new UpdateScheduler();

  scheduler.schedule(() => {
    const result = scheduler.flush();
    assertEquals(result.success, false, 'Should fail while processing');
  });

  scheduler.flush();
});

test('Handle multiple rapid flushes', () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: false
  });

  for (let i = 0; i < 5; i++) {
    scheduler.schedule(() => {});
  }

  const result1 = scheduler.flush();
  const result2 = scheduler.flush();
  const result3 = scheduler.flush();

  assert(result1.processed >= 0, 'First flush OK');
  assert(result2.processed >= 0, 'Second flush OK');
  assert(result3.processed >= 0, 'Third flush OK');
});

test('Handle very large batch', () => {
  const scheduler = new UpdateScheduler({
    maxBatchSize: 1000,
    enableAutoFlushing: false
  });

  let count = 0;
  for (let i = 0; i < 1000; i++) {
    scheduler.schedule(() => { count++; });
  }

  scheduler.flush();

  assertEquals(count, 1000, 'Should handle large batch');
});

test('Handle recursive scheduling', () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: false
  });

  const order = [];

  scheduler.schedule(() => {
    order.push('a');
    // Schedule more updates while flushing
    scheduler.schedule(() => {
      order.push('b');
    });
  });

  scheduler.flushAll();

  assertEquals(order[0], 'a', 'First update first');
  assertEquals(order[1], 'b', 'Recursive update second');
});

test('Handle concurrent updates', () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: false
  });

  const results = [];

  // Simulate concurrent scheduling
  for (let i = 0; i < 10; i++) {
    scheduler.schedule(() => {
      results.push(i);
    }, UpdatePriority.NORMAL, `update-${i}`);
  }

  scheduler.flushAll();

  assertEquals(results.length, 10, 'Should execute all concurrent');
});

console.log('');

// ============================================================================
// TEST SUITE 13: Performance
// ============================================================================

console.log('TEST SUITE 13: Performance\n');

test('Schedule 10000 updates efficiently', () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: false,
    maxBatchSize: 100
  });

  const start = Date.now();

  for (let i = 0; i < 10000; i++) {
    scheduler.schedule(() => {});
  }

  const elapsed = Date.now() - start;

  assertLess(elapsed, 1000, `Should schedule 10k in < 1s (${elapsed}ms)`);
  assertEquals(scheduler.getPendingCount(), 10000, 'Should have all pending');
});

test('Flush 1000 updates efficiently', () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: false,
    maxBatchSize: 50
  });

  for (let i = 0; i < 1000; i++) {
    scheduler.schedule(() => {});
  }

  const start = Date.now();
  scheduler.flushAll();
  const elapsed = Date.now() - start;

  assertLess(elapsed, 500, `Should flush 1k in < 500ms (${elapsed}ms)`);
  assertEquals(scheduler.hasUpdates(), false, 'Should be empty');
});

test('Track performance metrics', () => {
  const scheduler = new UpdateScheduler({
    enableAutoFlushing: false
  });

  for (let i = 0; i < 100; i++) {
    scheduler.schedule(() => {});
  }

  scheduler.flushAll();

  const metrics = scheduler.getMetrics();

  assertEquals(metrics.totalUpdates, 100, 'Should track all');
  assertGreater(metrics.totalTime, 0, 'Should measure time');
  assertGreater(metrics.averageTime, 0, 'Should calculate average');
  assertGreater(metrics.maxTime, metrics.minTime, 'Max > Min');
});

console.log('');

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log('='.repeat(80) + '\n');

if (testsFailed === 0) {
  console.log('ðŸŽ‰ All tests passed!\n');
  process.exit(0);
} else {
  console.log('✗ Some tests failed.\n');
  process.exit(1);
}