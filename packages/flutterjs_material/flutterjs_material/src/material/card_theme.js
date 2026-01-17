import { InheritedWidget } from '@flutterjs/runtime';

class CardThemeData {
    constructor({
        clipBehavior,
        color,
        shadowColor,
        surfaceTintColor,
        elevation,
        margin,
        shape,
    } = {}) {
        this.clipBehavior = clipBehavior;
        this.color = color;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.elevation = elevation;
        this.margin = margin;
        this.shape = shape;
    }
}

class CardTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(CardTheme);
        return widget ? widget.data : null;
    }
}

export {
    CardTheme,
    CardThemeData
};
