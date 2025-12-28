import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { BlendMode, TextDirection } from '../utils/utils.js';

const DEFAULT_ICON_SIZE = 24;
const DEFAULT_FONT_SIZE = 24;

const BLEND_MODE_MAP = {
  [BlendMode.srcOver]: 'normal',
  [BlendMode.srcIn]: 'multiply',
  [BlendMode.srcOut]: 'lighten',
  [BlendMode.srcATop]: 'screen',
  [BlendMode.dstOver]: 'overlay',
  [BlendMode.dstIn]: 'darken',
  [BlendMode.dstOut]: 'color-dodge',
  [BlendMode.dstATop]: 'color-burn',
  [BlendMode.plus]: 'lighten',
  [BlendMode.screen]: 'screen',
  [BlendMode.overlay]: 'overlay',
  [BlendMode.darken]: 'darken',
  [BlendMode.lighten]: 'lighten',
  [BlendMode.colorDodge]: 'color-dodge',
  [BlendMode.colorBurn]: 'color-burn',
  [BlendMode.hardLight]: 'hard-light',
  [BlendMode.softLight]: 'soft-light',
  [BlendMode.difference]: 'difference',
  [BlendMode.exclusion]: 'exclusion',
  [BlendMode.multiply]: 'multiply',
  [BlendMode.hue]: 'hue',
  [BlendMode.saturation]: 'saturation',
  [BlendMode.color]: 'color',
  [BlendMode.luminosity]: 'luminosity'
};

/**
 * IconData - Represents icon metadata
 * Contains codepoint, font family, and display properties
 */
class IconData {
  constructor({
    codePoint = 0,
    fontFamily = 'MaterialIcons',
    fontPackage = null,
    matchTextDirection = false,
    fontFamilyFallback = null
  } = {}) {
    this.codePoint = codePoint;
    this.fontFamily = fontFamily;
    this.fontPackage = fontPackage;
    this.matchTextDirection = matchTextDirection;
    this.fontFamilyFallback = Array.isArray(fontFamilyFallback) ? fontFamilyFallback : null;
  }

  getCharacter() {
    return String.fromCharCode(this.codePoint);
  }

  toString() {
    const hex = this.codePoint.toString(16).toUpperCase().padStart(5, '0');
    return `IconData(U+${hex})`;
  }

  equals(other) {
    if (!other || !(other instanceof IconData)) {
      return false;
    }
    return (
      this.codePoint === other.codePoint &&
      this.fontFamily === other.fontFamily &&
      this.fontPackage === other.fontPackage &&
      this.matchTextDirection === other.matchTextDirection &&
      this._arrayEquals(this.fontFamilyFallback, other.fontFamilyFallback)
    );
  }

  _arrayEquals(arr1, arr2) {
    if (!arr1 && !arr2) return true;
    if (!arr1 || !arr2) return false;
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, idx) => val === arr2[idx]);
  }

  hashCode() {
    let hash = this.codePoint;
    hash = ((hash << 5) - hash) + (this.fontFamily ? this.fontFamily.charCodeAt(0) : 0);
    hash = ((hash << 5) - hash) + (this.matchTextDirection ? 1 : 0);
    if (this.fontFamilyFallback) {
      this.fontFamilyFallback.forEach(f => {
        hash = ((hash << 5) - hash) + (f ? f.charCodeAt(0) : 0);
      });
    }
    return hash;
  }
}

/**
 * IconThemeData - Theme configuration for icons
 * Provides default values for icon properties
 */
class IconThemeData {
  constructor({
    color = null,
    opacity = 1.0,
    size = DEFAULT_ICON_SIZE,
    fill = null,
    weight = null,
    grade = null,
    opticalSize = null,
    shadows = null,
    applyTextScaling = false
  } = {}) {
    this.color = color;
    this.opacity = opacity;
    this.size = size;
    this.fill = fill;
    this.weight = weight;
    this.grade = grade;
    this.opticalSize = opticalSize;
    this.shadows = shadows;
    this.applyTextScaling = applyTextScaling;
  }

