/**
 * VNodeBuilder Tests - Comprehensive Widget to VNode Conversion Testing
 * Tests all Flutter widget types and their conversion to VNode trees
 */

import { VNodeBuilder } from '../src/vnode/vnode-builder.js';
import { VNode } from '../src/vnode/vnode.js';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

console.log('\n' + '='.repeat(80));
console.log('🧪 VNODE BUILDER TESTS');
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
    if (error.stack) {
      console.log(`  ${error.stack.split('\n')[1]}`);
    }
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
      message || `Expected ${expected}, got ${actual}`
    );
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack || !haystack.includes(needle)) {
    throw new Error(
      message || `Expected to include "${needle}"`
    );
  }
}

function assertInstanceOf(obj, type, message) {
  if (!(obj instanceof type)) {
    throw new Error(
      message || `Expected instance of ${type.name}`
    );
  }
}

// ============================================================================
// MOCK FLUTTER WIDGETS
// ============================================================================

class Text {
  constructor({ data, style }) {
    this.data = data;
    this.style = style || {};
  }
}

class Container {
  constructor({ child, padding, margin, color, width, height, decoration, alignment }) {
    this.child = child;
    this.padding = padding;
    this.margin = margin;
    this.color = color;
    this.width = width;
    this.height = height;
    this.decoration = decoration;
    this.alignment = alignment;
  }
}

class Column {
  constructor({ children, mainAxisAlignment, crossAxisAlignment, mainAxisSize }) {
    this.children = children || [];
    this.mainAxisAlignment = mainAxisAlignment || 'start';
    this.crossAxisAlignment = crossAxisAlignment || 'center';
    this.mainAxisSize = mainAxisSize || 'max';
  }
}

class Row {
  constructor({ children, mainAxisAlignment, crossAxisAlignment, mainAxisSize }) {
    this.children = children || [];
    this.mainAxisAlignment = mainAxisAlignment || 'start';
    this.crossAxisAlignment = crossAxisAlignment || 'center';
    this.mainAxisSize = mainAxisSize || 'max';
  }
}

class Center {
  constructor({ child }) {
    this.child = child;
  }
}

class Padding {
  constructor({ padding, child }) {
    this.padding = padding;
    this.child = child;
  }
}

class SizedBox {
  constructor({ width, height, child }) {
    this.width = width;
    this.height = height;
    this.child = child;
  }
}

class Scaffold {
  constructor({ appBar, body, floatingActionButton, drawer, backgroundColor }) {
    this.appBar = appBar;
    this.body = body;
    this.floatingActionButton = floatingActionButton;
    this.drawer = drawer;
    this.backgroundColor = backgroundColor;
  }
}

class AppBar {
  constructor({ title, leading, actions, backgroundColor }) {
    this.title = title;
    this.leading = leading;
    this.actions = actions;
    this.backgroundColor = backgroundColor;
  }
}

class ElevatedButton {
  constructor({ child, onPressed }) {
    this.child = child;
    this.onPressed = onPressed;
  }
}

class TextButton {
  constructor({ child, onPressed }) {
    this.child = child;
    this.onPressed = onPressed;
  }
}

class TextField {
  constructor({ controller, decoration, onChanged, obscureText }) {
    this.controller = controller;
    this.decoration = decoration || {};
    this.onChanged = onChanged;
    this.obscureText = obscureText;
  }
}

class Checkbox {
  constructor({ value, onChanged }) {
    this.value = value;
    this.onChanged = onChanged;
  }
}

class ListView {
  constructor({ children }) {
    this.children = children || [];
  }
}

class Card {
  constructor({ child, elevation, color }) {
    this.child = child;
    this.elevation = elevation;
    this.color = color;
  }
}

class Icon {
  constructor({ icon, size, color }) {
    this.icon = icon;
    this.size = size;
    this.color = color;
  }
}

class Image {
  constructor({ src, width, height, fit }) {
    this.src = src;
    this.width = width;
    this.height = height;
    this.fit = fit;
  }
}

class FloatingActionButton {
  constructor({ child, onPressed, backgroundColor }) {
    this.child = child;
    this.onPressed = onPressed;
    this.backgroundColor = backgroundColor;
  }
}

