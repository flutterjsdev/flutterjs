// Flutter services/platform_views.dart → JS (web-only)
// Android/iOS/Darwin platform view controllers are not available on web.
// Only PlatformViewsRegistry, PlatformViewsService (for HTML platform views),
// and PlatformViewController (abstract base) are included.

export class PlatformViewsRegistry {
  constructor() { this._nextId = 1; }
  getNextPlatformViewId() { return this._nextId++; }

  static get instance() {
    if (!PlatformViewsRegistry._instance) {
      PlatformViewsRegistry._instance = new PlatformViewsRegistry();
    }
    return PlatformViewsRegistry._instance;
  }
}

export class PlatformViewsService {
  static initAndroidView({ id, viewType, layoutDirection, creationParams, creationParamsCodec, onFocus } = {}) {
    throw new Error('AndroidView is not supported on web. Use HtmlElementView instead.');
  }
  static initExpensiveAndroidView({ id, viewType, layoutDirection, creationParams, creationParamsCodec, onFocus } = {}) {
    throw new Error('AndroidView is not supported on web. Use HtmlElementView instead.');
  }
  static initSurfaceAndroidView({ id, viewType, layoutDirection, creationParams, creationParamsCodec, onFocus } = {}) {
    throw new Error('AndroidView is not supported on web. Use HtmlElementView instead.');
  }
  static initUiKitView({ id, viewType, layoutDirection, creationParams, creationParamsCodec, onFocus } = {}) {
    throw new Error('UiKitView is not supported on web. Use HtmlElementView instead.');
  }
  static initAppKitView({ id, viewType, layoutDirection, creationParams, creationParamsCodec } = {}) {
    throw new Error('AppKitView is not supported on web. Use HtmlElementView instead.');
  }
}

export class PlatformViewController {
  get viewId() { throw new Error('viewId not implemented'); }
  dispatchPointerEvent(event) { throw new Error('not implemented'); }
  dispose() { throw new Error('not implemented'); }
  clearFocus() { throw new Error('not implemented'); }
}
