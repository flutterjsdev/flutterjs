// Flutter foundation/annotations.dart → JS
// Metadata annotations (no-ops in JS — used only by Dart analyzer)

export class Category {
  constructor(...categories) {
    this.categories = categories;
  }
}

export class DocumentationIcon {
  constructor(url) {
    this.url = url;
  }
}

export class Summary {
  constructor(text) {
    this.text = text;
  }
}
