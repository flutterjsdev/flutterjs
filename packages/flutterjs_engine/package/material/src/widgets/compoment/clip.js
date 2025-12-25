import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Clip } from '../../utils.js';

// ============================================================================
// CUSTOM CLIPPER BASE CLASS
// Override getClip() to return clip-path CSS string
// ============================================================================

class CustomClipper {
    constructor() {
        if (new.target === CustomClipper) {
            throw new Error('CustomClipper is abstract');
        }
    }

    /**
     * Get the clip path (CSS clip-path string)
     * Override in subclasses
     */
    getClip(size) {
        throw new Error('getClip() must be implemented');
    }

    /**
     * Check if should reclip
     */
    shouldReclip(oldClipper) {
        return true;
    }
}

// ============================================================================
// CLIP RECT WIDGET
// Clips child to rectangular bounds
// ============================================================================

class ClipRect extends ProxyWidget {
    constructor({
        key = null,
        clipper = null,
        clipBehavior = Clip.hardEdge,
        child = null
    } = {}) {
        super({ key, child });

        if (clipper && !(clipper instanceof CustomClipper)) {
            throw new Error(
                `ClipRect requires a CustomClipper instance, got: ${typeof clipper}`
            );
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(
                `Invalid clipBehavior: ${clipBehavior}`
            );
        }

        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
        this._containerElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderClipRect({
            clipper: this.clipper,
            clipBehavior: this.clipBehavior
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.clipper = this.clipper;
        renderObject.clipBehavior = this.clipBehavior;
    }

    /**
     * Unmount render object and clean up
     */
    unmountRenderObject(renderObject) {
        renderObject.clipper = null;
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

        // Apply clip behavior
        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';
        const filterValue = this._getClipFilter();

        const style = {
            overflow: overflowValue,
            position: 'relative',
            filter: filterValue
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ClipRect',
                'data-clip-behavior': this.clipBehavior,
                ref: (el) => this._onContainerMount(el, context)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Get clip filter based on behavior
     * @private
     */
    _getClipFilter() {
        switch (this.clipBehavior) {
            case Clip.antiAlias:
            case Clip.antiAliasWithSaveLayer:
                return 'anti-alias';
            case Clip.hardEdge:
            case Clip.none:
            default:
                return 'none';
        }
    }

    /**
     * Mount container and apply custom clipper if provided
     * @private
     */
    _onContainerMount(el, context) {
        if (!el || !this.clipper) return;

        this._containerElement = el;

        try {
            // Get container dimensions
            const rect = el.getBoundingClientRect();
            const size = {
                width: Math.ceil(rect.width) || 100,
                height: Math.ceil(rect.height) || 100
            };

            // Get clip path from custom clipper
            const clipPath = this.clipper.getClip(size);

            if (clipPath) {
                // Apply clip-path CSS
                el.style.clipPath = clipPath;
                el.style.WebkitClipPath = clipPath;
            }
        } catch (error) {
            console.error('Error applying custom clipper:', error);
        }

        // Re-apply on resize
        const resizeHandler = () => {
            if (!this.clipper || !this._containerElement) return;

            try {
                const rect = this._containerElement.getBoundingClientRect();
                const size = {
                    width: Math.ceil(rect.width) || 100,
                    height: Math.ceil(rect.height) || 100
                };

                const clipPath = this.clipper.getClip(size);
                if (clipPath) {
                    this._containerElement.style.clipPath = clipPath;
                    this._containerElement.style.WebkitClipPath = clipPath;
                }
            } catch (error) {
                console.error('Error applying custom clipper on resize:', error);
            }
        };

        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
        };
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'hasClipper', value: !!this.clipper });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement() {
        return new ClipRectElement(this);
    }
}

// ============================================================================
// RENDER CLIP RECT
// ============================================================================

class RenderClipRect {
    constructor({ clipper = null, clipBehavior = Clip.hardEdge } = {}) {
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderClipRect',
            hasClipper: !!this.clipper,
            clipBehavior: this.clipBehavior
        };
    }
}

// ============================================================================
// CLIP RECT ELEMENT
// ============================================================================

class ClipRectElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        // Cleanup resize listener
        if (this.widget._containerElement && this.widget._containerElement._cleanupResize) {
            this.widget._containerElement._cleanupResize();
        }
        super.detach();
    }
}

// ============================================================================
// CLIP RRECT WIDGET (Rounded Rectangle Clip)
// ============================================================================

