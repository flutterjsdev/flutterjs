// Flutter services/clipboard.dart → JS

export class ClipboardData {
  constructor({ text = null } = {}) {
    this.text = text;
  }
}

export class Clipboard {
  static async setData(data) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(data.text ?? '');
    }
  }
  static async getData(format) {
    if (format === 'text/plain' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const text = await navigator.clipboard.readText();
        return new ClipboardData({ text });
      } catch {
        return null;
      }
    }
    return null;
  }
  static get kTextPlain() { return 'text/plain'; }
}
