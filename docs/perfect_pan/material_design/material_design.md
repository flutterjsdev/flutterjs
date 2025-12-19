# Step 7: Material Design Widget Library - Production Plan

## Overview

Step 7 implements a comprehensive **Material Design 3 widget library** that mirrors Flutter's material widgets in web-compatible implementations. This builds on the runtime (Step 5) and VNode system (Step 4) to provide production-ready, styled components.

**Current Status:**
- ✅ Step 1-3: Analyzer complete
- ✅ Step 4: VNode system complete
- ✅ Step 5: Runtime system complete
- ✅ Step 6: Build system complete
- ❌ Step 7: Material widget library needs implementation

**Goal:** Complete a production-ready Material Design 3 widget library that:
1. Implements ~25 core Material widgets (not all 100+)
2. Follows Material Design 3 specifications
3. Provides consistent theming
4. Supports responsive design
5. Works with state management
6. Optimizes for performance

---

## Step 7 Breakdown (4 Major Phases)

```
Step 7: Material Design Widget Library
│
├── Phase 7.1: Core Layout Widgets (Weeks 1-2)
│   ├── Container, Padding, Center, Align
│   ├── Row, Column, Stack
│   ├── Expanded, Flexible, Spacer
│   └── SizedBox, AspectRatio
│
├── Phase 7.2: Interactive Widgets (Weeks 3-4)
│   ├── Text, RichText
│   ├── ElevatedButton, TextButton, IconButton
│   ├── TextField, Checkbox, Switch, Radio
│   └── Slider, DropdownButton
│
├── Phase 7.3: Display Widgets (Weeks 5-6)
│   ├── Card, ListTile
│   ├── Icon, Image
│   ├── Divider, VerticalDivider
│   ├── CircularProgressIndicator, LinearProgressIndicator
│   └── Chip, Badge
│
└── Phase 7.4: Structure & Navigation Widgets (Weeks 7-8)
    ├── Scaffold, AppBar, BottomNavigationBar
    ├── Drawer, FloatingActionButton
    ├── TabBar, TabBarView
    ├── Dialog, SnackBar
    └── Complete theme system integration
```

---

## Phase 7.1: Core Layout Widgets (Weeks 1-2)

### Objective
Implement fundamental layout widgets that form the building blocks of all UIs.

### 7.1.1 Container Widget

**File:** `src/widgets/material/container.js`

Container is the most versatile layout widget - handles padding, margins, decoration, sizing, and constraints.

**Implementation:**

```javascript
import { Widget } from '../../core/widget.js';
import { VNode } from '../../vnode/vnode.js';
import { StyleConverter } from '../../vnode/style-converter.js';

export class Container extends Widget {
  constructor({
    key,
    child,
    
    // Sizing
    width,
    height,
    
    // Constraints
    constraints,
    
    // Spacing
    padding,
    margin,
    
    // Decoration
    decoration,
    color,
    
    // Alignment
    alignment,
    
    // Transform
    transform
  } = {}) {
    super({ key });
    
    this.child = child;
    this.width = width;
    this.height = height;
    this.constraints = constraints;
    this.padding = padding;
    this.margin = margin;
    this.decoration = decoration;
    this.color = color;
    this.alignment = alignment;
    this.transform = transform;
  }
  
  toVNode(context) {
    const style = {};
    
    // Sizing
    if (this.width !== undefined) {
      style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
    }
    if (this.height !== undefined) {
      style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    }
    
    // Constraints
    if (this.constraints) {
      if (this.constraints.minWidth) style.minWidth = `${this.constraints.minWidth}px`;
      if (this.constraints.maxWidth) style.maxWidth = `${this.constraints.maxWidth}px`;
      if (this.constraints.minHeight) style.minHeight = `${this.constraints.minHeight}px`;
      if (this.constraints.maxHeight) style.maxHeight = `${this.constraints.maxHeight}px`;
    }
    
    // Padding
    if (this.padding) {
      style.padding = StyleConverter.edgeInsetsToPadding(this.padding);
    }
    
    // Margin
    if (this.margin) {
      style.margin = StyleConverter.edgeInsetsToPadding(this.margin);
    }
    
    // Color (simple background)
    if (this.color) {
      style.backgroundColor = StyleConverter.colorToCss(this.color);
    }
    
    // Decoration (borders, shadows, gradients)
    if (this.decoration) {
      Object.assign(style, this.buildDecoration(this.decoration));
    }
    
    // Alignment
    if (this.alignment && this.child) {
      style.display = 'flex';
      const align = this.convertAlignment(this.alignment);
      Object.assign(style, align);
    }
    
    // Transform
    if (this.transform) {
      style.transform = this.buildTransform(this.transform);
    }
    
    // Build children
    const children = this.child ? [this.child.toVNode(context)] : [];
    
    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-container',
        'data-widget': 'Container'
      },
      style,
      children
    });
  }
  
  buildDecoration(decoration) {
    const style = {};
    
    // Background color
    if (decoration.color) {
      style.backgroundColor = StyleConverter.colorToCss(decoration.color);
    }
    
    // Border
    if (decoration.border) {
      style.border = this.buildBorder(decoration.border);
    }
    
    // Border radius
    if (decoration.borderRadius) {
      style.borderRadius = StyleConverter.borderRadiusToCss(decoration.borderRadius);
    }
    
    // Box shadow
    if (decoration.boxShadow) {
      style.boxShadow = decoration.boxShadow
        .map(shadow => StyleConverter.boxShadowToCss(shadow))
        .join(', ');
    }
    
    // Gradient
    if (decoration.gradient) {
      style.background = this.buildGradient(decoration.gradient);
    }
    
    return style;
  }
  
  buildBorder(border) {
    // Simple uniform border
    if (border.all) {
      return `${border.all.width}px ${border.all.style} ${StyleConverter.colorToCss(border.all.color)}`;
    }
    
    // Individual sides
    const sides = ['top', 'right', 'bottom', 'left'];
    return sides.map(side => {
      const b = border[side];
      if (!b) return 'none';
      return `${b.width}px ${b.style} ${StyleConverter.colorToCss(b.color)}`;
    }).join(' ');
  }
  
  buildGradient(gradient) {
    if (gradient.type === 'linear') {
      const angle = gradient.angle || 0;
      const stops = gradient.colors.map((color, i) => {
        const stop = gradient.stops ? gradient.stops[i] : i / (gradient.colors.length - 1);
        return `${StyleConverter.colorToCss(color)} ${stop * 100}%`;
      }).join(', ');
      return `linear-gradient(${angle}deg, ${stops})`;
    }
    
    if (gradient.type === 'radial') {
      const stops = gradient.colors.map((color, i) => {
        const stop = gradient.stops ? gradient.stops[i] : i / (gradient.colors.length - 1);
        return `${StyleConverter.colorToCss(color)} ${stop * 100}%`;
      }).join(', ');
      return `radial-gradient(circle, ${stops})`;
    }
  }
  
  buildTransform(transform) {
    // Simple matrix transform
    if (transform.matrix) {
      return `matrix(${transform.matrix.join(',')})`;
    }
    
    // Individual transforms
    const transforms = [];
    if (transform.translateX) transforms.push(`translateX(${transform.translateX}px)`);
    if (transform.translateY) transforms.push(`translateY(${transform.translateY}px)`);
    if (transform.rotate) transforms.push(`rotate(${transform.rotate}deg)`);
    if (transform.scale) transforms.push(`scale(${transform.scale})`);
    if (transform.scaleX) transforms.push(`scaleX(${transform.scaleX})`);
    if (transform.scaleY) transforms.push(`scaleY(${transform.scaleY})`);
    
    return transforms.join(' ');
  }
  
  convertAlignment(alignment) {
    // Alignment enum to CSS flexbox
    const alignmentMap = {
      'topLeft': { justifyContent: 'flex-start', alignItems: 'flex-start' },
      'topCenter': { justifyContent: 'center', alignItems: 'flex-start' },
      'topRight': { justifyContent: 'flex-end', alignItems: 'flex-start' },
      'centerLeft': { justifyContent: 'flex-start', alignItems: 'center' },
      'center': { justifyContent: 'center', alignItems: 'center' },
      'centerRight': { justifyContent: 'flex-end', alignItems: 'center' },
      'bottomLeft': { justifyContent: 'flex-start', alignItems: 'flex-end' },
      'bottomCenter': { justifyContent: 'center', alignItems: 'flex-end' },
      'bottomRight': { justifyContent: 'flex-end', alignItems: 'flex-end' }
    };
    
    return alignmentMap[alignment] || alignmentMap.center;
  }
}

// Helper classes
export class BoxDecoration {
  constructor({
    color,
    border,
    borderRadius,
    boxShadow = [],
    gradient
  } = {}) {
    this.color = color;
    this.border = border;
    this.borderRadius = borderRadius;
    this.boxShadow = boxShadow;
    this.gradient = gradient;
  }
}

export class BoxShadow {
  constructor({
    color,
    offset = { dx: 0, dy: 0 },
    blurRadius = 0,
    spreadRadius = 0
  } = {}) {
    this.color = color;
    this.offsetX = offset.dx;
    this.offsetY = offset.dy;
    this.blurRadius = blurRadius;
    this.spreadRadius = spreadRadius;
  }
}

export class BorderRadius {
  static circular(radius) {
    return new BorderRadius({ all: radius });
  }
  
  constructor({ all, topLeft, topRight, bottomLeft, bottomRight } = {}) {
    if (all !== undefined) {
      this.all = all;
    } else {
      this.topLeft = topLeft || 0;
      this.topRight = topRight || 0;
      this.bottomLeft = bottomLeft || 0;
      this.bottomRight = bottomRight || 0;
    }
  }
}

export class BoxConstraints {
  constructor({
    minWidth,
    maxWidth,
    minHeight,
    maxHeight
  } = {}) {
    this.minWidth = minWidth;
    this.maxWidth = maxWidth;
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
  }
}
```

**Usage Example:**

```javascript
Container({
  width: 200,
  height: 100,
  padding: EdgeInsets.all(16),
  margin: EdgeInsets.symmetric({ horizontal: 8 }),
  decoration: new BoxDecoration({
    color: Colors.blue,
    borderRadius: BorderRadius.circular(8),
    boxShadow: [
      new BoxShadow({
        color: Colors.black.withOpacity(0.2),
        offset: { dx: 0, dy: 2 },
        blurRadius: 4
      })
    ]
  }),
  child: Text('Hello')
})
```

**Validation:**
- ✅ Width/height applied correctly
- ✅ Padding/margin work
- ✅ Background color renders
- ✅ Borders render correctly
- ✅ Box shadows display
- ✅ Border radius works
- ✅ Alignment centers child
- ✅ Constraints respected

