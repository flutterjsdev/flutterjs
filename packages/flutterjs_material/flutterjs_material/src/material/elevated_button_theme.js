import { InheritedWidget } from '@flutterjs/runtime';

class ElevatedButtonThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }
}

class ElevatedButtonTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ElevatedButtonTheme);
        return widget ? widget.data : null;
    }
}

export {
    ElevatedButtonTheme,
    ElevatedButtonThemeData
};
