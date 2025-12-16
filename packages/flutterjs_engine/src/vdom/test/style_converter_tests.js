/**
 * StyleConverter Tests - Comprehensive Flutter to CSS Conversion Testing
 * Tests all style conversion methods
 */

import { StyleConverter } from '../src/vnode/style-converter.js';

console.log('\n' + '='.repeat(80));
console.log('🧪 STYLE CONVERTER TESTS');
console.log('='.repeat(80) + '\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected "${expected}", got "${actual}"`
    );
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack || !haystack.includes(needle)) {
    throw new Error(
      message || `Expected "${haystack}" to include "${needle}"`
    );
  }
}

// ============================================================================
// TEST SUITE 1: Color Conversion
// ============================================================================

console.log('TEST SUITE 1: Color Conversion\n');

test('Convert null color', () => {
  const result = StyleConverter.colorToCss(null);
  assertEquals(result, null, 'Should return null');
});

test('Convert CSS string color', () => {
  const result = StyleConverter.colorToCss('#ff0000');
  assertEquals(result, '#ff0000', 'Should pass through CSS string');
});

test('Convert numeric color (opaque)', () => {
  // 0xFFFF0000 = Red with full opacity
  const result = StyleConverter.colorToCss(0xFFFF0000);
  assertEquals(result, '#ff0000', 'Should convert to hex');
});

test('Convert numeric color (transparent)', () => {
  // 0x80FF0000 = Red with 50% opacity
  const result = StyleConverter.colorToCss(0x80FF0000);
  assertIncludes(result, 'rgba', 'Should use rgba for transparency');
  assertIncludes(result, '255, 0, 0', 'Should have red values');
  assertIncludes(result, '0.50', 'Should have alpha');
});

test('Convert color object with value', () => {
  const color = { value: 0xFF00FF00 }; // Green
  const result = StyleConverter.colorToCss(color);
  assertEquals(result, '#00ff00', 'Should convert to hex');
});

test('Convert color object with RGB', () => {
  const color = { r: 255, g: 0, b: 255 }; // Magenta
  const result = StyleConverter.colorToCss(color);
  assertEquals(result, 'rgb(255, 0, 255)', 'Should convert to rgb');
});

test('Convert color object with RGBA', () => {
  const color = { r: 100, g: 150, b: 200, a: 0.5 };
  const result = StyleConverter.colorToCss(color);
  assertIncludes(result, 'rgba', 'Should use rgba');
  assertIncludes(result, '100, 150, 200', 'Should have RGB values');
  assertIncludes(result, '0.5', 'Should have alpha');
});

console.log('');

// ============================================================================
// TEST SUITE 2: Text Style Conversion
// ============================================================================

console.log('TEST SUITE 2: Text Style Conversion\n');

test('Convert empty TextStyle', () => {
  const result = StyleConverter.textStyleToCss({});
  assert(typeof result === 'object', 'Should return object');
});

test('Convert TextStyle with fontSize', () => {
  const style = { fontSize: 18 };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.fontSize, '18px', 'Should convert to px');
});

test('Convert TextStyle with color', () => {
  const style = { color: 0xFF0000FF }; // Blue
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.color, '#0000ff', 'Should convert color');
});

test('Convert TextStyle with fontWeight number', () => {
  const style = { fontWeight: 700 };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.fontWeight, '700', 'Should convert weight');
});

test('Convert TextStyle with fontWeight string', () => {
  const style = { fontWeight: 'bold' };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.fontWeight, '700', 'Should map bold to 700');
});

test('Convert TextStyle with fontWeight w500', () => {
  const style = { fontWeight: 'w500' };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.fontWeight, '500', 'Should map w500 to 500');
});

test('Convert TextStyle with fontFamily', () => {
  const style = { fontFamily: 'Roboto' };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.fontFamily, 'Roboto', 'Should set font family');
});

test('Convert TextStyle with italic', () => {
  const style = { fontStyle: 'italic' };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.fontStyle, 'italic', 'Should set italic');
});

test('Convert TextStyle with letterSpacing', () => {
  const style = { letterSpacing: 2 };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.letterSpacing, '2px', 'Should set letter spacing');
});

