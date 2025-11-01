import { InheritedWidget, InheritedElement, ProxyWidget } from '../core/widget.js';
import { TextDirection } from '../utils.js';

import { VNode } from '../core/vdom/vnode.js';
// ============================================================================
// UBIQUITOUS INHERITED ELEMENT
// Notifies all descendants instead of just direct dependents
// Used for framework-level concerns (Directionality, Locale, etc.)
// ============================================================================

class UbiquitousInheritedElement extends InheritedElement {
    constructor(widget) {
        super(widget);
        this._dependencies = new Map();
    }

    /**
     * Track dependencies (always null for ubiquitous widgets)
     */
    setDependencies(dependent, value) {
        // Ubiquitous widgets don't track specific dependencies
        // All descendants are considered dependent
    }

    /**
     * Get dependencies (always null for ubiquitous widgets)
     */
    getDependencies(dependent) {
        return null;
    }

    /**
     * Notify all clients in the subtree
     * Recursively visits entire subtree and notifies listening elements
     */
    notifyDependents(oldWidget = null) {
        const oldInheritedWidget = oldWidget || this.widget;

        // Recursively notify all descendants
        this._recurseChildren((element) => {
            if (this._doesDependOnInheritedElement(element)) {
                this._notifyDependent(oldInheritedWidget, element);
            }
        });
    }

    /**
     * Recursively visit all children in the subtree
     * @private
     */
    _recurseChildren(visitor) {
        // Visit all children first
        this.visitChildren((child) => {
            this._recurseChildrenHelper(child, visitor);
        });

        // Then call visitor on self
        visitor(this);
    }

    /**
     * Helper to recursively traverse the tree
     * @private
     */
    _recurseChildrenHelper(element, visitor) {
        if (!element) return;

        // Recursively visit children
        if (element.visitChildren) {
            element.visitChildren((child) => {
                this._recurseChildrenHelper(child, visitor);
            });
        }

        // Visit this element
        visitor(element);
    }

    /**
     * Check if an element depends on this inherited widget
     * @private
     */
    _doesDependOnInheritedElement(element) {
        // Check if element is in the dependent set
        return this._dependents.has(element);
    }

    /**
     * Notify a dependent element
     * @private
     */
    _notifyDependent(oldWidget, dependent) {
        if (dependent && dependent._mounted && !dependent._deactivated) {
            // Call didChangeDependencies on the dependent
            if (dependent.didChangeDependencies) {
                dependent.didChangeDependencies();
            } else if (dependent.state && dependent.state.didChangeDependencies) {
                dependent.state.didChangeDependencies();
            }
        }
    }

    /**
     * Override performRebuild to update all dependents
     */
    performRebuild() {
        const shouldNotify = !this._child ||
            this.widget.updateShouldNotify(this._child.widget);

        const result = super.performRebuild();

        if (shouldNotify) {
            this.notifyDependents();
        }

        return result;
    }

    /**
     * Debug properties for ubiquitous inherited element
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({
            name: 'dependentCount',
            value: this._dependents.size
        });
    }
}

// ============================================================================
// UBIQUITOUS INHERITED WIDGET BASE CLASS
// ============================================================================

class UbiquitousInheritedWidget extends InheritedWidget {
    constructor({ key = null, child = null } = {}) {
        super({ key, child });

        if (new.target === UbiquitousInheritedWidget) {
            throw new Error('UbiquitousInheritedWidget is abstract');
        }
    }

    /**
     * Create ubiquitous inherited element
     */
    createElement() {
        return new UbiquitousInheritedElement(this);
    }

    /**
     * Override in subclasses
     */
    updateShouldNotify(oldWidget) {
        throw new Error(
            `${this.constructor.name}.updateShouldNotify() must be implemented`
        );
    }
}

// ============================================================================
// DIRECTIONALITY WIDGET
// Provides text direction (LTR/RTL) to all descendants
// ============================================================================


class Directionality extends UbiquitousInheritedWidget {
    constructor({ key = null, textDirection = TextDirection.ltr, child = null } = {}) {
        super({ key, child });

        if (!Object.values(TextDirection).includes(textDirection)) {
            throw new Error(
                `Invalid textDirection: ${textDirection}. ` +
                `Must be one of: ${Object.values(TextDirection).join(', ')}`
            );
        }

        this.textDirection = textDirection;
    }

    /**
     * Get Directionality from context
     * Throws if not found
     */
    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(Directionality);

