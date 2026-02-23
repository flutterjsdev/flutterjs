// Flutter services/system_chrome.dart → JS

export const DeviceOrientation = Object.freeze({
  portraitUp:     'portraitUp',
  landscapeLeft:  'landscapeLeft',
  portraitDown:   'portraitDown',
  landscapeRight: 'landscapeRight',
});

export const SystemUiOverlay = Object.freeze({
  top:    'top',
  bottom: 'bottom',
});

export const SystemUiMode = Object.freeze({
  leanBack:        'leanBack',
  immersive:       'immersive',
  immersiveSticky: 'immersiveSticky',
  edgeToEdge:      'edgeToEdge',
  manual:          'manual',
});

export class ApplicationSwitcherDescription {
  constructor({ label = null, primaryColor = null } = {}) {
    this.label = label;
    this.primaryColor = primaryColor;
  }
}

export class SystemUiOverlayStyle {
  constructor({ statusBarColor = null, statusBarBrightness = null, statusBarIconBrightness = null,
                systemStatusBarContrastEnforced = null, systemNavigationBarColor = null,
                systemNavigationBarDividerColor = null, systemNavigationBarIconBrightness = null,
                systemNavigationBarContrastEnforced = null } = {}) {
    this.statusBarColor = statusBarColor;
    this.statusBarBrightness = statusBarBrightness;
    this.statusBarIconBrightness = statusBarIconBrightness;
    this.systemStatusBarContrastEnforced = systemStatusBarContrastEnforced;
    this.systemNavigationBarColor = systemNavigationBarColor;
    this.systemNavigationBarDividerColor = systemNavigationBarDividerColor;
    this.systemNavigationBarIconBrightness = systemNavigationBarIconBrightness;
    this.systemNavigationBarContrastEnforced = systemNavigationBarContrastEnforced;
  }

  static get light() {
    return new SystemUiOverlayStyle({ statusBarBrightness: 'light', statusBarIconBrightness: 'dark' });
  }
  static get dark() {
    return new SystemUiOverlayStyle({ statusBarBrightness: 'dark', statusBarIconBrightness: 'light' });
  }
  static get lightScrim() { return SystemUiOverlayStyle.light; }
  static get darkScrim()  { return SystemUiOverlayStyle.dark; }
}

export class SystemChrome {
  static setPreferredOrientations(orientations) {
    // No-op on web
    return Promise.resolve();
  }
  static setApplicationSwitcherDescription(description) { /* no-op */ }
  static setEnabledSystemUIOverlays(overlays) { /* no-op */ }
  static setEnabledSystemUIMode(mode, { overlays = null } = {}) {
    return Promise.resolve();
  }
  static setSystemUIChangeCallback(callback) { /* no-op */ }
  static restoreSystemUIOverlays() { /* no-op */ }
  static setSystemUIOverlayStyle(style) { /* no-op */ }
}