  copyWith({
    color,
    opacity,
    size,
    fill,
    weight,
    grade,
    opticalSize,
    shadows,
    applyTextScaling
  } = {}) {
    return new IconThemeData({
      color: color !== undefined ? color : this.color,
      opacity: opacity !== undefined ? opacity : this.opacity,
      size: size !== undefined ? size : this.size,
      fill: fill !== undefined ? fill : this.fill,
      weight: weight !== undefined ? weight : this.weight,
      grade: grade !== undefined ? grade : this.grade,
      opticalSize: opticalSize !== undefined ? opticalSize : this.opticalSize,
      shadows: shadows !== undefined ? shadows : this.shadows,
      applyTextScaling: applyTextScaling !== undefined ? applyTextScaling : this.applyTextScaling
    });
  }
}

/**
 * Icon - StatelessWidget for rendering icons
 * Supports Material Design icons and custom icon fonts
 */
class Icon extends StatelessWidget {
  constructor({
    key = null,
    icon = null,
    size = null,
    fill = null,
    weight = null,
    grade = null,
    opticalSize = null,
    color = null,
    shadows = null,
    semanticLabel = null,
    textDirection = null,
    applyTextScaling = null,
    blendMode = null,
    fontWeight = null
  } = {}) {
    super(key);

    // Assertions
    if (fill !== null && (fill < 0.0 || fill > 1.0)) {
      throw new Error('fill must be between 0.0 and 1.0');
    }
    if (weight !== null && weight <= 0.0) {
      throw new Error('weight must be greater than 0.0');
    }
    if (opticalSize !== null && opticalSize <= 0.0) {
      throw new Error('opticalSize must be greater than 0.0');
    }

    this.icon = icon;
    this.size = size;
    this.fill = fill;
    this.weight = weight;
    this.grade = grade;
    this.opticalSize = opticalSize;
    this.color = color;
    this.shadows = shadows;
    this.semanticLabel = semanticLabel;
    this.textDirection = textDirection;
    this.applyTextScaling = applyTextScaling;
    this.blendMode = blendMode || BlendMode.srcOver;
    this.fontWeight = fontWeight;
  }

