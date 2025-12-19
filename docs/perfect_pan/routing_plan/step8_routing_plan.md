# Step 8: Routing & Navigation - Production Plan

## Overview

Step 8 builds the **routing and navigation system** that enables multi-page applications in FlutterJS. This includes route management, navigation history, page transitions, deep linking, and the Navigator widget system.

**Current Status:**
- ✅ Step 1-3: Analyzer complete (metadata extraction)
- ✅ Step 4: VNode system complete (rendering, diffing, hydration)
- ✅ Step 5: Runtime system complete (state, lifecycle, context)
- ✅ Step 6: Build system complete
- ✅ Step 7: Material widgets complete
- ❌ Step 8: Routing system needs implementation

**Goal:** Complete a production-ready routing system that:
1. Manages navigation stack (push, pop, replace)
2. Handles route definitions and matching
3. Supports named routes and route parameters
4. Implements page transitions and animations
5. Enables deep linking and URL management
6. Provides Navigator widget and context integration

---

## Step 8 Breakdown (4 Major Phases)

```
Step 8: Routing & Navigation
│
├── Phase 8.1: Core Router Engine (Weeks 1-2)
│   ├── Route definition system
│   ├── Route matching and parsing
│   ├── Navigation stack management
│   ├── History API integration
│   └── Browser URL synchronization
│
├── Phase 8.2: Navigator Widget System (Weeks 3-4)
│   ├── Navigator widget implementation
│   ├── MaterialPageRoute and page builders
│   ├── Route transition animations
│   ├── Modal routes and dialogs
│   └── Navigation observers
│
├── Phase 8.3: Advanced Routing Features (Weeks 5-6)
│   ├── Named routes system
│   ├── Route parameters and arguments
│   ├── Deep linking support
│   ├── Route guards and middleware
│   └── Nested navigation
│
└── Phase 8.4: Integration & Optimization (Weeks 7-8)
    ├── MaterialApp router integration
    ├── Code splitting per route
    ├── Lazy loading routes
    ├── SEO optimization for routes
    └── Complete integration testing
```

---

## Phase 8.1: Core Router Engine (Weeks 1-2)

### Objective
Build the foundational routing engine that manages navigation state, matches routes, and coordinates with the browser's History API.

### 8.1.1 Router Architecture

**File:** `src/router/router-engine.js`

**Core Concepts:**

```
Route Definition                 Route Matching               Navigation Stack
    HomePage                         /                           [HomePage]
    AboutPage                        /about                      ↓
    UserProfile                      /user/:id                   [HomePage, AboutPage]
    Settings                         /settings                   ↓
                                                                [HomePage, AboutPage, UserProfile]
```

**Key Principle:**
- **Routes** are configuration objects (immutable)
- **Navigation stack** is the history of pages (mutable)
- **Router** coordinates between routes, stack, and browser URL

**Router Structure:**

```javascript
class RouterEngine {
  constructor(options = {}) {
    this.routes = new Map();           // path → Route config
    this.navigationStack = [];         // Array of active routes
    this.currentRoute = null;          // Current active route
    
    this.history = window.history;     // Browser History API
    this.baseUrl = options.baseUrl || '';
    
    this.observers = [];               // Navigation observers
    this.guards = [];                  // Route guards
    
    // Configuration
    this.mode = options.mode || 'history'; // 'history' or 'hash'
    this.initialRoute = options.initialRoute || '/';
    
    this.initialized = false;
  }
  
  // Initialize router and setup listeners
  initialize() {
    if (this.initialized) return;
    
    // Setup history listeners
    window.addEventListener('popstate', (event) => {
      this.handlePopState(event);
    });
    
    // Handle initial route
    const initialPath = this.getCurrentPath();
    this.navigateToPath(initialPath, { replace: true, initial: true });
    
    this.initialized = true;
  }
  
  // Register a route
  registerRoute(path, config) {
    const route = new Route(path, config);
    this.routes.set(path, route);
    return route;
  }
  
  // Navigate to a path
  async navigateToPath(path, options = {}) {
    // Parse path and query params
    const { pathname, query, hash } = this.parsePath(path);
    
    // Find matching route
    const match = this.matchRoute(pathname);
    if (!match) {
      console.error(`No route found for path: ${pathname}`);
      return false;
    }
    
    // Check route guards
    const canNavigate = await this.checkGuards(match, options);
    if (!canNavigate) return false;
    
    // Build route with params
    const route = this.buildRoute(match, query, hash);
    
    // Notify observers (willNavigate)
    this.notifyObservers('willNavigate', { from: this.currentRoute, to: route });
    
    // Update navigation stack
    if (options.replace) {
      this.replaceRoute(route);
    } else if (options.pop) {
      this.popRoute();
    } else {
      this.pushRoute(route);
    }
    
    // Update browser URL
    this.updateBrowserUrl(path, options);
    
    // Update current route
    this.currentRoute = route;
    
    // Notify observers (didNavigate)
    this.notifyObservers('didNavigate', { from: this.currentRoute, to: route });
    
    return true;
  }
  
  // Push route onto stack
  pushRoute(route) {
    this.navigationStack.push(route);
  }
  
  // Replace current route
  replaceRoute(route) {
    if (this.navigationStack.length > 0) {
      this.navigationStack[this.navigationStack.length - 1] = route;
    } else {
      this.navigationStack.push(route);
    }
  }
  
  // Pop route from stack
  popRoute() {
    if (this.navigationStack.length > 1) {
      return this.navigationStack.pop();
    }
    return null;
  }
  
  // Match path to route definition
  matchRoute(pathname) {
    for (const [pattern, route] of this.routes.entries()) {
      const match = this.matchPattern(pattern, pathname);
      if (match) {
        return { route, params: match.params };
      }
    }
    return null;
  }
  
  // Match path pattern (supports :param and *)
  matchPattern(pattern, path) {
    // Convert pattern to regex
    const paramNames = [];
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
    
    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);
    
    if (!match) return null;
    
    // Extract params
    const params = {};
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1];
    });
    
    return { params };
  }
  
  // Parse path into components
  parsePath(path) {
    const url = new URL(path, window.location.origin);
    return {
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams),
      hash: url.hash.slice(1)
    };
  }
  
  // Build route with params
  buildRoute(match, query, hash) {
    return {
      route: match.route,
      params: match.params,
      query: query,
      hash: hash,
      path: this.buildPath(match.route.path, match.params, query, hash)
    };
  }
  
  // Build path from params
  buildPath(pattern, params, query, hash) {
    let path = pattern;
    
    // Replace params
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
    
    // Add query params
    if (Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      path += `?${queryString}`;
    }
    
    // Add hash
    if (hash) {
      path += `#${hash}`;
    }
    
    return path;
  }
  
  // Update browser URL
  updateBrowserUrl(path, options = {}) {
    const fullPath = this.baseUrl + path;
    
    if (this.mode === 'history') {
      if (options.replace) {
        this.history.replaceState(null, '', fullPath);
      } else {
        this.history.pushState(null, '', fullPath);
      }
    } else if (this.mode === 'hash') {
      window.location.hash = path;
    }
  }
  
  // Handle browser back/forward
  handlePopState(event) {
    const path = this.getCurrentPath();
    this.navigateToPath(path, { pop: true, fromPopState: true });
  }
  
  // Get current browser path
  getCurrentPath() {
    if (this.mode === 'history') {
      return window.location.pathname + window.location.search + window.location.hash;
    } else {
      return window.location.hash.slice(1) || '/';
    }
  }
  
  // Check route guards
  async checkGuards(match, options) {
    for (const guard of this.guards) {
      const canNavigate = await guard(match, this.currentRoute, options);
      if (!canNavigate) return false;
    }
    return true;
  }
  
  // Register guard
  addGuard(guard) {
    this.guards.push(guard);
  }
  
  // Register observer
  addObserver(observer) {
    this.observers.push(observer);
  }
  
  // Notify observers
  notifyObservers(event, data) {
    this.observers.forEach(observer => {
      if (observer[event]) {
        observer[event](data);
      }
    });
  }
  
  // Navigate programmatically
  push(path) {
    return this.navigateToPath(path);
  }
  
  replace(path) {
    return this.navigateToPath(path, { replace: true });
  }
  
  pop() {
    if (this.navigationStack.length > 1) {
      window.history.back();
      return true;
    }
    return false;
  }
  
  // Go back n steps
  go(delta) {
    window.history.go(delta);
  }
  
  // Check if can go back
  canPop() {
    return this.navigationStack.length > 1;
  }
  
  // Get navigation stack
  getStack() {
    return [...this.navigationStack];
  }
  
  // Dispose router
  dispose() {
    window.removeEventListener('popstate', this.handlePopState);
    this.routes.clear();
    this.navigationStack = [];
    this.observers = [];
    this.guards = [];
  }
}
```

**Validation:**
- ✅ Router initializes correctly
- ✅ Routes registered successfully
- ✅ Path matching works (static and dynamic)
- ✅ Navigation stack maintained
- ✅ Browser URL synchronized
- ✅ Back/forward buttons work

---

### 8.1.2 Route Definition System

**File:** `src/router/route.js`

**Route Class:**

```javascript
class Route {
  constructor(path, config) {
    this.path = path;                  // Route pattern
    this.name = config.name || null;   // Named route
    this.builder = config.builder;     // Page builder function
    this.component = config.component; // Widget class
    
    this.meta = config.meta || {};     // Metadata (title, auth, etc.)
    this.transition = config.transition || 'default';
    
    this.guards = config.guards || []; // Route-specific guards
    this.redirect = config.redirect;   // Redirect target
    
    this.children = config.children || []; // Nested routes
  }
  
  // Build page widget
  buildPage(context, params, query) {
    if (this.builder) {
      return this.builder(context, params, query);
    } else if (this.component) {
      return new this.component({ params, query });
    }
    throw new Error(`Route ${this.path} has no builder or component`);
  }
  
  // Check if route matches path
  matches(path) {
    // Implemented in RouterEngine.matchPattern
  }
}
```

**Route Configuration Format:**

```javascript
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: 'Home', requiresAuth: false }
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
    meta: { title: 'About' }
  },
  {
    path: '/user/:id',
    name: 'userProfile',
    builder: (context, params, query) => {
      return UserProfilePage({ userId: params.id });
    },
    meta: { title: 'User Profile', requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsPage,
    children: [
      {
        path: '/settings/account',
        name: 'accountSettings',
        component: AccountSettingsPage
      },
      {
        path: '/settings/privacy',
        name: 'privacySettings',
        component: PrivacySettingsPage
      }
    ]
  },
  {
    path: '/old-path',
    redirect: '/new-path'
  },
  {
    path: '*',
    name: 'notFound',
    component: NotFoundPage
  }
];
```

**Validation:**
- ✅ Route creation from config
- ✅ Builder function execution
- ✅ Component instantiation
- ✅ Metadata access
- ✅ Nested routes support

---

### 8.1.3 History Management

**File:** `src/router/history-manager.js`

**Browser History API Integration:**

```javascript
class HistoryManager {
  constructor(router) {
    this.router = router;
    this.entries = [];           // History entries
    this.currentIndex = -1;      // Current position
    
    this.listeners = [];
  }
  
  // Push new entry
  push(entry) {
    // Remove forward history if navigating from middle
    if (this.currentIndex < this.entries.length - 1) {
      this.entries.splice(this.currentIndex + 1);
    }
    
    this.entries.push(entry);
    this.currentIndex++;
    
    this.notifyListeners('push', entry);
  }
  
  // Replace current entry
  replace(entry) {
    if (this.currentIndex >= 0) {
      this.entries[this.currentIndex] = entry;
    } else {
      this.entries.push(entry);
      this.currentIndex = 0;
    }
    
    this.notifyListeners('replace', entry);
  }
  
  // Go back
  back() {
    if (this.canGoBack()) {
      this.currentIndex--;
      const entry = this.entries[this.currentIndex];
      this.notifyListeners('back', entry);
      return entry;
    }
    return null;
  }
  
  // Go forward
  forward() {
    if (this.canGoForward()) {
      this.currentIndex++;
      const entry = this.entries[this.currentIndex];
      this.notifyListeners('forward', entry);
      return entry;
    }
    return null;
  }
  
