import { Widget, InheritedWidget, Element } from '../../../core/widget.js';
import { VNode } from '../core/vdom/vnode.js';
import { TextDirection, Alignment } from '../../utils/utils.js';

// ============================================================================
// ENUMS
// ============================================================================

const BoxFit = {
  fill: 'fill',
  contain: 'contain',
  cover: 'cover',
  fitWidth: 'fitWidth',
  fitHeight: 'fitHeight',
  none: 'none',
  scaleDown: 'scaleDown'
};

const ImageRepeat = {
  noRepeat: 'noRepeat',
  repeat: 'repeat',
  repeatX: 'repeatX',
  repeatY: 'repeatY'
};

const BlendMode = {
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  colorDodge: 'colorDodge',
  colorBurn: 'colorBurn',
  hardLight: 'hardLight',
  softLight: 'softLight',
  difference: 'difference',
  exclusion: 'exclusion',
  hue: 'hue',
  saturation: 'saturation',
  color: 'color',
  luminosity: 'luminosity',
  srcOver: 'srcOver',
  srcIn: 'srcIn',
  srcOut: 'srcOut',
  srcATop: 'srcATop',
  dstOver: 'dstOver',
  dstIn: 'dstIn',
  dstOut: 'dstOut',
  dstATop: 'dstATop',
  plus: 'plus',
  modulate: 'modulate'
};

const FilterQuality = {
  none: 'none',
  low: 'low',
  medium: 'medium',
  high: 'high'
};

// ============================================================================
// IMAGE CLASS
// ============================================================================

class Image {
  constructor({
    src = null,
    width = 0,
    height = 0,
    scale = 1.0,
    dataUrl = null
  } = {}) {
    this.src = src;
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.dataUrl = dataUrl;
    this._image = null;
    this._isLoaded = false;
    this._loadPromise = null;
    this._openHandles = [];
  }

  /**
   * Load image from URL
   */
  static fromUrl(src, { width = null, height = null, scale = 1.0 } = {}) {
    const img = new Image({ src, width, height, scale });
    img.load();
    return img;
  }

  /**
   * Load image from data URL
   */
  static fromDataUrl(dataUrl, { width = null, height = null, scale = 1.0 } = {}) {
    const img = new Image({ dataUrl, width, height, scale });
    img.load();
    return img;
  }

  /**
   * Load the image
   */
  load() {
    if (this._loadPromise) {
      return this._loadPromise;
    }

    this._loadPromise = new Promise((resolve, reject) => {
      const imgElement = new window.Image();

      imgElement.onload = () => {
        if (!this.width || this.width === 0) {
          this.width = imgElement.naturalWidth;
        }
        if (!this.height || this.height === 0) {
          this.height = imgElement.naturalHeight;
        }

        this._image = imgElement;
        this._isLoaded = true;
        this._openHandles.push(new Error('Image loaded').stack);
        resolve(this);
      };

      imgElement.onerror = () => {
        reject(new Error(`Failed to load image: ${this.src || this.dataUrl}`));
      };

      if (this.src) {
        imgElement.src = this.src;
      } else if (this.dataUrl) {
        imgElement.src = this.dataUrl;
      }
    });

    return this._loadPromise;
  }

  /**
   * Get the DOM element
   */
  getDOMImage() {
    return this._image;
  }

  /**
   * Check if loaded
   */
  get isLoaded() {
    return this._isLoaded;
  }

  /**
   * Clone the image
   */
  clone() {
    const cloned = new Image({
      src: this.src,
      width: this.width,
      height: this.height,
      scale: this.scale,
      dataUrl: this.dataUrl
    });
    cloned._image = this._image;
    cloned._isLoaded = this._isLoaded;
    return cloned;
  }

  /**
   * Dispose the image
   */
  dispose() {
    this._image = null;
    this._isLoaded = false;
    this._openHandles = [];
  }

  /**
   * Debug: Get open handle stack traces
   */
  debugGetOpenHandleStackTraces() {
    return this._openHandles;
  }

  /**
   * Get image dimensions
   */
  get naturalWidth() {
    return this._image?.naturalWidth || this.width;
  }