  build(context) {
    // Get resolved text direction
    const textDirection = this.textDirection || this._getTextDirection(context);

    // Get icon theme from context
    const iconTheme = this._getIconTheme(context) || new IconThemeData();

    // Determine if text scaling should be applied
    const applyTextScaling = this.applyTextScaling ?? iconTheme.applyTextScaling ?? false;

    // Calculate icon size
    const tentativeIconSize = this.size ?? iconTheme.size ?? DEFAULT_ICON_SIZE;
    const iconSize = applyTextScaling
      ? this._scaleTextSize(tentativeIconSize, context)
      : tentativeIconSize;

    // Resolve icon properties from theme
    const iconFill = this.fill ?? iconTheme.fill;
    const iconWeight = this.weight ?? iconTheme.weight;
    const iconGrade = this.grade ?? iconTheme.grade;
    const iconOpticalSize = this.opticalSize ?? iconTheme.opticalSize;
    const iconShadows = this.shadows ?? iconTheme.shadows;

    const icon = this.icon;

    // Handle null icon
    if (!icon || !(icon instanceof IconData)) {
      return this._buildEmptyIcon(iconSize);
    }

    // Calculate color with opacity
    const iconOpacity = iconTheme.opacity ?? 1.0;
    let iconColor = this.color ?? iconTheme.color ?? '#000000';

    if (iconOpacity !== 1.0) {
      iconColor = this._applyOpacity(iconColor, iconOpacity);
    }

    // Build font variations for advanced typography
    const fontVariations = this._buildFontVariations(
      iconFill,
      iconWeight,
      iconGrade,
      iconOpticalSize
    );

    // Build inline styles
    const inlineStyles = this._buildInlineStyles({
      color: iconColor,
      fontSize: iconSize,
      fontFamily: icon.fontFamily,
      fontWeight: this.fontWeight,
      fontFamilyFallback: icon.fontFamilyFallback,
      shadows: iconShadows,
      fontVariations,
      blendMode: this.blendMode,
      textDirection
    });

    // Build icon element
    let iconElement = this._buildIconElement(icon, inlineStyles);

    // Apply text direction transform if needed
    if (icon.matchTextDirection && textDirection === TextDirection.rtl) {
      iconElement = this._mirrorIcon(iconElement, iconSize);
    }

    // Wrap with semantics
    const elementId = context?.element?.getElementId?.() || 'icon-' + Math.random().toString(36).substr(2, 9);
    const widgetPath = context?.element?.getWidgetPath?.() || 'Icon';

    return new VNode({
      tag: 'span',
      props: {
        role: 'img',
        'aria-label': this.semanticLabel || 'Icon',
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'Icon',
        'data-icon-codepoint': `U+${icon.codePoint.toString(16).toUpperCase()}`,
        title: this.semanticLabel || '',
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${iconSize}px`,
          height: `${iconSize}px`
        }
      },
      children: [iconElement],
      key: this.key
    });
  }

  _buildEmptyIcon(size) {
    return new VNode({
      tag: 'span',
      props: {
        style: {
          display: 'inline-block',
          width: `${size}px`,
          height: `${size}px`
        }
      }
    });
  }

  _buildIconElement(icon, styles) {
    return new VNode({
      tag: 'span',
      props: {
        className: 'fjs-icon',
        style: {
          ...styles,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: '1.0',
          whiteSpace: 'nowrap'
        }
      },
      children: [icon.getCharacter()]
    });
  }

  _mirrorIcon(iconElement, size) {
    return new VNode({
      tag: 'span',
      props: {
        style: {
          display: 'inline-flex',
          transform: 'scaleX(-1)',
          transformOrigin: 'center',
          width: `${size}px`,
          height: `${size}px`,
          alignItems: 'center',
          justifyContent: 'center'
        }
      },
      children: [iconElement]
    });
  }

  _buildInlineStyles({
    color,
    fontSize,
    fontFamily,
    fontWeight,
    fontFamilyFallback,
    shadows,
    fontVariations,
    blendMode,
    textDirection
  }) {
    const styles = {
      fontSize: `${fontSize}px`,
      fontFamily: this._buildFontFamily(fontFamily, fontFamilyFallback),
      color: color,
      fontVariationSettings: fontVariations,
      textShadow: this._buildTextShadow(shadows),
      mixBlendMode: BLEND_MODE_MAP[blendMode] || 'normal',
      direction: textDirection === TextDirection.rtl ? 'rtl' : 'ltr',
      lineHeight: '1.0',
      height: '1em',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none'
    };

    if (fontWeight) {
      styles.fontWeight = this._normalizeFontWeight(fontWeight);
    }

    return styles;
  }

  _buildFontFamily(primary, fallback) {
    if (!primary) return 'MaterialIcons, Arial, sans-serif';

    const families = [primary];

    if (Array.isArray(fallback) && fallback.length > 0) {
      families.push(...fallback);
    }

    families.push('Arial', 'sans-serif');
    return families.map(f => `'${f}'`).join(', ');
  }

  _buildFontVariations(fill, weight, grade, opticalSize) {
    const variations = [];

    if (fill !== null && fill !== undefined) {
      variations.push(`'FILL' ${fill}`);
    }
    if (weight !== null && weight !== undefined) {
      variations.push(`'wght' ${weight}`);
    }
    if (grade !== null && grade !== undefined) {
      variations.push(`'GRAD' ${grade}`);
    }
    if (opticalSize !== null && opticalSize !== undefined) {
      variations.push(`'opsz' ${opticalSize}`);
    }

    return variations.length > 0 ? variations.join(', ') : 'normal';
  }

  _buildTextShadow(shadows) {
    if (!shadows || !Array.isArray(shadows)) {
      return 'none';
    }

    return shadows
      .map(shadow => {
        const offsetX = shadow.offsetX ?? 0;
        const offsetY = shadow.offsetY ?? 0;
        const blurRadius = shadow.blurRadius ?? 0;
        const color = shadow.color ?? 'rgba(0, 0, 0, 0.25)';
        return `${offsetX}px ${offsetY}px ${blurRadius}px ${color}`;
      })
      .join(', ');
  }

  _normalizeFontWeight(weight) {
    const weightMap = {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    };

    if (typeof weight === 'string') {
      return weightMap[weight.toLowerCase()] || weight;
    }

    return String(weight);
  }

  _applyOpacity(color, opacity) {
    if (!color) return color;

    // Handle hex color
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Handle rgb/rgba
    if (color.startsWith('rgb')) {
      return color.replace(/[\d.]+\)/, `${opacity})`);
    }

    return color;
  }

  _getTextDirection(context) {
    // Try to get from document or context
    if (typeof document !== 'undefined') {
      const dir = document.documentElement.dir || document.dir || 'ltr';
      return dir === 'rtl' ? TextDirection.rtl : TextDirection.ltr;
    }
    return TextDirection.ltr;
  }

  _getIconTheme(context) {
    // This would typically come from theme context
    // For now, return default
    return new IconThemeData();
  }

  _scaleTextSize(size, context) {
    // Apply text scaling factor from context (typically 1.0 - 2.0)
    // For now, return unchanged
    return size;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'icon', value: this.icon });
    properties.push({ name: 'size', value: this.size });
    properties.push({ name: 'fill', value: this.fill });
    properties.push({ name: 'weight', value: this.weight });
    properties.push({ name: 'grade', value: this.grade });
    properties.push({ name: 'opticalSize', value: this.opticalSize });
    properties.push({ name: 'color', value: this.color });
    properties.push({ name: 'blendMode', value: this.blendMode });
    properties.push({ name: 'semanticLabel', value: this.semanticLabel });
    if (this.shadows) {
      properties.push({ name: 'shadows', value: this.shadows });
    }
  }
}

/**
 * Material Design Icons - Pre-defined icon data
 */
const Icons = {
  // Common icons
  home: new IconData({ codePoint: 0xe88a, fontFamily: 'MaterialIcons' }),
  settings: new IconData({ codePoint: 0xe8b8, fontFamily: 'MaterialIcons' }),
  search: new IconData({ codePoint: 0xe8b6, fontFamily: 'MaterialIcons' }),
  favorite: new IconData({ codePoint: 0xe87e, fontFamily: 'MaterialIcons' }),
  favoriteBorder: new IconData({ codePoint: 0xe8cb, fontFamily: 'MaterialIcons' }),
  star: new IconData({ codePoint: 0xe838, fontFamily: 'MaterialIcons' }),
  starBorder: new IconData({ codePoint: 0xe83b, fontFamily: 'MaterialIcons' }),
  close: new IconData({ codePoint: 0xe5cd, fontFamily: 'MaterialIcons' }),
  menu: new IconData({ codePoint: 0xe5d2, fontFamily: 'MaterialIcons' }),
  arrowBack: new IconData({ codePoint: 0xe5e0, fontFamily: 'MaterialIcons' }),
  arrowForward: new IconData({ codePoint: 0xe5e1, fontFamily: 'MaterialIcons' }),
  add: new IconData({ codePoint: 0xe145, fontFamily: 'MaterialIcons' }),
  delete: new IconData({ codePoint: 0xe872, fontFamily: 'MaterialIcons' }),
  edit: new IconData({ codePoint: 0xe3c9, fontFamily: 'MaterialIcons' }),
  check: new IconData({ codePoint: 0xe5ca, fontFamily: 'MaterialIcons' }),
  checkCircle: new IconData({ codePoint: 0xe86c, fontFamily: 'MaterialIcons' }),
  error: new IconData({ codePoint: 0xe783, fontFamily: 'MaterialIcons' }),
  errorOutline: new IconData({ codePoint: 0xe001, fontFamily: 'MaterialIcons' }),
  info: new IconData({ codePoint: 0xe88f, fontFamily: 'MaterialIcons' }),
  warning: new IconData({ codePoint: 0xe002, fontFamily: 'MaterialIcons' }),
  download: new IconData({ codePoint: 0xe2c4, fontFamily: 'MaterialIcons' }),
  upload: new IconData({ codePoint: 0xe2c6, fontFamily: 'MaterialIcons' }),
  refresh: new IconData({ codePoint: 0xe5d5, fontFamily: 'MaterialIcons' }),
  moreVert: new IconData({ codePoint: 0xe5d4, fontFamily: 'MaterialIcons' }),
  moreHoriz: new IconData({ codePoint: 0xe5d3, fontFamily: 'MaterialIcons' })
};

export { Icon, IconData, IconThemeData, Icons };