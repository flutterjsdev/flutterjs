import { Widget, StatelessWidget } from '../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { Clip, TextDirection, Alignment } from '../utils/utils.js';
import { Padding } from '../widgets/compoment/padding.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BoxConstraints } from '../utils/box_constraints.js';
import { Align } from '../widgets/compoment/center.js'; // Align is exported from center.js based on previous readings
import { ClipPath } from '../widgets/compoment/clip.js';
import { ConstrainedBox, LimitedBox } from '../widgets/compoment/sized_box.js';
import { Transform } from '../widgets/compoment/transform.js';



// ============================================================================
// ENUMS
// ============================================================================

const DecorationPosition = {
  background: 'background',
  foreground: 'foreground'
};

// ============================================================================
// EDGE INSETS
// ============================================================================



// ============================================================================
// BOX CONSTRAINTS
// ============================================================================



import { Decoration, BoxDecoration } from '../utils/decoration/decoration.js';

// ============================================================================
// COLORED BOX WIDGET
// ============================================================================

class ColoredBox extends StatelessWidget {
  constructor({
    key = null,
    color = 'white',
    child = null
  } = {}) {
    super(key);

    this.color = color;
    this.child = child;
  }

  build(context) {
    return new DecoratedBox({
      decoration: new BoxDecoration({ color: this.color }),
      child: this.child
    });
  }
}

// ============================================================================
// RENDER DECORATED BOX
// ============================================================================

class RenderDecoratedBox {
  constructor({
    decoration = null,
    position = DecorationPosition.background,
    configuration = {}
  } = {}) {
    this.decoration = decoration;
    this.position = position;
    this.configuration = configuration;
  }

  debugInfo() {
    return {
      type: 'RenderDecoratedBox',
      position: this.position,
      hasDecoration: !!this.decoration
    };
  }
}

// ============================================================================
// DECORATED BOX WIDGET
// ============================================================================

class DecoratedBox extends Widget {
  constructor({
    key = null,
    decoration = null,
    position = DecorationPosition.background,
    child = null,
    fullWidth = false,
    fullHeight = false
  } = {}) {
    super(key);

    // Robustness: Promote plain object
    if (decoration && !(decoration instanceof Decoration)) {
      decoration = new BoxDecoration(decoration);
    }

    if (!decoration) {
      throw new Error('DecoratedBox requires a decoration');
    }

    this.decoration = decoration;
    this.position = position;
    this.child = child;
    this.fullWidth = fullWidth || (child && child.isFullWidth);
    this.fullHeight = fullHeight || (child && child.isFullHeight);
    this.isFullWidth = this.fullWidth;
    this.isFullHeight = this.fullHeight;
    this._renderObject = null;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderDecoratedBox({
      decoration: this.decoration,
      position: this.position,
      configuration: {}
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.decoration = this.decoration;
    renderObject.position = this.position;
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

    const decorationStyle = this.decoration.toCSSStyle();

    const style = {
      position: 'relative',
      width: this.fullWidth ? '100%' : 'auto',
      height: this.fullHeight ? '100%' : 'auto',
      boxSizing: 'border-box',
      ...decorationStyle
    };

    // Build child VNode with element caching
    let childVNode = null;
    if (this.child) {
      if (context._childElement) {
        // Reconciliation: Check if we can reuse the existing element
        if (context._childElement.widget.constructor === this.child.constructor &&
          context._childElement.widget.key === this.child.key) {

          // Reuse existing element
          context._childElement.updateWidget(this.child);
          if (context._childElement.dirty) {
            context._childElement.rebuild();
          }
        } else {
          // Replace element
          context._childElement.unmount();
          context._childElement = this.child.createElement(context.element, context.element.runtime);
          context._childElement.mount(context.element);
        }
      } else {
        // Initial create
        context._childElement = this.child.createElement(context.element, context.element.runtime);
        context._childElement.mount(context.element);
      }
      childVNode = context._childElement.performRebuild();
    }

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'DecoratedBox',
        'data-position': this.position
      },
      children: childVNode ? [childVNode] : [],
      key: this.key
    });
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    const label = this.position === DecorationPosition.background ? 'bg' : 'fg';
    properties.push({ name: label, value: this.decoration });
  }

  createElement(parent, runtime) {
    return new DecoratedBoxElement(this, parent, runtime);
  }
}

class DecoratedBoxElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// CONTAINER WIDGET
// ============================================================================

