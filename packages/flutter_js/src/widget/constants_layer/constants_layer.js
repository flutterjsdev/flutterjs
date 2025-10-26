// ============================================================================
// 1. COLORS CONSTANTS
// ============================================================================
// File: src/constants/colors.constants.js

// Material Design 3 Color Palette (MD3)
export const Colors = {
  // Primary Colors
  primary: '#6200EA',
  primaryContainer: '#EADDFF',
  primaryDim: '#4A007C',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#21005D',

  // Secondary Colors
  secondary: '#03DAC6',
  secondaryContainer: '#AEFFED',
  secondaryDim: '#006D5C',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#00363F',

  // Tertiary Colors
  tertiary: '#018786',
  tertiaryContainer: '#A4F1E0',
  tertiaryDim: '#005A56',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#002019',

  // Error Colors
  error: '#B3261E',
  errorContainer: '#F9DEDC',
  onError: '#FFFFFF',
  onErrorContainer: '#410E0B',

  // Neutral Colors (Grayscale)
  background: '#FFFBFE',
  surface: '#FFFBFE',
  surfaceVariant: '#E7E0EC',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  onBackground: '#1C1B1F',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454E',

  // Additional neutrals
  scrim: '#000000',
  inverseSurface: '#313033',
  inverseOnSurface: '#F5EFF7',
  inversePrimary: '#D0BCFF',

  // Extended Palette
  shadow: '#000000',
  transparent: 'rgba(0, 0, 0, 0)',

  // Legacy Material Colors (for compatibility)
  black: '#000000',
  white: '#FFFFFF',
  grey50: '#FAFAFA',
  grey100: '#F5F5F5',
  grey200: '#EEEEEE',
  grey300: '#E0E0E0',
  grey400: '#BDBDBD',
  grey500: '#9E9E9E',
  grey600: '#757575',
  grey700: '#616161',
  grey800: '#424242',
  grey900: '#212121',

  // Accent Colors
  red: '#F44336',
  pink: '#E91E63',
  purple: '#9C27B0',
  deepPurple: '#673AB7',
  indigo: '#3F51B5',
  blue: '#2196F3',
  lightBlue: '#03A9F4',
  cyan: '#00BCD4',
  teal: '#009688',
  green: '#4CAF50',
  lightGreen: '#8BC34A',
  lime: '#CDDC39',
  yellow: '#FFEB3B',
  amber: '#FFC107',
  orange: '#FF9800',
  deepOrange: '#FF5722',
  brown: '#795548',
  blueGrey: '#607D8B',

  // Semantic Colors
  success: '#4CAF50',
  warning: '#FFC107',
  info: '#2196F3',
  danger: '#F44336',

  // Semi-transparent variations
  black12: 'rgba(0, 0, 0, 0.12)',
  black26: 'rgba(0, 0, 0, 0.26)',
  black38: 'rgba(0, 0, 0, 0.38)',
  black45: 'rgba(0, 0, 0, 0.45)',
  black54: 'rgba(0, 0, 0, 0.54)',
  black87: 'rgba(0, 0, 0, 0.87)',
  white10: 'rgba(255, 255, 255, 0.10)',
  white24: 'rgba(255, 255, 255, 0.24)',
  white30: 'rgba(255, 255, 255, 0.30)',
  white38: 'rgba(255, 255, 255, 0.38)',
  white54: 'rgba(255, 255, 255, 0.54)',
  white70: 'rgba(255, 255, 255, 0.70)',
  white87: 'rgba(255, 255, 255, 0.87)',
};

export const ColorNames = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  error: 'Error',
  background: 'Background',
  surface: 'Surface',
  outline: 'Outline',
};

// ============================================================================
// 2. SIZES CONSTANTS
// ============================================================================
// File: src/constants/sizes.constants.js