class MaterialApp {
  constructor({ home, title }) {
    this.home = home;
    this.title = title;
  }
}

class ListTile {
  constructor({ leading, title, subtitle, trailing, onTap }) {
    this.leading = leading;
    this.title = title;
    this.subtitle = subtitle;
    this.trailing = trailing;
    this.onTap = onTap;
  }
}

// ============================================================================
// TEST SUITE 1: Basic Widget Conversion
// ============================================================================

console.log('TEST SUITE 1: Basic Widget Conversion\n');

test('Convert null widget', () => {
  const vnode = VNodeBuilder.build(null);
  assertEquals(vnode, null, 'Should return null');
});

test('Convert string directly', () => {
  const vnode = VNodeBuilder.build('Hello World');
  assertEquals(vnode, 'Hello World', 'Should return string');
});

test('Convert number to string', () => {
  const vnode = VNodeBuilder.build(42);
  assertEquals(vnode, '42', 'Should convert to string');
});

test('Get widget type from constructor', () => {
  const widget = new Text({ data: 'Test' });
  const type = VNodeBuilder.getWidgetType(widget);
  assertEquals(type, 'Text', 'Should get Text');
});

console.log('');

// ============================================================================
// TEST SUITE 2: Text Widgets
// ============================================================================

console.log('TEST SUITE 2: Text Widgets\n');

test('Build Text widget', () => {
  const widget = new Text({ data: 'Hello World' });
  const vnode = VNodeBuilder.build(widget);
  
  assertInstanceOf(vnode, VNode, 'Should return VNode');
  assertEquals(vnode.tag, 'span', 'Should use span tag');
  assertEquals(vnode.children[0], 'Hello World', 'Should have text content');
  assertEquals(vnode.metadata.widgetType, 'Text', 'Should store widget type');
});

test('Build Text with style', () => {
  const widget = new Text({
    data: 'Styled Text',
    style: { fontSize: 18, color: '#ff0000' }
  });
  const vnode = VNodeBuilder.build(widget);
  
  assert(vnode.style !== undefined, 'Should have styles');
  assertEquals(vnode.metadata.widgetType, 'Text', 'Should be Text widget');
});

test('Build Text with empty data', () => {
  const widget = new Text({ data: '' });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.children[0], '', 'Should have empty string');
});

console.log('');

// ============================================================================
// TEST SUITE 3: Layout Widgets
// ============================================================================

console.log('TEST SUITE 3: Layout Widgets\n');

