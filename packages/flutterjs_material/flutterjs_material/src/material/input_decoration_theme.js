import { InheritedWidget } from '@flutterjs/runtime';

class InputDecorationTheme {
    constructor({
        labelStyle,
        floatingLabelStyle,
        helperStyle,
        helperMaxLines,
        hintStyle,
        errorStyle,
        errorMaxLines,
        floatingLabelBehavior, // auto, always, never
        isDense = false,
        contentPadding,
        isCollapsed = false,
        iconColor,
        prefixStyle,
        prefixIconColor,
        suffixStyle,
        suffixIconColor,
        counterStyle,
        filled = false,
        fillColor,
        focusColor,
        hoverColor,
        errorBorder,
        focusedBorder,
        focusedErrorBorder,
        disabledBorder,
        enabledBorder,
        border,
        alignLabelWithHint = false,
        constraints,
    } = {}) {
        this.labelStyle = labelStyle;
        this.floatingLabelStyle = floatingLabelStyle;
        this.helperStyle = helperStyle;
        this.helperMaxLines = helperMaxLines;
        this.hintStyle = hintStyle;
        this.errorStyle = errorStyle;
        this.errorMaxLines = errorMaxLines;
        this.floatingLabelBehavior = floatingLabelBehavior;
        this.isDense = isDense;
        this.contentPadding = contentPadding;
        this.isCollapsed = isCollapsed;
        this.iconColor = iconColor;
        this.prefixStyle = prefixStyle;
        this.prefixIconColor = prefixIconColor;
        this.suffixStyle = suffixStyle;
        this.suffixIconColor = suffixIconColor;
        this.counterStyle = counterStyle;
        this.filled = filled;
        this.fillColor = fillColor;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.errorBorder = errorBorder;
        this.focusedBorder = focusedBorder;
        this.focusedErrorBorder = focusedErrorBorder;
        this.disabledBorder = disabledBorder;
        this.enabledBorder = enabledBorder;
        this.border = border;
        this.alignLabelWithHint = alignLabelWithHint;
        this.constraints = constraints;
    }
}

// Note: Usually InputDecorationTheme is NOT an InheritedWidget itself, 
// but a property of ThemeData.
// However, similar to other themes, we can export it as a data class 
// that is part of ThemeData.
// If valid isolated usage is needed:
/*
class InputDecorationThemeWidget extends InheritedWidget {
    // ...
}
*/
// For now treating as Data class only as per pattern unless specialized widget is requested.

export {
    InputDecorationTheme
};
