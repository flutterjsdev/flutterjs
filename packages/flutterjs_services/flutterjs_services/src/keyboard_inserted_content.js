// Flutter services/keyboard_inserted_content.dart → JS

export class KeyboardInsertedContent {
  constructor({ mimeType, uri = null, data = null }) {
    this.mimeType = mimeType;
    this.uri = uri;
    this.data = data;
  }
  get hasData() { return this.data != null; }
}
