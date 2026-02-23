// Flutter foundation/capabilities.dart → JS (delegates to web impl)

export function isCanvasKit() {
  return typeof window !== 'undefined' && window.flutterCanvasKit != null;
}

export function isSkwasm() {
  return typeof window !== 'undefined' && window._flutter_skwasmInstance != null;
}

export function isSkiaWeb() {
  return isCanvasKit() || isSkwasm();
}