---

### 7.1.2 Row & Column Widgets

**File:** `src/widgets/material/flex.js`

Row and Column use CSS flexbox for layout.

**Implementation:**

```javascript
export class Row extends Widget {
  constructor({
    key,
    children = [],
    mainAxisAlignment = MainAxisAlignment.start,
    crossAxisAlignment = CrossAxisAlignment.center,
    mainAxisSize = MainAxisSize.max
  } = {}) {
    super({ key });
    this.children = children;
    this.mainAxisAlignment = mainAxisAlignment;
    this.crossAxisAlignment = crossAxisAlignment;
    this.mainAxisSize = mainAxisSize;
  }
  
  toVNode(context) {
    const style = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: this.mapMainAxisAlignment(this.mainAxisAlignment),
      alignItems: this.mapCrossAxisAlignment(this.crossAxisAlignment)
    };
    
    if (this.mainAxisSize === MainAxisSize.min) {
      style.width = 'fit-content';
    }
    
    const children = this.children.map(child => child.toVNode(context));
    
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-row', 'data-widget': 'Row' },
      style,
      children
    });
  }
  
  mapMainAxisAlignment(alignment) {
    const map = {
      [MainAxisAlignment.start]: 'flex-start',
      [MainAxisAlignment.end]: 'flex-end',
      [MainAxisAlignment.center]: 'center',
      [MainAxisAlignment.spaceBetween]: 'space-between',
      [MainAxisAlignment.spaceAround]: 'space-around',
      [MainAxisAlignment.spaceEvenly]: 'space-evenly'
    };
    return map[alignment] || 'flex-start';
  }
  
  mapCrossAxisAlignment(alignment) {
    const map = {
      [CrossAxisAlignment.start]: 'flex-start',
      [CrossAxisAlignment.end]: 'flex-end',
      [CrossAxisAlignment.center]: 'center',
      [CrossAxisAlignment.stretch]: 'stretch',
      [CrossAxisAlignment.baseline]: 'baseline'
    };
    return map[alignment] || 'center';
  }
}

export class Column extends Row {
  toVNode(context) {
    const vnode = super.toVNode(context);
    vnode.style.flexDirection = 'column';
    vnode.props.className = 'fjs-column';
    vnode.props['data-widget'] = 'Column';
    return vnode;
  }
}

// Enums
export const MainAxisAlignment = {
  start: 'start',
  end: 'end',
  center: 'center',
  spaceBetween: 'spaceBetween',
  spaceAround: 'spaceAround',
  spaceEvenly: 'spaceEvenly'
};

export const CrossAxisAlignment = {
  start: 'start',
  end: 'end',
  center: 'center',
  stretch: 'stretch',
  baseline: 'baseline'
};

export const MainAxisSize = {
  min: 'min',
  max: 'max'
};
```

**Validation:**
- ✅ Children laid out horizontally (Row)
- ✅ Children laid out vertically (Column)
- ✅ MainAxisAlignment works
- ✅ CrossAxisAlignment works
- ✅ MainAxisSize respected

---

### 7.1.3 Expanded & Flexible Widgets

**File:** `src/widgets/material/flex.js` (continued)

```javascript
export class Expanded extends Widget {
  constructor({
    key,
    child,
    flex = 1
  } = {}) {
    super({ key });
    this.child = child;
    this.flex = flex;
  }
  
  toVNode(context) {
    const childVNode = this.child.toVNode(context);
    
    // Add flex style to child
    childVNode.style = {
      ...childVNode.style,
      flex: this.flex
    };
    
    return childVNode;
  }
}

export class Flexible extends Widget {
  constructor({
    key,
    child,
    flex = 1,
    fit = FlexFit.loose
  } = {}) {
    super({ key });
    this.child = child;
    this.flex = flex;
    this.fit = fit;
  }
  
  toVNode(context) {
    const childVNode = this.child.toVNode(context);
    
    if (this.fit === FlexFit.tight) {
      childVNode.style = {
        ...childVNode.style,
        flex: `${this.flex} 1 0`
      };
    } else {
      childVNode.style = {
        ...childVNode.style,
        flex: `${this.flex} 0 auto`
      };
    }
    
    return childVNode;
  }
}

export const FlexFit = {
  tight: 'tight',
  loose: 'loose'
};

export class Spacer extends Widget {
  constructor({ key, flex = 1 } = {}) {
    super({ key });
    this.flex = flex;
  }
  
  toVNode(context) {
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-spacer' },
      style: { flex: this.flex }
    });
  }
}
```

**Usage Example:**

```javascript
Row({
  children: [
    Container({ width: 50, height: 50, color: Colors.red }),
    Expanded({ 
      child: Container({ height: 50, color: Colors.blue })
    }),
    Container({ width: 50, height: 50, color: Colors.green })
  ]
})
// Red box (fixed 50px) | Blue box (fills remaining space) | Green box (fixed 50px)
```

---

### 7.1.4 Additional Layout Widgets

**SizedBox, Padding, Center, Align, Stack**

```javascript
export class SizedBox extends Widget {
  constructor({ key, width, height, child } = {}) {
    super({ key });
    this.width = width;
    this.height = height;
    this.child = child;
  }
  
  toVNode(context) {
    const style = {};
    if (this.width !== undefined) style.width = `${this.width}px`;
    if (this.height !== undefined) style.height = `${this.height}px`;
    
    const children = this.child ? [this.child.toVNode(context)] : [];
    
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-sized-box' },
      style,
      children
    });
  }
}

export class Padding extends Widget {
  constructor({ key, padding, child } = {}) {
    super({ key });
    this.padding = padding;
    this.child = child;
  }
  
  toVNode(context) {
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-padding' },
      style: {
        padding: StyleConverter.edgeInsetsToPadding(this.padding)
      },
      children: [this.child.toVNode(context)]
    });
  }
}

export class Center extends Widget {
  constructor({ key, child } = {}) {
    super({ key });
    this.child = child;
  }
  
  toVNode(context) {
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-center' },
      style: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
      children: [this.child.toVNode(context)]
    });
  }
}

export class Align extends Widget {
  constructor({ key, alignment = Alignment.center, child } = {}) {
    super({ key });
    this.alignment = alignment;
    this.child = child;
  }
  
  toVNode(context) {
    const alignStyle = this.convertAlignment(this.alignment);
    
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-align' },
      style: {
        display: 'flex',
        ...alignStyle
      },
      children: [this.child.toVNode(context)]
    });
  }
  
  convertAlignment(alignment) {
    // Same as Container.convertAlignment
  }
}

export class Stack extends Widget {
  constructor({ key, children = [], alignment = Alignment.topLeft } = {}) {
    super({ key });
    this.children = children;
    this.alignment = alignment;
  }
  
  toVNode(context) {
    const childVNodes = this.children.map((child, i) => {
      const vnode = child.toVNode(context);
      
      // First child is the base, others are positioned
      if (i > 0) {
        vnode.style = {
          ...vnode.style,
          position: 'absolute',
          ...this.getPositionStyle(this.alignment)
        };
      }
      
      return vnode;
    });
    
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-stack' },
      style: { position: 'relative' },
      children: childVNodes
    });
  }
  
  getPositionStyle(alignment) {
    const map = {
      'topLeft': { top: 0, left: 0 },
      'topCenter': { top: 0, left: '50%', transform: 'translateX(-50%)' },
      'topRight': { top: 0, right: 0 },
      'centerLeft': { top: '50%', left: 0, transform: 'translateY(-50%)' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'centerRight': { top: '50%', right: 0, transform: 'translateY(-50%)' },
      'bottomLeft': { bottom: 0, left: 0 },
      'bottomCenter': { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
      'bottomRight': { bottom: 0, right: 0 }
    };
    return map[alignment] || map.topLeft;
  }
}
```

**Phase 7.1 Checklist:**
- [ ] Container with all features
- [ ] Row & Column with alignment
- [ ] Expanded, Flexible, Spacer
- [ ] SizedBox, Padding
- [ ] Center, Align
- [ ] Stack with positioning
- [ ] Unit tests (60+ cases)
- [ ] Integration tests (10+ layouts)

---

## Phase 7.2: Interactive Widgets (Weeks 3-4)

### Objective
Implement widgets that handle user input and interaction.

### 7.2.1 Text Widget

**File:** `src/widgets/material/text.js`

```javascript
export class Text extends Widget {
  constructor(data, {
    key,
    style,
    textAlign,
    overflow,
    maxLines,
    softWrap = true
  } = {}) {
    super({ key });
    this.data = data;
    this.style = style;
    this.textAlign = textAlign;
    this.overflow = overflow;
    this.maxLines = maxLines;
    this.softWrap = softWrap;
  }
  
  toVNode(context) {
    const style = {};
    
    // Text style
    if (this.style) {
      Object.assign(style, StyleConverter.textStyleToCss(this.style));
    }
    
    // Text align
    if (this.textAlign) {
      style.textAlign = this.textAlign;
    }
    
    // Overflow handling
    if (this.overflow === TextOverflow.ellipsis) {
      style.overflow = 'hidden';
      style.textOverflow = 'ellipsis';
      style.whiteSpace = 'nowrap';
    }
    
    // Max lines
    if (this.maxLines) {
      style.display = '-webkit-box';
      style.WebkitLineClamp = this.maxLines;
      style.WebkitBoxOrient = 'vertical';
      style.overflow = 'hidden';
    }
    
    // Soft wrap
    if (!this.softWrap) {
      style.whiteSpace = 'nowrap';
    }
    
    return new VNode({
      tag: 'span',
      props: { className: 'fjs-text', 'data-widget': 'Text' },
      style,
      children: [String(this.data)]
    });
  }
}

export class TextStyle {
  constructor({
    fontSize,
    fontWeight,
    fontStyle,
    color,
    letterSpacing,
    height, // line height
    decoration,
    decorationColor,
    decorationStyle,
    fontFamily
  } = {}) {
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
    this.fontStyle = fontStyle;
    this.color = color;
    this.letterSpacing = letterSpacing;
    this.height = height;
    this.decoration = decoration;
    this.decorationColor = decorationColor;
    this.decorationStyle = decorationStyle;
    this.fontFamily = fontFamily;
  }
}

export const TextOverflow = {
  clip: 'clip',
  ellipsis: 'ellipsis',
  fade: 'fade'
};

export const FontWeight = {
  normal: '400',
  bold: '700',
  w100: '100',
  w200: '200',
  w300: '300',
  w400: '400',
  w500: '500',
  w600: '600',
  w700: '700',
  w800: '800',
  w900: '900'
};
```

---

### 7.2.2 Button Widgets

**File:** `src/widgets/material/button.js`

