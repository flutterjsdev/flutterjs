// Flutter services/asset_manifest.dart → JS

export class AssetMetadata {
  constructor({ key, transformedVariants = [] }) {
    this.key = key;
    this.transformedVariants = transformedVariants;
  }
}

export class AssetManifest {
  constructor(manifest) {
    this._manifest = manifest ?? {};
  }

  static async loadFromAssetBundle(bundle) {
    try {
      const data = await bundle.loadString('AssetManifest.bin.json');
      return new AssetManifest(JSON.parse(data));
    } catch {
      return new AssetManifest({});
    }
  }

  static parseFromJson(jsonData) {
    return new AssetManifest(
      typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
    );
  }

  listAssets() {
    return Object.keys(this._manifest);
  }

  getAssetVariants(key) {
    const entry = this._manifest[key];
    if (!entry) return null;
    if (Array.isArray(entry)) {
      return entry.map(v => new AssetMetadata({ key: v.asset ?? v, transformedVariants: v.transformedVariants ?? [] }));
    }
    return [new AssetMetadata({ key })];
  }
}
