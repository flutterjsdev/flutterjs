import { InheritedWidget } from '@flutterjs/runtime';

class IconButtonThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }
}

class IconButtonTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(IconButtonTheme);
        return widget ? widget.data : null;
    }
}

export {
    IconButtonTheme,
    IconButtonThemeData
};
