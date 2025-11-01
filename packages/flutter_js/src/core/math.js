// // ============================================================================
// // FLUTTER.JS MATH UTILITIES
// // Mathematical operations for Flutter.js framework
// // Layer: UTILS (math helper functions)
// // ============================================================================

// // ============================================================================
// // 1. BASIC MATH OPERATIONS
// // ============================================================================

// /**
//  * Returns the maximum value from two numbers
//  * @param {number} a - First value
//  * @param {number} b - Second value
//  * @returns {number} Maximum value
//  */
// export function max(a, b) {
//   return Math.max(a, b);
// }

// /**
//  * Returns the minimum value from two numbers
//  * @param {number} a - First value
//  * @param {number} b - Second value
//  * @returns {number} Minimum value
//  */
// export function min(a, b) {
//   return Math.min(a, b);
// }

// /**
//  * Returns the maximum value from an array of numbers
//  * @param {number[]} values - Array of values
//  * @returns {number} Maximum value
//  */
// export function maxList(values) {
//   return values.length > 0 ? Math.max(...values) : -Infinity;
// }

// /**
//  * Returns the minimum value from an array of numbers
//  * @param {number[]} values - Array of values
//  * @returns {number} Minimum value
//  */
// export function minList(values) {
//   return values.length > 0 ? Math.min(...values) : Infinity;
// }

// /**
//  * Clamps a value between min and max
//  * @param {number} value - Value to clamp
//  * @param {number} min - Minimum bound
//  * @param {number} max - Maximum bound
//  * @returns {number} Clamped value
//  */
// export function clamp(value, min, max) {
//   if (value < min) return min;
//   if (value > max) return max;
//   return value;
// }

// // ============================================================================
// // 2. ROUNDING FUNCTIONS
// // ============================================================================

// /**
//  * Rounds a number to the nearest integer
//  * @param {number} value - Value to round
//  * @returns {number} Rounded value
//  */
// export function round(value) {
//   return Math.round(value);
// }

// /**
//  * Rounds a number to a specific number of decimal places
//  * @param {number} value - Value to round
//  * @param {number} decimals - Number of decimal places
//  * @returns {number} Rounded value
//  */
// export function roundToDecimals(value, decimals = 2) {
//   const factor = Math.pow(10, decimals);
//   return Math.round(value * factor) / factor;
// }

// /**
//  * Rounds a number up to the nearest integer (ceiling)
//  * @param {number} value - Value to round
//  * @returns {number} Rounded up value
//  */
// export function ceil(value) {
//   return Math.ceil(value);
// }

// /**
//  * Rounds a number down to the nearest integer (floor)
//  * @param {number} value - Value to round
//  * @returns {number} Rounded down value
//  */
// export function floor(value) {
//   return Math.floor(value);
// }

// /**
//  * Truncates a number (removes decimal part)
//  * @param {number} value - Value to truncate
//  * @returns {number} Truncated value
//  */
// export function truncate(value) {
//   return Math.trunc(value);
// }

// // ============================================================================
// // 3. POWER & ROOT FUNCTIONS
// // ============================================================================

// /**
//  * Returns the square root of a number
//  * @param {number} value - Value to get square root of
//  * @returns {number} Square root
//  */
// export function sqrt(value) {
//   return Math.sqrt(value);
// }

// /**
//  * Returns the nth root of a number
//  * @param {number} value - Value to get root of
//  * @param {number} n - Root degree (default 2 for square root)
//  * @returns {number} Nth root
//  */
// export function nthRoot(value, n = 2) {
//   return Math.pow(value, 1 / n);
// }

// /**
//  * Returns value raised to a power
//  * @param {number} base - Base value
//  * @param {number} exponent - Exponent
//  * @returns {number} Result
//  */
// export function pow(base, exponent) {
//   return Math.pow(base, exponent);
// }

// /**
//  * Returns the square of a number
//  * @param {number} value - Value to square
//  * @returns {number} Squared value
//  */
// export function square(value) {
//   return value * value;
// }

