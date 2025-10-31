// ============================================================================
// FLUTTER.JS APP RUNNER
// Main entry point that orchestrates the entire framework
// Similar to runApp() in Flutter
// ============================================================================

import { VNodeRenderer } from './vnode_renderer.js';
import { VNodeDiffer, PatchType } from './vnode_differ.js';
import { FrameworkScheduler } from './scheduler.js';

class FlutterApp {
  /**
   * Create a new Flutter.js application
   *
   * Usage:
   * const app = new FlutterApp(MyRootWidget, document.getElementById('app'));
   * app.run();
   */
  constructor(rootWidget, targetElement, options = {}) {
    if (!rootWidget) {
      throw new Error('FlutterApp requires a root widget');
    }

    if (!targetElement) {
      throw new Error('FlutterApp requires a target DOM element');
    }

    this.rootWidget = rootWidget;
    this.targetElement = targetElement;
    this.buildOwner = new BuildOwner();
    this.rootElement.buildOwner = this.buildOwner;

    // Configuration
    this.options = {
      debugMode: false,
      enableMetrics: true,
      enableHotReload: false,
      maxFrameTime: 16.67,
      ...options
    };

    // Framework state
    this.rootElement = null;
    this.currentVNode = null;
    this.domRoot = null;
    this.isRunning = false;
    this._frameCount = 0;
    this._updateScheduled = false;

    // Metrics
    this.metrics = {
      totalRenderTime: 0,
      totalDiffTime: 0,
      totalPatchTime: 0,
      renderCycles: 0,
      averageRenderTime: 0
    };
  }

  /**
   * Start the application
   * This initializes the widget tree and begins the render loop
   */
  async run() {
    if (this.isRunning) {
      console.warn('Application is already running');
      return;
    }

    try {
      console.log('🚀 FlutterJS Application Starting...');

      this.isRunning = true;

      // Enable debug mode if requested
      if (this.options.debugMode) {
        FrameworkScheduler.setDebugMode(true);
        console.log('🔧 Debug mode enabled');
      }

      // Create root element
      this._createRootElement();

      // Initial render
      await this._renderFrame();

      // Start frame scheduler
      this._scheduleNextFrame();

      console.log('✅ FlutterJS Application Running');
    } catch (error) {
      this.isRunning = false;
      console.error('❌ Failed to start FlutterJS application:', error);
      throw error;
    }
  }

  /**
   * Create the root element from the root widget
   */
  _createRootElement() {
    this.rootElement = this.rootWidget.createElement();
    this.rootElement.mount(null);

    if (this.options.debugMode) {
      const path = this.rootElement.getWidgetPath();
      console.log(`📦 Root Element: ${path}`);
    }
  }

  /**
   * Perform a full render cycle
   * 1. Build VNode tree from widgets
   * 2. Diff with previous VNode tree
   * 3. Apply patches to DOM
   */
  async _renderFrame() {
    const cycleStart = performance.now();

    try {

      this.buildOwner._processDirtyElements();
      
      // ========== STEP 1: BUILD ==========
      const buildStart = performance.now();

      // Mark build phase
      this.rootElement.context._markBuildStart();

      // Call build() on root element to get VNode tree
      const newVNode = this.rootElement.performRebuild();

      // Mark build phase end
      this.rootElement.context._markBuildEnd();

      const buildTime = performance.now() - buildStart;

      // ========== STEP 2: DIFF ==========
      const diffStart = performance.now();

      let patches = [];
      if (this.currentVNode) {
        // Compare old vs new VNode trees
        patches = VNodeDiffer.diff(this.currentVNode, newVNode, 0);

        if (this.options.debugMode && patches.length > 0) {
          const stats = VNodeDiffer.getStats(patches);
          console.log('📊 Diff stats:', stats);
        }
      }

      const diffTime = performance.now() - diffStart;

      // ========== STEP 3: PATCH & RENDER ==========
      const patchStart = performance.now();

      if (!this.currentVNode) {
        // First render - create DOM from scratch
        this.domRoot = VNodeRenderer.render(newVNode, this.targetElement);
      } else if (patches.length > 0) {
        // Subsequent render - apply patches
        VNodeDiffer.applyPatches(this.domRoot, patches);
      }

      const patchTime = performance.now() - patchStart;

      // Update current VNode
      this.currentVNode = newVNode;

      // ========== METRICS ==========
      const cycleTime = performance.now() - cycleStart;

      this.metrics.totalRenderTime += buildTime;
      this.metrics.totalDiffTime += diffTime;
      this.metrics.totalPatchTime += patchTime;
      this.metrics.renderCycles++;
      this.metrics.averageRenderTime =
        this.metrics.totalRenderTime / this.metrics.renderCycles;

      if (this.options.debugMode) {
        console.log(
          `⏱️  Render cycle: ${cycleTime.toFixed(2)}ms ` +
          `(build: ${buildTime.toFixed(2)}ms, diff: ${diffTime.toFixed(2)}ms, patch: ${patchTime.toFixed(2)}ms)`
        );
      }

      if (cycleTime > this.options.maxFrameTime) {
        console.warn(
          `⚠️  Slow frame detected: ${cycleTime.toFixed(2)}ms ` +
          `(target: ${this.options.maxFrameTime}ms)`
        );
      }
    } catch (error) {
      console.error('❌ Error during render cycle:', error);
      throw error;
    }
  }

