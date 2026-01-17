import { InheritedWidget } from '@flutterjs/runtime';

class CarouselThemeData {
    constructor({
        backgroundColor,
        elevation,
        height,
        aspectRatio,
        viewportFraction,
        initialPage,
        enableInfiniteScroll,
        reverse,
        autoPlay,
        autoPlayInterval,
        autoPlayAnimationDuration,
        autoPlayCurve,
        enlargeCenterPage,
        scrollDirection,
    } = {}) {
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.height = height;
        this.aspectRatio = aspectRatio;
        this.viewportFraction = viewportFraction;
        this.initialPage = initialPage;
        this.enableInfiniteScroll = enableInfiniteScroll;
        this.reverse = reverse;
        this.autoPlay = autoPlay;
        this.autoPlayInterval = autoPlayInterval;
        this.autoPlayAnimationDuration = autoPlayAnimationDuration;
        this.autoPlayCurve = autoPlayCurve;
        this.enlargeCenterPage = enlargeCenterPage;
        this.scrollDirection = scrollDirection;
    }
}

class CarouselTheme extends InheritedWidget {
    constructor({ data, child, key } = {}) {
        super({ child, key });
        this.data = data;
    }

    updateShouldNotify(oldWidget) {
        return this.data !== oldWidget.data;
    }

    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(CarouselTheme);
        return widget ? widget.data : null;
    }
}

export {
    CarouselTheme,
    CarouselThemeData
};
