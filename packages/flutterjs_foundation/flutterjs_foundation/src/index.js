class FlutterjsFoundation {
  constructor(config = {}) {
    this.config = config;
  }
  /**
   * Example method - placeholder for foundation functionality
   */
  initialize() {
    console.debug("FlutterjsFoundation initialized");
  }
}
function debugPrint(message) {
  console.log(message);
}
function createInstance(config) {
  return new FlutterjsFoundation(config);
}
const TargetPlatform = Object.freeze({
  android: "android",
  fuchsia: "fuchsia",
  iOS: "iOS",
  linux: "linux",
  macOS: "macOS",
  windows: "windows"
});
const defaultTargetPlatform = null;
const kIsWeb = true;
const kDebugMode = true;
const kProfileMode = false;
const kReleaseMode = false;
const visibleForTesting = Object.freeze({
  _meta: "visibleForTesting",
  toString() {
    return "@visibleForTesting";
  }
});
const protectedMeta = Object.freeze({
  _meta: "protected",
  toString() {
    return "@protected";
  }
});
const required = Object.freeze({
  _meta: "required",
  toString() {
    return "@required";
  }
});
const immutable = Object.freeze({
  _meta: "immutable",
  toString() {
    return "@immutable";
  }
});
const mustCallSuper = Object.freeze({
  _meta: "mustCallSuper",
  toString() {
    return "@mustCallSuper";
  }
});
const nonVirtual = Object.freeze({
  _meta: "nonVirtual",
  toString() {
    return "@nonVirtual";
  }
});
const factory = Object.freeze({
  _meta: "factory",
  toString() {
    return "@factory";
  }
});
var src_default = FlutterjsFoundation;
export {
  FlutterjsFoundation,
  TargetPlatform,
  createInstance,
  debugPrint,
  src_default as default,
  defaultTargetPlatform,
  factory,
  immutable,
  kDebugMode,
  kIsWeb,
  kProfileMode,
  kReleaseMode,
  mustCallSuper,
  nonVirtual,
  protectedMeta,
  required,
  visibleForTesting
};
