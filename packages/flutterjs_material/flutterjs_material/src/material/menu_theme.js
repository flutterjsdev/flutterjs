import { InheritedWidget } from '@flutterjs/runtime';

class MenuThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }
}

class MenuTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(MenuTheme);
        return widget ? widget.data : null;
    }
}

export {
    MenuTheme,
    MenuThemeData
};
