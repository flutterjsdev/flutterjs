
import { StatefulWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { BoxFit, BlendMode, FilterQuality, Clip } from '../utils/utils.js';

const IMAGE_SOURCE_TYPES = {
  network: 'network',
  asset: 'asset',
  memory: 'memory',
  file: 'file'
};

const BLEND_MODE_MAP = {
  [BlendMode.normal]: 'normal',
  [BlendMode.multiply]: 'multiply',
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
  [BlendMode.hue]: 'hue',
  [BlendMode.saturation]: 'saturation',
  [BlendMode.color]: 'color',
  [BlendMode.luminosity]: 'luminosity'
};

const BOX_FIT_MAP = {
  [BoxFit.fill]: 'fill',
  [BoxFit.contain]: 'contain',
  [BoxFit.cover]: 'cover',
  [BoxFit.fitWidth]: 'scale-down',
  [BoxFit.fitHeight]: 'scale-down',
  [BoxFit.none]: 'none',
  [BoxFit.scaleDown]: 'scale-down'
};

const CLIP_BEHAVIOR_MAP = {
  none: 'visible',
  hardEdge: 'hidden',
  antiAlias: 'hidden',
  antiAliasWithSaveLayer: 'hidden'
};

/**
 * ImageStreamCompleterHandle - Manages stream lifecycle and memory
 */
class ImageStreamCompleterHandle {
  constructor(completer) {
    this.completer = completer;
    this.isAlive = true;
  }

  dispose() {
    this.isAlive = false;
  }

  keepAlive() {
    return this;
  }
}

/**
 * ImageStream - Handles image loading state and listeners
 */
class ImageStream {
  constructor(imageProvider) {
    this.imageProvider = imageProvider;
    this.listeners = new Set();
    this.imageInfo = null;
    this.error = null;
    this.completer = null;
  }

  addListener(listener) {
    this.listeners.add(listener);
    if (this.imageInfo) {
      listener.onImage(this.imageInfo);
    }
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  notifyListeners(imageInfo) {
    this.imageInfo = imageInfo;
    this.listeners.forEach(listener => {
      if (listener.onImage) listener.onImage(imageInfo);
    });
  }

  notifyError(error, stackTrace) {
    this.error = error;
    this.listeners.forEach(listener => {
      if (listener.onError) listener.onError(error, stackTrace);
    });
  }

  notifyChunk(event) {
    this.listeners.forEach(listener => {
      if (listener.onChunk) listener.onChunk(event);
    });
  }
}

/**
 * ImageChunkEvent - Tracks image loading progress
 */
class ImageChunkEvent {
  constructor({ cumulativeBytesLoaded = 0, expectedTotalBytes = null } = {}) {
    this.cumulativeBytesLoaded = cumulativeBytesLoaded;
    this.expectedTotalBytes = expectedTotalBytes;
  }

  get progress() {
    if (!this.expectedTotalBytes) return 0;
    return this.cumulativeBytesLoaded / this.expectedTotalBytes;
  }
}

/**
 * ImageProvider - Base class for different image sources
 */
class ImageProvider {
  constructor(sourceType = IMAGE_SOURCE_TYPES.network) {
    this.sourceType = sourceType;
    this.key = Math.random().toString(36).substr(2, 9);
  }

  resolve(config = {}) {
    return new ImageStream(this);
  }

  async load() {
    throw new Error('load() must be implemented');
  }

  getUrl() {
    throw new Error('getUrl() must be implemented');
  }
}

/**
 * NetworkImage - Load images from network URLs with progress tracking
 */
class NetworkImage extends ImageProvider {
  constructor(src, { scale = 1.0, headers = null, timeout = 10000, onProgress = null } = {}) {
    super(IMAGE_SOURCE_TYPES.network);
    this.src = src;
    this.scale = scale;
    this.headers = headers || {};
    this.timeout = timeout;
    this.onProgress = onProgress;
  }

  resolve(config = {}) {
    const stream = new ImageStream(this);
    this._loadWithStream(stream, config);
    return stream;
  }

  async _loadWithStream(stream, config) {
    try {
      const result = await this._loadImage();
      stream.notifyListeners({
        image: result.element,
        width: result.width,
        height: result.height,
        scale: this.scale,
        src: this.src
      });
    } catch (error) {
      stream.notifyError(error, new Error().stack);
    }
  }

  _loadImage() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Network image timeout: ${this.src}`));
      }, this.timeout);

      const xhr = new XMLHttpRequest();
      
      xhr.addEventListener('progress', (e) => {
        if (e.lengthComputable && this.onProgress) {
          this.onProgress({
            cumulativeBytesLoaded: e.loaded,
            expectedTotalBytes: e.total
          });
        }
      });

      xhr.addEventListener('load', () => {
        clearTimeout(timer);
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = xhr.response;
          const img = new Image();

          img.onload = () => {
            resolve({
              element: img,
              width: img.naturalWidth,
              height: img.naturalHeight,
              scale: this.scale
            });
          };

          img.onerror = () => {
            reject(new Error(`Failed to load network image: ${this.src}`));
          };

          img.src = URL.createObjectURL(blob);
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${this.src}`));
        }
      });

      xhr.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error(`Network error loading: ${this.src}`));
      });

      xhr.responseType = 'blob';
      xhr.open('GET', this.src, true);
      
      Object.entries(this.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send();
    });
  }

  async load() {
    return this._loadImage();
  }

  getUrl() {
    return this.src;
  }
}

