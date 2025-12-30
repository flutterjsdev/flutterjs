import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { ImageFilter } from './image_filter.js';

// ============================================================================
// BACKDROP FILTER WIDGET
// Applies CSS backdrop filter effects to element
// ============================================================================

class BackdropFilter extends ProxyWidget {
    constructor({
        key = null,
        filter = null,
        child = null,
        blendMode = 'source-over',
        enabled = true,
        backdropGroupKey = null,
        grouped = false
    } = {}) {
        super({ key, child });

        if (!filter) {
            throw new Error('BackdropFilter requires a filter parameter');
        }

        if (!(filter instanceof ImageFilter)) {
            throw new Error(
                `BackdropFilter requires an ImageFilter instance, got: ${typeof filter}`
            );
        }

        this.filter = filter;
        this.blendMode = blendMode;
        this.enabled = enabled;
        this.backdropGroupKey = backdropGroupKey;
        this._useSharedKey = grouped;
        this._renderObject = null;
    }

    /**
     * Static constructor for grouped backdrop filter
     */
    static grouped({
        key = null,
        filter = null,
        child = null,
        blendMode = 'source-over',
        enabled = true
    } = {}) {
        return new BackdropFilter({
            key,
            filter,
            child,
            blendMode,
            enabled,
            grouped: true
        });
    }

