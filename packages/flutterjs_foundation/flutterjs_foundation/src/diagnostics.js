// Flutter foundation/diagnostics.dart → JS
// Core diagnostics system: DiagnosticsNode, DiagnosticsProperty, DiagnosticableTree, etc.

// ─── Enums ────────────────────────────────────────────────────────────────────

export const DiagnosticLevel = Object.freeze({
  hidden: 'hidden',
  fine: 'fine',
  debug: 'debug',
  info: 'info',
  warning: 'warning',
  hint: 'hint',
  summary: 'summary',
  error: 'error',
  off: 'off',
  // index helper for comparisons
  _index: { hidden: 0, fine: 1, debug: 2, info: 3, warning: 4, hint: 5, summary: 6, error: 7, off: 8 },
});

export const DiagnosticsTreeStyle = Object.freeze({
  none: 'none',
  sparse: 'sparse',
  offstage: 'offstage',
  dense: 'dense',
  transition: 'transition',
  error: 'error',
  whitespace: 'whitespace',
  flat: 'flat',
  singleLine: 'singleLine',
  errorProperty: 'errorProperty',
  shallow: 'shallow',
  truncateChildren: 'truncateChildren',
});

export const _WordWrapParseMode = Object.freeze({
  inSpace: 'inSpace',
  inWord: 'inWord',
  atBreak: 'atBreak',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function _isSingleLine(style) {
  return style === DiagnosticsTreeStyle.singleLine;
}

export function shortHash(object) {
  // Returns a short hex string based on identity hash code approximation
  return object == null ? 'null' : (Math.abs(
    String(object).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
  ) >>> 0).toString(16).slice(0, 5).padStart(5, '0');
}

export function describeIdentity(object) {
  if (object == null) return 'null';
  const type = object.constructor?.name ?? typeof object;
  return `${type}#${shortHash(object)}`;
}

export function describeEnum(enumValue) {
  if (enumValue == null) return 'null';
  const str = String(enumValue);
  const dot = str.lastIndexOf('.');
  return dot >= 0 ? str.slice(dot + 1) : str;
}

// ─── TextTreeConfiguration ───────────────────────────────────────────────────

export class TextTreeConfiguration {
  constructor({
    prefixLineOne = '',
    prefixOtherLines = '',
    prefixLastChildLineOne = '',
    prefixOtherLinesRootNode = '',
    linkCharacter = '',
    propertyPrefixIfChildren = '',
    propertyPrefixNoChildren = '',
    lineBreak = '\n',
    lineBreakProperties = true,
    addBlankLineIfNoChildren = false,
    showChildren = true,
    propertySeparator = '',
    beforeProperties = '',
    afterProperties = '',
    mandatoryFooter = '',
    isBlankLineBetweenPropertiesAndChildren = false,
    bodyIndent = '',
    footer = '',
    showName = true,
    afterDescriptionIfBody = '',
    afterDescription = '',
    isNameOnOwnLine = false,
  } = {}) {
    this.prefixLineOne = prefixLineOne;
    this.prefixOtherLines = prefixOtherLines;
    this.prefixLastChildLineOne = prefixLastChildLineOne;
    this.prefixOtherLinesRootNode = prefixOtherLinesRootNode;
    this.linkCharacter = linkCharacter;
    this.propertyPrefixIfChildren = propertyPrefixIfChildren;
    this.propertyPrefixNoChildren = propertyPrefixNoChildren;
    this.lineBreak = lineBreak;
    this.lineBreakProperties = lineBreakProperties;
    this.addBlankLineIfNoChildren = addBlankLineIfNoChildren;
    this.showChildren = showChildren;
    this.propertySeparator = propertySeparator;
    this.beforeProperties = beforeProperties;
    this.afterProperties = afterProperties;
    this.mandatoryFooter = mandatoryFooter;
    this.isBlankLineBetweenPropertiesAndChildren = isBlankLineBetweenPropertiesAndChildren;
    this.bodyIndent = bodyIndent;
    this.footer = footer;
    this.showName = showName;
    this.afterDescriptionIfBody = afterDescriptionIfBody;
    this.afterDescription = afterDescription;
    this.isNameOnOwnLine = isNameOnOwnLine;
  }
}

// Standard tree configurations
export const sparseTextConfiguration = new TextTreeConfiguration({
  prefixLineOne: '├─',
  prefixOtherLines: '│ ',
  prefixLastChildLineOne: '└─',
  prefixOtherLinesRootNode: '  ',
  linkCharacter: '│',
  propertyPrefixIfChildren: '│ ',
  propertyPrefixNoChildren: '  ',
  addBlankLineIfNoChildren: true,
  isBlankLineBetweenPropertiesAndChildren: true,
});

export const denseTextConfiguration = new TextTreeConfiguration({
  prefixLineOne: '├─',
  prefixOtherLines: '│ ',
  prefixLastChildLineOne: '└─',
  prefixOtherLinesRootNode: '  ',
  linkCharacter: '│',
  propertyPrefixIfChildren: '│ ',
  propertyPrefixNoChildren: '  ',
  lineBreakProperties: false,
});

// ─── _PrefixedStringBuilder ───────────────────────────────────────────────────

export class _PrefixedStringBuilder {
  constructor(prefixLineOne, prefixOtherLines, wrapWidth = 100) {
    this._prefixLineOne = prefixLineOne;
    this._prefixOtherLines = prefixOtherLines;
    this._wrapWidth = wrapWidth;
    this._buffer = '';
    this._atLineStart = true;
    this._numLines = 0;
  }

  get prefixOtherLines() { return this._prefixOtherLines; }
  set prefixOtherLines(v) { this._prefixOtherLines = v; }

  get wrapWidth() { return this._wrapWidth; }

  writeRaw(s) { this._buffer += s; }

  write(s, { allowWrap = false } = {}) {
    if (!s) return;
    const prefix = this._atLineStart ? (this._numLines === 0 ? this._prefixLineOne : this._prefixOtherLines) : '';
    this._buffer += prefix + s;
    this._atLineStart = false;
  }

  writeRawLine(s) {
    this._buffer += s + '\n';
    this._atLineStart = true;
    this._numLines++;
  }

  get numLines() { return this._numLines; }

  toString() { return this._buffer; }

  build() { return this._buffer; }
}

// ─── _NoDefaultValue ─────────────────────────────────────────────────────────

export class _NoDefaultValue {
  toString() { return '<no default>'; }
}

export const kNoDefaultValue = new _NoDefaultValue();

// ─── TextTreeRenderer ─────────────────────────────────────────────────────────

export class TextTreeRenderer {
  constructor({ wrapWidth = 100, wrapWidthProperties = 65, minLevel = DiagnosticLevel.debug } = {}) {
    this._wrapWidth = wrapWidth;
    this._wrapWidthProperties = wrapWidthProperties;
    this._minLevel = minLevel;
  }

  render(node, { prefixLineOne = '', prefixOtherLines = '', parentConfiguration = null } = {}) {
    if (node.style === DiagnosticsTreeStyle.singleLine) {
      return node.toStringDeep({ prefixLineOne, prefixOtherLines });
    }
    return this._render(node, prefixLineOne, prefixOtherLines, parentConfiguration);
  }

  _render(node, prefixLineOne, prefixOtherLines, parentConfiguration) {
    const description = node.toDescription() ?? '';
    const name = node.name ?? '';
    const showName = node.showName !== false;
    const showSeparator = node.showSeparator !== false;

    let header = '';
    if (showName && name) {
      header += name;
      if (showSeparator && description) header += ': ';
    }
    if (description) header += description;

    const properties = node.getProperties ? node.getProperties() : [];
    const children = node.getChildren ? node.getChildren() : [];

    const lines = [prefixLineOne + header];

    if (properties.length > 0) {
      for (const prop of properties) {
        const rendered = this._renderProperty(prop, prefixOtherLines + '  ');
        lines.push(rendered);
      }
    }

    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const isLast = i === children.length - 1;
        const childPrefix = prefixOtherLines + (isLast ? '└─' : '├─');
        const childContinuation = prefixOtherLines + (isLast ? '  ' : '│ ');
        lines.push(this._render(child, childPrefix, childContinuation, null));
      }
    }

    return lines.join('\n');
  }

  _renderProperty(prop, indent) {
    const name = prop.name ?? '';
    const value = prop.toDescription ? prop.toDescription() : String(prop.value ?? '');
    return indent + (name ? `${name}: ${value}` : value);
  }
}

