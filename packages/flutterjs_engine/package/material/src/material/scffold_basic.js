import { StatefulWidget,Element,StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';

// ============================================================================
// ENUMS
// ============================================================================

const FloatingActionButtonLocation = {
  endFloat: 'endFloat',
  endDocked: 'endDocked',
  endTop: 'endTop',
  startFloat: 'startFloat',
  startDocked: 'startDocked',
  startTop: 'startTop',
  centerFloat: 'centerFloat',
  centerDocked: 'centerDocked',
  centerTop: 'centerTop'
};

const DrawerAlignment = {
  start: 'start',
  end: 'end'
};

// ============================================================================
// SNACK BAR CLOSED REASON
// ============================================================================

const SnackBarClosedReason = {
  hide: 'hide',
  remove: 'remove',
  timeout: 'timeout',
  dismiss: 'dismiss'
};

// ============================================================================
// SCAFFOLD FEATURE CONTROLLER
// ============================================================================

class ScaffoldFeatureController {
  constructor(widget, completer, closeCallback) {
    this._widget = widget;
    this._completer = completer;
    this._close = closeCallback;
  }

  get widget() {
    return this._widget;
  }

  get closed() {
    return this._completer.promise;
  }

  close() {
    if (!this._completer.completed) {
      this._completer.resolve(SnackBarClosedReason.dismiss);
    }
    this._close?.();
  }
}

// ============================================================================
// SNACK BAR WIDGET
// ============================================================================

class SnackBar {
  constructor({
    key = null,
    content = null,
    backgroundColor = null,
    elevation = 6,
    margin = null,
    padding = null,
    width = null,
    shape = null,
    behavior = 'fixed',
    action = null,
    duration = 4000,
    animation = null,
    onVisible = null
  } = {}) {
    this.key = key;
    this.content = content;
    this.backgroundColor = backgroundColor || '#323232';
    this.elevation = elevation;
    this.margin = margin;
    this.padding = padding;
    this.width = width;
    this.shape = shape;
    this.behavior = behavior;
    this.action = action;
    this.duration = duration;
    this.animation = animation;
    this.onVisible = onVisible;
  }

  build(context) {
    const style = {
      backgroundColor: this.backgroundColor,
      padding: this.padding ? `${this.padding}px` : '12px 16px',
      borderRadius: '4px',
      boxShadow: `0 ${this.elevation}px 16px rgba(0,0,0,0.12), 0 ${this.elevation}px 16px rgba(0,0,0,0.24)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      color: 'white',
      fontSize: '14px',
      minHeight: '48px',
      maxWidth: this.width ? `${this.width}px` : '568px',
      position: this.behavior === 'floating' ? 'fixed' : 'relative',
      zIndex: 1000
    };

    if (this.margin) {
      style.margin = `${this.margin}px`;
    }

    const contentVNode = this.content?.createElement?.(context.element, context.element.runtime)
      ? this.content.createElement(context.element, context.element.runtime).performRebuild()
      : new VNode({ tag: 'span', children: [String(this.content)] });

    const children = [contentVNode];

    if (this.action) {
      const actionStyle = {
        color: '#2196F3',
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        padding: '8px',
        fontSize: '14px',
        fontWeight: 'bold'
      };

      children.push(
        new VNode({
          tag: 'button',
          props: {
            style: actionStyle,
            onClick: this.action.onPressed
          },
          children: [this.action.label]
        })
      );
    }

    return new VNode({
      tag: 'div',
      props: {
        style,
        'data-widget': 'SnackBar'
      },
      children
    });
  }
}

// ============================================================================
// SCAFFOLD STATE
// ============================================================================

class ScaffoldState extends Element {
  constructor(widget) {
    super(widget);
    this._snackBars = [];
    this._currentSnackBar = null;
    this._snackBarTimer = null;
    this._drawerOpen = false;
    this._endDrawerOpen = false;
    this._fabVisible = true;
  }

  /**
   * Show snack bar
   */
  showSnackBar(snackBar) {
    // Clear previous snack bar timer
    if (this._snackBarTimer) {
      clearTimeout(this._snackBarTimer);
      this._snackBarTimer = null;
    }

    const completer = {
      resolve: null,
      reject: null,
      completed: false,
      promise: new Promise((resolve, reject) => {
        completer.resolve = (value) => {
          completer.completed = true;
          resolve(value);
        };
        completer.reject = reject;
      })
    };

    const controller = new ScaffoldFeatureController(
      snackBar,
      completer,
      () => this._hideSnackBar()
    );

    this._currentSnackBar = controller;
    this._snackBars.push(controller);

    // Auto-hide after duration
    this._snackBarTimer = setTimeout(() => {
      if (!completer.completed) {
        completer.resolve(SnackBarClosedReason.timeout);
      }
      this._hideSnackBar();
    }, snackBar.duration);

    this.markNeedsBuild();

    return controller;
  }

  /**
   * Hide current snack bar
   */
  _hideSnackBar() {
    if (this._snackBarTimer) {
      clearTimeout(this._snackBarTimer);
      this._snackBarTimer = null;
    }

    this._snackBars.shift();
    this._currentSnackBar = this._snackBars.length > 0 ? this._snackBars[0] : null;

    this.markNeedsBuild();
  }

  /**
   * Close snack bar
   */
  closeSnackBar() {
    if (this._currentSnackBar) {
      this._currentSnackBar.close();
    }
  }

  /**
   * Open drawer
   */
  openDrawer() {
    this._drawerOpen = true;
    this.markNeedsBuild();
  }

  /**
   * Close drawer
   */
  closeDrawer() {
    this._drawerOpen = false;
    this.markNeedsBuild();
  }

  /**
   * Toggle drawer
   */
  toggleDrawer() {
    this._drawerOpen = !this._drawerOpen;
    this.markNeedsBuild();
  }

  /**
   * Open end drawer
   */
  openEndDrawer() {
    this._endDrawerOpen = true;
    this.markNeedsBuild();
  }

  /**
   * Close end drawer
   */
  closeEndDrawer() {
    this._endDrawerOpen = false;
    this.markNeedsBuild();
  }

  /**
   * Check if drawer is open
   */
  get isDrawerOpen() {
    return this._drawerOpen;
  }

  /**
   * Check if end drawer is open
   */
  get isEndDrawerOpen() {
    return this._endDrawerOpen;
  }

  /**
   * Show FAB
   */
  showFloatingActionButton() {
    this._fabVisible = true;
    this.markNeedsBuild();
  }

  /**
   * Hide FAB
   */
  hideFloatingActionButton() {
    this._fabVisible = false;
    this.markNeedsBuild();
  }

  performRebuild() {
    return this.widget.build(this.context);
  }
}

// ============================================================================
// SCAFFOLD WIDGET
// ============================================================================

class Scaffold extends StatefulWidget {
  constructor({
    key = null,
    appBar = null,
    body = null,
    floatingActionButton = null,
    floatingActionButtonLocation = FloatingActionButtonLocation.endFloat,
    drawer = null,
    endDrawer = null,
    bottomNavigationBar = null,
    backgroundColor = null,
    resizeToAvoidBottomInset = true,
    extendBody = false,
    extendBodyBehindAppBar = false,
    primary = true
  } = {}) {
    super(key);

    this.appBar = appBar;
    this.body = body;
    this.floatingActionButton = floatingActionButton;
    this.floatingActionButtonLocation = floatingActionButtonLocation;
    this.drawer = drawer;
    this.endDrawer = endDrawer;
    this.bottomNavigationBar = bottomNavigationBar;
    this.backgroundColor = backgroundColor || '#ffffff';
    this.resizeToAvoidBottomInset = resizeToAvoidBottomInset;
    this.extendBody = extendBody;
    this.extendBodyBehindAppBar = extendBodyBehindAppBar;
    this.primary = primary;
  }

  /**
   * Get scaffold state from context
   */
  static of(context) {
    const state = context.findAncestorStateOfType?.(ScaffoldState);
    if (!state) {
      throw new Error('Scaffold.of() called with a context that does not contain a Scaffold');
    }
    return state;
  }

  /**
   * Maybe get scaffold state
   */
  static maybeOf(context) {
    return context?.findAncestorStateOfType?.(ScaffoldState);
  }

  build(context) {
    const elementId = context.element.getElementId();
    const widgetPath = context.element.getWidgetPath();

    let appBarHeight = this.appBar ? 56 : 0;
    let bodyTop = appBarHeight;
    let bodyBottom = this.bottomNavigationBar ? 56 : 0;

    if (this.extendBodyBehindAppBar) {
      bodyTop = 0;
    }

    // Build app bar
    let appBarVNode = null;
    if (this.appBar) {
      const appBarElement = this.appBar.createElement(context.element, context.element.runtime);
      appBarElement.mount(context.element);
      appBarVNode = appBarElement.performRebuild();
    }

    // Build body
    let bodyVNode = null;
    if (this.body) {
      const bodyElement = this.body.createElement(context.element, context.element.runtime);
      bodyElement.mount(context.element);
      bodyVNode = bodyElement.performRebuild();
    }

    // Build bottom navigation bar
    let bottomNavVNode = null;
    if (this.bottomNavigationBar) {
      const bottomNavElement = this.bottomNavigationBar.createElement(context.element, context.element.runtime);
      bottomNavElement.mount(context.element);
      bottomNavVNode = bottomNavElement.performRebuild();
    }

    // Build floating action button
    let fabVNode = null;
    if (this.floatingActionButton) {
      const fabElement = this.floatingActionButton.createElement(context.element, context.element.runtime);
      fabElement.mount(context.element);
      fabVNode = fabElement.performRebuild();
    }

    // Build drawer
    let drawerVNode = null;
    if (this.drawer) {
      const drawerElement = this.drawer.createElement(context.element, context.element.runtime);
      drawerElement.mount(context.element);
      drawerVNode = drawerElement.performRebuild();
    }

    // Build end drawer
    let endDrawerVNode = null;
    if (this.endDrawer) {
      const endDrawerElement = this.endDrawer.createElement(context.element, context.element.runtime);
      endDrawerElement.mount(context.element);
      endDrawerVNode = endDrawerElement.performRebuild();
    }

    const scaffoldStyle = {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      position: 'relative',
      backgroundColor: this.backgroundColor
    };

    const appBarContainerStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: `${appBarHeight}px`,
      zIndex: 100
    };

    const bodyContainerStyle = {
      flex: 1,
      position: 'relative',
      marginTop: `${bodyTop}px`,
      marginBottom: `${bodyBottom}px`,
      overflowY: this.resizeToAvoidBottomInset ? 'auto' : 'visible',
      overflowX: 'hidden'
    };

    const bottomNavContainerStyle = {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: `${bodyBottom}px`,
      backgroundColor: '#fff',
      borderTop: '1px solid #e0e0e0',
      zIndex: 50
    };

    const fabContainerStyle = this._getFabContainerStyle();

    const drawerContainerStyle = {
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: '256px',
      backgroundColor: '#fff',
      boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
      zIndex: 200,
      transform: 'translateX(-100%)',
      transition: 'transform 0.3s ease-out',
      display: this.drawer && (context.element?.state?._drawerOpen || false) ? 'block' : 'none'
    };

    if (context.element?.state?._drawerOpen) {
      drawerContainerStyle.transform = 'translateX(0)';
    }

    const endDrawerContainerStyle = {
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '256px',
      backgroundColor: '#fff',
      boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
      zIndex: 200,
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease-out',
      display: this.endDrawer && (context.element?.state?._endDrawerOpen || false) ? 'block' : 'none'
    };

    if (context.element?.state?._endDrawerOpen) {
      endDrawerContainerStyle.transform = 'translateX(0)';
    }

    const scrimStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 150,
      display: (context.element?.state?._drawerOpen || context.element?.state?._endDrawerOpen) ? 'block' : 'none',
      cursor: 'pointer',
      onClick: () => {
        if (context.element?.state?._drawerOpen) {
          context.element.state.closeDrawer();
        }
        if (context.element?.state?._endDrawerOpen) {
          context.element.state.closeEndDrawer();
        }
      }
    };

    return new VNode({
      tag: 'div',
      props: {
        style: scaffoldStyle,
        'data-element-id': elementId,
        'data-widget-path': widgetPath,
        'data-widget': 'Scaffold'
      },
      children: [
        // App bar
        ...(appBarVNode ? [new VNode({
          tag: 'div',
          props: { style: appBarContainerStyle },
          children: [appBarVNode]
        })] : []),

        // Body
        ...(bodyVNode ? [new VNode({
          tag: 'div',
          props: { style: bodyContainerStyle },
          children: [bodyVNode]
        })] : []),

        // Bottom navigation bar
        ...(bottomNavVNode ? [new VNode({
          tag: 'div',
          props: { style: bottomNavContainerStyle },
          children: [bottomNavVNode]
        })] : []),

        // Floating action button
        ...(fabVNode ? [new VNode({
          tag: 'div',
          props: { style: fabContainerStyle },
          children: [fabVNode]
        })] : []),

        // Drawer scrim
        new VNode({
          tag: 'div',
          props: { style: scrimStyle }
        }),

        // Drawer
        ...(drawerVNode ? [new VNode({
          tag: 'div',
          props: { style: drawerContainerStyle },
          children: [drawerVNode]
        })] : []),

        // End drawer
        ...(endDrawerVNode ? [new VNode({
          tag: 'div',
          props: { style: endDrawerContainerStyle },
          children: [endDrawerVNode]
        })] : []),

        // Snack bar
        ...(context.element?.state?._currentSnackBar ? [
          new VNode({
            tag: 'div',
            props: {
              style: {
                position: 'fixed',
                bottom: '16px',
                left: '16px',
                right: 'auto',
                zIndex: 300,
                animation: 'slideUp 0.3s ease-out'
              }
            },
            children: [context.element.state._currentSnackBar.widget.build(context)]
          })
        ] : [])
      ],
      key: this.key
    });
  }

  /**
   * Get FAB container style based on location
   * @private
   */
  _getFabContainerStyle() {
    const baseStyle = {
      position: 'fixed',
      zIndex: 250
    };

    const spacing = 16;

    switch (this.floatingActionButtonLocation) {
      case FloatingActionButtonLocation.endFloat:
        return { ...baseStyle, bottom: `${spacing}px`, right: `${spacing}px` };
      case FloatingActionButtonLocation.endDocked:
        return { ...baseStyle, bottom: '72px', right: `${spacing}px` };
      case FloatingActionButtonLocation.endTop:
        return { ...baseStyle, top: '80px', right: `${spacing}px` };
      case FloatingActionButtonLocation.startFloat:
        return { ...baseStyle, bottom: `${spacing}px`, left: `${spacing}px` };
      case FloatingActionButtonLocation.startDocked:
        return { ...baseStyle, bottom: '72px', left: `${spacing}px` };
      case FloatingActionButtonLocation.startTop:
        return { ...baseStyle, top: '80px', left: `${spacing}px` };
      case FloatingActionButtonLocation.centerFloat:
        return { ...baseStyle, bottom: `${spacing}px`, left: '50%', transform: 'translateX(-50%)' };
      case FloatingActionButtonLocation.centerDocked:
        return { ...baseStyle, bottom: '72px', left: '50%', transform: 'translateX(-50%)' };
      case FloatingActionButtonLocation.centerTop:
        return { ...baseStyle, top: '80px', left: '50%', transform: 'translateX(-50%)' };
      default:
        return { ...baseStyle, bottom: `${spacing}px`, right: `${spacing}px` };
    }
  }

  debugFillProperties(properties) {
    super.debugFillProperties(properties);
    properties.push({ name: 'appBar', value: this.appBar ? 'AppBar' : 'null' });
    properties.push({ name: 'body', value: this.body ? 'Widget' : 'null' });
    properties.push({ name: 'floatingActionButton', value: this.floatingActionButton ? 'FAB' : 'null' });
    properties.push({ name: 'drawer', value: this.drawer ? 'Drawer' : 'null' });
    properties.push({ name: 'bottomNavigationBar', value: this.bottomNavigationBar ? 'BottomNav' : 'null' });
  }

  createElement(parent, runtime) {
    return new ScaffoldElement(this,parent, runtime);
  }
}

class ScaffoldElement extends ScaffoldState {
  constructor(widget) {
    super(widget);
  }

  mount(parent = null) {
    super.mount(parent);
  }

  build(context) {
    return this.widget.build(this.context);
  }
}

 class AppBar extends StatelessWidget {
  constructor({ title, backgroundColor } = {}) {
    super({ title, backgroundColor });
    this.title = title;
    this.backgroundColor = backgroundColor;
  }

  build(context) {
    return new VNode(
      'div',
      {
        className: 'flutter-appbar',
        style: {
          backgroundColor: this.backgroundColor || 'var(--md-sys-color-primary)',
          color: '#FFFFFF',
          padding: '16px',
          fontSize: '20px',
          fontWeight: 'bold',
        },
      },
      [this.title]
    );
  }
}



// ============================================================================
// EXPORTS
// ============================================================================

export {
  Scaffold,
  ScaffoldState,
  ScaffoldElement,
  SnackBar,
  SnackBarClosedReason,
  ScaffoldFeatureController,
  FloatingActionButtonLocation,
  DrawerAlignment,
  AppBar
};