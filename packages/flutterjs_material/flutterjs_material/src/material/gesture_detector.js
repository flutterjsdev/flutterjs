import { Widget, StatelessWidget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import {
  TapRecognizer,
  LongPressRecognizer,
  SwipeRecognizer,
  PanRecognizer,
  ScaleRecognizer
} from '@flutterjs/runtime';

// ============================================================================
// GESTURE DETECTOR
// ============================================================================

/**
 * GestureDetector Widget
 * 
 * Wraps a child widget and detects various gestures
 * Supports: tap, double-tap, long-press, swipe, pan, scale
 * Works with both mouse and touch events
 */
class GestureDetector extends StatelessWidget {
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
    behavior = 'opaque',
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

    // Gesture recognizers
    this.recognizers = [];
    this._elementId = null;
  }

  /**
   * Build gesture detector with child
   */
  build(context) {
    this._elementId = context.element.getElementId();

    let childVNode = null;
    if (this.child) {
      const childElement = this.child.createElement?.(context.element, context.element.runtime) || this.child;
      if (childElement.mount) {
        childElement.mount(context.element);
      }
      childVNode = childElement.performRebuild?.() || null;
    }

    const containerStyle = {
      position: 'relative',
      userSelect: this.behavior === 'opaque' ? 'none' : 'auto',
      WebkitUserSelect: this.behavior === 'opaque' ? 'none' : 'auto',
      MozUserSelect: this.behavior === 'opaque' ? 'none' : 'auto',
      msUserSelect: this.behavior === 'opaque' ? 'none' : 'auto',
      touchAction: 'manipulation',
      cursor: 'pointer'
    };

    const elementId = this._elementId;

    return new VNode({
      tag: 'div',
      props: {
        style: containerStyle,
        'data-widget': 'GestureDetector',
        'data-element-id': elementId,
        onMouseDown: (e) => this._handleMouseDown(e, elementId),
        onMouseUp: (e) => this._handleMouseUp(e, elementId),
        onMouseMove: (e) => this._handleMouseMove(e, elementId),
        onMouseLeave: (e) => this._handleMouseLeave(e, elementId),
        onTouchStart: (e) => this._handleTouchStart(e, elementId),
        onTouchEnd: (e) => this._handleTouchEnd(e, elementId),
        onTouchMove: (e) => this._handleTouchMove(e, elementId),
        onTouchCancel: (e) => this._handleTouchCancel(e, elementId),
        onContextMenu: (e) => this._handleContextMenu(e, elementId)
      },
      children: childVNode ? [childVNode] : []
    });
  }

  /**
   * Initialize gesture recognizers on mount
   */
  _initializeRecognizers(elementId) {
    if (this.recognizers.length > 0) return; // Already initialized

    // Tap gesture
    if (this.onTap || this.onTapDown || this.onTapUp) {
      const tapRecognizer = new TapRecognizer(
        (event) => {
          if (this.onTap) this.onTap(event);
          if (this.onTapUp) this.onTapUp(event);
        },
        { maxDuration: 300, maxMovement: 10 }
      );
      this.recognizers.push(tapRecognizer);
    }

    // Double tap gesture
    if (this.onDoubleTap) {
      const doubleTapRecognizer = new TapRecognizer(
        (event) => {
          if (event.tapCount === 2) {
            this.onDoubleTap(event);
          }
        },
        { minTaps: 2, maxTaps: 2 }
      );
      this.recognizers.push(doubleTapRecognizer);
    }

    // Long press gesture
    if (this.onLongPress || this.onLongPressStart || this.onLongPressEnd) {
      const longPressRecognizer = new LongPressRecognizer(
        (event) => {
          if (this.onLongPress) this.onLongPress(event);
        },
        { duration: 500, maxMovement: 10 }
      );
      this.recognizers.push(longPressRecognizer);
    }

    // Swipe gesture
    if (this.onSwipe || this.onSwipeLeft || this.onSwipeRight || this.onSwipeUp || this.onSwipeDown) {
      const swipeRecognizer = new SwipeRecognizer(
        (event) => {
          if (this.onSwipe) this.onSwipe(event);

          // Direction-specific callbacks
          if (event.direction === 'left' && this.onSwipeLeft) {
            this.onSwipeLeft(event);
          } else if (event.direction === 'right' && this.onSwipeRight) {
            this.onSwipeRight(event);
          } else if (event.direction === 'up' && this.onSwipeUp) {
            this.onSwipeUp(event);
          } else if (event.direction === 'down' && this.onSwipeDown) {
            this.onSwipeDown(event);
          }
        },
        { minDistance: 50, maxDuration: 300 }
      );
      this.recognizers.push(swipeRecognizer);
    }

    // Pan gesture
    if (this.onPan || this.onPanStart || this.onPanUpdate || this.onPanEnd) {
      const panRecognizer = new PanRecognizer(
        (event) => {
          if (this.onPan) this.onPan(event);
        },
        {
          minDistance: 10,
          onStart: (event) => {
            if (this.onPanStart) this.onPanStart(event);
          },
          onUpdate: (event) => {
            if (this.onPanUpdate) this.onPanUpdate(event);
          },
          onEnd: (event) => {
            if (this.onPanEnd) this.onPanEnd(event);
          }
        }
      );
      this.recognizers.push(panRecognizer);
    }

    // Scale gesture (pinch)
    if (this.onScale || this.onScaleStart || this.onScaleUpdate || this.onScaleEnd) {
      const scaleRecognizer = new ScaleRecognizer(
        (event) => {
          if (this.onScale) this.onScale(event);
        },
        {
          minScale: 0.5,
          maxScale: 2.0,
          onStart: (event) => {
            if (this.onScaleStart) this.onScaleStart(event);
          },
          onUpdate: (event) => {
            if (this.onScaleUpdate) this.onScaleUpdate(event);
          },
          onEnd: (event) => {
            if (this.onScaleEnd) this.onScaleEnd(event);
          }
        }
      );
      this.recognizers.push(scaleRecognizer);
    }
  }

  /**
   * Route events to recognizers
   */
  _routeEvent(eventType, event, elementId) {
    this._initializeRecognizers(elementId);

    this.recognizers.forEach(recognizer => {
      if (!recognizer.isDisposed) {
        recognizer.handleEvent(eventType, event);
      }
    });
  }

  // ========== MOUSE EVENTS ==========

  _handleMouseDown(e, elementId) {
    this._routeEvent('mousedown', e, elementId);
    if (this.onTapDown) {
      this.onTapDown({
        type: 'tapdown',
        position: { x: e.clientX, y: e.clientY },
        nativeEvent: e
      });
    }
  }

  _handleMouseUp(e, elementId) {
    this._routeEvent('mouseup', e, elementId);
  }

  _handleMouseMove(e, elementId) {
    this._routeEvent('mousemove', e, elementId);
  }

  _handleMouseLeave(e, elementId) {
    if (this.onTapCancel) {
      this.onTapCancel({
        type: 'tapcancel',
        nativeEvent: e
      });
    }
  }

  // ========== TOUCH EVENTS ==========

  _handleTouchStart(e, elementId) {
    this._routeEvent('touchstart', e, elementId);
    if (this.onTapDown) {
      const touch = e.touches[0];
      this.onTapDown({
        type: 'tapdown',
        position: { x: touch.clientX, y: touch.clientY },
        nativeEvent: e
      });
    }
  }

  _handleTouchEnd(e, elementId) {
    this._routeEvent('touchend', e, elementId);
  }

  _handleTouchMove(e, elementId) {
    this._routeEvent('touchmove', e, elementId);
  }

  _handleTouchCancel(e, elementId) {
    this._routeEvent('touchcancel', e, elementId);
    if (this.onTapCancel) {
      this.onTapCancel({
        type: 'tapcancel',
        nativeEvent: e
      });
    }
  }

  // ========== CONTEXT MENU ==========

  _handleContextMenu(e, elementId) {
    if (this.onLongPress) {
      e.preventDefault();
      this._routeEvent('contextmenu', e, elementId);
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    this.recognizers.forEach(recognizer => {
      recognizer.dispose();
    });
    this.recognizers = [];
  }

  createElement(parent, runtime) {
    return new GestureDetectorElement(this, parent, runtime);
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    if (this.onTap) properties.push({ name: 'onTap', value: 'fn' });
    if (this.onDoubleTap) properties.push({ name: 'onDoubleTap', value: 'fn' });
    if (this.onLongPress) properties.push({ name: 'onLongPress', value: 'fn' });
    if (this.onSwipe) properties.push({ name: 'onSwipe', value: 'fn' });
    if (this.onPan) properties.push({ name: 'onPan', value: 'fn' });
  }
}

class GestureDetectorElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }

  unmount() {
    if (this.widget) {
      this.widget.dispose();
    }
    super.unmount();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  GestureDetector,
  GestureDetectorElement
};