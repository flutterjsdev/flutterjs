// Flutter services/font_loader.dart → JS

export class FontLoader {
  constructor(family) {
    this.family = family;
    this._fontByteDataList = [];
  }

  addFont(bytes) {
    this._fontByteDataList.push(bytes);
  }

  async load() {
    // On web, load fonts using the FontFace API
    for (const bytesPromise of this._fontByteDataList) {
      try {
        const bytes = await bytesPromise;
        if (typeof FontFace !== 'undefined') {
          const font = new FontFace(this.family, bytes);
          await font.load();
          document.fonts.add(font);
        }
      } catch (e) {
        console.warn(`FontLoader: failed to load font "${this.family}":`, e);
      }
    }
  }
}