    /**
     * Get the backdrop group key
     * @private
     */
    _getBackdropGroupKey(context) {
        if (this._useSharedKey) {
            // Import BackdropGroup to check context
            try {
                const { BackdropGroup } = require('./backdrop_group.js');
                const group = BackdropGroup.maybeOf(context);
                return group?.backdropKey || null;
            } catch (e) {
                return null;
            }
        }
        return this.backdropGroupKey;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderBackdropFilter({
            filter: this.filter,
            blendMode: this.blendMode,
            enabled: this.enabled,
            backdropKey: this._getBackdropGroupKey(context)
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.filter = this.filter;
        renderObject.enabled = this.enabled;
        renderObject.blendMode = this.blendMode;
        renderObject.backdropKey = this._getBackdropGroupKey(context);
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

        // Get CSS filter string
        const filterCss = this.enabled ? this.filter.toCSSFilter() : 'none';

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    position: 'relative',
                    backdropFilter: filterCss,
                    WebkitBackdropFilter: filterCss,
                    mixBlendMode: this.blendMode
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'BackdropFilter',
                'data-enabled': this.enabled,
                'data-blend-mode': this.blendMode,
                'data-filter-type': this.filter.type
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
        properties.push({ name: 'filter', value: this.filter.toString() });
        properties.push({ name: 'blendMode', value: this.blendMode });
        properties.push({ name: 'enabled', value: this.enabled });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new BackdropFilterElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER BACKDROP FILTER
// ============================================================================

class RenderBackdropFilter {
    constructor({ filter = null, blendMode = 'source-over', enabled = true, backdropKey = null } = {}) {
        this.filter = filter;
        this.blendMode = blendMode;
        this.enabled = enabled;
        this.backdropKey = backdropKey;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderBackdropFilter',
            filter: this.filter?.toString(),
            blendMode: this.blendMode,
            enabled: this.enabled
        };
    }
}

// ============================================================================
// BACKDROP FILTER ELEMENT
// ============================================================================

class BackdropFilterElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// CUSTOM PAINT WIDGET
// Uses SVG for drawing instead of canvas
// Override paintContent() to draw SVG content
// ============================================================================

class CustomPaint extends ProxyWidget {
    constructor({
        key = null,
        painter = null,
        foregroundPainter = null,
        size = null,
        isComplex = false,
        willChange = false,
        child = null
    } = {}) {
        super({ key, child });

        if (!painter && !foregroundPainter && (isComplex || willChange)) {
            throw new Error(
                'CustomPaint requires a painter or foregroundPainter'
            );
        }

        this.painter = painter;
        this.foregroundPainter = foregroundPainter;
        this.size = size || { width: 0, height: 0 };
        this.isComplex = isComplex;
        this.willChange = willChange;
        this._renderObject = null;
        this._svgElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderCustomPaint({
            painter: this.painter,
            foregroundPainter: this.foregroundPainter,
            preferredSize: this.size,
            isComplex: this.isComplex,
            willChange: this.willChange
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.painter = this.painter;
        renderObject.foregroundPainter = this.foregroundPainter;
        renderObject.preferredSize = this.size;
        renderObject.isComplex = this.isComplex;
        renderObject.willChange = this.willChange;
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
            willChange: this.willChange ? 'contents' : 'auto'
        };

        if (this.size && this.size.width > 0 && this.size.height > 0) {
            style.width = `${this.size.width}px`;
            style.height = `${this.size.height}px`;
        }

        const children = [];

        // Background painter (behind child)
        if (this.painter) {
            children.push(
                new VNode({
                    tag: 'svg',
                    props: {
                        style: {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                        },
                        width: this.size.width || '100%',
                        height: this.size.height || '100%',
                        viewBox: `0 0 ${this.size.width || 100} ${this.size.height || 100}`,
                        'data-painter': 'background',
                        ref: (el) => this._onBackgroundSvgMount(el)
                    }
                })
            );
        }

        // Child content
        if (childVNode) {
            children.push(
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'relative',
                            zIndex: 1
                        }
                    },
                    children: [childVNode]
                })
            );
        }

        // Foreground painter (above child)
        if (this.foregroundPainter) {
            children.push(
                new VNode({
                    tag: 'svg',
                    props: {
                        style: {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                        },
                        width: this.size.width || '100%',
                        height: this.size.height || '100%',
                        viewBox: `0 0 ${this.size.width || 100} ${this.size.height || 100}`,
                        'data-painter': 'foreground',
                        ref: (el) => this._onForegroundSvgMount(el)
                    }
                })
            );
        }

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'CustomPaint',
                'data-is-complex': this.isComplex,
                'data-will-change': this.willChange
            },
            children,
            key: this.key
        });
    }

    /**
     * Mount background SVG and call painter
     */
    _onBackgroundSvgMount(el) {
        if (!el || !this.painter) return;

        try {
            // Create SVG context object
            const svgContext = {
                element: el,
                drawRect: (x, y, width, height, fill) => {
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', x);
                    rect.setAttribute('y', y);
                    rect.setAttribute('width', width);
                    rect.setAttribute('height', height);
                    rect.setAttribute('fill', fill);
                    el.appendChild(rect);
                },
                drawCircle: (cx, cy, r, fill) => {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', cx);
                    circle.setAttribute('cy', cy);
                    circle.setAttribute('r', r);
                    circle.setAttribute('fill', fill);
                    el.appendChild(circle);
                },
                drawPath: (d, stroke, fill) => {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', d);
                    if (stroke) path.setAttribute('stroke', stroke);
                    if (fill) path.setAttribute('fill', fill);
                    el.appendChild(path);
                }
            };

            // Call painter with SVG context
            this.painter.paint(svgContext, this.size);
        } catch (error) {
            console.error('Error in CustomPaint background painter:', error);
        }
    }

    /**
     * Mount foreground SVG and call foreground painter
     */
    _onForegroundSvgMount(el) {
        if (!el || !this.foregroundPainter) return;

        try {
            // Create SVG context object
            const svgContext = {
                element: el,
                drawRect: (x, y, width, height, fill) => {
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', x);
                    rect.setAttribute('y', y);
                    rect.setAttribute('width', width);
                    rect.setAttribute('height', height);
                    rect.setAttribute('fill', fill);
                    el.appendChild(rect);
                },
                drawCircle: (cx, cy, r, fill) => {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', cx);
                    circle.setAttribute('cy', cy);
                    circle.setAttribute('r', r);
                    circle.setAttribute('fill', fill);
                    el.appendChild(circle);
                },
                drawPath: (d, stroke, fill) => {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', d);
                    if (stroke) path.setAttribute('stroke', stroke);
                    if (fill) path.setAttribute('fill', fill);
                    el.appendChild(path);
                }
            };

            // Call foreground painter with SVG context
            this.foregroundPainter.paint(svgContext, this.size);
        } catch (error) {
            console.error('Error in CustomPaint foreground painter:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'hasPainter', value: !!this.painter });
        properties.push({ name: 'hasForegroundPainter', value: !!this.foregroundPainter });
        properties.push({ name: 'size', value: `${this.size.width}x${this.size.height}` });
        properties.push({ name: 'isComplex', value: this.isComplex });
        properties.push({ name: 'willChange', value: this.willChange });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new CustomPaintElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER CUSTOM PAINT
// ============================================================================

class RenderCustomPaint {
    constructor({
        painter = null,
        foregroundPainter = null,
        preferredSize = null,
        isComplex = false,
        willChange = false
    } = {}) {
        this.painter = painter;
        this.foregroundPainter = foregroundPainter;
        this.preferredSize = preferredSize || { width: 0, height: 0 };
        this.isComplex = isComplex;
        this.willChange = willChange;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderCustomPaint',
            hasPainter: !!this.painter,
            hasForegroundPainter: !!this.foregroundPainter,
            preferredSize: `${this.preferredSize.width}x${this.preferredSize.height}`,
            isComplex: this.isComplex,
            willChange: this.willChange
        };
    }
}

// ============================================================================
// CUSTOM PAINT ELEMENT
// ============================================================================

class CustomPaintElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

export { BackdropFilter, RenderBackdropFilter, CustomPaint, RenderCustomPaint };