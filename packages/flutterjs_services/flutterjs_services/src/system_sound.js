// Flutter services/system_sound.dart → JS

export const SystemSoundType = Object.freeze({
  click: 'click',
  tick:  'tick',
  alert: 'alert',
});

export class SystemSound {
  static play(type) {
    // No-op on web — no system sound API
    return Promise.resolve();
  }
}