  get naturalHeight() {
    return this._image?.naturalHeight || this.height;
  }
}

// ============================================================================
// RENDER IMAGE
// ============================================================================

class RenderImage {
  constructor({
    image = null,
    debugImageLabel = null,
    width = null,
    height = null,
    scale = 1.0,
    color = null,
    opacity = null,
    colorBlendMode = null,
    fit = BoxFit.contain,
    alignment = Alignment.center,
    repeat = ImageRepeat.noRepeat,
    centerSlice = null,
    matchTextDirection = false,
    textDirection = TextDirection.ltr,
    invertColors = false,
    isAntiAlias = false,
    filterQuality = FilterQuality.medium
  } = {}) {
    this.image = image;
    this.debugImageLabel = debugImageLabel;
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.color = color;
    this.opacity = opacity;
    this.colorBlendMode = colorBlendMode;
    this.fit = fit;
    this.alignment = alignment;
    this.repeat = repeat;
    this.centerSlice = centerSlice;
    this.matchTextDirection = matchTextDirection;
    this.textDirection = textDirection;
    this.invertColors = invertColors;
    this.isAntiAlias = isAntiAlias;
    this.filterQuality = filterQuality;
  }

  /**
   * Get CSS for image sizing and positioning
   */
  getImageStyle() {
    const style = {
      display: 'block',
      width: this.width ? `${this.width}px` : '100%',
      height: this.height ? `${this.height}px` : 'auto',
      objectFit: this._mapBoxFit(),
      objectPosition: this._mapAlignment(),
      filter: this._getFilterStyle()
    };

    // Handle image repeat
    if (this.repeat !== ImageRepeat.noRepeat) {
      style.backgroundRepeat = this._mapImageRepeat();
    }

    // Handle blend mode
    if (this.colorBlendMode) {
      style.mixBlendMode = this.colorBlendMode;
    }

    // Handle opacity
    if (this.opacity !== null && this.opacity !== undefined) {
      const opacityValue = typeof this.opacity === 'number' 
        ? this.opacity 
        : this.opacity.value;
      style.opacity = opacityValue;
    }

    return style;
  }

  /**
   * Map BoxFit to CSS object-fit
   * @private
   */
  _mapBoxFit() {
    const map = {
      fill: 'fill',
      contain: 'contain',
      cover: 'cover',
      fitWidth: 'cover',
      fitHeight: 'cover',
      none: 'none',
      scaleDown: 'scale-down'
    };
    return map[this.fit] || 'contain';
  }

  /**
   * Map alignment to CSS object-position
   * @private
   */
  _mapAlignment() {
    const alignMap = {
      'topLeft': 'top left',
      'topCenter': 'top center',
      'topRight': 'top right',
      'centerLeft': 'center left',
      'center': 'center center',
      'centerRight': 'center right',
      'bottomLeft': 'bottom left',
      'bottomCenter': 'bottom center',
      'bottomRight': 'bottom right'
    };

    // Handle directional alignment
    if (this.matchTextDirection && this.textDirection) {
      const isRTL = this.textDirection === TextDirection.rtl;
      const alignValue = this.alignment;

      if (alignValue.includes && alignValue.includes('start')) {
        return isRTL ? alignValue.replace('start', 'right') : alignValue.replace('start', 'left');
      }
      if (alignValue.includes && alignValue.includes('end')) {
        return isRTL ? alignValue.replace('end', 'left') : alignValue.replace('end', 'right');
      }
    }

    return alignMap[this.alignment] || 'center';
  }

  /**
   * Map ImageRepeat to CSS backgroundRepeat
   * @private
   */
  _mapImageRepeat() {
    const map = {
      noRepeat: 'no-repeat',
      repeat: 'repeat',
      repeatX: 'repeat-x',
      repeatY: 'repeat-y'
    };
    return map[this.repeat] || 'no-repeat';
  }

