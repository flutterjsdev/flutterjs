/**
 * FlutterJS Complete Runtime Integration
 * 
 * This is the main entry point that orchestrates all runtime subsystems:
 * - RuntimeEngine: Widget lifecycle and element tree
 * - EventSystem: Delegated event handling
 * - GestureRecognizer: Complex gesture detection
 * - FocusManager: Keyboard navigation
 * - MemoryManager: Leak prevention and cleanup
 * - ServiceRegistry: Dependency injection
 * - StateManager: Reactive state updates
 * 
 * Public API:
 * - runApp(widget, container?) - Initialize and mount application
 * - hotReload(widget) - Update running app (dev mode)
 * - getRuntime() - Access runtime instance
 * 
 * Example:
 * ```javascript
 * import { runApp } from '@flutterjs/runtime';
 * import { MyApp } from './app';
 * 
 * runApp(new MyApp());
 * ```
 */

// Import core subsystems (these would be actual imports in production)
// For demo, we'll include simplified versions inline

/**
 * FlutterJSRuntime Class
 * 
 * Central coordinator for all runtime subsystems.
 * Manages initialization, lifecycle, and communication between components.
 */
class FlutterJSRuntime {
  /**
   * Create runtime instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Configuration
    this.config = {
      debugMode: options.debugMode || false,
      enableHotReload: options.enableHotReload !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableMemoryTracking: options.enableMemoryTracking !== false,
      routing: options.routing || false,
      analytics: options.analytics || false,
      ...options
    };
    
    // Core subsystems
    this.engine = null;
    this.eventSystem = null;
    this.gestureRecognizer = null;
    this.focusManager = null;
    this.memoryManager = null;
    this.serviceRegistry = null;
    this.stateManager = null;
    
    // Runtime state
    this.initialized = false;
    this.mounted = false;
    this.rootWidget = null;
    this.containerElement = null;
    
    // Performance tracking
    this.stats = {
      initTime: 0,
      mountTime: 0,
      totalFrames: 0,
      averageFrameTime: 0,
      lastUpdateTime: 0
    };
    
    // Lifecycle hooks
    this.hooks = {
      beforeInit: [],
      afterInit: [],
      beforeMount: [],
      afterMount: [],
      beforeUnmount: [],
      afterUnmount: []
    };
    
    // Error handling
    this.errorHandlers = [];
    this.setupErrorHandling();
    
    if (this.config.debugMode) {
      console.log('[FlutterJS] Runtime instance created');
    }
  }
  
  /**
   * Initialize runtime subsystems
   * @param {Object} options - Initialization options
   * @returns {FlutterJSRuntime} this instance for chaining
   */
  initialize(options = {}) {
    if (this.initialized) {
      console.warn('[FlutterJS] Runtime already initialized');
      return this;
    }
    
    const startTime = performance.now();
    
    try {
      this.runHooks('beforeInit');
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] Initializing runtime subsystems...');
      }
      