// /**
//  * Returns the cube of a number
//  * @param {number} value - Value to cube
//  * @returns {number} Cubed value
//  */
// export function cube(value) {
//   return value * value * value;
// }

// // ============================================================================
// // 4. TRIGONOMETRIC FUNCTIONS
// // ============================================================================

// /**
//  * Returns the sine of a value in radians
//  * @param {number} radians - Angle in radians
//  * @returns {number} Sine value
//  */
// export function sin(radians) {
//   return Math.sin(radians);
// }

// /**
//  * Returns the cosine of a value in radians
//  * @param {number} radians - Angle in radians
//  * @returns {number} Cosine value
//  */
// export function cos(radians) {
//   return Math.cos(radians);
// }

// /**
//  * Returns the tangent of a value in radians
//  * @param {number} radians - Angle in radians
//  * @returns {number} Tangent value
//  */
// export function tan(radians) {
//   return Math.tan(radians);
// }

// /**
//  * Returns the inverse sine (arcsin) of a value
//  * @param {number} value - Value (-1 to 1)
//  * @returns {number} Angle in radians
//  */
// export function asin(value) {
//   return Math.asin(value);
// }

// /**
//  * Returns the inverse cosine (arccos) of a value
//  * @param {number} value - Value (-1 to 1)
//  * @returns {number} Angle in radians
//  */
// export function acos(value) {
//   return Math.acos(value);
// }

// /**
//  * Returns the inverse tangent (arctan) of a value
//  * @param {number} value - Value
//  * @returns {number} Angle in radians
//  */
// export function atan(value) {
//   return Math.atan(value);
// }

// /**
//  * Returns the angle (in radians) from x and y coordinates
//  * Equivalent to atan2(y, x)
//  * @param {number} y - Y coordinate
//  * @param {number} x - X coordinate
//  * @returns {number} Angle in radians
//  */
// export function atan2(y, x) {
//   return Math.atan2(y, x);
// }

// /**
//  * Converts degrees to radians
//  * @param {number} degrees - Angle in degrees
//  * @returns {number} Angle in radians
//  */
// export function degreesToRadians(degrees) {
//   return degrees * (Math.PI / 180);
// }

// /**
//  * Converts radians to degrees
//  * @param {number} radians - Angle in radians
//  * @returns {number} Angle in degrees
//  */
// export function radiansToDegrees(radians) {
//   return radians * (180 / Math.PI);
// }

// // ============================================================================
// // 5. LOGARITHMIC FUNCTIONS
// // ============================================================================

// /**
//  * Returns the natural logarithm (base e)
//  * @param {number} value - Value
//  * @returns {number} Natural logarithm
//  */
// export function ln(value) {
//   return Math.log(value);
// }

// /**
//  * Returns the base-10 logarithm
//  * @param {number} value - Value
//  * @returns {number} Base-10 logarithm
//  */
// export function log10(value) {
//   return Math.log10(value);
// }

// /**
//  * Returns the base-2 logarithm
//  * @param {number} value - Value
//  * @returns {number} Base-2 logarithm
//  */
// export function log2(value) {
//   return Math.log2(value);
// }

// /**
//  * Returns logarithm with arbitrary base
//  * @param {number} value - Value
//  * @param {number} base - Logarithm base
//  * @returns {number} Logarithm with given base
//  */
// export function logBase(value, base) {
//   return Math.log(value) / Math.log(base);
// }

// // ============================================================================
// // 6. ABSOLUTE VALUE & SIGN
// // ============================================================================

// /**
//  * Returns the absolute value (distance from zero)
//  * @param {number} value - Value
//  * @returns {number} Absolute value
//  */
// export function abs(value) {
//   return Math.abs(value);
// }

// /**
//  * Returns the sign of a value (-1, 0, or 1)
//  * @param {number} value - Value
//  * @returns {number} Sign (-1, 0, or 1)
//  */
// export function sign(value) {
//   if (value > 0) return 1;
//   if (value < 0) return -1;
//   return 0;
// }

// // ============================================================================
// // 7. VECTOR MATH
// // ============================================================================

