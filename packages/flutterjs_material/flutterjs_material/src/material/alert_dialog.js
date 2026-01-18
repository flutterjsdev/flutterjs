import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Dialog } from './dialog.js';
import { buildChildWidgets } from '../utils/build_helper.js';

/**
 * AlertDialog - Material Design alert dialog
 */
class AlertDialog extends StatelessWidget {
    constructor({
        key = null,
        icon = null,
        iconPadding = null,
        iconColor = null,
        title = null,
        titlePadding = null,
        titleTextStyle = null,
        content = null,
        contentPadding = null,
        contentTextStyle = null,
        actions = null,
        actionsPadding = null,
        actionsAlignment = null,
        actionsOverflowAlignment = null,
        actionsOverflowDirection = null,
        actionsOverflowButtonSpacing = null,
        buttonPadding = null,
        backgroundColor = null,
        elevation = 24.0,
        shadowColor = null,
        surfaceTintColor = null,
        semanticLabel = null,
        insetPadding = null,
        clipBehavior = 'none',
        shape = null,
        alignment = null,
        scrollable = false
    } = {}) {
        super(key);
        this.icon = icon;
        this.iconPadding = iconPadding;
        this.iconColor = iconColor;
        this.title = title;
        this.titlePadding = titlePadding || { top: 24, left: 24, right: 24, bottom: 0 };
        this.titleTextStyle = titleTextStyle;
        this.content = content;
        this.contentPadding = contentPadding || { top: 20, left: 24, right: 24, bottom: 24 };
        this.contentTextStyle = contentTextStyle;
        this.actions = actions;
        this.actionsPadding = actionsPadding || { top: 0, left: 8, right: 8, bottom: 8 };
        this.actionsAlignment = actionsAlignment || 'end';
        this.actionsOverflowAlignment = actionsOverflowAlignment;
        this.actionsOverflowDirection = actionsOverflowDirection;
        this.actionsOverflowButtonSpacing = actionsOverflowButtonSpacing;
        this.buttonPadding = buttonPadding;
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor || 'rgba(0, 0, 0, 0.2)';
        this.surfaceTintColor = surfaceTintColor;
        this.semanticLabel = semanticLabel;
        this.insetPadding = insetPadding;
        this.clipBehavior = clipBehavior;
        this.shape = shape;
        this.alignment = alignment;
        this.scrollable = scrollable;
    }

    build(context) {
        const elementId = context.element.getElementId();

        const children = [];

        // Icon (optional)
        if (this.icon) {
            const iconPadding = this.iconPadding || { top: 24, left: 24, right: 24, bottom: 0 };
            children.push(
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-alert-dialog-icon',
                        style: {
                            padding: `${iconPadding.top}px ${iconPadding.right}px ${iconPadding.bottom}px ${iconPadding.left}px`,
                            display: 'flex',
                            justifyContent: 'center',
                            color: this.iconColor || '#000000de'
                        }
                    },
                    children: [this.icon]
                })
            );
        }

        // Title (optional)
        if (this.title) {
            const titleStyle = {
                padding: `${this.titlePadding.top}px ${this.titlePadding.right}px ${this.titlePadding.bottom}px ${this.titlePadding.left}px`,
                fontSize: this.titleTextStyle?.fontSize || '20px',
                fontWeight: this.titleTextStyle?.fontWeight || '500',
                color: this.titleTextStyle?.color || '#000000de',
                lineHeight: '24px'
            };

            children.push(
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-alert-dialog-title',
                        style: titleStyle
                    },
                    children: [this.title]
                })
            );
        }

        // Content (optional)
        if (this.content) {
            const contentStyle = {
                padding: `${this.contentPadding.top}px ${this.contentPadding.right}px ${this.contentPadding.bottom}px ${this.contentPadding.left}px`,
                fontSize: this.contentTextStyle?.fontSize || '14px',
                fontWeight: this.contentTextStyle?.fontWeight || '400',
                color: this.contentTextStyle?.color || '#00000099',
                lineHeight: '20px',
                flex: this.scrollable ? '1 1 auto' : 'none',
                overflow: this.scrollable ? 'auto' : 'visible'
            };

            children.push(
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-alert-dialog-content',
                        style: contentStyle
                    },
                    children: [this.content]
                })
            );
        }

        // Actions (optional)
        if (this.actions && this.actions.length > 0) {
            const actionsStyle = {
                padding: `${this.actionsPadding.top}px ${this.actionsPadding.right}px ${this.actionsPadding.bottom}px ${this.actionsPadding.left}px`,
                display: 'flex',
                gap: '8px',
                justifyContent: this._getActionsAlignment(),
                flexWrap: 'wrap'
            };

            const actionChildren = buildChildWidgets(this.actions, context);

            children.push(
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-alert-dialog-actions',
                        style: actionsStyle
                    },
                    children: actionChildren
                })
            );
        }

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
                    className: 'fjs-alert-dialog-container',
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: '280px'
                    },
                    'aria-labelledby': this.title ? `${elementId}-title` : undefined,
                    'aria-describedby': this.content ? `${elementId}-content` : undefined,
                    'aria-label': this.semanticLabel,
                    'data-widget': 'AlertDialog'
                },
                children: children
            })
        });
    }

    _getActionsAlignment() {
        const alignmentMap = {
            start: 'flex-start',
            end: 'flex-end',
            center: 'center',
            spaceBetween: 'space-between',
            spaceAround: 'space-around',
            spaceEvenly: 'space-evenly'
        };
        return alignmentMap[this.actionsAlignment] || 'flex-end';
    }
}

export { AlertDialog };