```javascript
export class ElevatedButton extends Widget {
  constructor({
    key,
    onPressed,
    child,
    style
  } = {}) {
    super({ key });
    this.onPressed = onPressed;
    this.child = child;
    this.style = style;
  }
  
  toVNode(context) {
    const theme = context.theme();
    
    const buttonStyle = {
      padding: '10px 24px',
      borderRadius: '20px',
      border: 'none',
      backgroundColor: theme?.colorScheme?.primary || '#6750a4',
      color: theme?.colorScheme?.onPrimary || '#ffffff',
      fontSize: '14px',
      fontWeight: '500',
      cursor: this.onPressed ? 'pointer' : 'not-allowed',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      transition: 'all 0.3s',
      opacity: this.onPressed ? 1 : 0.38
    };
    
    // Custom style overrides
    if (this.style) {
      Object.assign(buttonStyle, this.applyButtonStyle(this.style));
    }
    
    const events = {};
    if (this.onPressed) {
      events.click = this.onPressed;
    }
    
    return new VNode({
      tag: 'button',
      props: {
        className: 'fjs-elevated-button',
        'data-widget': 'ElevatedButton',
        disabled: !this.onPressed
      },
      style: buttonStyle,
      events,
      children: [this.child.toVNode(context)]
    });
  }
  
  applyButtonStyle(style) {
    const cssStyle = {};
    
    if (style.backgroundColor) {
      cssStyle.backgroundColor = StyleConverter.colorToCss(style.backgroundColor);
    }
    if (style.foregroundColor) {
      cssStyle.color = StyleConverter.colorToCss(style.foregroundColor);
    }
    if (style.padding) {
      cssStyle.padding = StyleConverter.edgeInsetsToPadding(style.padding);
    }
    if (style.elevation) {
      cssStyle.boxShadow = this.getElevationShadow(style.elevation);
    }
    
    return cssStyle;
  }
  
  getElevationShadow(elevation) {
    // Material elevation levels
    const shadows = {
      0: 'none',
      1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      2: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      3: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
      4: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
      5: '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)'
    };
    return shadows[elevation] || shadows[1];
  }
}

export class TextButton extends ElevatedButton {
  toVNode(context) {
    const vnode = super.toVNode(context);
    
    // Override styles for text button
    vnode.style = {
      ...vnode.style,
      backgroundColor: 'transparent',
      boxShadow: 'none',
      color: context.theme()?.colorScheme?.primary || '#6750a4'
    };
    
    vnode.props.className = 'fjs-text-button';
    vnode.props['data-widget'] = 'TextButton';
    
    return vnode;
  }
}

export class IconButton extends Widget {
  constructor({
    key,
    onPressed,
    icon,
    tooltip
  } = {}) {
    super({ key });
    this.onPressed = onPressed;
    this.icon = icon;
    this.tooltip = tooltip;
  }
  
  toVNode(context) {
    const theme = context.theme();
    
    const events = {};
    if (this.onPressed) {
      events.click = this.onPressed;
    }
    
    return new VNode({
      tag: 'button',
      props: {
        className: 'fjs-icon-button',
        'data-widget': 'IconButton',
        disabled: !this.onPressed,
        title:```javascript
        title: this.tooltip || ''
      },
      style: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'transparent',
        color: theme?.colorScheme?.onSurface || '#1c1b1f',
        cursor: this.onPressed ? 'pointer' : 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s',
        opacity: this.onPressed ? 1 : 0.38
      },
      events,
      children: [this.icon.toVNode(context)]
    });
  }
}
```

---

### 7.2.3 TextField Widget

**File:** `src/widgets/material/text-field.js`

```javascript
export class TextField extends StatefulWidget {
  constructor({
    key,
    controller,
    decoration,
    keyboardType,
    obscureText = false,
    maxLines = 1,
    onChanged,
    onSubmitted,
    autofocus = false,
    enabled = true
  } = {}) {
    super({ key });
    this.controller = controller;
    this.decoration = decoration;
    this.keyboardType = keyboardType;
    this.obscureText = obscureText;
    this.maxLines = maxLines;
    this.onChanged = onChanged;
    this.onSubmitted = onSubmitted;
    this.autofocus = autofocus;
    this.enabled = enabled;
  }
  
  createState() {
    return new _TextFieldState();
  }
}

class _TextFieldState extends State {
  constructor() {
    super();
    this.focused = false;
    this.value = '';
  }
  
  initState() {
    if (this.widget.controller) {
      this.value = this.widget.controller.text;
    }
  }
  
  build(context) {
    const theme = context.theme();
    const decoration = this.widget.decoration || new InputDecoration();
    
    // Container for the entire field
    return Container({
      margin: EdgeInsets.symmetric({ vertical: 8 }),
      child: Column({
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label (if provided)
          decoration.labelText ? this.buildLabel(decoration, theme) : null,
          
          // Input container
          this.buildInputContainer(decoration, theme)
        ].filter(Boolean)
      })
    });
  }
  
  buildLabel(decoration, theme) {
    return Padding({
      padding: EdgeInsets.only({ bottom: 4 }),
      child: Text(decoration.labelText, {
        style: new TextStyle({
          fontSize: 12,
          color: this.focused 
            ? (theme?.colorScheme?.primary || Colors.blue)
            : (theme?.colorScheme?.onSurfaceVariant || Colors.grey)
        })
      })
    });
  }
  
  buildInputContainer(decoration, theme) {
    const borderColor = this.focused
      ? (theme?.colorScheme?.primary || '#6750a4')
      : (decoration.enabled ? '#79747e' : '#c4c7c5');
    
    return new _TextFieldInput({
      value: this.value,
      placeholder: decoration.hintText,
      obscureText: this.widget.obscureText,
      keyboardType: this.widget.keyboardType,
      maxLines: this.widget.maxLines,
      autofocus: this.widget.autofocus,
      enabled: this.widget.enabled && (decoration.enabled !== false),
      prefixIcon: decoration.prefixIcon,
      suffixIcon: decoration.suffixIcon,
      borderColor: borderColor,
      onChanged: (value) => {
        this.value = value;
        if (this.widget.controller) {
          this.widget.controller.text = value;
        }
        if (this.widget.onChanged) {
          this.widget.onChanged(value);
        }
      },
      onFocus: () => this.setState(() => { this.focused = true; }),
      onBlur: () => this.setState(() => { this.focused = false; }),
      onSubmit: this.widget.onSubmitted
    });
  }
}

// Low-level input widget
class _TextFieldInput extends Widget {
  constructor({
    value,
    placeholder,
    obscureText,
    keyboardType,
    maxLines,
    autofocus,
    enabled,
    prefixIcon,
    suffixIcon,
    borderColor,
    onChanged,
    onFocus,
    onBlur,
    onSubmit
  }) {
    super({});
    this.value = value;
    this.placeholder = placeholder;
    this.obscureText = obscureText;
    this.keyboardType = keyboardType;
    this.maxLines = maxLines;
    this.autofocus = autofocus;
    this.enabled = enabled;
    this.prefixIcon = prefixIcon;
    this.suffixIcon = suffixIcon;
    this.borderColor = borderColor;
    this.onChanged = onChanged;
    this.onFocus = onFocus;
    this.onBlur = onBlur;
    this.onSubmit = onSubmit;
  }
  
  toVNode(context) {
    const containerStyle = {
      display: 'flex',
      alignItems: 'center',
      border: `1px solid ${this.borderColor}`,
      borderRadius: '4px',
      padding: '8px 12px',
      backgroundColor: this.enabled ? '#ffffff' : '#f5f5f5',
      transition: 'border-color 0.2s'
    };
    
    const inputStyle = {
      flex: 1,
      border: 'none',
      outline: 'none',
      fontSize: '16px',
      backgroundColor: 'transparent',
      fontFamily: 'inherit'
    };
    
    const inputType = this.obscureText ? 'password' : this.getInputType();
    const inputTag = this.maxLines > 1 ? 'textarea' : 'input';
    
    const events = {};
    if (this.onChanged) {
      events.input = (e) => this.onChanged(e.target.value);
    }
    if (this.onFocus) {
      events.focus = this.onFocus;
    }
    if (this.onBlur) {
      events.blur = this.onBlur;
    }
    if (this.onSubmit && inputTag === 'input') {
      events.keypress = (e) => {
        if (e.key === 'Enter') {
          this.onSubmit(e.target.value);
        }
      };
    }
    
    const inputProps = {
      className: 'fjs-input',
      type: inputTag === 'input' ? inputType : undefined,
      placeholder: this.placeholder || '',
      value: this.value,
      disabled: !this.enabled,
      autofocus: this.autofocus
    };
    
    if (inputTag === 'textarea') {
      inputProps.rows = this.maxLines;
    }
    
    const children = [];
    
    // Prefix icon
    if (this.prefixIcon) {
      children.push(
        new VNode({
          tag: 'div',
          props: { className: 'fjs-input-prefix' },
          style: { marginRight: '8px', display: 'flex' },
          children: [this.prefixIcon.toVNode(context)]
        })
      );
    }
    
    // Input element
    children.push(
      new VNode({
        tag: inputTag,
        props: inputProps,
        style: inputStyle,
        events
      })
    );
    
    // Suffix icon
    if (this.suffixIcon) {
      children.push(
        new VNode({
          tag: 'div',
          props: { className: 'fjs-input-suffix' },
          style: { marginLeft: '8px', display: 'flex' },
          children: [this.suffixIcon.toVNode(context)]
        })
      );
    }
    
    return new VNode({
      tag: 'div',
      props: { className: 'fjs-text-field-container' },
      style: containerStyle,
      children
    });
  }
  
  getInputType() {
    const typeMap = {
      [TextInputType.number]: 'number',
      [TextInputType.phone]: 'tel',
      [TextInputType.emailAddress]: 'email',
      [TextInputType.url]: 'url',
      [TextInputType.datetime]: 'datetime-local'
    };
    return typeMap[this.keyboardType] || 'text';
  }
}

// Helper classes
export class InputDecoration {
  constructor({
    labelText,
    hintText,
    prefixIcon,
    suffixIcon,
    enabled = true,
    border,
    focusedBorder,
    errorText
  } = {}) {
    this.labelText = labelText;
    this.hintText = hintText;
    this.prefixIcon = prefixIcon;
    this.suffixIcon = suffixIcon;
    this.enabled = enabled;
    this.border = border;
    this.focusedBorder = focusedBorder;
    this.errorText = errorText;
  }
}

export class TextEditingController {
  constructor({ text = '' } = {}) {
    this.text = text;
    this.listeners = new Set();
  }
  
  addListener(callback) {
    this.listeners.add(callback);
  }
  