test('Convert TextStyle with decoration underline', () => {
  const style = { decoration: 'underline' };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.textDecoration, 'underline', 'Should set underline');
});

test('Convert TextStyle with decoration object', () => {
  const style = { decoration: { underline: true, lineThrough: true } };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.textDecoration, 'underline line-through', 'Should combine decorations');
});

test('Convert TextStyle with overflow ellipsis', () => {
  const style = { overflow: 'ellipsis' };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.textOverflow, 'ellipsis', 'Should set ellipsis');
  assertEquals(result.overflow, 'hidden', 'Should hide overflow');
  assertEquals(result.whiteSpace, 'nowrap', 'Should prevent wrap');
});

console.log('');

// ============================================================================
// TEST SUITE 3: EdgeInsets Conversion
// ============================================================================

console.log('TEST SUITE 3: EdgeInsets Conversion\n');

test('Convert EdgeInsets.all', () => {
  const insets = { all: 16 };
  const result = StyleConverter.edgeInsetsToCss(insets);
  assertEquals(result, '16px', 'Should use single value');
});

test('Convert EdgeInsets.symmetric', () => {
  const insets = { vertical: 10, horizontal: 20 };
  const result = StyleConverter.edgeInsetsToCss(insets);
  assertEquals(result, '10px 20px', 'Should use two values');
});

test('Convert EdgeInsets.only (all different)', () => {
  const insets = { top: 5, right: 10, bottom: 15, left: 20 };
  const result = StyleConverter.edgeInsetsToCss(insets);
  assertEquals(result, '5px 10px 15px 20px', 'Should use four values');
});

test('Convert EdgeInsets.only (vertical same)', () => {
  const insets = { top: 10, right: 20, bottom: 10, left: 20 };
  const result = StyleConverter.edgeInsetsToCss(insets);
  assertEquals(result, '10px 20px', 'Should optimize to two values');
});

test('Convert EdgeInsets to padding', () => {
  const insets = { all: 12 };
  const result = StyleConverter.paddingToCss(insets);
  assertEquals(result.padding, '12px', 'Should create padding property');
});

test('Convert EdgeInsets to margin', () => {
  const insets = { all: 8 };
  const result = StyleConverter.marginToCss(insets);
  assertEquals(result.margin, '8px', 'Should create margin property');
});

test('Convert null EdgeInsets', () => {
  const result = StyleConverter.paddingToCss(null);
  assert(Object.keys(result).length === 0, 'Should return empty object');
});

console.log('');

// ============================================================================
// TEST SUITE 4: BoxDecoration Conversion
// ============================================================================

console.log('TEST SUITE 4: BoxDecoration Conversion\n');

test('Convert BoxDecoration with color', () => {
  const decoration = { color: 0xFFFFFFFF }; // White
  const result = StyleConverter.decorationToCss(decoration);
  assertEquals(result.backgroundColor, '#ffffff', 'Should set background color');
});

test('Convert BoxDecoration with border', () => {
  const decoration = {
    border: {
      all: { width: 2, color: 0xFF000000, style: 'solid' }
    }
  };
  const result = StyleConverter.decorationToCss(decoration);
  assertIncludes(result.border, '2px', 'Should have width');
  assertIncludes(result.border, 'solid', 'Should have style');
  assertIncludes(result.border, '#000000', 'Should have color');
});

test('Convert BoxDecoration with borderRadius', () => {
  const decoration = { borderRadius: { circular: 8 } };
  const result = StyleConverter.decorationToCss(decoration);
  assertEquals(result.borderRadius, '8px', 'Should set border radius');
});

test('Convert BoxDecoration with boxShadow', () => {
  const decoration = {
    boxShadow: [{
      offset: { dx: 2, dy: 2 },
      blurRadius: 4,
      spreadRadius: 1,
      color: 0x33000000
    }]
  };
  const result = StyleConverter.decorationToCss(decoration);
  assertIncludes(result.boxShadow, '2px 2px', 'Should have offset');
  assertIncludes(result.boxShadow, '4px', 'Should have blur');
  assertIncludes(result.boxShadow, '1px', 'Should have spread');
});

