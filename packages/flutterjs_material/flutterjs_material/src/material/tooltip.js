import { StatefulWidget ,State} from '../core/widget_element.js';
import { GestureDetector } from './gesture_detector.js';
import { Container } from './container.js';
import { OverlayEntry, Overlay } from '../widgets/overlay.js'; // Assuming Overlay exists or using placeholder
import { TooltipTheme } from './tooltip_theme.js';
import { Colors } from './color.js';
import { Text } from './text.js';

export class Tooltip extends StatefulWidget {
    constructor({
        key,
        message,
        richMessage,
        height,
        padding,
        margin,
        verticalOffset,
        preferBelow,
        excludeFromSemantics,
        decoration,
        textStyle,
        waitDuration,
        showDuration,
        child,
        triggerMode,
        enableFeedback,
    } = {}) {
        super(key);
        this.message = message;
        this.richMessage = richMessage;
        this.height = height;
        this.padding = padding;
        this.margin = margin;
        this.verticalOffset = verticalOffset;
        this.preferBelow = preferBelow;
        this.excludeFromSemantics = excludeFromSemantics;
        this.decoration = decoration;
        this.textStyle = textStyle;
        this.waitDuration = waitDuration;
        this.showDuration = showDuration;
        this.child = child;
        this.triggerMode = triggerMode;
        this.enableFeedback = enableFeedback;
    }

    createState() {
        return new TooltipState();
    }
}

class TooltipState extends State {
    constructor() {
        super();
        this._overlayEntry = null;
        this._timer = null;
    }

    _showTooltip() {
        // Create/Insert Overlay
        // Since we don't have robust overlay here, we use title attribute logic or simple div append if in web
        // Simulating structure:

        console.log('Show Tooltip:', this.widget.message);
        // HTML title attribute is simple, but Tooltip widget usually implies custom UI.
        // We will just return the child for now wrapped in GestureDetector
        // Proper implementation needs Layer/Overlay support.
    }

    _hideTooltip() {
        // Remove Overlay
    }

    build(context) {
        // For web simplicity, adding 'title' attribute to container if it makes sense?
        // Or using onLongPress/onHover gestures to trigger internal logic.

        return new GestureDetector({
            onLongPress: () => this._showTooltip(),
            child: new Container({
                // title: this.widget.message, // Web-specific hint if Container supports it
                child: this.widget.child
                // Ideally we'd wrap child in a component that exposes hover events
            })
        });
    }
}
