import { StatefulWidget, State } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import {
  TapRecognizer,
  DoubleTapRecognizer,
  LongPressRecognizer,
  VerticalDragRecognizer,
  HorizontalDragRecognizer,
  SwipeRecognizer
} from '@flutterjs/runtime';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Defines how a hit test should behave.
 */
const HitTestBehavior = {
  deferToChild: 'deferToChild', // Child widgets handle hits, this widget defers.
  opaque: 'opaque',             // This widget blocks hits and handles them.
  translucent: 'translucent'    // This widget handles hits, but allows hits to pass through to widgets below.
};

// ============================================================================
// GESTURE DETECTOR WIDGET
// ============================================================================

/**
 * GestureDetector Widget
 * 
 * Wraps a child widget and detects various gestures
 * 
 * Works with both mouse and touch events
 */
class GestureDetector extends StatefulWidget {
  constructor({
    key = null,
    child = null,
    // Tap gestures
    onTap = null,
    onTapDown = null,
    onTapUp = null,
    onTapCancel = null,
    onDoubleTap = null,
    // Long press
    onLongPress = null,
    onLongPressStart = null,
    onLongPressMoveUpdate = null,
    onLongPressEnd = null,
    onLongPressUp = null,
    // Swipe
    onSwipe = null,
    onSwipeLeft = null,
    onSwipeRight = null,
    onSwipeUp = null,
    onSwipeDown = null,
    // Pan
    onPan = null,
    onPanStart = null,
    onPanUpdate = null,
    onPanEnd = null,
    // Scale/Pinch
    onScale = null,
    onScaleStart = null,
    onScaleUpdate = null,
    onScaleEnd = null,
    // Configuration
    behavior = HitTestBehavior.deferToChild,
    excludeFromSemantics = false
  } = {}) {
    super(key);

    this.child = child;

    // Tap callbacks
    this.onTap = onTap;
    this.onTapDown = onTapDown;
    this.onTapUp = onTapUp;
    this.onTapCancel = onTapCancel;
    this.onDoubleTap = onDoubleTap;

    // Long press callbacks
    this.onLongPress = onLongPress;
    this.onLongPressStart = onLongPressStart;
    this.onLongPressMoveUpdate = onLongPressMoveUpdate;
    this.onLongPressEnd = onLongPressEnd;
    this.onLongPressUp = onLongPressUp;

    // Swipe callbacks
    this.onSwipe = onSwipe;
    this.onSwipeLeft = onSwipeLeft;
    this.onSwipeRight = onSwipeRight;
    this.onSwipeUp = onSwipeUp;
    this.onSwipeDown = onSwipeDown;

    // Pan callbacks
    this.onPan = onPan;
    this.onPanStart = onPanStart;
    this.onPanUpdate = onPanUpdate;
    this.onPanEnd = onPanEnd;

    // Scale callbacks
    this.onScale = onScale;
    this.onScaleStart = onScaleStart;
    this.onScaleUpdate = onScaleUpdate;
    this.onScaleEnd = onScaleEnd;

    // Configuration
    this.behavior = behavior;
    this.excludeFromSemantics = excludeFromSemantics;
  }

  createState() {
    return new _GestureDetectorState();
  }
}

class _GestureDetectorState extends State {
  constructor() {
    super();
    this.recognizers = [];
  }

  dispose() {
    this._disposeRecognizers();
    super.dispose();
  }

  _disposeRecognizers() {
    this.recognizers.forEach(r => r.dispose());
    this.recognizers = [];
  }

  didUpdateWidget(oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Check if any recognizer is active (mid-gesture)
    // If so, preserve them to allow the gesture to complete.
    // They will be cleaned up on the next update or dispose.
    const hasActiveGestures = this.recognizers.some(r => r.state !== 'ready');
    // console.log(`[GestureDetector] didUpdateWidget. Active? ${hasActiveGestures}`);
    if (hasActiveGestures) {
      return;
    }

    // Re-initialize recognizers to pick up new callbacks (e.g. updated closures)
    // This is safe to do here as build/update typically happens between gestures, not during.
    // If a gesture is active during rebuild, it might be cancelled, which is standard Flutter behavior.
    this._disposeRecognizers();
  }