        if (!widget) {
            throw new Error(
                'Directionality.of() called with a context that does not contain a Directionality widget. ' +
                'Make sure to wrap your widget tree with a Directionality widget at the root.'
            );
        }

        return widget.textDirection;
    }

    /**
     * Get Directionality from context (returns null if not found)
     */
    static maybeOf(context) {
        const widget = context.getInheritedWidgetOfExactType(Directionality);
        return widget?.textDirection || null;
    }

    /**
     * Determine if should notify dependents on update
     */
    updateShouldNotify(oldWidget) {
        return this.textDirection !== oldWidget.textDirection;
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({
            name: 'textDirection',
            value: this.textDirection
        });
    }

    /**
     * Create element
     */
    createElement() {
        return new UbiquitousInheritedElement(this);
    }
}




// ============================================================================
// BLEND MODE CONSTANTS
// ============================================================================

const BlendMode = {
    clear: 'clear',
    src: 'src',
    dst: 'dst',
    srcOver: 'source-over',
    dstOver: 'destination-over',
    srcIn: 'source-in',
    dstIn: 'destination-in',
    srcOut: 'source-out',
    dstOut: 'destination-out',
    srcATop: 'source-atop',
    dstATop: 'destination-atop',
    xor: 'xor',
    plus: 'lighter',
    modulate: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    colorDodge: 'color-dodge',
    colorBurn: 'color-burn',
    hardLight: 'hard-light',
    softLight: 'soft-light',
    difference: 'difference',
    exclusion: 'exclusion',
    multiply: 'multiply',
    hue: 'hue',
    saturation: 'saturation',
    color: 'color',
    luminosity: 'luminosity'
};

// ============================================================================
// OPACITY WIDGET
// Applies opacity (transparency) to child widget
// ============================================================================

class Opacity extends ProxyWidget {
    constructor({ key = null, opacity = 1.0, alwaysIncludeSemantics = false, child = null } = {}) {
        super({ key, child });

        // Validate opacity is between 0 and 1
        if (typeof opacity !== 'number' || opacity < 0.0 || opacity > 1.0) {
            throw new Error(
                `Opacity must be between 0.0 and 1.0, got: ${opacity}`
            );
        }

        this.opacity = opacity;
        this.alwaysIncludeSemantics = alwaysIncludeSemantics;
        this._renderObject = null;
    }

    /**
     * Create render object (in this case, a VNode with opacity styling)
     */
    createRenderObject(context) {
        return new RenderOpacity({
            opacity: this.opacity,
            alwaysIncludeSemantics: this.alwaysIncludeSemantics
        });
    }

    /**
     * Update render object when widget properties change
     */
    updateRenderObject(context, renderObject) {
        renderObject.opacity = this.opacity;
        renderObject.alwaysIncludeSemantics = this.alwaysIncludeSemantics;
    }

    /**
     * Build the widget tree
     */
    build(context) {
        // Create or update render object
        if (!this._renderObject) {
            this._renderObject = this.createRenderObject(context);
        } else {
            this.updateRenderObject(context, this._renderObject);
        }

        // Build child widget
        let childVNode = null;
        if (this.child) {
            if (this.child.createElement) {
                const childElement = this.child.createElement();
                childElement.mount(context.element);
                childVNode = childElement.performRebuild();
            } else {
                childVNode = this.child;
            }
        }

        // Apply opacity styling
        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    opacity: this.opacity,
                    transition: 'opacity 0.2s ease-in-out'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'Opacity',
                'data-opacity': this.opacity,
                'data-always-include-semantics': this.alwaysIncludeSemantics,
                role: this.alwaysIncludeSemantics ? 'img' : undefined,
                'aria-opacity': this.alwaysIncludeSemantics ? this.opacity : undefined
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
            name: 'opacity',
            value: this.opacity
        });

        if (this.alwaysIncludeSemantics) {
            properties.push({
                name: 'alwaysIncludeSemantics',
                value: this.alwaysIncludeSemantics,
                tooltip: 'Include semantics even with 0 opacity'
            });
        }
    }

    /**
     * Create element
     */
    createElement() {
        return new OpacityElement(this);
    }
}

// ============================================================================
// RENDER OPACITY
// Represents the render object for opacity transformation
// ============================================================================

class RenderOpacity {
    constructor({ opacity = 1.0, alwaysIncludeSemantics = false } = {}) {
        this.opacity = opacity;
        this.alwaysIncludeSemantics = alwaysIncludeSemantics;
    }

