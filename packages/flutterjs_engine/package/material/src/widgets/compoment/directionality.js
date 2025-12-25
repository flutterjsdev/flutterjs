import { InheritedWidget } from '../../framework/inherited_widget.js';
import { InheritedElement } from '../../framework/inherited_element.js';
import { BlendMode } from '../painting/opacity.js';
import { VNode } from '@flutterjs/vdom/vnode';


// ============================================================================
// UBIQUITOUS INHERITED ELEMENT
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
        this.visitChildren((child) => {
            this._recurseChildrenHelper(child, visitor);
        });

        visitor(this);
    }

    /**
     * Helper to recursively traverse the tree
     * @private
     */
    _recurseChildrenHelper(element, visitor) {
        if (!element) return;

        if (element.visitChildren) {
            element.visitChildren((child) => {
                this._recurseChildrenHelper(child, visitor);
            });
        }

        visitor(element);
    }

    /**
     * Check if an element depends on this inherited widget
     * @private
     */
    _doesDependOnInheritedElement(element) {
        return this._dependents.has(element);
    }

    /**
     * Notify a dependent element
     * @private
     */
    _notifyDependent(oldWidget, dependent) {
        if (dependent && dependent._mounted && !dependent._deactivated) {
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
     * Debug properties
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
// SHADER MASK INHERITED WIDGET
// Provides shader mask configuration to all descendants
// ============================================================================

class ShaderMaskProvider extends UbiquitousInheritedWidget {
    constructor({ 
        key = null, 
        shaderCallback = null, 
        blendMode = BlendMode.modulate, 
        child = null 
    } = {}) {
        super({ key, child });

        if (shaderCallback && typeof shaderCallback !== 'function') {
            throw new Error(
                `ShaderMaskProvider requires a shaderCallback function, got: ${typeof shaderCallback}`
            );
        }

        if (blendMode && !Object.values(BlendMode).includes(blendMode)) {
            throw new Error(
                `Invalid blendMode: ${blendMode}`
            );
        }

        this.shaderCallback = shaderCallback;
        this.blendMode = blendMode;
        this._containerElement = null;
        this._maskImageUrl = null;
    }

    /**
     * Get ShaderMaskProvider from context
     * Throws if not found
     */
    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ShaderMaskProvider);

        if (!widget) {
            throw new Error(
                'ShaderMaskProvider.of() called with a context that does not contain a ShaderMaskProvider widget. ' +
                'Make sure to wrap your widget tree with a ShaderMaskProvider widget.'
            );
        }

        return widget;
    }

    /**
     * Get ShaderMaskProvider from context (returns null if not found)
     */
    static maybeOf(context) {
        const widget = context.getInheritedWidgetOfExactType(ShaderMaskProvider);
        return widget || null;
    }

    /**
     * Determine if should notify dependents on update
     */
    updateShouldNotify(oldWidget) {
        return this.shaderCallback !== oldWidget.shaderCallback ||
               this.blendMode !== oldWidget.blendMode;
    }

    /**
     * Build the widget tree
     */
    build(context) {
        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

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

        // Create container with shader mask support
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
                'data-widget': 'ShaderMaskProvider',
                'data-blend-mode': this.blendMode,
                ref: (el) => this._onContainerMount(el, context)
            },
            children: [
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'relative',
                            width: '100%',
                            height: '100%'
                        },
                        'data-widget': 'ShaderMaskContent'
                    },
                    children: childVNode ? [childVNode] : []
                })
            ],
            key: this.key
        });
    }

    /**
     * Mount container and apply shader mask
     */
    _onContainerMount(el, context) {
        if (!el) return;

        this._containerElement = el;

        if (this.shaderCallback && this._containerElement) {
            this._generateAndApplyShaderMask();
        }

        // Re-render on window resize
        const resizeHandler = () => {
            if (this.shaderCallback && this._containerElement) {
                this._generateAndApplyShaderMask();
            }
        };
        window.addEventListener('resize', resizeHandler);

        // Cleanup on unmount
        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
        };
    }

    /**
     * Generate shader mask and apply it to container
     */
    _generateAndApplyShaderMask() {
        if (!this._containerElement || !this.shaderCallback) return;

        try {
            // Get container dimensions
            const rect = this._containerElement.getBoundingClientRect();
            const size = {
                width: Math.ceil(rect.width) || 200,
                height: Math.ceil(rect.height) || 200
            };

            // Call shader callback to get shader configuration
            const shaderConfig = this.shaderCallback(size);

            // Apply shader mask to container
            this._applyShaderToContainer(shaderConfig, size);
        } catch (error) {
            console.error('Error rendering shader mask:', error);
        }
    }

    /**
     * Apply shader mask to container (Flutter-like behavior)
     */
    _applyShaderToContainer(shaderConfig, size) {
        if (!this._containerElement || !shaderConfig) return;

        // Handle gradient-based masks
        if (shaderConfig.type === 'gradient' && shaderConfig.gradient) {
            const maskSvg = this._createGradientMask(shaderConfig.gradient, size);
            this._applyMaskImage(maskSvg);
        }

        // Handle SVG-based masks
        if (shaderConfig.type === 'svg' && shaderConfig.svgContent) {
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

        this._containerElement.style.WebkitMaskImage = maskImage;
        this._containerElement.style.WebkitMaskSize = '100% 100%';
        this._containerElement.style.WebkitMaskRepeat = 'no-repeat';
        this._containerElement.style.WebkitMaskPosition = '0 0';

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
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', size.width);
        svg.setAttribute('height', size.height);
        svg.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);

        const defs = document.createElementNS(svgNS, 'defs');

        const gradient = document.createElementNS(svgNS, 'linearGradient');
        gradient.setAttribute('id', 'maskGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '0%');

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

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('width', size.width);
        rect.setAttribute('height', size.height);
        rect.setAttribute('fill', 'url(#maskGradient)');
        svg.appendChild(rect);

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
        if (this.shaderCallback) {
            properties.push({
                name: 'shaderCallback',
                value: 'function'
            });
        }
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
    createElement() {
        return new UbiquitousInheritedElement(this);
    }
}

export { ShaderMaskProvider, UbiquitousInheritedWidget, UbiquitousInheritedElement };
