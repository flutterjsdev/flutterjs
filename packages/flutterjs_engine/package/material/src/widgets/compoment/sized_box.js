import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Alignment } from '../../utils/utils.js';
import { Clip } from './clip_widgets.js';

// ============================================================================
// SIZE CLASS
// ============================================================================

class Size {
    constructor(width = 0, height = 0) {
        this.width = width;
        this.height = height;
    }

    static get zero() {
        return new Size(0, 0);
    }

    static get infinite() {
        return new Size(Infinity, Infinity);
    }

    static square(dimension) {
        return new Size(dimension, dimension);
    }

    get isEmpty() {
        return this.width === 0 && this.height === 0;
    }

    get isInfinite() {
        return this.width === Infinity || this.height === Infinity;
    }

    toString() {
        return `Size(${this.width}, ${this.height})`;
    }

    equals(other) {
        if (!other || !(other instanceof Size)) {
            return false;
        }
        return this.width === other.width && this.height === other.height;
    }
}

// ============================================================================
// BOX CONSTRAINTS CLASS
// ============================================================================

class BoxConstraints {
    constructor(minWidth = 0, maxWidth = Infinity, minHeight = 0, maxHeight = Infinity) {
        this.minWidth = minWidth;
        this.maxWidth = maxWidth;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
    }

    static tight(size) {
        return new BoxConstraints(size.width, size.width, size.height, size.height);
    }

    static loose(size) {
        return new BoxConstraints(0, size.width, 0, size.height);
    }

    static expand({ width = Infinity, height = Infinity } = {}) {
        return new BoxConstraints(0, width, 0, height);
    }

    static tightFor({ width = null, height = null } = {}) {
        return new BoxConstraints(
            width ?? 0,
            width ?? Infinity,
            height ?? 0,
            height ?? Infinity
        );
    }

    get isTight() {
        return this.minWidth === this.maxWidth && this.minHeight === this.maxHeight;
    }

    get isNormalized() {
        return this.minWidth <= this.maxWidth && this.minHeight <= this.maxHeight;
    }

    constrain(size) {
        return new Size(
            Math.max(this.minWidth, Math.min(this.maxWidth, size.width)),
            Math.max(this.minHeight, Math.min(this.maxHeight, size.height))
        );
    }

    widthConstraints() {
        return new BoxConstraints(this.minWidth, this.maxWidth, 0, Infinity);
    }

    heightConstraints() {
        return new BoxConstraints(0, Infinity, this.minHeight, this.maxHeight);
    }

    copyWith({ minWidth, maxWidth, minHeight, maxHeight } = {}) {
        return new BoxConstraints(
            minWidth ?? this.minWidth,
            maxWidth ?? this.maxWidth,
            minHeight ?? this.minHeight,
            maxHeight ?? this.maxHeight
        );
    }

    toString() {
        return `BoxConstraints(${this.minWidth}..${this.maxWidth}, ${this.minHeight}..${this.maxHeight})`;
    }
}

// ============================================================================
// OVERFLOW BOX FIT ENUM
// ============================================================================

const OverflowBoxFit = {
    max: 'max',
    min: 'min'
};

// ============================================================================
// IMPROVED SIZED BOX WIDGET
// ============================================================================

class SizedBox extends ProxyWidget {
    constructor({
        key = null,
        width = null,
        height = null,
        child = null
    } = {}) {
        super({ key, child });

        this.width = width;
        this.height = height;
        this._renderObject = null;
    }

    /**
     * Create a box that expands to fill available space
     */
    static expand({ key = null, child = null } = {}) {
        return new SizedBox({
            key,
            width: Infinity,
            height: Infinity,
            child
        });
    }

    /**
     * Create a box with zero width and height
     */
    static shrink({ key = null, child = null } = {}) {
        return new SizedBox({
            key,
            width: 0,
            height: 0,
            child
        });
    }

    /**
     * Create a square box
     */
    static square({ key = null, dimension = 0, child = null } = {}) {
        return new SizedBox({
            key,
            width: dimension,
            height: dimension,
            child
        });
    }

    /**
     * Create from Size object
     */
    static fromSize({ key = null, size = null, child = null } = {}) {
        return new SizedBox({
            key,
            width: size?.width,
            height: size?.height,
            child
        });
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return {
            constraints: this._getConstraints()
        };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.constraints = this._getConstraints();
    }

    /**
     * Get constraints from width/height
     * @private
     */
    _getConstraints() {
        return BoxConstraints.tightFor({
            width: this.width === Infinity ? null : this.width,
            height: this.height === Infinity ? null : this.height
        });
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
            boxSizing: 'border-box',
            flexShrink: 0
        };

        // Apply width
        if (this.width !== null && this.width !== undefined) {
            if (this.width === Infinity) {
                style.width = '100%';
                style.flex = '1 1 auto';
            } else {
                style.width = `${this.width}px`;
            }
        }