export const Sizes = {
  // Spacing scale (8px base unit - Material Design)
  space0: 0,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space7: 28,
  space8: 32,
  space10: 40,
  space12: 48,
  space16: 64,
  space20: 80,
  space24: 96,

  // Common spacing aliases
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Padding presets
  paddingTiny: 4,
  paddingSmall: 8,
  paddingMedium: 16,
  paddingLarge: 24,
  paddingXLarge: 32,

  // Border radius
  radius0: 0,
  radius1: 4,
  radius2: 8,
  radius3: 12,
  radius4: 16,
  radius5: 20,
  radius6: 24,
  radius8: 32,
  radius12: 48,

  // Common radius aliases
  radiusSmall: 4,
  radiusMedium: 8,
  radiusLarge: 16,
  radiusExtraLarge: 24,
  radiusFull: 9999,

  // Icon sizes
  iconExtraSmall: 16,
  iconSmall: 20,
  iconMedium: 24,
  iconLarge: 32,
  iconExtraLarge: 48,

  // Button sizes
  buttonHeightSmall: 32,
  buttonHeightMedium: 40,
  buttonHeightLarge: 48,
  buttonHeightExtraLarge: 56,

  // Component sizes
  checkboxSize: 24,
  radioSize: 24,
  switchWidth: 52,
  switchHeight: 32,

  // Touch target (minimum 48x48)
  touchTargetMinimum: 48,
  touchTargetRecommended: 48,

  // Breakpoints (responsive)
  breakpointXSmall: 320,
  breakpointSmall: 480,
  breakpointMedium: 768,
  breakpointLarge: 1024,
  breakpointXLarge: 1280,
  breakpointXXLarge: 1536,

  // Layout constraints
  maxWidth: 1200,
  maxWidthContent: 900,
  maxWidthCompact: 600,

  // Shadows
  shadowElevation0: 0,
  shadowElevation1: 1,
  shadowElevation2: 3,
  shadowElevation3: 6,
  shadowElevation4: 8,
  shadowElevation5: 12,
};

// ============================================================================
// 3. TYPOGRAPHY CONSTANTS
// ============================================================================
// File: src/constants/typography.constants.js

export const Typography = {
  // Font families
  fontFamilyBase: "'Roboto', 'Helvetica Neue', sans-serif",
  fontFamilyMonospace: "'Roboto Mono', monospace",
  fontFamilyDisplay: "'Roboto', sans-serif",
  fontFamilyHeading: "'Roboto', sans-serif",
  fontFamilyBody: "'Roboto', sans-serif",

  // Font sizes (MD3 scale)
  fontSizeExtraSmall: 12,
  fontSizeSmall: 14,
  fontSizeMedium: 16,
  fontSizeLarge: 18,
  fontSizeExtraLarge: 20,
  fontSizeXXLarge: 24,

  // Display sizes (headings)
  displayLargeSize: 57,
  displayMediumSize: 45,
  displaySmallSize: 36,

  // Headline sizes
  headlineLargeSize: 32,
  headlineMediumSize: 28,
  headlineSmallSize: 24,

  // Title sizes
  titleLargeSize: 22,
  titleMediumSize: 16,
  titleSmallSize: 14,

  // Body text sizes
  bodyLargeSize: 16,
  bodyMediumSize: 14,
  bodySmallSize: 12,

  // Label sizes
  labelLargeSize: 14,
  labelMediumSize: 12,
  labelSmallSize: 11,

  // Font weights
  fontWeightThin: 100,
  fontWeightExtraLight: 200,
  fontWeightLight: 300,
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,
  fontWeightExtraBold: 800,
  fontWeightBlack: 900,

  // Display text style
  displayLargeWeight: 400,
  displayLargeLineHeight: 64,
  displayLargeLetterSpacing: 0,

  displayMediumWeight: 400,
  displayMediumLineHeight: 52,
  displayMediumLetterSpacing: 0,

  displaySmallWeight: 500,
  displaySmallLineHeight: 44,
  displaySmallLetterSpacing: 0,

  // Headline text style
  headlineLargeWeight: 400,
  headlineLargeLineHeight: 40,
  headlineLargeLetterSpacing: 0,

  headlineMediumWeight: 400,
  headlineMediumLineHeight: 36,
  headlineMediumLetterSpacing: 0,

  headlineSmallWeight: 500,
  headlineSmallLineHeight: 32,
  headlineSmallLetterSpacing: 0,

  // Title text style
  titleLargeWeight: 400,
  titleLargeLineHeight: 28,
  titleLargeLetterSpacing: 0,

  titleMediumWeight: 500,
  titleMediumLineHeight: 24,
  titleMediumLetterSpacing: 0.15,

  titleSmallWeight: 500,
  titleSmallLineHeight: 20,
  titleSmallLetterSpacing: 0.1,

  // Body text style
  bodyLargeWeight: 400,
  bodyLargeLineHeight: 24,
  bodyLargeLetterSpacing: 0.5,

  bodyMediumWeight: 400,
  bodyMediumLineHeight: 20,
  bodyMediumLetterSpacing: 0.25,

  bodySmallWeight: 500,
  bodySmallLineHeight: 16,
  bodySmallLetterSpacing: 0.4,

  // Label text style
  labelLargeWeight: 500,
  labelLargeLineHeight: 20,
  labelLargeLetterSpacing: 0.1,

  labelMediumWeight: 500,
  labelMediumLineHeight: 16,
  labelMediumLetterSpacing: 0.5,

  labelSmallWeight: 500,
  labelSmallLineHeight: 16,
  labelSmallLetterSpacing: 0.5,
};