class ClipRRect extends ProxyWidget {
    constructor({
        key = null,
        borderRadius = null,
        clipper = null,
        clipBehavior = Clip.antiAlias,
        child = null
    } = {}) {
        super({ key, child });

        if (clipper && !(clipper instanceof CustomClipper)) {
            throw new Error(
                `ClipRRect requires a CustomClipper instance, got: ${typeof clipper}`
            );
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(
                `Invalid clipBehavior: ${clipBehavior}`
            );
        }

        this.borderRadius = borderRadius || { all: 0 };
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
        this._containerElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderClipRRect({
            borderRadius: this.borderRadius,
            clipper: this.clipper,
            clipBehavior: this.clipBehavior
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.borderRadius = this.borderRadius;
        renderObject.clipBehavior = this.clipBehavior;
        renderObject.clipper = this.clipper;
    }

    /**
     * Unmount render object and clean up
     */
    unmountRenderObject(renderObject) {
        renderObject.clipper = null;
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

        // Convert border radius to CSS
        const borderRadiusCss = this._getBorderRadiusCSS();
        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';
        const filterValue = this._getClipFilter();

        const style = {
            borderRadius: borderRadiusCss,
            overflow: overflowValue,
            position: 'relative',
            filter: filterValue
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ClipRRect',
                'data-border-radius': JSON.stringify(this.borderRadius),
                'data-clip-behavior': this.clipBehavior,
                ref: (el) => this._onContainerMount(el, context)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Convert border radius object to CSS string
     * @private
     */
    _getBorderRadiusCSS() {
        if (typeof this.borderRadius === 'number') {
            return `${this.borderRadius}px`;
        }

        if (this.borderRadius.all !== undefined) {
            return `${this.borderRadius.all}px`;
        }

        const {
            topLeft = 0,
            topRight = 0,
            bottomLeft = 0,
            bottomRight = 0
        } = this.borderRadius;

        return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
    }

    /**
     * Get clip filter based on behavior
     * @private
     */
    _getClipFilter() {
        switch (this.clipBehavior) {
            case Clip.antiAlias:
            case Clip.antiAliasWithSaveLayer:
                return 'anti-alias';
            case Clip.hardEdge:
            case Clip.none:
            default:
                return 'none';
        }
    }

    /**
     * Mount container and apply custom clipper if provided
     * @private
     */
    _onContainerMount(el, context) {
        if (!el) return;

        this._containerElement = el;

        // Apply custom clipper if provided
        if (this.clipper) {
            try {
                const rect = el.getBoundingClientRect();
                const size = {
                    width: Math.ceil(rect.width) || 100,
                    height: Math.ceil(rect.height) || 100
                };

                const clipPath = this.clipper.getClip(size);
                if (clipPath) {
                    el.style.clipPath = clipPath;
                    el.style.WebkitClipPath = clipPath;
                }
            } catch (error) {
                console.error('Error applying custom clipper:', error);
            }
        }

        // Re-apply on resize
        const resizeHandler = () => {
            if (!this._containerElement) return;

            if (this.clipper) {
                try {
                    const rect = this._containerElement.getBoundingClientRect();
                    const size = {
                        width: Math.ceil(rect.width) || 100,
                        height: Math.ceil(rect.height) || 100
                    };

                    const clipPath = this.clipper.getClip(size);
                    if (clipPath) {
                        this._containerElement.style.clipPath = clipPath;
                        this._containerElement.style.WebkitClipPath = clipPath;
                    }
                } catch (error) {
                    console.error('Error applying custom clipper on resize:', error);
                }
            }
        };

        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
        };
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'borderRadius', value: JSON.stringify(this.borderRadius) });
        properties.push({ name: 'hasClipper', value: !!this.clipper });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement() {
        return new ClipRRectElement(this);
    }
}

// ============================================================================
// RENDER CLIP RRECT
// ============================================================================

class RenderClipRRect {
    constructor({
        borderRadius = null,
        clipper = null,
        clipBehavior = Clip.antiAlias
    } = {}) {
        this.borderRadius = borderRadius || { all: 0 };
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderClipRRect',
            borderRadius: JSON.stringify(this.borderRadius),
            hasClipper: !!this.clipper,
            clipBehavior: this.clipBehavior
        };
    }
}

// ============================================================================
// CLIP RRECT ELEMENT
// ============================================================================

class ClipRRectElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        // Cleanup resize listener
        if (this.widget._containerElement && this.widget._containerElement._cleanupResize) {
            this.widget._containerElement._cleanupResize();
        }
        super.detach();
    }
}

// ============================================================================
// CLIP RSUPERELLIPSE WIDGET
// Clips to superellipse shape with border radius
// ============================================================================