/**
 * AssetImage - Load images from project assets
 */
class AssetImage extends ImageProvider {
  constructor(assetPath, { packages = null, scale = 1.0 } = {}) {
    super(IMAGE_SOURCE_TYPES.asset);
    this.assetPath = assetPath;
    this.packages = packages;
    this.scale = scale;
    this.key = `asset:${packages}:${assetPath}:${scale}`;
  }

  resolve(config = {}) {
    const stream = new ImageStream(this);
    this._loadWithStream(stream, config);
    return stream;
  }

  async _loadWithStream(stream, config) {
    try {
      const result = await this.load();
      stream.notifyListeners({
        image: result.element,
        width: result.width,
        height: result.height,
        scale: this.scale,
        src: result.src
      });
    } catch (error) {
      stream.notifyError(error, new Error().stack);
    }
  }

  async load() {
    return new Promise((resolve, reject) => {
      const assetUrl = this._resolveAssetPath();
      const img = new Image();

      img.onload = () => {
        resolve({
          element: img,
          src: assetUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          scale: this.scale
        });
      };

      img.onerror = () => {
        reject(new Error(`Failed to load asset image: ${this.assetPath}`));
      };

      img.src = assetUrl;
    });
  }

  _resolveAssetPath() {
    const basePath = this.packages ? `/packages/${this.packages}` : '/assets';
    return `${basePath}/${this.assetPath}`;
  }

  getUrl() {
    return this._resolveAssetPath();
  }
}

/**
 * MemoryImage - Load images from Uint8Array or base64 encoded data
 */
class MemoryImage extends ImageProvider {
  constructor(bytes, { scale = 1.0 } = {}) {
    super(IMAGE_SOURCE_TYPES.memory);
    this.bytes = bytes;
    this.scale = scale;
    this.key = `memory:${this.bytes.length}:${scale}`;
  }

  resolve(config = {}) {
    const stream = new ImageStream(this);
    this._loadWithStream(stream, config);
    return stream;
  }

  async _loadWithStream(stream, config) {
    try {
      const result = await this.load();
      stream.notifyListeners({
        image: result.element,
        width: result.width,
        height: result.height,
        scale: this.scale,
        src: result.src
      });
    } catch (error) {
      stream.notifyError(error, new Error().stack);
    }
  }

