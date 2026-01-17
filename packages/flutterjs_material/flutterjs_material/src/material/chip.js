import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, SizedBox } from '../widgets/widgets.js';
import { Icon, Icons } from './icon.js';
import { GestureDetector } from './gesture_detector.js';
import { Colors } from './color.js';
import { BorderRadius } from '../utils/border_radius.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { MainAxisSize } from '../utils/utils.js';

export class Chip extends StatelessWidget {
    constructor({
        key,
        avatar,
        label,
        labelStyle,
        labelPadding,
        deleteIcon,
        onDeleted,
        deleteIconColor,
        useDeleteButtonTooltip = true,
        deleteButtonTooltipMessage,
        side,
        shape,
        clipBehavior = 'none',
        focusNode,
        autofocus = false,
        backgroundColor,
        padding,
        visualDensity,
        materialTapTargetSize,
        elevation,
        shadowColor,
        surfaceTintColor,
        iconTheme,
    } = {}) {
        super(key);
        this.avatar = avatar;
        this.label = label;
        this.labelStyle = labelStyle;
        this.labelPadding = labelPadding;
        this.deleteIcon = deleteIcon;
        this.onDeleted = onDeleted;
        this.deleteIconColor = deleteIconColor;
        this.backgroundColor = backgroundColor;
        this.padding = padding;
        this.elevation = elevation;
    }

    build(context) {
        const children = [];

        if (this.avatar) {
            children.push(this.avatar);
            children.push(new SizedBox({ width: 8.0 }));
        }

        children.push(this.label); // Should be Text widget or compatible

        if (this.onDeleted) {
            children.push(new SizedBox({ width: 8.0 }));
            children.push(new GestureDetector({
                onTap: this.onDeleted,
                child: this.deleteIcon || new Icon(Icons.cancel, { size: 18.0, color: this.deleteIconColor })
            }));
        }

        return new Container({
            padding: this.padding || EdgeInsets.symmetric({ horizontal: 12.0, vertical: 4.0 }),
            decoration: new BoxDecoration({
                color: this.backgroundColor || '#E0E0E0', // Hex for Colors.grey[300] approx
                borderRadius: BorderRadius.all(16.0), // Stadium
            }),
            child: new Row({
                mainAxisSize: MainAxisSize.min,
                children: children
            })
        });
    }
}
