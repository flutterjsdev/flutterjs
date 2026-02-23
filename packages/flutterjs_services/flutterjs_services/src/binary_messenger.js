// Flutter services/binary_messenger.dart → JS

export class BinaryMessenger {
  handlePlatformMessage(channel, data, callback) {
    throw new Error('handlePlatformMessage not implemented');
  }
  send(channel, message) {
    throw new Error('send not implemented');
  }
  setMessageHandler(channel, handler) {
    throw new Error('setMessageHandler not implemented');
  }
}
