// Flutter services/system_navigator.dart → JS

export class SystemNavigator {
  static routeInformationUpdated({ uri, state = null, replace = false }) {
    if (typeof history !== 'undefined') {
      const url = uri instanceof URL ? uri.toString() : String(uri);
      if (replace) {
        history.replaceState(state, '', url);
      } else {
        history.pushState(state, '', url);
      }
    }
  }
  static routeUpdated({ routeName, previousRouteName = null }) {
    // No-op on web
  }
  static pop() {
    if (typeof history !== 'undefined' && history.length > 1) {
      history.back();
    }
  }
  static selectSingleEntryHistory() { /* no-op on web */ }
  static selectMultiEntryHistory() { /* no-op on web */ }
}
