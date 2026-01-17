import { InheritedWidget } from '@flutterjs/runtime';

class FilledButtonThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }
}

class FilledButtonTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(FilledButtonTheme);
        return widget ? widget.data : null;
    }
}

export {
    FilledButtonTheme,
    FilledButtonThemeData
};
