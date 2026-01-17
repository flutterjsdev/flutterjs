/**
 * FlutterJS Gesture Recognizer System
 * 
 * Handles complex gestures like tap, long-press, swipe, pinch, and pan.
 * Provides Flutter-style gesture recognition for touch and mouse interactions.
 * 
 * Key Features:
 * - Multi-touch support
 * - Gesture conflict resolution
 * - Customizable thresholds
 * - Performance optimized
 * - Memory efficient cleanup
 */

/**
 * Base Gesture Recognizer
 * 
 * Abstract class that all specific recognizers extend
 */
class GestureRecognizer {
  constructor(callback, options = {}) {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Gesture recognizer requires a callback function');
    }

    this.callback = callback;
    this.options = options;
    this.state = 'ready'; // ready, possible, recognized, failed
    this.disposed = false;
  }

  /**
   * Handle pointer/touch event
   * Subclasses must implement this
   */
  handleEvent(eventType, event) {
    throw new Error('handleEvent() must be implemented by subclass');
  }

  /**
   * Reset recognizer state
   */
  reset() {
    this.state = 'ready';
  }

  /**
   * Mark gesture as recognized
   */
  recognize(event) {
    if (this.disposed) return;

    // Remove the state === 'recognized' check - allow calling recognize multiple times
    this.state = 'recognized';

    try {
      this.callback(event);
    } catch (error) {
      console.error('[GestureRecognizer] Callback error:', error);
    }
  }

  /**
   * Mark gesture as failed
   */
  fail() {
    this.state = 'failed';
  }

  /**
   * Cleanup and dispose
   */
  dispose() {
    this.disposed = true;
    this.callback = null;
    this.options = null;
    this.state = 'ready';
  }

  /**
   * Check if disposed
   */
  get isDisposed() {
    return this.disposed;
  }
}

/**
 * Tap Gesture Recognizer
 * 
 * Detects simple tap/click gestures
 */
class TapRecognizer extends GestureRecognizer {
  constructor(callback, options = {}) {
    super(callback, options);

    // Configuration
    this.maxDuration = options.maxDuration || 300; // ms
    this.maxMovement = options.maxMovement || 10; // px
    this.minTaps = options.minTaps || 1;
    this.maxTaps = options.maxTaps || 1;

    // State
    this.startTime = null;
    this.startX = null;
    this.startY = null;
    this.tapCount = 0;
    this.lastTapTime = 0;
    this.tapTimeout = null;
  }

  handleEvent(eventType, event) {
    if (this.disposed) return;

    switch (eventType) {
      case 'pointerdown':
      case 'mousedown':
      case 'touchstart':
        this.handleDown(event);
        break;

      case 'pointermove':
      case 'mousemove':
      case 'touchmove':
        this.handleMove(event);
        break;

      case 'pointerup':
      case 'mouseup':
      case 'touchend':
        this.handleUp(event);
        break;

      case 'pointercancel':
      case 'touchcancel':
        this.handleCancel();
        break;
    }
  }

  handleDown(event) {
    this.state = 'possible';
    this.startTime = Date.now();
    this.startX = this.getX(event);
    this.startY = this.getY(event);
  }

  handleMove(event) {
    if (this.state !== 'possible') return;

    const x = this.getX(event);
    const y = this.getY(event);

    const dx = Math.abs(x - this.startX);
    const dy = Math.abs(y - this.startY);
    const movement = Math.sqrt(dx * dx + dy * dy);

    // Too much movement - fail
    if (movement > this.maxMovement) {
      this.fail();
    }
  }

  handleUp(event) {
    if (this.state !== 'possible') return;

    const duration = Date.now() - this.startTime;
    const x = this.getX(event);
    const y = this.getY(event);

    const dx = Math.abs(x - this.startX);
    const dy = Math.abs(y - this.startY);
    const movement = Math.sqrt(dx * dx + dy * dy);

    // Check if valid tap
    if (duration <= this.maxDuration && movement <= this.maxMovement) {
      this.handleTap(event);
    } else {
      this.fail();
    }

    this.reset();
  }

  handleTap(event) {
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTapTime;

    // Check if double/triple tap
    if (timeSinceLastTap < 300) {
      this.tapCount++;
    } else {
      this.tapCount = 1;
    }

    this.lastTapTime = now;

    // Clear previous timeout
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }

    // If we've reached max taps, recognize immediately
    if (this.tapCount >= this.maxTaps) {
      this.recognize({
        type: 'tap',
        tapCount: this.tapCount,
        position: { x: this.startX, y: this.startY },
        nativeEvent: event
      });
      this.tapCount = 0;
    }
    // Otherwise wait for potential additional taps
    else if (this.tapCount >= this.minTaps) {
      this.tapTimeout = setTimeout(() => {
        this.recognize({
          type: 'tap',
          tapCount: this.tapCount,
          position: { x: this.startX, y: this.startY },
          nativeEvent: event
        });
        this.tapCount = 0;
      }, 300);
    }
  }

  handleCancel() {
    this.fail();
    // Don't call reset() here - it overwrites the 'failed' state
  }
  getX(event) {
    if (event.clientX !== undefined && event.clientX !== 0) {
      return event.clientX;
    }
    if (event.touches && event.touches.length > 0) {
      return event.touches[0].clientX;
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      return event.changedTouches[0].clientX;
    }
    return 0;
  }

  getY(event) {
    if (event.clientY !== undefined && event.clientY !== 0) {
      return event.clientY;
    }
    if (event.touches && event.touches.length > 0) {
      return event.touches[0].clientY;
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      return event.changedTouches[0].clientY;
    }
    return 0;
  }

  dispose() {
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
      this.tapTimeout = null;
    }
    super.dispose();
  }
}

/**
 * Long Press Gesture Recognizer
 * 
 * Detects long press / hold gestures
 */
class LongPressRecognizer extends GestureRecognizer {
  constructor(callback, options = {}) {
    super(callback, options);

    // Configuration
    this.duration = options.duration || 500; // ms
    this.maxMovement = options.maxMovement || 10; // px

    // State
    this.timer = null;
    this.startX = null;
    this.startY = null;
    this.recognized = false;
  }

  handleEvent(eventType, event) {
    if (this.disposed) return;

    switch (eventType) {
      case 'pointerdown':
      case 'mousedown':
      case 'touchstart':
        this.handleDown(event);
        break;

      case 'pointermove':
      case 'mousemove':
      case 'touchmove':
        this.handleMove(event);
        break;

      case 'pointerup':
      case 'mouseup':
      case 'touchend':
      case 'pointercancel':
      case 'touchcancel':
        this.handleEnd(event);
        break;
    }
  }

  handleDown(event) {
    this.state = 'possible';
    this.startX = this.getX(event);
    this.startY = this.getY(event);
    this.recognized = false;

    // Start timer
    this.timer = setTimeout(() => {
      if (this.state === 'possible') {
        this.recognized = true;
        this.recognize({
          type: 'longpress',
          position: { x: this.startX, y: this.startY },
          nativeEvent: event
        });
      }
      this.timer = null;
    }, this.duration);
  }

  handleMove(event) {
    if (this.state !== 'possible' || this.recognized) return;

    const x = this.getX(event);
    const y = this.getY(event);

    const dx = Math.abs(x - this.startX);
    const dy = Math.abs(y - this.startY);
    const movement = Math.sqrt(dx * dx + dy * dy);

    // Too much movement - cancel
    if (movement > this.maxMovement) {
      this.cancel();
    }
  }

  handleEnd(event) {
    this.cancel();
    this.reset();
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.fail();
  }

  getX(event) {
    return event.clientX || event.touches?.[0]?.clientX || 0;
  }

  getY(event) {
    return event.clientY || event.touches?.[0]?.clientY || 0;
  }

  dispose() {
    this.cancel();
    super.dispose();
  }
}

/**
 * Swipe Gesture Recognizer
 * 
 * Detects directional swipe gestures
 */
class SwipeRecognizer extends GestureRecognizer {
  constructor(callback, options = {}) {
    super(callback, options);

    // Configuration
    this.minDistance = options.minDistance || 50; // px
    this.maxDuration = options.maxDuration || 300; // ms
    this.direction = options.direction || null; // 'horizontal', 'vertical', null (any)

    // State
    this.startTime = null;
    this.startX = null;
    this.startY = null;
  }

  handleEvent(eventType, event) {
    if (this.disposed) return;

    switch (eventType) {
      case 'pointerdown':
      case 'mousedown':
      case 'touchstart':
        this.handleDown(event);
        break;

      case 'pointerup':
      case 'mouseup':
      case 'touchend':
        this.handleUp(event);
        break;

      case 'pointercancel':
      case 'touchcancel':
        this.handleCancel();
        break;
    }
  }

  handleDown(event) {
    this.state = 'possible';
    this.startTime = Date.now();
    this.startX = this.getX(event);
    this.startY = this.getY(event);
  }

