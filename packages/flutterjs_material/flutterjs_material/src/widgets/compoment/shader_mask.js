// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { BlendMode } from './opacity.js';

// ============================================================================
// SHADER MASK WIDGET - FLUTTER-LIKE BEHAVIOR
// Applies shader mask directly to child rendering (CSS mask-image)
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
        this._containerElement = null;
        this._maskImageUrl = null;
    }

    /**
     * Create render object for shader mask
     */
    createRenderObject(context) {
        return new RenderShaderMask({
            shaderCallback: this.shaderCallback,
            blendMode: this.blendMode,
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
                const childElement = this.child.createElement(context.element, context.element.runtime);
                childElement.mount(context.element);
                childVNode = childElement.performRebuild();
            } else {
                childVNode = this.child;
            }
        }

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        // Create container that applies mask to children
        // Similar to Flutter: the shader mask applies TO the child, not over it
        return new VNode({
            tag: 'div',
            props: {
                style: {
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'inline-block'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ShaderMask',
                'data-blend-mode': this.blendMode,
                ref: (el) => this._onContainerMount(el, context)
            },
            children: [
                // Child content wrapper with mask applied
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'relative',
                            width: '100%',
                            height: '100%'
                        },
                        'data-widget': 'ShaderMaskContent',
                        ref: (el) => this._onContentMount(el)
                    },
                    children: childVNode ? [childVNode] : []
                })
            ],
            key: this.key
        });
    }

    /**
     * Mount container
     */
    _onContainerMount(el, context) {
        if (!el) return;

        this._containerElement = el;

        // Generate and apply shader mask when container is mounted
        if (this._containerElement) {
            this._generateAndApplyShaderMask();
        }

        // Re-render on window resize
        const resizeHandler = () => this._generateAndApplyShaderMask();
        window.addEventListener('resize', resizeHandler);

        // Cleanup on unmount
        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
        };
    }

    /**
     * Mount content element
     */
    _onContentMount(el) {
        if (!el) return;

        // Apply mask to content when it's mounted
        if (this._containerElement) {
            this._generateAndApplyShaderMask();
        }
    }

    /**
     * Generate shader mask and apply it to container
     */
    _generateAndApplyShaderMask() {
        if (!this._containerElement) return;

        try {
            // Get container dimensions
            const rect = this._containerElement.getBoundingClientRect();
            const size = {
                width: Math.ceil(rect.width) || 200,
                height: Math.ceil(rect.height) || 200
            };

            // Call shader callback to get shader configuration
            const shaderConfig = this.shaderCallback(size);

            // Apply shader mask to container (affects children rendering)
            this._applyShaderToContainer(shaderConfig, size);
        } catch (error) {
            console.error('Error rendering shader mask:', error);
        }
    }

    /**
     * Apply shader mask to container (Flutter-like behavior)
     * The mask is applied TO the child elements, not over them
     */
    _applyShaderToContainer(shaderConfig, size) {
        if (!this._containerElement || !shaderConfig) return;

        // Handle gradient-based masks (like Flutter)
        if (shaderConfig.type === 'gradient' && shaderConfig.gradient) {
            // Create SVG-based mask from gradient
            const maskSvg = this._createGradientMask(shaderConfig.gradient, size);
            this._applyMaskImage(maskSvg);
        }

        // Handle SVG-based masks
        if (shaderConfig.type === 'svg' && shaderConfig.svgContent) {
            // Use SVG directly as mask
            this._applyMaskImage(`url('data:image/svg+xml;utf8,${encodeURIComponent(shaderConfig.svgContent)}')`);
        }

        // Handle URL-based masks
        if (shaderConfig.type === 'url' && shaderConfig.url) {
            this._applyMaskImage(`url('${shaderConfig.url}')`);
        }

        // Handle custom mask-image CSS
        if (shaderConfig.maskImage) {
            this._applyMaskImage(shaderConfig.maskImage);
        }

        // Apply blend mode if needed
        if (this.blendMode) {
            this._containerElement.style.mixBlendMode = this.blendMode;
        }
    }

    /**
     * Apply mask-image to container
     */
    _applyMaskImage(maskImage) {
        if (!this._containerElement || !maskImage) return;

        // Apply CSS mask (works on all modern browsers)
        this._containerElement.style.WebkitMaskImage = maskImage;
        this._containerElement.style.WebkitMaskSize = '100% 100%';
        this._containerElement.style.WebkitMaskRepeat = 'no-repeat';
        this._containerElement.style.WebkitMaskPosition = '0 0';

        // Standard mask properties
        this._containerElement.style.maskImage = maskImage;
        this._containerElement.style.maskSize = '100% 100%';
        this._containerElement.style.maskRepeat = 'no-repeat';
        this._containerElement.style.maskPosition = '0 0';

        this._maskImageUrl = maskImage;
    }

    /**
     * Create SVG-based gradient mask from gradient string
     */
    _createGradientMask(gradientCss, size) {
        // Parse gradient and create SVG mask
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', size.width);
        svg.setAttribute('height', size.height);
        svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);

        const defs = document.createElementNS(svgNS, 'defs');

        // Create gradient definition from CSS gradient
        const gradient = document.createElementNS(svgNS, 'linearGradient');
        gradient.setAttribute('id', 'maskGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '0%');

        // Parse simple gradient colors
        // For: linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))
        const colorStops = [
            { offset: '0%', color: '#000000', opacity: '1' },
            { offset: '100%', color: '#000000', opacity: '0' }
        ];

        colorStops.forEach(stop => {
            const stop_el = document.createElementNS(svgNS, 'stop');
            stop_el.setAttribute('offset', stop.offset);
            stop_el.setAttribute('stop-color', stop.color);
            stop_el.setAttribute('stop-opacity', stop.opacity);
            gradient.appendChild(stop_el);
        });

        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Create rect with gradient
        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('width', size.width);
        rect.setAttribute('height', size.height);
        rect.setAttribute('fill', 'url(#maskGradient)');
        svg.appendChild(rect);

        // Convert SVG to data URL
        const svgString = new XMLSerializer().serializeToString(svg);
        return `url('data:image/svg+xml;utf8,${encodeURIComponent(svgString)}')`;
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
        if (this._maskImageUrl) {
            properties.push({
                name: 'maskApplied',
                value: 'true'
            });
        }
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new ShaderMaskElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER SHADER MASK
// ============================================================================

class RenderShaderMask {
    constructor({ shaderCallback = null, blendMode = BlendMode.modulate } = {}) {
        this.shaderCallback = shaderCallback;
        this.blendMode = blendMode;
    }

    /**
     * Apply shader mask to element
     */
    applyToElement(element) {
        if (element) {
            element.style.position = 'relative';
            element.style.overflow = 'hidden';
        }
    }

    /**
     * Generate shader (calls the callback)
     */
    generateShader(size) {
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
// ============================================================================

class ShaderMaskElement extends ProxyWidget.constructor.prototype.constructor {
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

export { ShaderMask, RenderShaderMask };