    /**
     * Apply opacity to a DOM element
     */
    applyToElement(element) {
        if (element) {
            element.style.opacity = this.opacity;
        }
    }

    /**
     * Get debug info
     */
    debugInfo() {
        return {
            type: 'RenderOpacity',
            opacity: this.opacity,
            alwaysIncludeSemantics: this.alwaysIncludeSemantics
        };
    }
}

// ============================================================================
// OPACITY ELEMENT
// Element for opacity widget
// ============================================================================

class OpacityElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// SHADER MASK WIDGET
// Applies a shader mask (canvas-based) to child widget
// ============================================================================

class ShaderMask extends ProxyWidget {
    constructor({ key = null, shaderCallback = null, blendMode = BlendMode.modulate, child = null } = {}) {
        super({ key, child });

        if (typeof shaderCallback !== 'function') {
            throw new Error(
                `ShaderMask requires a shaderCallback function, got: ${typeof shaderCallback}`
            );
        }

        if (!Object.values(BlendMode).includes(blendMode)) {
            throw new Error(
                `Invalid blendMode: ${blendMode}`
            );
        }

        this.shaderCallback = shaderCallback;
        this.blendMode = blendMode;
        this._renderObject = null;
        this._canvas = null;
    }

    /**
     * Create render object for shader mask
     */
    createRenderObject(context) {
        return new RenderShaderMask({
            shaderCallback: this.shaderCallback,
            blendMode: this.blendMode
        });
    }

    /**
     * Update render object when properties change
     */
    updateRenderObject(context, renderObject) {
        renderObject.shaderCallback = this.shaderCallback;
        renderObject.blendMode = this.blendMode;
    }

    /**
     * Build the widget tree
     */
    build(context) {
        // Create or update render object
        if (!this._renderObject) {
            this._renderObject = this.createRenderObject(context);
        } else {
            this.updateRenderObject(context, this._renderObject);
        }

        // Build child widget
        let childVNode = null;
        if (this.child) {
            if (this.child.createElement) {
                const childElement = this.child.createElement();
                childElement.mount(context.element);
                childVNode = childElement.performRebuild();
            } else {
                childVNode = this.child;
            }
        }

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    mixBlendMode: this.blendMode,
                    position: 'relative',
                    overflow: 'hidden'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ShaderMask',
                'data-blend-mode': this.blendMode
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
            name: 'blendMode',
            value: this.blendMode
        });
        properties.push({
            name: 'shaderCallback',
            value: 'function'
        });
    }

    /**
     * Create element
     */
    createElement() {
        return new ShaderMaskElement(this);
    }
}

// ============================================================================
// RENDER SHADER MASK
// Represents the render object for shader mask transformation
// ============================================================================

class RenderShaderMask {
    constructor({ shaderCallback = null, blendMode = BlendMode.modulate } = {}) {
        this.shaderCallback = shaderCallback;
        this.blendMode = blendMode;
    }

    /**
     * Apply shader mask to a DOM element
     */
    applyToElement(element) {
        if (element) {
            element.style.mixBlendMode = this.blendMode;
            element.style.position = 'relative';
        }
    }

    /**
     * Generate shader gradient (simplified implementation)
     */
    generateShaderGradient(size) {
        try {
            return this.shaderCallback(size);
        } catch (error) {
            console.error('Error in shaderCallback:', error);
            return null;
        }
    }

    /**
     * Get debug info
     */
    debugInfo() {
        return {
            type: 'RenderShaderMask',
            blendMode: this.blendMode,
            hasShaderCallback: typeof this.shaderCallback === 'function'
        };
    }
}

// ============================================================================
// SHADER MASK ELEMENT
// Element for shader mask widget
// ============================================================================

class ShaderMaskElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// BACKDROP KEY
// Unique identifier for backdrop group
// ============================================================================

class BackdropKey {
    constructor(debugLabel = null) {
        this.debugLabel = debugLabel;
        this._id = Math.random().toString(36).substr(2, 9);
    }

    equals(other) {
        return other instanceof BackdropKey && this._id === other._id;
    }

    toString() {
        return `BackdropKey${this.debugLabel ? `(${this.debugLabel})` : ''}`;
    }
}

// ============================================================================
// BACKDROP GROUP
// Inherited widget that groups backdrop-related widgets
// Provides backdrop context to all descendants
// ============================================================================

class BackdropGroup extends InheritedWidget {
    constructor({ key = null, child = null, backdropKey = null } = {}) {
        super({ key, child });

        // Create or use provided backdrop key
        this.backdropKey = backdropKey || new BackdropKey();

        // Validate child
        if (!child) {
            throw new Error('BackdropGroup requires a child widget');
        }
    }