  async load() {
    return new Promise((resolve, reject) => {
      try {
        let dataUrl;

        if (this.bytes instanceof Uint8Array) {
          const binary = String.fromCharCode.apply(null, this.bytes);
          dataUrl = 'data:image/png;base64,' + btoa(binary);
        } else if (typeof this.bytes === 'string') {
          dataUrl = this.bytes.startsWith('data:') ? this.bytes : `data:image/png;base64,${this.bytes}`;
        } else {
          throw new Error('Invalid image data');
        }

        const img = new Image();
        img.onload = () => {
          resolve({
            element: img,
            src: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            scale: this.scale
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load memory image'));
        };

        img.src = dataUrl;
      } catch (error) {
        reject(error);
      }
    });
  }

  getUrl() {
    if (this.bytes instanceof Uint8Array) {
      const binary = String.fromCharCode.apply(null, this.bytes);
      return 'data:image/png;base64,' + btoa(binary);
    }
    return this.bytes;
  }
}

/**
 * FileImage - Load images from file system (Node.js environment)
 */
class FileImage extends ImageProvider {
  constructor(filePath, { scale = 1.0 } = {}) {
    super(IMAGE_SOURCE_TYPES.file);
    this.filePath = filePath;
    this.scale = scale;
  }

  async load() {
    if (typeof window !== 'undefined') {
      throw new Error('FileImage is not supported in web environments. Use Image.asset or Image.network instead.');
    }
    throw new Error('FileImage requires Node.js file system implementation');
  }

  getUrl() {
    return this.filePath;
  }
}

/**
 * Image - StatefulWidget for rendering images with various sources
 * Mirrors Flutter's Image widget API and behavior
 */
class Image extends StatefulWidget {
  constructor({
    key = null,
    image = null,
    width = null,
    height = null,
    color = null,
    opacity = null,
    colorBlendMode = BlendMode.normal,
    fit = BoxFit.contain,
    alignment = 'center',
    repeat = 'no-repeat',
    centerSlice = null,
    matchTextDirection = false,
    gaplessPlayback = false,
    isAntiAlias = false,
    filterQuality = FilterQuality.medium,
    frameBuilder = null,
    loadingBuilder = null,
    errorBuilder = null,
    semanticLabel = null,
    excludeFromSemantics = false,
    clipBehavior = Clip.hardEdge
  } = {}) {
    super(key);
    
    if (!image || !(image instanceof ImageProvider)) {
      throw new Error('Image requires a valid ImageProvider');
    }

    this.image = image;
    this.width = width;
    this.height = height;
    this.color = color;
    this.opacity = opacity;
    this.colorBlendMode = colorBlendMode;
    this.fit = fit;
    this.alignment = alignment;
    this.repeat = repeat;
    this.centerSlice = centerSlice;
    this.matchTextDirection = matchTextDirection;
    this.gaplessPlayback = gaplessPlayback;
    this.isAntiAlias = isAntiAlias;
    this.filterQuality = filterQuality;
    this.frameBuilder = frameBuilder;
    this.loadingBuilder = loadingBuilder;
    this.errorBuilder = errorBuilder;
    this.semanticLabel = semanticLabel;
    this.excludeFromSemantics = excludeFromSemantics;
    this.clipBehavior = clipBehavior;
  }

  static network(src, {
    key = null,
    scale = 1.0,
    headers = null,
    cacheWidth = null,
    cacheHeight = null,
    ...otherOptions
  } = {}) {
    const provider = new NetworkImage(src, { scale, headers });
    return new Image({ key, image: provider, ...otherOptions });
  }

  static asset(assetPath, {
    key = null,
    scale = null,
    packages = null,
    cacheWidth = null,
    cacheHeight = null,
    ...otherOptions
  } = {}) {
    const provider = new AssetImage(assetPath, { packages, scale: scale || 1.0 });
    return new Image({ key, image: provider, ...otherOptions });
  }

  static memory(bytes, {
    key = null,
    scale = 1.0,
    cacheWidth = null,
    cacheHeight = null,
    ...otherOptions
  } = {}) {
    const provider = new MemoryImage(bytes, { scale });
    return new Image({ key, image: provider, ...otherOptions });
  }

  static file(filePath, {
    key = null,
    scale = 1.0,
    cacheWidth = null,
    cacheHeight = null,
    ...otherOptions
  } = {}) {
    if (typeof window !== 'undefined') {
      throw new Error('Image.file is not supported on Flutter Web. Consider using either Image.asset or Image.network instead.');
    }
    const provider = new FileImage(filePath, { scale });
    return new Image({ key, image: provider, ...otherOptions });
  }

  createState() {
    return new _ImageState();
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'image', value: this.image });
    properties.push({ name: 'width', value: this.width });
    properties.push({ name: 'height', value: this.height });
    properties.push({ name: 'color', value: this.color });
    properties.push({ name: 'colorBlendMode', value: this.colorBlendMode });
    properties.push({ name: 'fit', value: this.fit });
    properties.push({ name: 'alignment', value: this.alignment });
    properties.push({ name: 'gaplessPlayback', value: this.gaplessPlayback });
    properties.push({ name: 'filterQuality', value: this.filterQuality });
  }
}