// ─── DiagnosticsNode ─────────────────────────────────────────────────────────

export class DiagnosticsNode {
  constructor(name, { style = DiagnosticsTreeStyle.sparse, showName = true, showSeparator = true, linePrefix = null } = {}) {
    this.name = name;
    this.style = style;
    this.showName = showName;
    this.showSeparator = showSeparator;
    this.linePrefix = linePrefix;
    this.level = DiagnosticLevel.info;
  }

  get isFiltered() { return false; }
  get emptyBodyDescription() { return null; }

  toDescription({ parentConfiguration = null } = {}) { return ''; }

  getProperties() { return []; }
  getChildren() { return []; }

  toStringDeep({ prefixLineOne = '', prefixOtherLines = '', parentConfiguration = null, minLevel = DiagnosticLevel.debug } = {}) {
    const renderer = new TextTreeRenderer({ minLevel });
    return renderer.render(this, { prefixLineOne, prefixOtherLines, parentConfiguration });
  }

  toString({ minLevel = DiagnosticLevel.debug, wrapWidth = 65, parentConfiguration = null } = {}) {
    const desc = this.toDescription({ parentConfiguration });
    if (this.name != null && this.showName !== false) {
      return `${this.name}${this.showSeparator !== false ? ': ' : ' '}${desc}`;
    }
    return desc;
  }