// ============================================================================
// 4. DURATIONS CONSTANTS
// ============================================================================
// File: src/constants/durations.constants.js

export const Durations = {
  // Short animations
  ultraShort: 50,
  veryShort: 100,
  short: 150,

  // Standard animations
  standard: 200,
  mediumShort: 250,
  medium: 300,
  mediumLong: 350,

  // Long animations
  long: 400,
  veryLong: 500,
  ultraLong: 600,

  // Extra long animations
  extraLong: 700,
  veryExtraLong: 800,
  longestAnimation: 1000,

  // Material motion guidelines
  // Incoming elements
  entrance1: 250,
  entrance2: 300,
  entrance3: 400,
  entrance4: 500,

  // Outgoing elements
  exit1: 200,
  exit2: 250,
  exit3: 300,

  // Emphasis animations
  emphasize1: 200,
  emphasize2: 300,
  emphasize3: 400,

  // Component-specific durations
  buttonPress: 150,
  rippleEffect: 300,
  fadeIn: 200,
  fadeOut: 150,
  slideIn: 300,
  slideOut: 200,
  scaleIn: 250,
  scaleOut: 150,
  rotateIn: 300,
  rotateOut: 200,

  // Transition durations
  transitionShort: 100,
  transitionMedium: 300,
  transitionLong: 500,

  // Page transitions
  pageTransition: 400,
  modalEnter: 400,
  modalExit: 250,
  drawerOpen: 400,
  drawerClose: 350,

  // List animations
  listItemAppear: 150,
  listItemRemove: 100,
  listReorder: 250,

  // Snackbar
  snackbarEnter: 200,
  snackbarExit: 150,
  snackbarDisplayDuration: 4000,

  // Toast
  toastDisplayDuration: 3000,

  // Tooltip
  tooltipShowDelay: 500,
  tooltipHideDelay: 100,

  // Hover effects
  hoverDelay: 200,

  // Debounce/Throttle
  debounceShort: 150,
  debounceMedium: 300,
  debounceLong: 500,
  throttleShort: 100,
  throttleMedium: 250,
};

// ============================================================================
// 5. CURVES CONSTANTS (Easing Functions)
// ============================================================================
// File: src/constants/curves.constants.js

