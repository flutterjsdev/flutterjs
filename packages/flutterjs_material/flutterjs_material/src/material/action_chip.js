import { StatelessWidget } from '../core/widget_element.js';
import { Chip } from './chip.js';
import { GestureDetector } from './gesture_detector.js';

export class ActionChip extends StatelessWidget {
    constructor({
        key,
        avatar,
        label,
        labelStyle,
        labelPadding,
        onPressed,
        pressElevation,
        tooltip,
        shape,
        clipBehavior,
        focusNode,
        autofocus,
        backgroundColor,
        padding,
        visualDensity,
        materialTapTargetSize,
        elevation,
        shadowColor,
    } = {}) {
        super(key);
        this.avatar = avatar;
        this.label = label;
        this.labelStyle = labelStyle;
        this.labelPadding = labelPadding;
        this.onPressed = onPressed;
        this.pressElevation = pressElevation;
        this.tooltip = tooltip;
        this.shape = shape;
        this.clipBehavior = clipBehavior;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
        this.backgroundColor = backgroundColor;
        this.padding = padding;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
    }

    build(context) {
        return new GestureDetector({
            onTap: this.onPressed,
            child: new Chip({
                avatar: this.avatar,
                label: this.label,
                labelStyle: this.labelStyle,
                labelPadding: this.labelPadding,
                backgroundColor: this.backgroundColor,
                padding: this.padding,
                elevation: this.elevation,
                shadowColor: this.shadowColor,
            })
        });
    }
}
