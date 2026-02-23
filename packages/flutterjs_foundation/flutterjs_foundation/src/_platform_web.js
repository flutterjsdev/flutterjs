// Flutter foundation/_platform_web.dart → JS

export function defaultTargetPlatform() {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  }
  return 'android'; // Flutter web default
}