export const Curves = {
  // Cubic bezier curves (Material Design standard)
  // Format: [x1, y1, x2, y2]

  // Linear
  linear: [0, 0, 1, 1],
  linearCubic: [0.17, 0.17, 0.83, 0.83],

  // Standard curves (recommended for most animations)
  standard: [0.2, 0.0, 0.0, 1.0],
  standardDecelerate: [0.0, 0.0, 0.0, 1.0],
  standardAccelerate: [0.3, 0.0, 1.0, 1.0],

  // Entrance curves (elements coming into view)
  easeInQuad: [0.55, 0.085, 0.68, 0.53],
  easeInCubic: [0.55, 0.055, 0.675, 0.19],
  easeInQuart: [0.895, 0.03, 0.685, 0.22],
  easeInQuint: [0.755, 0.05, 0.855, 0.06],
  easeInSine: [0.47, 0.0, 0.745, 0.715],
  easeInExpo: [0.95, 0.05, 0.795, 0.035],
  easeInCirc: [0.6, 0.04, 0.98, 0.335],
  easeInBack: [0.6, -0.28, 0.735, 0.045],
  easeInElastic: [0.175, 0.885, 0.32, 1.275],

  // Exit curves (elements leaving view)
  easeOutQuad: [0.25, 0.46, 0.45, 0.94],
  easeOutCubic: [0.215, 0.61, 0.355, 1.0],
  easeOutQuart: [0.165, 0.84, 0.44, 1.0],
  easeOutQuint: [0.23, 1.0, 0.32, 1.0],
  easeOutSine: [0.39, 0.575, 0.565, 1.0],
  easeOutExpo: [0.19, 1.0, 0.22, 1.0],
  easeOutCirc: [0.075, 0.82, 0.165, 1.0],
  easeOutBack: [0.175, 0.885, 0.32, 1.275],
  easeOutElastic: [0.175, 0.885, 0.32, 1.275],

  // In-Out curves (emphasis and transitions)
  easeInOutQuad: [0.455, 0.03, 0.515, 0.955],
  easeInOutCubic: [0.645, 0.045, 0.355, 1.0],
  easeInOutQuart: [0.77, 0.0, 0.175, 1.0],
  easeInOutQuint: [0.86, 0.0, 0.07, 1.0],
  easeInOutSine: [0.445, 0.05, 0.55, 0.95],
  easeInOutExpo: [1.0, 0.0, 0.0, 1.0],
  easeInOutCirc: [0.6, 0.04, 0.98, 0.335],
  easeInOutBack: [0.68, -0.55, 0.265, 1.55],
  easeInOutElastic: [0.68, -0.55, 0.265, 1.55],

  // Material Design curves
  materialStandard: [0.4, 0.0, 0.2, 1.0],
  materialDecelerate: [0.0, 0.0, 0.2, 1.0],
  materialAccelerate: [0.4, 0.0, 1.0, 1.0],
  materialSharp: [0.4, 0.0, 0.6, 1.0],

  // Bounce curves
  bounceIn: [0.6, -0.28, 0.735, 0.045],
  bounceOut: [0.175, 0.885, 0.32, 1.275],
  bounceInOut: [0.68, -0.55, 0.265, 1.55],

  // Custom Material 3 curves
  fastLinearToSlowEaseIn: [0.4, 0.0, 0.2, 1.0],
  linearToEaseOut: [0.0, 0.0, 0.2, 1.0],
  easeOutToLinear: [0.2, 0.0, 0.0, 1.0],

  // Emphasis curves
  emphasizeDecelerate: [0.05, 0.7, 0.1, 1.0],
  emphasizeAccelerate: [0.3, 0.0, 0.8, 0.15],

  // Custom spring-like curves
  spring: [0.68, -0.55, 0.265, 1.55],
  gentle: [0.25, 0.1, 0.25, 1.0],
  quick: [0.3, 0.0, 0.7, 1.0],
  smooth: [0.2, 0.0, 0.8, 1.0],
  snappy: [0.5, 0.0, 0.5, 1.0],
};

// Preset animation speeds
export const AnimationSpeed = {
  slow: 500,
  normal: 300,
  fast: 150,
  veryFast: 75,
};

// ============================================================================
// 6. INDEX - Re-export all constants
// ============================================================================
// File: src/constants/index.js

export default {
  Colors,
  ColorNames,
  Sizes,
  Typography,
  Durations,
  Curves,
  AnimationSpeed,
};