  /**
   * Initialize gesture recognizers
   */
  _initializeRecognizers(elementId) {
    // Only initialize if we don't have them
    if (this.recognizers.length > 0) {
      return;
    }

    const w = this.widget;
    // ... rest of init logic matches previous ...

    // Tap gesture
    if (w.onTap || w.onTapDown || w.onTapUp || w.onTapCancel) {
      const tapRecognizer = new TapRecognizer(
        (event) => {
          if (w.onTap) w.onTap(event);
          if (w.onTapUp) w.onTapUp(event);
          if (w.onTapCancel && event.type === 'tapcancel') w.onTapCancel(event);
        },
        { maxDuration: 300, maxMovement: 10 }
      );
      this.recognizers.push(tapRecognizer);
    }

    // Double tap gesture
    if (w.onDoubleTap) {
      const doubleTapRecognizer = new DoubleTapRecognizer({
        onDoubleTap: (event) => w.onDoubleTap(event)
      }, elementId);
      this.recognizers.push(doubleTapRecognizer);
    }

    // Long press gesture
    if (w.onLongPress || w.onLongPressStart || w.onLongPressEnd) {
      const longPressRecognizer = new LongPressRecognizer({
        onLongPress: (event) => { if (w.onLongPress) w.onLongPress(event); },
        onLongPressStart: (event) => { if (w.onLongPressStart) w.onLongPressStart(event); },
        onLongPressEnd: (event) => { if (w.onLongPressEnd) w.onLongPressEnd(event); },
        onLongPressUp: (event) => { if (w.onLongPressUp) w.onLongPressUp(event); }
      }, elementId);
      this.recognizers.push(longPressRecognizer);
    }

    // Swipe gesture
    if (w.onSwipe || w.onSwipeLeft || w.onSwipeRight || w.onSwipeUp || w.onSwipeDown) {
      const swipeRecognizer = new SwipeRecognizer(
        (event) => {
          if (w.onSwipe) w.onSwipe(event);
          if (event.direction === 'left' && w.onSwipeLeft) w.onSwipeLeft(event);
          if (event.direction === 'right' && w.onSwipeRight) w.onSwipeRight(event);
          if (event.direction === 'up' && w.onSwipeUp) w.onSwipeUp(event);
          if (event.direction === 'down' && w.onSwipeDown) w.onSwipeDown(event);
        },
        elementId
      );
      this.recognizers.push(swipeRecognizer);
    }

    // Pan gesture
    if (w.onPan || w.onPanStart || w.onPanUpdate || w.onPanEnd) {
      // Placeholder for PanRecognizer if not imported or implemented fully
      // Assuming Vertical/Horizontal exist from imports
      // For now, only vertical/horizontal logic or generic pan if available
    }

    if (w.onVerticalDragStart || w.onVerticalDragUpdate || w.onVerticalDragEnd) {
      this.recognizers.push(new VerticalDragRecognizer({
        onStart: w.onVerticalDragStart,
        onUpdate: w.onVerticalDragUpdate,
        onEnd: w.onVerticalDragEnd
      }, elementId));
    }

    if (w.onHorizontalDragStart || w.onHorizontalDragUpdate || w.onHorizontalDragEnd) {
      this.recognizers.push(new HorizontalDragRecognizer({
        onStart: w.onHorizontalDragStart,
        onUpdate: w.onHorizontalDragUpdate,
        onEnd: w.onHorizontalDragEnd
      }, elementId));
    }
  }