  /**
   * Get filter style
   * @private
   */
  _getFilterStyle() {
    const filters = [];

    if (this.invertColors) {
      filters.push('invert(1)');
    }

    // Apply filter quality
    switch (this.filterQuality) {
      case FilterQuality.high:
        filters.push('blur(0px)');
        break;
      case FilterQuality.none:
        filters.push('blur(1px)');
        break;
    }

    return filters.length > 0 ? filters.join(' ') : 'none';
  }

  /**
   * Debug info
   */
  debugInfo() {
    return {
      type: 'RenderImage',
      debugImageLabel: this.debugImageLabel,
      width: this.width,
      height: this.height,
      fit: this.fit,
      repeat: this.repeat,
      hasImage: !!this.image,
      imageLoaded: this.image?.isLoaded
    };
  }
}

// ============================================================================
// RAW IMAGE WIDGET
// ============================================================================

class RawImage extends Widget {
  constructor({
    key = null,
    image = null,
    debugImageLabel = null,
    width = null,
    height = null,
    scale = 1.0,
    color = null,
    opacity = null,
    colorBlendMode = null,
    fit = null,
    alignment = Alignment.center,
    repeat = ImageRepeat.noRepeat,
    centerSlice = null,
    matchTextDirection = false,
    invertColors = false,
    filterQuality = FilterQuality.medium,
    isAntiAlias = false
  } = {}) {
    super(key);

    this.image = image;
    this.debugImageLabel = debugImageLabel;
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.color = color;
    this.opacity = opacity;
    this.colorBlendMode = colorBlendMode;
    this.fit = fit;
    this.alignment = alignment;
    this.repeat = repeat;
    this.centerSlice = centerSlice;
    this.matchTextDirection = matchTextDirection;
    this.invertColors = invertColors;
    this.filterQuality = filterQuality;
    this.isAntiAlias = isAntiAlias;
    this._renderObject = null;
  }

  /**
   * Create render object
   */
  createRenderObject(context) {
    return new RenderImage({
      image: this.image?.clone?.() || this.image,
      debugImageLabel: this.debugImageLabel,
      width: this.width,
      height: this.height,
      scale: this.scale,
      color: this.color,
      opacity: this.opacity,
      colorBlendMode: this.colorBlendMode,
      fit: this.fit,
      alignment: this.alignment,
      repeat: this.repeat,
      centerSlice: this.centerSlice,
      matchTextDirection: this.matchTextDirection,
      textDirection: this.matchTextDirection || typeof this.alignment === 'object'
        ? context?.textDirection || TextDirection.ltr
        : null,
      invertColors: this.invertColors,
      isAntiAlias: this.isAntiAlias,
      filterQuality: this.filterQuality
    });
  }

  /**
   * Update render object
   */
  updateRenderObject(context, renderObject) {
    renderObject.image = this.image?.clone?.() || this.image;
    renderObject.debugImageLabel = this.debugImageLabel;
    renderObject.width = this.width;
    renderObject.height = this.height;
    renderObject.scale = this.scale;
    renderObject.color = this.color;
    renderObject.opacity = this.opacity;
    renderObject.colorBlendMode = this.colorBlendMode;
    renderObject.fit = this.fit;
    renderObject.alignment = this.alignment;
    renderObject.repeat = this.repeat;
    renderObject.centerSlice = this.centerSlice;
    renderObject.matchTextDirection = this.matchTextDirection;
    renderObject.textDirection = this.matchTextDirection || typeof this.alignment === 'object'
      ? context?.textDirection || TextDirection.ltr
      : null;
    renderObject.invertColors = this.invertColors;
    renderObject.isAntiAlias = this.isAntiAlias;
    renderObject.filterQuality = this.filterQuality;
  }

  /**
   * Unmount and clean up
   */
  didUnmountRenderObject(renderObject) {
    renderObject.image = null;
  }

