// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { CustomClipper } from './clip.js';
import {Clip,BoxShape,Color } from '../../utils/utils.js';


// ============================================================================
// PHYSICAL MODEL WIDGET
// Creates a physical material with elevation and color
// ============================================================================

class PhysicalModel extends ProxyWidget {
    constructor({
        key = null,
        shape = BoxShape.rectangle,
        clipBehavior = Clip.none,
        borderRadius = null,
        elevation = 0.0,
        color = null,
        shadowColor = null,
        child = null
    } = {}) {
        super({ key, child });

        if (elevation < 0.0) {
            throw new Error(`elevation must be >= 0.0, got: ${elevation}`);
        }

        if (!Object.values(BoxShape).includes(shape)) {
            throw new Error(`Invalid BoxShape: ${shape}`);
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(`Invalid clipBehavior: ${clipBehavior}`);
        }

        this.shape = shape;
        this.clipBehavior = clipBehavior;
        this.borderRadius = borderRadius || { all: 0 };
        this.elevation = elevation;
        this.color = color || new Color('#FFFFFF');
        this.shadowColor = shadowColor || new Color('#FF000000');
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderPhysicalModel({
            shape: this.shape,
            clipBehavior: this.clipBehavior,
            borderRadius: this.borderRadius,
            elevation: this.elevation,
            color: this.color,
            shadowColor: this.shadowColor
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.shape = this.shape;
        renderObject.clipBehavior = this.clipBehavior;
        renderObject.borderRadius = this.borderRadius;
        renderObject.elevation = this.elevation;
        renderObject.color = this.color;
        renderObject.shadowColor = this.shadowColor;
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

        // Generate box shadow based on elevation
        const boxShadow = this._generateBoxShadow();

        // Generate border radius
        const borderRadiusCss = this._getBorderRadiusCSS();

        // Generate clip path for shape
        const borderRadiusValue = this.shape === BoxShape.circle ? '50%' : borderRadiusCss;

        // Overflow handling
        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

        const style = {
            backgroundColor: this.color.toCSSString(),
            boxShadow: boxShadow,
            borderRadius: borderRadiusValue,
            overflow: overflowValue,
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'PhysicalModel',
                'data-shape': this.shape,
                'data-elevation': this.elevation,
                'data-clip-behavior': this.clipBehavior
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Generate box shadow based on elevation
     * @private
     */
    _generateBoxShadow() {
        if (this.elevation === 0) {
            return 'none';
        }

        // Material Design elevation mapping
        // Higher elevation = larger blur and offset
        const shadows = [];
        const shadowAlpha = 0.2;
        const penumbraAlpha = 0.14;
        const umbraAlpha = 0.12;

        // Umbra shadow (darkest, closest)
        const umbraBlur = Math.round(this.elevation);
        const umbraOffset = Math.round(this.elevation * 0.5);
        shadows.push(
            `0 ${umbraOffset}px ${umbraBlur}px rgba(0, 0, 0, ${umbraAlpha})`
        );

        // Penumbra shadow (medium)
        const penumbraBlur = Math.round(this.elevation * 1.5);
        const penumbraOffset = Math.round(this.elevation * 0.75);
        shadows.push(
            `0 ${penumbraOffset}px ${penumbraBlur}px rgba(0, 0, 0, ${penumbraAlpha})`
        );

        // Ambient shadow (lightest, farthest)
        const ambientBlur = Math.round(this.elevation * 2);
        shadows.push(
            `0 0 ${ambientBlur}px rgba(0, 0, 0, ${shadowAlpha})`
        );

        return shadows.join(', ');
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
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'shape', value: this.shape });
        properties.push({ name: 'elevation', value: this.elevation });
        properties.push({ name: 'color', value: this.color.toString() });
        properties.push({ name: 'shadowColor', value: this.shadowColor.toString() });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new PhysicalModelElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER PHYSICAL MODEL
// ============================================================================

class RenderPhysicalModel {
    constructor({
        shape = BoxShape.rectangle,
        clipBehavior = Clip.none,
        borderRadius = null,
        elevation = 0.0,
        color = null,
        shadowColor = null
    } = {}) {
        this.shape = shape;
        this.clipBehavior = clipBehavior;
        this.borderRadius = borderRadius || { all: 0 };
        this.elevation = elevation;
        this.color = color;
        this.shadowColor = shadowColor;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderPhysicalModel',
            shape: this.shape,
            elevation: this.elevation,
            clipBehavior: this.clipBehavior,
            color: this.color?.toString(),
            shadowColor: this.shadowColor?.toString()
        };
    }
}

// ============================================================================
// PHYSICAL MODEL ELEMENT
// ============================================================================

class PhysicalModelElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// PHYSICAL SHAPE WIDGET
// Creates a physical shape with custom clipper
// ============================================================================

class PhysicalShape extends ProxyWidget {
    constructor({
        key = null,
        clipper = null,
        clipBehavior = Clip.none,
        elevation = 0.0,
        color = null,
        shadowColor = null,
        child = null
    } = {}) {
        super({ key, child });

        if (!clipper) {
            throw new Error('PhysicalShape requires a clipper');
        }

        if (!(clipper instanceof CustomClipper)) {
            throw new Error(
                `PhysicalShape requires a CustomClipper instance, got: ${typeof clipper}`
            );
        }

        if (elevation < 0.0) {
            throw new Error(`elevation must be >= 0.0, got: ${elevation}`);
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(`Invalid clipBehavior: ${clipBehavior}`);
        }

        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this.elevation = elevation;
        this.color = color || new Color('#FFFFFF');
        this.shadowColor = shadowColor || new Color('#FF000000');
        this._renderObject = null;
        this._containerElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderPhysicalShape({
            clipper: this.clipper,
            clipBehavior: this.clipBehavior,
            elevation: this.elevation,
            color: this.color,
            shadowColor: this.shadowColor
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.clipper = this.clipper;
        renderObject.clipBehavior = this.clipBehavior;
        renderObject.elevation = this.elevation;
        renderObject.color = this.color;
        renderObject.shadowColor = this.shadowColor;
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
            const childElement = this.child.createElement(context.element, context.element.runtime);
            childElement.mount(context.element);
            childVNode = childElement.performRebuild();
        }

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        // Generate box shadow based on elevation
        const boxShadow = this._generateBoxShadow();

        // Overflow handling
        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

        const style = {
            backgroundColor: this.color.toCSSString(),
            boxShadow: boxShadow,
            overflow: overflowValue,
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'PhysicalShape',
                'data-elevation': this.elevation,
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
        if (!el || !this.clipper) return;

        this._containerElement = el;
        this._applyClipper();

        // Re-apply on resize
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
            console.error('Error applying physical shape clipper:', error);
        }
    }

    /**
     * Generate box shadow based on elevation
     * @private
     */
    _generateBoxShadow() {
        if (this.elevation === 0) {
            return 'none';
        }

        const shadows = [];
        const umbraBlur = Math.round(this.elevation);
        const umbraOffset = Math.round(this.elevation * 0.5);
        shadows.push(`0 ${umbraOffset}px ${umbraBlur}px rgba(0, 0, 0, 0.12)`);

        const penumbraBlur = Math.round(this.elevation * 1.5);
        const penumbraOffset = Math.round(this.elevation * 0.75);
        shadows.push(`0 ${penumbraOffset}px ${penumbraBlur}px rgba(0, 0, 0, 0.14)`);

        const ambientBlur = Math.round(this.elevation * 2);
        shadows.push(`0 0 ${ambientBlur}px rgba(0, 0, 0, 0.2)`);

        return shadows.join(', ');
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'hasClipper', value: !!this.clipper });
        properties.push({ name: 'elevation', value: this.elevation });
        properties.push({ name: 'color', value: this.color.toString() });
        properties.push({ name: 'shadowColor', value: this.shadowColor.toString() });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new PhysicalShapeElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER PHYSICAL SHAPE
// ============================================================================

class RenderPhysicalShape {
    constructor({
        clipper = null,
        clipBehavior = Clip.none,
        elevation = 0.0,
        color = null,
        shadowColor = null
    } = {}) {
        this.clipper = clipper;
        this.clipBehavior = clipBehavior;
        this.elevation = elevation;
        this.color = color;
        this.shadowColor = shadowColor;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderPhysicalShape',
            hasClipper: !!this.clipper,
            elevation: this.elevation,
            clipBehavior: this.clipBehavior,
            color: this.color?.toString(),
            shadowColor: this.shadowColor?.toString()
        };
    }
}

// ============================================================================
// PHYSICAL SHAPE ELEMENT
// ============================================================================

class PhysicalShapeElement extends ProxyWidget.constructor.prototype.constructor {
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

export { PhysicalModel, RenderPhysicalModel, PhysicalShape, RenderPhysicalShape,  };