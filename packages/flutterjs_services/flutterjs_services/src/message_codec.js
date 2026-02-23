// Flutter services/message_codec.dart → JS
// MessageCodec, MethodCall, MethodCodec, PlatformException, MissingPluginException

export class MessageCodec {
  encodeMessage(message) { throw new Error('encodeMessage not implemented'); }
  decodeMessage(message) { throw new Error('decodeMessage not implemented'); }
}

export class MethodCall {
  constructor(method, args = null) {
    this.method = method;
    this.arguments = args;
  }
  toString() {
    return `MethodCall(${this.method}, ${this.arguments})`;
  }
}

export class MethodCodec {
  encodeMethodCall(methodCall) { throw new Error('encodeMethodCall not implemented'); }
  decodeMethodCall(methodCall) { throw new Error('decodeMethodCall not implemented'); }
  decodeEnvelope(envelope) { throw new Error('decodeEnvelope not implemented'); }
  encodeSuccessEnvelope(result) { throw new Error('encodeSuccessEnvelope not implemented'); }
  encodeErrorEnvelope({ code, message = null, details = null }) {
    throw new Error('encodeErrorEnvelope not implemented');
  }
}

export class PlatformException extends Error {
  constructor({ code, message = null, details = null, stacktrace = null }) {
    super(message || code);
    this.name = 'PlatformException';
    this.code = code;
    this.details = details;
    this.stacktrace = stacktrace;
  }
  toString() {
    return `PlatformException(${this.code}, ${this.message}, ${this.details}, ${this.stacktrace})`;
  }
}

export class MissingPluginException extends Error {
  constructor(message = null) {
    super(message || 'MissingPluginException');
    this.name = 'MissingPluginException';
  }
  toString() {
    return `MissingPluginException(${this.message})`;
  }
}