  /**
   * Build widget tree
   */
  build(context) {
    if (!this._renderObject) {
      this._renderObject = this.createRenderObject(context);
    } else {
      this.updateRenderObject(context, this._renderObject);
    }

    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    if (!this.image || !this.image.isLoaded) {
      // Placeholder while loading
      return new VNode({
        tag: 'div',
        props: {
          style: {
            width: this.width ? `${this.width}px` : '100%',
            height: this.height ? `${this.height}px` : '100px',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          },
          'data-element-id': elementId,
          'data-widget-path': widgetPath,
          'data-widget': 'RawImage',
          'data-loading': 'true'
        },
        children: [new VNode({ tag: 'span', children: ['Loading image...'] })]
      });
    }

    const imgElement = this.image.getDOMImage();
    if (!imgElement) {
      return new VNode({
        tag: 'div',
        props: {
          style: {
            width: this.width ? `${this.width}px` : '100%',
            height: this.height ? `${this.height}px` : '100px',
            backgroundColor: '#ffe0e0'
          }
        },
        children: []
      });
    }

    const imageStyle = this._renderObject.getImageStyle();

    return new VNode({
      tag: 'img',
      props: {
        src: imgElement.src,
        style: imageStyle,
        alt: this.debugImageLabel || 'image',
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'RawImage',
        'data-width': this.width,
        'data-height': this.height,
        'data-fit': this.fit,
        'data-repeat': this.repeat,
        'data-scale': this.scale
      },
      key: this.key
    });
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'image', value: this.image ? 'Image' : 'null' });
    properties.push({ name: 'debugImageLabel', value: this.debugImageLabel });
    if (this.width) properties.push({ name: 'width', value: this.width });
    if (this.height) properties.push({ name: 'height', value: this.height });
    properties.push({ name: 'scale', value: this.scale });
    if (this.color) properties.push({ name: 'color', value: this.color });
    if (this.fit) properties.push({ name: 'fit', value: this.fit });
    properties.push({ name: 'repeat', value: this.repeat });
    properties.push({ name: 'filterQuality', value: this.filterQuality });
  }

  createElement() {
    return new RawImageElement(this);
  }
}

class RawImageElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }

  /**
   * Clean up on unmount
   */
  unmount() {
    if (this.widget._renderObject) {
      this.widget.didUnmountRenderObject(this.widget._renderObject);
    }
    super.unmount();
  }
}

// ============================================================================
// ASSET BUNDLE
// ============================================================================

class AssetBundle {
  constructor() {
    this._cache = new Map();
    this._loadedAssets = new Set();
  }

  /**
   * Load asset
   */
  async loadString(key) {
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    try {
      const response = await fetch(key);
      if (!response.ok) {
        throw new Error(`Failed to load asset: ${key}`);
      }
      const text = await response.text();
      this._cache.set(key, text);
      this._loadedAssets.add(key);
      return text;
    } catch (error) {
      console.error('Asset bundle load error:', error);
      throw error;
    }
  }

  /**
   * Load image
   */
  async loadImage(key) {
    const img = Image.fromUrl(key);
    await img.load();
    return img;
  }

  /**
   * Clear cache
   */
  clear() {
    this._cache.clear();
    this._loadedAssets.clear();
  }
}

// Root asset bundle singleton
const rootBundle = new AssetBundle();

// ============================================================================
// DEFAULT ASSET BUNDLE WIDGET
// ============================================================================

class DefaultAssetBundle extends InheritedWidget {
  constructor({
    key = null,
    bundle = null,
    child = null
  } = {}) {
    super({ key, child });

    if (!bundle) {
      throw new Error('DefaultAssetBundle requires a bundle');
    }

    this.bundle = bundle;
  }

  /**
   * Get the asset bundle from context
   */
  static of(context) {
    const result = context?.dependOnInheritedWidgetOfExactType?.(DefaultAssetBundle);
    return result?.bundle || rootBundle;
  }

  /**
   * Update should notify
   */
  updateShouldNotify(oldWidget) {
    return this.bundle !== oldWidget.bundle;
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'bundle', value: this.bundle.constructor.name });
  }

  createElement() {
    return new DefaultAssetBundleElement(this);
  }
}

class DefaultAssetBundleElement extends Element {
  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  RawImage,
  RawImageElement,
  RenderImage,
  Image,
  DefaultAssetBundle,
  DefaultAssetBundleElement,
  AssetBundle,
  rootBundle,
  BoxFit,
  ImageRepeat,
  BlendMode,
  FilterQuality
};