  // Go to specific index
  go(delta) {
    const newIndex = this.currentIndex + delta;
    if (newIndex >= 0 && newIndex < this.entries.length) {
      this.currentIndex = newIndex;
      const entry = this.entries[this.currentIndex];
      this.notifyListeners('go', entry);
      return entry;
    }
    return null;
  }
  
  // Check if can go back
  canGoBack() {
    return this.currentIndex > 0;
  }
  
  // Check if can go forward
  canGoForward() {
    return this.currentIndex < this.entries.length - 1;
  }
  
  // Get current entry
  current() {
    return this.entries[this.currentIndex] || null;
  }
  
  // Get all entries
  getEntries() {
    return [...this.entries];
  }
  
  // Clear history
  clear() {
    this.entries = [];
    this.currentIndex = -1;
  }
  
  // Add listener
  addListener(listener) {
    this.listeners.push(listener);
  }
  
  // Notify listeners
  notifyListeners(action, entry) {
    this.listeners.forEach(listener => listener(action, entry));
  }
}

// History Entry
class HistoryEntry {
  constructor(route, state = {}) {
    this.route = route;
    this.state = state;           // Page state snapshot
    this.timestamp = Date.now();
    this.scrollPosition = { x: 0, y: 0 };
  }
  
  // Save scroll position
  saveScrollPosition() {
    this.scrollPosition = {
      x: window.scrollX,
      y: window.scrollY
    };
  }
  
  // Restore scroll position
  restoreScrollPosition() {
    window.scrollTo(this.scrollPosition.x, this.scrollPosition.y);
  }
}
```

**Validation:**
- ✅ History entries tracked
- ✅ Back/forward navigation
- ✅ Scroll position restoration
- ✅ State preservation

---

## Phase 8.2: Navigator Widget System (Weeks 3-4)

### Objective
Implement Flutter-style Navigator widget that manages routes declaratively and provides imperative navigation methods.

### 8.2.1 Navigator Widget

**File:** `src/widgets/navigator.js`

```javascript
class Navigator extends StatefulWidget {
  constructor({ 
    initialRoute = '/',
    onGenerateRoute,
    onUnknownRoute,
    observers = [],
    key 
  }) {
    super({ key });
    this.initialRoute = initialRoute;
    this.onGenerateRoute = onGenerateRoute;
    this.onUnknownRoute = onUnknownRoute;
    this.observers = observers;
  }
  
  createState() {
    return new _NavigatorState();
  }
  
  // Static method: Navigator.of(context)
  static of(context) {
    const navigatorState = context.findAncestorStateOfType(_NavigatorState);
    if (!navigatorState) {
      throw new Error('Navigator.of() called with a context that does not contain a Navigator');
    }
    return navigatorState;
  }
  
  // Static method: Navigator.push(context, route)
  static push(context, route) {
    return Navigator.of(context).push(route);
  }
  
  // Static method: Navigator.pop(context, result)
  static pop(context, result) {
    return Navigator.of(context).pop(result);
  }
  
  // Static method: Navigator.pushNamed(context, routeName, arguments)
  static pushNamed(context, routeName, { arguments: args } = {}) {
    return Navigator.of(context).pushNamed(routeName, { arguments: args });
  }
  
  // Static method: Navigator.pushReplacementNamed
  static pushReplacementNamed(context, routeName, { arguments: args, result } = {}) {
    return Navigator.of(context).pushReplacementNamed(routeName, { arguments: args, result });
  }
  
  // Static method: Navigator.popUntil
  static popUntil(context, predicate) {
    return Navigator.of(context).popUntil(predicate);
  }
  
  // Static method: Navigator.canPop
  static canPop(context) {
    return Navigator.of(context).canPop();
  }
}

class _NavigatorState extends State {
  constructor() {
    super();
    this._overlay = [];          // Stack of routes
    this._router = null;          // Router engine
    this._history = [];           // Navigation history
  }
  
  initState() {
    // Initialize router
    this._router = new RouterEngine({
      initialRoute: this.widget.initialRoute,
      mode: 'history'
    });
    
    // Register routes from onGenerateRoute
    this._setupRoutes();
    
    // Initialize router
    this._router.initialize();
    
    // Add observers
    this.widget.observers.forEach(observer => {
      this._router.addObserver(observer);
    });
  }
  
  _setupRoutes() {
    // Route generation handled by onGenerateRoute callback
  }
  
  // Push new route
  async push(route) {
    const routeEntry = this._createRouteEntry(route);
    this._overlay.push(routeEntry);
    
    // Animate in
    await this._transitionIn(routeEntry);
    
    this.setState({});
    return routeEntry.route;
  }
  
  // Pop current route
  async pop(result) {
    if (!this.canPop()) return false;
    
    const routeEntry = this._overlay.pop();
    
    // Animate out
    await this._transitionOut(routeEntry);
    
    // Pass result to previous route
    if (this._overlay.length > 0) {
      const previousRoute = this._overlay[this._overlay.length - 1];
      if (previousRoute.onResult) {
        previousRoute.onResult(result);
      }
    }
    
    this.setState({});
    return true;
  }
  
  // Push named route
  async pushNamed(routeName, { arguments: args } = {}) {
    const route = this._generateRoute(routeName, args);
    if (!route) {
      return this._handleUnknownRoute(routeName);
    }
    return this.push(route);
  }
  
  // Push and replace current route
  async pushReplacement(route, { result } = {}) {
    const currentRoute = this._overlay[this._overlay.length - 1];
    
    await this.pop(result);
    await this.push(route);
  }
  
  // Push named and replace
  async pushReplacementNamed(routeName, { arguments: args, result } = {}) {
    const route = this._generateRoute(routeName, args);
    if (!route) {
      return this._handleUnknownRoute(routeName);
    }
    return this.pushReplacement(route, { result });
  }
  
  // Pop until predicate
  async popUntil(predicate) {
    while (this._overlay.length > 1) {
      const currentRoute = this._overlay[this._overlay.length - 1];
      if (predicate(currentRoute.route)) {
        break;
      }
      await this.pop();
    }
  }
  
  // Check if can pop
  canPop() {
    return this._overlay.length > 1;
  }
  
  // Generate route from name
  _generateRoute(routeName, args) {
    if (this.widget.onGenerateRoute) {
      const settings = new RouteSettings(routeName, args);
      return this.widget.onGenerateRoute(settings);
    }
    return null;
  }
  
  // Handle unknown route
  _handleUnknownRoute(routeName) {
    if (this.widget.onUnknownRoute) {
      const settings = new RouteSettings(routeName);
      return this.widget.onUnknownRoute(settings);
    }
    throw new Error(`No route defined for ${routeName}`);
  }
  
  // Create route entry
  _createRouteEntry(route) {
    return {
      route: route,
      element: null,
      animation: null,
      timestamp: Date.now()
    };
  }
  
  // Transition in animation
  async _transitionIn(routeEntry) {
    // Implement slide/fade transition
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Animation logic
        setTimeout(resolve, 300);
      });
    });
  }
  
  // Transition out animation
  async _transitionOut(routeEntry) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Animation logic
        setTimeout(resolve, 300);
      });
    });
  }
  
  build(context) {
    // Build overlay of routes
    return Overlay({
      key: this.widget.key,
      initialEntries: this._overlay.map(entry => {
        return OverlayEntry({
          builder: (context) => entry.route.buildPage(context)
        });
      })
    });
  }
  
  dispose() {
    this._router.dispose();
    this._overlay = [];
  }
}

// Route Settings
class RouteSettings {
  constructor(name, arguments_) {
    this.name = name;
    this.arguments = arguments_;
  }
}
```

**Validation:**
- ✅ Navigator.of(context) works
- ✅ push/pop navigation
- ✅ Named routes work
- ✅ Route arguments passed correctly
- ✅ Can detect if can pop

---

### 8.2.2 MaterialPageRoute

**File:** `src/material/page-route.js`

```javascript
class MaterialPageRoute extends PageRoute {
  constructor({ 
    builder,
    settings,
    maintainState = true,
    fullscreenDialog = false 
  }) {
    super({ settings, maintainState });
    this.builder = builder;
    this.fullscreenDialog = fullscreenDialog;
  }
  
  buildPage(context) {
    return this.builder(context);
  }
  
  buildTransitions(context, animation, secondaryAnimation, child) {
    if (this.fullscreenDialog) {
      return SlideTransition({
        position: Tween({
          begin: Offset(0, 1),
          end: Offset(0, 0)
        }).animate(animation),
        child: child
      });
    }
    
    return FadeTransition({
      opacity: animation,
      child: SlideTransition({
        position: Tween({
          begin: Offset(0.3, 0),
          end: Offset(0, 0)
        }).animate(animation),
        child: child
      })
    });
  }
  
  get transitionDuration() {
    return Duration({ milliseconds: 300 });
  }
  
  get opaque() {
    return true;
  }
  
  get barrierDismissible() {
    return false;
  }
  
  get barrierColor() {
    return null;
  }
}

// Base PageRoute class
class PageRoute extends Route {
  constructor({ settings, maintainState = true }) {
    super({ settings });
    this.maintainState = maintainState;
  }
  
  buildPage(context) {
    throw new Error('buildPage must be implemented');
  }
  
  buildTransitions(context, animation, secondaryAnimation, child) {
    return child;
  }
  
  get transitionDuration() {
    return Duration({ milliseconds: 300 });
  }
  
  get reverseTransitionDuration() {
    return this.transitionDuration;
  }
}
```

**Usage:**

```javascript
// In a widget:
ElevatedButton({
  onPressed: () => {
    Navigator.push(
      context,
      new MaterialPageRoute({
        builder: (context) => DetailPage()
      })
    );
  },
  child: Text('Go to Details')
})

// Or with settings:
Navigator.push(
  context,
  new MaterialPageRoute({
    settings: RouteSettings('details', { id: 123 }),
    builder: (context) => DetailPage({ id: 123 })
  })
);
```

**Validation:**
- ✅ MaterialPageRoute creates route correctly
- ✅ Page builder executed
- ✅ Transitions animate smoothly
- ✅ Fullscreen dialog mode works

---

### 8.2.3 Route Transitions

**File:** `src/router/transitions.js`

```javascript
// Transition builders
class RouteTransitions {
  // Slide transition (left to right)
  static slideRight(animation, child) {
    return Transform.translate({
      offset: Tween({
        begin: Offset(-1, 0),
        end: Offset(0, 0)
      }).animate(animation),
      child: child
    });
  }
  
  // Slide transition (right to left)
  static slideLeft(animation, child) {
    return Transform.translate({
      offset: Tween({
        begin: Offset(1, 0),
        end: Offset(0, 0)
      }).animate(animation),
      child: child
    });
  }
  
  // Slide up (bottom to top)
  static slideUp(animation, child) {
    return Transform.translate({
      offset: Tween({
        begin: Offset(0, 1),
        end: Offset(0, 0)
      }).animate(animation),
      child: child
    });
  }
  
  // Fade transition
  static fade(animation, child) {
    return FadeTransition({
      opacity: animation,
      child: child
    });
  }
  
  // Scale transition (zoom)
  static scale(animation, child) {
    return ScaleTransition({
      scale: Tween({
        begin: 0.0,
        end: 1.0
      }).animate(CurvedAnimation({
        parent: animation,
        curve: Curves.easeOut
      })),
      child: child
    });
  }
  
  // Combined fade + slide
  static fadeSlide(animation, child) {
    return FadeTransition({
      opacity: animation,
      child: SlideTransition({
        position: Tween({
          begin: Offset(0, 0.3),
          end: Offset(0, 0)
        }).animate(animation),
        child: child
      })
    });
  }
  
  // Material motion transition
  static material(animation, secondaryAnimation, child) {
    return FadeTransition({
      opacity: CurvedAnimation({
        parent: animation,
        curve: Curves.easeIn
      }),
      child: SlideTransition({
        position: Tween({
          begin: Offset(0.3, 0),
          end: Offset.zero
        }).animate(CurvedAnimation({
          parent: animation,
          curve: Curves.easeOut
        })),
        child: child
      })
    });
  }
  