  /**
   * Schedule the next frame update
   * Uses requestAnimationFrame for 60 FPS
   */
  _scheduleNextFrame() {
    if (!this.isRunning) {
      return;
    }

    if (this._updateScheduled) {
      return; // Already scheduled
    }

    this._updateScheduled = true;

    requestAnimationFrame(async () => {
      this._frameCount++;
      this._updateScheduled = false;

      // Check if there are pending updates
      if (FrameworkScheduler.hasPendingUpdates()) {
        try {
          // Process all pending updates (builds and layouts)
          FrameworkScheduler.flush();

          // Perform render cycle
          await this._renderFrame();
        } catch (error) {
          console.error('❌ Error during frame update:', error);
        }
      }

      // Schedule next frame
      this._scheduleNextFrame();
    });
  }

  /**
   * Force an immediate rebuild and render
   * Useful for testing or emergency updates
   */
  async forceRebuild() {
    if (!this.isRunning) {
      console.warn('Application is not running');
      return;
    }

    this.rootElement.markNeedsBuild();
    await this._renderFrame();
  }

  /**
   * Stop the application
   * Cleans up resources
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this._updateScheduled = false;

    if (this.rootElement) {
      this.rootElement.unmount();
      this.rootElement = null;
    }

    this.currentVNode = null;
    this.domRoot = null;

    console.log('🛑 FlutterJS Application Stopped');
  }

  /**
   * Get current application metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      frameCount: this._frameCount,
      schedulerMetrics: FrameworkScheduler.getMetrics()
    };
  }

  /**
   * Print metrics to console
   */
  printMetrics() {
    const metrics = this.getMetrics();

    console.group('📊 FlutterJS Application Metrics');
    console.log('Render Cycles:', metrics.renderCycles);
    console.log(
      'Average Render Time:',
      metrics.averageRenderTime.toFixed(2) + 'ms'
    );
    console.log('Total Render Time:', metrics.totalRenderTime.toFixed(2) + 'ms');
    console.log('Total Diff Time:', metrics.totalDiffTime.toFixed(2) + 'ms');
    console.log('Total Patch Time:', metrics.totalPatchTime.toFixed(2) + 'ms');
    console.log('Frame Count:', metrics.frameCount);
    console.groupEnd();

    console.group('🔧 Scheduler Metrics');
    console.table(metrics.schedulerMetrics);
    console.groupEnd();
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled) {
    this.options.debugMode = enabled;
    FrameworkScheduler.setDebugMode(enabled);
  }

  /**
   * Hot reload - Restart app without losing DOM
   * Useful for development
   */
  async hotReload() {
    if (!this.options.enableHotReload) {
      console.warn('Hot reload is not enabled');
      return;
    }

    console.log('🔄 Hot reloading...');
    this.stop();
    this.rootElement = null;
    this.currentVNode = null;
    await this.run();
  }
}

/**
 * Helper function to run a Flutter app (like Flutter's runApp())
 *
 * Usage:
 * runApp(MyAppWidget, document.getElementById('root'));
 */
function runApp(rootWidget, targetElement, options = {}) {
  const app = new FlutterApp(rootWidget, targetElement, options);
  app.run();
  return app;
}

export { FlutterApp, runApp };