import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Color, MaterialColor } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Theme } from './theme.js';
import { buildChildWidget, buildChildWidgets } from '../utils/build_helper.js';

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
        const theme = Theme.of(context);

        // Use Theme primary color if no background color is provided
        if (!bgColor) {
            bgColor = theme.appBarTheme?.backgroundColor || theme.primaryColor;
        }

        // Handle MaterialColor/Color objects for Background
        if (bgColor && typeof bgColor.toCSSString === 'function') {
            bgColor = bgColor.toCSSString();
        } else if (bgColor && typeof bgColor === 'object' && bgColor.value) {
            // Fallback for plain objects that look like Colors
            const val = bgColor.value;
            const hex = val.toString(16).padStart(8, '0');
            bgColor = `#${hex.slice(2)}`;
        }

        if (!bgColor) {
            bgColor = '#2196F3'; // Fallback if theme also fails
        }

        let fgColor = this.foregroundColor;
        if (!fgColor) {
            fgColor = theme.appBarTheme?.foregroundColor;
        }

        if (!fgColor) {
            // Determine contrast color
            let isDark = false;
            if (bgColor && typeof bgColor.computeLuminance === 'function') {
                isDark = bgColor.computeLuminance() < 0.5;
            } else if (typeof bgColor === 'string' && bgColor.startsWith('#')) {
                // Create temp color to check luminance
                // Note: Color constructor parses hex string correctly for RGB extraction
                // even if alpha ends up being 0
                isDark = new Color(bgColor).computeLuminance() < 0.5;
            } else {
                // Fallback for names or complex vars (assume dark for safety or check specific knowns)
                isDark = bgColor === 'var(--md-sys-color-primary)' ||
                    (typeof bgColor === 'string' && bgColor.indexOf('blue') !== -1) ||
                    (typeof bgColor === 'string' && bgColor.indexOf('indigo') !== -1);
            }

            if (isDark) {
                fgColor = '#FFFFFF';
            } else {
                fgColor = '#000000';
            }
        }

        // Convert fgColor if it's a Color object
        if (fgColor && typeof fgColor.toCSSString === 'function') {
            fgColor = fgColor.toCSSString();
        }

        // Resolve Title
        let titleVNode = null;
        if (this.title) {
            if (this.title.createElement) {
                // It's a widget - build it properly
                titleVNode = buildChildWidget(this.title, context);
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
            actionsVNodes = buildChildWidgets(this.actions, context);
        }

        // Leading
        let leadingVNode = null;
        if (this.leading) {
            leadingVNode = buildChildWidget(this.leading, context);
        }

        return new VNode({
            tag: 'header',
            props: {
                className: 'fjs-app-bar',
                style: {
                    backgroundColor: bgColor,
                    color: fgColor,
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
