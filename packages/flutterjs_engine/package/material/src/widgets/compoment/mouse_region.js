import { Widget, Element } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';

// ============================================================================
// ENUMS
// ============================================================================

const MouseCursor = {
  defer: 'default',
  clickable: 'pointer',
  forbidden: 'not-allowed',
  grab: 'grab',
  grabbing: 'grabbing',
  move: 'move',
  precise: 'crosshair',
  text: 'text',
  verticalText: 'vertical-text',
  cell: 'cell',
  copy: 'copy',
  alias: 'alias',
  noDrop: 'no-drop',
  wait: 'wait',
  progress: 'progress',
  contextMenu: 'context-menu',
  help: 'help',
  resize: 'resize',
  resizeColumn: 'col-resize',
  resizeRow: 'row-resize',
  resizeUp: 'n-resize',
  resizeDown: 's-resize',
  resizeLeft: 'w-resize',
  resizeRight: 'e-resize',
  resizeUpLeft: 'nw-resize',
  resizeUpRight: 'ne-resize',
  resizeDownLeft: 'sw-resize',
  resizeDownRight: 'se-resize',
  resizeColumn: 'col-resize',
  resizeRow: 'row-resize',
  allScroll: 'all-scroll',
  zoomIn: 'zoom-in',
  zoomOut: 'zoom-out'
};

const HitTestBehavior = {
  deferToChild: 'deferToChild',
  opaque: 'opaque',
  translucent: 'translucent'
};

// ============================================================================
// POINTER EVENTS
// ============================================================================

class PointerEvent {
  constructor({
    position = { x: 0, y: 0 },
    localPosition = { x: 0, y: 0 },
    timestamp = Date.now(),
    pressure = 0,
    pressureMin = 0,
    pressureMax = 1,
    distance = 0,
    distanceMax = 0,
    size = 0,
    radiusMajor = 0,
    radiusMinor = 0,
    radiusMin = 0,
    radiusMax = 0,
    orientation = 0,
    tilt = 0,
    platformData = 0,
    kind = 'touch',
    device = 0,
    signalKind = 'none'
  } = {}) {
    this.position = position;
    this.localPosition = localPosition;
    this.timestamp = timestamp;
    this.pressure = pressure;
    this.pressureMin = pressureMin;
    this.pressureMax = pressureMax;
    this.distance = distance;
    this.distanceMax = distanceMax;
    this.size = size;
    this.radiusMajor = radiusMajor;
    this.radiusMinor = radiusMinor;
    this.radiusMin = radiusMin;
    this.radiusMax = radiusMax;
    this.orientation = orientation;
    this.tilt = tilt;
    this.platformData = platformData;
    this.kind = kind;
    this.device = device;
    this.signalKind = signalKind;
  }
}

class PointerEnterEvent extends PointerEvent {
  constructor(options = {}) {
    super(options);
  }
}

class PointerHoverEvent extends PointerEvent {
  constructor(options = {}) {
    super(options);
  }
}

class PointerExitEvent extends PointerEvent {
  constructor(options = {}) {
    super(options);
  }
}

// ============================================================================
// RENDER MOUSE REGION
// ============================================================================

class RenderMouseRegion {
  constructor({
    onEnter = null,
    onHover = null,
    onExit = null,
    cursor = MouseCursor.defer,
    opaque = true,
    hitTestBehavior = HitTestBehavior.deferToChild
  } = {}) {
    this.onEnter = onEnter;
    this.onHover = onHover;
    this.onExit = onExit;
    this.cursor = cursor;
    this.opaque = opaque;
    this.hitTestBehavior = hitTestBehavior;
    this._isMouseInside = false;
    this._lastMousePosition = null;
  }