  toJsonMap(delegate) {
    const json = {};
    if (this.name != null) json.name = this.name;
    json.description = this.toDescription() ?? '';
    json.level = this.level;
    json.style = this.style;
    json.showSeparator = this.showSeparator ?? true;
    json.showName = this.showName ?? true;
    const properties = this.getProperties();
    json.properties = properties.map(p => p.toJsonMap(delegate));
    const children = this.getChildren();
    if (children.length > 0) {
      json.children = children.map(c => c.toJsonMap(delegate));
    }
    return json;
  }
}

// ─── DiagnosticsProperty ─────────────────────────────────────────────────────

export class DiagnosticsProperty extends DiagnosticsNode {
  constructor(name, value, {
    description = null,
    ifNull = null,
    ifEmpty = null,
    showName = true,
    showSeparator = true,
    defaultValue = kNoDefaultValue,
    tooltip = null,
    missingIfNull = false,
    style = DiagnosticsTreeStyle.singleLine,
    level = DiagnosticLevel.info,
  } = {}) {
    super(name, { style, showName, showSeparator });
    this._value = value;
    this._description = description;
    this.ifNull = ifNull;
    this.ifEmpty = ifEmpty;
    this.defaultValue = defaultValue;
    this.tooltip = tooltip;
    this.missingIfNull = missingIfNull;
    this.level = level;
  }

  get value() { return this._value; }

  toDescription({ parentConfiguration = null } = {}) {
    if (this._description != null) return this._addTooltip(this._description);
    if (this._value == null) return this._addTooltip(this.ifNull ?? 'null');
    const str = String(this._value);
    if (str === '' && this.ifEmpty != null) return this._addTooltip(this.ifEmpty);
    return this._addTooltip(str);
  }

  _addTooltip(description) {
    if (!this.tooltip) return description;
    return `${description} (${this.tooltip})`;
  }

  toString({ minLevel = DiagnosticLevel.debug, wrapWidth = 65, parentConfiguration = null } = {}) {
    if (this.name != null && this.showName !== false) {
      return `${this.name}${this.showSeparator !== false ? ': ' : ' '}${this.toDescription()}`;
    }
    return this.toDescription();
  }
}

