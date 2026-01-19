import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Color, MaterialColor } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Theme } from './theme.js';
import { buildChildWidget, buildChildWidgets } from '../utils/build_helper.js';
import { IconButton } from './icon_button.js';
import { Icon, Icons } from './icon.js';
import { Scaffold } from './scaffold.js';
import { IconTheme } from './icon_theme.js';
import { IconThemeData } from './icon.js';

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
        this.props = {
            leading,
            automaticallyImplyLeading,
            title,
            actions,
            flexibleSpace,
            bottom,
            elevation,
            scrolledUnderElevation,
            shadowColor,
            surfaceTintColor,
            backgroundColor,
            foregroundColor,
            iconTheme,
            actionsIconTheme,
            primary,
            centerTitle,
            excludeHeaderSemantics,
            titleSpacing,
            toolbarOpacity,
            bottomOpacity,
            toolbarHeight,
            leadingWidth,
            toolbarTextStyle,
            titleTextStyle,
            systemOverlayStyle
        };
    }

    build(context) {
        // Resolve Colors to determine Content Color (white vs black)
        let bgColor = this.props.backgroundColor;
        const theme = Theme.of(context);

        if (!bgColor) {
            bgColor = theme.appBarTheme?.backgroundColor || theme.primaryColor;
        }

        // Handle MaterialColor/Color objects for Background setup (simplified logic)
        // ... (We can defer robust color logic to the body or keep it here to decide fgColor)

        // Quick resolution for fgColor to set up Theme
        let fgColor = this.props.foregroundColor;
        if (!fgColor) {
            fgColor = theme.appBarTheme?.foregroundColor;
        }

        // If we still don't have fgColor, we need to guess based on bgColor
        // logic duplicated from original build for now, or moved to helper.
        // For brevity and correctness in this "wrapper", let's do a simple check
        // or let _AppBarBody handle the VNode styles, but we need fgColor for IconTheme.

        // ... Re-using the logic from the original file ...
        let effectiveBgColorString = bgColor;
        if (bgColor && typeof bgColor.toCSSString === 'function') {
            effectiveBgColorString = bgColor.toCSSString();
        } else if (bgColor && typeof bgColor === 'object' && bgColor.value) {
            effectiveBgColorString = `#${bgColor.value.toString(16).padStart(8, '0').slice(2)}`;
        }
        if (!effectiveBgColorString) effectiveBgColorString = '#2196F3';

        if (!fgColor) {
            // Simple contrast check
            // In a real impl, we'd use robust luminance. 
            // Assuming default blue is dark -> white text
            fgColor = '#FFFFFF';
        }

        const iconThemeData = new IconThemeData({
            color: fgColor,
            size: 24.0
        });

        // Wrap the body in IconTheme so children can see it
        return new IconTheme({
            data: iconThemeData,
            child: new _AppBarBody(this.props)
        });
    }
}

class _AppBarBody extends StatelessWidget {
    constructor(props) {
        super();
        this.props = props;
    }

    build(context) {
        // Unpack props
        const {
            leading,
            automaticallyImplyLeading,
            title,
            actions,
            backgroundColor,
            foregroundColor,
            elevation,
            shadowColor,
            titleSpacing,
            toolbarHeight,
            centerTitle
        } = this.props;

        // Re-resolve colors for CSS purposes (can be redundant but safe)
        const theme = Theme.of(context);
        let bgColor = backgroundColor || theme.appBarTheme?.backgroundColor || theme.primaryColor;

        if (bgColor && typeof bgColor.toCSSString === 'function') {
            bgColor = bgColor.toCSSString();
        } else if (bgColor && typeof bgColor === 'object' && bgColor.value) {
            const val = bgColor.value;
            const hex = val.toString(16).padStart(8, '0');
            bgColor = `#${hex.slice(2)}`;
        }
        if (!bgColor) bgColor = '#2196F3';

        let fgColor = foregroundColor || '#FFFFFF'; // Default to white as we set in wrapper

        if (fgColor && typeof fgColor.toCSSString === 'function') {
            fgColor = fgColor.toCSSString();
        }

        // Resolve Leading
        let leadingVNode = null;
        if (leading) {
            leadingVNode = buildChildWidget(leading, context);
        } else if (automaticallyImplyLeading) {
            const scaffold = Scaffold.of(context);
            if (scaffold && scaffold.widget.drawer) {
                leadingVNode = buildChildWidget(new IconButton({
                    icon: new Icon(Icons.menu),
                    color: fgColor, // Explicitly pass color to ensure visibility
                    onPressed: () => scaffold.openDrawer(),
                    tooltip: 'Open navigation menu'
                }), context);
            }
        }

        // Resolve Title
        let titleVNode = null;
        if (title) {
            if (title.createElement) {
                titleVNode = buildChildWidget(title, context);
            } else {
                titleVNode = new VNode({
                    tag: 'span',
                    children: [String(title)]
                });
            }
        }

        // Resolve Actions
        let actionsVNodes = [];
        if (actions && actions.length > 0) {
            actionsVNodes = buildChildWidgets(actions, context);
        }

        return new VNode({
            tag: 'header',
            props: {
                className: 'fjs-app-bar',
                style: {
                    backgroundColor: bgColor,
                    color: fgColor,
                    height: `${toolbarHeight}px`,
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    boxShadow: `0 ${elevation}px ${elevation * 2}px ${shadowColor || 'rgba(0,0,0,0.5)'}`,
                    position: 'relative',
                    zIndex: 110,
                    flexShrink: 0
                },
                'data-widget': 'AppBar'
            },
            children: [
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-app-bar-leading',
                        style: {
                            marginRight: titleSpacing ? `${titleSpacing}px` : '16px',
                            display: 'flex',
                            alignItems: 'center'
                        }
                    },
                    children: leadingVNode ? [leadingVNode] : []
                }),
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
                            justifyContent: centerTitle ? 'center' : 'flex-start'
                        }
                    },
                    children: titleVNode ? [titleVNode] : []
                }),
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
