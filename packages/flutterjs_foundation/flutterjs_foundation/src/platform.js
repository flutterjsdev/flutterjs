// Flutter foundation/platform.dart → JS

export const TargetPlatform = Object.freeze({
  android: 'android',
  fuchsia: 'fuchsia',
  iOS: 'iOS',
  linux: 'linux',
  macOS: 'macOS',
  windows: 'windows',
});

let _debugOverride = null;

export function debugDefaultTargetPlatformOverride() { return _debugOverride; }
export function setDebugDefaultTargetPlatformOverride(value) { _debugOverride = value; }

export function defaultTargetPlatform() {
  if (_debugOverride !== null) return _debugOverride;
  // On web, detect based on userAgent
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return TargetPlatform.android;
    if (/iPhone|iPad|iPod/i.test(ua)) return TargetPlatform.iOS;
  }
  return TargetPlatform.android; // Flutter web default
}