// ─── Property subclasses ──────────────────────────────────────────────────────

export class MessageProperty extends DiagnosticsNode {
  constructor(name, message, { style = DiagnosticsTreeStyle.singleLine, level = DiagnosticLevel.info } = {}) {
    super(name, { style, showSeparator: true });
    this._message = message;
    this.level = level;
  }
  toDescription({ parentConfiguration = null } = {}) { return this._message; }
}

export class StringProperty extends DiagnosticsProperty {
  constructor(name, value, {
    description = null, tooltip = null, quoted = true, ifEmpty = null,
    defaultValue = kNoDefaultValue, showName = true, showSeparator = true,
    style = DiagnosticsTreeStyle.singleLine, level = DiagnosticLevel.info,
  } = {}) {
    super(name, value, { description, tooltip, ifEmpty, defaultValue, showName, showSeparator, style, level });
    this._quoted = quoted;
  }

  toDescription({ parentConfiguration = null } = {}) {
    if (this._value == null) return this.ifNull ?? 'null';
    if (this._description != null) return this._quoted ? `"${this._description}"` : this._description;
    return this._quoted ? `"${this._value}"` : String(this._value);
  }
}

export class _NumProperty extends DiagnosticsProperty {
  constructor(name, value, { ifNull = null, unit = null, tooltip = null, defaultValue = kNoDefaultValue, style = DiagnosticsTreeStyle.singleLine, level = DiagnosticLevel.info } = {}) {
    super(name, value, { ifNull, tooltip, defaultValue, style, level });
    this._unit = unit;
  }

  numberToString() { return String(this._value); }

  toDescription({ parentConfiguration = null } = {}) {
    if (this._value == null) return this.ifNull ?? 'null';
    const n = this.numberToString();
    return this._unit != null ? `${n}${this._unit}` : n;
  }
}

export class DoubleProperty extends _NumProperty {
  constructor(name, value, { ifNull = null, unit = null, tooltip = null, defaultValue = kNoDefaultValue, style = DiagnosticsTreeStyle.singleLine, level = DiagnosticLevel.info } = {}) {
    super(name, value, { ifNull, unit, tooltip, defaultValue, style, level });
  }
  numberToString() {
    if (this._value == null) return 'null';
    return Number.isInteger(this._value) ? `${this._value}.0` : String(this._value);
  }
}

export class IntProperty extends _NumProperty {
  constructor(name, value, { ifNull = null, unit = null, tooltip = null, defaultValue = kNoDefaultValue, style = DiagnosticsTreeStyle.singleLine, level = DiagnosticLevel.info } = {}) {
    super(name, value, { ifNull, unit, tooltip, defaultValue, style, level });
  }
  numberToString() { return this._value == null ? 'null' : String(Math.trunc(this._value)); }
}

export class PercentProperty extends DoubleProperty {
  constructor(name, fraction, { ifNull = null, unit = '%', tooltip = null, style = DiagnosticsTreeStyle.singleLine, level = DiagnosticLevel.info } = {}) {
    super(name, fraction, { ifNull, unit, tooltip, style, level });
  }
  numberToString() {
    if (this._value == null) return 'null';
    return `${(this._value * 100).toFixed(1)}`;
  }
}

export class FlagProperty extends DiagnosticsProperty {
  constructor(name, { value, ifTrue = null, ifFalse = null, showName = false, defaultValue = null, level = DiagnosticLevel.info } = {}) {
    super(name, value, { showName, defaultValue, level });
    this._ifTrue = ifTrue;
    this._ifFalse = ifFalse;
  }

  get level() {
    if (this._value == null) return this._level ?? DiagnosticLevel.info;
    if (this._value && this._ifTrue == null) return DiagnosticLevel.hidden;
    if (!this._value && this._ifFalse == null) return DiagnosticLevel.hidden;
    return this._level ?? DiagnosticLevel.info;
  }
  set level(v) { this._level = v; }