class ClipRSuperellipse extends ProxyWidget {
    constructor({
        key = null,
        borderRadius = null,
        clipper = null,
        clipBehavior = Clip.antiAlias,
        child = null
    } = {}) {
        super({ key, child });

        if (clipper && !(clipper instanceof CustomClipper)) {
            throw new Error(
                `ClipRSuperellipse requires a CustomClipper instance, got: ${typeof clipper}`
            );
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(
                `Invalid clipBehavior: ${clipBehavior}`
            );
        }

        this.borderRadius = borderRadius || { all: 0 };
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
        this._containerElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderClipRSuperellipse({
            borderRadius: this.borderRadius,
            clipper: this.clipper,
            clipBehavior: this.clipBehavior
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.borderRadius = this.borderRadius;
        renderObject.clipBehavior = this.clipBehavior;
        renderObject.clipper = this.clipper;
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

        const borderRadiusCss = this._getBorderRadiusCSS();
        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

        const style = {
            borderRadius: borderRadiusCss,
            overflow: overflowValue,
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ClipRSuperellipse',
                'data-border-radius': JSON.stringify(this.borderRadius),
                'data-clip-behavior': this.clipBehavior,
                ref: (el) => this._onContainerMount(el)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Convert border radius to CSS string
     * @private
     */
    _getBorderRadiusCSS() {
        if (typeof this.borderRadius === 'number') {
            return `${this.borderRadius}px`;
        }

        if (this.borderRadius.all !== undefined) {
            return `${this.borderRadius.all}px`;
        }

        const {
            topLeft = 0,
            topRight = 0,
            bottomLeft = 0,
            bottomRight = 0
        } = this.borderRadius;

        return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
    }

    /**
     * Mount container and apply custom clipper
     * @private
     */
    _onContainerMount(el) {
        if (!el) return;

        this._containerElement = el;

        if (this.clipper) {
            this._applyClipper();
        }

        const resizeHandler = () => this._applyClipper();
        window.addEventListener('resize', resizeHandler);
        el._cleanupResize = () => window.removeEventListener('resize', resizeHandler);
    }

    /**
     * Apply custom clipper
     * @private
     */
    _applyClipper() {
        if (!this.clipper || !this._containerElement) return;

        try {
            const rect = this._containerElement.getBoundingClientRect();
            const size = {
                width: Math.ceil(rect.width) || 100,
                height: Math.ceil(rect.height) || 100
            };

            const clipPath = this.clipper.getClip(size);
            if (clipPath) {
                this._containerElement.style.clipPath = clipPath;
                this._containerElement.style.WebkitClipPath = clipPath;
            }
        } catch (error) {
            console.error('Error applying superellipse clipper:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'borderRadius', value: JSON.stringify(this.borderRadius) });
        properties.push({ name: 'hasClipper', value: !!this.clipper });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement() {
        return new ClipRSuperellipseElement(this);
    }
}

class RenderClipRSuperellipse {
    constructor({
        borderRadius = null,
        clipper = null,
        clipBehavior = Clip.antiAlias
    } = {}) {
        this.borderRadius = borderRadius || { all: 0 };
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
    }

    debugInfo() {
        return {
            type: 'RenderClipRSuperellipse',
            borderRadius: JSON.stringify(this.borderRadius),
            hasClipper: !!this.clipper,
            clipBehavior: this.clipBehavior
        };
    }
}

class ClipRSuperellipseElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        if (this.widget._containerElement && this.widget._containerElement._cleanupResize) {
            this.widget._containerElement._cleanupResize();
        }
        super.detach();
    }
}

// ============================================================================
// CLIP OVAL WIDGET
// Clips child to oval/ellipse shape
// ============================================================================

class ClipOval extends ProxyWidget {
    constructor({
        key = null,
        clipper = null,
        clipBehavior = Clip.antiAlias,
        child = null
    } = {}) {
        super({ key, child });

        if (clipper && !(clipper instanceof CustomClipper)) {
            throw new Error(
                `ClipOval requires a CustomClipper instance, got: ${typeof clipper}`
            );
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(
                `Invalid clipBehavior: ${clipBehavior}`
            );
        }

        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
        this._containerElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderClipOval({
            clipper: this.clipper,
            clipBehavior: this.clipBehavior
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.clipper = this.clipper;
        renderObject.clipBehavior = this.clipBehavior;
    }

    /**
     * Unmount and cleanup
     */
    unmountRenderObject(renderObject) {
        renderObject.clipper = null;
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

        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

        const style = {
            borderRadius: '50%',
            overflow: overflowValue,
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ClipOval',
                'data-clip-behavior': this.clipBehavior,
                ref: (el) => this._onContainerMount(el)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Mount container and apply custom clipper
     * @private
     */
    _onContainerMount(el) {
        if (!el) return;

        this._containerElement = el;

        if (this.clipper) {
            this._applyClipper();
        }

        const resizeHandler = () => this._applyClipper();
        window.addEventListener('resize', resizeHandler);
        el._cleanupResize = () => window.removeEventListener('resize', resizeHandler);
    }

    /**
     * Apply custom clipper
     * @private
     */
    _applyClipper() {
        if (!this.clipper || !this._containerElement) return;

        try {
            const rect = this._containerElement.getBoundingClientRect();
            const size = {
                width: Math.ceil(rect.width) || 100,
                height: Math.ceil(rect.height) || 100
            };

            const clipPath = this.clipper.getClip(size);
            if (clipPath) {
                this._containerElement.style.clipPath = clipPath;
                this._containerElement.style.WebkitClipPath = clipPath;
            }
        } catch (error) {
            console.error('Error applying oval clipper:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'hasClipper', value: !!this.clipper });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement() {
        return new ClipOvalElement(this);
    }
}

class RenderClipOval {
    constructor({ clipper = null, clipBehavior = Clip.antiAlias } = {}) {
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
    }

    debugInfo() {
        return {
            type: 'RenderClipOval',
            hasClipper: !!this.clipper,
            clipBehavior: this.clipBehavior
        };
    }
}

class ClipOvalElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        if (this.widget._containerElement && this.widget._containerElement._cleanupResize) {
            this.widget._containerElement._cleanupResize();
        }
        super.detach();
    }
}

// ============================================================================
// CLIP PATH WIDGET
// Clips child to custom path shape
// ============================================================================

class ClipPath extends ProxyWidget {
    constructor({
        key = null,
        clipper = null,
        clipBehavior = Clip.antiAlias,
        child = null
    } = {}) {
        super({ key, child });

        if (clipper && !(clipper instanceof CustomClipper)) {
            throw new Error(
                `ClipPath requires a CustomClipper instance, got: ${typeof clipper}`
            );
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(
                `Invalid clipBehavior: ${clipBehavior}`
            );
        }

        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
        this._containerElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderClipPath({
            clipper: this.clipper,
            clipBehavior: this.clipBehavior
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.clipper = this.clipper;
        renderObject.clipBehavior = this.clipBehavior;
    }

    /**
     * Unmount and cleanup
     */
    unmountRenderObject(renderObject) {
        renderObject.clipper = null;
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

        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

        const style = {
            overflow: overflowValue,
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ClipPath',
                'data-clip-behavior': this.clipBehavior,
                ref: (el) => this._onContainerMount(el)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Mount container and apply custom clipper
     * @private
     */
    _onContainerMount(el) {
        if (!el) return;

        this._containerElement = el;

        if (this.clipper) {
            this._applyClipper();
        }

        const resizeHandler = () => this._applyClipper();
        window.addEventListener('resize', resizeHandler);
        el._cleanupResize = () => window.removeEventListener('resize', resizeHandler);
    }

    /**
     * Apply custom clipper
     * @private
     */
    _applyClipper() {
        if (!this.clipper || !this._containerElement) return;

        try {
            const rect = this._containerElement.getBoundingClientRect();
            const size = {
                width: Math.ceil(rect.width) || 100,
                height: Math.ceil(rect.height) || 100
            };

            const clipPath = this.clipper.getClip(size);
            if (clipPath) {
                this._containerElement.style.clipPath = clipPath;
                this._containerElement.style.WebkitClipPath = clipPath;
            }
        } catch (error) {
            console.error('Error applying path clipper:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'hasClipper', value: !!this.clipper });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement() {
        return new ClipPathElement(this);
    }
}

class RenderClipPath {
    constructor({ clipper = null, clipBehavior = Clip.antiAlias } = {}) {
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
    }

    debugInfo() {
        return {
            type: 'RenderClipPath',
            hasClipper: !!this.clipper,
            clipBehavior: this.clipBehavior
        };
    }
}

class ClipPathElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        if (this.widget._containerElement && this.widget._containerElement._cleanupResize) {
            this.widget._containerElement._cleanupResize();
        }
        super.detach();
    }
}

export { ClipRect, RenderClipRect, ClipRRect, RenderClipRRect, ClipRSuperellipse, RenderClipRSuperellipse, ClipOval, RenderClipOval, ClipPath, RenderClipPath, CustomClipper, };