    /**
     * Check if should notify dependents
     */
    updateShouldNotify(oldWidget) {
        // Notify if backdrop key changes
        return !this.backdropKey.equals(oldWidget.backdropKey);
    }

    /**
     * Get BackdropGroup from context
     * Returns null if not found
     */
    static of(context) {
        return context.getInheritedWidgetOfExactType(BackdropGroup) || null;
    }

    /**
     * Get BackdropGroup from context (throws if not found)
     */
    static maybeOf(context) {
        return context.dependOnInheritedWidgetOfExactType(BackdropGroup) || null;
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({
            name: 'backdropKey',
            value: this.backdropKey.toString()
        });
    }

    /**
     * Create element
     */
    createElement() {
        return new BackdropGroupElement(this);
    }
}

// ============================================================================
// BACKDROP GROUP ELEMENT
// Element for backdrop group widget
// ============================================================================

class BackdropGroupElement extends InheritedWidget.constructor.prototype.constructor {
    performRebuild() {
        // Build child
        let childVNode = null;
        if (this.widget.child) {
            const childElement = this.widget.child.createElement();
            childElement.mount(this);
            childVNode = childElement.performRebuild();
        }

        return new VNode({
            tag: 'div',
            props: {
                'data-widget': 'BackdropGroup',
                'data-backdrop-key': this.widget.backdropKey.toString()
            },
            children: childVNode ? [childVNode] : [],
            key: this.widget.key
        });
    }
}




// ============================================================================
// IMAGE FILTER
// ============================================================================

class ImageFilter {
    constructor(type = 'blur', values = {}) {
        this.type = type;
        this.values = values;
    }

    static blur({ sigmaX = 0, sigmaY = 0 } = {}) {
        return new ImageFilter('blur', { sigmaX, sigmaY });
    }

    static matrix(values) {
        return new ImageFilter('matrix', values);
    }

    toCSSFilter() {
        switch (this.type) {
            case 'blur':
                return `blur(${Math.max(this.values.sigmaX, this.values.sigmaY)}px)`;
            case 'matrix':
                return `matrix(${Object.values(this.values).join(', ')})`;
            default:
                return 'none';
        }
    }

    toString() {
        return `ImageFilter(${this.type}, ${JSON.stringify(this.values)})`;
    }
}

// ============================================================================
// CUSTOM CLIPPER BASE CLASS
// ============================================================================

class CustomClipper {
    constructor() {
        if (new.target === CustomClipper) {
            throw new Error('CustomClipper is abstract');
        }
    }

    /**
     * Get the clip path
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
// CUSTOM PAINTER BASE CLASS
// ============================================================================

class CustomPainter {
    constructor() {
        if (new.target === CustomPainter) {
            throw new Error('CustomPainter is abstract');
        }
    }

    /**
     * Paint on canvas
     * Override in subclasses
     */
    paint(canvas, size) {
        throw new Error('paint() must be implemented');
    }

    /**
     * Check if should repaint
     */
    shouldRepaint(oldPainter) {
        return true;
    }

    /**
     * Get semantic bounds
     */
    getSemanticBounds(size) {
        return {
            left: 0,
            top: 0,
            right: size.width,
            bottom: size.height
        };
    }
}