/**
 * _ImageState - State management for Image widget
 * Handles loading, caching, error recovery, and lifecycle
 */
class _ImageState {
  constructor(widget) {
    this.widget = widget;
    this.imageStream = null;
    this.imageInfo = null;
    this.loadingProgress = null;
    this.isListeningToStream = false;
    this.error = null;
    this.errorStack = null;
    this.frameNumber = null;
    this.wasSynchronouslyLoaded = false;
    this.completerHandle = null;
    this.lastImageProvider = null;
  }

  initState() {
    // Initialize state
  }

  didChangeDependencies() {
    this._resolveImage();
    this._listenToStream();
  }

  didUpdateWidget(oldWidget) {
    if (this.isListeningToStream && 
        (this.widget.loadingBuilder == null) !== (oldWidget.loadingBuilder == null)) {
      this._updateStreamListener();
    }

    if (this.widget.image !== oldWidget.image) {
      this._resolveImage();
    }
  }

  dispose() {
    this._stopListeningToStream();
    this.completerHandle?.dispose();
  }

  _resolveImage() {
    const newStream = this.widget.image.resolve({});

    if (newStream.imageProvider.key !== this.lastImageProvider?.key) {
      this._updateSourceStream(newStream);
      this.lastImageProvider = newStream.imageProvider;
    }
  }

  _updateSourceStream(newStream) {
    if (this.imageStream?.imageProvider.key === newStream.imageProvider.key) {
      return;
    }

    if (this.isListeningToStream) {
      this._removeImageStreamListener();
    }

    if (!this.widget.gaplessPlayback) {
      this._replaceImage(null);
    }

    this.loadingProgress = null;
    this.frameNumber = null;
    this.wasSynchronouslyLoaded = false;
    this.imageStream = newStream;

    if (this.isListeningToStream) {
      this._addImageStreamListener();
    }
  }

  _listenToStream() {
    if (this.isListeningToStream) return;

    this._addImageStreamListener();
    this.isListeningToStream = true;
  }

  _stopListeningToStream() {
    if (!this.isListeningToStream) return;

    if (this.completerHandle == null && this.imageStream?.completer) {
      this.completerHandle = this.imageStream.completer.keepAlive();
    }

    this._removeImageStreamListener();
    this.isListeningToStream = false;
  }

  _addImageStreamListener() {
    this.imageStream?.addListener({
      onImage: (imageInfo) => this._handleImageFrame(imageInfo),
      onError: (error, stackTrace) => this._handleImageError(error, stackTrace),
      onChunk: (event) => this._handleImageChunk(event)
    });
  }

  _removeImageStreamListener() {
    this.imageStream?.removeListener({
      onImage: (imageInfo) => this._handleImageFrame(imageInfo),
      onError: (error, stackTrace) => this._handleImageError(error, stackTrace),
      onChunk: (event) => this._handleImageChunk(event)
    });
  }

  _updateStreamListener() {
    this._removeImageStreamListener();
    this._addImageStreamListener();
  }

  _handleImageFrame(imageInfo) {
    this.imageInfo = imageInfo;
    this.loadingProgress = null;
    this.error = null;
    this.errorStack = null;
    this.frameNumber = (this.frameNumber || 0) + 1;
    this.wasSynchronouslyLoaded = true;
  }

  _handleImageChunk(event) {
    if (this.widget.loadingBuilder) {
      this.loadingProgress = event;
    }
  }

  _handleImageError(error, stackTrace) {
    this.error = error;
    this.errorStack = stackTrace;
    if (this.widget.errorBuilder) {
      // Trigger rebuild through parent context
    }
  }

  _replaceImage(imageInfo) {
    this.imageInfo = imageInfo;
  }

