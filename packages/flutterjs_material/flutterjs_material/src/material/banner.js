import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, Column, SizedBox } from '../widgets/widgets.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Divider } from '../widgets/compoment/divider.js';
import { MainAxisSize, CrossAxisAlignment, MainAxisAlignment } from '../utils/utils.js';
import { MaterialBannerTheme } from './banner_theme.js';

const MaterialBannerClosedReason = {
    dismiss: 'dismiss',
    swipe: 'swipe',
    hide: 'hide',
    remove: 'remove',
};

class MaterialBanner extends StatelessWidget {
    constructor({
        key,
        content,
        contentTextStyle,
        actions,
        elevation,
        leading,
        backgroundColor,
        surfaceTintColor,
        shadowColor,
        dividerColor,
        padding,
        leadingPadding,
        forceActionsBelow = false,
        overflowAlignment,
        animation,
        onVisible,
    } = {}) {
        super(key);
        this.content = content;
        this.contentTextStyle = contentTextStyle;
        this.actions = actions;
        this.elevation = elevation;
        this.leading = leading;
        this.backgroundColor = backgroundColor;
        this.surfaceTintColor = surfaceTintColor;
        this.shadowColor = shadowColor;
        this.dividerColor = dividerColor;
        this.padding = padding;
        this.leadingPadding = leadingPadding;
        this.forceActionsBelow = forceActionsBelow;
        this.overflowAlignment = overflowAlignment;
    }

    build(context) {
        const theme = MaterialBannerTheme.of(context) || {};
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;
        const bgColor = this.backgroundColor || theme.backgroundColor || colorScheme.surfaceContainerLow || '#F7F2FA'; // M3 default
        const effectivePadding = this.padding || theme.padding || EdgeInsets.all(16);
        const effectiveLeadingPadding = this.leadingPadding || theme.leadingPadding || EdgeInsets.only({ right: 16 });

        const children = [];

        if (this.leading) {
            children.push(new Container({
                padding: effectiveLeadingPadding,
                child: this.leading
            }));
        }

        children.push(new SizedBox({
            // Expanded equivalent? 
            // In Row, we need Expanded for content.
            // But we can't use Expanded inside arrays directly in existing flutterjs implementation if not supported in Row children parsing? 
            // Assuming Row supports expanded children.
            width: '100%', // temporary hack if expanded not working
            child: this.content
        }));

        const actionsRow = new Row({
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.end,
            children: this.actions
        });

        // Simplified layout: Row(Leading, Content), Column(Actions) or similar depending on forceActionsBelow
        // Material Banner usually:
        // [Leading] [Content]
        //           [Actions]

        const contentAndActions = new Column({
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                this.content,
                new SizedBox({ height: 12 }),
                new Row({
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: this.actions
                })
            ]
        });

        let mainRow;

        if (this.leading) {
            mainRow = new Row({
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                    new Container({
                        padding: effectiveLeadingPadding,
                        child: this.leading
                    }),
                    // Expanded
                    new Container({
                        child: contentAndActions,
                        style: { flex: 1 } // HACK: direct style for flex grow
                    })
                ]
            });
        } else {
            mainRow = contentAndActions;
        }

        return new Column({
            mainAxisSize: MainAxisSize.min,
            children: [
                new Container({
                    color: bgColor,
                    padding: effectivePadding,
                    child: mainRow
                }),
                new Divider({ color: this.dividerColor || theme.dividerColor })
            ]
        });
    }
}

export {
    MaterialBanner,
    MaterialBannerClosedReason
};