  // Custom transition builder
  static custom(animation, secondaryAnimation, child, builder) {
    return builder(animation, secondaryAnimation, child);
  }
}

// Transition duration presets
class TransitionDurations {
  static get fast() { return Duration({ milliseconds: 150 }); }
  static get normal() { return Duration({ milliseconds: 300 }); }
  static get slow() { return Duration({ milliseconds: 600 }); }
}
```

**Validation:**
- ✅ All transition types animate correctly
- ✅ Smooth 60 FPS animations
- ✅ Custom transitions supported
- ✅ Secondary animation (exit) works

---

### 8.2.4 Modal Routes and Dialogs

**File:** `src/material/dialog-route.js`

```javascript
class DialogRoute extends PopupRoute {
  constructor({
    builder,
    barrierDismissible = true,
    barrierColor = 'rgba(0, 0, 0, 0.54)',
    barrierLabel = 'Dismiss',
    settings
  }) {
    super({ settings });
    this.builder = builder;
    this._barrierDismissible = barrierDismissible;
    this._barrierColor = barrierColor;
    this._barrierLabel = barrierLabel;
  }
  
  buildPage(context) {
    return this.builder(context);
  }
  
  buildTransitions(context, animation, secondaryAnimation, child) {
    return FadeTransition({
      opacity: CurvedAnimation({
        parent: animation,
        curve: Curves.easeOut
      }),
      child: ScaleTransition({
        scale: Tween({
          begin: 1.1,
          end: 1.0
        }).animate(CurvedAnimation({
          parent: animation,
          curve: Curves.easeOut
        })),
        child: child
      })
    });
  }
  
  get barrierDismissible() {
    return this._barrierDismissible;
  }
  
  get barrierColor() {
    return this._barrierColor;
  }
  
  get barrierLabel() {
    return this._barrierLabel;
  }
  
  get transitionDuration() {
    return Duration({ milliseconds: 150 });
  }
  
  get opaque() {
    return false;
  }
}

// Helper function to show dialog
function showDialog(context, { builder, barrierDismissible = true }) {
  return Navigator.push(
    context,
    new DialogRoute({
      builder: builder,
      barrierDismissible: barrierDismissible
    })
  );
}

// AlertDialog widget
class AlertDialog extends StatelessWidget {
  constructor({ title, content, actions, key }) {
    super({ key });
    this.title = title;
    this.content = content;
    this.actions = actions || [];
  }
  
  build(context) {
    return Dialog({
      child: Padding({
        padding: EdgeInsets.all(24),
        child: Column({
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title
            if (this.title) {
              Padding({
                padding: EdgeInsets.only({ bottom: 16 }),
                child: DefaultTextStyle({
                  style: Theme.of(context).textTheme.headlineSmall,
                  child: this.title
                })
              })
            },
            
            // Content
            if (this.content) {
              Padding({
                padding: EdgeInsets.only({ bottom: 24 }),
                child: DefaultTextStyle({
                  style: Theme.of(context).textTheme.bodyMedium,
                  child: this.content
                })
              })
            },
            
            // Actions
            if (this.actions.length > 0) {
              Row({
                mainAxisAlignment: MainAxisAlignment.end,
                children: this.actions
              })
            }
          ].filter(Boolean)
        })
      })
    });
  }
}

// Dialog widget (base)
class Dialog extends StatelessWidget {
  constructor({ child, backgroundColor, elevation = 24, shape, key }) {
    super({ key });
    this.child = child;
    this.backgroundColor = backgroundColor;
    this.elevation = elevation;
    this.shape = shape;
  }
  
  build(context) {
    const theme = Theme.of(context);
    
    return Center({
      child: Container({
        constraints: BoxConstraints({
          minWidth: 280,
          maxWidth: 560
        }),
        decoration: BoxDecoration({
          color: this.backgroundColor || theme.dialogBackgroundColor,
          borderRadius: this.shape || BorderRadius.circular(28),
          boxShadow: [
            BoxShadow({
              color: 'rgba(0, 0, 0, 0.2)',
              blurRadius: this.elevation,
              offset: Offset(0, this.elevation / 2)
            })
          ]
        }),
        child: this.child
      })
    });
  }
}

// BottomSheet route
class ModalBottomSheetRoute extends PopupRoute {
  constructor({
    builder,
    backgroundColor,
    elevation = 8,
    shape,
    isDismissible = true,
    enableDrag = true,
    settings
  }) {
    super({ settings });
    this.builder = builder;
    this.backgroundColor = backgroundColor;
    this.elevation = elevation;
    this.shape = shape;
    this.isDismissible = isDismissible;
    this.enableDrag = enableDrag;
  }
  
  buildPage(context) {
    return this.builder(context);
  }
  
  buildTransitions(context, animation, secondaryAnimation, child) {
    return SlideTransition({
      position: Tween({
        begin: Offset(0, 1),
        end: Offset.zero
      }).animate(CurvedAnimation({
        parent: animation,
        curve: Curves.easeOut
      })),
      child: child
    });
  }
  
  get barrierDismissible() {
    return this.isDismissible;
  }
  
  get barrierColor() {
    return 'rgba(0, 0, 0, 0.54)';
  }
  
  get transitionDuration() {
    return Duration({ milliseconds: 250 });
  }
  
  get opaque() {
    return false;
  }
}

// Helper to show bottom sheet
function showModalBottomSheet(context, { builder, ...options }) {
  return Navigator.push(
    context,
    new ModalBottomSheetRoute({
      builder: builder,
      ...options
    })
  );
}
```

**Usage Examples:**

```javascript
// Show alert dialog
showDialog(context, {
  builder: (context) => AlertDialog({
    title: Text('Confirm Delete'),
    content: Text('Are you sure you want to delete this item?'),
    actions: [
      TextButton({
        onPressed: () => Navigator.pop(context, false),
        child: Text('Cancel')
      }),
      TextButton({
        onPressed: () => Navigator.pop(context, true),
        child: Text('Delete')
      })
    ]
  })
});

// Show bottom sheet
showModalBottomSheet(context, {
  builder: (context) => Container({
    padding: EdgeInsets.all(16),
    child: Column({
      mainAxisSize: MainAxisSize.min,
      children: [
        ListTile({
          leading: Icon(Icons.share),
          title: Text('Share'),
          onTap: () => Navigator.pop(context, 'share')
        }),
        ListTile({
          leading: Icon(Icons.link),
          title: Text('Copy Link'),
          onTap: () => Navigator.pop(context, 'copy')
        })
      ]
    })
  })
});
```

**Validation:**
- ✅ Dialogs show and dismiss correctly
- ✅ Barrier dismisses on tap if enabled
- ✅ Bottom sheets slide in/out smoothly
- ✅ Results passed back on dismiss

---

## Phase 8.3: Advanced Routing Features (Weeks 5-6)

### Objective
Implement advanced routing features including named routes, route parameters, deep linking, and route guards.

### 8.3.1 Named Routes System

**File:** `src/router/named-routes.js`

```javascript
class NamedRouteRegistry {
  constructor() {
    this.routes = new Map();      // name → RouteFactory
    this.aliases = new Map();     // alias → name
  }
  
  // Register named route
  register(name, factory) {
    if (this.routes.has(name)) {
      console.warn(`Route ${name} already registered, overwriting`);
    }
    this.routes.set(name, factory);
  }
  
  // Register route alias
  alias(aliasName, targetName) {
    this.aliases.set(aliasName, targetName);
  }
  
  // Generate route from name
  generate(name, settings) {
    // Resolve alias
    const resolvedName = this.aliases.get(name) || name;
    
    const factory = this.routes.get(resolvedName);
    if (!factory) {
      return null;
    }
    
    return factory(settings);
  }
  
  // Check if route exists
  has(name) {
    return this.routes.has(name) || this.aliases.has(name);
  }
  
  // Get all route names
  getNames() {
    return Array.from(this.routes.keys());
  }
  
  // Clear all routes
  clear() {
    this.routes.clear();
    this.aliases.clear();
  }
}

// Route factory function type
// RouteFactory = (RouteSettings) => Route

// Example registration
class MyApp extends StatelessWidget {
  build(context) {
    return MaterialApp({
      initialRoute: '/',
      routes: {
        '/': (context) => HomePage(),
        '/about': (context) => AboutPage(),
        '/settings': (context) => SettingsPage()
      },
      onGenerateRoute: (settings) => {
        // Handle dynamic routes
        if (settings.name.startsWith('/user/')) {
          const userId = settings.name.split('/')[2];
          return MaterialPageRoute({
            builder: (context) => UserProfilePage({ userId }),
            settings: settings
          });
        }
        
        // Return null if no match (triggers onUnknownRoute)
        return null;
      },
      onUnknownRoute: (settings) => {
        return MaterialPageRoute({
          builder: (context) => NotFoundPage(),
          settings: settings
        });
      }
    });
  }
}
```

**MaterialApp Integration:**

```javascript
class MaterialApp extends StatefulWidget {
  constructor({
    home,
    routes = {},
    initialRoute,
    onGenerateRoute,
    onUnknownRoute,
    navigatorObservers = [],
    title = '',
    theme,
    key
  }) {
    super({ key });
    this.home = home;
    this.routes = routes;
    this.initialRoute = initialRoute || (home ? '/' : null);
    this.onGenerateRoute = onGenerateRoute;
    this.onUnknownRoute = onUnknownRoute;
    this.navigatorObservers = navigatorObservers;
    this.title = title;
    this.theme = theme;
  }
  
  createState() {
    return new _MaterialAppState();
  }
}

class _MaterialAppState extends State {
  constructor() {
    super();
    this._namedRoutes = new NamedRouteRegistry();
  }
  
  initState() {
    // Register static routes
    Object.entries(this.widget.routes).forEach(([name, builder]) => {
      this._namedRoutes.register(name, (settings) => {
        return MaterialPageRoute({
          builder: builder,
          settings: settings
        });
      });
    });
    
    // Register home route if provided
    if (this.widget.home) {
      this._namedRoutes.register('/', (settings) => {
        return MaterialPageRoute({
          builder: (context) => this.widget.home,
          settings: settings
        });
      });
    }
  }
  
  _onGenerateRoute(settings) {
    // Try named routes first
    const route = this._namedRoutes.generate(settings.name, settings);
    if (route) return route;
    
    // Try custom generator
    if (this.widget.onGenerateRoute) {
      const customRoute = this.widget.onGenerateRoute(settings);
      if (customRoute) return customRoute;
    }
    
    // Unknown route
    return null;
  }
  
  build(context) {
    return Theme({
      data: this.widget.theme || ThemeData(),
      child: Navigator({
        initialRoute: this.widget.initialRoute,
        onGenerateRoute: (settings) => this._onGenerateRoute(settings),
        onUnknownRoute: this.widget.onUnknownRoute,
        observers: this.widget.navigatorObservers
      })
    });
  }
}
```

**Validation:**
- ✅ Named routes registered correctly
- ✅ Static routes work
- ✅ Dynamic route generation works
- ✅ Unknown route handler called
- ✅ Route aliases work

---

### 8.3.2 Route Parameters and Arguments

**File:** `src/router/route-arguments.js`

```javascript
class RouteArguments {
  constructor(data = {}) {
    this._data = data;
  }
  
  // Get argument by key
  get(key, defaultValue = null) {
    return this._data[key] ?? defaultValue;
  }
  
  // Check if argument exists
  has(key) {
    return key in this._data;
  }
  
  // Get all arguments
  getAll() {
    return { ...this._data };
  }
  
  // Get typed argument
  getString(key, defaultValue = '') {
    return String(this.get(key, defaultValue));
  }
  
  getInt(key, defaultValue = 0) {
    return parseInt(this.get(key, defaultValue)) || defaultValue;
  }
  
  getBool(key, defaultValue = false) {
    return Boolean(this.get(key, defaultValue));
  }
  
  getList(key, defaultValue = []) {
    const value = this.get(key, defaultValue);
    return Array.isArray(value) ? value : defaultValue;
  }
  
  getObject(key, defaultValue = {}) {
    const value = this.get(key, defaultValue);
    return typeof value === 'object' ? value : defaultValue;
  }
}

