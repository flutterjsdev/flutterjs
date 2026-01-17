import { ButtonStyleButton } from './button_style_button.js';
import { FilledButtonTheme } from './filled_button_theme.js';

export class FilledButton extends ButtonStyleButton {
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

    // Default style handling would be more complex here in a full framework,
    // merging Theme.of(context).filledButtonTheme, and default colors.
    // Since ButtonStyleButton is a base, we rely on it or the user providing style for now.
    // In future: implement `defaultStyleOf(context)` logic.

    static tonal({
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
        // Factory for Tonal variant
        return new FilledButton({
            key, onPressed, onLongPress, onHover, onFocusChange,
            style, // Would imply tonal defaults here
            focusNode, autofocus, clipBehavior, child
        });
    }
}