        // Apply height
        if (this.height !== null && this.height !== undefined) {
            if (this.height === Infinity) {
                style.height = '100%';
                style.flex = '1 1 auto';
            } else {
                style.height = `${this.height}px`;
            }
        }

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'SizedBox',
                'data-width': this.width,
                'data-height': this.height
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
        properties.push({ name: 'width', value: this.width });
        properties.push({ name: 'height', value: this.height });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new SizedBoxElement(this,parent, runtime);
    }
}

class SizedBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// CONSTRAINED BOX WIDGET
// ============================================================================

class ConstrainedBox extends ProxyWidget {
    constructor({
        key = null,
        constraints = null,
        child = null
    } = {}) {
        super({ key, child });

        if (!constraints) {
            throw new Error('ConstrainedBox requires constraints');
        }

        if (!(constraints instanceof BoxConstraints)) {
            throw new Error(
                `ConstrainedBox requires a BoxConstraints instance, got: ${typeof constraints}`
            );
        }

        this.constraints = constraints;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return { additionalConstraints: this.constraints };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.additionalConstraints = this.constraints;
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
            minWidth: `${this.constraints.minWidth}px`,
            maxWidth: `${this.constraints.maxWidth}px`,
            minHeight: `${this.constraints.minHeight}px`,
            maxHeight: `${this.constraints.maxHeight}px`,
            boxSizing: 'border-box'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ConstrainedBox',
                'data-constraints': this.constraints.toString()
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
        properties.push({ name: 'constraints', value: this.constraints.toString() });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new ConstrainedBoxElement(this,parent, runtime);
    }
}

class ConstrainedBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// LIMITED BOX WIDGET
// Limits size only when constrained by parent
// ============================================================================

class LimitedBox extends ProxyWidget {
    constructor({
        key = null,
        maxWidth = Infinity,
        maxHeight = Infinity,
        child = null
    } = {}) {
        super({ key, child });

        if (maxWidth < 0 || maxHeight < 0) {
            throw new Error('maxWidth and maxHeight must be >= 0');
        }

        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return { maxWidth: this.maxWidth, maxHeight: this.maxHeight };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.maxWidth = this.maxWidth;
        renderObject.maxHeight = this.maxHeight;
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
            maxWidth: this.maxWidth === Infinity ? 'none' : `${this.maxWidth}px`,
            maxHeight: this.maxHeight === Infinity ? 'none' : `${this.maxHeight}px`,
            boxSizing: 'border-box'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'LimitedBox',
                'data-max-width': this.maxWidth,
                'data-max-height': this.maxHeight
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
        properties.push({ name: 'maxWidth', value: this.maxWidth });
        properties.push({ name: 'maxHeight', value: this.maxHeight });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new LimitedBoxElement(this,parent, runtime);
    }
}

class LimitedBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// OVERFLOW BOX WIDGET
// Allows child to overflow parent constraints
// ============================================================================

class OverflowBox extends ProxyWidget {
    constructor({
        key = null,
        alignment = Alignment.center,
        minWidth = null,
        maxWidth = null,
        minHeight = null,
        maxHeight = null,
        fit = OverflowBoxFit.max,
        child = null
    } = {}) {
        super({ key, child });

        this.alignment = alignment;
        this.minWidth = minWidth;
        this.maxWidth = maxWidth;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
        this.fit = fit;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return {
            alignment: this.alignment,
            minWidth: this.minWidth,
            maxWidth: this.maxWidth,
            minHeight: this.minHeight,
            maxHeight: this.maxHeight,
            fit: this.fit
        };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.alignment = this.alignment;
        renderObject.minWidth = this.minWidth;
        renderObject.maxWidth = this.maxWidth;
        renderObject.minHeight = this.minHeight;
        renderObject.maxHeight = this.maxHeight;
        renderObject.fit = this.fit;
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
            overflow: 'visible',
            display: 'flex',
            alignItems: this._getAlignmentValue('vertical'),
            justifyContent: this._getAlignmentValue('horizontal')
        };

        // Apply size constraints
        if (this.minWidth !== null) style.minWidth = `${this.minWidth}px`;
        if (this.maxWidth !== null) style.maxWidth = `${this.maxWidth}px`;
        if (this.minHeight !== null) style.minHeight = `${this.minHeight}px`;
        if (this.maxHeight !== null) style.maxHeight = `${this.maxHeight}px`;

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'OverflowBox',
                'data-fit': this.fit,
                'data-alignment': this.alignment.toString()
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Get alignment value for flex
     * @private
     */
    _getAlignmentValue(direction) {
        if (direction === 'horizontal') {
            if (this.alignment.x < 0) return 'flex-start';
            if (this.alignment.x > 0) return 'flex-end';
            return 'center';
        } else if (direction === 'vertical') {
            if (this.alignment.y < 0) return 'flex-start';
            if (this.alignment.y > 0) return 'flex-end';
            return 'center';
        }
        return 'center';
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'alignment', value: this.alignment.toString() });
        properties.push({ name: 'fit', value: this.fit });
        if (this.minWidth !== null) properties.push({ name: 'minWidth', value: this.minWidth });
        if (this.maxWidth !== null) properties.push({ name: 'maxWidth', value: this.maxWidth });
        if (this.minHeight !== null) properties.push({ name: 'minHeight', value: this.minHeight });
        if (this.maxHeight !== null) properties.push({ name: 'maxHeight', value: this.maxHeight });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new OverflowBoxElement(this,parent, runtime);
    }
}

class OverflowBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// SIZED OVERFLOW BOX WIDGET
// Fixed size with ability to overflow
// ============================================================================

class SizedOverflowBox extends ProxyWidget {
    constructor({
        key = null,
        size = null,
        alignment = Alignment.center,
        child = null
    } = {}) {
        super({ key, child });

        if (!size) {
            throw new Error('SizedOverflowBox requires a size');
        }

        this.size = size;
        this.alignment = alignment;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return {
            requestedSize: this.size,
            alignment: this.alignment
        };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.requestedSize = this.size;
        renderObject.alignment = this.alignment;
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
            overflow: 'visible',
            width: `${this.size.width}px`,
            height: `${this.size.height}px`,
            display: 'flex',
            alignItems: this._getAlignmentValue('vertical'),
            justifyContent: this._getAlignmentValue('horizontal')
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'SizedOverflowBox',
                'data-size': this.size.toString(),
                'data-alignment': this.alignment.toString()
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Get alignment value for flex
     * @private
     */
    _getAlignmentValue(direction) {
        if (direction === 'horizontal') {
            if (this.alignment.x < 0) return 'flex-start';
            if (this.alignment.x > 0) return 'flex-end';
            return 'center';
        } else if (direction === 'vertical') {
            if (this.alignment.y < 0) return 'flex-start';
            if (this.alignment.y > 0) return 'flex-end';
            return 'center';
        }
        return 'center';
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'size', value: this.size.toString() });
        properties.push({ name: 'alignment', value: this.alignment.toString() });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new SizedOverflowBoxElement(this,parent, runtime);
    }
}

class SizedOverflowBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// OFFSTAGE WIDGET
// Hides child from view but keeps it in the tree
// ============================================================================

class Offstage extends ProxyWidget {
    constructor({
        key = null,
        offstage = true,
        child = null
    } = {}) {
        super({ key, child });

        this.offstage = offstage;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return { offstage: this.offstage };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.offstage = this.offstage;
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
            display: this.offstage ? 'none' : 'block',
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'Offstage',
                'data-offstage': this.offstage,
                'aria-hidden': this.offstage ? 'true' : 'false'
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
        properties.push({ name: 'offstage', value: this.offstage });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new OffstageElement(this,parent, runtime);
    }
}

class OffstageElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// FRACTIONALLY SIZED BOX WIDGET
// Sizes child as a fraction of available space
// ============================================================================

class FractionallySizedBox extends ProxyWidget {
    constructor({
        key = null,
        alignment = Alignment.center,
        widthFactor = null,
        heightFactor = null,
        child = null
    } = {}) {
        super({ key, child });

        if (widthFactor !== null && widthFactor < 0) {
            throw new Error('widthFactor must be >= 0');
        }

        if (heightFactor !== null && heightFactor < 0) {
            throw new Error('heightFactor must be >= 0');
        }

        this.alignment = alignment;
        this.widthFactor = widthFactor;
        this.heightFactor = heightFactor;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return {
            alignment: this.alignment,
            widthFactor: this.widthFactor,
            heightFactor: this.heightFactor
        };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.alignment = this.alignment;
        renderObject.widthFactor = this.widthFactor;
        renderObject.heightFactor = this.heightFactor;
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
            display: 'flex',
            alignItems: this._getAlignmentValue('vertical'),
            justifyContent: this._getAlignmentValue('horizontal'),
            overflow: 'visible'
        };

        // Apply width factor
        if (this.widthFactor !== null) {
            style.width = `${this.widthFactor * 100}%`;
        } else {
            style.width = '100%';
        }

        // Apply height factor
        if (this.heightFactor !== null) {
            style.height = `${this.heightFactor * 100}%`;
        } else {
            style.height = '100%';
        }

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'FractionallySizedBox',
                'data-width-factor': this.widthFactor,
                'data-height-factor': this.heightFactor,
                'data-alignment': this.alignment.toString()
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Get alignment value for flex
     * @private
     */
    _getAlignmentValue(direction) {
        if (direction === 'horizontal') {
            if (this.alignment.x < 0) return 'flex-start';
            if (this.alignment.x > 0) return 'flex-end';
            return 'center';
        } else if (direction === 'vertical') {
            if (this.alignment.y < 0) return 'flex-start';
            if (this.alignment.y > 0) return 'flex-end';
            return 'center';
        }
        return 'center';
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'alignment', value: this.alignment.toString() });
        if (this.widthFactor !== null) {
            properties.push({ name: 'widthFactor', value: this.widthFactor });
        }
        if (this.heightFactor !== null) {
            properties.push({ name: 'heightFactor', value: this.heightFactor });
        }
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new FractionallySizedBoxElement(this,parent, runtime);
    }
}

class FractionallySizedBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

export {
    SizedBox,
    ConstrainedBox,
    LimitedBox,
    OverflowBox,
    SizedOverflowBox,
    Offstage,
    FractionallySizedBox,
    Size,
    BoxConstraints,
    OverflowBoxFit
};