  removeListener(callback) {
    this.listeners.delete(callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(cb => cb(this.text));
  }
  
  clear() {
    this.text = '';
    this.notifyListeners();
  }
}

export const TextInputType = {
  text: 'text',
  number: 'number',
  phone: 'phone',
  emailAddress: 'emailAddress',
  url: 'url',
  datetime: 'datetime'
};
```

---

### 7.2.4 Selection Widgets (Checkbox, Radio, Switch)

**File:** `src/widgets/material/selection.js`

```javascript
export class Checkbox extends StatelessWidget {
  constructor({
    key,
    value,
    onChanged,
    activeColor
  } = {}) {
    super({ key });
    this.value = value;
    this.onChanged = onChanged;
    this.activeColor = activeColor;
  }
  
  build(context) {
    const theme = context.theme();
    const color = this.activeColor || theme?.colorScheme?.primary || '#6750a4';
    
    return new _CheckboxWidget({
      value: this.value,
      onChanged: this.onChanged,
      color: color,
      enabled: this.onChanged !== null
    });
  }
}

class _CheckboxWidget extends Widget {
  constructor({ value, onChanged, color, enabled }) {
    super({});
    this.value = value;
    this.onChanged = onChanged;
    this.color = color;
    this.enabled = enabled;
  }
  
  toVNode(context) {
    const events = {};
    if (this.onChanged && this.enabled) {
      events.change = (e) => this.onChanged(e.target.checked);
    }
    
    const containerStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      cursor: this.enabled ? 'pointer' : 'not-allowed',
      opacity: this.enabled ? 1 : 0.38
    };
    
    const checkboxStyle = {
      width: '18px',
      height: '18px',
      cursor: this.enabled ? 'pointer' : 'not-allowed',
      accentColor: this.color
    };
    
    return new VNode({
      tag: 'label',
      props: { className: 'fjs-checkbox-container' },
      style: containerStyle,
      children: [
        new VNode({
          tag: 'input',
          props: {
            type: 'checkbox',
            checked: this.value,
            disabled: !this.enabled,
            className: 'fjs-checkbox'
          },
          style: checkboxStyle,
          events
        })
      ]
    });
  }
}

export class Switch extends StatelessWidget {
  constructor({
    key,
    value,
    onChanged,
    activeColor
  } = {}) {
    super({ key });
    this.value = value;
    this.onChanged = onChanged;
    this.activeColor = activeColor;
  }
  
  build(context) {
    const theme = context.theme();
    const color = this.activeColor || theme?.colorScheme?.primary || '#6750a4';
    
    return new _SwitchWidget({
      value: this.value,
      onChanged: this.onChanged,
      color: color,
      enabled: this.onChanged !== null
    });
  }
}

class _SwitchWidget extends Widget {
  constructor({ value, onChanged, color, enabled }) {
    super({});
    this.value = value;
    this.onChanged = onChanged;
    this.color = color;
    this.enabled = enabled;
  }
  
  toVNode(context) {
    const events = {};
    if (this.onChanged && this.enabled) {
      events.change = (e) => this.onChanged(e.target.checked);
    }
    
    const trackStyle = {
      width: '52px',
      height: '32px',
      borderRadius: '16px',
      backgroundColor: this.value ? this.color : '#e0e0e0',
      position: 'relative',
      cursor: this.enabled ? 'pointer' : 'not-allowed',
      opacity: this.enabled ? 1 : 0.38,
      transition: 'background-color 0.2s'
    };
    
    const thumbStyle = {
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: '#ffffff',
      position: 'absolute',
      top: '6px',
      left: this.value ? '26px' : '6px',
      transition: 'left 0.2s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    };
    
    return new VNode({
      tag: 'label',
      props: { className: 'fjs-switch-container' },
      style: { display: 'inline-block', cursor: this.enabled ? 'pointer' : 'not-allowed' },
      children: [
        new VNode({
          tag: 'input',
          props: {
            type: 'checkbox',
            checked: this.value,
            disabled: !this.enabled,
            className: 'fjs-switch-input'
          },
          style: { display: 'none' },
          events
        }),
        new VNode({
          tag: 'div',
          props: { className: 'fjs-switch-track' },
          style: trackStyle,
          children: [
            new VNode({
              tag: 'div',
              props: { className: 'fjs-switch-thumb' },
              style: thumbStyle
            })
          ]
        })
      ]
    });
  }
}

export class Radio extends StatelessWidget {
  constructor({
    key,
    value,
    groupValue,
    onChanged
  } = {}) {
    super({ key });
    this.value = value;
    this.groupValue = groupValue;
    this.onChanged = onChanged;
  }
  
  build(context) {
    const theme = context.theme();
    const color = theme?.colorScheme?.primary || '#6750a4';
    
    return new _RadioWidget({
      value: this.value,
      groupValue: this.groupValue,
      onChanged: this.onChanged,
      color: color,
      enabled: this.onChanged !== null
    });
  }
}

class _RadioWidget extends Widget {
  constructor({ value, groupValue, onChanged, color, enabled }) {
    super({});
    this.value = value;
    this.groupValue = groupValue;
    this.onChanged = onChanged;
    this.color = color;
    this.enabled = enabled;
  }
  
  toVNode(context) {
    const events = {};
    if (this.onChanged && this.enabled) {
      events.change = () => this.onChanged(this.value);
    }
    
    const radioStyle = {
      width: '18px',
      height: '18px',
      cursor: this.enabled ? 'pointer' : 'not-allowed',
      accentColor: this.color
    };
    
    return new VNode({
      tag: 'label',
      props: { className: 'fjs-radio-container' },
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        cursor: this.enabled ? 'pointer' : 'not-allowed',
        opacity: this.enabled ? 1 : 0.38
      },
      children: [
        new VNode({
          tag: 'input',
          props: {
            type: 'radio',
            checked: this.value === this.groupValue,
            disabled: !this.enabled,
            className: 'fjs-radio'
          },
          style: radioStyle,
          events
        })
      ]
    });
  }
}
```

**Usage Examples:**

```javascript
// Checkbox
Checkbox({
  value: isChecked,
  onChanged: (value) => setState(() => { isChecked = value; })
})

// Switch
Switch({
  value: isEnabled,
  onChanged: (value) => setState(() => { isEnabled = value; })
})

// Radio buttons
Column({
  children: [
    Radio({ value: 1, groupValue: selectedValue, onChanged: (v) => setState(() => { selectedValue = v; }) }),
    Radio({ value: 2, groupValue: selectedValue, onChanged: (v) => setState(() => { selectedValue = v; }) }),
    Radio({ value: 3, groupValue: selectedValue, onChanged: (v) => setState(() => { selectedValue = v; }) })
  ]
})
```

**Phase 7.2 Checklist:**
- [ ] Text widget with styling
- [ ] ElevatedButton, TextButton, IconButton
- [ ] TextField with decoration
- [ ] TextEditingController
- [ ] Checkbox, Switch, Radio
- [ ] Unit tests (50+ cases)
- [ ] Integration tests (forms, inputs)

---

## Phase 7.3: Display Widgets (Weeks 5-6)

### Objective
Implement widgets for displaying content and visual elements.

### 7.3.1 Card & ListTile

**File:** `src/widgets/material/card.js`

```javascript
export class Card extends StatelessWidget {
  constructor({
    key,
    child,
    elevation = 1,
    color,
    margin,
    shape
  } = {}) {
    super({ key });
    this.child = child;
    this.elevation = elevation;
    this.color = color;
    this.margin = margin;
    this.shape = shape;
  }
  
  build(context) {
    const theme = context.theme();
    const cardColor = this.color || theme?.colorScheme?.surface || '#ffffff';
    
    return Container({
      margin: this.margin || EdgeInsets.all(8),
      decoration: new BoxDecoration({
        color: cardColor,
        borderRadius: this.shape?.borderRadius || BorderRadius.circular(12),
        boxShadow: [
          new BoxShadow({
            color: Colors.black.withOpacity(0.1),
            offset: { dx: 0, dy: this.elevation },
            blurRadius: this.elevation * 2,
            spreadRadius: 0
          })
        ]
      }),
      child: this.child
    });
  }
}

export class ListTile extends StatelessWidget {
  constructor({
    key,
    leading,
    title,
    subtitle,
    trailing,
    onTap,
    enabled = true
  } = {}) {
    super({ key });
    this.leading = leading;
    this.title = title;
    this.subtitle = subtitle;
    this.trailing = trailing;
    this.onTap = onTap;
    this.enabled = enabled;
  }
  
  build(context) {
    const theme = context.theme();
    
    return new _ListTileWidget({
      leading: this.leading,
      title: this.title,
      subtitle: this.subtitle,
      trailing: this.trailing,
      onTap: this.onTap,
      enabled: this.enabled && this.onTap !== null,
      theme: theme
    });
  }
}

class _ListTileWidget extends Widget {
  constructor({ leading, title, subtitle, trailing, onTap, enabled, theme }) {
    super({});
    this.leading = leading;
    this.title = title;
    this.subtitle = subtitle;
    this.trailing = trailing;
    this.onTap = onTap;
    this.enabled = enabled;
    this.theme = theme;
  }
  
  toVNode(context) {
    const events = {};
    if (this.onTap && this.enabled) {
      events.click = this.onTap;
    }
    
    const containerStyle = {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      minHeight: '56px',
      cursor: this.enabled ? 'pointer' : 'default',
      transition: 'background-color 0.2s',
      backgroundColor: 'transparent'
    };
    
    const children = [];
    
    // Leading widget (icon, avatar, etc.)
    if (this.leading) {
      children.push(
        new VNode({
          tag: 'div',
          props: { className: 'fjs-list-tile-leading' },
          style: { marginRight: '16px', display: 'flex' },
          children: [this.leading.toVNode(context)]
        })
      );
    }
    
    // Title and subtitle
    const contentChildren = [];
    if (this.title) {
      contentChildren.push(this.title.toVNode(context));
    }
    if (this.subtitle) {
      contentChildren.push(this.subtitle.toVNode(context));
    }
    
    children.push(
      new VNode({
        tag: 'div',
        props: { className: 'fjs-list-tile-content' },
        style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
        children: contentChildren
      })
    );
    
    // Trailing widget
    if (this.trailing) {
      children.push(
        new VNode({
          tag: 'div',
          props: { className: 'fjs-list-tile-trailing' },
          style: { marginLeft: '16px', display: 'flex' },
          children: [this.trailing.toVNode(context)]
        })
      );
    }
    
    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-list-tile',
        'data-widget': 'ListTile'
      },
      style: containerStyle,
      events,
      children
    });
  }
}
```

---

### 7.3.2 Icon & Image

**File:** `src/widgets/material/icon.js`

```javascript
export class Icon extends Widget {
  constructor(icon, {
    key,
    size = 24,
    color
  } = {}) {
    super({ key });
    this.icon = icon;
    this.size = size;
    this.color = color;
  }
  