// ============================================================================
// BACKDROP FILTER WIDGET
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
            const group = BackdropGroup.maybeOf(context);
            return group?.backdropKey || null;
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
            const childElement = this.child.createElement();
            childElement.mount(context.element);
            childVNode = childElement.performRebuild();
        }

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    backdropFilter: this.enabled ? this.filter.toCSSFilter() : 'none',
                    mixBlendMode: this.blendMode,
                    WebkitBackdropFilter: this.enabled ? this.filter.toCSSFilter() : 'none'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'BackdropFilter',
                'data-enabled': this.enabled,
                'data-blend-mode': this.blendMode
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'filter', value: this.filter.toString() });
        properties.push({ name: 'blendMode', value: this.blendMode });
        properties.push({ name: 'enabled', value: this.enabled });
    }

    createElement() {
        return new BackdropFilterElement(this);
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

        // Validate: at least one painter must be provided, or neither complex nor willChange
        if (!painter && !foregroundPainter && (isComplex || willChange)) {
            throw new Error(
                'CustomPaint requires a painter or foregroundPainter, ' +
                'or isComplex and willChange must both be false'
            );
        }

        this.painter = painter;
        this.foregroundPainter = foregroundPainter;
        this.size = size || Size.zero;
        this.isComplex = isComplex;
        this.willChange = willChange;
        this._renderObject = null;
        this._canvas = null;
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
     * Unmount render object and clean up
     */
    unmountRenderObject(renderObject) {
        renderObject.painter = null;
        renderObject.foregroundPainter = null;
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

        const style = {
            position: 'relative',
            willChange: this.willChange ? 'contents' : 'auto'
        };

        if (!this.size.equals(Size.zero)) {
            style.width = `${this.size.width}px`;
            style.height = `${this.size.height}px`;
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
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'painter', value: this.painter ? 'function' : null });
        properties.push({ name: 'foregroundPainter', value: this.foregroundPainter ? 'function' : null });
        properties.push({ name: 'size', value: this.size.toString() });
        properties.push({ name: 'isComplex', value: this.isComplex });
        properties.push({ name: 'willChange', value: this.willChange });
    }

    createElement() {
        return new CustomPaintElement(this);
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
        this.preferredSize = preferredSize || Size.zero;
        this.isComplex = isComplex;
        this.willChange = willChange;
    }

    debugInfo() {
        return {
            type: 'RenderCustomPaint',
            hasPainter: !!this.painter,
            hasForegroundPainter: !!this.foregroundPainter,
            preferredSize: this.preferredSize.toString(),
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

// ============================================================================
// CLIP RECT WIDGET
// ============================================================================

class ClipRect extends ProxyWidget {
    constructor({
        key = null,
        clipper = null,
        clipBehavior = Clip.hardEdge,
        child = null
    } = {}) {
        super({ key, child });

        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
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

        const style = {
            overflow: this.clipBehavior === Clip.none ? 'visible' : 'hidden'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ClipRect',
                'data-clip-behavior': this.clipBehavior
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'clipper', value: this.clipper ? 'function' : null });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

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

        this.borderRadius = borderRadius || BorderRadius.zero;
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        const textDirection = Directionality.maybeOf(context);

        return new RenderClipRRect({
            borderRadius: this.borderRadius,
            clipper: this.clipper,
            clipBehavior: this.clipBehavior,
            textDirection: textDirection
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        const textDirection = Directionality.maybeOf(context);

        renderObject.borderRadius = this.borderRadius;
        renderObject.clipBehavior = this.clipBehavior;
        renderObject.clipper = this.clipper;
        renderObject.textDirection = textDirection;
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

        const style = {
            borderRadius: this.borderRadius.toCSSString(),
            overflow: this.clipBehavior === Clip.none ? 'visible' : 'hidden'
        };

        // Apply anti-alias rendering
        if (this.clipBehavior === Clip.antiAlias || this.clipBehavior === Clip.antiAliasWithSaveLayer) {
            style.WebkitMaskImage = 'radial-gradient(circle, transparent 0%, black 100%)';
        }

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ClipRRect',
                'data-border-radius': this.borderRadius.toString(),
                'data-clip-behavior': this.clipBehavior
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'borderRadius', value: this.borderRadius.toString() });
        properties.push({ name: 'clipper', value: this.clipper ? 'function' : null });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

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
        clipBehavior = Clip.antiAlias,
        textDirection = null
    } = {}) {
        this.borderRadius = borderRadius || BorderRadius.zero;
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this.textDirection = textDirection;
    }

    debugInfo() {
        return {
            type: 'RenderClipRRect',
            borderRadius: this.borderRadius.toString(),
            hasClipper: !!this.clipper,
            clipBehavior: this.clipBehavior,
            textDirection: this.textDirection
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
}

// ============================================================================
// EXPORTS
// ============================================================================


// ============================================================================
// EXPORTS
// ============================================================================

export {
    BlendMode,
    Opacity,
    RenderOpacity,
    OpacityElement,
    ShaderMask,
    RenderShaderMask,
    ShaderMaskElement,
    BackdropKey,
    BackdropGroup,
    BackdropGroupElement,
    UbiquitousInheritedElement,
    UbiquitousInheritedWidget,
    Directionality,
    ImageFilter,
    CustomClipper,
    CustomPainter,
    BackdropFilter,
    RenderBackdropFilter,
    BackdropFilterElement,
    CustomPaint,
    RenderCustomPaint,
    CustomPaintElement,
    ClipRect,
    RenderClipRect,
    ClipRectElement,
    ClipRRect,
    RenderClipRRect,
    ClipRRectElement
};