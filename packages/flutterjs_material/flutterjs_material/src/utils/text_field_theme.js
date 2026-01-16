import { Color } from '../utils/color.js';
import { InputDecoration } from '../material/input_decorator.js';
import { TextStyle } from '../painting/text_style.js';

/**
 * Material Design 3 TextField Theme
 */
export class InputDecorationTheme {
    constructor({
        labelStyle,
        helperStyle,
        helperMaxLines,
        hintStyle,
        errorStyle,
        errorMaxLines,
        floatingLabelStyle,
        floatingLabelAlignment,
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
        activeIndicatorBorder,
        outlineBorder,
        border,
        enabledBorder,
        focusedBorder,
        errorBorder,
        focusedErrorBorder,
        alignLabelWithHint = false,
        constraints
    } = {}) {
        this.labelStyle = labelStyle;
        this.helperStyle = helperStyle;
        this.helperMaxLines = helperMaxLines;
        this.hintStyle = hintStyle;
        this.errorStyle = errorStyle;
        this.errorMaxLines = errorMaxLines;
        this.floatingLabelStyle = floatingLabelStyle;
        this.floatingLabelAlignment = floatingLabelAlignment;
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
        this.activeIndicatorBorder = activeIndicatorBorder;
        this.outlineBorder = outlineBorder;
        this.border = border;
        this.enabledBorder = enabledBorder;
        this.focusedBorder = focusedBorder;
        this.errorBorder = errorBorder;
        this.focusedErrorBorder = focusedErrorBorder;
        this.alignLabelWithHint = alignLabelWithHint;
        this.constraints = constraints;
    }
}

/**
 * TextSelectionThemeData - Theme for text selection colors
 */
export class TextSelectionThemeData {
    constructor({
        cursorColor,
        selectionColor,
        selectionHandleColor
    } = {}) {
        this.cursorColor = cursorColor;
        this.selectionColor = selectionColor;
        this.selectionHandleColor = selectionHandleColor;
    }
}
