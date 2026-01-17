import { ButtonStyleButton } from './button_style_button.js';
import { OutlinedButtonTheme } from './outlined_button_theme.js';

export class OutlinedButton extends ButtonStyleButton {
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

    // Default style handling would leverage OutlinedButtonTheme.of(context)
}