  toVNode(context) {
    const theme = context.theme();
    const iconColor = this.color || theme?.colorScheme?.onSurface || '#1c1b1f';
    
    // Assuming icon is an IconData object with codePoint
    const svgContent = this.getIconSVG(this.icon);
    
    return new VNode({
      tag: 'svg',
      props: {
        className: 'fjs-icon',
        'data-widget': 'Icon',
        viewBox: '0 0 24 24',
        width: this.size,
        height: this.size
      },
      style: {
        fill: StyleConverter.colorToCss(iconColor),
        display: 'inline-block'
      },
      children: [
        new VNode({
          tag: 'path',
          props: {
            d: svgContent
          }
        })
      ]
    });
  }
  
  getIconSVG(iconData) {
    // Map icon to SVG path
    // This would typically come from a pre-generated icon font or SVG library
    const iconMap = {
      'add': 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
      'close': 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      'check': 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
      'menu': 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
      'home': 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
      'search': 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      // ... more icons
    };
    
    return iconMap[iconData.name] || iconMap['close'];
  }
}

// Icon data class
export class IconData {
  constructor(name, { fontFamily = 'MaterialIcons', codePoint } = {}) {
    this.name = name;
    this.fontFamily = fontFamily;
    this.codePoint = codePoint;
  }
}

// Icon registry
export class Icons {
  static add = new IconData('add');
  static close = new IconData('close');
  static check = new IconData('check');
  static menu = new IconData('menu');
  static home = new IconData('home');
  static search = new IconData('search');
  static settings = new IconData('settings');
  static favorite = new IconData('favorite');
  static delete = new IconData('delete');
  static edit = new IconData('edit');
  // ... more icons
}
```

**File:** `src/widgets/material/image.js`

```javascript
export class Image extends Widget {
  static network(src, {
    key,
    width,
    height,
    fit = BoxFit.contain
  } = {}) {
    return new Image({
      key,
      src,
      width,
      height,
      fit
    });
  }
  
  static asset(path, {
    key,
    width,
    height,
    fit = BoxFit.contain
  } = {}) {
    return new Image({
      key,
      src: `/assets/${path}`,
      width,
      height,
      fit
    });
  }
  
  constructor({
    key,
    src,
    width,
    height,
    fit = BoxFit.contain
  } = {}) {
    super({ key });
    this.src = src;
    this.width = width;
    this.height = height;
    this.fit = fit;
  }
  
  toVNode(context) {
    const style = {
      objectFit: this.convertFit(this.fit),
      display: 'block'
    };
    
    if (this.width) {
      style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
    }
    if (this.height) {
      style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    }
    
    return new VNode({
      tag: 'img',
      props: {
        src: this.src,
        className: 'fjs-image',
        'data-widget': 'Image',
        alt: ''
      },
      style
    });
  }
  
  convertFit(fit) {
    const fitMap = {
      [BoxFit.contain]: 'contain',
      [BoxFit.cover]: 'cover',
      [BoxFit.fill]: 'fill',
      [BoxFit.fitWidth]: 'scale-down',
      [BoxFit.fitHeight]: 'scale-down',
      [BoxFit.none]: 'none',
      [BoxFit.scaleDown]: 'scale-down'
    };
    return fitMap[fit] || 'contain';
  }
}

export const BoxFit = {
  contain: 'contain',
  cover: 'cover',
  fill: 'fill',
  fitWidth: 'fitWidth',
  fitHeight: 'fitHeight',
  none: 'none',
  scaleDown: 'scaleDown'
};
```

---

### 7.3.3 Progress Indicators & Dividers

**File:** `src/widgets/material/progress.js`

```javascript
export class CircularProgressIndicator extends Widget {
  constructor({
    key,
    value, // null for indeterminate
    color,
    strokeWidth = 4
  } = {}) {
    super({ key });
    this.value = value;
    this.color = color;
    this.strokeWidth = strokeWidth;
  }
  
  toVNode(context) {
    const theme = context.theme();
    const color = this.color || theme?.colorScheme?.primary || '#6750a4';
    
    const size = 48;
    const radius = (size - this.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    const svgStyle = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'block'
    };
    
    const circleStyle = {
      fill: 'none',
      stroke: StyleConverter.colorToCss(color),
      strokeWidth: `${this.strokeWidth}px`,
      strokeLinecap: 'round'
    };
    
    if (this.value !== null && this.value !== undefined) {
      // Determinate
      const progress = Math.max(0, Math.min(1, this.value));
      const offset = circumference * (1 - progress);
      
      circleStyle.strokeDasharray = `${circumference}`;
      circleStyle.strokeDashoffset = `${offset}`;
      circleStyle.transform = 'rotate(-90```javascript
      circleStyle.transform = 'rotate(-90deg)';
      circleStyle.transformOrigin = 'center';
      circleStyle.transition = 'stroke-dashoffset 0.3s';
    } else {
      // Indeterminate - add spinning animation
      circleStyle.strokeDasharray = `${circumference * 0.75} ${circumference}`;
      circleStyle.animation = 'fjs-spin 1.4s linear infinite';
      circleStyle.transformOrigin = 'center';
    }
    
    return new VNode({
      tag: 'svg',
      props: {
        className: 'fjs-circular-progress',
        'data-widget': 'CircularProgressIndicator',
        viewBox: `0 0 ${size} ${size}`
      },
      style: svgStyle,
      children: [
        new VNode({
          tag: 'circle',
          props: {
            cx: size / 2,
            cy: size / 2,
            r: radius
          },
          style: circleStyle
        })
      ]
    });
  }
}

export class LinearProgressIndicator extends Widget {
  constructor({
    key,
    value, // null for indeterminate
    color,
    backgroundColor,
    minHeight = 4
  } = {}) {
    super({ key });
    this.value = value;
    this.color = color;
    this.backgroundColor = backgroundColor;
    this.minHeight = minHeight;
  }
  
  toVNode(context) {
    const theme = context.theme();
    const color = this.color || theme?.colorScheme?.primary || '#6750a4';
    const bgColor = this.backgroundColor || theme?.colorScheme?.surfaceVariant || '#e7e0ec';
    
    const containerStyle = {
      width: '100%',
      height: `${this.minHeight}px`,
      backgroundColor: StyleConverter.colorToCss(bgColor),
      overflow: 'hidden',
      position: 'relative',
      borderRadius: `${this.minHeight / 2}px`
    };
    
    const barStyle = {
      height: '100%',
      backgroundColor: StyleConverter.colorToCss(color),
      transition: 'width 0.3s'
    };
    
    if (this.value !== null && this.value !== undefined) {
      // Determinate
      const progress = Math.max(0, Math.min(1, this.value));
      barStyle.width = `${progress * 100}%`;
    } else {
      // Indeterminate
      barStyle.position = 'absolute';
      barStyle.width = '40%';
      barStyle.animation = 'fjs-linear-progress 2s ease-in-out infinite';
    }
    
    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-linear-progress',
        'data-widget': 'LinearProgressIndicator'
      },
      style: containerStyle,
      children: [
        new VNode({
          tag: 'div',
          props: { className: 'fjs-linear-progress-bar' },
          style: barStyle
        })
      ]
    });
  }
}
```

**File:** `src/widgets/material/divider.js`

```javascript
export class Divider extends Widget {
  constructor({
    key,
    height = 1,
    thickness = 1,
    color,
    indent = 0,
    endIndent = 0
  } = {}) {
    super({ key });
    this.height = height;
    this.thickness = thickness;
    this.color = color;
    this.indent = indent;
    this.endIndent = endIndent;
  }
  
  toVNode(context) {
    const theme = context.theme();
    const dividerColor = this.color || theme?.colorScheme?.outlineVariant || '#cac4d0';
    
    const style = {
      height: `${this.height}px`,
      borderBottom: `${this.thickness}px solid ${StyleConverter.colorToCss(dividerColor)}`,
      marginLeft: `${this.indent}px`,
      marginRight: `${this.endIndent}px`
    };
    
    return new VNode({
      tag: 'hr',
      props: {
        className: 'fjs-divider',
        'data-widget': 'Divider'
      },
      style
    });
  }
}

export class VerticalDivider extends Widget {
  constructor({
    key,
    width = 1,
    thickness = 1,
    color,
    indent = 0,
    endIndent = 0
  } = {}) {
    super({ key });
    this.width = width;
    this.thickness = thickness;
    this.color = color;
    this.indent = indent;
    this.endIndent = endIndent;
  }
  
  toVNode(context) {
    const theme = context.theme();
    const dividerColor = this.color || theme?.colorScheme?.outlineVariant || '#cac4d0';
    
    const style = {
      width: `${this.width}px`,
      borderRight: `${this.thickness}px solid ${StyleConverter.colorToCss(dividerColor)}`,
      marginTop: `${this.indent}px`,
      marginBottom: `${this.endIndent}px`,
      height: 'auto'
    };
    
    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-vertical-divider',
        'data-widget': 'VerticalDivider'
      },
      style
    });
  }
}
```

---

### 7.3.4 Chip & Badge

**File:** `src/widgets/material/chip.js`

```javascript
export class Chip extends StatelessWidget {
  constructor({
    key,
    label,
    avatar,
    deleteIcon,
    onDeleted,
    backgroundColor,
    padding
  } = {}) {
    super({ key });
    this.label = label;
    this.avatar = avatar;
    this.deleteIcon = deleteIcon;
    this.onDeleted = onDeleted;
    this.backgroundColor = backgroundColor;
    this.padding = padding;
  }
  
  build(context) {
    const theme = context.theme();
    const bgColor = this.backgroundColor || theme?.colorScheme?.surfaceVariant || '#e7e0ec';
    
    const children = [];
    
    // Avatar (leading)
    if (this.avatar) {
      children.push(
        Padding({
          padding: EdgeInsets.only({ right: 8 }),
          child: this.avatar
        })
      );
    }
    
    // Label
    children.push(this.label);
    
    // Delete icon (trailing)
    if (this.onDeleted) {
      children.push(
        Padding({
          padding: EdgeInsets.only({ left: 8 }),
          child: IconButton({
            icon: this.deleteIcon || Icon(Icons.close),
            onPressed: this.onDeleted
          })
        })
      );
    }
    
    return Container({
      padding: this.padding || EdgeInsets.symmetric({ horizontal: 12, vertical: 6 }),
      decoration: new BoxDecoration({
        color: bgColor,
        borderRadius: BorderRadius.circular(16)
      }),
      child: Row({
        mainAxisSize: MainAxisSize.min,
        children: children
      })
    });
  }
}