  toDescription({ parentConfiguration = null } = {}) {
    if (this._value == null) return '';
    return this._value ? (this._ifTrue ?? '') : (this._ifFalse ?? '');
  }
}

export class IterableProperty extends DiagnosticsProperty {
  constructor(name, value, {
    defaultValue = kNoDefaultValue, ifNull = null, ifEmpty = '[]',
    style = DiagnosticsTreeStyle.singleLine, showName = true, showSeparator = true,
    level = DiagnosticLevel.info,
  } = {}) {
    super(name, value, { defaultValue, ifNull, ifEmpty, style, showName, showSeparator, level });
  }

  toDescription({ parentConfiguration = null } = {}) {
    if (this._value == null) return this.ifNull ?? 'null';
    const arr = Array.from(this._value);
    if (arr.length === 0) return this.ifEmpty ?? '[]';
    return arr.join(', ');
  }
}

export class EnumProperty extends DiagnosticsProperty {
  constructor(name, value, { defaultValue = kNoDefaultValue, level = DiagnosticLevel.info } = {}) {
    super(name, value, { defaultValue, level });
  }
  toDescription({ parentConfiguration = null } = {}) {
    if (this._value == null) return 'null';
    return describeEnum(this._value);
  }
}

export class ObjectFlagProperty extends DiagnosticsProperty {
  constructor(name, value, { ifPresent = null, ifNull = null, showName = false, level = DiagnosticLevel.info } = {}) {
    super(name, value, { ifNull, showName, level });
    this._ifPresent = ifPresent;
  }

  get level() {
    if (this._value != null && this._ifPresent == null) return DiagnosticLevel.hidden;
    if (this._value == null && this.ifNull == null) return DiagnosticLevel.hidden;
    return this._level ?? DiagnosticLevel.info;
  }
  set level(v) { this._level = v; }

  toDescription({ parentConfiguration = null } = {}) {
    return this._value != null ? (this._ifPresent ?? String(this._value)) : (this.ifNull ?? 'null');
  }
}

export class FlagsSummary extends DiagnosticsProperty {
  constructor(name, value, { ifEmpty = null, showName = true, showSeparator = true, level = DiagnosticLevel.info } = {}) {
    super(name, value, { ifEmpty, showName, showSeparator, level });
  }

  toDescription({ parentConfiguration = null } = {}) {
    if (this._value == null) return 'null';
    const active = Object.entries(this._value)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (active.length === 0) return this.ifEmpty ?? 'none';
    return active.join(', ');
  }
}

// ─── DiagnosticPropertiesBuilder ──────────────────────────────────────────────

export class DiagnosticPropertiesBuilder {
  constructor() {
    this.properties = [];
    this.defaultDiagnosticsTreeStyle = DiagnosticsTreeStyle.sparse;
    this.emptyBodyDescription = null;
  }

  add(property) {
    if (property != null) this.properties.push(property);
  }
}

// ─── Diagnosticable / DiagnosticableTree ─────────────────────────────────────

export class Diagnosticable {
  toStringShort() { return describeIdentity(this); }

  toString({ minLevel = DiagnosticLevel.debug } = {}) {
    return toStringHelper(this, '', minLevel);
  }

  toDiagnosticsNode({ name = null, style = null } = {}) {
    return new DiagnosticableNode(name, this, { style: style ?? DiagnosticsTreeStyle.sparse });
  }

  debugFillProperties(properties) { /* override to add */ }
}

function toStringHelper(object, joiner, minLevel) {
  const builder = new DiagnosticPropertiesBuilder();
  if (object.debugFillProperties) object.debugFillProperties(builder);
  const parts = [object.toStringShort ? object.toStringShort() : describeIdentity(object)];
  for (const p of builder.properties) {
    if (p.level === DiagnosticLevel.hidden) continue;
    const desc = p.toDescription ? p.toDescription() : '';
    if (desc) {
      const name = p.showName !== false && p.name ? `${p.name}: ` : '';
      parts.push(name + desc);
    }
  }
  return parts.join(joiner || ', ');
}

