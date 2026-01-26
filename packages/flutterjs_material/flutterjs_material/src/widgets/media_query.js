
import { InheritedWidget } from '../core/core.js';

export class MediaQueryData {
    constructor({
        size = { width: 0, height: 0 },
        devicePixelRatio = 1.0,
        textScaleFactor = 1.0,
        platformBrightness = 'light',
        padding = { top: 0, right: 0, bottom: 0, left: 0 },
        viewInsets = { top: 0, right: 0, bottom: 0, left: 0 },
        systemGestureInsets = { top: 0, right: 0, bottom: 0, left: 0 },
        viewPadding = { top: 0, right: 0, bottom: 0, left: 0 },
        alwaysUse24HourFormat = false,
        accessibleNavigation = false,
        invertColors = false,
        highContrast = false,
        disableAnimations = false,
        boldText = false,
        navigationMode = 'traditional',
    } = {}) {
        this.size = size;
        this.devicePixelRatio = devicePixelRatio;
        this.textScaleFactor = textScaleFactor;
        this.platformBrightness = platformBrightness;
        this.padding = padding;
        this.viewInsets = viewInsets;
        this.systemGestureInsets = systemGestureInsets;
        this.viewPadding = viewPadding;
        this.alwaysUse24HourFormat = alwaysUse24HourFormat;
        this.accessibleNavigation = accessibleNavigation;
        this.invertColors = invertColors;
        this.highContrast = highContrast;
        this.disableAnimations = disableAnimations;
        this.boldText = boldText;
        this.navigationMode = navigationMode;
    }
}

export class MediaQuery extends InheritedWidget {
    constructor({
        key,
        data,
        child
    }) {
        super({ key, child });
        this.data = data;
    }

    static of(context) {
        const inherited = context.dependOnInheritedWidgetOfExactType(MediaQuery);
        return inherited?.data || MediaQuery.fromWindow(window);
    }

    /*
     * Factory method to create from window
     */
    static fromWindow(window) {
        return new MediaQueryData({
            size: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            devicePixelRatio: window.devicePixelRatio || 1.0,
            platformBrightness: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        });
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }
}
