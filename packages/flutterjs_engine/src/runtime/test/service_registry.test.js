/**
 * Service Registry Tests
 * 
 * Test suite for ServiceRegistry class
 * Tests registration, retrieval, caching, scoping, and events
 */


import { ServiceRegistry } from '../src/service_registry.js';

// Mock services
class MockService {
  constructor(name) {
    this.name = name;
    this.created = Date.now();
  }
}

class MockLogger {
  constructor() {
    this.logs = [];
  }
  
  log(message) {
    this.logs.push(message);
  }
}

class MockTheme {
  constructor() {
    this.primaryColor = '#6750a4';
    this.isDark = false;
  }
}

class MockNavigator {
  constructor() {
    this.currentRoute = '/';
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
  
  assertNull(value, message) {
    if (value !== null) {
      throw new Error(message || `Expected null but got ${value}`);
    }
  }
  
  assertNotNull(value, message) {
    if (value === null) {
      throw new Error(message || 'Expected value to not be null');
    }
  }
  
  assertTrue(value, message) {
    if (value !== true) {
      throw new Error(message || `Expected true but got ${value}`);
    }
  }
  
  assertFalse(value, message) {
    if (value !== false) {
      throw new Error(message || `Expected false but got ${value}`);
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
function runTests() {
  const test = new TestRunner();
  
  // Test 1: Initialization
  test.describe('ServiceRegistry: Initialization', () => {
    test.it('should create registry', () => {
      const registry = new ServiceRegistry();
      
      test.assert(registry !== null, 'Registry should be created');
      test.assertEqual(registry.stats.servicesRegistered, 0, 'Should start empty');
    });
    
    test.it('should create with config', () => {
      const registry = new ServiceRegistry({
        debugMode: true,
        throwOnMissing: true
      });
      
      test.assertTrue(registry.config.debugMode, 'Should set debug mode');
      test.assertTrue(registry.config.throwOnMissing, 'Should set throw option');
    });
    
    test.it('should have default config', () => {
      const registry = new ServiceRegistry();
      
      test.assertTrue(registry.config.enableLogging, 'Logging enabled');
      test.assertTrue(registry.config.enableValidation, 'Validation enabled');
      test.assertTrue(registry.config.cacheInstances, 'Caching enabled');
      test.assertTrue(registry.config.allowOverride, 'Override allowed');
    });
  });
  
  // Test 2: Register singleton
  test.describe('ServiceRegistry: Register Singleton', () => {
    test.it('should register singleton', () => {
      const registry = new ServiceRegistry();
      const service = new MockService('test');
      
      registry.register('myService', service);
      
      test.assertTrue(registry.has('myService'), 'Should register service');
      test.assertEqual(registry.stats.servicesRegistered, 1, 'Should count registration');
    });
    
    test.it('should retrieve registered singleton', () => {
      const registry = new ServiceRegistry();
      const service = new MockService('test');
      
      registry.register('myService', service);
      const retrieved = registry.get('myService');
      
      test.assertEqual(retrieved, service, 'Should return same instance');
    });
    
    test.it('should cache singleton', () => {
      const registry = new ServiceRegistry();
      const service = new MockService('test');
      
      registry.register('myService', service);
      const retrieved1 = registry.get('myService');
      const retrieved2 = registry.get('myService');
      
      test.assertEqual(retrieved1, retrieved2, 'Should return cached instance');
      test.assertEqual(registry.stats.cacheHits, 2, 'Should record cache hits');
    });
    
    test.it('should throw on null service', () => {
      const registry = new ServiceRegistry();
      
      try {
        registry.register('myService', null);
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('null'), 'Should mention null');
      }
    });
    
    test.it('should throw on invalid name', () => {
      const registry = new ServiceRegistry();
      
      try {
        registry.register('', new MockService());
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('name'), 'Should mention name');
      }
    });
    
    test.it('should throw on duplicate without override', () => {
      const registry = new ServiceRegistry({ allowOverride: false });
      
      registry.register('myService', new MockService('1'));
      
      try {
        registry.register('myService', new MockService('2'));
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('already'), 'Should mention duplicate');
      }
    });
    
    test.it('should allow override when enabled', () => {
      const registry = new ServiceRegistry({ allowOverride: true });
      
      const service1 = new MockService('1');
      const service2 = new MockService('2');
      
      registry.register('myService', service1);
      registry.register('myService', service2);
      
      const retrieved = registry.get('myService');
      test.assertEqual(retrieved, service2, 'Should return latest service');
    });
  });
  
  // Test 3: Register factory
  test.describe('ServiceRegistry: Register Factory', () => {
    test.it('should register factory', () => {
      const registry = new ServiceRegistry();
      
      registry.registerFactory('myService', () => new MockService('test'));
      
      test.assertTrue(registry.has('myService'), 'Should register factory');
      test.assertEqual(registry.stats.servicesRegistered, 1, 'Should count registration');
    });
    
    test.it('should create new instance each time', () => {
      const registry = new ServiceRegistry();
      
      registry.registerFactory('myService', () => new MockService('test'));
      
      const instance1 = registry.get('myService');
      const instance2 = registry.get('myService');
      
      test.assertNotNull(instance1, 'Should create instance 1');
      test.assertNotNull(instance2, 'Should create instance 2');
      test.assert(instance1 !== instance2, 'Should create different instances');
    });
    
    test.it('should count factory calls', () => {
      const registry = new ServiceRegistry();
      
      registry.registerFactory('myService', () => new MockService('test'));
      
      registry.get('myService');
      registry.get('myService');
      registry.get('myService');
      
      test.assertEqual(registry.stats.factoryCalls, 3, 'Should count all factory calls');
    });
    
    test.it('should throw on non-function factory', () => {
      const registry = new ServiceRegistry();
      
      try {
        registry.registerFactory('myService', 'not a function');
        throw new Error('Should have thrown');
      } catch (error) {
        test.assert(error.message.includes('function'), 'Should mention function');
      }
    });
  });
  
  // Test 4: Register lazy
  test.describe('ServiceRegistry: Register Lazy', () => {
    test.it('should register lazy provider', () => {
      const registry = new ServiceRegistry();
      
      registry.registerLazy('myService', () => new MockService('test'));
      
      test.assertTrue(registry.has('myService'), 'Should register provider');
      test.assertEqual(registry.stats.servicesRegistered, 1, 'Should count registration');
    });
    
    test.it('should create on first access', () => {
      const registry = new ServiceRegistry();
      let callCount = 0;
      
      registry.registerLazy('myService', () => {
        callCount++;
        return new MockService('test');
      });
      
      const instance1 = registry.get('myService');
      
      test.assertEqual(callCount, 1, 'Should call provider once');
      test.assertNotNull(instance1, 'Should return instance');
    });
    
    test.it('should cache lazy singleton', () => {
      const registry = new ServiceRegistry();
      let callCount = 0;
      
      registry.registerLazy('myService', () => {
        callCount++;
        return new MockService('test');
      });
      
      const instance1 = registry.get('myService');
      const instance2 = registry.get('myService');
      
      test.assertEqual(callCount, 1, 'Should call provider once');
      test.assertEqual(instance1, instance2, 'Should return same instance');
    });
    
    test.it('should count lazy provider calls', () => {
      const registry = new ServiceRegistry();
      
      registry.registerLazy('service1', () => new MockService('1'));
      registry.registerLazy('service2', () => new MockService('2'));
      
      registry.get('service1');
      registry.get('service2');
      
      test.assertEqual(registry.stats.lazyProviderCalls, 2, 'Should count provider calls');
    });
  });
  
  // Test 5: Scoped services
  test.describe('ServiceRegistry: Scoped Services', () => {
    test.it('should register scoped service', () => {
      const registry = new ServiceRegistry();
      const service = new MockService('scoped');
      
      registry.registerScoped('scope1', 'myService', service);
      
      test.assertTrue(registry.hasScoped('scope1', 'myService'), 'Should register scoped');
    });
    
    test.it('should retrieve scoped service', () => {
      const registry = new ServiceRegistry();
      const service = new MockService('scoped');
      
      registry.registerScoped('scope1', 'myService', service);
      const retrieved = registry.getScoped('scope1', 'myService');
      
      test.assertEqual(retrieved, service, 'Should return scoped service');
    });
    
    test.it('should isolate scopes', () => {
      const registry = new ServiceRegistry();
      const service1 = new MockService('scope1');
      const service2 = new MockService('scope2');
      
      registry.registerScoped('scope1', 'myService', service1);
      registry.registerScoped('scope2', 'myService', service2);
      
      const retrieved1 = registry.getScoped('scope1', 'myService');
      const retrieved2 = registry.getScoped('scope2', 'myService');
      
      test.assertEqual(retrieved1, service1, 'Should get scope1 service');
      test.assertEqual(retrieved2, service2, 'Should get scope2 service');
      test.assert(retrieved1 !== retrieved2, 'Should be different instances');
    });
    
    test.it('should clear scope', () => {
      const registry = new ServiceRegistry();
      const service = new MockService('scoped');
      
      registry.registerScoped('scope1', 'myService', service);
      test.assertTrue(registry.hasScoped('scope1', 'myService'), 'Should exist');
      
      registry.clearScope('scope1');
      test.assertFalse(registry.hasScoped('scope1', 'myService'), 'Should be cleared');
    });
  });
  
  // Test 6: Check and unregister
  test.describe('ServiceRegistry: Check and Unregister', () => {
    test.it('should check if service registered', () => {
      const registry = new ServiceRegistry();
      
      test.assertFalse(registry.has('myService'), 'Should not have service');
      
      registry.register('myService', new MockService());
      
      test.assertTrue(registry.has('myService'), 'Should have service');
    });
    
    test.it('should unregister service', () => {
      const registry = new ServiceRegistry();
      
      registry.register('myService', new MockService());
      test.assertTrue(registry.has('myService'), 'Should be registered');
      
      registry.unregister('myService');
      test.assertFalse(registry.has('myService'), 'Should be unregistered');
    });
    
    test.it('should unregister scoped service', () => {
      const registry = new ServiceRegistry();
      const service = new MockService();
      
      registry.registerScoped('scope1', 'myService', service);
      test.assertTrue(registry.hasScoped('scope1', 'myService'), 'Should exist');
      
      registry.unregisterScoped('scope1', 'myService');
      test.assertFalse(registry.hasScoped('scope1', 'myService'), 'Should be unregistered');
    });
  });
  
  // Test 7: Get names and metadata
  test.describe('ServiceRegistry: Names and Metadata', () => {
    test.it('should get all service names', () => {
      const registry = new ServiceRegistry();
      
      registry.register('service1', new MockService());
      registry.registerFactory('service2', () => new MockService());
      registry.registerLazy('service3', () => new MockService());
      
      const names = registry.getNames();
      
      test.assertEqual(names.length, 3, 'Should have 3 services');
      test.assert(names.includes('service1'), 'Should include service1');
      test.assert(names.includes('service2'), 'Should include service2');
      test.assert(names.includes('service3'), 'Should include service3');
    });
    
    test.it('should get service metadata', () => {
      const registry = new ServiceRegistry();
      
      registry.register('myService', new MockService());
      
      const meta = registry.getMetadata('myService');
      
      test.assertNotNull(meta, 'Should have metadata');
      test.assertEqual(meta.type, 'singleton', 'Should be singleton');
      test.assertEqual(meta.name, 'myService', 'Should have name');
    });
    
    test.it('should get all metadata', () => {
      const registry = new ServiceRegistry();
      
      registry.register('service1', new MockService());
      registry.registerFactory('service2', () => new MockService());
      
      const allMeta = registry.getAllMetadata();
      
      test.assert('service1' in allMeta, 'Should have service1 metadata');
      test.assert('service2' in allMeta, 'Should have service2 metadata');
    });
  });
  
  // Test 8: Dependencies
  test.describe('ServiceRegistry: Dependencies', () => {
    test.it('should set dependencies', () => {
      const registry = new ServiceRegistry();
      
      registry.setDependencies('myService', ['dep1', 'dep2']);
      
      const deps = registry.getDependencies('myService');
      
      test.assertEqual(deps.length, 2, 'Should have 2 dependencies');
      test.assert(deps.includes('dep1'), 'Should include dep1');
      test.assert(deps.includes('dep2'), 'Should include dep2');
    });
    
    test.it('should return empty array for no dependencies', () => {
      const registry = new ServiceRegistry();
      
      const deps = registry.getDependencies('unknownService');
      
      test.assertEqual(deps.length, 0, 'Should return empty array');
    });
  });
  
  // Test 9: Events
  test.describe('ServiceRegistry: Events', () => {
    test.it('should listen to service-registered event', () => {
      const registry = new ServiceRegistry();
      let eventFired = false;
      let eventData = null;
      
      registry.on('service-registered', (data) => {
        eventFired = true;
        eventData = data;
      });
      
      registry.register('myService', new MockService());
      
      test.assertTrue(eventFired, 'Event should fire');
      test.assertEqual(eventData.name, 'myService', 'Should have service name');
      test.assertEqual(eventData.type, 'singleton', 'Should have type');
    });
    
    test.it('should listen to service-created event', () => {
      const registry = new ServiceRegistry();
      let eventFired = false;
      let eventData = null;
      
      registry.on('service-created', (data) => {
        eventFired = true;
        eventData = data;
      });
      
      registry.registerFactory('myService', () => new MockService());
      registry.get('myService');
      
      test.assertTrue(eventFired, 'Event should fire');
      test.assertEqual(eventData.name, 'myService', 'Should have service name');
      test.assertEqual(eventData.type, 'factory', 'Should have type');
    });
    
    test.it('should listen to service-not-found event', () => {
      const registry = new ServiceRegistry({ throwOnMissing: false });
      let eventFired = false;
      
      registry.on('service-not-found', () => {
        eventFired = true;
      });
      
      registry.get('unknownService');
      
      test.assertTrue(eventFired, 'Event should fire');
    });
    
    test.it('should remove event listener', () => {
      const registry = new ServiceRegistry();
      let callCount = 0;
      
      const callback = () => { callCount++; };
      
      registry.on('service-registered', callback);
      registry.register('service1', new MockService());
      test.assertEqual(callCount, 1, 'Should call callback');
      
      registry.off('service-registered', callback);
      registry.register('service2', new MockService());
      test.assertEqual(callCount, 1, 'Should not call callback after off');
    });
  });
  
  // Test 10: Statistics
  test.describe('ServiceRegistry: Statistics', () => {
    test.it('should track statistics', () => {
      const registry = new ServiceRegistry();
      
      registry.register('service1', new MockService());
      registry.get('service1');
      registry.get('service1');
      registry.registerFactory('service2', () => new MockService());
      registry.get('service2');
      
      const stats = registry.getStats();
      
      test.assertEqual(stats.servicesRegistered, 2, 'Should track registrations');
      test.assertEqual(stats.servicesRetrieved, 3, 'Should track retrievals');
      test.assert(stats.cacheHits > 0, 'Should track cache hits');
    });
    
    test.it('should calculate hit rate', () => {
      const registry = new ServiceRegistry();
      
      registry.register('myService', new MockService());
      registry.get('myService');
      registry.get('myService');
      registry.get('myService');
      
      const stats = registry.getStats();
      
      test.assertNotNull(stats.hitRate, 'Should calculate hit rate');
      test.assert(parseFloat(stats.hitRate) > 0, 'Should have positive hit rate');
    });
    
    test.it('should reset statistics', () => {
      const registry = new ServiceRegistry();
      
      registry.register('myService', new MockService());
      registry.get('myService');
      
      test.assert(registry.stats.servicesRegistered > 0, 'Should have stats');
      
      registry.resetStats();
      
      test.assertEqual(registry.stats.servicesRegistered, 0, 'Should reset');
      test.assertEqual(registry.stats.servicesRetrieved, 0, 'Should reset');
    });
  });
  
  // Test 11: Clear and dispose
  test.describe('ServiceRegistry: Clear and Dispose', () => {
    test.it('should clear all services', () => {
      const registry = new ServiceRegistry();
      
      registry.register('service1', new MockService());
      registry.registerFactory('service2', () => new MockService());
      
      test.assertEqual(registry.getNames().length, 2, 'Should have 2 services');
      
      registry.clear();
      
      test.assertEqual(registry.getNames().length, 0, 'Should have 0 services');
    });
    
    test.it('should clear all scopes', () => {
      const registry = new ServiceRegistry();
      
      registry.registerScoped('scope1', 'service1', new MockService());
      registry.registerScoped('scope2', 'service2', new MockService());
      
      test.assertEqual(registry.scopedServices.size, 2, 'Should have 2 scopes');
      
      registry.clearAllScopes();
      
      test.assertEqual(registry.scopedServices.size, 0, 'Should have 0 scopes');
    });
    
    test.it('should dispose registry', () => {
      const registry = new ServiceRegistry();
      
      registry.register('myService', new MockService());
      registry.on('event', () => {});
      
      registry.dispose();
      
      test.assertEqual(registry.getNames().length, 0, 'Should clear services');
      test.assertEqual(registry.listeners.size, 0, 'Should clear listeners');
    });
  });
  
  // Test 12: Real-world scenario
  test.describe('ServiceRegistry: Real-world Scenario', () => {
    test.it('should manage multiple services', () => {
      const registry = new ServiceRegistry();
      
      // Register theme
      registry.register('theme', new MockTheme());
      
      // Register navigator factory
      registry.registerFactory('navigator', () => new MockNavigator());
      
      // Register logger lazy
      registry.registerLazy('logger', () => new MockLogger());
      
      // Use services
      const theme = registry.get('theme');
      const nav1 = registry.get('navigator');
      const nav2 = registry.get('navigator');
      const logger = registry.get('logger');
      
      test.assertNotNull(theme, 'Should get theme');
      test.assertNotNull(nav1, 'Should get navigator');
      test.assert(nav1 !== nav2, 'Should create different navigators');
      test.assertNotNull(logger, 'Should get logger');
      
      // Check stats
      const stats = registry.getStats();
      test.assertEqual(stats.totalRegistered, 3, 'Should have 3 services');
    });
    
    test.it('should get detailed report', () => {
      const registry = new ServiceRegistry();
      
      registry.register('theme', new MockTheme());
      registry.registerFactory('logger', () => new MockLogger());
      
      const report = registry.getDetailedReport();
      
      test.assertNotNull(report.stats, 'Should have stats');
      test.assertNotNull(report.services, 'Should have services');
      test.assertNotNull(report.metadata, 'Should have metadata');
      test.assertNotNull(report.timestamp, 'Should have timestamp');
    });
  });
  
  return test.summary();
}

// Run
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