// Enhanced RouteSettings with arguments
class RouteSettings {
  constructor(name, arguments_) {
    this.name = name;
    this.arguments = new RouteArguments(arguments_ || {});
  }
  
  // Copy with new values
  copyWith({ name, arguments: args }) {
    return new RouteSettings(
      name ?? this.name,
      args ?? this.arguments.getAll()
    );
  }
}

// Route with arguments example
class UserProfilePage extends StatelessWidget {
  constructor({ userId, key }) {
    super({ key });
    this.userId = userId;
  }
  
  build(context) {
    // Access route arguments
    const route = ModalRoute.of(context);
    const args = route.settings.arguments;
    
    const userId = args.getString('userId', this.userId);
    const showPhotos = args.getBool('showPhotos', false);
    
    return Scaffold({
      appBar: AppBar({
        title: Text(`User ${userId}`)
      }),
      body: Column({
        children: [
          Text(`User ID: ${userId}`),
          if (showPhotos) PhotoGallery({ userId })
        ]
      })
    });
  }
}

// Navigation with arguments
Navigator.pushNamed(context, '/user/profile', {
  arguments: {
    userId: '123',
    showPhotos: true,
    metadata: {
      source: 'search',
      timestamp: Date.now()
    }
  }
});
```

**Validation:**
- ✅ Arguments passed correctly
- ✅ Typed getters work
- ✅ Default values applied
- ✅ Complex objects passed

---

### 8.3.3 Deep Linking Support

**File:** `src/router/deep-linking.js`

```javascript
class DeepLinkHandler {
  constructor(router) {
    this.router = router;
    this.handlers = new Map();    // pattern → handler
    this.schemes = ['http', 'https', 'app'];
  }
  
  // Register deep link handler
  register(pattern, handler) {
    this.handlers.set(pattern, handler);
  }
  
  // Handle incoming URL
  async handle(url) {
    const parsedUrl = new URL(url);
    
    // Check if scheme is supported
    if (!this.schemes.includes(parsedUrl.protocol.replace(':', ''))) {
      console.warn(`Unsupported URL scheme: ${parsedUrl.protocol}`);
      return false;
    }
    
    // Try to match pattern
    for (const [pattern, handler] of this.handlers.entries()) {
      const match = this.matchPattern(pattern, parsedUrl.pathname);
      if (match) {
        const params = this.extractParams(parsedUrl);
        await handler(match.params, params.query, params.fragment);
        return true;
      }
    }
    
    // No match found
    console.warn(`No deep link handler for: ${url}`);
    return false;
  }
  
  // Match URL pattern
  matchPattern(pattern, path) {
    const paramNames = [];
    const regexPattern = pattern
      .replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
    
    const regex = new RegExp(`^${regexPattern}# Step 8: Routing & Navigation - Production Plan

## Overview

Step 8 builds the **routing and navigation system** that enables multi-page applications in FlutterJS. This includes route management, navigation history, page transitions, deep linking, and the Navigator widget system.

**Current Status:**
- ✅ Step 1-3: Analyzer complete (metadata extraction)
- ✅ Step 4: VNode system complete (rendering, diffing, hydration)
- ✅ Step 5: Runtime system complete (state, lifecycle, context)
- ✅ Step 6: Build system complete
- ✅ Step 7: Material widgets complete
- ❌ Step 8: Routing system needs implementation

**Goal:** Complete a production-ready routing system that:
1. Manages navigation stack (push, pop, replace)
2. Handles route definitions and matching
3. Supports named routes and route parameters
4. Implements page transitions and animations
5. Enables deep linking and URL management
6. Provides Navigator widget and context integration

---

## Step 8 Breakdown (4 Major Phases)

```
Step 8: Routing & Navigation
│
├── Phase 8.1: Core Router Engine (Weeks 1-2)
│   ├── Route definition system
│   ├── Route matching and parsing
│   ├── Navigation stack management
│   ├── History API integration
│   └── Browser URL synchronization
│
├── Phase 8.2: Navigator Widget System (Weeks 3-4)
│   ├── Navigator widget implementation
│   ├── MaterialPageRoute and page builders
│   ├── Route transition animations
│   ├── Modal routes and dialogs
│   └── Navigation observers
│
├── Phase 8.3: Advanced Routing Features (Weeks 5-6)
│   ├── Named routes system
│   ├── Route parameters and arguments
│   ├── Deep linking support
│   ├── Route guards and middleware
│   └── Nested navigation
│
└── Phase 8.4: Integration & Optimization (Weeks 7-8)
    ├── MaterialApp router integration
    ├── Code splitting per route
    ├── Lazy loading routes
    ├── SEO optimization for routes
    └── Complete integration testing
```

---

## Phase 8.1: Core Router Engine (Weeks 1-2)

### Objective
Build the foundational routing engine that manages navigation state, matches routes, and coordinates with the browser's History API.

### 8.1.1 Router Architecture

**File:** `src/router/router-engine.js`

**Core Concepts:**

```
Route Definition                 Route Matching               Navigation Stack
    HomePage                         /                           [HomePage]
    AboutPage                        /about                      ↓
    UserProfile                      /user/:id                   [HomePage, AboutPage]
    Settings                         /settings                   ↓
                                                                [HomePage, AboutPage, UserProfile]
```

**Key Principle:**
- **Routes** are configuration objects (immutable)
- **Navigation stack** is the history of pages (mutable)
- **Router** coordinates between routes, stack, and browser URL

**Router Structure:**

```javascript
class RouterEngine {
  constructor(options = {}) {
    this.routes = new Map();           // path → Route config
    this.navigationStack = [];         // Array of active routes
    this.currentRoute = null;          // Current active route
    
    this.history = window.history;     // Browser History API
    this.baseUrl = options.baseUrl || '';
    
    this.observers = [];               // Navigation observers
    this.guards = [];                  // Route guards
    
    // Configuration
    this.mode = options.mode || 'history'; // 'history' or 'hash'
    this.initialRoute = options.initialRoute || '/';
    
    this.initialized = false;
  }
  
  // Initialize router and setup listeners
  initialize() {
    if (this.initialized) return;
    
    // Setup history listeners
    window.addEventListener('popstate', (event) => {
      this.handlePopState(event);
    });
    
    // Handle initial route
    const initialPath = this.getCurrentPath();
    this.navigateToPath(initialPath, { replace: true, initial: true });
    
    this.initialized = true;
  }
  
  // Register a route
  registerRoute(path, config) {
    const route = new Route(path, config);
    this.routes.set(path, route);
    return route;
  }
  
  // Navigate to a path
  async navigateToPath(path, options = {}) {
    // Parse path and query params
    const { pathname, query, hash } = this.parsePath(path);
    
    // Find matching route
    const match = this.matchRoute(pathname);
    if (!match) {
      console.error(`No route found for path: ${pathname}`);
      return false;
    }
    
    // Check route guards
    const canNavigate = await this.checkGuards(match, options);
    if (!canNavigate) return false;
    
    // Build route with params
    const route = this.buildRoute(match, query, hash);
    
    // Notify observers (willNavigate)
    this.notifyObservers('willNavigate', { from: this.currentRoute, to: route });
    
    // Update navigation stack
    if (options.replace) {
      this.replaceRoute(route);
    } else if (options.pop) {
      this.popRoute();
    } else {
      this.pushRoute(route);
    }
    
    // Update browser URL
    this.updateBrowserUrl(path, options);
    
    // Update current route
    this.currentRoute = route;
    
    // Notify observers (didNavigate)
    this.notifyObservers('didNavigate', { from: this.currentRoute, to: route });
    
    return true;
  }
  
  // Push route onto stack
  pushRoute(route) {
    this.navigationStack.push(route);
  }
  
  // Replace current route
  replaceRoute(route) {
    if (this.navigationStack.length > 0) {
      this.navigationStack[this.navigationStack.length - 1] = route;
    } else {
      this.navigationStack.push(route);
    }
  }
  
  // Pop route from stack
  popRoute() {
    if (this.navigationStack.length > 1) {
      return this.navigationStack.pop();
    }
    return null;
  }
  
  // Match path to route definition
  matchRoute(pathname) {
    for (const [pattern, route] of this.routes.entries()) {
      const match = this.matchPattern(pattern, pathname);
      if (match) {
        return { route, params: match.params };
      }
    }
    return null;
  }
  
  // Match path pattern (supports :param and *)
  matchPattern(pattern, path) {
    // Convert pattern to regex
    const paramNames = [];
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:(\w+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
    
    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);
    
    if (!match) return null;
    
    // Extract params
    const params = {};
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1];
    });
    
    return { params };
  }
  
  // Parse path into components
  parsePath(path) {
    const url = new URL(path, window.location.origin);
    return {
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams),
      hash: url.hash.slice(1)
    };
  }
  
  // Build route with params
  buildRoute(match, query, hash) {
    return {
      route: match.route,
      params: match.params,
      query: query,
      hash: hash,
      path: this.buildPath(match.route.path, match.params, query, hash)
    };
  }
  
  // Build path from params
  buildPath(pattern, params, query, hash) {
    let path = pattern;
    
    // Replace params
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
    
    // Add query params
    if (Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      path += `?${queryString}`;
    }
    
    // Add hash
    if (hash) {
      path += `#${hash}`;
    }
    
    return path;
  }
  
  // Update browser URL
  updateBrowserUrl(path, options = {}) {
    const fullPath = this.baseUrl + path;
    
    if (this.mode === 'history') {
      if (options.replace) {
        this.history.replaceState(null, '', fullPath);
      } else {
        this.history.pushState(null, '', fullPath);
      }
    } else if (this.mode === 'hash') {
      window.location.hash = path;
    }
  }
  
  // Handle browser back/forward
  handlePopState(event) {
    const path = this.getCurrentPath();
    this.navigateToPath(path, { pop: true, fromPopState: true });
  }
  
  // Get current browser path
  getCurrentPath() {
    if (this.mode === 'history') {
      return window.location.pathname + window.location.search + window.location.hash;
    } else {
      return window.location.hash.slice(1) || '/';
    }
  }
  
  // Check route guards
  async checkGuards(match, options) {
    for (const guard of this.guards) {
      const canNavigate = await guard(match, this.currentRoute, options);
      if (!canNavigate) return false;
    }
    return true;
  }
  
  // Register guard
  addGuard(guard) {
    this.guards.push(guard);
  }
  
  // Register observer
  addObserver(observer) {
    this.observers.push(observer);
  }
  
  // Notify observers
  notifyObservers(event, data) {
    this.observers.forEach(observer => {
      if (observer[event]) {
        observer[event](data);
      }
    });
  }
  
  // Navigate programmatically
  push(path) {
    return this.navigateToPath(path);
  }
  
  replace(path) {
    return this.navigateToPath(path, { replace: true });
  }
  
  pop() {
    if (this.navigationStack.length > 1) {
      window.history.back();
      return true;
    }
    return false;
  }
  
  // Go back n steps
  go(delta) {
    window.history.go(delta);
  }
  
  // Check if can go back
  canPop() {
    return this.navigationStack.length > 1;
  }
  
  // Get navigation stack
  getStack() {
    return [...this.navigationStack];
  }
  
  // Dispose router
  dispose() {
    window.removeEventListener('popstate', this.handlePopState);
    this.routes.clear();
    this.navigationStack = [];
    this.observers = [];
    this.guards = [];
  }
}
```

**Validation:**
- ✅ Router initializes correctly
- ✅ Routes registered successfully
- ✅ Path matching works (static and dynamic)
- ✅ Navigation stack maintained
- ✅ Browser URL synchronized
- ✅ Back/forward buttons work

---

### 8.1.2 Route Definition System

**File:** `src/router/route.js`

**Route Class:**

```javascript
class Route {
  constructor(path, config) {
    this.path = path;                  // Route pattern
    this.name = config.name || null;   // Named route
    this.builder = config.builder;     // Page builder function
    this.component = config.component; // Widget class
    
    this.meta = config.meta || {};     // Metadata (title, auth, etc.)
    this.transition = config.transition || 'default';
    
    this.guards = config.guards || []; // Route-specific guards
    this.redirect = config.redirect;   // Redirect target
    
    this.children = config.children || []; // Nested routes
  }
  
