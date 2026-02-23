// Flutter foundation/licenses.dart → JS

export class LicenseParagraph {
  constructor({ text, indent }) {
    this.text = text;
    this.indent = indent; // null = centered title
  }

  static get centeredIndent() { return -1; }
}

export class LicenseEntry {
  get packages() { throw new Error('packages not implemented'); }
  get paragraphs() { throw new Error('paragraphs not implemented'); }
}

export class LicenseEntryWithLineBreaks extends LicenseEntry {
  constructor(packages, text) {
    super();
    this._packages = packages;
    this._text = text;
  }

  get packages() { return this._packages; }

  *paragraphs() {
    // Split on double newlines for paragraphs
    const sections = this._text.split(/\n\n+/);
    let indent = 0;
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;
      // Simple indent detection: count leading spaces / 2
      const match = section.match(/^(\s+)/);
      indent = match ? Math.floor(match[1].length / 2) : 0;
      yield new LicenseParagraph({ text: trimmed, indent });
    }
  }
}

export class LicenseRegistry {
  static addLicense(collector) {
    LicenseRegistry._collectors.push(collector);
  }

  static async *licenses() {
    for (const collector of LicenseRegistry._collectors) {
      const stream = collector();
      if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        for await (const entry of stream) yield entry;
      } else if (stream && typeof stream[Symbol.iterator] === 'function') {
        for (const entry of stream) yield entry;
      }
    }
  }

  static reset() { LicenseRegistry._collectors = []; }
}
LicenseRegistry._collectors = [];