// /**
//  * Calculates the distance between two points
//  * @param {number} x1 - First point X
//  * @param {number} y1 - First point Y
//  * @param {number} x2 - Second point X
//  * @param {number} y2 - Second point Y
//  * @returns {number} Distance between points
//  */
// export function distance(x1, y1, x2, y2) {
//   const dx = x2 - x1;
//   const dy = y2 - y1;
//   return sqrt(dx * dx + dy * dy);
// }

// /**
//  * Calculates the squared distance (faster, no sqrt)
//  * @param {number} x1 - First point X
//  * @param {number} y1 - First point Y
//  * @param {number} x2 - Second point X
//  * @param {number} y2 - Second point Y
//  * @returns {number} Squared distance
//  */
// export function distanceSquared(x1, y1, x2, y2) {
//   const dx = x2 - x1;
//   const dy = y2 - y1;
//   return dx * dx + dy * dy;
// }

// /**
//  * Calculates the length of a vector
//  * @param {number} x - X component
//  * @param {number} y - Y component
//  * @returns {number} Vector length
//  */
// export function vectorLength(x, y) {
//   return sqrt(x * x + y * y);
// }

// /**
//  * Calculates the angle between two vectors
//  * @param {number} x1 - First vector X
//  * @param {number} y1 - First vector Y
//  * @param {number} x2 - Second vector X
//  * @param {number} y2 - Second vector Y
//  * @returns {number} Angle in radians
//  */
// export function angleBetween(x1, y1, x2, y2) {
//   const dot = x1 * x2 + y1 * y2;
//   const len1 = vectorLength(x1, y1);
//   const len2 = vectorLength(x2, y2);
  
//   if (len1 === 0 || len2 === 0) return 0;
  
//   const cosAngle = dot / (len1 * len2);
//   return acos(clamp(cosAngle, -1, 1));
// }

// /**
//  * Normalizes a vector (returns unit vector)
//  * @param {number} x - X component
//  * @param {number} y - Y component
//  * @returns {Object} Normalized vector {x, y}
//  */
// export function normalizeVector(x, y) {
//   const length = vectorLength(x, y);
  
//   if (length === 0) {
//     return { x: 0, y: 0 };
//   }
  
//   return { x: x / length, y: y / length };
// }

// /**
//  * Dot product of two vectors
//  * @param {number} x1 - First vector X
//  * @param {number} y1 - First vector Y
//  * @param {number} x2 - Second vector X
//  * @param {number} y2 - Second vector Y
//  * @returns {number} Dot product
//  */
// export function dotProduct(x1, y1, x2, y2) {
//   return x1 * x2 + y1 * y2;
// }

// /**
//  * Cross product of two 2D vectors (returns scalar)
//  * @param {number} x1 - First vector X
//  * @param {number} y1 - First vector Y
//  * @param {number} x2 - Second vector X
//  * @param {number} y2 - Second vector Y
//  * @returns {number} Cross product (Z component)
//  */
// export function crossProduct(x1, y1, x2, y2) {
//   return x1 * y2 - y1 * x2;
// }

// // ============================================================================
// // 8. INTERPOLATION & EASING
// // ============================================================================

// /**
//  * Linear interpolation (lerp) between two values
//  * @param {number} start - Start value
//  * @param {number} end - End value
//  * @param {number} t - Time (0 to 1)
//  * @returns {number} Interpolated value
//  */
// export function lerp(start, end, t) {
//   return start + (end - start) * t;
// }

// /**
//  * Ease in (quadratic)
//  * @param {number} t - Time (0 to 1)
//  * @returns {number} Eased value (0 to 1)
//  */
// export function easeIn(t) {
//   return t * t;
// }

// /**
//  * Ease out (quadratic)
//  * @param {number} t - Time (0 to 1)
//  * @returns {number} Eased value (0 to 1)
//  */
// export function easeOut(t) {
//   return t * (2 - t);
// }

// /**
//  * Ease in-out (quadratic)
//  * @param {number} t - Time (0 to 1)
//  * @returns {number} Eased value (0 to 1)
//  */
// export function easeInOut(t) {
//   return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
// }

