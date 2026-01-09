import { ProxyWidget, ProxyElement } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Alignment } from '../../utils/utils.js';

import { Size } from '../../utils/size.js';
import { BoxConstraints } from '../../utils/box_constraints.js';

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
        return new SizedBoxElement(this, parent, runtime);
    }
}

class SizedBoxElement extends ProxyElement {
    performRebuild() {
        const elementId = this.getElementId();
        const widgetPath = this.getWidgetPath();

        const style = {
            boxSizing: 'border-box',
            flexShrink: 0
        };

        // Apply width
        if (this.widget.width !== null && this.widget.width !== undefined) {
            if (this.widget.width === Infinity) {
                style.width = '100%';
                style.flex = '1 1 auto';
            } else {
                style.width = `${this.widget.width}px`;
            }
        }

        // Apply height
        if (this.widget.height !== null && this.widget.height !== undefined) {
            if (this.widget.height === Infinity) {
                style.height = '100%';
                style.flex = '1 1 auto';
            } else {
                style.height = `${this.widget.height}px`;
            }
        }

        // Get child VNode from parent class (this handles the widget lifecycle)
        const childVNode = super.performRebuild();

        // Wrap child VNode (or create empty div if no child)
        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'SizedBox',
                'data-width': this.widget.width,
                'data-height': this.widget.height
            },
            children: childVNode ? [childVNode] : [],
            key: this.widget.key
        });
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
    }/**
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
        return new ProxyElement(this, parent, runtime);
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
    }/**
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
        return new ProxyElement(this, parent, runtime);
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
    }/**
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
        return new ProxyElement(this, parent, runtime);
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
    }/**
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
        return new ProxyElement(this, parent, runtime);
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
    }/**
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
        return new ProxyElement(this, parent, runtime);
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
    }/**
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
        return new ProxyElement(this, parent, runtime);
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