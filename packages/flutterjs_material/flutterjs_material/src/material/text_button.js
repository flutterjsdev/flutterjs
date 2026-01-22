import { ButtonStyleButton } from './button_style_button.js';
import { Theme } from './theme.js';
import { GestureDetector } from './gesture_detector.js';
import { Container, BoxDecoration } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BorderRadius } from '../utils/border_radius.js';
import { Center } from '../widgets/compoment/center.js';
import { TextStyle } from '../painting/text_style.js';

export class TextButton extends ButtonStyleButton {
    constructor({
        key,
        onPressed,
        onLongPress,
        onHover,
        onFocusChange,
        style,
        focusNode,
        autofocus,
        clipBehavior,
        child
    } = {}) {
        super({
            key,
            onPressed,
            onLongPress,
            onHover,
            onFocusChange,
            style,
            focusNode,
            autofocus,
            clipBehavior,
            child
        });
    }

    build(context) {
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        // M3 Defaults for Text Button
        const defaultBg = 'transparent';
        const defaultFg = colorScheme.primary;

        const resolveColor = (value, defaultValue) => {
            if (value) {
                if (typeof value === 'string') return value;
                if (typeof value.toCSSString === 'function') return value.toCSSString();
                if (value.value) return '#' + value.value.toString(16).padStart(8, '0').slice(2);
            }
            return defaultValue;
        };

        const customStyle = this.style || {};

        const effectiveBg = resolveColor(customStyle.backgroundColor, defaultBg);
        const effectiveFg = resolveColor(customStyle.foregroundColor || customStyle.color, defaultFg);

        return new GestureDetector({
            onTap: this.onPressed,
            onLongPress: this.onLongPress,
            child: new Container({
                padding: customStyle.padding || EdgeInsets.symmetric({ vertical: 10, horizontal: 12 }),
                decoration: new BoxDecoration({
                    color: effectiveBg,
                    borderRadius: customStyle.shape?.borderRadius || BorderRadius.circular(20),
                }),
                child: new Center({
                    child: this.child
                })
            })
        });
    }
}