export class Badge extends StatelessWidget {
  constructor({
    key,
    child,
    label,
    backgroundColor,
    textColor
  } = {}) {
    super({ key });
    this.child = child;
    this.label = label;
    this.backgroundColor = backgroundColor;
    this.textColor = textColor;
  }
  
  build(context) {
    const theme = context.theme();
    const bgColor = this.backgroundColor || theme?.colorScheme?.error || '#ba1a1a';
    const textColor = this.textColor || theme?.colorScheme?.onError || '#ffffff';
    
    return Stack({
      children: [
        this.child,
        
        // Badge positioned at top-right
        Positioned({
          top: 0,
          right: 0,
          child: Container({
            padding: EdgeInsets.symmetric({ horizontal: 6, vertical: 2 }),
            decoration: new BoxDecoration({
              color: bgColor,
              borderRadius: BorderRadius.circular(10)
            }),
            constraints: new BoxConstraints({
              minWidth: 20,
              minHeight: 20
            }),
            child: Center({
              child: Text(String(this.label), {
                style: new TextStyle({
                  color: textColor,
                  fontSize: 12,
                  fontWeight: FontWeight.bold
                })
              })
            })
          })
        })
      ]
    });
  }
}

// Positioned widget for Stack
export class Positioned extends Widget {
  constructor({
    key,
    top,
    right,
    bottom,
    left,
    child
  } = {}) {
    super({ key });
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
    this.child = child;
  }
  
  toVNode(context) {
    const childVNode = this.child.toVNode(context);
    
    const positionStyle = {
      position: 'absolute'
    };
    
    if (this.top !== undefined) positionStyle.top = `${this.top}px`;
    if (this.right !== undefined) positionStyle.right = `${this.right}px`;
    if (this.bottom !== undefined) positionStyle.bottom = `${this.bottom}px`;
    if (this.left !== undefined) positionStyle.left = `${this.left}px`;
    
    childVNode.style = {
      ...childVNode.style,
      ...positionStyle
    };
    
    return childVNode;
  }
}
```

**Phase 7.3 Checklist:**
- [ ] Card with elevation
- [ ] ListTile with leading/trailing
- [ ] Icon with SVG support
- [ ] Image (network & asset)
- [ ] CircularProgressIndicator
- [ ] LinearProgressIndicator
- [ ] Divider & VerticalDivider
- [ ] Chip with avatar & delete
- [ ] Badge with positioning
- [ ] Unit tests (40+ cases)
- [ ] Integration tests (display layouts)

---

## Phase 7.4: Structure & Navigation Widgets (Weeks 7-8)

### Objective
Implement high-level structural widgets that define app layout and navigation.

### 7.4.1 Scaffold & AppBar

**File:** `src/widgets/material/scaffold.js`

```javascript
export class Scaffold extends StatelessWidget {
  constructor({
    key,
    appBar,
    body,
    floatingActionButton,
    floatingActionButtonLocation = FloatingActionButtonLocation.endFloat,
    drawer,
    bottomNavigationBar,
    backgroundColor
  } = {}) {
    super({ key });
    this.appBar = appBar;
    this.body = body;
    this.floatingActionButton = floatingActionButton;
    this.floatingActionButtonLocation = floatingActionButtonLocation;
    this.drawer = drawer;
    this.bottomNavigationBar = bottomNavigationBar;
    this.backgroundColor = backgroundColor;
  }
  
  build(context) {
    const theme = context.theme();
    const bgColor = this.backgroundColor || theme?.colorScheme?.background || '#fffbfe';
    
    const children = [];
    
    // AppBar
    if (this.appBar) {
      children.push(this.appBar);
    }
    
    // Body
    if (this.body) {
      children.push(
        Expanded({
          child: Container({
            color: bgColor,
            child: this.body
          })
        })
      );
    }
    
    // Bottom navigation bar
    if (this.bottomNavigationBar) {
      children.push(this.bottomNavigationBar);
    }
    
    // Main scaffold structure
    const scaffoldContent = Column({
      children: children
    });
    
    // Stack to overlay FAB and drawer
    const stackChildren = [scaffoldContent];
    
    // Floating action button
    if (this.floatingActionButton) {
      stackChildren.push(
        this.buildFAB(this.floatingActionButton, this.floatingActionButtonLocation)
      );
    }
    
    // Drawer (if exists)
    if (this.drawer) {
      stackChildren.push(
        this.buildDrawer(this.drawer)
      );
    }
    
    return Stack({
      children: stackChildren
    });
  }
  
  buildFAB(fab, location) {
    const position = {};
    
    switch (location) {
      case FloatingActionButtonLocation.endFloat:
        position.bottom = 16;
        position.right = 16;
        break;
      case FloatingActionButtonLocation.centerFloat:
        position.bottom = 16;
        position.left = '50%';
        // Note: Need transform for centering
        break;
      case FloatingActionButtonLocation.startFloat:
        position.bottom = 16;
        position.left = 16;
        break;
    }
    
    return Positioned({
      ...position,
      child: fab
    });
  }
  
  buildDrawer(drawer) {
    // Drawer overlay - would need state management for open/close
    return Positioned({
      top: 0,
      left: 0,
      bottom: 0,
      child: drawer
    });
  }
}

export const FloatingActionButtonLocation = {
  endFloat: 'endFloat',
  centerFloat: 'centerFloat',
  startFloat: 'startFloat'
};

export class AppBar extends StatelessWidget {
  constructor({
    key,
    title,
    leading,
    actions = [],
    backgroundColor,
    elevation = 0,
    centerTitle = false
  } = {}) {
    super({ key });
    this.title = title;
    this.leading = leading;
    this.actions = actions;
    this.backgroundColor = backgroundColor;
    this.elevation = elevation;
    this.centerTitle = centerTitle;
  }
  
  build(context) {
    const theme = context.theme();
    const bgColor = this.backgroundColor || theme?.colorScheme?.surface || '#fffbfe';
    
    const children = [];
    
    // Leading widget (usually back button or menu)
    if (this.leading) {
      children.push(
        Padding({
          padding: EdgeInsets.only({ left: 4, right: 8 }),
          child: this.leading
        })
      );
    }
    
    // Title
    if (this.title) {
      children.push(
        this.centerTitle 
          ? Expanded({
              child: Center({ child: this.title })
            })
          : Expanded({ child: this.title })
      );
    }
    
    // Actions
    if (this.actions.length > 0) {
      children.push(
        Row({
          mainAxisSize: MainAxisSize.min,
          children: this.actions.map(action =>
            Padding({
              padding: EdgeInsets.only({ left: 8, right: 4 }),
              child: action
            })
          )
        })
      );
    }
    
    return Container({
      height: 56,
      padding: EdgeInsets.symmetric({ horizontal: 4 }),
      decoration: new BoxDecoration({
        color: bgColor,
        boxShadow: this.elevation > 0 ? [
          new BoxShadow({
            color: Colors.black.withOpacity(0.1),
            offset: { dx: 0, dy: 2 },
            blurRadius: 4
          })
        ] : []
      }),
      child: Row({
        children: children
      })
    });
  }
}

export class FloatingActionButton extends StatelessWidget {
  constructor({
    key,
    onPressed,
    child,
    backgroundColor,
    foregroundColor,
    elevation = 6
  } = {}) {
    super({ key });
    this.onPressed = onPressed;
    this.child = child;
    this.backgroundColor = backgroundColor;
    this.foregroundColor = foregroundColor;
    this.elevation = elevation;
  }
  
  build(context) {
    const theme = context.theme();
    const bgColor = this.backgroundColor || theme?.colorScheme?.primaryContainer || '#eaddff';
    const fgColor = this.foregroundColor || theme?.colorScheme?.onPrimaryContainer || '#21005e';
    
    return new _FABWidget({
      onPressed: this.onPressed,
      child: this.child,
      backgroundColor: bgColor,
      foregroundColor: fgColor,
      elevation: this.elevation,
      enabled: this.onPressed !== null
    });
  }
}

class _FABWidget extends Widget {
  constructor({ onPressed, child, backgroundColor, foregroundColor, elevation, enabled }) {
    super({});
    this.onPressed = onPressed;
    this.child = child;
    this.backgroundColor = backgroundColor;
    this.foregroundColor = foregroundColor;
    this.elevation = elevation;
    this.enabled = enabled;
  }
  
  toVNode(context) {
    const events = {};
    if (this.onPressed && this.enabled) {
      events.click = this.onPressed;
    }
    
    const buttonStyle = {
      width: '56px',
      height: '56px',
      borderRadius: '16px',
      backgroundColor: StyleConverter.colorToCss(this.backgroundColor),
      color: StyleConverter.colorToCss(this.foregroundColor),
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: this.enabled ? 'pointer' : 'not-allowed',
      opacity: this.enabled ? 1 : 0.38,
      boxShadow: this.getElevationShadow(this.elevation),
      transition: 'box-shadow 0.3s, transform 0.1s'
    };
    
    return new VNode({
      tag: 'button',
      props: {
        className: 'fjs-fab',
        'data-widget': 'FloatingActionButton',
        disabled: !this.enabled
      },
      style: buttonStyle,
      events,
      children: [this.child.toVNode(context)]
    });
  }
  
  getElevationShadow(elevation) {
    const shadows = {
      0: 'none',
      3: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      6: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
      12: '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)'
    };
    return shadows[elevation] || shadows[6];
  }
}
```

---

### 7.4.2 Drawer & BottomNavigationBar

**File:** `src/widgets/material/drawer.js`

```javascript
export class Drawer extends StatelessWidget {
  constructor({
    key,
    child,
    backgroundColor,
    width = 304
  } = {}) {
    super({ key });
    this.child = child;
    this.backgroundColor = backgroundColor;
    this.width = width;
  }
  
  build(context) {
    const theme = context.theme();
    const bgColor = this.backgroundColor || theme?.colorScheme?.surface || '#fffbfe';
    
    return Container({
      width: this.width,
      decoration: new BoxDecoration({
        color: bgColor,
        boxShadow: [
          new BoxShadow({
            color: Colors.black.withOpacity(0.2),
            offset: { dx: 2, dy: 0 },
            blurRadius: 8
          })
        ]
      }),
      child: this.child
    });
  }
}

export class BottomNavigationBar extends StatefulWidget {
  constructor({
    key,
    items,
    currentIndex = 0,
    onTap,
    selectedItemColor,
    unselectedItemColor,
    backgroundColor
  } = {}) {
    super({ key });
    this.items = items;
    this.currentIndex = currentIndex;
    this.onTap = onTap;
    this.selectedItemColor = selectedItemColor;
    this.unselectedItemColor = unselectedItemColor;
    this.backgroundColor = backgroundColor;
  }
  
