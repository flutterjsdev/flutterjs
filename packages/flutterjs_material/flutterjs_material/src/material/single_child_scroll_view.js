import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Axis } from '../utils/property/axis.js';
import { EdgeInsets } from '../utils/edge_insets.js';

export class SingleChildScrollView extends StatelessWidget {
    constructor({
        key,
        scrollDirection = Axis.vertical,
        reverse = false,
        padding,
        primary,
        physics,
        controller,
        child
    } = {}) {
        super({ key });
        this.scrollDirection = scrollDirection;
        this.reverse = reverse;
        this.padding = padding;
        this.primary = primary;
        this.physics = physics;
        this.controller = controller;
        this.child = child;
    }

    build(context) {
        let paddingCss = '';
        if (this.padding) {
            if (this.padding instanceof EdgeInsets) {
                paddingCss = `${this.padding.top}px ${this.padding.right}px ${this.padding.bottom}px ${this.padding.left}px`;
            } else {
                paddingCss = `${this.padding.top || 0}px ${this.padding.right || 0}px ${this.padding.bottom || 0}px ${this.padding.left || 0}px`;
            }
        }

        const isHorizontal = this.scrollDirection === Axis.horizontal;

        const style = {
            overflowX: isHorizontal ? 'auto' : 'hidden',
            overflowY: isHorizontal ? 'hidden' : 'auto',
            display: 'block',
            height: '100%',
            width: '100%',
            padding: paddingCss
        };

        let childVNode = null;
        if (this.child) {
            const childElement = this.child.createElement(context.element, context.element.runtime);
            childElement.mount(context.element);
            childVNode = childElement.performRebuild();
        }

        return new VNode({
            tag: 'div',
            props: {
                className: 'fjs-single-child-scroll-view',
                style,
                'data-widget': 'SingleChildScrollView'
            },
            children: childVNode ? [childVNode] : []
        });
    }
}
