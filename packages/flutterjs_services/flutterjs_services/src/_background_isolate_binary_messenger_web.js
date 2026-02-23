// Flutter services/_background_isolate_binary_messenger_web.dart → JS

export class BackgroundIsolateBinaryMessenger {
  static get instance() {
    throw new Error(
      'BackgroundIsolateBinaryMessenger is not supported on web. ' +
      'Use ServicesBinding.defaultBinaryMessenger instead.'
    );
  }

  static ensureInitialized(rootIsolateToken) {
    // No-op on web — isolates not supported
  }

  send(channel, message) { return Promise.resolve(null); }
  setMessageHandler(channel, handler) {}
  handlePlatformMessage(channel, data, callback) { return Promise.resolve(); }
}
