class FlutterjsServices {
  constructor(config = {}) {
    this.config = config;
  }
  /**
   * Example method - replace with your implementation
   */
  hello() {
    return "Hello from FlutterjsServices!";
  }
  /**
   * Example async method
   */
  async fetchData(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}
class MethodCall {
  /**
   * Creates a [MethodCall] representing the invocation of [method] with the
   * specified [arguments].
   *
   * @param {string} method
   * @param {any} [arguments]
   */
  constructor(method, args = null) {
    this.method = method;
    this.arguments = args;
  }
  toString() {
    return `MethodCall(${this.method}, ${this.arguments})`;
  }
}
class MethodCodec {
  /**
   * Encodes the specified [methodCall] into binary.
   *
   * @param {MethodCall} methodCall
   * @returns {Uint8Array}
   */
  encodeMethodCall(methodCall) {
    throw new Error("encodeMethodCall not implemented");
  }
  /**
   * Decodes the specified [methodCall] from binary.
   *
   * @param {Uint8Array} methodCall
   * @returns {MethodCall}
   */
  decodeMethodCall(methodCall) {
    throw new Error("decodeMethodCall not implemented");
  }
  /**
   * Decodes the specified [envelope] from binary.
   *
   * @param {Uint8Array} envelope
   * @returns {any}
   */
  decodeEnvelope(envelope) {
    throw new Error("decodeEnvelope not implemented");
  }
  /**
   * Encodes a successful [result] into a binary envelope.
   *
   * @param {any} result
   * @returns {Uint8Array}
   */
  encodeSuccessEnvelope(result) {
    throw new Error("encodeSuccessEnvelope not implemented");
  }
  /**
   * Encodes an error result into a binary envelope.
   *
   * @param {string} code
   * @param {string} [message]
   * @param {any} [details]
   * @returns {Uint8Array}
   */
  encodeErrorEnvelope({ code, message = null, details = null }) {
    throw new Error("encodeErrorEnvelope not implemented");
  }
}
class JSONMethodCodec extends MethodCodec {
  constructor() {
    super();
  }
  /**
   * @override
   */
  encodeMethodCall(methodCall) {
    const jsonString = JSON.stringify({
      method: methodCall.method,
      args: methodCall.arguments
    });
    return new TextEncoder().encode(jsonString);
  }
  /**
   * @override
   */
  decodeMethodCall(methodCall) {
    const jsonString = new TextDecoder().decode(methodCall);
    const decoded = JSON.parse(jsonString);
    if (typeof decoded !== "object" || decoded === null) {
      throw new Error(`Expected method call Map, got ${decoded}`);
    }
    const { method, args } = decoded;
    if (typeof method === "string") {
      return new MethodCall(method, args);
    }
    throw new Error(`Invalid method call: ${decoded}`);
  }
  /**
   * @override
   */
  decodeEnvelope(envelope) {
    const jsonString = new TextDecoder().decode(envelope);
    const decoded = JSON.parse(jsonString);
    if (!Array.isArray(decoded)) {
      throw new Error(`Expected envelope List, got ${decoded}`);
    }
    if (decoded.length === 1) {
      return decoded[0];
    }
    if (decoded.length === 3 && typeof decoded[0] === "string" && (decoded[1] === null || typeof decoded[1] === "string")) {
      const error = new Error(`${decoded[0]}: ${decoded[1] || ""}`);
      error.code = decoded[0];
      error.details = decoded[2];
      throw error;
    }
    if (decoded.length === 4 && typeof decoded[0] === "string" && (decoded[1] === null || typeof decoded[1] === "string") && (decoded[3] === null || typeof decoded[3] === "string")) {
      const error = new Error(`${decoded[0]}: ${decoded[1] || ""}`);
      error.code = decoded[0];
      error.details = decoded[2];
      error.stack = decoded[3];
      throw error;
    }
    throw new Error(`Invalid envelope: ${decoded}`);
  }
  /**
   * @override
   */
  encodeSuccessEnvelope(result) {
    const jsonString = JSON.stringify([result]);
    return new TextEncoder().encode(jsonString);
  }
  /**
   * @override
   */
  encodeErrorEnvelope({ code, message = null, details = null }) {
    const jsonString = JSON.stringify([code, message, details]);
    return new TextEncoder().encode(jsonString);
  }
}
class MethodChannel {
  constructor(name, codec = new JSONMethodCodec(), binaryMessenger = null) {
    this.name = name;
    this.codec = codec;
    this.binaryMessenger = binaryMessenger;
  }
  /**
   * Stub for invokeMethod
   * @returns {Promise<any>}
   */
  async invokeMethod(method, args) {
    console.warn(`MethodChannel(${this.name}).invokeMethod("${method}") called on web. This is a stub.`);
    return null;
  }
  /**
   * Stub for invokeListMethod
   */
  async invokeListMethod(method, args) {
    return [];
  }
  /**
   * Stub for invokeMapMethod
   */
  async invokeMapMethod(method, args) {
    return {};
  }
}
function createInstance(config) {
  return new FlutterjsServices(config);
}
const SystemUiOverlayStyle = Object.freeze({
  light: { brightness: "light" },
  dark: { brightness: "dark" }
});
class SystemChrome {
  /**
   * Sets the system overlay style (no-op on web)
   */
  static setSystemUIOverlayStyle(style) {
    console.debug("SystemChrome.setSystemUIOverlayStyle called on web (no-op)");
  }
  /**
   * Sets which overlays are visible (no-op on web)
   */
  static setEnabledSystemUIOverlays(overlays) {
    console.debug("SystemChrome.setEnabledSystemUIOverlays called on web (no-op)");
  }
  /**
   * Sets preferred orientations (no-op on web)
   */
  static setPreferredOrientations(orientations) {
    console.debug("SystemChrome.setPreferredOrientations called on web (no-op)");
    return Promise.resolve();
  }
  /**
   * Sets the system UI mode (no-op on web)
   */
  static setEnabledSystemUIMode(mode) {
    console.debug("SystemChrome.setEnabledSystemUIMode called on web (no-op)");
    return Promise.resolve();
  }
}
class PlatformException extends Error {
  /**
   * Creates a [PlatformException] with the specified error [code] and optional
   * [message] and [details].
   *
   * @param {string} code
   * @param {string} [message]
   * @param {any} [details]
   * @param {string} [stacktrace]
   */
  constructor(code, message = null, details = null, stacktrace = null) {
    super(message || code);
    this.name = "PlatformException";
    this.code = code;
    this.details = details;
    if (stacktrace) {
      this.stack = stacktrace;
    }
  }
  toString() {
    return `PlatformException(${this.code}, ${this.message}, ${this.details})`;
  }
}
class SystemNavigator {
  /**
   * Informs the system of a new route.
   *
   * @param {Object} options
   * @param {any} options.uri - The URI of the route
   */
  static routeInformationUpdated({ uri }) {
    console.debug("SystemNavigator.routeInformationUpdated called on web (no-op)", uri);
  }
  /**
   * Removes the topmost Flutter instance.
   */
  static pop() {
    console.debug("SystemNavigator.pop called on web");
    if (window.history.length > 1) {
      window.history.back();
    } else {
      console.warn("Cannot pop: no history available");
    }
  }
}
var src_default = FlutterjsServices;
export {
  FlutterjsServices,
  JSONMethodCodec,
  MethodCall,
  MethodChannel,
  MethodCodec,
  PlatformException,
  SystemChrome,
  SystemNavigator,
  SystemUiOverlayStyle,
  createInstance,
  src_default as default
};
//# sourceMappingURL=index.js.map