// /**
//  * Cubic ease in
//  * @param {number} t - Time (0 to 1)
//  * @returns {number} Eased value (0 to 1)
//  */
// export function easeInCubic(t) {
//   return t * t * t;
// }

// /**
//  * Cubic ease out
//  * @param {number} t - Time (0 to 1)
//  * @returns {number} Eased value (0 to 1)
//  */
// export function easeOutCubic(t) {
//   const t1 = t - 1;
//   return t1 * t1 * t1 + 1;
// }

// /**
//  * Cubic ease in-out
//  * @param {number} t - Time (0 to 1)
//  * @returns {number} Eased value (0 to 1)
//  */
// export function easeInOutCubic(t) {
//   return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * (t - 2)) * (2 * (t - 2)) + 1;
// }

// // ============================================================================
// // 9. REMAP & SCALE
// // ============================================================================

// /**
//  * Remaps a value from one range to another
//  * @param {number} value - Value to remap
//  * @param {number} inMin - Input minimum
//  * @param {number} inMax - Input maximum
//  * @param {number} outMin - Output minimum
//  * @param {number} outMax - Output maximum
//  * @returns {number} Remapped value
//  */
// export function remap(value, inMin, inMax, outMin, outMax) {
//   const t = (value - inMin) / (inMax - inMin);
//   return outMin + t * (outMax - outMin);
// }

// /**
//  * Normalizes a value to 0-1 range
//  * @param {number} value - Value to normalize
//  * @param {number} min - Minimum bound
//  * @param {number} max - Maximum bound
//  * @returns {number} Normalized value (0 to 1)
//  */
// export function normalize(value, min, max) {
//   return (value - min) / (max - min);
// }

// /**
//  * Inverse of normalize - scales a 0-1 value to a range
//  * @param {number} value - Normalized value (0 to 1)
//  * @param {number} min - Minimum bound
//  * @param {number} max - Maximum bound
//  * @returns {number} Scaled value
//  */
// export function denormalize(value, min, max) {
//   return min + value * (max - min);
// }

// // ============================================================================
// // 10. RANDOM NUMBERS
// // ============================================================================

// /**
//  * Returns a random number between 0 and 1
//  * @returns {number} Random value
//  */
// export function random() {
//   return Math.random();
// }

// /**
//  * Returns a random number between min and max
//  * @param {number} min - Minimum value
//  * @param {number} max - Maximum value
//  * @returns {number} Random value between min and max
//  */
// export function randomRange(min, max) {
//   return min + Math.random() * (max - min);
// }

// /**
//  * Returns a random integer between min and max (inclusive)
//  * @param {number} min - Minimum integer
//  * @param {number} max - Maximum integer
//  * @returns {number} Random integer
//  */
// export function randomInt(min, max) {
//   return floor(randomRange(min, max + 1));
// }

// /**
//  * Generates a random color in hex format
//  * @returns {string} Random hex color
//  */
// export function randomColor() {
//   return '#' + floor(random() * 0xffffff).toString(16).padStart(6, '0');
// }

// // ============================================================================
// // 11. CONSTANTS
// // ============================================================================

// export const PI = Math.PI;
// export const TAU = 2 * Math.PI;
// export const E = Math.E;
// export const SQRT2 = Math.sqrt(2);
// export const SQRT3 = Math.sqrt(3);
// export const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
// export const EPSILON = 1e-10; // Small number for comparisons

// // ============================================================================
// // 12. APPROXIMATE COMPARISON
// // ============================================================================

// /**
//  * Checks if two numbers are approximately equal
//  * @param {number} a - First value
//  * @param {number} b - Second value
//  * @param {number} tolerance - Tolerance level
//  * @returns {boolean} True if approximately equal
//  */
// export function approximatelyEqual(a, b, tolerance = EPSILON) {
//   return abs(a - b) < tolerance;
// }

// /**
//  * Checks if a value is approximately zero
//  * @param {number} value - Value to check
//  * @param {number} tolerance - Tolerance level
//  * @returns {boolean} True if approximately zero
//  */
// export function isApproximatelyZero(value, tolerance = EPSILON) {
//   return abs(value) < tolerance;
// }

