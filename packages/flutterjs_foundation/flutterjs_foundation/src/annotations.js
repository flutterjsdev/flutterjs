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

// Common Flutter annotations — all are no-ops in JS (they only matter to the Dart analyzer/compiler)
// They must be exported so transpiled Dart code that references them can import them.

export class _VisibleForTesting {
  constructor() { }
}
export const visibleForTesting = new _VisibleForTesting();

export class _VisibleForOverriding {
  constructor() { }
}
export const visibleForOverriding = new _VisibleForOverriding();

export class _NonVirtual {
  constructor() { }
}
export const nonVirtual = new _NonVirtual();

export class _Immutable {
  constructor() { }
}
export const immutable = new _Immutable();

export class _MustCallSuper {
  constructor() { }
}
export const mustCallSuper = new _MustCallSuper();

export class _Protected {
  constructor() { }
}
export const protected_ = new _Protected();

export class _Override {
  constructor() { }
}
export const override = new _Override();

export class _Required {
  constructor(reason = '') {
    this.reason = reason;
  }
}
export const required = new _Required();

export class _Deprecated {
  constructor(message = '') {
    this.message = message;
  }
  toString() { return `Deprecated: ${this.message}`; }
}
export const deprecated = new _Deprecated();

// Additional commonly-used Flutter meta annotations
export class _Factory {
  constructor() { }
}
export const factory = new _Factory();

export class _Literal {
  constructor() { }
}
export const literal = new _Literal();

export class _Sealed {
  constructor() { }
}
export const sealed = new _Sealed();

export class _UseResult {
  constructor(message = '') {
    this.message = message;
  }
}
export const useResult = new _UseResult();
