import { ButtonStyleButton } from './button_style_button.js';
import { OutlinedButtonTheme } from './outlined_button_theme.js';
import { Theme } from './theme.js';
import { GestureDetector } from './gesture_detector.js';
import { Container, BoxDecoration } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BorderRadius } from '../utils/border_radius.js';
import { Center } from '../widgets/compoment/center.js';
import { TextStyle } from '../painting/text_style.js';
import { Border, BorderSide } from '../utils/border.js';

export class OutlinedButton extends ButtonStyleButton {
    static styleFrom({
        foregroundColor,
        backgroundColor,
        disabledForegroundColor,
        shadowColor,
        surfaceTintColor,
        elevation,
        textStyle,
        padding,
        minimumSize,
        fixedSize,
        maximumSize,
        side,
        shape,
        enabledMouseCursor,
        disabledMouseCursor,
        visualDensity,
        tapTargetSize,
        animationDuration,
        enableFeedback,
        alignment,
        splashFactory,
    } = {}) {
        return {
            foregroundColor,
            backgroundColor,
            disabledForegroundColor,
            shadowColor,
            surfaceTintColor,
            elevation,
            textStyle,
            padding,
            minimumSize,
            fixedSize,
            maximumSize,
            side,
            shape,
            enabledMouseCursor,
            disabledMouseCursor,
            visualDensity,
            tapTargetSize,
            animationDuration,
            enableFeedback,
            alignment,
            splashFactory,
        };
    }

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
        const buttonTheme = theme.outlinedButtonTheme?.style || {};

        // M3 Defaults for Outlined Button
        const defaultBg = 'transparent';
        const defaultFg = colorScheme.primary;
        const defaultBorderColor = colorScheme.outline;

        const resolveColor = (value, defaultValue) => {
            if (value) {
                if (typeof value === 'string') return value;
                if (typeof value.toCSSString === 'function') return value.toCSSString();
                if (value.value) return '#' + value.value.toString(16).padStart(8, '0').slice(2);
            }
            return defaultValue;
        };

        const customStyle = this.style || {};

        // Merge with Theme
        const themeBg = buttonTheme.backgroundColor;
        const themeFg = buttonTheme.foregroundColor;
        const themeSide = buttonTheme.side; // Assuming BorderSide object

        const effectiveBg = resolveColor(customStyle.backgroundColor || themeBg, defaultBg);
        const effectiveFg = resolveColor(customStyle.foregroundColor || customStyle.color || themeFg, defaultFg);

        // Custom handling for border? 
        // We need a simple way to resolve border color.
        // Assuming side is BorderSide
        let effectiveBorderColor = defaultBorderColor;

        let side = customStyle.side || themeSide;

        if (side && side.color) {
            effectiveBorderColor = resolveColor(side.color, defaultBorderColor);
        }

        return new GestureDetector({
            onTap: this.onPressed,
            onLongPress: this.onLongPress,
            child: new Container({
                padding: customStyle.padding || EdgeInsets.symmetric({ vertical: 10, horizontal: 24 }),
                decoration: new BoxDecoration({
                    color: effectiveBg,
                    borderRadius: customStyle.shape?.borderRadius || BorderRadius.circular(20),
                    border: Border.all({
                        color: effectiveBorderColor,
                        width: side?.width || 1
                    })
                }),
                child: new Center({
                    child: this.child
                })
            })
        });
    }
}
