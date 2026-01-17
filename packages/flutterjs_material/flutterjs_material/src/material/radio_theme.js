import { InheritedWidget } from '@flutterjs/runtime';

class RadioThemeData {
    constructor({
        mouseCursor,
        fillColor,
        overlayColor,
        splashRadius,
        materialTapTargetSize,
        visualDensity,
    } = {}) {
        this.mouseCursor = mouseCursor;
        this.fillColor = fillColor;
        this.overlayColor = overlayColor;
        this.splashRadius = splashRadius;
        this.materialTapTargetSize = materialTapTargetSize;
        this.visualDensity = visualDensity;
    }
}

class RadioTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(RadioTheme);
        return widget ? widget.data : null;
    }
}

export {
    RadioTheme,
    RadioThemeData
};
