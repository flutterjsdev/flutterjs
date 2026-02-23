// Flutter services/platform_channel.dart → JS
// BasicMessageChannel, MethodChannel, OptionalMethodChannel, EventChannel
// Web target: BinaryMessenger is a no-op; channels use stub implementations.

import { MethodCall, PlatformException, MissingPluginException } from './message_codec.js';

export function shouldProfilePlatformChannels() { return false; }

// Global handler registry: channelName → handler function
const _messageHandlers = new Map();

// Stub BinaryMessenger used when none is provided
const _defaultBinaryMessenger = {
  send(channel, message) { return Promise.resolve(null); },
  setMessageHandler(channel, handler) {
    if (handler == null) {
      _messageHandlers.delete(channel);
    } else {
      _messageHandlers.set(channel, handler);
    }
  },
  handlePlatformMessage(channel, data, callback) {
    const handler = _messageHandlers.get(channel);
    if (handler) {
      handler(data).then(reply => { if (callback) callback(reply); });
    } else {
      if (callback) callback(null);
    }
    return Promise.resolve();
  },
};

export class BasicMessageChannel {
  constructor(name, codec, { binaryMessenger = null } = {}) {
    this.name = name;
    this.codec = codec;
    this._binaryMessenger = binaryMessenger || _defaultBinaryMessenger;
  }

  get binaryMessenger() { return this._binaryMessenger; }

  async send(message) {
    const encoded = this.codec.encodeMessage(message);
    const result = await this._binaryMessenger.send(this.name, encoded);
    return this.codec.decodeMessage(result);
  }

  setMessageHandler(handler) {
    if (handler == null) {
      this._binaryMessenger.setMessageHandler(this.name, null);
    } else {
      this._binaryMessenger.setMessageHandler(this.name, async (message) => {
        const decoded = this.codec.decodeMessage(message);
        const reply = await handler(decoded);
        return this.codec.encodeMessage(reply);
      });
    }
  }
}

export class MethodChannel {
  constructor(name, codec = null, binaryMessenger = null) {
    this.name = name;
    this._codec = codec; // null = use StandardMethodCodec (lazy import)
    this._binaryMessenger = binaryMessenger || _defaultBinaryMessenger;
  }

  get codec() {
    if (!this._codec) {
      // Lazy: import StandardMethodCodec to avoid circular deps
      // For web stubs, we just use JSON
      this._codec = _lazyStandardMethodCodec();
    }
    return this._codec;
  }

  get binaryMessenger() { return this._binaryMessenger; }

  async invokeMethod(method, args) {
    const result = await this._invokeMethod(method, { missingOk: false, arguments: args });
    return result;
  }

  async invokeListMethod(method, args) {
    const result = await this.invokeMethod(method, args);
    return result == null ? null : Array.from(result);
  }

  async invokeMapMethod(method, args) {
    const result = await this.invokeMethod(method, args);
    return result;
  }

  async _invokeMethod(method, { missingOk, arguments: args }) {
    const input = this.codec.encodeMethodCall(new MethodCall(method, args));
    const result = await this._binaryMessenger.send(this.name, input);
    if (result == null) {
      if (missingOk) return null;
      throw new MissingPluginException(`No implementation found for method ${method} on channel ${this.name}`);
    }
    return this.codec.decodeEnvelope(result);
  }

  setMethodCallHandler(handler) {
    if (handler == null) {
      this._binaryMessenger.setMessageHandler(this.name, null);
    } else {
      this._binaryMessenger.setMessageHandler(this.name, async (message) => {
        const call = this.codec.decodeMethodCall(message);
        try {
          const result = await handler(call);
          return this.codec.encodeSuccessEnvelope(result);
        } catch (e) {
          if (e instanceof PlatformException) {
            return this.codec.encodeErrorEnvelope({ code: e.code, message: e.message, details: e.details });
          } else if (e instanceof MissingPluginException) {
            return null;
          } else {
            return this.codec.encodeErrorEnvelope({ code: 'error', message: String(e) });
          }
        }
      });
    }
  }
}

export class OptionalMethodChannel extends MethodChannel {
  async invokeMethod(method, args) {
    return this._invokeMethod(method, { missingOk: true, arguments: args });
  }
}

export class EventChannel {
  constructor(name, codec = null, binaryMessenger = null) {
    this.name = name;
    this._codec = codec;
    this._binaryMessenger = binaryMessenger || _defaultBinaryMessenger;
  }

  get codec() {
    if (!this._codec) this._codec = _lazyStandardMethodCodec();
    return this._codec;
  }

  receiveBroadcastStream(args) {
    const methodChannel = new MethodChannel(this.name, this.codec, this._binaryMessenger);
    const listeners = new Set();
    let active = false;

    const activate = async () => {
      if (active) return;
      active = true;
      this._binaryMessenger.setMessageHandler(this.name, async (reply) => {
        if (reply == null) {
          deactivate();
          return null;
        }
        try {
          const event = this.codec.decodeEnvelope(reply);
          for (const l of listeners) l.onData && l.onData(event);
        } catch (e) {
          for (const l of listeners) l.onError && l.onError(e);
        }
        return null;
      });
      try {
        await methodChannel.invokeMethod('listen', args);
      } catch (e) {
        console.error(`EventChannel(${this.name}): error activating stream`, e);
      }
    };

    const deactivate = async () => {
      if (!active) return;
      active = false;
      this._binaryMessenger.setMessageHandler(this.name, null);
      try {
        await methodChannel.invokeMethod('cancel', args);
      } catch (e) {
        console.error(`EventChannel(${this.name}): error deactivating stream`, e);
      }
    };

    return {
      listen(onData, { onError, onDone, cancelOnError } = {}) {
        const listener = { onData, onError, onDone };
        listeners.add(listener);
        if (listeners.size === 1) activate();
        return {
          cancel: async () => {
            listeners.delete(listener);
            if (listeners.size === 0) await deactivate();
          },
        };
      },
    };
  }
}

// Lazy accessor to avoid circular imports with message_codecs.js
let _cachedStandardMethodCodec = null;
function _lazyStandardMethodCodec() {
  if (!_cachedStandardMethodCodec) {
    // Inline minimal JSON-based codec as fallback
    _cachedStandardMethodCodec = {
      encodeMethodCall(call) {
        return new TextEncoder().encode(JSON.stringify({ method: call.method, args: call.arguments }));
      },
      decodeMethodCall(data) {
        const { method, args } = JSON.parse(new TextDecoder().decode(data));
        return new MethodCall(method, args);
      },
      decodeEnvelope(data) {
        const decoded = JSON.parse(new TextDecoder().decode(data));
        if (Array.isArray(decoded) && decoded.length === 1) return decoded[0];
        if (Array.isArray(decoded) && decoded.length >= 3) {
          throw new PlatformException({ code: decoded[0], message: decoded[1], details: decoded[2] });
        }
        return decoded;
      },
      encodeSuccessEnvelope(result) {
        return new TextEncoder().encode(JSON.stringify([result]));
      },
      encodeErrorEnvelope({ code, message = null, details = null }) {
        return new TextEncoder().encode(JSON.stringify([code, message, details]));
      },
    };
  }
  return _cachedStandardMethodCodec;
}
