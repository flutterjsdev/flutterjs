import { StatefulWidget, State } from '../core/widget_element.js';
import { Container } from './container.js';
import { Colors } from './color.js';
import { GestureDetector } from './gesture_detector.js';
import { Theme } from './theme.js';

export class Slider extends StatefulWidget {
    constructor({
        key,
        value,
        onChanged,
        onChangeStart,
        onChangeEnd,
        min = 0.0,
        max = 1.0,
        divisions,
        label,
        activeColor,
        inactiveColor,
        thumbColor,
        mouseCursor,
        semanticFormatterCallback,
        focusNode,
        autofocus = false,
    } = {}) {
        super(key);
        this.value = value;
        this.onChanged = onChanged;
        this.onChangeStart = onChangeStart;
        this.onChangeEnd = onChangeEnd;
        this.min = min;
        this.max = max;
        this.divisions = divisions;
        this.label = label;
        this.activeColor = activeColor;
        this.inactiveColor = inactiveColor;
        this.thumbColor = thumbColor;
    }

    createState() {
        return new SliderState();
    }
}

class SliderState extends State {
    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const activeColor = this.widget.activeColor || theme.sliderTheme?.activeTrackColor || colorScheme.primary || '#6750A4';
        const inactiveColor = this.widget.inactiveColor || theme.sliderTheme?.inactiveTrackColor || colorScheme.surfaceContainerHighest || '#E6E0E9'; // Used only if we custom style, but HTML range is limited
        const thumbColor = this.widget.thumbColor || theme.sliderTheme?.thumbColor || activeColor;

        // Simple HTML range input for now
        // A robust custom implementation would involve LayoutBuilder + GestureDetector + Canvas/Containers

        return new Container({
            child: {
                tag: 'input',
                attrs: {
                    type: 'range',
                    min: this.widget.min,
                    max: this.widget.max,
                    step: this.widget.divisions ? (this.widget.max - this.widget.min) / this.widget.divisions : 'any',
                    value: this.widget.value,
                },
                style: {
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: activeColor // Standard CSS property for checkbox/radio/range
                },
                onInput: (e) => { // onInput fires immediately
                    const val = parseFloat(e.target.value);
                    this.widget.onChanged?.(val);
                },
                onChange: (e) => { // often fires on commit
                    // this.widget.onChangeEnd?.(parseFloat(e.target.value));
                }
            }
        });
    }
}
