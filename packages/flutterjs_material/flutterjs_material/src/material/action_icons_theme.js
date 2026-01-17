import { InheritedWidget } from '@flutterjs/runtime';

class ActionIconThemeData {
    constructor({
        backButtonIconBuilder,
        closeButtonIconBuilder,
        drawerButtonIconBuilder,
        endDrawerButtonIconBuilder,
    } = {}) {
        this.backButtonIconBuilder = backButtonIconBuilder;
        this.closeButtonIconBuilder = closeButtonIconBuilder;
        this.drawerButtonIconBuilder = drawerButtonIconBuilder;
        this.endDrawerButtonIconBuilder = endDrawerButtonIconBuilder;
    }
}

class ActionIconTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ActionIconTheme);
        return widget ? widget.data : null;
    }
}

export {
    ActionIconTheme,
    ActionIconThemeData
};
