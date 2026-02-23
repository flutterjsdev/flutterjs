// Flutter foundation/_timeline_web.dart → JS

export function performanceTimestamp() {
  if (typeof performance !== 'undefined') return performance.now();
  return Date.now();
}

export class _DomPerformance {
  static now() { return performanceTimestamp(); }
}