  // Build page widget
  buildPage(context, params, query) {
    if (this.builder) {
      return this.builder(context, params, query);
    } else if (this.component) {
      return new this.component({ params, query });
    }
    throw new Error(`Route ${this.path} has no builder or component`);
  }
  
  // Check if route matches path
  matches(path) {
    // Implemented in RouterEngine.matchPattern
  }
}
```

**Route Configuration Format:**

```javascript
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { title: 'Home', requiresAuth: false }
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
    meta: { title: 'About' }
  },
  {
    path: '/user/:id',
    name: 'userProfile',
    builder: (context, params, query) => {
      return UserProfilePage({ userId: params.id });
    },
    meta: { title: 'User Profile', requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsPage,
    children: [
      {
        path: '/settings/account',
        name: 'accountSettings',
        component: AccountSettingsPage
      },
      {
        path: '/settings/privacy',
        name: 'privacySettings',
        component: PrivacySettingsPage
      }
    ]
  },
  {
    path: '/old-path',
    redirect: '/new-path'
  },
  {
    path: '*',
    name: 'notFound',
    component: NotFoundPage
  }
];
```

**Validation:**
- ✅ Route creation from config
- ✅ Builder function execution
- ✅ Component instantiation
- ✅ Metadata access
- ✅ Nested routes support

---

### 8.1.3 History Management

**File:** `src/router/history-manager.js`

**Browser History API Integration:**

```javascript
class HistoryManager {
  constructor(router) {
    this.router = router;
    this.entries = [];           // History entries
    this.currentIndex = -1;      // Current position
    
    this.listeners = [];
  }
  
  // Push new entry
  push(entry) {
    // Remove forward history if navigating from middle
    if (this.currentIndex < this.entries.length - 1) {
      this.entries.splice(this.currentIndex + 1);
    }
    
    this.entries.push(entry);
    this.currentIndex++;
    
    this.notifyListeners('push', entry);
  }
  
  // Replace current entry
  replace(entry) {
    if (this.currentIndex >= 0) {
      this.entries[this.currentIndex] = entry;
    } else {
      this.entries.push(entry);
      this.currentIndex = 0;
    }
    
    this.notifyListeners('replace', entry);
  }
  
  // Go back
  back() {
    if (this.canGoBack()) {
      this.currentIndex--;
      const entry = this.entries[this.currentIndex];
      this.notifyListeners('back', entry);
      return entry;
    }
    return null;
  }
  
  // Go forward
  forward() {
    if (this.canGoForward()) {
      this.currentIndex++;
      const entry = this.entries[this.currentIndex];
      this.notifyListeners('forward', entry);
      return entry;
    }
    return null;
  }
  
  // Go to specific index
  go(delta) {
    const newIndex = this.currentIndex + delta;
    if (newIndex >= 0 && newIndex < this.entries.length) {
      this.currentIndex = newIndex;
      const entry = this.entries[this.currentIndex];
      this.notifyListeners('go', entry);
      return entry;
    }
    return null;
  }
  
  // Check if can go back
  canGoBack() {
    return this.currentIndex > 0;
  }
  
  // Check if can go forward
  canGoForward() {
    return this.currentIndex < this.entries.length - 1;
  }
  
  // Get current entry
  current() {
    return this.entries[this.currentIndex] || null;
  }
  
  // Get all entries
  getEntries() {
    return [...this.entries];
  }
  
  // Clear history
  clear() {
    this.entries = [];
    this.currentIndex = -1;
  }
  
  // Add listener
  addListener(listener) {
    this.listeners.push(listener);
  }
  
  // Notify listeners
  notifyListeners(action, entry) {
    this.listeners.forEach(listener => listener(action, entry));
  }
}

// History Entry
class HistoryEntry {
  constructor(route, state = {}) {
    this.route = route;
    this.state = state;           // Page state snapshot
    this.timestamp = Date.now();
    this.scrollPosition = { x: 0, y: 0 };
  }
  
  // Save scroll position
  saveScrollPosition() {
    this.scrollPosition = {
      x: window.scrollX,
      y: window.scrollY
    };
  }
  
  // Restore scroll position
  restoreScrollPosition() {
    window.scrollTo(this.scrollPosition.x, this.scrollPosition.y);
  }
}
```

**Validation:**
- ✅ History entries tracked
- ✅ Back/forward navigation
- ✅ Scroll position restoration
- ✅ State preservation

---

## Phase 8.2: Navigator Widget System (Weeks 3-4)

### Objective
Implement Flutter-style Navigator widget that manages routes declaratively and provides imperative navigation methods.

### 8.2.1 Navigator Widget

**File:** `src/widgets/navigator.js`

```javascript
class Navigator extends StatefulWidget {
  constructor({ 
    initialRoute = '/',
    onGenerateRoute,
    onUnknownRoute,
    observers = [],
    key 
  }) {
    super({ key });
    this.initialRoute = initialRoute;
    this.onGenerateRoute = onGenerateRoute;
    this.onUnknownRoute = onUnknownRoute;
    this.observers = observers;
  }
  
  createState() {
    return new _NavigatorState();
  }
  
  // Static method: Navigator.of(context)
  static of(context) {
    const navigatorState = context.findAncestorStateOfType(_NavigatorState);
    if (!navigatorState) {
      throw new Error('Navigator.of() called with a context that does not contain a Navigator');
    }
    return navigatorState;
  }
  
  // Static method: Navigator.push(context, route)
  static push(context, route) {
    return Navigator.of(context).push(route);
  }
  
  // Static method: Navigator.pop(context, result)
  static pop(context, result) {
    return Navigator.of(context).pop(result);
  }
  
  // Static method: Navigator.pushNamed(context, routeName, arguments)
  static pushNamed(context, routeName, { arguments: args } = {}) {
    return Navigator.of(context).pushNamed(routeName, { arguments: args });
  }
  
  // Static method: Navigator.pushReplacementNamed
  static pushReplacementNamed(context, routeName, { arguments: args, result } = {}) {
    return Navigator.of(context).pushReplacementNamed(routeName, { arguments: args, result });
  }
  
  // Static method: Navigator.popUntil
  static popUntil(context, predicate) {
    return Navigator.of(context).popUntil(predicate);
  }
  
  // Static method: Navigator.canPop
  static canPop(context) {
    return Navigator.of(context).canPop();
  }
}

class _NavigatorState extends State {
  constructor() {
    super();
    this._overlay = [];          // Stack of routes
    this._router = null;          // Router engine
    this._history = [];           // Navigation history
  }
  
  initState() {
    // Initialize router
    this._router = new RouterEngine({
      initialRoute: this.widget.initialRoute,
      mode: 'history'
    });
    
    // Register routes from onGenerateRoute
    this._setupRoutes();
    
    // Initialize router
    this._router.initialize();
    
    // Add observers
    this.widget.observers.forEach(observer => {
      this._router.addObserver(observer);
    });
  }
  
  _setupRoutes() {
    // Route generation handled by onGenerateRoute callback
  }
  
  // Push new route
  async push(route) {
    const routeEntry = this._createRouteEntry(route);
    this._overlay.push(routeEntry);
    
    // Animate in
    await this._transitionIn(routeEntry);
    
    this.setState({});
    return routeEntry.route;
  }
  
  // Pop current route
  async pop(result) {
    if (!this.canPop()) return false;
    
    const routeEntry = this._overlay.pop();
    
    // Animate out
    await this._transitionOut(routeEntry);
    
    // Pass result to previous route
    if (this._overlay.length > 0) {
      const previousRoute = this._overlay[this._overlay.length - 1];
      if (previousRoute.onResult) {
        previousRoute.onResult(result);
      }
    }
    
    this.setState({});
    return true;
  }
  
  // Push named route
  async pushNamed(routeName, { arguments: args } = {}) {
    const route = this._generateRoute(routeName, args);
    if (!route) {
      return this._handleUnknownRoute(routeName);
    }
    return this.push(route);
  }
  
  // Push and replace current route
  async pushReplacement(route, { result } = {}) {
    const currentRoute = this._overlay[this._overlay.length - 1];
    
    await this.pop(result);
    await this.push(route);
  }
  
  // Push named and replace
  async pushReplacementNamed(routeName, { arguments: args, result } = {}) {
    const route = this._generateRoute(routeName, args);
    if (!route) {
      return this._handleUnknownRoute(routeName);
    }
    return this.pushReplacement(route, { result });
  }
  
  // Pop until predicate
  async popUntil(predicate) {
    while (this._overlay.length > 1) {
      const currentRoute = this._overlay[this._overlay.length - 1];
      if (predicate(currentRoute.route)) {
        break;
      }
      await this.pop();
    }
  }
  
  // Check if can pop
  canPop() {
    return this._overlay.length > 1;
  }
  
  // Generate route from name
  _generateRoute(routeName, args) {
    if (this.widget.onGenerateRoute) {
      const settings = new RouteSettings(routeName, args);
      return this.widget.onGenerateRoute(settings);
    }
    return null;
  }
  
  // Handle unknown route
  _handleUnknownRoute(routeName) {
    if (this.widget.onUnknownRoute) {
      const settings = new RouteSettings(routeName);
      return this.widget.onUnknownRoute(settings);
    }
    throw new Error(`No route defined for ${routeName}`);
  }
  
  // Create route entry
  _createRouteEntry(route) {
    return {
      route: route,
      element: null,
      animation: null,
      timestamp: Date.now()
    };
  }
  
  // Transition in animation
  async _transitionIn(routeEntry) {
    // Implement slide/fade transition
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Animation logic
        setTimeout(resolve, 300);
      });
    });
  }
  
  // Transition out animation
  async _transitionOut(routeEntry) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Animation logic
        setTimeout(resolve, 300);
      });
    });
  }
  
  build(context) {
    // Build overlay of routes
    return Overlay({
      key: this.widget.key,
      initialEntries: this._overlay.map(entry => {
        return OverlayEntry({
          builder: (context) => entry.route.buildPage(context)
        });
      })
    });
  }
  
  dispose() {
    this._router.dispose();
    this._overlay = [];
  }
}

// Route Settings
class RouteSettings {
  constructor(name, arguments_) {
    this.name = name;
    this.arguments = arguments_;
  }
}
```

**Validation:**
- ✅ Navigator.of(context) works
- ✅ push/pop navigation
- ✅ Named routes work
- ✅ Route arguments passed correctly
- ✅ Can detect if can pop

---

### 8.2.2 MaterialPageRoute

**File:** `src/material/page-route.js`

```javascript
class MaterialPageRoute extends PageRoute {
  constructor({ 
    builder,
    settings,
    maintainState = true,
    fullscreenDialog = false 
  }) {
    super({ settings, maintainState });
    this.builder = builder;
    this.fullscreenDialog = fullscreenDialog;
  }
  
  buildPage(context) {
    return this.builder(context);
  }
  
  buildTransitions(context, animation, secondaryAnimation, child) {
    if (this.fullscreenDialog) {
      return SlideTransition({
        position: Tween({
          begin: Offset(0, 1),
          end: Offset(0, 0)
        }).animate(animation),
        child: child
      });
    }
    
    return FadeTransition({
      opacity: animation,
      child: SlideTransition({
        position: Tween({
          begin: Offset(0.3, 0),
          end: Offset(0, 0)
        }).animate(animation),
        child: child
      })
    });
  }
  
  get transitionDuration() {
    return Duration({ milliseconds: 300 });
  }
  
  get opaque() {
    return true;
  }
  
  get barrierDismissible() {
    return false;
  }
  
  get barrierColor() {
    return null;
  }
}

// Base PageRoute class
class PageRoute extends Route {
  constructor({ settings, maintainState = true }) {
    super({ settings });
    this.maintainState = maintainState;
  }
  
  buildPage(context) {
    throw new Error('buildPage must be implemented');
  }
  
  buildTransitions(context, animation, secondaryAnimation, child) {
    return child;
  }
  
  get transitionDuration() {
    return Duration({ milliseconds: 300 });
  }
  
  get reverseTransitionDuration() {
    return this.transitionDuration;
  }
}
```

**Usage:**

```javascript
// In a widget:
ElevatedButton({
  onPressed: () => {
    Navigator.push(
      context,
      new MaterialPageRoute({
        builder: (context) => DetailPage()
      })
    );
  },
  child: Text('Go to Details')
})

