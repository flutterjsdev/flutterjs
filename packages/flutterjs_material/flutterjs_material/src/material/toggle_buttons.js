import { StatefulWidget } from '../core/widget_element.js';
import { Row } from '../widgets/widgets.js';
import { GestureDetector } from './gesture_detector.js';
import { Container } from './container.js';
import { ToggleButtonsTheme } from './toggle_buttons_theme.js';
import { Colors } from './color.js';

export class ToggleButtons extends StatefulWidget {
    constructor({
        key,
        children = [],
        isSelected = [],
        onPressed,
        mouseCursor,
        textStyle,
        constraints,
        color,
        selectedColor,
        disabledColor,
        fillColor,
        focusColor,
        highlightColor,
        hoverColor,
        splashColor,
        borderColor,
        selectedBorderColor,
        disabledBorderColor,
        borderRadius,
        borderWidth,
        direction, // Axis.horizontal
        verticalDirection,
    } = {}) {
        super(key);
        this.children = children;
        this.isSelected = isSelected;
        this.onPressed = onPressed;
        this.color = color;
        this.selectedColor = selectedColor;
        this.fillColor = fillColor;
        this.borderColor = borderColor;
        this.selectedBorderColor = selectedBorderColor;
        this.borderRadius = borderRadius;
        this.borderWidth = borderWidth;
    }

    createState() {
        return new ToggleButtonsState();
    }
}

class ToggleButtonsState extends StatefulWidget.State {
    build(context) {
        const theme = ToggleButtonsTheme.of(context) || {};

        return new Row({
            children: this.widget.children.map((child, index) => {
                const isSelected = this.widget.isSelected[index];

                // Styles
                const borderColor = isSelected
                    ? (this.widget.selectedBorderColor || theme.selectedBorderColor || Colors.blue)
                    : (this.widget.borderColor || theme.borderColor || Colors.grey);

                const backgroundColor = isSelected
                    ? (this.widget.fillColor || theme.fillColor || Colors.blue[50])
                    : 'transparent';

                const textColor = isSelected
                    ? (this.widget.selectedColor || theme.selectedColor || Colors.blue)
                    : (this.widget.color || theme.color || Colors.black);

                // Simplified Border handling (should handle adjacent borders merging)

                return new GestureDetector({
                    onTap: () => this.widget.onPressed?.(index),
                    child: new Container({
                        color: backgroundColor,
                        decoration: {
                            border: `1px solid ${borderColor}`,
                            // borderRadius logic (first, last, vs middle)
                        },
                        padding: { horizontal: 16, vertical: 8 }, // example
                        child: child // Apply textColor to child (IconTheme/TextStyle)
                    })
                });
            })
        });
    }
}
