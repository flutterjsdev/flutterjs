import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Row, Column, Expanded } from '../widgets/widgets.js'; // Using Row/Col for basic scroll
import { GestureDetector } from './gesture_detector.js';
import { MainAxisSize, MainAxisAlignment, Axis } from '../utils/utils.js';
import { CarouselTheme } from './carousel_theme.js';
import { ListView } from './list_view.js'; // Utilize ListView for scrolling if possible

// Basic controller to manage page index
export class CarouselController {
    constructor() {
        this._state = null; // Attached state
    }

    _attach(state) {
        this._state = state;
    }

    nextPage({ duration, curve } = {}) {
        this._state?.nextPage({ duration, curve });
    }

    previousPage({ duration, curve } = {}) {
        this._state?.previousPage({ duration, curve });
    }

    jumpToPage(page) {
        this._state?.jumpToPage(page);
    }
}

export class Carousel extends StatefulWidget {
    constructor({
        key,
        items = [],
        carouselController,
        options = {}, // height, aspectRatio, viewportFraction, etc.
    } = {}) {
        super(key);
        this.items = items;
        this.carouselController = carouselController;
        this.options = options;
    }

    createState() {
        return new CarouselState();
    }
}

class CarouselState extends StatefulWidget.State {
    constructor() {
        super();
        this.page = 0;
    }

    initState() {
        if (this.widget.carouselController) {
            this.widget.carouselController._attach(this);
        }
        this.page = this.widget.options.initialPage || 0;
    }

    nextPage() {
        this.setState(() => {
            if (this.page < this.widget.items.length - 1) {
                this.page++;
            } else if (this.widget.options.enableInfiniteScroll !== false) {
                this.page = 0;
            }
        });
    }

    previousPage() {
        this.setState(() => {
            if (this.page > 0) {
                this.page--;
            } else if (this.widget.options.enableInfiniteScroll !== false) {
                this.page = this.widget.items.length - 1;
            }
        });
    }

    jumpToPage(page) {
        if (page >= 0 && page < this.widget.items.length) {
            this.setState(() => {
                this.page = page;
            });
        }
    }

    build(context) {
        const theme = CarouselTheme.of(context) || {};

        // Merge options
        const height = this.widget.options.height || theme.height || 200.0;
        const scrollDirection = this.widget.options.scrollDirection || theme.scrollDirection || Axis.horizontal;

        // Very basic implementation: Show current item
        // Real carousel needs gesture handling/scroll physics which ListView provides but mapping page index requires ScrollController work.
        // For MVP: Display one item with simple buttons or swipe gesture detector on container. (Swiping implemented via horizontal drag)

        const currentItem = this.widget.items[this.page];

        return new GestureDetector({
            onPanUpdate: (details) => {
                // Simple swipe detection
                if (details.delta.dx < -10) {
                    this.nextPage();
                } else if (details.delta.dx > 10) {
                    this.previousPage();
                }
            },
            child: new Container({
                height: height,
                width: '100%',
                child: currentItem ? currentItem : new Container(),
                style: {
                    overflow: 'hidden',
                    // Flex alignment
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }
            })
        });
    }
}
