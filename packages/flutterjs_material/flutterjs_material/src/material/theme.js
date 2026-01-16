import { InheritedWidget } from '@flutterjs/runtime';
import { ThemeData } from './theme_data.js';

class Theme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        if (!context || !context.dependOnInheritedWidgetOfExactType) {
            console.warn('Theme.of() called with invalid context');
            return new ThemeData();
        }
        const widget = context.dependOnInheritedWidgetOfExactType(Theme);
        return widget ? widget.data : new ThemeData();
    }
}

export { Theme };