      // 1. Initialize Memory Manager first (needed by others)
      this.memoryManager = new MemoryManager({
        enableLeakDetection: this.config.enableMemoryTracking,
        debugMode: this.config.debugMode
      });
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] âœ" Memory Manager initialized');
      }
      
      // 2. Initialize Service Registry
      this.serviceRegistry = new ServiceRegistry({
        enableLogging: this.config.debugMode,
        debugMode: this.config.debugMode
      });
      
      // Register built-in services
      this.registerBuiltInServices();
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] âœ" Service Registry initialized');
      }
      
      // 3. Initialize Runtime Engine
      this.engine = new RuntimeEngine();
      this.engine.config.debugMode = this.config.debugMode;
      this.engine.serviceRegistry = this.serviceRegistry;
      this.engine.memoryManager = this.memoryManager;
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] âœ" Runtime Engine initialized');
      }
      
      // 4. Initialize State Manager
      this.stateManager = new StateManager(this.engine);
      this.stateManager.config.debugMode = this.config.debugMode;
      this.engine.stateManager = this.stateManager;
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] âœ" State Manager initialized');
      }
      
      // 5. Initialize Event System
      if (options.rootElement) {
        this.eventSystem = new EventSystem(this.engine);
        this.eventSystem.initialize(options.rootElement);
        this.engine.eventSystem = this.eventSystem;
        
        if (this.config.debugMode) {
          console.log('[FlutterJS] âœ" Event System initialized');
        }
      }
      
      // 6. Initialize Gesture Recognizer
      this.gestureRecognizer = new GestureManager();
      this.engine.gestureRecognizer = this.gestureRecognizer;
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] âœ" Gesture Recognizer initialized');
      }
      
      // 7. Initialize Focus Manager
      this.focusManager = new FocusManager(this.engine);
      this.focusManager.setupKeyboardNavigation();
      this.engine.focusManager = this.focusManager;
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] âœ" Focus Manager initialized');
      }
      
      // 8. Setup performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }
      
      this.initialized = true;
      this.stats.initTime = performance.now() - startTime;
      
      this.runHooks('afterInit');
      
      if (this.config.debugMode) {
        console.log(
          `[FlutterJS] âœ… Runtime initialized in ${this.stats.initTime.toFixed(2)}ms`
        );
      }
      
      return this;
    } catch (error) {
      this.handleError('initialization', error);
      throw error;
    }
  }
  
  /**
   * Register built-in framework services
   */
  registerBuiltInServices() {
    // Theme service
    this.serviceRegistry.registerLazy('theme', () => {
      return new ThemeService({
        primaryColor: '#6750a4',
        backgroundColor: '#ffffff',
        textColor: '#1c1b1f'
      });
    });
    
    // MediaQuery service
    this.serviceRegistry.registerLazy('mediaQuery', () => {
      return new MediaQueryService();
    });
    
    // Logger service
    this.serviceRegistry.register('logger', new LoggerService({
      level: this.config.debugMode ? 'debug' : 'warn'
    }));
    
    // Navigator service (if routing enabled)
    if (this.config.routing) {
      this.serviceRegistry.registerLazy('navigator', () => {
        return new NavigatorService(this.engine);
      });
    }
    
    // Analytics service (if enabled)
    if (this.config.analytics) {
      this.serviceRegistry.registerLazy('analytics', () => {
        return new AnalyticsService(this.config.analytics);
      });
    }
    
    if (this.config.debugMode) {
      console.log(
        `[FlutterJS] Registered ${this.serviceRegistry.getNames().length} built-in services`
      );
    }
  }
  
  /**
   * Run application
   * @param {Widget} rootWidget - Root widget (e.g., MyApp)
   * @param {HTMLElement} containerElement - Container to mount into (optional)
   * @returns {FlutterJSRuntime} this instance for chaining
   */
  runApp(rootWidget, containerElement = null) {
    if (!rootWidget) {
      throw new Error('[FlutterJS] Root widget is required');
    }
    
    const startTime = performance.now();
    
    try {
      // Determine container
      const container = containerElement || 
                       document.getElementById('root') || 
                       document.body;
      
      if (!container) {
        throw new Error('[FlutterJS] Could not find container element');
      }
      
      this.containerElement = container;
      this.rootWidget = rootWidget;
      
      // Initialize if not already done
      if (!this.initialized) {
        this.initialize({ rootElement: container });
      } else if (!this.eventSystem) {
        // Initialize event system if container changed
        this.eventSystem = new EventSystem(this.engine);
        this.eventSystem.initialize(container);
        this.engine.eventSystem = this.eventSystem;
      }
      
      this.runHooks('beforeMount');
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] Mounting application...');
      }
      
      // Mount application
      this.engine.mount(rootWidget, container);
      
      this.mounted = true;
      this.stats.mountTime = performance.now() - startTime;
      
      this.runHooks('afterMount');
      
      if (this.config.debugMode) {
        console.log(
          `[FlutterJS] âœ… Application mounted in ${this.stats.mountTime.toFixed(2)}ms`
        );
        this.logStats();
      }
      
      // Notify analytics
      if (this.config.analytics) {
        const analytics = this.serviceRegistry.get('analytics');
        if (analytics) {
          analytics.trackEvent('app_mounted', {
            mountTime: this.stats.mountTime
          });
        }
      }
      
      return this;
    } catch (error) {
      this.handleError('mount', error);
      throw error;
    }
  }
  
  /**
   * Hot reload application (development mode)
   * @param {Widget} newRootWidget - Updated root widget
   * @returns {FlutterJSRuntime} this instance for chaining
   */
  hotReload(newRootWidget) {
    if (!this.config.enableHotReload) {
      console.warn('[FlutterJS] Hot reload is disabled');
      return this;
    }
    
    if (!this.mounted) {
      console.warn('[FlutterJS] Cannot hot reload: app not mounted');
      return this;
    }
    
    const startTime = performance.now();
    
    try {
      if (this.config.debugMode) {
        console.log('[FlutterJS] Hot reloading...');
      }
      
      // Update root widget
      this.rootWidget = newRootWidget;
      this.engine.elementTree.update(newRootWidget);
      this.engine.elementTree.markNeedsBuild();
      this.engine.performUpdate();
      
      const reloadTime = performance.now() - startTime;
      
      if (this.config.debugMode) {
        console.log(`[FlutterJS] âœ… Hot reload completed in ${reloadTime.toFixed(2)}ms`);
      }
      
      return this;
    } catch (error) {
      this.handleError('hotReload', error);
      throw error;
    }
  }
  
  /**
   * Unmount application
   * @returns {FlutterJSRuntime} this instance for chaining
   */
  unmount() {
    if (!this.mounted) {
      console.warn('[FlutterJS] App not mounted');
      return this;
    }
    
    try {
      this.runHooks('beforeUnmount');
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] Unmounting application...');
      }
      
      // Unmount engine
      if (this.engine) {
        this.engine.unmount();
      }
      
      // Cleanup subsystems
      if (this.eventSystem) {
        this.eventSystem.dispose();
      }
      
      if (this.gestureRecognizer) {
        this.gestureRecognizer.dispose();
      }
      
      if (this.focusManager) {
        this.focusManager.dispose();
      }
      
      if (this.stateManager) {
        this.stateManager.dispose();
      }
      
      if (this.memoryManager) {
        this.memoryManager.clear();
      }
      
      this.mounted = false;
      
      this.runHooks('afterUnmount');
      
      if (this.config.debugMode) {
        console.log('[FlutterJS] âœ… Application unmounted');
      }
      
      return this;
    } catch (error) {
      this.handleError('unmount', error);
      throw error;
    }
  }
  
  /**
   * Dispose runtime completely
   */
  dispose() {
    if (this.mounted) {
      this.unmount();
    }
    
    if (this.serviceRegistry) {
      this.serviceRegistry.dispose();
    }
    
    if (this.memoryManager) {
      this.memoryManager.dispose();
    }
    
    // Clear references
    this.engine = null;
    this.eventSystem = null;
    this.gestureRecognizer = null;
    this.focusManager = null;
    this.memoryManager = null;
    this.serviceRegistry = null;
    this.stateManager = null;
    
    this.initialized = false;
    this.rootWidget = null;
    this.containerElement = null;
    
    if (this.config.debugMode) {
      console.log('[FlutterJS] Runtime disposed');
    }
  }
  
  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError('global', event.error);
    });
    
    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('promise', event.reason);
    });
  }
  
  /**
   * Handle error
   * @param {string} source - Error source
   * @param {Error} error - Error object
   */
  handleError(source, error) {
    console.error(`[FlutterJS] Error in ${source}:`, error);
    
    // Call registered error handlers
    this.errorHandlers.forEach(handler => {
      try {
        handler(source, error);
      } catch (handlerError) {
        console.error('[FlutterJS] Error in error handler:', handlerError);
      }
    });
    
    // Track in analytics
    if (this.config.analytics) {
      const analytics = this.serviceRegistry?.get('analytics');
      if (analytics) {
        analytics.trackError(source, error);
      }
    }
  }
  
  /**
   * Register error handler
   * @param {Function} handler - Error handler function
   */
  onError(handler) {
    if (typeof handler === 'function') {
      this.errorHandlers.push(handler);
    }
    return this;
  }
  
  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor frame rate
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let totalFrameTime = 0;
    
    const measureFrame = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      
      frameCount++;
      totalFrameTime += frameTime;
      
      this.stats.totalFrames = frameCount;
      this.stats.averageFrameTime = totalFrameTime / frameCount;
      
      // Warn on slow frames (> 16.67ms = < 60 FPS)
      if (frameTime > 16.67 && this.config.debugMode) {
        console.warn(
          `[FlutterJS] Slow frame detected: ${frameTime.toFixed(2)}ms ` +
          `(target: 16.67ms for 60 FPS)`
        );
      }
      
      lastFrameTime = now;
      
      if (this.mounted) {
        requestAnimationFrame(measureFrame);
      }
    };
    
    if (this.mounted) {
      requestAnimationFrame(measureFrame);
    }
    
    // Log stats periodically
    if (this.config.debugMode) {
      setInterval(() => {
        if (this.mounted) {
          this.logStats();
        }
      }, 10000); // Every 10 seconds
    }
  }
  
  /**
   * Register lifecycle hook
   * @param {string} hookName - Hook name
   * @param {Function} callback - Hook callback
   */
  on(hookName, callback) {
    if (this.hooks[hookName] && typeof callback === 'function') {
      this.hooks[hookName].push(callback);
    }
    return this;
  }
  
  /**
   * Run lifecycle hooks
   * @param {string} hookName - Hook name
   */
  runHooks(hookName) {
    const hooks = this.hooks[hookName] || [];
    hooks.forEach(hook => {
      try {
        hook(this);
      } catch (error) {
        console.error(`[FlutterJS] Error in ${hookName} hook:`, error);
      }
    });
  }
  
  /**
   * Get runtime statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      ...this.stats,
      initialized: this.initialized,
      mounted: this.mounted
    };
    
    if (this.engine) {
      stats.engine = this.engine.getStats();
    }
    
    if (this.eventSystem) {
      stats.events = this.eventSystem.getStats();
    }
    
    if (this.gestureRecognizer) {
      stats.gestures = this.gestureRecognizer.getStats();
    }
    
    if (this.focusManager) {
      stats.focus = this.focusManager.getStats();
    }
    
    if (this.memoryManager) {
      stats.memory = this.memoryManager.getStats();
    }
    
    if (this.stateManager) {
      stats.state = this.stateManager.getStats();
    }
    
    if (this.serviceRegistry) {
      stats.services = this.serviceRegistry.getStats();
    }
    
    return stats;
  }
  
  /**
   * Log statistics to console
   */
  logStats() {
    if (!this.config.debugMode) return;
    
    const stats = this.getStats();
    
    console.group('[FlutterJS] Runtime Statistics');
    console.log('Initialization Time:', `${stats.initTime.toFixed(2)}ms`);
    console.log('Mount Time:', `${stats.mountTime.toFixed(2)}ms`);
    console.log('Total Frames:', stats.totalFrames);
    console.log('Average Frame Time:', `${stats.averageFrameTime.toFixed(2)}ms`);
    
    if (stats.engine) {
      console.log('Engine Frames:', stats.engine.frameCount);
      console.log('Engine Build Time:', `${stats.engine.buildTime.toFixed(2)}ms`);
    }
    
    if (stats.memory) {
      console.log('Elements Tracked:', stats.memory.currentElements);
      console.log('VNodes Tracked:', stats.memory.currentVNodes);
    }
    
    if (stats.state) {
      console.log('Active States:', stats.state.currentStates);
      console.log('setState Calls:', stats.state.setStateCalls);
    }
    
    console.groupEnd();
  }
  
  /**
   * Get runtime configuration
   * @returns {Object} Configuration object
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Check if runtime is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
  
  /**
   * Check if app is mounted
   * @returns {boolean}
   */
  isMounted() {
    return this.mounted;
  }
}

