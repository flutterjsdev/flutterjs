import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Color } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';

class AppBar extends StatelessWidget {
    constructor({
        key = null,
        leading = null,
        automaticallyImplyLeading = true,
        title = null,
        actions = null,
        flexibleSpace = null,
        bottom = null,
        elevation = 4.0,
        scrolledUnderElevation = null,
        notificationPredicate = null,
        shadowColor = null,
        surfaceTintColor = null,
        backgroundColor = null,
        foregroundColor = null,
        iconTheme = null,
        actionsIconTheme = null,
        primary = true,
        centerTitle = null,
        excludeHeaderSemantics = false,
        titleSpacing = null,
        toolbarOpacity = 1.0,
        bottomOpacity = 1.0,
        toolbarHeight = 56.0,
        leadingWidth = null,
        toolbarTextStyle = null,
        titleTextStyle = null,
        systemOverlayStyle = null
    } = {}) {
        super(key);
        this.leading = leading;
        this.automaticallyImplyLeading = automaticallyImplyLeading;
        this.title = title;
        this.actions = actions;
        this.flexibleSpace = flexibleSpace;
        this.bottom = bottom;
        this.elevation = elevation;
        this.scrolledUnderElevation = scrolledUnderElevation;
        this.shadowColor = shadowColor || 'rgba(0, 0, 0, 0.5)';
        this.surfaceTintColor = surfaceTintColor;
        this.backgroundColor = backgroundColor; // 'var(--md-sys-color-primary)'
        this.foregroundColor = foregroundColor;
        this.iconTheme = iconTheme;
        this.actionsIconTheme = actionsIconTheme;
        this.primary = primary;
        this.centerTitle = centerTitle;
        this.titleSpacing = titleSpacing;
        this.toolbarOpacity = toolbarOpacity;
        this.bottomOpacity = bottomOpacity;
        this.toolbarHeight = toolbarHeight;
        this.leadingWidth = leadingWidth;
        this.toolbarTextStyle = toolbarTextStyle;
        this.titleTextStyle = titleTextStyle;
    }

    build(context) {
        // Resolve background color
        let bgColor = this.backgroundColor;
        if (!bgColor) {
            bgColor = '#2196F3'; // Default Material Blue
        }

        // Resolve Title
        let titleVNode = null;
        if (this.title) {
            if (this.title.createElement) {
                // It's a widget - build it
                titleVNode = this.title.build(context);
            } else {
                // It's a string - wrap in VNode
                titleVNode = new VNode({
                    tag: 'span',
                    children: [String(this.title)]
                });
            }
        }

        // Resolve Actions
        let actionsVNodes = [];
        if (this.actions && this.actions.length > 0) {
            actionsVNodes = this.actions.map(action => action.build(context));
        }

        // Leading
        let leadingVNode = null;
        if (this.leading) {
            leadingVNode = this.leading.build(context);
        }

        return new VNode({
            tag: 'header',
            props: {
                className: 'fjs-app-bar',
                style: {
                    backgroundColor: bgColor,
                    color: this.foregroundColor || '#FFFFFF',
                    height: `${this.toolbarHeight}px`,
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: `0 ${this.elevation}px ${this.elevation * 2}px ${this.shadowColor}`,
                    position: 'relative',
                    zIndex: 110,
                    flexShrink: 0
                },
                'data-widget': 'AppBar'
            },
            children: [
                // Leading Container
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-app-bar-leading',
                        style: {
                            marginRight: this.titleSpacing ? `${this.titleSpacing}px` : '16px',
                            display: 'flex',
                            alignItems: 'center'
                        }
                    },
                    children: leadingVNode ? [leadingVNode] : []
                }),

                // Title Container
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-app-bar-title',
                        style: {
                            fontSize: '20px',
                            fontWeight: 500,
                            letterSpacing: '0.15px',
                            flex: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'flex',
                            justifyContent: this.centerTitle ? 'center' : 'flex-start'
                        }
                    },
                    children: titleVNode ? [titleVNode] : []
                }),

                // Actions Container
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-app-bar-actions',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    },
                    children: actionsVNodes
                })
            ]
        });
    }
}

export { AppBar };
