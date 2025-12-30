import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { EdgeInsets } from './padding.js';

// ============================================================================
// AXIS ENUM
// ============================================================================

const Axis = {
  horizontal: 'horizontal',
  vertical: 'vertical'
};

// ============================================================================
// AXIS DIRECTION ENUM
// ============================================================================

const AxisDirection = {
  up: 'up',
  right: 'right',
  down: 'down',
  left: 'left'
};

// ============================================================================
// TEXT DIRECTION ENUM
// ============================================================================

const TextDirection = {
  ltr: 'ltr',  // left-to-right
  rtl: 'rtl'   // right-to-left
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert TextDirection to AxisDirection
 */
function textDirectionToAxisDirection(textDirection) {
  switch (textDirection) {
    case TextDirection.ltr:
      return AxisDirection.right;
    case TextDirection.rtl:
      return AxisDirection.left;
    default:
      return AxisDirection.right;
  }
}

/**
 * Flip AxisDirection (reverse)
 */
function flipAxisDirection(axisDirection) {
  switch (axisDirection) {
    case AxisDirection.up:
      return AxisDirection.down;
    case AxisDirection.down:
      return AxisDirection.up;
    case AxisDirection.left:
      return AxisDirection.right;
    case AxisDirection.right:
      return AxisDirection.left;
    default:
      return axisDirection;
  }
}

/**
 * Get AxisDirection from Axis and reverse flag
 * Also considers text direction from context
 */
function getAxisDirectionFromAxisReverseAndDirectionality(context, axis, reverse) {
  switch (axis) {
    case Axis.horizontal:
      const textDirection = context.getTextDirection?.() || TextDirection.ltr;
      const axisDirection = textDirectionToAxisDirection(textDirection);
      return reverse ? flipAxisDirection(axisDirection) : axisDirection;

    case Axis.vertical:
      return reverse ? AxisDirection.up : AxisDirection.down;

    default:
      return AxisDirection.down;
  }
}

// ============================================================================
// SLIVER TO BOX ADAPTER WIDGET
// Converts a sliver widget to a box widget
// ============================================================================

class SliverToBoxAdapter extends ProxyWidget {
  constructor({
    key = null,
    child = null
  } = {}) {
    super({ key, child });

    this._renderObject = null;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderSliverToBoxAdapter();
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    // No properties to update
  }

  /**
   * Build the widget
   */
  build(context) {
    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    let childVNode = null;
    if (this.child) {
      const childElement = this.child.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      childVNode = childElement.performRebuild();
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    const style = {
      position: 'relative',
      display: 'block',
      width: '100%'
    };

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'SliverToBoxAdapter',
        'data-is-sliver': 'false'
      },
      children: childVNode ? [childVNode] : [],
      key: this.key
    });
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'type', value: 'SliverToBoxAdapter' });
  }

  /**
   * Create element
   */
  createElement(parent, runtime) {
    return new SliverToBoxAdapterElement(this,parent, runtime);
  }
}

// ============================================================================
// RENDER SLIVER TO BOX ADAPTER
// ============================================================================

class RenderSliverToBoxAdapter {
  constructor() {}

  debugInfo() {
    return {
      type: 'RenderSliverToBoxAdapter',
      convertsBoxToSliver: true
    };
  }
}

// ============================================================================
// SLIVER TO BOX ADAPTER ELEMENT
// ============================================================================

class SliverToBoxAdapterElement extends ProxyWidget.constructor.prototype.constructor {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// SLIVER PADDING WIDGET
// Adds padding around a sliver child
// ============================================================================

class SliverPadding extends ProxyWidget {
  constructor({
    key = null,
    padding = null,
    sliver = null
  } = {}) {
    super({ key, child: sliver });

    if (!padding) {
      throw new Error('SliverPadding requires padding parameter');
    }

    if (!(padding instanceof EdgeInsets)) {
      throw new Error(
        `SliverPadding requires an EdgeInsets instance, got: ${typeof padding}`
      );
    }

    this.padding = padding;
    this._renderObject = null;
    this._textDirection = TextDirection.ltr;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderSliverPadding({
      padding: this.padding,
      textDirection: context.getTextDirection?.() || TextDirection.ltr
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.padding = this.padding;
    renderObject.textDirection = context.getTextDirection?.() || TextDirection.ltr;
  }

  /**
   * Build the widget
   */
  build(context) {
    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    let childVNode = null;
    if (this.child) {
      const childElement = this.child.createElement();
      childElement.mount(context.element);
      childVNode = childElement.performRebuild();
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    // Convert padding to CSS
    const paddingCSS = this.padding.toCSSShorthand();

    const style = {
      position: 'relative',
      display: 'block',
      padding: paddingCSS,
      boxSizing: 'border-box'
    };

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'SliverPadding',
        'data-padding': this.padding.toString(),
        'data-padding-top': this.padding.top,
        'data-padding-right': this.padding.right,
        'data-padding-bottom': this.padding.bottom,
        'data-padding-left': this.padding.left,
        'data-is-sliver': 'true'
      },
      children: childVNode ? [childVNode] : [],
      key: this.key
    });
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({
      name: 'padding',
      value: this.padding.toString()
    });
  }