// Simplified subsystem mocks for demo
// In production, these would be imported from separate files

class RuntimeEngine {
  constructor() {
    this.rootWidget = null;
    this.elementTree = null;
    this.dirtyElements = new Set();
    this.updateScheduled = false;
    this.frameCounter = 0;
    this.buildTime = 0;
    this.mounted = false;
    this.config = { debugMode: false };
  }
  
  mount(widget, container) {
    this.rootWidget = widget;
    this.mounted = true;
    this.frameCounter++;
  }
  
  unmount() {
    this.mounted = false;
  }
  
  getStats() {
    return {
      frameCount: this.frameCounter,
      buildTime: this.buildTime,
      mounted: this.mounted
    };
  }
}

class EventSystem {
  initialize() {}
  dispose() {}
  getStats() { return { eventsDispatched: 0 }; }
}

class GestureManager {
  dispose() {}
  getStats() { return { totalRecognizers: 0 }; }
}

class FocusManager {
  constructor() {}
  setupKeyboardNavigation() {}
  dispose() {}
  getStats() { return { totalFocusable: 0 }; }
}

class MemoryManager {
  constructor() {}
  clear() {}
  dispose() {}
  getStats() {
    return {
      currentElements: 0,
      currentVNodes: 0
    };
  }
}

class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }
  registerLazy(name, provider) {
    this.services.set(name, { type: 'lazy', provider });
  }
  register(name, service) {
    this.services.set(name, { type: 'singleton', service });
  }
  get(name) {
    const entry = this.services.get(name);
    if (!entry) return null;
    if (entry.type === 'lazy') {
      entry.service = entry.provider();
      entry.type = 'singleton';
    }
    return entry.service;
  }
  getNames() {
    return Array.from(this.services.keys());
  }
  dispose() {
    this.services.clear();
  }
  getStats() {
    return {
      totalRegistered: this.services.size
    };
  }
}