  handleUp(event) {
    if (this.state !== 'possible') return;

    const duration = Date.now() - this.startTime;
    const endX = this.getX(event);
    const endY = this.getY(event);

    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if valid swipe
    if (duration <= this.maxDuration && distance >= this.minDistance) {
      const swipeDirection = this.getDirection(dx, dy);

      // Check direction constraint
      if (this.direction === 'horizontal' &&
        (swipeDirection === 'up' || swipeDirection === 'down')) {
        this.fail();
        this.reset();
        return;
      }

      if (this.direction === 'vertical' &&
        (swipeDirection === 'left' || swipeDirection === 'right')) {
        this.fail();
        this.reset();
        return;
      }

      this.recognize({
        type: 'swipe',
        direction: swipeDirection,
        distance: distance,
        velocity: distance / duration, // px/ms
        delta: { dx, dy },
        start: { x: this.startX, y: this.startY },
        end: { x: endX, y: endY },
        nativeEvent: event
      });
    } else {
      this.fail();
    }

    this.reset();
  }

  handleCancel() {
    this.fail();
    this.reset();
  }

  getDirection(dx, dy) {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Determine primary direction
    if (angle >= -45 && angle < 45) return 'right';
    if (angle >= 45 && angle < 135) return 'down';
    if (angle >= -135 && angle < -45) return 'up';
    return 'left';
  }

  getX(event) {
    if (event.clientX !== undefined && event.clientX !== 0) {
      return event.clientX;
    }
    if (event.touches && event.touches.length > 0) {
      return event.touches[0].clientX;
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      return event.changedTouches[0].clientX;
    }
    return 0;
  }

  getY(event) {
    if (event.clientY !== undefined && event.clientY !== 0) {
      return event.clientY;
    }
    if (event.touches && event.touches.length > 0) {
      return event.touches[0].clientY;
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
      return event.changedTouches[0].clientY;
    }
    return 0;
  }
}

/**
 * Pan Gesture Recognizer
 * 
 * Detects continuous drag/pan gestures
 */
class PanRecognizer extends GestureRecognizer {
  constructor(callback, options = {}) {
    super(callback, options);

    // Configuration
    this.minDistance = options.minDistance || 10; // px to start
    this.direction = options.direction || null; // 'horizontal', 'vertical', null

    // State
    this.startX = null;
    this.startY = null;
    this.lastX = null;
    this.lastY = null;
    this.isPanning = false;

    // Callbacks
    this.onStart = options.onStart || null;
    this.onUpdate = options.onUpdate || null;
    this.onEnd = options.onEnd || null;
  }

  handleEvent(eventType, event) {
    if (this.disposed) return;

    switch (eventType) {
      case 'pointerdown':
      case 'mousedown':
      case 'touchstart':
        this.handleDown(event);
        break;

      case 'pointermove':
      case 'mousemove':
      case 'touchmove':
        this.handleMove(event);
        break;

      case 'pointerup':
      case 'mouseup':
      case 'touchend':
        this.handleUp(event);
        break;

      case 'pointercancel':
      case 'touchcancel':
        this.handleCancel();
        break;
    }
  }

  handleDown(event) {
    this.state = 'possible';
    this.startX = this.getX(event);
    this.startY = this.getY(event);
    this.lastX = this.startX;
    this.lastY = this.startY;
    this.isPanning = false;
  }

  handleMove(event) {
    if (this.state === 'failed') return;

    const x = this.getX(event);
    const y = this.getY(event);

    const dx = x - this.startX;
    const dy = y - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if pan started
    if (!this.isPanning && distance >= this.minDistance) {
      // Check direction constraint
      if (this.direction === 'horizontal' && Math.abs(dy) > Math.abs(dx)) {
        this.fail();
        return;
      }

      if (this.direction === 'vertical' && Math.abs(dx) > Math.abs(dy)) {
        this.fail();
        return;
      }

      this.isPanning = true;
      this.state = 'recognized';

      // Call onStart
      if (this.onStart) {
        try {
          this.onStart({
            type: 'panstart',
            position: { x, y },
            nativeEvent: event
          });
        } catch (error) {
          console.error('[PanRecognizer] onStart error:', error);
        }
      }
    }

    // Update during pan
    if (this.isPanning) {
      const deltaX = x - this.lastX;
      const deltaY = y - this.lastY;

      this.lastX = x;
      this.lastY = y;

      // Call onUpdate
      if (this.onUpdate) {
        try {
          this.onUpdate({
            type: 'panupdate',
            position: { x, y },
            delta: { dx: deltaX, dy: deltaY },
            totalDelta: { dx, dy },
            nativeEvent: event
          });
        } catch (error) {
          console.error('[PanRecognizer] onUpdate error:', error);
        }
      }
    }
  }

