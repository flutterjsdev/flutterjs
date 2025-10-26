export class TextStyle {
  constructor({
    color = '#000000',
    fontSize = 14,
    fontWeight = '400',
    fontStyle = 'normal',
    fontFamily = 'Roboto',
    height = 1.5,
    letterSpacing = 0,
    wordSpacing = 0,
    textDecoration = 'none',
    textDecorationColor = null,
    textDecorationStyle = 'solid'
  } = {}) {
    this.color = color;
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
    this.fontStyle = fontStyle;
    this.fontFamily = fontFamily;
    this.height = height;
    this.letterSpacing = letterSpacing;
    this.wordSpacing = wordSpacing;
    this.textDecoration = textDecoration;
    this.textDecorationColor = textDecorationColor;
    this.textDecorationStyle = textDecorationStyle;
  }

  merge(other) {
    if (!other) return this;
    return new TextStyle({
      color: other.color ?? this.color,
      fontSize: other.fontSize ?? this.fontSize,
      fontWeight: other.fontWeight ?? this.fontWeight,
      fontStyle: other.fontStyle ?? this.fontStyle,
      fontFamily: other.fontFamily ?? this.fontFamily,
      height: other.height ?? this.height,
      letterSpacing: other.letterSpacing ?? this.letterSpacing,
      wordSpacing: other.wordSpacing ?? this.wordSpacing,
      textDecoration: other.textDecoration ?? this.textDecoration,
      textDecorationColor: other.textDecorationColor ?? this.textDecorationColor,
      textDecorationStyle: other.textDecorationStyle ?? this.textDecorationStyle
    });
  }

  toCSSString() {
    return {
      color: this.color,
      fontSize: `${this.fontSize}px`,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      fontFamily: this.fontFamily,
      lineHeight: this.height,
      letterSpacing: `${this.letterSpacing}px`,
      wordSpacing: `${this.wordSpacing}px`,
      textDecoration: this.textDecoration
    };
  }

  toString() {
    return `TextStyle(color: ${this.color}, size: ${this.fontSize})`;
  }
}