import { InheritedWidget } from '@flutterjs/runtime';

class OutlinedButtonThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }
}

class OutlinedButtonTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(OutlinedButtonTheme);
        return widget ? widget.data : null;
    }
}

export {
    OutlinedButtonTheme,
    OutlinedButtonThemeData
};
