import { InheritedWidget } from '@flutterjs/runtime';

class TimePickerThemeData {
    constructor({
        backgroundColor,
        hourMinuteTextColor,
        hourMinuteColor,
        dayPeriodTextColor,
        dayPeriodColor,
        dialHandColor,
        dialBackgroundColor,
        dialTextColor,
        entryModeIconColor,
        hourMinuteTextStyle,
        dayPeriodTextStyle,
        helpTextStyle,
        shape,
        hourMinuteShape,
        dayPeriodShape,
        dayPeriodBorderSide,
        inputDecorationTheme,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.hourMinuteTextColor = hourMinuteTextColor;
        this.hourMinuteColor = hourMinuteColor;
        this.dayPeriodTextColor = dayPeriodTextColor;
        this.dayPeriodColor = dayPeriodColor;
        this.dialHandColor = dialHandColor;
        this.dialBackgroundColor = dialBackgroundColor;
        this.dialTextColor = dialTextColor;
        this.entryModeIconColor = entryModeIconColor;
        this.hourMinuteTextStyle = hourMinuteTextStyle;
        this.dayPeriodTextStyle = dayPeriodTextStyle;
        this.helpTextStyle = helpTextStyle;
        this.shape = shape;
        this.hourMinuteShape = hourMinuteShape;
        this.dayPeriodShape = dayPeriodShape;
        this.dayPeriodBorderSide = dayPeriodBorderSide;
        this.inputDecorationTheme = inputDecorationTheme;
    }
}

class TimePickerTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(TimePickerTheme);
        return widget ? widget.data : null;
    }
}

export {
    TimePickerTheme,
    TimePickerThemeData
};
