import { InheritedWidget } from '@flutterjs/runtime';

class PopupMenuThemeData {
    constructor({
        color,
        shape,
        elevation,
        textStyle,
        enableFeedback,
        mouseCursor,
    } = {}) {
        this.color = color;
        this.shape = shape;
        this.elevation = elevation;
        this.textStyle = textStyle;
        this.enableFeedback = enableFeedback;
        this.mouseCursor = mouseCursor;
    }
}

class PopupMenuTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(PopupMenuTheme);
        return widget ? widget.data : null;
    }
}

export {
    PopupMenuTheme,
    PopupMenuThemeData
};
