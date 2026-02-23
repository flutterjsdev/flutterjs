// Flutter services/haptic_feedback.dart → JS

export class HapticFeedback {
  static vibrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    return Promise.resolve();
  }
  static lightImpact() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
    return Promise.resolve();
  }
  static mediumImpact() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    return Promise.resolve();
  }
  static heavyImpact() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    return Promise.resolve();
  }
  static selectionClick() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(5);
    return Promise.resolve();
  }
}
