import { InheritedWidget } from '@flutterjs/runtime';

class SnackBarThemeData {
    constructor({
        backgroundColor,
        actionTextColor,
        disabledActionTextColor,
        contentTextStyle,
        elevation,
        shape,
        behavior,
        width,
        insetPadding,
        showCloseIcon,
        closeIconColor,
        actionOverflowThreshold,
        actionBackgroundColor,
        disabledActionBackgroundColor,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.actionTextColor = actionTextColor;
        this.disabledActionTextColor = disabledActionTextColor;
        this.contentTextStyle = contentTextStyle;
        this.elevation = elevation;
        this.shape = shape;
        this.behavior = behavior;
        this.width = width;
        this.insetPadding = insetPadding;
        this.showCloseIcon = showCloseIcon;
        this.closeIconColor = closeIconColor;
        this.actionOverflowThreshold = actionOverflowThreshold;
        this.actionBackgroundColor = actionBackgroundColor;
        this.disabledActionBackgroundColor = disabledActionBackgroundColor;
    }
}

class SnackBarTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(SnackBarTheme);
        return widget ? widget.data : null;
    }
}

export {
    SnackBarTheme,
    SnackBarThemeData
};
