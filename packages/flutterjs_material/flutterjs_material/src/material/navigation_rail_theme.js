import { InheritedWidget } from '@flutterjs/runtime';

class NavigationRailThemeData {
    constructor({
        backgroundColor,
        elevation,
        unselectedLabelTextStyle,
        selectedLabelTextStyle,
        unselectedIconTheme,
        selectedIconTheme,
        groupAlignment,
        labelType, // none, selected, all
        useIndicator,
        indicatorColor,
        indicatorShape,
        minWidth,
        minExtendedWidth,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.unselectedLabelTextStyle = unselectedLabelTextStyle;
        this.selectedLabelTextStyle = selectedLabelTextStyle;
        this.unselectedIconTheme = unselectedIconTheme;
        this.selectedIconTheme = selectedIconTheme;
        this.groupAlignment = groupAlignment;
        this.labelType = labelType;
        this.useIndicator = useIndicator;
        this.indicatorColor = indicatorColor;
        this.indicatorShape = indicatorShape;
        this.minWidth = minWidth;
        this.minExtendedWidth = minExtendedWidth;
    }
}

class NavigationRailTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(NavigationRailTheme);
        return widget ? widget.data : null;
    }
}

export {
    NavigationRailTheme,
    NavigationRailThemeData
};