  build(context) {
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();
    const inlineStyles = this._getInlineStyles();

    // Handle error state
    if (this.error) {
      if (this.widget.errorBuilder) {
        return this.widget.errorBuilder(context, this.error, this.errorStack);
      }
      return new VNode({
        tag: 'div',
        props: {
          className: 'fjs-image-error',
          style: {
            ...inlineStyles,
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            overflow: CLIP_BEHAVIOR_MAP[this.widget.clipBehavior] || 'hidden'
          },
          'data-element-id': elementId,
          'data-widget-path': widgetPath,
          title: this.error.message
        },
        children: ['⚠ Image failed to load']
      });
    }

    // Handle loading state
    if (!this.imageInfo && this.widget.loadingBuilder) {
      return this.widget.loadingBuilder(context, null, this.loadingProgress);
    }

    let result = this._buildImageElement(elementId, widgetPath, inlineStyles);

    // Apply frame builder
    if (this.widget.frameBuilder) {
      result = this.widget.frameBuilder(
        context,
        result,
        this.frameNumber,
        this.wasSynchronouslyLoaded
      );
    }

    // Apply loading builder wrapper
    if (this.widget.loadingBuilder) {
      result = this.widget.loadingBuilder(context, result, this.loadingProgress);
    }

    // Apply semantics
    if (!this.widget.excludeFromSemantics) {
      result = new VNode({
        tag: 'figure',
        props: {
          role: 'img',
          'aria-label': this.widget.semanticLabel || 'Image',
          style: { margin: 0 }
        },
        children: [result]
      });
    }

    return result;
  }

  _buildImageElement(elementId, widgetPath, inlineStyles) {
    const imgProps = {
      className: 'fjs-image',
      style: inlineStyles,
      'data-element-id': elementId,
      'data-widget-path': widgetPath,
      'data-widget': 'Image',
      'data-source-type': this.widget.image.sourceType,
      alt: this.widget.semanticLabel || 'Image'
    };

    if (this.imageInfo) {
      imgProps.src = this.imageInfo.src;
    }

    return new VNode({
      tag: 'img',
      props: imgProps,
      key: this.widget.key
    });
  }

  _getInlineStyles() {
    const styles = {
      width: this.widget.width ? `${this.widget.width}px` : 'auto',
      height: this.widget.height ? `${this.widget.height}px` : 'auto',
      objectFit: BOX_FIT_MAP[this.widget.fit] || 'contain',
      objectPosition: this._mapAlignment(),
      backgroundRepeat: this.widget.repeat,
      overflow: CLIP_BEHAVIOR_MAP[this.widget.clipBehavior] || 'hidden',
      filter: this._buildFilterStyles()
    };

    // Apply color blend mode
    if (this.widget.color && this.widget.colorBlendMode) {
      styles.mixBlendMode = BLEND_MODE_MAP[this.widget.colorBlendMode] || 'normal';
      // Create color overlay
      styles.backgroundColor = this.widget.color;
      styles.backgroundBlendMode = BLEND_MODE_MAP[this.widget.colorBlendMode];
    }

    // Apply opacity
    if (this.widget.opacity !== null && this.widget.opacity !== undefined) {
      styles.opacity = this.widget.opacity;
    }

    // Apply anti-alias
    if (this.widget.isAntiAlias) {
      styles.imageRendering = 'smooth';
    } else {
      styles.imageRendering = 'pixelated';
    }

    // Text direction
    if (this.widget.matchTextDirection) {
      styles.direction = document.dir || 'ltr';
    }

    return styles;
  }

  _mapAlignment() {
    const alignmentMap = {
      'center': 'center',
      'topLeft': 'top left',
      'topCenter': 'top center',
      'topRight': 'top right',
      'centerLeft': 'center left',
      'centerRight': 'center right',
      'bottomLeft': 'bottom left',
      'bottomCenter': 'bottom center',
      'bottomRight': 'bottom right'
    };
    return alignmentMap[this.widget.alignment] || 'center';
  }

  _buildFilterStyles() {
    const filters = [];

    if (this.widget.filterQuality === FilterQuality.high) {
      filters.push('contrast(1.1) saturate(1.05)');
    } else if (this.widget.filterQuality === FilterQuality.low) {
      filters.push('blur(0.5px)');
    }

    return filters.length > 0 ? filters.join(' ') : 'none';
  }
}

export { 
  Image, 
  ImageProvider, 
  NetworkImage, 
  AssetImage, 
  MemoryImage, 
  FileImage, 
  ImageStream,
  ImageChunkEvent,
  ImageStreamCompleterHandle,
  IMAGE_SOURCE_TYPES 
};