// // ============================================================================
// // 13. MATRIX OPERATIONS (2D)
// // ============================================================================

// /**
//  * 2x2 Matrix class for 2D transformations
//  */
// export class Matrix2D {
//   constructor(
//     m00 = 1, m01 = 0,
//     m10 = 0, m11 = 1,
//     tx = 0, ty = 0
//   ) {
//     this.m00 = m00; this.m01 = m01;
//     this.m10 = m10; this.m11 = m11;
//     this.tx = tx; this.ty = ty;
//   }

//   /**
//    * Creates identity matrix
//    */
//   static identity() {
//     return new Matrix2D();
//   }

//   /**
//    * Creates translation matrix
//    */
//   static translation(tx, ty) {
//     return new Matrix2D(1, 0, 0, 1, tx, ty);
//   }

//   /**
//    * Creates rotation matrix (angle in radians)
//    */
//   static rotation(angle) {
//     const c = cos(angle);
//     const s = sin(angle);
//     return new Matrix2D(c, -s, s, c, 0, 0);
//   }

//   /**
//    * Creates scale matrix
//    */
//   static scale(sx, sy = sx) {
//     return new Matrix2D(sx, 0, 0, sy, 0, 0);
//   }

//   /**
//    * Transforms a point
//    */
//   transformPoint(x, y) {
//     return {
//       x: this.m00 * x + this.m01 * y + this.tx,
//       y: this.m10 * x + this.m11 * y + this.ty
//     };
//   }

//   /**
//    * Multiplies two matrices
//    */
//   multiply(other) {
//     return new Matrix2D(
//       this.m00 * other.m00 + this.m01 * other.m10,
//       this.m00 * other.m01 + this.m01 * other.m11,
//       this.m10 * other.m00 + this.m11 * other.m10,
//       this.m10 * other.m01 + this.m11 * other.m11,
//       this.m00 * other.tx + this.m01 * other.ty + this.tx,
//       this.m10 * other.tx + this.m11 * other.ty + this.ty
//     );
//   }

//   /**
//    * Calculates determinant
//    */
//   get determinant() {
//     return this.m00 * this.m11 - this.m01 * this.m10;
//   }

//   /**
//    * Inverts the matrix
//    */
//   invert() {
//     const det = this.determinant;
//     if (abs(det) < EPSILON) return null;

//     const inv = 1 / det;
//     return new Matrix2D(
//       this.m11 * inv,
//       -this.m01 * inv,
//       -this.m10 * inv,
//       this.m00 * inv,
//       (this.m01 * this.ty - this.m11 * this.tx) * inv,
//       (this.m10 * this.tx - this.m00 * this.ty) * inv
//     );
//   }
// }

// // ============================================================================
// // DEFAULT EXPORT
// // ============================================================================

// export default {
//   // Basic operations
//   max, min, maxList, minList, clamp,
  
//   // Rounding
//   round, roundToDecimals, ceil, floor, truncate,
  
//   // Power & roots
//   sqrt, nthRoot, pow, square, cube,
  
//   // Trigonometry
//   sin, cos, tan, asin, acos, atan, atan2,
//   degreesToRadians, radiansToDegrees,
  
//   // Logarithm
//   ln, log10, log2, logBase,
  
//   // Absolute & sign
//   abs, sign,
  
//   // Vector math
//   distance, distanceSquared, vectorLength,
//   angleBetween, normalizeVector, dotProduct, crossProduct,
  
//   // Interpolation
//   lerp, easeIn, easeOut, easeInOut,
//   easeInCubic, easeOutCubic, easeInOutCubic,
  
//   // Remap
//   remap, normalize, denormalize,
  
//   // Random
//   random, randomRange, randomInt, randomColor,
  
//   // Constants
//   PI, TAU, E, SQRT2, SQRT3, PHI, EPSILON,
  
//   // Comparison
//   approximatelyEqual, isApproximatelyZero,
  
//   // Matrix
//   Matrix2D
// };