  handleUp(event) {
    if (this.isPanning) {
      const x = this.getX(event);
      const y = this.getY(event);

      const dx = x - this.startX;
      const dy = y - this.startY;

      // Call onEnd first
      if (this.onEnd) {
        try {
          this.onEnd({
            type: 'panend',
            position: { x, y },
            totalDelta: { dx, dy },
            nativeEvent: event
          });
        } catch (error) {
          console.error('[PanRecognizer] onEnd error:', error);
        }
      }

      // Then call main callback via recognize()
      this.recognize({
        type: 'pan',
        start: { x: this.startX, y: this.startY },
        end: { x, y },
        delta: { dx, dy },
        nativeEvent: event
      });
    }

    this.reset();
    this.isPanning = false;
  }
  handleCancel() {
    if (this.isPanning && this.onEnd) {
      try {
        this.onEnd({
          type: 'pancancel',
          position: { x: this.lastX, y: this.lastY }
        });
      } catch (error) {
        console.error('[PanRecognizer] onEnd (cancel) error:', error);
      }
    }

    this.fail();
    this.reset();
    this.isPanning = false;
  }

  getX(event) {
    return event.clientX || event.touches?.[0]?.clientX || 0;
  }

  getY(event) {
    return event.clientY || event.touches?.[0]?.clientY || 0;
  }
}

/**
 * Scale (Pinch) Gesture Recognizer
 * 
 * Detects pinch-to-zoom gestures (two-finger)
 */
class ScaleRecognizer extends GestureRecognizer {
  constructor(callback, options = {}) {
    super(callback, options);

    // Configuration
    this.minScale = options.minScale || 0.5;
    this.maxScale = options.maxScale || 2.0;

    // State
    this.initialDistance = null;
    this.currentDistance = null;
    this.isScaling = false;

    // Callbacks
    this.onStart = options.onStart || null;
    this.onUpdate = options.onUpdate || null;
    this.onEnd = options.onEnd || null;
  }

  handleEvent(eventType, event) {
    if (this.disposed) return;

    // Only handle touch events (requires 2 touches)
    if (!event.touches || event.touches.length < 2) {
      if (this.isScaling) {
        this.handleEnd(event);
      }
      return;
    }

    switch (eventType) {
      case 'touchstart':
        this.handleStart(event);
        break;

      case 'touchmove':
        this.handleMove(event);
        break;

      case 'touchend':
      case 'touchcancel':
        this.handleEnd(event);
        break;
    }
  }

  handleStart(event) {
    if (event.touches.length !== 2) return;

    this.state = 'possible';
    this.initialDistance = this.getDistance(event.touches[0], event.touches[1]);
    this.currentDistance = this.initialDistance;
    this.isScaling = true;

    // Call onStart
    if (this.onStart) {
      try {
        this.onStart({
          type: 'scalestart',
          scale: 1.0,
          nativeEvent: event
        });
      } catch (error) {
        console.error('[ScaleRecognizer] onStart error:', error);
      }
    }
  }

  handleMove(event) {
    if (!this.isScaling || event.touches.length !== 2) return;

    this.state = 'recognized';

    const distance = this.getDistance(event.touches[0], event.touches[1]);
    this.currentDistance = distance;

    const scale = distance / this.initialDistance;

    // Clamp scale
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, scale));

    // Call onUpdate
    if (this.onUpdate) {
      try {
        this.onUpdate({
          type: 'scaleupdate',
          scale: clampedScale,
          rawScale: scale,
          nativeEvent: event
        });
      } catch (error) {
        console.error('[ScaleRecognizer] onUpdate error:', error);
      }
    }
  }
  handleEnd(event) {
    if (!this.isScaling) return;

    const scale = this.currentDistance / this.initialDistance;
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, scale));

    // Call onEnd first
    if (this.onEnd) {
      try {
        this.onEnd({
          type: 'scaleend',
          scale: clampedScale,
          rawScale: scale,
          nativeEvent: event
        });
      } catch (error) {
        console.error('[ScaleRecognizer] onEnd error:', error);
      }
    }

    // Then call main callback via recognize()
    this.recognize({
      type: 'scale',
      scale: clampedScale,
      rawScale: scale,
      nativeEvent: event
    });

    this.reset();
    this.isScaling = false;
    this.initialDistance = null;
    this.currentDistance = null;
  }

  getDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Double Tap Gesture Recognizer
 * 
 * Specialized TapRecognizer for double taps
 */
class DoubleTapRecognizer extends TapRecognizer {
  constructor(callback, options = {}) {
    super(callback, {
      ...options,
      minTaps: 2,
      maxTaps: 2
    });
  }
}

