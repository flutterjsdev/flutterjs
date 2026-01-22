export class Border {
  constructor({
    top = null,
    right = null,
    bottom = null,
    left = null
  } = {}) {
    this.top = top || { width: 0, color: '#000000', style: 'solid' };
    this.right = right || { width: 0, color: '#000000', style: 'solid' };
    this.bottom = bottom || { width: 0, color: '#000000', style: 'solid' };
    this.left = left || { width: 0, color: '#000000', style: 'solid' };
  }

  static all({ width = 1, color = '#000000', style = 'solid' } = {}) {
    const side = { width, color, style };
    return new Border({ top: side, right: side, bottom: side, left: side });
  }

  static symmetric({ vertical = null, horizontal = null } = {}) {
    return new Border({
      top: vertical,
      bottom: vertical,
      left: horizontal,
      right: horizontal
    });
  }

  toCSSString() {
    const { width, color, style } = this.bottom;
    return width > 0 ? `${width}px ${style} ${color}` : 'none';
  }

  toString() {
    return `Border(top: ${this.top.width}px, right: ${this.right.width}px)`;
  }
}

export class BorderSide {
  constructor({ color = '#000000', width = 1.0, style = 'solid' } = {}) {
    this.color = color;
    this.width = width;
    this.style = style;
  }

  /**
   * Create a copy with overridden properties
   */
  copyWith({ color, width, style } = {}) {
    return new BorderSide({
      color: color ?? this.color,
      width: width ?? this.width,
      style: style ?? this.style
    });
  }

  toString() {
    return `BorderSide(color: ${this.color}, width: ${this.width}, style: ${this.style})`;
  }
}