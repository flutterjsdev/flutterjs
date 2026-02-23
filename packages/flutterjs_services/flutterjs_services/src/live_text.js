// Flutter services/live_text.dart → JS

export class LiveText {
  static get isLiveTextInputAvailable() {
    return Promise.resolve(false); // Not available on web
  }
}
