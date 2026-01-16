import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Dialog } from './dialog.js';

/**
 * SimpleDialog - Simpler dialog variant
 */
class SimpleDialog extends StatelessWidget {
    constructor({
        key = null,
        title = null,
        titlePadding = null,
        titleTextStyle = null,
        children = null,
        contentPadding = null,
        backgroundColor = null,
        elevation = 24.0,
        shadowColor = null,
        semanticLabel = null,
        insetPadding = null,
        clipBehavior = 'none',
        shape = null,
        alignment = null
    } = {}) {
        super(key);
        this.title = title;
        this.titlePadding = titlePadding || { top: 24, left: 24, right: 24, bottom: 0 };
        this.titleTextStyle = titleTextStyle;
        this.children = children || [];
        this.contentPadding = contentPadding || { top: 12, left: 0, right: 0, bottom: 16 };
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.semanticLabel = semanticLabel;
        this.insetPadding = insetPadding;
        this.clipBehavior = clipBehavior;
        this.shape = shape;
        this.alignment = alignment;
    }

    build(context) {
        const dialogChildren = [];

        // Title
        if (this.title) {
            const titleStyle = {
                padding: `${this.titlePadding.top}px ${this.titlePadding.right}px ${this.titlePadding.bottom}px ${this.titlePadding.left}px`,
                fontSize: this.titleTextStyle?.fontSize || '20px',
                fontWeight: this.titleTextStyle?.fontWeight || '500',
                color: this.titleTextStyle?.color || '#000000de'
            };

            dialogChildren.push(
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-simple-dialog-title',
                        style: titleStyle
                    },
                    children: [this.title]
                })
            );
        }

        // Content
        const contentStyle = {
            padding: `${this.contentPadding.top}px ${this.contentPadding.right}px ${this.contentPadding.bottom}px ${this.contentPadding.left}px`,
            display: 'flex',
            flexDirection: 'column'
        };

        const renderedChildren = this.children.map(child => {
            if (typeof child.build === 'function') {
                return child.build(context);
            }
            return child;
        });

        dialogChildren.push(
            new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-simple-dialog-content',
                    style: contentStyle
                },
                children: renderedChildren
            })
        );

        return new Dialog({
            backgroundColor: this.backgroundColor,
            elevation: this.elevation,
            insetPadding: this.insetPadding,
            clipBehavior: this.clipBehavior,
            shape: this.shape,
            alignment: this.alignment,
            child: new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-simple-dialog-container',
                    style: {
                        display: 'flex',
                        flexDirection: 'column'
                    },
                    'aria-label': this.semanticLabel || (typeof this.title === 'string' ? this.title : undefined),
                    'data-widget': 'SimpleDialog'
                },
                children: dialogChildren
            })
        });
    }
}

export { SimpleDialog };
