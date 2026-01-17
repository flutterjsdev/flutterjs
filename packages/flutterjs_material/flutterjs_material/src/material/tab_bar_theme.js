import { InheritedWidget } from '@flutterjs/runtime';

class TabBarThemeData {
    constructor({
        indicator,
        indicatorColor,
        indicatorSize,
        dividerColor,
        dividerHeight,
        labelColor,
        labelPadding,
        labelStyle,
        unselectedLabelColor,
        unselectedLabelStyle,
        overlayColor,
        splashFactory,
        mouseCursor,
    } = {}) {
        this.indicator = indicator;
        this.indicatorColor = indicatorColor;
        this.indicatorSize = indicatorSize;
        this.dividerColor = dividerColor;
        this.dividerHeight = dividerHeight;
        this.labelColor = labelColor;
        this.labelPadding = labelPadding;
        this.labelStyle = labelStyle;
        this.unselectedLabelColor = unselectedLabelColor;
        this.unselectedLabelStyle = unselectedLabelStyle;
        this.overlayColor = overlayColor;
        this.splashFactory = splashFactory;
        this.mouseCursor = mouseCursor;
    }
}

class TabBarTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(TabBarTheme);
        return widget ? widget.data : null;
    }
}

export {
    TabBarTheme,
    TabBarThemeData
};