  createState() {
    return new _BottomNavigationBarState();
  }
}

class _BottomNavigationBarState extends State {
  build(context) {
    const theme = context.theme();
    const bgColor = this.widget.backgroundColor || theme?.colorScheme?.surface || '#fffbfe';
    const selectedColor = this.widget.selectedItemColor || theme?.colorScheme?.primary || '#6750a4';
    const unselectedColor = this.widget.unselectedItemColor || theme?.colorScheme?.onSurfaceVariant || '#49454f';
    
    return Container({
      height: 80,
      decoration: new BoxDecoration({
        color: bgColor,
        boxShadow: [
          new BoxShadow({
            color: Colors.black.withOpacity(0.1),
            offset: { dx: 0, dy: -2 },
            blurRadius: 4
          })
        ]
      }),
      child: Row({
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: this.widget.items.map((item, index) =>
          this.buildItem(item, index, selectedColor, unselectedColor)
        )
      })
    });
  }
  
  buildItem(item, index, selectedColor, unselectedColor) {
    const isSelected = index === this.widget.currentIndex;
    const color = isSelected ? selectedColor : unselectedColor;
    
    return Expanded({
      child: new _BottomNavItem({
        icon: item.icon,
        label: item.label,
        color: color,
        isSelected: isSelected,
        onTap: () => {
          if (this.widget.onTap) {
            this.widget.onTap(index);
          }
        }
      })
    });
  }
}

class _BottomNavItem extends Widget {
  constructor({ icon, label, color, isSelected, onTap }) {
    super({});
    this.icon = icon;
    this.label = label;
    this.color = color;
    this.isSelected = isSelected;
    this.onTap = onTap;
  }
  
  toVNode(context) {
    const events = {};
    if (this.onTap) {
      events.click = this.onTap;
    }
    
    const containerStyle = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: '12px 0',
      transition: 'all 0.2s'
    };
    
    const iconVNode = this.icon.toVNode(context);
    iconVNode.style = {
      ...iconVNode.style,
      fill: StyleConverter.colorToCss(this.color)
    };
    
    const labelStyle = {
      fontSize: '12px',
      fontWeight: this.isSelected ? '600' : '400',
      color: StyleConverter.colorToCss(this.color),
      marginTop: '4px'
    };
    
    return new VNode({
      tag: 'div',
      props: {
        className: 'fjs-bottom-nav-item',
        'data-selected': this.isSelected
      },
      style: containerStyle,
      events,
      children: [
        iconVNode,
        new VNode({
          tag: 'span',
          props: { className: 'fjs-bottom-nav-label' },
          style: labelStyle,
          children: [this.label]
        })
      ]
    });
  }
}

export class BottomNavigationBarItem {
  constructor({ icon, label }) {
    this.icon = icon;
    this.label = label;
  }
}
```

---

### 7.4.3 Dialog & SnackBar

**File:** `src/widgets/material/dialog.js`

```javascript
export class AlertDialog extends StatelessWidget {
  constructor({
    key,
    title,
    content,
    actions = []
  } = {}) {
    super({ key });
    this.title = title;
    this.content = content;
    this.actions = actions;
  }
  
  build(context) {
    const theme = context.theme();
    
    return Container({
      width: 280,
      decoration: new BoxDecoration({
        color: theme?.colorScheme?.surface || '#fffbfe',
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          new BoxShadow({
            color: Colors.black.withOpacity(0.3),
            offset: { dx: 0, dy: 8 },
            blurRadius: 16
          })
        ]
      }),
      child: Column({
        mainAxisSize: MainAxisSize.min,
        children: [
          // Title
          if (this.title) {
            Padding({
              padding: EdgeInsets.all(24),
              child: this.title
            })
          },
          
          // Content
          if (this.content) {
            Padding({
              padding: EdgeInsets.symmetric({ horizontal: 24, vertical: 16 }),
              child: this.content
            })
          },
          
          // Actions
          if (this.actions.length > 0) {
            Padding({
              padding: EdgeInsets.all(8),
              child: Row({
                mainAxisAlignment: MainAxisAlignment.end,
                children: this.actions
              })
            })
          }
        ].filter(Boolean)
      })
    });
  }
  
  // Static method to show dialog
  static show(context, dialog) {
    // This would integrate with overlay/modal system
    // For now, return the dialog widget
    return dialog;
  }
}

export class SnackBar extends StatelessWidget {
  constructor({
    key,
    content,
    action,
    duration = 4000,
    backgroundColor
  } = {}) {
    super({ key });
    this.content = content;
    this.action = action;
    this.duration = duration;
    this.backgroundColor = backgroundColor;
  }
  
  build(context) {
    const theme = context.theme();
    const bgColor = this.backgroundColor || theme?.colorScheme?.inverseSurface || '#313033';
    
    const children = [
      Expanded({ child: this.content })
    ];
    
    if (this.action) {
      children.push(
        Padding({
          padding: EdgeInsets.only({ left: 8 }),
          child: this.action
        })
      );
    }
    
    return Container({
      margin: EdgeInsets.all(8),
      padding: EdgeInsets.symmetric({ horizontal: 16, vertical: 14 }),
      decoration: new BoxDecoration({
        color: bgColor,
        borderRadius: BorderRadius.circular(4)
      }),
      child: Row({
        children: children
      })
    });
  }
  
  // Static method to show snackbar
  static show(context, snackbar) {
    // This would integrate with overlay system and auto-hide after duration
    return snackbar;
  }
}
```

---

### 7.4.4 Complete Theme System Integration

**File:** `src/widgets/material/theme.js`

```javascript
export class MaterialApp extends StatelessWidget {
  constructor({
    key,
    title = '',
    theme,
    home,
    routes,
    initialRoute
  } = {}) {
    super({ key });
    this.title = title;
    this.theme = theme || ThemeData.light();
    this.home = home;
    this.routes = routes;
    this.initialRoute = initialRoute;
  }
  
  build(context) {
    // Wrap app in Theme provider
    return Theme({
      data: this.theme,
      child: MediaQuery({
        data: MediaQueryData.fromWindow(),
        child: this.home
      })
    });
  }
}

export class Theme extends InheritedWidget {
  constructor({ data, child, key }) {
    super({ child, key });
    this.data = data;
  }
  
  static of(context) {
    const theme = context.dependOnInheritedWidgetOfExactType(Theme);
    return theme ? theme.data : ThemeData.light();
  }
  
  updateShouldNotify(oldWidget) {
    return this.data !== oldWidget.data;
  }
}

export class ThemeData {
  static light() {
    return new ThemeData({
      brightness: Brightness.light,
      colorScheme: ColorScheme.light()
    });
  }
  
  static dark() {
    return new ThemeData({
      brightness: Brightness.dark,
      colorScheme: ColorScheme.dark()
    });
  }
  
  constructor({
    brightness = Brightness.light,
    colorScheme,
    textTheme,
    iconTheme
  } = {}) {
    this.brightness = brightness;
    this.colorScheme = colorScheme || (brightness === Brightness.light ? ColorScheme.light() : ColorScheme.dark());
    this.textTheme = textTheme || new TextTheme();
    this.iconTheme = iconTheme || new IconThemeData();
  }
}

export class ColorScheme {
  static light() {
    return new ColorScheme({
      primary: Color(0xFF6750A4),
      onPrimary: Color(0xFFFFFFFF),
      primaryContainer: Color(0xFFEADDFF),
      onPrimaryContainer: Color(0xFF21005E),
      secondary: Color(0xFF625B71),
      onSecondary: Color(0xFFFFFFFF),
      secondaryContainer: Color(0xFFE8DEF8),
      onSecondaryContainer: Color(0xFF1E192B),
      surface: Color(0xFFFFFBFE),
      onSurface: Color(0xFF1C1B1F),
      surfaceVariant: Color(0xFFE7E0EC),
      onSurfaceVariant: Color(0xFF49454F),
      outline: Color(0xFF79747E),
      outlineVariant: Color(0xFFCAC4D0),
      background: Color(0xFFFFFBFE),
      onBackground: Color(0xFF1C1B1F),
      error: Color(0xFFBA1A1A),
      onError: Color(0xFFFFFFFF),
      inverseSurface: Color(0xFF313033),
      inverseOnSurface: Color(0xFFF4EFF4),
      inversePrimary: Color(0xFFD0BCFF)
    });
  }
  
