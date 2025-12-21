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

// Import core subsystems

/**
 * FlutterJS Runtime - Fixed for Server-Side Compatibility
 * 
 * Only initializes browser-dependent subsystems when running in browser
 */

import { RuntimeEngine } from './runtime_engine.js';
import { EventSystem, SyntheticEvent } from './event_system.js';
import { GestureManager } from './gesture_recognizer.js';
import { FocusManager } from './focus_manager.js';
import { MemoryManager, MemoryProfiler } from './memory_manager.js';
import { ServiceRegistry } from './service_registry.js';
import { StateManager } from './state.js';

/**
 * Check if code is running in browser environment
 */
function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * FlutterJSRuntime Class
 */
class FlutterJSRuntime {
  constructor(options = {}) {
    // Configuration
    this.config = {
      debugMode: options.debugMode || false,
      enableHotReload: options.enableHotReload !== false,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableMemoryTracking: options.enableMemoryTracking !== false,
      routing: options.routing || false,
      analytics: options.analytics || false,
      isBrowser: isBrowser(), // Detect environment
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
      console.log('[FlutterJS] Runtime instance created', {
        environment: this.config.isBrowser ? 'browser' : 'server'
      });
    }
  }

  /**
   * Initialize runtime subsystems
   * Skip browser-only subsystems when running on server
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

      // 1. Initialize Memory Manager (works everywhere)
      this.memoryManager = new MemoryManager({
        enableLeakDetection: this.config.enableMemoryTracking,
        debugMode: this.config.debugMode
      });

      if (this.config.debugMode) {
        console.log('[FlutterJS] ✓ Memory Manager initialized');
      }

      // 2. Initialize Service Registry (works everywhere)
      this.serviceRegistry = new ServiceRegistry({
        enableLogging: this.config.debugMode,
        debugMode: this.config.debugMode
      });

      this.registerBuiltInServices();

      if (this.config.debugMode) {
        console.log('[FlutterJS] ✓ Service Registry initialized');
      }

      // 3. Initialize Runtime Engine (works everywhere)
      this.engine = new RuntimeEngine();
      this.engine.config.debugMode = this.config.debugMode;
      this.engine.serviceRegistry = this.serviceRegistry;
      this.engine.memoryManager = this.memoryManager;

      if (this.config.debugMode) {
        console.log('[FlutterJS] ✓ Runtime Engine initialized');
      }

      // 4. Initialize State Manager (works everywhere)
      this.stateManager = new StateManager(this.engine);
      this.stateManager.config.debugMode = this.config.debugMode;
      this.engine.stateManager = this.stateManager;

      if (this.config.debugMode) {
        console.log('[FlutterJS] ✓ State Manager initialized');
      }

      // ===== BROWSER-ONLY SUBSYSTEMS BELOW =====
      // Only initialize if running in browser AND container provided

      if (this.config.isBrowser && options.rootElement) {
        // 5. Initialize Event System (browser only)
        this.eventSystem = new EventSystem(this.engine);
        this.eventSystem.initialize(options.rootElement);
        this.engine.eventSystem = this.eventSystem;

        if (this.config.debugMode) {
          console.log('[FlutterJS] ✓ Event System initialized');
        }

        // 6. Initialize Gesture Recognizer (browser only)
        this.gestureRecognizer = new GestureManager();
        this.engine.gestureRecognizer = this.gestureRecognizer;

        if (this.config.debugMode) {
          console.log('[FlutterJS] ✓ Gesture Recognizer initialized');
        }

        // 7. Initialize Focus Manager (browser only - requires document)
        try {
          this.focusManager = new FocusManager(this.engine);
          this.focusManager.setupKeyboardNavigation();
          this.engine.focusManager = this.focusManager;

          if (this.config.debugMode) {
            console.log('[FlutterJS] ✓ Focus Manager initialized');
          }
        } catch (error) {
          console.warn('[FlutterJS] ⚠ Could not initialize Focus Manager:', error.message);
          // Continue without focus manager
        }
      } else if (this.config.debugMode && !this.config.isBrowser) {
        console.log('[FlutterJS] Skipping browser-only subsystems (server-side rendering)');
      }

      // 8. Setup performance monitoring
      if (this.config.enablePerformanceMonitoring && this.config.isBrowser) {
        this.setupPerformanceMonitoring();
      }

      this.initialized = true;
      this.stats.initTime = performance.now() - startTime;

      this.runHooks('afterInit');

      if (this.config.debugMode) {
        console.log(
          `[FlutterJS] ✓ Runtime initialized in ${this.stats.initTime.toFixed(2)}ms`
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
      return {
        primaryColor: '#6750a4',
        backgroundColor: '#ffffff',
        textColor: '#1c1b1f'
      };
    });

    // MediaQuery service
    this.serviceRegistry.registerLazy('mediaQuery', () => {
      if (this.config.isBrowser) {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        };
      }
      // Server-side defaults
      return {
        width: 1920,
        height: 1080,
        devicePixelRatio: 1
      };
    });

    // Logger service
    this.serviceRegistry.register('logger', {
      level: this.config.debugMode ? 'debug' : 'warn',
      log: (msg) => console.log(msg),
      warn: (msg) => console.warn(msg),
      error: (msg) => console.error(msg)
    });

    // Navigator service
    if (this.config.routing) {
      this.serviceRegistry.registerLazy('navigator', () => {
        return {
          push: (route) => {
            if (this.config.isBrowser && window.location) {
              window.location.hash = route;
            } else {
              console.log(`Navigate to: ${route}`);
            }
          },
          pop: () => console.log('Navigate back'),
          replace: (route) => console.log(`Replace with: ${route}`)
        };
      });
    }

    // Analytics service
    if (this.config.analytics) {
      this.serviceRegistry.registerLazy('analytics', () => {
        return {
          trackEvent: (event, data) => console.log(`Analytics: ${event}`, data),
          trackError: (source, error) => console.error(`Error: ${source}`, error)
        };
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
   */
  runApp(rootWidget, containerElement = null) {
    if (!rootWidget) {
      throw new Error('[FlutterJS] Root widget is required');
    }

    // Only run in browser
    if (!this.config.isBrowser) {
      console.warn('[FlutterJS] runApp() requires browser environment');
      return this;
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
          `[FlutterJS] ✓ Application mounted in ${this.stats.mountTime.toFixed(2)}ms`
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
   * Hot reload (browser only)
   */
  hotReload(newRootWidget) {
    if (!this.config.enableHotReload) {
      console.warn('[FlutterJS] Hot reload is disabled');
      return this;
    }

    if (!this.config.isBrowser) {
      console.warn('[FlutterJS] Hot reload requires browser environment');
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
        console.log(`[FlutterJS] ✓ Hot reload completed in ${reloadTime.toFixed(2)}ms`);
      }

      return this;
    } catch (error) {
      this.handleError('hotReload', error);
      throw error;
    }
  }

  /**
   * Unmount application
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
        console.log('[FlutterJS] ✓ Application unmounted');
      }

      return this;
    } catch (error) {
      this.handleError('unmount', error);
      throw error;
    }
  }

  /**
   * Dispose runtime
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
    if (!this.config.isBrowser) {
      return; // Skip in server environment
    }

    window.addEventListener('error', (event) => {
      this.handleError('global', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('promise', event.reason);
    });
  }

  /**
   * Handle error
   */
  handleError(source, error) {
    console.error(`[FlutterJS] Error in ${source}:`, error);

    this.errorHandlers.forEach(handler => {
      try {
        handler(source, error);
      } catch (handlerError) {
        console.error('[FlutterJS] Error in error handler:', handlerError);
      }
    });

    if (this.config.analytics) {
      const analytics = this.serviceRegistry?.get('analytics');
      if (analytics) {
        analytics.trackError(source, error);
      }
    }
  }

  /**
   * Register error handler
   */
  onError(handler) {
    if (typeof handler === 'function') {
      this.errorHandlers.push(handler);
    }
    return this;
  }

  /**
   * Setup performance monitoring (browser only)
   */
  setupPerformanceMonitoring() {
    if (!this.config.isBrowser) return;

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

      if (frameTime > 16.67 && this.config.debugMode) {
        console.warn(
          `[FlutterJS] Slow frame detected: ${frameTime.toFixed(2)}ms (target: 16.67ms for 60 FPS)`
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

    if (this.config.debugMode) {
      setInterval(() => {
        if (this.mounted) {
          this.logStats();
        }
      }, 10000);
    }
  }

  /**
   * Register lifecycle hook
   */
  on(hookName, callback) {
    if (this.hooks[hookName] && typeof callback === 'function') {
      this.hooks[hookName].push(callback);
    }
    return this;
  }

  /**
   * Run lifecycle hooks
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
   */
  getStats() {
    const stats = {
      ...this.stats,
      initialized: this.initialized,
      mounted: this.mounted,
      environment: this.config.isBrowser ? 'browser' : 'server'
    };

    if (this.engine) {
      stats.engine = this.engine.getStats?.() || {};
    }

    if (this.eventSystem) {
      stats.events = this.eventSystem.getStats?.() || {};
    }

    if (this.memoryManager) {
      stats.memory = this.memoryManager.getStats?.() || {};
    }

    if (this.stateManager) {
      stats.state = this.stateManager.getStats?.() || {};
    }

    return stats;
  }

  /**
   * Log statistics
   */
  logStats() {
    if (!this.config.debugMode) return;

    const stats = this.getStats();

    console.group('[FlutterJS] Runtime Statistics');
    console.log('Environment:', stats.environment);
    console.log('Initialization Time:', `${stats.initTime.toFixed(2)}ms`);
    console.log('Mount Time:', `${stats.mountTime.toFixed(2)}ms`);
    console.log('Total Frames:', stats.totalFrames);
    console.groupEnd();
  }

  /**
   * Get runtime configuration
   */
  getConfig() {
    return { ...this.config };
  }

  isInitialized() {
    return this.initialized;
  }

  isMounted() {
    return this.mounted;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

let _runtimeInstance = null;

function runApp(rootWidget, container = null) {
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

function hotReload(newRootWidget) {
  if (!_runtimeInstance) {
    console.warn('[FlutterJS] No runtime instance found');
    return;
  }

  _runtimeInstance.hotReload(newRootWidget);
}

function getRuntime() {
  return _runtimeInstance;
}

function dispose() {
  if (_runtimeInstance) {
    _runtimeInstance.dispose();
    _runtimeInstance = null;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FlutterJSRuntime,
    runApp,
    hotReload,
    getRuntime,
    dispose,
    isBrowser
  };
}

export {
  FlutterJSRuntime,
  runApp,
  hotReload,
  getRuntime,
  dispose,
  isBrowser
};