// Or with settings:
Navigator.push(
  context,
  new MaterialPageRoute({
    settings: RouteSettings('details', { id: 123 }),
    builder: (context) => DetailPage({ id: 123 })
  })
);
```

**Validation:**
- ✅ MaterialPageRoute creates route correctly
- ✅ Page builder executed
- ✅ Transitions animate smoothly
- ✅ Fullscreen dialog mode works

---

### 8.2.3 Route Transitions

**File:** `src/router/transitions.js`

```javascript
// Transition builders
class RouteTransitions {
  // Slide transition (left to right)
  static slideRight(animation, child) {
    return Transform.translate({
      offset: Tween({
        begin: Offset(-1, 0),
        end: Offset(0, 0)
      }).animate(animation),
      child: child
    });
  }
  
  // Slide transition (right to left)
  static slideLeft(animation, child) {
    return Transform.translate({
      offset: Tween({
        begin: Offset(1, 0),
        end: Offset(0, 0)
      }).animate(animation),
      child: child
    });
  }
  
  // Slide up (bottom to top)
  static slideUp(animation, child) {
    return Transform.translate({
      offset: Tween({
        begin: Offset(0, 1),
        end: Offset(0, 0)
      }).animate(animation),
      child: child
    });
  }
  
  // Fade transition
  static fade(animation, child) {
    return FadeTransition({
      opacity: animation,
      child: child
    });
  }
  
  // Scale transition (zoom)
  static scale(animation, child) {
    return ScaleTransition({
      scale: Tween({
        begin: 0.0,
        end: 1.0
      }).animate(CurvedAnimation({
        parent: animation,
        curve: Curves.easeOut
      })),
      child: child
    });
  }
  
  // Combined fade + slide
  static fadeSlide(animation, child) {
    return FadeTransition({
      opacity: animation,
      child: SlideTransition({
        position: Tween({
          begin: Offset(0, 0.3),
          end: Offset(0, 0)
        }).animate(animation),
        child: child
      })
    });
  }
  
  // Material motion transition
  static material(animation, secondaryAnimation, child) {
    return FadeTransition({
      opacity: CurvedAnimation({
        parent: animation,
        curve: Curves.easeIn
      }),
      child: SlideTransition({
        position: Tween({
          begin: Offset(0.3, 0),
          end: Offset.zero
        }).animate(CurvedAnimation({
          parent: animation,
          curve: Curves.easeOut
        })),
        child: child
      })
    });
  }
  
  // Custom transition builder
  static custom(animation, secondaryAnimation, child, builder) {
    return builder(animation, secondaryAnimation, child);
  }
}

);
    const match = path.match(regex);
    
    if (!match) return null;
    
    const params = {};
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1];
    });
    
    return { params };
  }
  
  // Extract params from URL
  extractParams(url) {
    return {
      query: Object.fromEntries(url.searchParams),
      fragment: url.hash.slice(1)
    };
  }
  
  // Generate deep link URL
  generateLink(pattern, params = {}, query = {}) {
    let path = pattern;
    
    // Replace params
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, value);
    });
    
    // Add query params
    if (Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      path += `?${queryString}`;
    }
    
    return path;
  }
}

// Integration with MaterialApp
class MaterialApp extends StatefulWidget {
  constructor({
    // ... existing props
    onGenerateInitialRoutes,
    deepLinkHandlers = {},
    key
  }) {
    super({ key });
    // ... existing props
    this.onGenerateInitialRoutes = onGenerateInitialRoutes;
    this.onUnknownRoute = onUnknownRoute;
    this.navigatorKey = navigatorKey;
    this.navigatorObservers = navigatorObservers;
    this.builder = builder;
    this.title = title;
    this.onGenerateTitle = onGenerateTitle;
    this.theme = theme;
    this.darkTheme = darkTheme;
    this.themeMode = themeMode;
    this.locale = locale;
    this.localizationsDelegates = localizationsDelegates;
    this.supportedLocales = supportedLocales;
    this.debugShowCheckedModeBanner = debugShowCheckedModeBanner;
    this.deepLinkHandlers = deepLinkHandlers;
    this.routeInformationParser = routeInformationParser;
    this.routerDelegate = routerDelegate;
    this.backButtonDispatcher = backButtonDispatcher;
  }
  
  createState() {
    return new _MaterialAppState();
  }
}

class _MaterialAppState extends State {
  constructor() {
    super();
    this._namedRoutes = new NamedRouteRegistry();
    this._deepLinkHandler = null;
    this._router = null;
  }
  
  initState() {
    super.initState();
    
    // Register static routes
    Object.entries(this.widget.routes).forEach(([name, builder]) => {
      this._namedRoutes.register(name, (settings) => {
        return MaterialPageRoute({
          builder: builder,
          settings: settings
        });
      });
    });
    
    // Register home route
    if (this.widget.home && !this.widget.routes['/']) {
      this._namedRoutes.register('/', (settings) => {
        return MaterialPageRoute({
          builder: (context) => this.widget.home,
          settings: settings
        });
      });
    }
    
    // Setup deep linking
    this._setupDeepLinking();
  }
  
  _setupDeepLinking() {
    if (Object.keys(this.widget.deepLinkHandlers).length === 0) return;
    
    this._deepLinkHandler = new DeepLinkHandler(this._router);
    
    Object.entries(this.widget.deepLinkHandlers).forEach(([pattern, handler]) => {
      this._deepLinkHandler.register(pattern, async (params, query, fragment) => {
        const route = await handler(params, query, fragment);
        if (route && this.context) {
          Navigator.push(this.context, route);
        }
      });
    });
    
    // Handle initial deep link
    this._handleInitialDeepLink();
  }
  
  async _handleInitialDeepLink() {
    if (!this._deepLinkHandler) return;
    
    const initialUrl = window.location.href;
    await this._deepLinkHandler.handle(initialUrl);
  }
  
  _onGenerateRoute(settings) {
    // Try named routes
    const route = this._namedRoutes.generate(settings.name, settings);
    if (route) return route;
    
    // Try custom generator
    if (this.widget.onGenerateRoute) {
      const customRoute = this.widget.onGenerateRoute(settings);
      if (customRoute) return customRoute;
    }
    
    return null;
  }
  
  _onUnknownRoute(settings) {
    if (this.widget.onUnknownRoute) {
      return this.widget.onUnknownRoute(settings);
    }
    
    // Default 404 page
    return MaterialPageRoute({
      builder: (context) => Scaffold({
        appBar: AppBar({ title: Text('Page Not Found') }),
        body: Center({
          child: Text('404: Page not found')
        })
      }),
      settings: settings
    });
  }
  
  _buildNavigator() {
    return Navigator({
      key: this.widget.navigatorKey,
      initialRoute: this.widget.initialRoute,
      onGenerateRoute: (settings) => this._onGenerateRoute(settings),
      onGenerateInitialRoutes: this.widget.onGenerateInitialRoutes,
      onUnknownRoute: (settings) => this._onUnknownRoute(settings),
      observers: this.widget.navigatorObservers
    });
  }
  
  build(context) {
    // Determine theme
    let theme = this.widget.theme || ThemeData();
    if (this.widget.themeMode === ThemeMode.dark && this.widget.darkTheme) {
      theme = this.widget.darkTheme;
    } else if (this.widget.themeMode === ThemeMode.system) {
      const isDark = MediaQuery.of(context)?.platformBrightness === Brightness.dark;
      theme = isDark && this.widget.darkTheme ? this.widget.darkTheme : theme;
    }
    
    // Build app
    let app = Theme({
      data: theme,
      child: this._buildNavigator()
    });
    
    // Wrap with builder if provided
    if (this.widget.builder) {
      app = this.widget.builder(context, app);
    }
    
    // Add debug banner
    if (this.widget.debugShowCheckedModeBanner) {
      app = Banner({
        message: 'DEBUG',
        location: BannerLocation.topEnd,
        child: app
      });
    }
    
    return app;
  }
  
  dispose() {
    this._deepLinkHandler?.dispose();
    super.dispose();
  }
}
```

**Validation:**
- ✅ MaterialApp initializes routing correctly
- ✅ All routing features work through MaterialApp
- ✅ Theme integration works
- ✅ Deep linking works from app start

---

### 8.4.2 Code Splitting Per Route

**File:** `src/router/code-splitting.js`

```javascript
class RouteCodeSplitter {
  constructor() {
    this.loadedChunks = new Set();
    this.pendingLoads = new Map();
  }
  
  // Register lazy-loaded route
  registerLazy(routeName, loader) {
    return async (settings) => {
      // Check if already loaded
      if (this.loadedChunks.has(routeName)) {
        const module = await this.pendingLoads.get(routeName);
        return this._createRoute(module, settings);
      }
      
      // Start loading
      const loadPromise = this._loadChunk(routeName, loader);
      this.pendingLoads.set(routeName, loadPromise);
      
      const module = await loadPromise;
      this.loadedChunks.add(routeName);
      
      return this._createRoute(module, settings);
    };
  }
  
  // Load route chunk
  async _loadChunk(routeName, loader) {
    try {
      // Show loading indicator
      this._showLoading();
      
      // Load module
      const module = await loader();
      
      // Hide loading indicator
      this._hideLoading();
      
      return module;
    } catch (error) {
      this._hideLoading();
      console.error(`Failed to load route ${routeName}:`, error);
      throw error;
    }
  }
  
  // Create route from loaded module
  _createRoute(module, settings) {
    const Component = module.default || module;
    
    return MaterialPageRoute({
      builder: (context) => new Component({
        ...settings.arguments.getAll()
      }),
      settings: settings
    });
  }
  
  // Show loading indicator
  _showLoading() {
    // Show global loading overlay
    document.body.classList.add('route-loading');
  }
  
  // Hide loading indicator
  _hideLoading() {
    document.body.classList.remove('route-loading');
  }
  
  // Preload route
  async preload(routeName, loader) {
    if (this.loadedChunks.has(routeName)) return;
    
    const loadPromise = this._loadChunk(routeName, loader);
    this.pendingLoads.set(routeName, loadPromise);
    
    await loadPromise;
    this.loadedChunks.add(routeName);
  }
  
  // Clear cache
  clearCache() {
    this.loadedChunks.clear();
    this.pendingLoads.clear();
  }
}

// Usage with MaterialApp
const codeSplitter = new RouteCodeSplitter();

new MaterialApp({
  routes: {
    '/': (context) => HomePage(),
    '/about': (context) => AboutPage()
  },
  onGenerateRoute: (settings) => {
    // Lazy-loaded routes
    const lazyRoutes = {
      '/profile': () => import('./pages/profile.js'),
      '/settings': () => import('./pages/settings.js'),
      '/dashboard': () => import('./pages/dashboard.js')
    };
    
    const loader = lazyRoutes[settings.name];
    if (loader) {
      return codeSplitter.registerLazy(settings.name, loader)(settings);
    }
    
    return null;
  }
});

// Preload on hover
class NavigationLink extends StatelessWidget {
  constructor({ to, child, preload = true, key }) {
    super({ key });
    this.to = to;
    this.child = child;
    this.preload = preload;
  }
  
  build(context) {
    return MouseRegion({
      onEnter: () => {
        if (this.preload) {
          // Preload route on hover
          codeSplitter.preload(this.to, () => import(`./pages${this.to}.js`));
        }
      },
      child: GestureDetector({
        onTap: () => {
          Navigator.pushNamed(context, this.to);
        },
        child: this.child
      })
    });
  }
}
```

**Build Configuration for Code Splitting:**

```javascript
// webpack.config.js
module.exports = {
  entry: './src/main.js',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    path: path.resolve(__dirname, 'dist')
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Split by route
        routes: {
          test: /[\\/]src[\\/]pages[\\/]/,
          name(module) {
            const match = module.context.match(/pages[\\/](.+)/);
            return match ? `route-${match[1].replace(/[\\/]/g, '-')}` : 'route';
          },
          priority: 10
        },
        // Vendor chunk
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 5
        }
      }
    }
  }
};
```

**Validation:**
- ✅ Routes split into separate chunks
- ✅ Chunks loaded on demand
- ✅ Loading indicators shown
- ✅ Preloading works on hover
- ✅ Bundle size reduced

---

### 8.4.3 SEO Optimization for Routes

**File:** `src/router/seo-optimizer.js`

```javascript
class SEOOptimizer {
  constructor(router) {
    this.router = router;
    this.metaTags = new Map();
  }
  
