import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { buildChildWidget } from '../utils/build_helper.js';

const SnackBarClosedReason = {
    hide: 'hide',
    remove: 'remove',
    timeout: 'timeout',
    dismiss: 'dismiss'
};

class SnackBar extends StatelessWidget {
    constructor({
        key = null,
        content = null,
        backgroundColor = null,
        elevation = 6,
        margin = null,
        padding = null,
        width = null,
        shape = null,
        behavior = 'fixed',
        action = null,
        duration = 4000,
        animation = null,
        onVisible = null
    } = {}) {
        super(key);
        this.content = content;
        this.backgroundColor = backgroundColor || '#323232';
        this.elevation = elevation;
        this.margin = margin;
        this.padding = padding;
        this.width = width;
        this.shape = shape;
        this.behavior = behavior;
        this.action = action;
        this.duration = duration;
        this.animation = animation;
        this.onVisible = onVisible;
    }

    build(context) {
        const style = {
            backgroundColor: this.backgroundColor,
            padding: this.padding ? `${this.padding}px` : '14px 16px',
            borderRadius: '4px',
            boxShadow: `0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            color: '#ffffff', // On Surface Inverse / On Inverse Surface typically
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '0.25px',
            minWidth: '288px',
            maxWidth: this.width ? `${this.width}px` : '568px',
            pointerEvents: 'auto'
        };

        if (this.margin) {
            style.margin = `${this.margin}px`;
        }

        // Build content
        let contentVNode;
        if (this.content.build || this.content.createElement) {
            contentVNode = buildChildWidget(this.content, context);
        } else {
            contentVNode = new VNode({ tag: 'span', children: [String(this.content)] });
        }

        const children = [
            new VNode({
                tag: 'div',
                props: { style: { flex: 1, paddingRight: this.action ? '8px' : '0' } },
                children: [contentVNode]
            })
        ];

        if (this.action) {
            const actionStyle = {
                color: this.action.textColor || '#BB86FC', // Secondary color
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                padding: '0 8px',
                margin: '0 -8px 0 0',
                fontSize: '14px',
                fontWeight: '500',
                letterSpacing: '1.25px',
                textTransform: 'uppercase',
                outline: 'none'
            };

            children.push(
                new VNode({
                    tag: 'button',
                    props: {
                        className: 'fjs-snack-bar-action',
                        style: actionStyle,
                        onClick: this.action.onPressed
                    },
                    children: [this.action.label]
                })
            );
        }

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-widget': 'SnackBar',
                role: 'alert'
            },
            children
        });
    }
}

class SnackBarAction {
    constructor({ key, label, onPressed, textColor, disabledTextColor } = {}) {
        this.key = key;
        this.label = label;
        this.onPressed = onPressed;
        this.textColor = textColor;
        this.disabledTextColor = disabledTextColor;
    }
}

export { SnackBar, SnackBarAction, SnackBarClosedReason };