  /**
   * Create element
   */
  createElement(parent, runtime) {
    return new SliverPaddingElement(this,parent, runtime);
  }
}

// ============================================================================
// RENDER SLIVER PADDING
// ============================================================================

class RenderSliverPadding {
  constructor({ padding = null, textDirection = TextDirection.ltr } = {}) {
    this.padding = padding;
    this.textDirection = textDirection;
  }

  debugInfo() {
    return {
      type: 'RenderSliverPadding',
      padding: this.padding?.toString(),
      textDirection: this.textDirection
    };
  }
}

// ============================================================================
// SLIVER PADDING ELEMENT
// ============================================================================

class SliverPaddingElement extends ProxyWidget.constructor.prototype.constructor {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// SEMANTICS PROPERTIES CLASS
// Holds all semantics information for a widget
// ============================================================================

class SemanticsProperties {
  constructor({
    enabled = null,
    checked = null,
    mixed = null,
    selected = null,
    toggled = null,
    button = null,
    slider = null,
    keyboardKey = null,
    link = null,
    linkUrl = null,
    header = null,
    headingLevel = null,
    textField = null,
    readOnly = null,
    focusable = null,
    focused = null,
    inMutuallyExclusiveGroup = null,
    obscured = null,
    multiline = null,
    scopesRoute = null,
    namesRoute = null,
    hidden = null,
    image = null,
    liveRegion = null,
    expanded = null,
    isRequired = null,
    maxValueLength = null,
    currentValueLength = null,
    identifier = null,
    traversalParentIdentifier = null,
    traversalChildIdentifier = null,
    label = null,
    attributedLabel = null,
    value = null,
    attributedValue = null,
    increasedValue = null,
    attributedIncreasedValue = null,
    decreasedValue = null,
    attributedDecreasedValue = null,
    hint = null,
    attributedHint = null,
    tooltip = null,
    textDirection = null,
    sortKey = null,
    tagForChildren = null,
    onTap = null,
    onLongPress = null,
    onScrollLeft = null,
    onScrollRight = null,
    onScrollUp = null,
    onScrollDown = null,
    onIncrease = null,
    onDecrease = null,
    onCopy = null,
    onCut = null,
    onPaste = null,
    onMoveCursorForwardByCharacter = null,
    onMoveCursorBackwardByCharacter = null,
    onDidGainAccessibilityFocus = null,
    onDidLoseAccessibilityFocus = null,
    onFocus = null,
    onDismiss = null,
    onSetSelection = null,
    onSetText = null,
    onExpand = null,
    onCollapse = null,
    customSemanticsActions = null,
    hintOverrides = null,
    role = null,
    controlsNodes = null,
    validationResult = null,
    inputType = null
  } = {}) {
    this.enabled = enabled;
    this.checked = checked;
    this.mixed = mixed;
    this.selected = selected;
    this.toggled = toggled;
    this.button = button;
    this.slider = slider;
    this.keyboardKey = keyboardKey;
    this.link = link;
    this.linkUrl = linkUrl;
    this.header = header;
    this.headingLevel = headingLevel;
    this.textField = textField;
    this.readOnly = readOnly;
    this.focusable = focusable;
    this.focused = focused;
    this.inMutuallyExclusiveGroup = inMutuallyExclusiveGroup;
    this.obscured = obscured;
    this.multiline = multiline;
    this.scopesRoute = scopesRoute;
    this.namesRoute = namesRoute;
    this.hidden = hidden;
    this.image = image;
    this.liveRegion = liveRegion;
    this.expanded = expanded;
    this.isRequired = isRequired;
    this.maxValueLength = maxValueLength;
    this.currentValueLength = currentValueLength;
    this.identifier = identifier;
    this.traversalParentIdentifier = traversalParentIdentifier;
    this.traversalChildIdentifier = traversalChildIdentifier;
    this.label = label;
    this.attributedLabel = attributedLabel;
    this.value = value;
    this.attributedValue = attributedValue;
    this.increasedValue = increasedValue;
    this.attributedIncreasedValue = attributedIncreasedValue;
    this.decreasedValue = decreasedValue;
    this.attributedDecreasedValue = attributedDecreasedValue;
    this.hint = hint;
    this.attributedHint = attributedHint;
    this.tooltip = tooltip;
    this.textDirection = textDirection;
    this.sortKey = sortKey;
    this.tagForChildren = tagForChildren;
    this.onTap = onTap;
    this.onLongPress = onLongPress;
    this.onScrollLeft = onScrollLeft;
    this.onScrollRight = onScrollRight;
    this.onScrollUp = onScrollUp;
    this.onScrollDown = onScrollDown;
    this.onIncrease = onIncrease;
    this.onDecrease = onDecrease;
    this.onCopy = onCopy;
    this.onCut = onCut;
    this.onPaste = onPaste;
    this.onMoveCursorForwardByCharacter = onMoveCursorForwardByCharacter;
    this.onMoveCursorBackwardByCharacter = onMoveCursorBackwardByCharacter;
    this.onDidGainAccessibilityFocus = onDidGainAccessibilityFocus;
    this.onDidLoseAccessibilityFocus = onDidLoseAccessibilityFocus;
    this.onFocus = onFocus;
    this.onDismiss = onDismiss;
    this.onSetSelection = onSetSelection;
    this.onSetText = onSetText;
    this.onExpand = onExpand;
    this.onCollapse = onCollapse;
    this.customSemanticsActions = customSemanticsActions || new Map();
    this.hintOverrides = hintOverrides;
    this.role = role;
    this.controlsNodes = controlsNodes || new Set();
    this.validationResult = validationResult;
    this.inputType = inputType;
  }