test('Build Container widget', () => {
  const widget = new Container({
    child: new Text({ data: 'Content' }),
    padding: { all: 16 },
    color: '#ffffff'
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should use div tag');
  assertIncludes(vnode.props.className, 'fjs-container', 'Should have container class');
  assertEquals(vnode.children.length, 1, 'Should have child');
  assertEquals(vnode.metadata.widgetType, 'Container', 'Should be Container');
});

test('Build Container with dimensions', () => {
  const widget = new Container({
    width: 200,
    height: 100,
    child: new Text({ data: 'Box' })
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.style.width, '200px', 'Should set width');
  assertEquals(vnode.style.height, '100px', 'Should set height');
});

test('Build Column widget', () => {
  const widget = new Column({
    children: [
      new Text({ data: 'Item 1' }),
      new Text({ data: 'Item 2' }),
      new Text({ data: 'Item 3' })
    ],
    mainAxisAlignment: 'center'
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should use div');
  assertEquals(vnode.style.display, 'flex', 'Should use flexbox');
  assertEquals(vnode.style.flexDirection, 'column', 'Should be column');
  assertEquals(vnode.children.length, 3, 'Should have 3 children');
  assertEquals(vnode.metadata.widgetType, 'Column', 'Should be Column');
});

test('Build Row widget', () => {
  const widget = new Row({
    children: [
      new Text({ data: 'A' }),
      new Text({ data: 'B' })
    ],
    mainAxisAlignment: 'spaceEvenly'
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.style.flexDirection, 'row', 'Should be row');
  assertEquals(vnode.children.length, 2, 'Should have 2 children');
});

test('Build Center widget', () => {
  const widget = new Center({
    child: new Text({ data: 'Centered' })
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.style.display, 'flex', 'Should use flex');
  assertEquals(vnode.style.justifyContent, 'center', 'Should center horizontally');
  assertEquals(vnode.style.alignItems, 'center', 'Should center vertically');
});

test('Build Padding widget', () => {
  const widget = new Padding({
    padding: { all: 20 },
    child: new Text({ data: 'Padded' })
  });
  const vnode = VNodeBuilder.build(widget);
  
  assert(vnode.style.padding !== undefined, 'Should have padding');
  assertEquals(vnode.children.length, 1, 'Should have child');
});

test('Build SizedBox widget', () => {
  const widget = new SizedBox({
    width: 150,
    height: 150,
    child: new Text({ data: 'Fixed size' })
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.style.width, '150px', 'Should set width');
  assertEquals(vnode.style.height, '150px', 'Should set height');
});

console.log('');

// ============================================================================
// TEST SUITE 4: Scaffold & Structure
// ============================================================================

console.log('TEST SUITE 4: Scaffold & Structure\n');

test('Build Scaffold widget', () => {
  const widget = new Scaffold({
    appBar: new AppBar({ title: new Text({ data: 'Title' }) }),
    body: new Text({ data: 'Body content' })
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should use div');
  assertEquals(vnode.style.minHeight, '100vh', 'Should fill viewport');
  assertEquals(vnode.style.display, 'flex', 'Should use flex');
  assert(vnode.children.length >= 2, 'Should have appBar and body');
});

test('Build AppBar widget', () => {
  const widget = new AppBar({
    title: new Text({ data: 'My App' }),
    backgroundColor: '#6750a4'
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'header', 'Should use header tag');
  assertIncludes(vnode.props.className, 'fjs-app-bar', 'Should have app-bar class');
  assert(vnode.children.length > 0, 'Should have children');
});

test('Build FloatingActionButton', () => {
  let clicked = false;
  const widget = new FloatingActionButton({
    child: new Icon({ icon: 'add' }),
    onPressed: () => { clicked = true; }
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'button', 'Should use button tag');
  assertEquals(vnode.style.position, 'fixed', 'Should be fixed');
  assertEquals(vnode.style.borderRadius, '50%', 'Should be circular');
  assert(vnode.events.click !== undefined, 'Should have click event');
  
  // Test event
  vnode.events.click();
  assert(clicked === true, 'Should call onPressed');
});

console.log('');

// ============================================================================
// TEST SUITE 5: Button Widgets
// ============================================================================

console.log('TEST SUITE 5: Button Widgets\n');

test('Build ElevatedButton', () => {
  let pressed = false;
  const widget = new ElevatedButton({
    child: new Text({ data: 'Click Me' }),
    onPressed: () => { pressed = true; }
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'button', 'Should use button tag');
  assertIncludes(vnode.props.className, 'elevated-button', 'Should have class');
  assert(vnode.events.click !== undefined, 'Should have click handler');
  
  vnode.events.click();
  assert(pressed === true, 'Should call handler');
});

test('Build TextButton', () => {
  const widget = new TextButton({
    child: new Text({ data: 'Text Button' }),
    onPressed: () => {}
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'button', 'Should use button tag');
  assertEquals(vnode.style.backgroundColor, 'transparent', 'Should be transparent');
});

test('Build disabled button', () => {
  const widget = new ElevatedButton({
    child: new Text({ data: 'Disabled' }),
    onPressed: null
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.props.disabled, true, 'Should be disabled');
});

console.log('');

// ============================================================================
// TEST SUITE 6: Input Widgets
// ============================================================================

console.log('TEST SUITE 6: Input Widgets\n');

test('Build TextField', () => {
  const widget = new TextField({
    decoration: { hintText: 'Enter text' },
    onChanged: (value) => console.log(value)
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'input', 'Should use input tag');
  assertEquals(vnode.props.placeholder, 'Enter text', 'Should have placeholder');
  assert(vnode.events.input !== undefined, 'Should have input event');
});

test('Build TextField with obscureText', () => {
  const widget = new TextField({
    obscureText: true
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.props.type, 'password', 'Should be password type');
});

test('Build Checkbox', () => {
  let newValue = false;
  const widget = new Checkbox({
    value: true,
    onChanged: (val) => { newValue = val; }
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'input', 'Should use input');
  assertEquals(vnode.props.type, 'checkbox', 'Should be checkbox');
  assertEquals(vnode.props.checked, true, 'Should be checked');
  assert(vnode.events.change !== undefined, 'Should have change event');
});

console.log('');

// ============================================================================
// TEST SUITE 7: List Widgets
// ============================================================================

console.log('TEST SUITE 7: List Widgets\n');

test('Build ListView', () => {
  const widget = new ListView({
    children: [
      new Text({ data: 'Item 1' }),
      new Text({ data: 'Item 2' }),
      new Text({ data: 'Item 3' })
    ]
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should use div');
  assertEquals(vnode.style.overflowY, 'auto', 'Should scroll');
  assertEquals(vnode.children.length, 3, 'Should have 3 items');
});

test('Build ListTile', () => {
  const widget = new ListTile({
    leading: new Icon({ icon: 'person' }),
    title: new Text({ data: 'Title' }),
    subtitle: new Text({ data: 'Subtitle' }),
    trailing: new Icon({ icon: 'chevron_right' }),
    onTap: () => {}
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should use div');
  assertEquals(vnode.style.display, 'flex', 'Should use flex');
  assert(vnode.children.length >= 3, 'Should have leading, content, trailing');
  assert(vnode.events.click !== undefined, 'Should have click event');
});

console.log('');

// ============================================================================
// TEST SUITE 8: Visual Widgets
// ============================================================================

console.log('TEST SUITE 8: Visual Widgets\n');

test('Build Card', () => {
  const widget = new Card({
    child: new Text({ data: 'Card content' }),
    elevation: 4
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should use div');
  assertEquals(vnode.style.borderRadius, '12px', 'Should have rounded corners');
  assert(vnode.style.boxShadow !== undefined, 'Should have shadow');
});

test('Build Icon', () => {
  const widget = new Icon({
    icon: 'home',
    size: 32,
    color: '#000000'
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'span', 'Should use span');
  assertEquals(vnode.style.width, '32px', 'Should set width');
  assertEquals(vnode.style.height, '32px', 'Should set height');
});

test('Build Image', () => {
  const widget = new Image({
    src: 'https://example.com/image.jpg',
    width: 300,
    height: 200,
    fit: 'cover'
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'img', 'Should use img tag');
  assertEquals(vnode.props.src, 'https://example.com/image.jpg', 'Should set src');
  assertEquals(vnode.style.width, '300px', 'Should set width');
  assertEquals(vnode.style.objectFit, 'cover', 'Should set object-fit');
});

console.log('');

// ============================================================================
// TEST SUITE 9: Complex Nested Structures
// ============================================================================

console.log('TEST SUITE 9: Complex Nested Structures\n');

test('Build nested widget tree', () => {
  const widget = new Container({
    child: new Column({
      children: [
        new Text({ data: 'Title' }),
        new Row({
          children: [
            new Text({ data: 'A' }),
            new Text({ data: 'B' })
          ]
        })
      ]
    })
  });
  
  const vnode = VNodeBuilder.build(widget);
  
  assert(vnode !== null, 'Should build tree');
  assertEquals(vnode.tag, 'div', 'Root should be div');
  assertEquals(vnode.children.length, 1, 'Should have Column child');
  
  const column = vnode.children[0];
  assertEquals(column.children.length, 2, 'Column should have 2 children');
});

test('Build complete Counter app structure', () => {
  const widget = new Scaffold({
    appBar: new AppBar({
      title: new Text({ data: 'Counter App' })
    }),
    body: new Center({
      child: new Column({
        children: [
          new Text({ data: 'Count:' }),
          new Text({ data: '0' })
        ]
      })
    }),
    floatingActionButton: new FloatingActionButton({
      child: new Icon({ icon: 'add' }),
      onPressed: () => {}
    })
  });
  
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should be div');
  assert(vnode.children.length >= 3, 'Should have appBar, body, and FAB');
});

test('Build list of items', () => {
  const items = ['Apple', 'Banana', 'Cherry'];
  const widget = new ListView({
    children: items.map(item => new ListTile({
      title: new Text({ data: item })
    }))
  });
  
  const vnode = VNodeBuilder.build(widget);
  assertEquals(vnode.children.length, 3, 'Should have 3 list items');
});

console.log('');

// ============================================================================
// TEST SUITE 10: Edge Cases
// ============================================================================

console.log('TEST SUITE 10: Edge Cases\n');

test('Build widget with no children', () => {
  const widget = new Container({});
  const vnode = VNodeBuilder.build(widget);
  
  assert(vnode !== null, 'Should build');
  assertEquals(vnode.children.length, 0, 'Should have no children');
});

test('Build Column with empty children array', () => {
  const widget = new Column({ children: [] });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.children.length, 0, 'Should have empty children');
});

test('Build widget with null child', () => {
  const widget = new Container({ child: null });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.children.length, 0, 'Should filter null child');
});

test('Build Column with mixed null/valid children', () => {
  const widget = new Column({
    children: [
      new Text({ data: 'Valid' }),
      null,
      new Text({ data: 'Also valid' }),
      undefined
    ]
  });
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.children.length, 2, 'Should filter nulls');
});

test('Extract common props with key', () => {
  const widget = new Text({ data: 'Test' });
  widget.key = 'text-key';
  
  const vnode = VNodeBuilder.build(widget);
  assertEquals(vnode.props.key, 'text-key', 'Should extract key');
});

console.log('');

// ============================================================================
// TEST SUITE 11: MaterialApp & Navigation
// ============================================================================

console.log('TEST SUITE 11: MaterialApp & Navigation\n');

test('Build MaterialApp', () => {
  const widget = new MaterialApp({
    title: 'My App',
    home: new Scaffold({
      body: new Text({ data: 'Home' })
    })
  });
  
  const vnode = VNodeBuilder.build(widget);
  
  assertEquals(vnode.tag, 'div', 'Should use div');
  assertIncludes(vnode.props.className, 'fjs-material-app', 'Should have class');
  assertEquals(vnode.props['data-title'], 'My App', 'Should store title');
  assertEquals(vnode.children.length, 1, 'Should have home');
});

console.log('');

// ============================================================================
// TEST SUITE 12: Generic Widget Fallback
// ============================================================================

console.log('TEST SUITE 12: Generic Widget Fallback\n');

test('Build unknown widget type', () => {
  class CustomWidget {
    constructor() {
      this.child = new Text({ data: 'Custom' });
    }
  }
  
  const widget = new CustomWidget();
  const vnode = VNodeBuilder.build(widget);
  
  assert(vnode !== null, 'Should build generic widget');
  assertEquals(vnode.tag, 'div', 'Should use div');
  assertIncludes(vnode.props['data-widget-type'], 'CustomWidget', 'Should store type');
});

console.log('');

// ============================================================================
// TEST SUITE 13: Rendering Integration
// ============================================================================

console.log('TEST SUITE 13: Rendering Integration\n');

test('Render VNode to DOM', () => {
  const widget = new Container({
    child: new Text({ data: 'Hello DOM' })
  });
  const vnode = VNodeBuilder.build(widget);
  const element = vnode.toDOM();
  
  assert(element !== null, 'Should create DOM element');
  assertEquals(element.tagName, 'DIV', 'Should be div');
  assert(element.textContent.includes('Hello DOM'), 'Should have text content');
});

test('Render VNode to HTML', () => {
  const widget = new Container({
    child: new Text({ data: 'Hello HTML' })
  });
  const vnode = VNodeBuilder.build(widget);
  const html = vnode.toHTML();
  
  assertIncludes(html, '<div', 'Should have div tag');
  assertIncludes(html, 'Hello HTML', 'Should have text');
  assertIncludes(html, '</div>', 'Should close div');
});

test('Render complex structure to HTML', () => {
  const widget = new Scaffold({
    appBar: new AppBar({
      title: new Text({ data: 'App' })
    }),
    body: new Column({
      children: [
        new Text({ data: 'Line 1' }),
        new Text({ data: 'Line 2' })
      ]
    })
  });
  
  const vnode = VNodeBuilder.build(widget);
  const html = vnode.toHTML();
  
  assertIncludes(html, '<header', 'Should have header');
  assertIncludes(html, '<main', 'Should have main');
  assertIncludes(html, 'Line 1', 'Should have content');
  assertIncludes(html, 'Line 2', 'Should have content');
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