class Container extends StatelessWidget {
  constructor({
    key = null,
    alignment = null,
    padding = null,
    color = null,
    decoration = null,
    foregroundDecoration = null,
    width = null,
    height = null,
    constraints = null,
    margin = null,
    transform = null,
    transformAlignment = null,
    child = null,
    clipBehavior = Clip.none
  } = {}) {
    super(key);

    // Robustness: Promote plain object
    if (decoration && !(decoration instanceof Decoration)) {
      decoration = new BoxDecoration(decoration);
    }

    // Validation
    if (padding !== null && !padding.isNonNegative) {
      throw new Error('padding must be non-negative');
    }
    if (margin !== null && !margin.isNonNegative) {
      throw new Error('margin must be non-negative');
    }
    if (color !== null && decoration !== null) {
      throw new Error('Cannot provide both color and decoration. Use BoxDecoration(color: color).');
    }
    if (decoration !== null && !decoration.debugAssertIsValid()) {
      throw new Error('decoration is not valid');
    }

    this.alignment = alignment;
    this.padding = padding;
    this.color = color;
    this.color = color;
    this.decoration = decoration;

    // Robustness: Promote foregroundDecoration
    if (foregroundDecoration && !(foregroundDecoration instanceof Decoration)) {
      foregroundDecoration = new BoxDecoration(foregroundDecoration);
    }
    this.foregroundDecoration = foregroundDecoration;
    this.margin = margin;
    this.transform = transform;
    this.transformAlignment = transformAlignment;
    this.child = child;
    this.clipBehavior = clipBehavior;

    // Apply width/height to constraints
    this.constraints = constraints;
    if (width !== null || height !== null) {
      this.constraints = (this.constraints || new BoxConstraints()).tighten({ width, height });
    } else if (width === null && height === null && constraints === null) {
      // If everything is null, we stay with null constraints to allow expansion
    }

    // Size Intent Bubbling
    this.isFullWidth = (width === Infinity) || (child && child.isFullWidth);
    this.isFullHeight = (height === Infinity) || (child && child.isFullHeight);
  }

  /**
   * Get effective padding including decoration padding
   * @private
   */
  _getPaddingIncludingDecoration() {
    if (this.padding === null) {
      return this.decoration?.padding;
    }
    if (this.decoration?.padding === null || this.decoration?.padding === undefined) {
      return this.padding;
    }
    return this.padding.add(this.decoration.padding);
  }

  /**
   * Build widget tree
   */
  build(context) {
    let current = this.child;

    // Handle empty container
    if (this.child === null && (this.constraints === null || !this.constraints.isTight)) {
      current = new LimitedBox({
        maxWidth: 0,
        maxHeight: 0,
        child: new ConstrainedBox({
          constraints: BoxConstraints.expand()
        })
      });
    } else if (this.alignment !== null) {
      current = new Align({
        alignment: this.alignment,
        child: current
      });
    }

    // Apply padding
    const effectivePadding = this._getPaddingIncludingDecoration();
    if (effectivePadding != null) {  // != catches both null and undefined
      current = new Padding({
        padding: effectivePadding,
        child: current
      });
    }

    // Apply color
    if (this.color !== null) {
      current = new ColoredBox({
        color: this.color,
        child: current
      });
    }

    // Apply clipping
    if (this.clipBehavior !== Clip.none && this.decoration !== null) {
      current = new ClipPath({
        clipBehavior: this.clipBehavior,
        child: current,
        isFullWidth: this.isFullWidth,
        isFullHeight: this.isFullHeight
      });
    }

    // Apply decoration
    if (this.decoration !== null) {
      current = new DecoratedBox({
        decoration: this.decoration,
        child: current,
        fullWidth: this.isFullWidth,
        fullHeight: this.isFullHeight
      });
    }

    // Apply foreground decoration
    if (this.foregroundDecoration !== null) {
      current = new DecoratedBox({
        decoration: this.foregroundDecoration,
        position: DecorationPosition.foreground,
        child: current
      });
    }

    // Apply constraints
    if (this.constraints !== null) {
      current = new ConstrainedBox({
        constraints: this.constraints,
        child: current
      });
    }

    // Apply margin
    if (this.margin !== null) {
      current = new Padding({
        padding: this.margin,
        child: current
      });
    }

    // Apply transform
    if (this.transform !== null) {
      current = new Transform({
        transform: this.transform,
        alignment: this.transformAlignment,
        child: current
      });
    }

    return current;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    if (this.alignment !== null) properties.push({ name: 'alignment', value: this.alignment });
    if (this.padding !== null) properties.push({ name: 'padding', value: this.padding });
    if (this.color !== null) {
      properties.push({ name: 'bg', value: this.color });
    } else if (this.decoration !== null) {
      properties.push({ name: 'bg', value: this.decoration });
    }
    if (this.foregroundDecoration !== null) properties.push({ name: 'fg', value: this.foregroundDecoration });
    if (this.constraints !== null) properties.push({ name: 'constraints', value: this.constraints });
    if (this.margin !== null) properties.push({ name: 'margin', value: this.margin });
  }
}

// ============================================================================
// SUPPORTING WIDGETS (Placeholder implementations)
// ============================================================================













// ============================================================================
// EXPORTS
// ============================================================================

export {
  Container,
  DecoratedBox,
  DecoratedBoxElement,
  RenderDecoratedBox,
  ColoredBox,
  BoxDecoration,
  Decoration,
  DecorationPosition
};