test('Convert BoxDecoration with shape circle', () => {
  const decoration = { shape: 'circle' };
  const result = StyleConverter.decorationToCss(decoration);
  assertEquals(result.borderRadius, '50%', 'Should be circular');
});

test('Convert BoxDecoration with gradient', () => {
  const decoration = {
    gradient: {
      type: 'linear',
      colors: [0xFFFF0000, 0xFF0000FF],
      begin: 'topCenter',
      end: 'bottomCenter'
    }
  };
  const result = StyleConverter.decorationToCss(decoration);
  assertIncludes(result.background, 'linear-gradient', 'Should create gradient');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Border Conversion
// ============================================================================

console.log('TEST SUITE 5: Border Conversion\n');

test('Convert Border.all', () => {
  const border = {
    all: { width: 1, color: 0xFFCCCCCC, style: 'solid' }
  };
  const result = StyleConverter.borderToCss(border);
  assertEquals(result.border, '1px solid #cccccc', 'Should create border');
});

test('Convert individual borders', () => {
  const border = {
    top: { width: 2, color: 0xFF000000, style: 'solid' },
    bottom: { width: 2, color: 0xFF000000, style: 'solid' }
  };
  const result = StyleConverter.borderToCss(border);
  assert(result.borderTop !== undefined, 'Should have top border');
  assert(result.borderBottom !== undefined, 'Should have bottom border');
});

test('Convert BorderRadius.circular', () => {
  const radius = { circular: 12 };
  const result = StyleConverter.borderRadiusToCss(radius);
  assertEquals(result, '12px', 'Should convert circular radius');
});

test('Convert BorderRadius.only', () => {
  const radius = {
    topLeft: 4,
    topRight: 8,
    bottomRight: 12,
    bottomLeft: 16
  };
  const result = StyleConverter.borderRadiusToCss(radius);
  assertEquals(result, '4px 8px 12px 16px', 'Should convert individual radii');
});

test('Convert BorderRadius with all same', () => {
  const radius = {
    topLeft: 10,
    topRight: 10,
    bottomRight: 10,
    bottomLeft: 10
  };
  const result = StyleConverter.borderRadiusToCss(radius);
  assertEquals(result, '10px', 'Should optimize to single value');
});

console.log('');

// ============================================================================
// TEST SUITE 6: BoxShadow Conversion
// ============================================================================

console.log('TEST SUITE 6: BoxShadow Conversion\n');

test('Convert single BoxShadow', () => {
  const shadow = {
    offset: { dx: 1, dy: 2 },
    blurRadius: 3,
    spreadRadius: 0,
    color: 0x33000000
  };
  const result = StyleConverter.boxShadowToCss(shadow);
  assertIncludes(result, '1px 2px 3px 0px', 'Should have all values');
});

test('Convert multiple BoxShadows', () => {
  const shadows = [
    { offset: { dx: 0, dy: 1 }, blurRadius: 2, spreadRadius: 0, color: 0x11000000 },
    { offset: { dx: 0, dy: 2 }, blurRadius: 4, spreadRadius: 0, color: 0x22000000 }
  ];
  const result = StyleConverter.boxShadowToCss(shadows);
  assertIncludes(result, ',', 'Should comma-separate shadows');
  assertIncludes(result, '0px 1px', 'Should have first shadow');
  assertIncludes(result, '0px 2px', 'Should have second shadow');
});

test('Convert BoxShadow with default color', () => {
  const shadow = { offset: { dx: 0, dy: 0 }, blurRadius: 5 };
  const result = StyleConverter.boxShadowToCss(shadow);
  assertIncludes(result, 'rgba', 'Should have default color');
});

console.log('');

// ============================================================================
// TEST SUITE 7: Gradient Conversion
// ============================================================================

console.log('TEST SUITE 7: Gradient Conversion\n');

test('Convert LinearGradient', () => {
  const gradient = {
    type: 'linear',
    colors: [0xFFFF0000, 0xFF0000FF],
    stops: [0, 1],
    begin: 'topCenter',
    end: 'bottomCenter'
  };
  const result = StyleConverter.gradientToCss(gradient);
  assertIncludes(result, 'linear-gradient', 'Should be linear gradient');
  assertIncludes(result, '#ff0000', 'Should have red');
  assertIncludes(result, '#0000ff', 'Should have blue');
});

test('Convert LinearGradient with stops', () => {
  const gradient = {
    type: 'linear',
    colors: [0xFFFF0000, 0xFFFFFF00, 0xFF0000FF],
    stops: [0, 0.5, 1]
  };
  const result = StyleConverter.gradientToCss(gradient);
  assertIncludes(result, '0%', 'Should have start stop');
  assertIncludes(result, '50%', 'Should have middle stop');
  assertIncludes(result, '100%', 'Should have end stop');
});

test('Convert RadialGradient', () => {
  const gradient = {
    type: 'radial',
    colors: [0xFFFFFFFF, 0xFF000000]
  };
  const result = StyleConverter.gradientToCss(gradient);
  assertIncludes(result, 'radial-gradient', 'Should be radial gradient');
  assertIncludes(result, 'circle', 'Should specify circle');
});

test('Convert gradient angle mapping', () => {
  const angle1 = StyleConverter.getGradientAngle('topLeft', 'bottomRight');
  assertEquals(angle1, 135, 'Should map diagonal');
  
  const angle2 = StyleConverter.getGradientAngle('centerLeft', 'centerRight');
  assertEquals(angle2, 90, 'Should map horizontal');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Alignment Conversion
// ============================================================================

console.log('TEST SUITE 8: Alignment Conversion\n');

test('Convert Alignment.center', () => {
  const result = StyleConverter.alignmentToCss('center');
  assertEquals(result.display, 'flex', 'Should use flexbox');
  assertEquals(result.justifyContent, 'center', 'Should center horizontally');
  assertEquals(result.alignItems, 'center', 'Should center vertically');
});

test('Convert Alignment.topLeft', () => {
  const result = StyleConverter.alignmentToCss('topLeft');
  assertEquals(result.justifyContent, 'flex-start', 'Should align left');
  assertEquals(result.alignItems, 'flex-start', 'Should align top');
});

test('Convert Alignment.bottomRight', () => {
  const result = StyleConverter.alignmentToCss('bottomRight');
  assertEquals(result.justifyContent, 'flex-end', 'Should align right');
  assertEquals(result.alignItems, 'flex-end', 'Should align bottom');
});

test('Convert Alignment with x, y values', () => {
  const alignment = { x: -1, y: 1 };
  const result = StyleConverter.alignmentToCss(alignment);
  assertEquals(result.justifyContent, 'flex-start', 'Should map x to justify');
  assertEquals(result.alignItems, 'flex-end', 'Should map y to align');
});

test('Convert MainAxisAlignment', () => {
  assertEquals(StyleConverter.mainAxisAlignmentToCss('start'), 'flex-start');
  assertEquals(StyleConverter.mainAxisAlignmentToCss('center'), 'center');
  assertEquals(StyleConverter.mainAxisAlignmentToCss('spaceBetween'), 'space-between');
  assertEquals(StyleConverter.mainAxisAlignmentToCss('spaceEvenly'), 'space-evenly');
});

test('Convert CrossAxisAlignment', () => {
  assertEquals(StyleConverter.crossAxisAlignmentToCss('start'), 'flex-start');
  assertEquals(StyleConverter.crossAxisAlignmentToCss('center'), 'center');
  assertEquals(StyleConverter.crossAxisAlignmentToCss('stretch'), 'stretch');
  assertEquals(StyleConverter.crossAxisAlignmentToCss('baseline'), 'baseline');
});

console.log('');

// ============================================================================
// TEST SUITE 9: BoxConstraints Conversion
// ============================================================================

console.log('TEST SUITE 9: BoxConstraints Conversion\n');

test('Convert BoxConstraints with min/max width', () => {
  const constraints = { minWidth: 100, maxWidth: 500 };
  const result = StyleConverter.constraintsToCss(constraints);
  assertEquals(result.minWidth, '100px', 'Should set min width');
  assertEquals(result.maxWidth, '500px', 'Should set max width');
});

test('Convert BoxConstraints with min/max height', () => {
  const constraints = { minHeight: 50, maxHeight: 300 };
  const result = StyleConverter.constraintsToCss(constraints);
  assertEquals(result.minHeight, '50px', 'Should set min height');
  assertEquals(result.maxHeight, '300px', 'Should set max height');
});

test('Convert BoxConstraints with Infinity', () => {
  const constraints = { maxWidth: Infinity };
  const result = StyleConverter.constraintsToCss(constraints);
  assert(result.maxWidth === undefined, 'Should ignore Infinity');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Transform Conversion
// ============================================================================

console.log('TEST SUITE 10: Transform Conversion\n');

test('Convert rotation transform', () => {
  const transform = { rotateZ: 0.5 };
  const result = StyleConverter.transformToCss(transform);
  assertIncludes(result.transform, 'rotate', 'Should use rotate');
  assertIncludes(result.transform, '0.5rad', 'Should preserve radians');
});

test('Convert scale transform', () => {
  const transform = { scale: 1.5 };
  const result = StyleConverter.transformToCss(transform);
  assertEquals(result.transform, 'scale(1.5)', 'Should scale');
});

test('Convert translate transform', () => {
  const transform = { translateX: 10, translateY: 20 };
  const result = StyleConverter.transformToCss(transform);
  assertEquals(result.transform, 'translate(10px, 20px)', 'Should translate');
});

console.log('');

// ============================================================================
// TEST SUITE 11: Material Elevation
// ============================================================================

console.log('TEST SUITE 11: Material Elevation\n');

test('Convert elevation 0', () => {
  const result = StyleConverter.elevationToBoxShadow(0);
  assertEquals(result, 'none', 'Should have no shadow');
});

test('Convert elevation 1', () => {
  const result = StyleConverter.elevationToBoxShadow(1);
  assertIncludes(result, 'rgba', 'Should have shadow');
  assertIncludes(result, '1px', 'Should have offset');
});

test('Convert elevation 3', () => {
  const result = StyleConverter.elevationToBoxShadow(3);
  assertIncludes(result, ',', 'Should have multiple shadows');
});

test('Convert high elevation', () => {
  const result = StyleConverter.elevationToBoxShadow(10);
  assertIncludes(result, '10px', 'Should scale with elevation');
});

console.log('');

// ============================================================================
// TEST SUITE 12: Clip Behavior
// ============================================================================

console.log('TEST SUITE 12: Clip Behavior\n');

test('Convert Clip.none', () => {
  const result = StyleConverter.clipToCss('none');
  assertEquals(result.overflow, 'visible', 'Should be visible');
});

test('Convert Clip.hardEdge', () => {
  const result = StyleConverter.clipToCss('hardEdge');
  assertEquals(result.overflow, 'hidden', 'Should be hidden');
});

test('Convert Clip.antiAlias', () => {
  const result = StyleConverter.clipToCss('antiAlias');
  assertEquals(result.overflow, 'hidden', 'Should be hidden');
});

console.log('');

// ============================================================================
// TEST SUITE 13: Edge Cases
// ============================================================================

console.log('TEST SUITE 13: Edge Cases\n');

test('Handle undefined/null inputs', () => {
  assert(StyleConverter.colorToCss(undefined) === null);
  assert(Object.keys(StyleConverter.textStyleToCss(null)).length === 0);
  assert(StyleConverter.edgeInsetsToCss(null) === null);
  assert(Object.keys(StyleConverter.decorationToCss(null)).length === 0);
});

test('Handle empty objects', () => {
  const result1 = StyleConverter.textStyleToCss({});
  assert(typeof result1 === 'object', 'Should return object');
  
  const result2 = StyleConverter.decorationToCss({});
  assert(typeof result2 === 'object', 'Should return object');
});

test('Handle string font size', () => {
  const style = { fontSize: '2em' };
  const result = StyleConverter.textStyleToCss(style);
  assertEquals(result.fontSize, '2em', 'Should preserve string');
});

test('Handle numeric borderRadius', () => {
  const result = StyleConverter.borderRadiusToCss(8);
  assertEquals(result, '8px', 'Should convert number');
});

console.log('');

// ============================================================================
// TEST SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log('='.repeat(80) + '\n');

if (testsFailed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed.\n');
  process.exit(1);
}