class StateManager {
  constructor() {
    this.config = { debugMode: false };
  }
  dispose() {}
  getStats() {
    return {
      currentStates: 0,
      setStateCalls: 0
    };
  }
}

class ThemeService {
  constructor(theme) {
    this.theme = theme;
  }
}

class MediaQueryService {
  constructor() {
    this.data = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
}

class LoggerService {
  constructor(config) {
    this.level = config.level;
  }
}

class NavigatorService {
  constructor() {}
}

class AnalyticsService {
  constructor() {}
  trackEvent() {}
  trackError() {}
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Global runtime instance
 */
let _runtimeInstance = null;

/**
 * Run FlutterJS application
 * @param {Widget} rootWidget - Root widget
 * @param {HTMLElement} container - Container element (optional)
 * @returns {FlutterJSRuntime} Runtime instance
 */
export function runApp(rootWidget, container = null) {
  if (_runtimeInstance && _runtimeInstance.isMounted()) {
    console.warn('[FlutterJS] App already running. Call dispose() first.');
    return _runtimeInstance;
  }
  
  _runtimeInstance = new FlutterJSRuntime({
    debugMode: true,
    enableHotReload: true,
    enablePerformanceMonitoring: true,
    enableMemoryTracking: true
  });
  
  _runtimeInstance.runApp(rootWidget, container);
  
  return _runtimeInstance;
}

/**
 * Hot reload application (development)
 * @param {Widget} newRootWidget - Updated root widget
 */
export function hotReload(newRootWidget) {
  if (!_runtimeInstance) {
    console.warn('[FlutterJS] No runtime instance found');
    return;
  }
  
  _runtimeInstance.hotReload(newRootWidget);
}

/**
 * Get runtime instance
 * @returns {FlutterJSRuntime|null} Runtime instance or null
 */
export function getRuntime() {
  return _runtimeInstance;
}

/**
 * Unmount and dispose runtime
 */
export function dispose() {
  if (_runtimeInstance) {
    _runtimeInstance.dispose();
    _runtimeInstance = null;
  }
}

// ============================================================================
// DEMO
// ============================================================================

// Mock widget classes for demo
class Widget {
  constructor(options = {}) {
    this.key = options.key;
  }
}

class StatelessWidget extends Widget {
  build(context) {
    return null;
  }
}

class MyApp extends StatelessWidget {
  build(context) {
    console.log('Building MyApp');
    return null;
  }
}

// Demo execution
console.log('='.repeat(60));
console.log('FlutterJS Runtime Integration Demo');
console.log('='.repeat(60));

// Create and run app
const runtime = runApp(new MyApp());

// Log stats after mount
setTimeout(() => {
  console.log('\nRuntime Stats After Mount:');
  console.log(runtime.getStats());
}, 100);

// Simulate hot reload
setTimeout(() => {
  console.log('\nSimulating Hot Reload...');
  hotReload(new MyApp());
}, 500);

// Cleanup after demo
setTimeout(() => {
  console.log('\nDisposing runtime...');
  dispose();
  console.log('âœ… Demo complete');
}, 1000);