  // Register meta tags for route
  register(routeName, meta) {
    this.metaTags.set(routeName, meta);
  }
  
  // Update meta tags on navigation
  updateMetaTags(route) {
    const meta = this.metaTags.get(route.name) || {};
    
    // Update title
    if (meta.title) {
      document.title = meta.title;
    }
    
    // Update meta description
    this._updateMetaTag('description', meta.description);
    
    // Update meta keywords
    this._updateMetaTag('keywords', meta.keywords);
    
    // Update Open Graph tags
    if (meta.og) {
      this._updateMetaTag('og:title', meta.og.title);
      this._updateMetaTag('og:description', meta.og.description);
      this._updateMetaTag('og:image', meta.og.image);
      this._updateMetaTag('og:url', meta.og.url);
    }
    
    // Update Twitter Card tags
    if (meta.twitter) {
      this._updateMetaTag('twitter:card', meta.twitter.card);
      this._updateMetaTag('twitter:title', meta.twitter.title);
      this._updateMetaTag('twitter:description', meta.twitter.description);
      this._updateMetaTag('twitter:image', meta.twitter.image);
    }
    
    // Update canonical URL
    if (meta.canonical) {
      this._updateLinkTag('canonical', meta.canonical);
    }
  }
  
  // Update meta tag
  _updateMetaTag(name, content) {
    if (!content) return;
    
    let tag = document.querySelector(`meta[name="${name}"]`) ||
              document.querySelector(`meta[property="${name}"]`);
    
    if (!tag) {
      tag = document.createElement('meta');
      const attr = name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name';
      tag.setAttribute(attr, name);
      document.head.appendChild(tag);
    }
    
    tag.setAttribute('content', content);
  }
  
  // Update link tag
  _updateLinkTag(rel, href) {
    if (!href) return;
    
    let tag = document.querySelector(`link[rel="${rel}"]`);
    
    if (!tag) {
      tag = document.createElement('link');
      tag.setAttribute('rel', rel);
      document.head.appendChild(tag);
    }
    
    tag.setAttribute('href', href);
  }
  
  // Generate sitemap
  generateSitemap(baseUrl) {
    const urls = [];
    
    for (const [routeName, meta] of this.metaTags.entries()) {
      // Skip dynamic routes for sitemap
      if (routeName.includes(':')) continue;
      
      urls.push({
        loc: `${baseUrl}${routeName}`,
        lastmod: meta.lastModified || new Date().toISOString(),
        changefreq: meta.changeFrequency || 'weekly',
        priority: meta.priority || 0.5
      });
    }
    
    return this._buildSitemapXML(urls);
  }
  
  // Build sitemap XML
  _buildSitemapXML(urls) {
    const urlElements = urls.map(url => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
  }
  
  // Generate robots.txt
  generateRobotsTxt(baseUrl, sitemapPath = '/sitemap.xml') {
    return `User-agent: *
Allow: /

Sitemap: ${baseUrl}${sitemapPath}`;
  }
}

// Usage
const seoOptimizer = new SEOOptimizer(router);

// Register SEO metadata
seoOptimizer.register('/', {
  title: 'Home - My App',
  description: 'Welcome to My App',
  keywords: 'app, home, welcome',
  og: {
    title: 'My App',
    description: 'The best app ever',
    image: 'https://myapp.com/og-image.jpg',
    url: 'https://myapp.com'
  },
  canonical: 'https://myapp.com'
});

seoOptimizer.register('/about', {
  title: 'About Us - My App',
  description: 'Learn about our company',
  keywords: 'about, company, team'
});

// Update on navigation
router.addObserver({
  didNavigate: ({ to }) => {
    seoOptimizer.updateMetaTags(to.route);
  }
});

// Generate sitemap
const sitemap = seoOptimizer.generateSitemap('https://myapp.com');
// Save to public/sitemap.xml

// Generate robots.txt
const robots = seoOptimizer.generateRobotsTxt('https://myapp.com');
// Save to public/robots.txt
```

**Server-Side Rendering for SEO:**

```javascript
// SSR route handler
class SSRRouteHandler {
  constructor(router, seoOptimizer) {
    this.router = router;
    this.seoOptimizer = seoOptimizer;
  }
  
  async renderRoute(path, context = {}) {
    // Match route
    const match = this.router.matchRoute(path);
    if (!match) {
      return this._render404();
    }
    
    // Build route
    const route = this.router.buildRoute(match, {}, '');
    
    // Get SEO metadata
    const meta = this.seoOptimizer.metaTags.get(route.route.name) || {};
    
    // Build page
    const page = route.route.buildPage(context, route.params, route.query);
    
    // Render to VNode
    const vnode = VNodeBuilder.build(page, context);
    
    // Render to HTML string
    const html = SSRRenderer.render(vnode, {
      title: meta.title,
      description: meta.description,
      meta: meta,
      hydrationData: this._generateHydrationData(route)
    });
    
    return html;
  }
  
  _render404() {
    return `<!DOCTYPE html>
<html>
<head>
  <title>404 - Page Not Found</title>
</head>
<body>
  <h1>404 - Page Not Found</h1>
</body>
</html>`;
  }
  
