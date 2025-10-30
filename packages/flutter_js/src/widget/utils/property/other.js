/**
 * Shadow - Shadow properties
 */
const ShadowType = Object.freeze({
  none: 'none',
  elevation: 'elevation',
  custom: 'custom'
});

/**
 * Brightness - Light or dark theme
 */
const Brightness = Object.freeze({
  light: 'light',
  dark: 'dark'
});

/**
 * MaterialType - Material design surface types
 */
const MaterialType = Object.freeze({
  canvas: 'canvas',
  card: 'card',
  circle: 'circle',
  button: 'button',
  transparency: 'transparency'
});

/**
 * ============================================================================
 * SCROLL & OVERFLOW ENUMS
 * ============================================================================
 */

/**
 * ScrollDirection - Direction scrolling happens
 */
const ScrollDirection = Object.freeze({
  idle: 'idle',
  forward: 'forward',
  reverse: 'reverse'
});

/**
 * ScrollPhysics - How scrolling behaves
 */
const ScrollPhysics = Object.freeze({
  bouncingScrollPhysics: 'bouncingScrollPhysics',    // iOS style bounce
  clampingScrollPhysics: 'clampingScrollPhysics',    // Android style
  neverScrollableScrollPhysics: 'neverScrollableScrollPhysics'  // No scroll
});

/**
 * DragStartBehavior - When drag recognition starts
 */
const DragStartBehavior = Object.freeze({
  down: 'down',       // Recognize at pointer down
  start: 'start'      // Recognize at pointer move
});

/**
 * ============================================================================
 * ANIMATION & TRANSITION ENUMS
 * ============================================================================
 */

/**
 * AnimationStatus - State of animation
 */
const AnimationStatus = Object.freeze({
  dismissed: 'dismissed',
  forward: 'forward',
  reverse: 'reverse',
  completed: 'completed'
});

/**
 * Curve - Animation timing curves
 */
const Curve = Object.freeze({
  linear: 'linear',
  decelerate: 'decelerate',
  fastLinearToSlowCurveEaseInToEaseOut: 'fastLinearToSlowCurveEaseInToEaseOut',
  ease: 'ease',
  easeIn: 'easeIn',
  easeInToLinear: 'easeInToLinear',
  easeInSine: 'easeInSine',
  easeInQuad: 'easeInQuad',
  easeInCubic: 'easeInCubic',
  easeInQuart: 'easeInQuart',
  easeInQuint: 'easeInQuint',
  easeInExpo: 'easeInExpo',
  easeInCirc: 'easeInCirc',
  easeInBack: 'easeInBack',
  easeOut: 'easeOut',
  linearToEaseOut: 'linearToEaseOut',
  easeOutSine: 'easeOutSine',
  easeOutQuad: 'easeOutQuad',
  easeOutCubic: 'easeOutCubic',
  easeOutQuart: 'easeOutQuart',
  easeOutQuint: 'easeOutQuint',
  easeOutExpo: 'easeOutExpo',
  easeOutCirc: 'easeOutCirc',
  easeOutBack: 'easeOutBack',
  easeInOut: 'easeInOut',
  easeInOutSine: 'easeInOutSine',
  easeInOutQuad: 'easeInOutQuad',
  easeInOutCubic: 'easeInOutCubic',
  easeInOutQuart: 'easeInOutQuart',
  easeInOutQuint: 'easeInOutQuint',
  easeInOutExpo: 'easeInOutExpo',
  easeInOutCirc: 'easeInOutCirc',
  easeInOutBack: 'easeInOutBack',
  fastOutSlowIn: 'fastOutSlowIn',
  slowMiddle: 'slowMiddle',
  elasticIn: 'elasticIn',
  elasticOut: 'elasticOut',
  elasticInOut: 'elasticInOut',
  bounceIn: 'bounceIn',
  bounceOut: 'bounceOut',
  bounceInOut: 'bounceInOut'
});

/**
 * ============================================================================
 * DIALOG & NAVIGATION ENUMS
 * ============================================================================
 */

/**
 * RouteType - Type of route navigation
 */
const RouteType = Object.freeze({
  material: 'material',
  cupertino: 'cupertino',
  fade: 'fade'
});

/**
 * TransitionType - How routes transition
 */
const TransitionType = Object.freeze({
  fadeIn: 'fadeIn',
  slideInFromLeft: 'slideInFromLeft',
  slideInFromRight: 'slideInFromRight',
  slideInFromTop: 'slideInFromTop',
  slideInFromBottom: 'slideInFromBottom',
  scale: 'scale',
  rotate: 'rotate'
});

/**
 * PopupMenuPosition - Where popup menu appears
 */
const PopupMenuPosition = Object.freeze({
  under: 'under',
  over: 'over'
});

/**
 * ============================================================================
 * GESTURE & HIT TEST ENUMS
 * ============================================================================
 */

/**
 * HitTestBehavior - How a widget responds to hit tests
 */
const HitTestBehavior = Object.freeze({
  deferToChild: 'deferToChild',     // Only hit if child hit
  absorb: 'absorb',                  // Always hit, absorb event
  translucent: 'translucent'         // Hit but pass through to children
});

/**
 * PointerDeviceKind - Type of pointer device
 */
const PointerDeviceKind = Object.freeze({
  touch: 'touch',
  mouse: 'mouse',
  stylus: 'stylus',
  invertedStylus: 'invertedStylus',
  unknown: 'unknown'
});

/**
 * ============================================================================
 * IMAGE & ASSET ENUMS
 * ============================================================================
 */

/**
 * ImageRepeat - How to repeat an image
 */
const ImageRepeat = Object.freeze({
  noRepeat: 'noRepeat',
  repeat: 'repeat',
  repeatX: 'repeatX',
  repeatY: 'repeatY'
});

/**
 * BoxFit - How to fit image into container
 */
const BoxFit = Object.freeze({
  fill: 'fill',             // Stretch to fill (distort)
  contain: 'contain',       // Fit entire image (letterbox)
  cover: 'cover',           // Fill container (crop)
  fitWidth: 'fitWidth',     // Match width, crop height
  fitHeight: 'fitHeight',   // Match height, crop width
  none: 'none',             // No scaling
  scaleDown: 'scaleDown'    // Downscale only, don't upscale
});

/**
 * ImageChunkEvent - Progress of image loading
 */
const ImageChunkEvent = Object.freeze({
  loading: 'loading',
  complete: 'complete'
});

/**
 * ============================================================================
 * PLATFORM ENUMS
 * ============================================================================
 */

/**
 * TargetPlatform - Current platform
 */
const TargetPlatform = Object.freeze({
  android: 'android',
  fuchsia: 'fuchsia',
  iOS: 'iOS',
  linux: 'linux',
  macOS: 'macOS',
  windows: 'windows',
  web: 'web'
});

/**
 * ============================================================================
 * STATUS BAR ENUMS
 * ============================================================================
 */

/**
 * SystemUiOverlayStyle - Status bar and navigation bar styling
 */
const SystemUiOverlayStyle = Object.freeze({
  light: 'light',
  dark: 'dark',
  lightStatus: 'lightStatus',
  darkStatus: 'darkStatus'
});

export {
  ShadowType,
  Brightness,
  MaterialType,
  ScrollDirection,
  ScrollPhysics,  
  DragStartBehavior,
  AnimationStatus,
  Curve,
  RouteType,
  TransitionType,
  PopupMenuPosition,
  HitTestBehavior,
  PointerDeviceKind,
  ImageRepeat,
  BoxFit,
  ImageChunkEvent,
  TargetPlatform,
  SystemUiOverlayStyle
};  