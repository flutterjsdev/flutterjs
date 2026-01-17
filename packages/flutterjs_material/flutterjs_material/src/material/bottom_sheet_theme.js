import { InheritedWidget } from '@flutterjs/runtime';

class BottomSheetThemeData {
    constructor({
        backgroundColor,
        surfaceTintColor,
        elevation,
        modalBackgroundColor,
        modalBarrierColor,
        shadowColor,
        modalElevation,
        shape,
        showDragHandle,
        dragHandleColor,
        dragHandleSize,
        clipBehavior,
        constraints,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.surfaceTintColor = surfaceTintColor;
        this.elevation = elevation;
        this.modalBackgroundColor = modalBackgroundColor;
        this.modalBarrierColor = modalBarrierColor;
        this.shadowColor = shadowColor;
        this.modalElevation = modalElevation;
        this.shape = shape;
        this.showDragHandle = showDragHandle;
        this.dragHandleColor = dragHandleColor;
        this.dragHandleSize = dragHandleSize;
        this.clipBehavior = clipBehavior;
        this.constraints = constraints;
    }
}

class BottomSheetTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(BottomSheetTheme);
        return widget ? widget.data : null;
    }
}

export {
    BottomSheetTheme,
    BottomSheetThemeData
};