  /**
   * Handle mouse enter
   */
  handleMouseEnter(event) {
    this._isMouseInside = true;

    const position = this._getMousePosition(event);
    const pointerEvent = new PointerEnterEvent({
      position,
      localPosition: position,
      timestamp: event.timeStamp || Date.now()
    });

    if (this.onEnter) {
      this.onEnter(pointerEvent);
    }
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(event) {
    this._lastMousePosition = this._getMousePosition(event);

    if (this.onHover) {
      const pointerEvent = new PointerHoverEvent({
        position: this._lastMousePosition,
        localPosition: this._lastMousePosition,
        timestamp: event.timeStamp || Date.now()
      });

      this.onHover(pointerEvent);
    }
  }

  /**
   * Handle mouse exit
   */
  handleMouseExit(event) {
    this._isMouseInside = false;

    const position = this._getMousePosition(event);
    const pointerEvent = new PointerExitEvent({
      position,
      localPosition: position,
      timestamp: event.timeStamp || Date.now()
    });

    if (this.onExit) {
      this.onExit(pointerEvent);
    }
  }

  /**
   * Get mouse position from event
   * @private
   */
  _getMousePosition(event) {
    return {
      x: event.clientX || 0,
      y: event.clientY || 0,
      dx: event.movementX || 0,
      dy: event.movementY || 0
    };
  }

  debugInfo() {
    return {
      type: 'RenderMouseRegion',
      cursor: this.cursor,
      opaque: this.opaque,
      hitTestBehavior: this.hitTestBehavior,
      hasOnEnter: !!this.onEnter,
      hasOnHover: !!this.onHover,
      hasOnExit: !!this.onExit,
      isMouseInside: this._isMouseInside
    };
  }
}

// ============================================================================
// MOUSE REGION WIDGET
// ============================================================================

class MouseRegion extends Widget {
  constructor({
    key = null,
    onEnter = null,
    onExit = null,
    onHover = null,
    cursor = MouseCursor.defer,
    opaque = true,
    hitTestBehavior = HitTestBehavior.deferToChild,
    child = null
  } = {}) {
    super(key);

    this.onEnter = onEnter;
    this.onExit = onExit;
    this.onHover = onHover;
    this.cursor = cursor;
    this.opaque = opaque;
    this.hitTestBehavior = hitTestBehavior;
    this.child = child;
    this._renderObject = null;
    this._containerElement = null;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderMouseRegion({
      onEnter: this.onEnter,
      onHover: this.onHover,
      onExit: this.onExit,
      cursor: this.cursor,
      opaque: this.opaque,
      hitTestBehavior: this.hitTestBehavior
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.onEnter = this.onEnter;
    renderObject.onHover = this.onHover;
    renderObject.onExit = this.onExit;
    renderObject.cursor = this.cursor;
    renderObject.opaque = this.opaque;
    renderObject.hitTestBehavior = this.hitTestBehavior;
  }

  /**
   * Build widget tree
   */
  build(context) {
    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    // Build child
    let childVNode = null;
    if (this.child) {
      const childElement = this.child.createElement();
      childElement.mount(context.element);
      childVNode = childElement.performRebuild();
    }

    // Determine pointer events based on hit test behavior
    const pointerEvents = this._mapHitTestBehavior();

    // Container style
    const style = {
      position: 'relative',
      cursor: this.cursor,
      pointerEvents,
      userSelect: 'none'
    };

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'MouseRegion',
        'data-cursor': this.cursor,
        'data-opaque': this.opaque,
        'data-hit-test-behavior': this.hitTestBehavior,
        'data-has-on-enter': !!this.onEnter,
        'data-has-on-hover': !!this.onHover,
        'data-has-on-exit': !!this.onExit,
        onMouseEnter: (el) => this._onMouseEnter(el),
        onMouseMove: (el) => this._onMouseMove(el),
        onMouseLeave: (el) => this._onMouseLeave(el),
        ref: (el) => this._onContainerMount(el)
      },
      children: childVNode ? [childVNode] : [],
      key: this.key
    });
  }

  /**
   * Handle mouse enter event
   * @private
   */
  _onMouseEnter(event) {
    if (this._renderObject) {
      this._renderObject.handleMouseEnter(event);
    }
  }

  /**
   * Handle mouse move event
   * @private
   */
  _onMouseMove(event) {
    if (this._renderObject) {
      this._renderObject.handleMouseMove(event);
    }
  }

  /**
   * Handle mouse leave event
   * @private
   */
  _onMouseLeave(event) {
    if (this._renderObject) {
      this._renderObject.handleMouseExit(event);
    }
  }

  /**
   * Mount container
   * @private
   */
  _onContainerMount(el) {
    if (!el) return;
    this._containerElement = el;
  }

  /**
   * Map hit test behavior to CSS pointer-events
   * @private
   */
  _mapHitTestBehavior() {
    switch (this.hitTestBehavior) {
      case HitTestBehavior.opaque:
        return 'auto';
      case HitTestBehavior.translucent:
        return 'auto';
      case HitTestBehavior.deferToChild:
      default:
        return 'auto';
    }
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);

    const listeners = [];
    if (this.onEnter) listeners.push('enter');
    if (this.onExit) listeners.push('exit');
    if (this.onHover) listeners.push('hover');

    properties.push({ name: 'listeners', value: listeners.join(', ') || '<none>' });
    properties.push({ name: 'cursor', value: this.cursor });
    properties.push({ name: 'opaque', value: this.opaque });
    properties.push({ name: 'hitTestBehavior', value: this.hitTestBehavior });
  }

  createElement() {
    return new MouseRegionElement(this);
  }
}

class MouseRegionElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// MOUSE REGION WITH CUSTOM CURSOR
// ============================================================================

class MouseRegionCustomCursor extends MouseRegion {
  constructor({
    key = null,
    onEnter = null,
    onExit = null,
    onHover = null,
    cursor = 'default',
    opaque = true,
    hitTestBehavior = HitTestBehavior.deferToChild,
    child = null
  } = {}) {
    super({
      key,
      onEnter,
      onExit,
      onHover,
      cursor,
      opaque,
      hitTestBehavior,
      child
    });

    this._customCursor = cursor;
  }

  build(context) {
    // Use custom cursor string directly
    this.cursor = this._customCursor;
    return super.build(context);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MouseRegion,
  MouseRegionElement,
  MouseRegionCustomCursor,
  RenderMouseRegion,
  PointerEvent,
  PointerEnterEvent,
  PointerHoverEvent,
  PointerExitEvent,
  MouseCursor,
  HitTestBehavior
};