  _generateHydrationData(route) {
    return {
      route: route.path,
      params: route.params,
      query: route.query
    };
  }
}
```

**Validation:**
- ✅ Meta tags updated on navigation
- ✅ SSR renders correct meta tags
- ✅ Sitemap generated correctly
- ✅ SEO crawlers can index pages

---

### 8.4.4 Complete Integration Testing

**File:** `tests/routing/integration.test.js`

```javascript
describe('Routing System Integration', () => {
  let app;
  let router;
  
  beforeEach(() => {
    // Setup test app
    app = new MaterialApp({
      routes: {
        '/': (context) => HomePage(),
        '/about': (context) => AboutPage(),
        '/settings': (context) => SettingsPage()
      },
      onGenerateRoute: (settings) => {
        if (settings.name.startsWith('/user/')) {
          const userId = settings.name.split('/')[2];
          return MaterialPageRoute({
            builder: (context) => UserProfilePage({ userId }),
            settings: settings
          });
        }
        return null;
      }
    });
    
    router = app._state._router;
  });
  
  afterEach(() => {
    router.dispose();
  });
  
  describe('Basic Navigation', () => {
    test('navigates to static route', async () => {
      await router.navigateToPath('/about');
      expect(router.currentRoute.path).toBe('/about');
    });
    
    test('navigates to dynamic route', async () => {
      await router.navigateToPath('/user/123');
      expect(router.currentRoute.params.id).toBe('123');
    });
    
    test('handles query parameters', async () => {
      await router.navigateToPath('/about?ref=home');
      expect(router.currentRoute.query.ref).toBe('home');
    });
  });
  
  describe('Navigation Stack', () => {
    test('pushes routes onto stack', async () => {
      await router.push('/about');
      await router.push('/settings');
      expect(router.navigationStack.length).toBe(3); // home + about + settings
    });
    
    test('pops route from stack', async () => {
      await router.push('/about');
      await router.push('/settings');
      await router.pop();
      expect(router.currentRoute.path).toBe('/about');
    });
    
    test('replaces current route', async () => {
      await router.push('/about');
      await router.replace('/settings');
      expect(router.navigationStack.length).toBe(2); // home + settings
      expect(router.currentRoute.path).toBe('/settings');
    });
  });
  
  describe('Route Guards', () => {
    test('blocks navigation when guard returns false', async () => {
      router.addGuard(async () => false);
      const result = await router.push('/about');
      expect(result).toBe(false);
      expect(router.currentRoute.path).toBe('/');
    });
    
    test('allows navigation when guard returns true', async () => {
      router.addGuard(async () => true);
      const result = await router.push('/about');
      expect(result).toBe(true);
      expect(router.currentRoute.path).toBe('/about');
    });
  });
  
  describe('Deep Linking', () => {
    test('handles deep link on initialization', async () => {
      window.history.pushState(null, '', '/user/123');
      const newRouter = new RouterEngine({ initialRoute: '/user/123' });
      newRouter.initialize();
      expect(newRouter.currentRoute.params.id).toBe('123');
    });
  });
  
  describe('Browser History', () => {
    test('syncs with browser back button', async () => {
      await router.push('/about');
      await router.push('/settings');
      window.history.back();
      // Wait for popstate
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(router.currentRoute.path).toBe('/about');
    });
  });
});
```

**Validation:**
- ✅ All navigation methods work
- ✅ Stack management correct
- ✅ Guards execute properly
- ✅ Deep linking works
- ✅ Browser history synchronized
- ✅ No memory leaks

---

## Implementation Checklist

### Phase 8.1: Core Router Engine
- [ ] RouterEngine class with navigation methods
- [ ] Route matching algorithm (static + dynamic)
- [ ] Navigation stack management
- [ ] Browser History API integration
- [ ] Route definition system
- [ ] Path parsing and building
- [ ] HistoryManager for back/forward
- [ ] Unit tests (50+ test cases)
- [ ] Integration test (basic navigation)

### Phase 8.2: Navigator Widget System
- [ ] Navigator widget implementation
- [ ] Navigator.of(context) static methods
- [ ] MaterialPageRoute implementation
- [ ] Route transitions (slide, fade, scale)
- [ ] DialogRoute for modals
- [ ] BottomSheetRoute
- [ ] Modal helpers (showDialog, showModalBottomSheet)
- [ ] Unit tests (40+ test cases)
- [ ] Integration test (navigation in app)

### Phase 8.3: Advanced Routing Features
- [ ] Named routes registry
- [ ] Route arguments system
- [ ] Deep linking handler
- [ ] Route guards implementation
- [ ] Middleware system
- [ ] Nested navigation support
- [ ] Permission guards
- [ ] Unit tests (60+ test cases)
- [ ] Integration test (complex navigation flows)

### Phase 8.4: Integration & Optimization
- [ ] MaterialApp router integration
- [ ] Code splitting per route
- [ ] Lazy loading routes
- [ ] Preloading on hover
- [ ] SEO optimizer
- [ ] SSR route handler
- [ ] Sitemap generation
- [ ] robots.txt generation
- [ ] Production build optimization
- [ ] Unit tests (30+ test cases)
- [ ] End-to-end test (full app with routing)

---

## Success Criteria

**By end of Week 2 (Phase 8.1):**
- ✅ Router initializes and navigates
- ✅ Static and dynamic routes work
- ✅ Browser URL synchronized
- ✅ Back/forward buttons work

**By end of Week 4 (Phase 8.2):**
- ✅ Navigator widget functional
- ✅ Push/pop navigation works
- ✅ Route transitions animate smoothly
- ✅ Dialogs and bottom sheets work

**By end of Week 6 (Phase 8.3):**
- ✅ Named routes work
- ✅ Deep linking functional
- ✅ Route guards protect routes
- ✅ Nested navigation works

**By end of Week 8 (Phase 8.4):**
- ✅ Complete MaterialApp integration
- ✅ Code splitting reduces bundle size
- ✅ SEO optimized for search engines
- ✅ Production ready

---

## Testing Strategy

**Unit Tests:** 180+ test cases
- RouterEngine methods
- Route matching
- Navigation stack
- History management
- Navigator widget
- Route transitions
- Guards and middleware
- Deep linking
- SEO optimizer

**Integration Tests:** 40+ scenarios
- Basic navigation flow
- Multi-page navigation
- Modal and dialog navigation
- Nested navigation
- Deep link handling
- Browser back/forward
- Code splitting

**E2E Tests:** Full application flows
- Navigate through app
- Use browser back button
- Open deep links
- Navigate with guards
- Lazy load routes
- Check SEO meta tags

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Route navigation** | < 50ms | Time from push to render |
| **Transition animation** | 60 FPS | Smooth animations |
| **Code split load** | < 500ms | Chunk download + parse |
| **Deep link handling** | < 100ms | Parse + navigate |
| **Memory per route** | < 500KB | Route in navigation stack |
| **Browser history sync** | < 10ms | URL update latency |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Browser history conflicts | Wrong navigation | Clear history management |
| Memory leaks in stack | Growing memory | Proper cleanup on pop |
| Race conditions | Incorrect navigation | Navigation queue |
| SEO metadata missing | Poor indexing | Validation in tests |
| Code splitting fails | No fallback | Error boundaries |
| Deep links broken | User frustration | Extensive testing |

---

## Output Artifacts

By end of Step 8, you'll have:

1. **src/router/** - Complete routing system
   - router-engine.js
   - route.js
   - history-manager.js
   - named-routes.js
   - route-arguments.js
   - deep-linking.js
   - route-guards.js
   - nested-navigation.js
   - code-splitting.js
   - seo-optimizer.js
   - transitions.js

2. **src/widgets/** - Navigation widgets
   - navigator.js

3. **src/material/** - Material widgets
   - material-page-route.js
   - dialog-route.js

4. **tests/router/** - 180+ unit tests

5. **examples/routing/** - Working examples
   - Multi-page app
   - Deep linking
   - Protected routes
   - Nested navigation
   - Code splitting

6. **docs/routing-guide.md** - Implementation guide

7. **Performance benchmarks** - Metrics for each phase

---

## Next Steps (After Step 8)

Once Step 8 is complete, you'll have a **fully functional routing system**. The remaining steps will be:

- **Step 9:** Production Polish (error handling, DevTools, debugging)
- **Step 10:** Testing & QA (comprehensive test suite)
- **Step 11:** Documentation (API docs, guides, examples)
- **Step 12:** Performance Optimization (final tuning)

The routing system built in Step 8 is **critical infrastructure** for any multi-page application. Take time to test thoroughly and optimize performance before moving on..deepLinkHandlers = deepLinkHandlers;
  }
  
  createState() {
    return new _MaterialAppState();
  }
}

class _MaterialAppState extends State {
  initState() {
    super.initState();
    
    // Setup deep linking
    this._deepLinkHandler = new DeepLinkHandler(this._router);
    
    // Register handlers
    Object.entries(this.widget.deepLinkHandlers).forEach(([pattern, handler]) => {
      this._deepLinkHandler.register(pattern, async (params, query, fragment) => {
        const route = await handler(params, query, fragment);
        if (route) {
          Navigator.push(this.context, route);
        }
      });
    });
    
    // Check for initial deep link
    this._handleInitialDeepLink();
  }
  
  async _handleInitialDeepLink() {
    const initialUrl = window.location.href;
    await this._deepLinkHandler.handle(initialUrl);
  }
}

// Example usage
new MaterialApp({
  deepLinkHandlers: {
    '/user/:id': async (params, query, fragment) => {
      return MaterialPageRoute({
        builder: (context) => UserProfilePage({ 
          userId: params.id,
          highlight: query.highlight
        })
      });
    },
    '/post/:postId': async (params) => {
      return MaterialPageRoute({
        builder: (context) => PostDetailPage({ postId: params.postId })
      });
    }
  }
});

// Opening deep links
// myapp://user/123?highlight=photos
// https://myapp.com/post/456
```

**Validation:**
- ✅ Deep links parsed correctly
- ✅ Parameters extracted
- ✅ Routes created from links
- ✅ Initial deep link handled

---

### 8.3.4 Route Guards and Middleware

**File:** `src/router/route-guards.js`

```javascript
class RouteGuard {
  constructor(predicate, redirect) {
    this.predicate = predicate;    // async (to, from) => boolean
    this.redirect = redirect;       // (to, from) => string (redirect path)
  }
  
  async check(to, from, router) {
    const canNavigate = await this.predicate(to, from);
    
    if (!canNavigate && this.redirect) {
      const redirectPath = this.redirect(to, from);
      await router.navigateToPath(redirectPath, { replace: true });
      return false;
    }
    
    return canNavigate;
  }
}

// Authentication guard
class AuthGuard extends RouteGuard {
  constructor(authService, loginRoute = '/login') {
    super(
      async (to, from) => {
        return await authService.isAuthenticated();
      },
      (to, from) => {
        return `${loginRoute}?redirect=${encodeURIComponent(to.path)}`;
      }
    );
  }
}

// Permission guard
class PermissionGuard extends RouteGuard {
  constructor(requiredPermission, authService, forbiddenRoute = '/forbidden') {
    super(
      async (to, from) => {
        const user = await authService.getCurrentUser();
        return user && user.hasPermission(requiredPermission);
      },
      (to, from) => forbiddenRoute
    );
  }
}

// Role guard
class RoleGuard extends RouteGuard {
  constructor(allowedRoles, authService, unauthorizedRoute = '/unauthorized') {
    super(
      async (to, from) => {
        const user = await authService.getCurrentUser();
        return user && allowedRoles.includes(user.role);
      },
      (to, from) => unauthorizedRoute
    );
  }
}

// Middleware system
class RouteMiddleware {
  constructor() {
    this.globalMiddleware = [];
    this.routeMiddleware = new Map();
  }
  
  // Add global middleware (runs on all routes)
  addGlobal(middleware) {
    this.globalMiddleware.push(middleware);
  }
  
  // Add route-specific middleware
  add(routeName, middleware) {
    if (!this.routeMiddleware.has(routeName)) {
      this.routeMiddleware.set(routeName, []);
    }
    this.routeMiddleware.get(routeName).push(middleware);
  }
  
  // Execute middleware chain
  async execute(to, from, router) {
    // Execute global middleware
    for (const middleware of this.globalMiddleware) {
      const result = await middleware(to, from, router);
      if (result === false) return false;
    }
    
    // Execute route-specific middleware
    const routeMiddleware = this.routeMiddleware.get(to.route.name) || [];
    for (const middleware of routeMiddleware) {
      const result = await middleware(to, from, router);
      if (result === false) return false;
    }
    
    return true;
  }
}

// Example middleware functions
const logMiddleware = async (to, from, router) => {
  console.log(`Navigating from ${from?.path || 'initial'} to ${to.path}`);
  return true;
};

const analyticsMiddleware = async (to, from, router) => {
  // Track page view
  analytics.trackPageView(to.path, { from: from?.path });
  return true;
};

const loadingMiddleware = async (to, from, router) => {
  // Show loading indicator
  LoadingIndicator.show();
  
  // Continue navigation
  return true;
};

// Integration with router
class RouterEngine {
  constructor(options = {}) {
    // ... existing code
    this.middleware = new RouteMiddleware();
    
    // Setup default middleware
    if (options.logNavigation) {
      this.middleware.addGlobal(logMiddleware);
    }
  }
  
  async navigateToPath(path, options = {}) {
    // ... existing code
    
    // Execute middleware
    const canProceed = await this.middleware.execute(route, this.currentRoute, this);
    if (!canProceed) return false;
    
    // ... continue navigation
  }
}
```

**Usage:**

```javascript
// Create router with guards
const router = new RouterEngine({
  guards: [
    new AuthGuard(authService),
    new PermissionGuard('admin', authService)
  ]
});

// Add middleware
router.middleware.addGlobal(logMiddleware);
router.middleware.addGlobal(analyticsMiddleware);

// Route-specific middleware
router.middleware.add('/dashboard', async (to, from, router) => {
  // Load dashboard data
  await dashboardService.loadData();
  return true;
});

// In MaterialApp
new MaterialApp({
  onGenerateRoute: (settings) => {
    const route = MaterialPageRoute({
      builder: (context) => {
        // Route requires authentication
        if (settings.name === '/profile') {
          return AuthenticatedRoute({
            child: ProfilePage(),
            fallback: LoginPage()
          });
        }
        return HomePage();
      },
      settings: settings
    });
    
    // Attach guard metadata
    if (settings.name === '/admin') {
      route.meta = { requiresRole: 'admin' };
    }
    
    return route;
  }
});
```

**Validation:**
- ✅ Guards execute before navigation
- ✅ Failed guards redirect correctly
- ✅ Middleware chain executes in order
- ✅ Route-specific middleware works
- ✅ Async guards supported

---

### 8.3.5 Nested Navigation

**File:** `src/router/nested-navigation.js`

```javascript
// Nested Navigator widget
class NestedNavigator extends StatefulWidget {
  constructor({
    routes,
    initialRoute = '/',
    key
  }) {
    super({ key });
    this.routes = routes;
    this.initialRoute = initialRoute;
  }
  
  createState() {
    return new _NestedNavigatorState();
  }
}

class _NestedNavigatorState extends State {
  constructor() {
    super();
    this._router = null;
  }
  
  initState() {
    // Create child router
    this._router = new RouterEngine({
      initialRoute: this.widget.initialRoute,
      mode: 'memory' // Don't affect browser URL
    });
    
    // Register routes
    Object.entries(this.widget.routes).forEach(([path, config]) => {
      this._router.registerRoute(path, config);
    });
    
    this._router.initialize();
  }
  
  build(context) {
    return Navigator({
      initialRoute: this.widget.initialRoute,
      onGenerateRoute: (settings) => {
        const config = this.widget.routes[settings.name];
        if (!config) return null;
        
        return MaterialPageRoute({
          builder: config.builder || ((context) => new config.component()),
          settings: settings
        });
      }
    });
  }
  
  dispose() {
    this._router.dispose();
  }
}

// Example: Settings page with nested navigation
class SettingsPage extends StatelessWidget {
  build(context) {
    return Scaffold({
      appBar: AppBar({
        title: Text('Settings')
      }),
      body: Row({
        children: [
          // Side navigation
          NavigationRail({
            selectedIndex: 0,
            onDestinationSelected: (index) => {
              const routes = ['/account', '/privacy', '/notifications'];
              Navigator.pushNamed(context, routes[index]);
            },
            destinations: [
              NavigationRailDestination({
                icon: Icon(Icons.account_circle),
                label: Text('Account')
              }),
              NavigationRailDestination({
                icon: Icon(Icons.privacy_tip),
                label: Text('Privacy')
              }),
              NavigationRailDestination({
                icon: Icon(Icons.notifications),
                label: Text('Notifications')
              })
            ]
          }),
          
          // Nested content area
          Expanded({
            child: NestedNavigator({
              initialRoute: '/account',
              routes: {
                '/account': {
                  builder: (context) => AccountSettingsPage()
                },
                '/privacy': {
                  builder: (context) => PrivacySettingsPage()
                },
                '/notifications': {
                  builder: (context) => NotificationSettingsPage()
                }
              }
            })
          })
        ]
      })
    });
  }
}
```

**Validation:**
- ✅ Nested navigators independent
- ✅ Parent navigator unaffected
- ✅ URL management correct
- ✅ Back button works correctly

---

## Phase 8.4: Integration & Optimization (Weeks 7-8)

### Objective
Complete integration with MaterialApp, implement code splitting per route, and optimize for production.

### 8.4.1 MaterialApp Router Integration

**File:** `src/material/material-app.js`

**Complete MaterialApp with routing:**

```javascript
class MaterialApp extends StatefulWidget {
  constructor({
    home,
    routes = {},
    initialRoute,
    onGenerateRoute,
    onGenerateInitialRoutes,
    onUnknownRoute,
    navigatorKey,
    navigatorObservers = [],
    builder,
    title = '',
    onGenerateTitle,
    theme,
    darkTheme,
    themeMode = ThemeMode.system,
    locale,
    localizationsDelegates = [],
    supportedLocales = [Locale('en', 'US')],
    debugShowCheckedModeBanner = true,
    debugShowMaterialGrid = false,
    showPerformanceOverlay = false,
    checkerboardRasterCacheImages = false,
    checkerboardOffscreenLayers = false,
    showSemanticsDebugger = false,
    deepLinkHandlers = {},
    routeInformationParser,
    routerDelegate,
    backButtonDispatcher,
    key
  }) {
    super({ key });
    
    this.home = home;
    this.routes = routes;
    this.initialRoute = initialRoute || (home ? '/' : null);
    this.onGenerateRoute = onGenerateRoute;
    this.onGenerateInitialRoutes = onGenerateInitialRoutes;
    this