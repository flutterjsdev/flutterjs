import { StatefulWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Colors } from './color.js';
import { GestureDetector } from './gesture_detector.js';

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

class SliderState extends StatefulWidget.State {
    build(context) {
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
                    accentColor: this.widget.activeColor // Not standard CSS property but works in some agents
                },
                onInput: (e) => { // onInput fires immediately
                    const val = parseFloat(e.target.value);
                    this.widget.onChanged?.(val);
                },
                onChange: (e) => { // often fires on commit
                    // this.widget.onChangeEnd?.(parseFloat(e.target.value));
                }
                // activeColor/inactiveColor CSS styling for range is tricky cross-browser without custom styling
            }
        });
    }
}