  _handleEvent(eventType, event, elementId) {
    // console.log(`[GestureDetector] Event: ${eventType} on ${elementId}`);

    // Deduplicate logic: Browsers fire pointer* then mouse* for compatibility.
    // If we handle pointer events, we should ignore the subsequent mouse events
    // to prevent double-recognition (double taps).
    if (eventType.startsWith('mouse') && window.PointerEvent && event.pointerType !== 'mouse') {
      // This logic is tricky. PointerEvent polyfill?
      // Better: simple Timestamp check.
    }

    // Simple state tracking for dedup
    if (!this._lastPointerTime) this._lastPointerTime = 0;

    if (eventType.startsWith('pointer')) {
      this._lastPointerTime = Date.now();
    } else if (eventType.startsWith('mouse')) {
      // If we saw a pointer event recently (< 500ms), ignore this mouse event
      // as it's likely a compatibility firing.
      if (Date.now() - this._lastPointerTime < 500) {
        return;
      }
    }

    // Initialize recognizers on interaction (lazy first load)
    this._initializeRecognizers(elementId);

    // Dispatch to all recognizers
    this.recognizers.forEach(r => {
      if (r.handleEvent) {
        r.handleEvent(eventType, event);
      }
    });
  }

  build(context) {
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    let childVNode = null;
    const child = this.widget.child;

    if (child) {
      if (context._childElement) {
        // Reconciliation: Check if we can reuse the existing element
        if (context._childElement.widget.constructor === child.constructor &&
          context._childElement.widget.key === child.key) {

          // Reuse existing element
          context._childElement.updateWidget(child);
          if (context._childElement.dirty) {
            context._childElement.rebuild();
          }
        } else {
          // Replace element
          context._childElement.unmount();
          // New element attached to context.element (the GestureDetector element)
          context._childElement = child.createElement(context.element, context.element.runtime);
          context._childElement.mount(context.element);
        }
      } else {
        // Initial create
        context._childElement = child.createElement(context.element, context.element.runtime);
        context._childElement.mount(context.element);
      }

      childVNode = context._childElement.performRebuild();
    }

    const behavior = this.widget.behavior;
    const containerStyle = {
      position: 'relative',
      userSelect: behavior === HitTestBehavior.opaque ? 'none' : 'auto',
      WebkitUserSelect: behavior === HitTestBehavior.opaque ? 'none' : 'auto',
      MozUserSelect: behavior === HitTestBehavior.opaque ? 'none' : 'auto',
      msUserSelect: behavior === HitTestBehavior.opaque ? 'none' : 'auto',
      touchAction: 'manipulation',
      cursor: (this.widget.onTap || this.widget.onDoubleTap) ? 'pointer' : 'auto',

      // Default styles for div
      width: 'auto',
      height: 'auto',

      // Allow pointer events
      pointerEvents: behavior === HitTestBehavior.translucent ? 'none' : 'auto'
      // Note: 'none' means clicks pass through, but we won't capture them unless bubbling?
      // For now, assume bubbling handles translucent.
      // But if we want to capture click on empty space of this widget, we need auto.
      // If we use 'auto', we block underneath.
      // Resetting to 'auto' for now to ensure functionality.
    };
    if (behavior === HitTestBehavior.translucent) {
      containerStyle.pointerEvents = 'auto'; // Force capture for now
    }

    const eventHandler = (type) => (e) => {
      if (this.widget.behavior === HitTestBehavior.opaque) {
        e.stopPropagation();
      }
      this._handleEvent(type, e, elementId);
    };

    return new VNode({
      tag: 'div',
      props: {
        style: containerStyle,
        'data-widget': 'GestureDetector',
        'data-element-id': elementId,
        'data-behavior': behavior,

        onClick: eventHandler('click'),
        onMouseDown: (e) => this._handleEvent('mousedown', e, elementId),
        onMouseUp: (e) => this._handleEvent('mouseup', e, elementId),
        onMouseMove: (e) => this._handleEvent('mousemove', e, elementId),
        onMouseLeave: eventHandler('mouseleave'),
        onTouchStart: (e) => this._handleEvent('touchstart', e, elementId),
        onTouchEnd: (e) => this._handleEvent('touchend', e, elementId),
        onTouchMove: (e) => this._handleEvent('touchmove', e, elementId),
        onTouchCancel: eventHandler('touchcancel'),
        onContextMenu: eventHandler('contextmenu')
      },
      children: childVNode ? [childVNode] : [],
      key: this.widget.key
    });
  }
}

export { GestureDetector, HitTestBehavior };