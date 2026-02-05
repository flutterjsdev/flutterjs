// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { BlendMode, TextDirection } from '../utils/utils.js';
import { IconTheme } from './icon_theme.js';
import { Theme } from './theme.js';

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
    fontFamily = 'Material Icons',
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
    // Material Icons ligature mappings (text-based icon names)
    const ligatures = {
      0xe145: 'add', 0xe838: 'star', 0xe83b: 'star_border',
      0xe15b: 'remove',
      0xe88a: 'home', 0xe8b8: 'settings', 0xe8b6: 'search',
      0xe87e: 'favorite', 0xe8cb: 'favorite_border',
      0xe5cd: 'close', 0xe5d2: 'menu',
      0xe5e0: 'arrow_back', 0xe5e1: 'arrow_forward',
      0xe872: 'delete', 0xe3c9: 'edit',
      0xe5ca: 'check', 0xe86c: 'check_circle',
      0xe783: 'error', 0xe001: 'error_outline',
      0xe88f: 'info', 0xe002: 'warning',
      0xe2c4: 'download', 0xe2c6: 'upload',
      0xe5d5: 'refresh', 0xe5d4: 'more_vert',
      0xe5d3: 'more_horiz', 0xe853: 'account_circle',
      0xe7fd: 'person', 0xe7f4: 'notifications',
      0xe9ca: 'rocket_launch', 0xe873: 'description',
      0xe9e4: 'speed', 0xe1af: 'data_usage',
      0xe86f: 'code', 0xe157: 'link'
    };

    // Use ligature if available (recommended for Material Icons)
    return ligatures[this.codePoint] || String.fromCharCode(this.codePoint);
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
  constructor(iconOrOptions, options = {}) {
    let _icon = null;
    let _opts = {};

    if (iconOrOptions && (iconOrOptions.constructor?.name === 'IconData' || iconOrOptions.codePoint !== undefined)) {
      _icon = iconOrOptions;
      _opts = options;
    } else {
      _opts = iconOrOptions || {};
      _icon = _opts.icon;
    }

    const {
      key = null,
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
    } = _opts;
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

    this.icon = _icon;
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

    this._injectFont();
  }

  _injectFont() {
    if (typeof document === 'undefined') return;

    // 1. Inject Google Fonts Link
    if (!document.getElementById('flutterjs-material-icons-link')) {
      const link = document.createElement('link');
      link.id = 'flutterjs-material-icons-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
      document.head.appendChild(link);
    }

    // 2. Inject CSS Rules (Ensure .material-icons class is defined)
    if (!document.getElementById('flutterjs-material-icons-style')) {
      const style = document.createElement('style');
      style.id = 'flutterjs-material-icons-style';
      style.textContent = `
        /* 
         * Rely on the Google Fonts link for the @font-face definition.
         * This avoids hardcoding a specific version (v140) that might be incomplete or outdated.
         */

        .material-icons {
          font-family: 'Material Icons';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: 'liga';
        }
      `;
      document.head.appendChild(style);
    }
  }

  build(context) {
    // Ensure Material Icons font is injected on client-side rendering
    this._injectFont();

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

    // Handle null icon - use duck typing instead of instanceof for bundled code compatibility
    if (!icon || (icon.codePoint === undefined && !(icon instanceof IconData))) {
      return this._buildEmptyIcon(iconSize);
    }

    // Calculate color with opacity
    const iconOpacity = iconTheme.opacity ?? 1.0;

    // Resolve color:
    // 1. Widget property
    // 2. IconTheme
    // 3. Theme colorScheme.onSurface (fallback from M3 defaults usually)
    let iconColor = this.color ?? iconTheme.color;

    if (!iconColor) {
      try {
        // Fallback to theme context if available
        const theme = Theme.of(context);
        iconColor = theme?.colorScheme?.onSurface;
      } catch (e) {
        // Fallback to default if theme lookup fails
      }
      // If still no color, leave as undefined to allow CSS inheritance (currentColor)
    }

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

    // DEBUG: Log icon properties
    if (icon.codePoint === 0xe838 || icon.codePoint === 0xe145) {
      console.log(`[Icon Debug] Building icon: ${icon.codePoint.toString(16)}`, {
        family: icon.fontFamily,
        size: iconSize,
        color: iconColor,
        inlineStyles
      });
    }

    return new VNode({
      tag: 'span',
      props: {
        role: 'img',
        'aria-label': this.semanticLabel || 'Icon',
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'Icon',
        'data-icon-codepoint': `U + ${icon.codePoint.toString(16).toUpperCase()} `,
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
    // Debugging aid: invalid/missing icon
    return new VNode({
      tag: 'span',
      props: {
        style: {
          display: 'inline-flex',
          width: `${size} px`,
          height: `${size} px`,
          backgroundColor: 'rgba(255, 0, 0, 0.2)', // Visual indicator
          color: 'red',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          border: '1px dashed red'
        },
        title: 'Missing Icon'
      },
      children: ['?']
    });
  }

  _buildIconElement(icon, styles) {
    const character = icon.getCharacter();

    return new VNode({
      tag: 'span',
      props: {
        className: 'fjs-icon material-icons',
        style: {
          ...styles,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: '1.0',
          whiteSpace: 'nowrap'
        }
      },
      children: [character]
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
    let cssColor = color;

    // Check if color is an object (Color, MaterialColor, etc.)
    if (color && typeof color === 'object') {
      // First try standard conversion
      if (typeof color.toCSSString === 'function') {
        cssColor = color.toCSSString();
      } else if (color.value !== undefined) {
        // Fallback: manually convert integer value to CSS hex
        // value is 0xAARRGGBB
        // we want #RRGGBB if alpha is FF, else rgba
        const val = color.value >>> 0;
        const a = (val >> 24) & 0xFF;
        const r = (val >> 16) & 0xFF;
        const g = (val >> 8) & 0xFF;
        const b = val & 0xFF;

        if (a === 255) {
          cssColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        } else {
          const opacity = (a / 255).toFixed(4).replace(/\.?0+$/, '');
          cssColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
      }
    }

    const styles = {
      fontSize: `${fontSize}px`,
      color: cssColor,
      fontVariationSettings: fontVariations,
      textShadow: this._buildTextShadow(shadows),
      // mixBlendMode: BLEND_MODE_MAP[blendMode] || 'normal',
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
    // Don't use quotes - they get HTML-encoded in inline styles
    return "Material Icons";
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

    // Handle Color object
    if (typeof color === 'object' && color.toCSSString) {
      if (color.withOpacity) {
        return color.withOpacity(opacity).toCSSString();
      }
      color = color.toCSSString();
    } else if (typeof color === 'object' && color.value) {
      // Manual fallback if methods missing
      // Reconstruct as rgba
      const val = color.value;
      const r = (val >> 16) & 0xFF;
      const g = (val >> 8) & 0xFF;
      const b = val & 0xFF;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Handle hex color
    if (typeof color === 'string' && color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Handle rgb/rgba
    if (typeof color === 'string' && color.startsWith('rgb')) {
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
    return IconTheme.of(context) || new IconThemeData();
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
  home: new IconData({ codePoint: 0xe88a, fontFamily: 'Material Icons' }),
  settings: new IconData({ codePoint: 0xe8b8, fontFamily: 'Material Icons' }),
  search: new IconData({ codePoint: 0xe8b6, fontFamily: 'Material Icons' }),
  favorite: new IconData({ codePoint: 0xe87e, fontFamily: 'Material Icons' }),
  favoriteBorder: new IconData({ codePoint: 0xe8cb, fontFamily: 'Material Icons' }),
  star: new IconData({ codePoint: 0xe838, fontFamily: 'Material Icons' }),
  starBorder: new IconData({ codePoint: 0xe83b, fontFamily: 'Material Icons' }),
  close: new IconData({ codePoint: 0xe5cd, fontFamily: 'Material Icons' }),
  menu: new IconData({ codePoint: 0xe5d2, fontFamily: 'Material Icons' }),
  arrowBack: new IconData({ codePoint: 0xe5e0, fontFamily: 'Material Icons' }),
  arrowForward: new IconData({ codePoint: 0xe5e1, fontFamily: 'Material Icons' }),
  add: new IconData({ codePoint: 0xe145, fontFamily: 'Material Icons' }),
  delete: new IconData({ codePoint: 0xe872, fontFamily: 'Material Icons' }),
  edit: new IconData({ codePoint: 0xe3c9, fontFamily: 'Material Icons' }),
  check: new IconData({ codePoint: 0xe5ca, fontFamily: 'Material Icons' }),
  checkCircle: new IconData({ codePoint: 0xe86c, fontFamily: 'Material Icons' }),
  error: new IconData({ codePoint: 0xe783, fontFamily: 'Material Icons' }),
  errorOutline: new IconData({ codePoint: 0xe001, fontFamily: 'Material Icons' }),
  info: new IconData({ codePoint: 0xe88f, fontFamily: 'Material Icons' }),
  warning: new IconData({ codePoint: 0xe002, fontFamily: 'Material Icons' }),
  download: new IconData({ codePoint: 0xe2c4, fontFamily: 'Material Icons' }),
  upload: new IconData({ codePoint: 0xe2c6, fontFamily: 'Material Icons' }),
  refresh: new IconData({ codePoint: 0xe5d5, fontFamily: 'Material Icons' }),
  moreVert: new IconData({ codePoint: 0xe5d4, fontFamily: 'Material Icons' }),
  moreHoriz: new IconData({ codePoint: 0xe5d3, fontFamily: 'Material Icons' })
  ,
  accountCircle: new IconData({ codePoint: 0xe853, fontFamily: 'Material Icons' }),
  person: new IconData({ codePoint: 0xe7fd, fontFamily: 'Material Icons' }),
  notifications: new IconData({ codePoint: 0xe7f4, fontFamily: 'Material Icons' }),
  mail: new IconData({ codePoint: 0xe158, fontFamily: 'Material Icons' }),
  shoppingCart: new IconData({ codePoint: 0xe8cc, fontFamily: 'Material Icons' }),
  cameraAlt: new IconData({ codePoint: 0xe3af, fontFamily: 'Material Icons' }),
  image: new IconData({ codePoint: 0xe3f4, fontFamily: 'Material Icons' }),
  map: new IconData({ codePoint: 0xe55b, fontFamily: 'Material Icons' }),
  place: new IconData({ codePoint: 0xe55f, fontFamily: 'Material Icons' }),
  phone: new IconData({ codePoint: 0xe0cd, fontFamily: 'Material Icons' }),
  share: new IconData({ codePoint: 0xe80d, fontFamily: 'Material Icons' }),
  thumbUp: new IconData({ codePoint: 0xe8dc, fontFamily: 'Material Icons' }),
  visibility: new IconData({ codePoint: 0xe8f4, fontFamily: 'Material Icons' }),
  logout: new IconData({ codePoint: 0xe9ba, fontFamily: 'Material Icons' }),
  login: new IconData({ codePoint: 0xea77, fontFamily: 'Material Icons' }),
  addAPhoto: new IconData({ codePoint: 0xe439, fontFamily: 'Material Icons' }),
  addAlarm: new IconData({ codePoint: 0xe193, fontFamily: 'Material Icons' }),
  addAlert: new IconData({ codePoint: 0xe003, fontFamily: 'Material Icons' }),
  addBox: new IconData({ codePoint: 0xe146, fontFamily: 'Material Icons' }),
  addCircle: new IconData({ codePoint: 0xe147, fontFamily: 'Material Icons' }),
  remove: new IconData({ codePoint: 0xe15b, fontFamily: 'Material Icons' }),
  rocket_launch: new IconData({ codePoint: 0xe9ca, fontFamily: 'Material Icons' }),
  description: new IconData({ codePoint: 0xe873, fontFamily: 'Material Icons' }),
  speed: new IconData({ codePoint: 0xe9e4, fontFamily: 'Material Icons' }),
  data_usage: new IconData({ codePoint: 0xe1af, fontFamily: 'Material Icons' }),
  code: new IconData({ codePoint: 0xe86f, fontFamily: 'Material Icons' }),
  link: new IconData({ codePoint: 0xe157, fontFamily: 'Material Icons' }),

  // Added Icons (camelCase)
  flutterDash: new IconData({ codePoint: 0xe00b, fontFamily: 'Material Icons' }),
  flashOn: new IconData({ codePoint: 0xe3e7, fontFamily: 'Material Icons' }),
  widgets: new IconData({ codePoint: 0xe1bd, fontFamily: 'Material Icons' }),
  chatBubble: new IconData({ codePoint: 0xe0ca, fontFamily: 'Material Icons' }),
  security: new IconData({ codePoint: 0xe32a, fontFamily: 'Material Icons' }),
  thumbUp: new IconData({ codePoint: 0xe8dc, fontFamily: 'Material Icons' }),

  // Snake_case aliases for direct Dart mapping
  get flutter_dash() { return this.flutterDash; },
  get flash_on() { return this.flashOn; },
  get chat_bubble() { return this.chatBubble; },
  get thumb_up() { return this.thumbUp; }
};

export { Icon, IconData, IconThemeData, Icons };