// Flutter services/sensitive_content.dart → JS

export const ContentSensitivity = Object.freeze({
  autoSensitive: 'autoSensitive',
  sensitive:     'sensitive',
  notSensitive:  'notSensitive',
  _unknown:      '_unknown',
});

export class SensitiveContentService {
  static setContentSensitivity(sensitivity) {
    return Promise.resolve(); // No-op on web
  }
}