  /**
   * Check if contains any text properties
   */
  get containsText() {
    return (
      this.label !== null ||
      this.attributedLabel !== null ||
      this.value !== null ||
      this.attributedValue !== null ||
      this.increasedValue !== null ||
      this.attributedIncreasedValue !== null ||
      this.decreasedValue !== null ||
      this.attributedDecreasedValue !== null ||
      this.hint !== null ||
      this.attributedHint !== null ||
      this.tooltip !== null
    );
  }

  /**
   * Get text direction for semantics
   */
  getTextDirection(contextTextDirection) {
    if (this.textDirection !== null) {
      return this.textDirection;
    }

    if (!this.containsText) {
      return null;
    }

    return contextTextDirection;
  }

  toString() {
    return `SemanticsProperties(
      label: ${this.label},
      value: ${this.value},
      role: ${this.role}
    )`;
  }
}

// ============================================================================
// SEMANTICS BASE CLASS (Abstract)
// Base class for semantics widgets
// ============================================================================

class SemanticsBase extends ProxyWidget {
  constructor({
    key = null,
    child = null,
    container = false,
    explicitChildNodes = false,
    excludeSemantics = false,
    blockUserActions = false,
    localeForSubtree = null,
    properties = null
  } = {}) {
    super({ key, child });

    if (localeForSubtree !== null && !container) {
      throw new Error(
        'To assign locale for subtree, this widget needs to be a container'
      );
    }

    this.container = container;
    this.explicitChildNodes = explicitChildNodes;
    this.excludeSemantics = excludeSemantics;
    this.blockUserActions = blockUserActions;
    this.localeForSubtree = localeForSubtree;
    this.properties = properties || new SemanticsProperties();
    this._renderObject = null;
  }

  /**
   * Get text direction from context
   */
  getTextDirection(context) {
    const contextTextDirection = context.getTextDirection?.() || TextDirection.ltr;
    return this.properties.getTextDirection(contextTextDirection);
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderSemanticsAnnotations({
      container: this.container,
      explicitChildNodes: this.explicitChildNodes,
      excludeSemantics: this.excludeSemantics,
      blockUserActions: this.blockUserActions,
      properties: this.properties,
      localeForSubtree: this.localeForSubtree,
      textDirection: this.getTextDirection(context)
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.container = this.container;
    renderObject.explicitChildNodes = this.explicitChildNodes;
    renderObject.excludeSemantics = this.excludeSemantics;
    renderObject.blockUserActions = this.blockUserActions;
    renderObject.properties = this.properties;
    renderObject.textDirection = this.getTextDirection(context);
    renderObject.localeForSubtree = this.localeForSubtree;
  }

  /**
   * Build the widget
   */
  build(context) {
    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    let childVNode = null;
    if (this.child) {
      const childElement = this.child.createElement(context.element, context.element.runtime);
      childElement.mount(context.element);
      childVNode = childElement.performRebuild();
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    const style = {
      position: 'relative'
    };

    // Build aria attributes from semantics properties
    const ariaAttrs = this._buildAriaAttributes();

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': this.constructor.name,
        'data-container': this.container,
        'data-exclude-semantics': this.excludeSemantics,
        ...ariaAttrs
      },
      children: childVNode ? [childVNode] : [],
      key: this.key
    });
  }

