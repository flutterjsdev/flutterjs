import { State, StatefulElement } from "@flutterjs/runtime";
import { SeoManager } from "./seo_manager.js";

// Helper for StatefulWidget
class StatefulWidget {
    constructor(key) {
        this.key = key;
    }

    createState() {
        throw new Error("createState() not implemented");
    }

    createElement(parent, runtime) {
        return new StatefulElement(this, parent, runtime);
    }
}

export class Seo extends StatefulWidget {
    constructor({ key, title, meta, child, debug = false } = {}) {
        super(key);
        this.title = title;
        this.meta = meta;
        this.child = child;
        this.debug = debug;
    }

    createState() {
        return new _SeoState();
    }

    static head({ title, meta } = {}) {
        SeoManager.instance.update({ title, meta });
    }
}

class _SeoState extends State {
    initState() {
        this._updateSeo();
    }

    didUpdateWidget(oldWidget) {
        this._updateSeo();
    }

    _updateSeo() {
        const { title, meta, debug } = this.widget;
        SeoManager.instance.update({ title, meta });

        if (debug) {
            setTimeout(() => {
                SeoManager.instance.verify({ title, meta });
            }, 100);
        }
    }

    build(context) {
        return this.widget.child;
    }
}
