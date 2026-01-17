
export class ButtonStyle {
    constructor({
        textStyle,
        backgroundColor,
        foregroundColor,
        overlayColor,
        shadowColor,
        surfaceTintColor,
        elevation,
        padding,
        minimumSize,
        fixedSize,
        maximumSize,
        side,
        shape,
        mouseCursor,
        visualDensity,
        tapTargetSize,
        animationDuration,
        enableFeedback,
        alignment,
        splashFactory,
    } = {}) {
        this.textStyle = textStyle;
        this.backgroundColor = backgroundColor;
        this.foregroundColor = foregroundColor;
        this.overlayColor = overlayColor;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.elevation = elevation;
        this.padding = padding;
        this.minimumSize = minimumSize;
        this.fixedSize = fixedSize;
        this.maximumSize = maximumSize;
        this.side = side;
        this.shape = shape;
        this.mouseCursor = mouseCursor;
        this.visualDensity = visualDensity;
        this.tapTargetSize = tapTargetSize;
        this.animationDuration = animationDuration;
        this.enableFeedback = enableFeedback;
        this.alignment = alignment;
        this.splashFactory = splashFactory;
    }
}