  /**
   * Build aria attributes from semantics properties
   * @private
   */
  _buildAriaAttributes() {
    const attrs = {};

    if (this.properties.label) {
      attrs['aria-label'] = this.properties.label;
    }

    if (this.properties.value) {
      attrs['aria-valuetext'] = this.properties.value;
    }

    if (this.properties.hint) {
      attrs['aria-description'] = this.properties.hint;
    }

    if (this.properties.button) {
      attrs['role'] = 'button';
    }

    if (this.properties.link) {
      attrs['role'] = 'link';
      if (this.properties.linkUrl) {
        attrs['href'] = this.properties.linkUrl.toString();
      }
    }

    if (this.properties.header) {
      attrs['role'] = 'heading';
      if (this.properties.headingLevel) {
        attrs['aria-level'] = this.properties.headingLevel;
      }
    }

    if (this.properties.slider) {
      attrs['role'] = 'slider';
    }

    if (this.properties.checkbox) {
      attrs['role'] = 'checkbox';
      attrs['aria-checked'] = this.properties.checked ? 'true' : 'false';
    }

    if (this.properties.textField) {
      attrs['role'] = 'textbox';
      attrs['aria-readonly'] = this.properties.readOnly ? 'true' : 'false';
    }

    if (this.properties.focusable) {
      attrs['tabindex'] = '0';
    }

    if (this.properties.focused) {
      attrs['aria-focused'] = 'true';
    }

    if (this.properties.hidden) {
      attrs['aria-hidden'] = 'true';
    }

    if (this.properties.expanded !== null) {
      attrs['aria-expanded'] = this.properties.expanded ? 'true' : 'false';
    }

    if (this.excludeSemantics) {
      attrs['aria-hidden'] = 'true';
    }

    return attrs;
  }

  /**
   * Debug properties
   */
  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'container', value: this.container });
    properties.push({ name: 'explicitChildNodes', value: this.explicitChildNodes });
    properties.push({ name: 'excludeSemantics', value: this.excludeSemantics });
    if (this.properties.label) {
      properties.push({ name: 'label', value: this.properties.label });
    }
  }
}

// ============================================================================
// RENDER SEMANTICS ANNOTATIONS
// ============================================================================

class RenderSemanticsAnnotations {
  constructor({
    container = false,
    explicitChildNodes = false,
    excludeSemantics = false,
    blockUserActions = false,
    properties = null,
    localeForSubtree = null,
    textDirection = null
  } = {}) {
    this.container = container;
    this.explicitChildNodes = explicitChildNodes;
    this.excludeSemantics = excludeSemantics;
    this.blockUserActions = blockUserActions;
    this.properties = properties;
    this.localeForSubtree = localeForSubtree;
    this.textDirection = textDirection;
  }

  debugInfo() {
    return {
      type: 'RenderSemanticsAnnotations',
      container: this.container,
      excludeSemantics: this.excludeSemantics,
      properties: this.properties?.toString()
    };
  }
}

// ============================================================================
// SLIVER SEMANTICS WIDGET
// Applies semantics to sliver children
// ============================================================================

class SliverSemantics extends SemanticsBase {
  constructor({
    key = null,
    sliver = null,
    container = false,
    explicitChildNodes = false,
    excludeSemantics = false,
    blockUserActions = false,
    localeForSubtree = null,
    properties = null
  } = {}) {
    super({
      key,
      child: sliver,
      container,
      explicitChildNodes,
      excludeSemantics,
      blockUserActions,
      localeForSubtree,
      properties
    });
  }

  /**
   * Create element
   */
  createElement(parent, runtime) {
    return new SliverSemanticsElement(this,parent, runtime);
  }
}

// ============================================================================
// SLIVER SEMANTICS ELEMENT
// ============================================================================

class SliverSemanticsElement extends ProxyWidget.constructor.prototype.constructor {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

export {
  SliverToBoxAdapter,
  RenderSliverToBoxAdapter,
  SliverPadding,
  RenderSliverPadding,
  SemanticsProperties,
  SemanticsBase,
  RenderSemanticsAnnotations,
  SliverSemantics,
  Axis,
  AxisDirection,
  TextDirection,
  textDirectionToAxisDirection,
  flipAxisDirection,
  getAxisDirectionFromAxisReverseAndDirectionality
};