// Flutter services/scribe.dart → JS

export class Scribe {
  static get isFeatureAvailable() {
    return Promise.resolve(false); // Not available on web
  }
  static startStylusHandwriting() { return Promise.resolve(); }
}
