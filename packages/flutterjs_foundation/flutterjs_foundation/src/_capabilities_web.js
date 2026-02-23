// Flutter foundation/_capabilities_web.dart → JS

export function isCanvasKit() {
  return typeof window !== 'undefined' && window.flutterCanvasKit != null;
}

export function isSkwasm() {
  return typeof window !== 'undefined' && window._flutter_skwasmInstance != null;
}

export function isSkiaWeb() {
  return isCanvasKit() || isSkwasm();
}
