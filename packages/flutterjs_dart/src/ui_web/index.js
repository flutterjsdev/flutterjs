
export const platformViewRegistry = {
    registerViewFactory: (viewType, viewFactory, { isVisible } = {}) => {
        console.debug(`[flutterjs] platformViewRegistry.registerViewFactory called for ${viewType}`);
    }
};

export const assetManager = {
    getAssetUrl: (asset) => asset
};

export const urlStrategy = {
    getPath: () => window.location.pathname,
    pushState: (state, title, url) => window.history.pushState(state, title, url),
    replaceState: (state, title, url) => window.history.replaceState(state, title, url),
    addPopStateListener: (listener) => window.addEventListener('popstate', listener),
    removePopStateListener: (listener) => window.removeEventListener('popstate', listener),
};
