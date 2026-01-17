import { InheritedWidget } from '@flutterjs/runtime';

class DataTableThemeData {
    constructor({
        decoration,
        dataRowColor,
        dataRowMinHeight,
        dataRowMaxHeight,
        dataTextStyle,
        headingRowColor,
        headingRowHeight,
        headingTextStyle,
        horizontalMargin,
        columnSpacing,
        dividerThickness,
        checkboxHorizontalMargin,
    } = {}) {
        this.decoration = decoration;
        this.dataRowColor = dataRowColor;
        this.dataRowMinHeight = dataRowMinHeight;
        this.dataRowMaxHeight = dataRowMaxHeight;
        this.dataTextStyle = dataTextStyle;
        this.headingRowColor = headingRowColor;
        this.headingRowHeight = headingRowHeight;
        this.headingTextStyle = headingTextStyle;
        this.horizontalMargin = horizontalMargin;
        this.columnSpacing = columnSpacing;
        this.dividerThickness = dividerThickness;
        this.checkboxHorizontalMargin = checkboxHorizontalMargin;
    }
}

class DataTableTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(DataTableTheme);
        return widget ? widget.data : null;
    }
}

export {
    DataTableTheme,
    DataTableThemeData
};