/**
 * Vertical Drag Gesture Recognizer
 * 
 * Specialized PanRecognizer for vertical drags
 */
class VerticalDragRecognizer extends PanRecognizer {
  constructor(callback, options = {}) {
    super(callback, {
      ...options,
      direction: 'vertical'
    });
  }
}

/**
 * Horizontal Drag Gesture Recognizer
 * 
 * Specialized PanRecognizer for horizontal drags
 */
class HorizontalDragRecognizer extends PanRecognizer {
  constructor(callback, options = {}) {
    super(callback, {
      ...options,
      direction: 'horizontal'
    });
  }
}

/**
 * Gesture Arena
 * 
 * Manages multiple gesture recognizers and resolves conflicts
 */
class GestureArena {
  constructor() {
    this.recognizers = new Map(); // elementId -> recognizer[]
  }

  /**
   * Register recognizer for element
   */
  register(elementId, recognizer) {
    if (!this.recognizers.has(elementId)) {
      this.recognizers.set(elementId, []);
    }

    this.recognizers.get(elementId).push(recognizer);
  }

  /**
   * Unregister all recognizers for element
   */
  unregister(elementId) {
    const recognizers = this.recognizers.get(elementId);
    if (recognizers) {
      recognizers.forEach(r => r.dispose());
      this.recognizers.delete(elementId);
    }
  }

  /**
   * Handle event for element
   */
  handleEvent(elementId, eventType, event) {
    const recognizers = this.recognizers.get(elementId);
    if (!recognizers) return;

    // Pass event to all active recognizers
    recognizers.forEach(recognizer => {
      if (!recognizer.isDisposed && recognizer.state !== 'failed') {
        recognizer.handleEvent(eventType, event);
      }
    });
  }

  /**
   * Get recognizers for element
   */
  getRecognizers(elementId) {
    return this.recognizers.get(elementId) || [];
  }

  /**
   * Clear all recognizers
   */
  clear() {
    this.recognizers.forEach((recognizers) => {
      recognizers.forEach(r => r.dispose());
    });
    this.recognizers.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalRecognizers = 0;
    this.recognizers.forEach(recognizers => {
      totalRecognizers += recognizers.length;
    });

    return {
      elements: this.recognizers.size,
      totalRecognizers: totalRecognizers
    };
  }
}

/**
 * Main Gesture Manager
 * 
 * Central system for managing all gestures in the application
 */
class GestureManager {
  constructor() {
    this.arena = new GestureArena();
  }

  /**
   * Register tap gesture
   */
  registerTap(elementId, callback, options = {}) {
    const recognizer = new TapRecognizer(callback, options);
    this.arena.register(elementId, recognizer);
    return recognizer;
  }

  /**
   * Register double tap gesture
   */
  registerDoubleTap(elementId, callback, options = {}) {
    const recognizer = new TapRecognizer(callback, {
      ...options,
      minTaps: 2,
      maxTaps: 2
    });
    this.arena.register(elementId, recognizer);
    return recognizer;
  }

  /**
   * Register long press gesture
   */
  registerLongPress(elementId, callback, options = {}) {
    const recognizer = new LongPressRecognizer(callback, options);
    this.arena.register(elementId, recognizer);
    return recognizer;
  }

  /**
   * Register swipe gesture
   */
  registerSwipe(elementId, callback, options = {}) {
    const recognizer = new SwipeRecognizer(callback, options);
    this.arena.register(elementId, recognizer);
    return recognizer;
  }

  /**
   * Register pan gesture
   */
  registerPan(elementId, callback, options = {}) {
    const recognizer = new PanRecognizer(callback, options);
    this.arena.register(elementId, recognizer);
    return recognizer;
  }

  /**
   * Register scale (pinch) gesture
   */
  registerScale(elementId, callback, options = {}) {
    const recognizer = new ScaleRecognizer(callback, options);
    this.arena.register(elementId, recognizer);
    return recognizer;
  }

  /**
   * Handle pointer/touch event
   */
  handleEvent(elementId, eventType, event) {
    this.arena.handleEvent(elementId, eventType, event);
  }

  /**
   * Unregister all gestures for element
   */
  unregisterAll(elementId) {
    this.arena.unregister(elementId);
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.arena.getStats();
  }

  /**
   * Cleanup
   */
  dispose() {
    this.arena.clear();
  }
}

export {
  GestureRecognizer,
  DoubleTapRecognizer,
  VerticalDragRecognizer,
  HorizontalDragRecognizer,
  TapRecognizer,
  LongPressRecognizer,
  SwipeRecognizer,
  PanRecognizer,
  ScaleRecognizer,
  GestureArena,
  GestureManager
};