export class DiagnosticableTree extends Diagnosticable {
  toStringShallow({ joiner = ', ', minLevel = DiagnosticLevel.debug } = {}) {
    return toStringHelper(this, joiner, minLevel);
  }

  toStringDeep({ prefixLineOne = '', prefixOtherLines = '', minLevel = DiagnosticLevel.debug } = {}) {
    return this.toDiagnosticsNode().toStringDeep({ prefixLineOne, prefixOtherLines, minLevel });
  }

  toDiagnosticsNode({ name = null, style = null } = {}) {
    return new DiagnosticableTreeNode(name, this, { style: style ?? DiagnosticsTreeStyle.sparse });
  }

  debugDescribeChildren() { return []; }
}

export class DiagnosticableTreeMixin extends DiagnosticableTree {
  // Mixin pattern — use as base class
}

// ─── DiagnosticableNode / DiagnosticableTreeNode ──────────────────────────────

export class DiagnosticableNode extends DiagnosticsNode {
  constructor(name, value, { style = DiagnosticsTreeStyle.sparse, showName = true } = {}) {
    super(name, { style, showName });
    this._value = value;
  }

  get value() { return this._value; }

  toDescription({ parentConfiguration = null } = {}) {
    return this._value?.toStringShort ? this._value.toStringShort() : describeIdentity(this._value);
  }

  getProperties() {
    if (!this._value) return [];
    const builder = new DiagnosticPropertiesBuilder();
    if (this._value.debugFillProperties) this._value.debugFillProperties(builder);
    return builder.properties;
  }
}

export class DiagnosticableTreeNode extends DiagnosticableNode {
  constructor(name, value, { style = DiagnosticsTreeStyle.sparse, showName = true } = {}) {
    super(name, value, { style, showName });
  }

  getChildren() {
    if (!this._value?.debugDescribeChildren) return [];
    return this._value.debugDescribeChildren();
  }
}

// ─── DiagnosticsBlock ─────────────────────────────────────────────────────────

export class DiagnosticsBlock extends DiagnosticsNode {
  constructor(name, {
    children = [],
    properties = [],
    value = null,
    description = null,
    showName = true,
    showSeparator = true,
    style = DiagnosticsTreeStyle.whitespace,
    level = DiagnosticLevel.info,
  } = {}) {
    super(name, { style, showName, showSeparator });
    this._children = children;
    this._properties = properties;
    this._value = value;
    this._description = description;
    this.level = level;
  }

  get value() { return this._value; }

  toDescription({ parentConfiguration = null } = {}) {
    return this._description ?? '';
  }

  getProperties() { return this._properties; }
  getChildren() { return this._children; }
}

// ─── DiagnosticsSerializationDelegate ────────────────────────────────────────

export class DiagnosticsSerializationDelegate {
  get includeProperties() { return false; }
  get subtreeDepth() { return 5; }
  get expandPropertyValues() { return true; }

  nodeToJsonMap(node, json, delegate) { return json; }
  filterChildren(nodes, owner) { return nodes; }
  filterProperties(nodes, owner) { return nodes; }
  truncateNodesList(nodes, owner) { return nodes; }
  delegateForNode(node) { return this; }
}

export class _DefaultDiagnosticsSerializationDelegate extends DiagnosticsSerializationDelegate {
  constructor({ includeProperties = false, subtreeDepth = 5 } = {}) {
    super();
    this._includeProperties = includeProperties;
    this._subtreeDepth = subtreeDepth;
  }

  get includeProperties() { return this._includeProperties; }
  get subtreeDepth() { return this._subtreeDepth; }

  delegateForNode(node) {
    return this._subtreeDepth > 0
      ? new _DefaultDiagnosticsSerializationDelegate({ includeProperties: this._includeProperties, subtreeDepth: this._subtreeDepth - 1 })
      : this;
  }
}