  static dark() {
    return new ColorScheme({
      primary: Color(0xFFD0BCFF),
      onPrimary: Color(0xFF381E72),
      primaryContainer: Color(0xFF4F378B),
      onPrimaryContainer: Color(0xFFEADDFF),
      secondary: Color(0xFFCCC2DC),
      onSecondary: Color(0xFF332D41),
      secondaryContainer: Color(0xFF4A4458),
      onSecondaryContainer: Color(0xFFE8DEF8),
      surface: Color(0xFF1```javascript
      surface: Color(0xFF1C1B1F),
      onSurface: Color(0xFFE6E1E5),
      surfaceVariant: Color(0xFF49454F),
      onSurfaceVariant: Color(0xFFCAC4D0),
      outline: Color(0xFF938F99),
      outlineVariant: Color(0xFF49454F),
      background: Color(0xFF1C1B1F),
      onBackground: Color(0xFFE6E1E5),
      error: Color(0xFFF2B8B5),
      onError: Color(0xFF601410),
      inverseSurface: Color(0xFFE6E1E5),
      inverseOnSurface: Color(0xFF313033),
      inversePrimary: Color(0xFF6750A4)
    });
  }
  
  constructor({
    primary,
    onPrimary,
    primaryContainer,
    onPrimaryContainer,
    secondary,
    onSecondary,
    secondaryContainer,
    onSecondaryContainer,
    surface,
    onSurface,
    surfaceVariant,
    onSurfaceVariant,
    outline,
    outlineVariant,
    background,
    onBackground,
    error,
    onError,
    inverseSurface,
    inverseOnSurface,
    inversePrimary
  }) {
    this.primary = primary;
    this.onPrimary = onPrimary;
    this.primaryContainer = primaryContainer;
    this.onPrimaryContainer = onPrimaryContainer;
    this.secondary = secondary;
    this.onSecondary = onSecondary;
    this.secondaryContainer = secondaryContainer;
    this.onSecondaryContainer = onSecondaryContainer;
    this.surface = surface;
    this.onSurface = onSurface;
    this.surfaceVariant = surfaceVariant;
    this.onSurfaceVariant = onSurfaceVariant;
    this.outline = outline;
    this.outlineVariant = outlineVariant;
    this.background = background;
    this.onBackground = onBackground;
    this.error = error;
    this.onError = onError;
    this.inverseSurface = inverseSurface;
    this.inverseOnSurface = inverseOnSurface;
    this.inversePrimary = inversePrimary;
  }
}

export const Brightness = {
  light: 'light',
  dark: 'dark'
};

export class TextTheme {
  constructor({
    displayLarge,
    displayMedium,
    displaySmall,
    headlineLarge,
    headlineMedium,
    headlineSmall,
    titleLarge,
    titleMedium,
    titleSmall,
    bodyLarge,
    bodyMedium,
    bodySmall,
    labelLarge,
    labelMedium,
    labelSmall
  } = {}) {
    // Material Design 3 type scale
    this.displayLarge = displayLarge || new TextStyle({ fontSize: 57, fontWeight: FontWeight.w400 });
    this.displayMedium = displayMedium || new TextStyle({ fontSize: 45, fontWeight: FontWeight.w400 });
    this.displaySmall = displaySmall || new TextStyle({ fontSize: 36, fontWeight: FontWeight.w400 });
    this.headlineLarge = headlineLarge || new TextStyle({ fontSize: 32, fontWeight: FontWeight.w400 });
    this.headlineMedium = headlineMedium || new TextStyle({ fontSize: 28, fontWeight: FontWeight.w400 });
    this.headlineSmall = headlineSmall || new TextStyle({ fontSize: 24, fontWeight: FontWeight.w400 });
    this.titleLarge = titleLarge || new TextStyle({ fontSize: 22, fontWeight: FontWeight.w400 });
    this.titleMedium = titleMedium || new TextStyle({ fontSize: 16, fontWeight: FontWeight.w500 });
    this.titleSmall = titleSmall || new TextStyle({ fontSize: 14, fontWeight: FontWeight.w500 });
    this.bodyLarge = bodyLarge || new TextStyle({ fontSize: 16, fontWeight: FontWeight.w400 });
    this.bodyMedium = bodyMedium || new TextStyle({ fontSize: 14, fontWeight: FontWeight.w400 });
    this.bodySmall = bodySmall || new TextStyle({ fontSize: 12, fontWeight: FontWeight.w400 });
    this.labelLarge = labelLarge || new TextStyle({ fontSize: 14, fontWeight: FontWeight.w500 });
    this.labelMedium = labelMedium || new TextStyle({ fontSize: 12, fontWeight: FontWeight.w500 });
    this.labelSmall = labelSmall || new TextStyle({ fontSize: 11, fontWeight: FontWeight.w500 });
  }
}

export class IconThemeData {
  constructor({
    color,
    size = 24,
    opacity = 1.0
  } = {}) {
    this.color = color;
    this.size = size;
    this.opacity = opacity;
  }
}

// MediaQuery for responsive design
export class MediaQuery extends InheritedWidget {
  constructor({ data, child, key }) {
    super({ child, key });
    this.data = data;
  }
  
  static of(context) {
    const mediaQuery = context.dependOnInheritedWidgetOfExactType(MediaQuery);
    return mediaQuery ? mediaQuery.data : MediaQueryData.fromWindow();
  }
  
  updateShouldNotify(oldWidget) {
    return this.data !== oldWidget.data;
  }
}

export class MediaQueryData {
  static fromWindow() {
    return new MediaQueryData({
      size: new Size(window.innerWidth, window.innerHeight),
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? Orientation.landscape : Orientation.portrait
    });
  }
  
  constructor({
    size,
    devicePixelRatio = 1,
    orientation = Orientation.portrait
  } = {}) {
    this.size = size;
    this.devicePixelRatio = devicePixelRatio;
    this.orientation = orientation;
  }
}

export class Size {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
}

export const Orientation = {
  portrait: 'portrait',
  landscape: 'landscape'
};
```

---

## CSS Animations

**File:** `src/widgets/material/animations.css`

Add CSS animations that widgets reference:

```css
/* Spinning animation for CircularProgressIndicator */
@keyframes fjs-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Linear progress animation */
@keyframes fjs-linear-progress {
  0% {
    left: -40%;
  }
  50% {
    left: 50%;
  }
  100% {
    left: 110%;
  }
}

/* Ripple effect for buttons */
@keyframes fjs-ripple {
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* Fade in animation */
@keyframes fjs-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Slide up animation (for snackbar) */
@keyframes fjs-slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Hover effects */
.fjs-elevated-button:hover {
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
}

.fjs-text-button:hover {
  background-color: rgba(103, 80, 164, 0.08);
}

.fjs-icon-button:hover {
  background-color: rgba(28, 27, 31, 0.08);
}

.fjs-fab:hover {
  box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22);
}

.fjs-fab:active {
  transform: scale(0.95);
}

.fjs-list-tile:hover {
  background-color: rgba(28, 27, 31, 0.08);
}

/* Focus outlines for accessibility */
.fjs-elevated-button:focus-visible,
.fjs-text-button:focus-visible,
.fjs-icon-button:focus-visible,
.fjs-fab:focus-visible {
  outline: 2px solid #6750a4;
  outline-offset: 2px;
}

.fjs-input:focus {
  outline: none;
}

.fjs-checkbox:focus-visible,
.fjs-radio:focus-visible {
  outline: 2px solid #6750a4;
  outline-offset: 2px;
}
```

---

## Phase 7.4 Checklist

- [ ] Scaffold with all slots
- [ ] AppBar with title/actions
- [ ] FloatingActionButton with positions
- [ ] Drawer widget
- [ ] BottomNavigationBar with items
- [ ] AlertDialog
- [ ] SnackBar
- [ ] Complete Theme system
- [ ] MaterialApp wrapper
- [ ] ColorScheme (light & dark)
- [ ] TextTheme with type scale
- [ ] MediaQuery for responsive
- [ ] CSS animations
- [ ] Unit tests (60+ cases)
- [ ] Integration tests (full app layouts)

---

## Implementation Summary

### Widget Count: ~25 Core Widgets

**Layout (9):**
1. Container
2. Row
3. Column
4. Stack
5. Expanded/Flexible
6. Padding
7. Center
8. Align
9. SizedBox

**Interactive (8):**
10. Text
11. ElevatedButton
12. TextButton
13. IconButton
14. TextField
15. Checkbox
16. Switch
17. Radio

**Display (8):**
18. Card
19. ListTile
20. Icon
21. Image
22. CircularProgressIndicator
23. LinearProgressIndicator
24. Divider
25. Chip

**Structure (7):**
26. Scaffold
27. AppBar
28. FloatingActionButton
29. Drawer
30. BottomNavigationBar
31. AlertDialog
32. SnackBar

**System (3):**
33. MaterialApp
34. Theme
35. MediaQuery

**Total: 35 widgets** (focused on most commonly used)

---

## Testing Strategy

### Unit Tests (200+ cases)

**Per Widget Type:**
- Creation with various props
- toVNode() output validation
- Style conversion accuracy
- Event handler attachment
- Theme integration
- Edge cases (null values, etc.)

### Integration Tests (40+ scenarios)

**Layout Tests:**
- Complex nested layouts
- Responsive behavior
- Constraint handling
- Overflow behavior

**Interaction Tests:**
- Button clicks trigger callbacks
- TextField input updates state
- Selection widgets change values
- Form validation

**Theme Tests:**
- Light/dark theme switching
- Color scheme propagation
- Typography application
- Custom theme overrides

**Complete App Tests:**
- Full Scaffold with all elements
- Navigation flows
- Dialog/SnackBar display
- Responsive breakpoints

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Widget creation** | < 1ms | Time to instantiate widget |
| **toVNode conversion** | < 5ms | Widget → VNode transform |
| **Theme lookup** | < 0.1ms | context.theme() call |
| **Button click response** | < 16ms | Click → state update → render |
| **TextField input lag** | < 16ms | Keystroke → UI update |
| **List scrolling** | 60 FPS | Smooth scroll performance |
| **Bundle size (widgets)** | < 40KB | Minified + gzipped |

---

## Success Criteria

**By end of Week 2 (Phase 7.1):**
- ✅ All layout widgets work correctly
- ✅ Nested layouts render properly
- ✅ Flexbox behavior matches Flutter
- ✅ Container decoration complete

**By end of Week 4 (Phase 7.2):**
- ✅ All interactive widgets functional
- ✅ Forms work with validation
- ✅ Text input smooth and responsive
- ✅ Selection widgets update state

**By end of Week 6 (Phase 7.3):**
- ✅ All display widgets render correctly
- ✅ Icons and images load properly
- ✅ Progress indicators animate
- ✅ Cards and lists styled correctly

**By end of Week 8 (Phase 7.4):**
- ✅ Complete app structure works
- ✅ Theme system fully integrated
- ✅ Light/dark themes switch correctly
- ✅ All widgets respect theme
- ✅ Full example app functional
- ✅ Documentation complete

---

## Output Artifacts

By end of Step 7, you'll have:

1. **src/widgets/material/** - Complete widget library
   - container.js, flex.js, stack.js
   - button.js, text-field.js, selection.js
   - card.js, icon.js, image.js, progress.js
   - scaffold.js, drawer.js, dialog.js
   - theme.js
   - animations.css

2. **tests/widgets/** - 200+ unit tests

3. **examples/widgets/** - Widget showcase
   - Layout examples
   - Form examples
   - Theme examples
   - Complete app example

4. **docs/widget-catalog.md** - Widget documentation

5. **Storybook/Demo App** - Interactive widget browser

---

## Example: Complete Counter App

With all Step 7 widgets, the counter app becomes:

```javascript
class MyApp extends StatelessWidget {
  build(context) {
    return MaterialApp({
      theme: ThemeData.light(),
      home: MyHomePage({ title: 'FlutterJS Demo' })
    });
  }
}

class MyHomePage extends StatefulWidget {
  constructor({ title }) {
    super({});
    this.title = title;
  }
  
  createState() {
    return new _MyHomePageState();
  }
}

class _MyHomePageState extends State {
  constructor() {
    super();
    this.counter = 0;
  }
  
  increment() {
    this.setState(() => {
      this.counter++;
    });
  }
  
  build(context) {
    return Scaffold({
      appBar: AppBar({
        title: Text(this.widget.title),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary
      }),
      body: Center({
        child: Column({
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('You have pushed the button this many times:'),
            Text(String(this.counter), {
              style: Theme.of(context).textTheme.headlineMedium
            })
          ]
        })
      }),
      floatingActionButton: FloatingActionButton({
        onPressed: () => this.increment(),
        child: Icon(Icons.add)
      })
    });
  }
}
```

This renders as a fully functional, Material Design 3 compliant web application! 🎉