import { InheritedWidget } from '@flutterjs/runtime';

class SliderThemeData {
    constructor({
        trackHeight,
        activeTrackColor,
        inactiveTrackColor,
        disabledActiveTrackColor,
        disabledInactiveTrackColor,
        activeTickMarkColor,
        inactiveTickMarkColor,
        disabledActiveTickMarkColor,
        disabledInactiveTickMarkColor,
        thumbColor,
        overlappingShapeStrokeColor,
        disabledThumbColor,
        overlayColor,
        valueIndicatorColor,
        overlayShape,
        tickMarkShape,
        thumbShape,
        trackShape,
        valueIndicatorShape,
        rangeTickMarkShape,
        rangeThumbShape,
        rangeTrackShape,
        rangeValueIndicatorShape,
        showValueIndicator,
        valueIndicatorTextStyle,
        minThumbSeparation,
        thumbSelector,
        mouseCursor,
    } = {}) {
        this.trackHeight = trackHeight;
        this.activeTrackColor = activeTrackColor;
        this.inactiveTrackColor = inactiveTrackColor;
        this.thumbColor = thumbColor;
        this.overlayColor = overlayColor;
        // ... assign others
    }
}

class SliderTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(SliderTheme);
        return widget ? widget.data : null;
    }
}

export {
    SliderTheme,
    SliderThemeData
};
