import { InheritedWidget } from '@flutterjs/runtime';
import { IconThemeData } from './icon.js';

class IconTheme extends InheritedWidget {
    constructor({
        key,
        data,
        child
    }) {
        super({ key, child });
        this.data = data;
    }

    static of(context) {
        const inheritedTheme = context.dependOnInheritedWidgetOfExactType(IconTheme);
        return inheritedTheme?.data || null;
    }

    static merge({
        key,
        data,
        child
    }) {
        return new IconTheme({
            key,
            data,
            child
        });
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }
}

export { IconTheme };
