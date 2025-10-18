/// Comprehensive category of analysis issues with full Flutter support
enum IssueCategory {
  // ==========================================================================
  // CORE CATEGORIES
  // ==========================================================================

  /// Syntactic or semantic error in code
  syntaxError,

  /// Type mismatch or incompatibility
  typeError,

  /// Unused variable, import, or field
  unusedCode,

  /// Potentially null reference or null safety violation
  nullSafety,

  /// Code quality or maintainability concern
  codeSmell,

  /// Naming convention or style violation
  convention,

  // ==========================================================================
  // FLUTTER WIDGET CATEGORIES
  // ==========================================================================

  flutterIssue,


  /// Widget construction or lifecycle issue
  flutterWidget,

  /// Widget tree structure or hierarchy problem
  flutterWidgetTree,

  /// Widget key usage or missing key
  flutterWidgetKey,

  /// StatelessWidget/StatefulWidget specific issue
  flutterStatelessWidget,

  /// State class or StatefulWidget issue
  flutterStatefulWidget,

  /// Custom widget implementation problem
  flutterCustomWidget,

  /// AnimatedWidget or animation-related issue
  flutterAnimation,

  /// Theme or styling related issue
  flutterTheme,

  /// Material Design specific issue
  flutterMaterial,

  /// Cupertino (iOS) design specific issue
  flutterCupertino,

  /// Responsive design or layout issue
  flutterResponsive,

  // ==========================================================================
  // FLUTTER STATE MANAGEMENT
  // ==========================================================================

  /// State management or setState issue
  flutterState,

  /// setState called in inappropriate context
  flutterSetState,

  /// Provider package usage issue
  flutterProvider,

  /// ChangeNotifier related issue
  flutterChangeNotifier,

  /// Bloc pattern or BLoC package issue
  flutterBloc,

  /// GetX or similar state management issue
  flutterGetX,

  /// Riverpod or similar provider issue
  flutterRiverpod,

  /// Inherited widget or InheritedModel issue
  flutterInherited,

  /// State persistence or caching issue
  flutterStateCache,

  // ==========================================================================
  // FLUTTER LIFECYCLE & CLEANUP
  // ==========================================================================

  /// Lifecycle method issue (initState, dispose, etc.)
  flutterLifecycle,

  /// initState implementation issue
  flutterInitState,

  /// dispose() cleanup issue or missing dispose
  flutterDispose,

  /// didUpdateWidget lifecycle issue
  flutterDidUpdateWidget,

  /// didChangeDependencies issue
  flutterDidChangeDependencies,

  /// Resource not properly disposed
  flutterResourceLeak,

  /// Stream or subscription not closed
  flutterStreamLeak,

  /// Animation controller not disposed
  flutterAnimationLeak,

  /// Listener not removed
  flutterListenerLeak,

  // ==========================================================================
  // FLUTTER ASYNC & FUTURES
  // ==========================================================================

  /// Async/await usage issue in Flutter context
  flutterAsync,

  /// FutureBuilder usage or implementation issue
  flutterFutureBuilder,

  /// StreamBuilder usage or implementation issue
  flutterStreamBuilder,

  /// Future not awaited
  flutterFutureNotAwaited,

  /// BuildContext accessed across async gaps
  flutterAsyncGap,

  /// Race condition or async race issue
  flutterAsyncRace,

  /// Timeout or slow async operation
  flutterAsyncTimeout,

  // ==========================================================================
  // FLUTTER PERFORMANCE
  // ==========================================================================

  /// Performance or optimization issue
  flutterPerformance,

  /// Unnecessary rebuild or excessive rebuilds
  flutterExcessiveRebuild,

  /// Heavy computation in build method
  flutterHeavyBuild,

  /// Const constructor not used where applicable
  flutterMissingConst,

  /// Memory leak or memory usage issue
  flutterMemoryLeak,

  /// ListView/GridView performance issue
  flutterScrollPerformance,

  /// Image loading or caching issue
  flutterImagePerformance,

  /// JSON parsing or deserialization performance
  flutterJsonPerformance,

  /// Database query or persistence performance
  flutterDatabasePerformance,

  // ==========================================================================
  // FLUTTER NAVIGATION & ROUTING
  // ==========================================================================

  /// Navigation or routing issue
  flutterNavigation,

  /// Navigator push/pop issue
  flutterNavigator,

  /// Route parameter passing issue
  flutterRouteParameters,

  /// Deep linking or URL routing issue
  flutterDeepLink,

  /// Named route not defined
  flutterNamedRoute,

  /// Modal or dialog presentation issue
  flutterModal,

  /// Page transition or animation issue
  flutterPageTransition,

  /// Navigation stack issue
  flutterNavigationStack,

  // ==========================================================================
  // FLUTTER LOCALIZATION & I18N
  // ==========================================================================

  /// Localization or internationalization issue
  flutterLocalization,

  /// Missing or incorrect translation
  flutterTranslation,

  /// Locale-specific formatting issue
  flutterLocaleFormat,

  /// RTL (right-to-left) language issue
  flutterRTL,

  // ==========================================================================
  // FLUTTER PLATFORM CHANNELS
  // ==========================================================================

  /// Platform channel communication issue
  flutterPlatformChannel,

  /// MethodChannel issue
  flutterMethodChannel,

  /// EventChannel issue
  flutterEventChannel,

  /// Platform-specific code issue
  flutterPlatformSpecific,

  // ==========================================================================
  // FLUTTER TESTING
  // ==========================================================================

  /// Test-related issue
  flutterTest,

  /// Widget test issue
  flutterWidgetTest,

  /// Unit test issue
  flutterUnitTest,

  /// Integration test issue
  flutterIntegrationTest,

  /// Mock or test setup issue
  flutterTestMock,

  /// Test assertion or expectation issue
  flutterTestAssertion,

  // ==========================================================================
  // FLUTTER DEPENDENCIES & PACKAGES
  // ==========================================================================

  /// Package or dependency issue
  flutterPackage,

  /// Package version conflict
  flutterPackageVersionConflict,

  /// Missing or outdated dependency
  flutterMissingDependency,

  /// Plugin or native dependency issue
  flutterPlugin,

  /// Pub.dev package issue
  flutterPubPackage,

  // ==========================================================================
  // FLUTTER SECURITY
  // ==========================================================================

  /// Security or privacy issue
  flutterSecurity,

  /// Hardcoded API key or secret
  flutterHardcodedSecret,

  /// Insecure HTTP usage
  flutterInsecureHttp,

  /// Data encryption or encoding issue
  flutterEncryption,

  /// Permission or capability issue
  flutterPermission,

  /// Biometric authentication issue
  flutterBiometric,

  // ==========================================================================
  // FLUTTER ACCESSIBILITY
  // ==========================================================================

  /// Accessibility issue (a11y)
  flutterAccessibility,

  /// Missing semantic labels
  flutterSemantics,

  /// Color contrast issue
  flutterContrast,

  /// Touch target size issue
  flutterTouchTarget,

  /// Screen reader support issue
  flutterScreenReader,

  // ==========================================================================
  // FLUTTER BUILD & COMPILATION
  // ==========================================================================

  /// Build or compilation issue
  flutterBuild,

  /// Gradle or build configuration issue
  flutterGradle,

  /// CocoaPods or iOS build issue
  flutterCocoapods,

  /// AOT or code generation issue
  flutterCodegen,

  /// Manifest or permissions issue
  flutterManifest,

  /// Build flavor or variant issue
  flutterBuildFlavor,

  // ==========================================================================
  // OTHER CATEGORIES
  // ==========================================================================

  /// Other or uncategorized issue
  other,
}

/// Extension methods for IssueCategory
extension IssueCategoryExtension on IssueCategory {
  /// Get human-readable name
  String get displayName {
    return switch (this) {

      IssueCategory.syntaxError => 'Syntax Error',
      IssueCategory.typeError => 'Type Error',
      IssueCategory.unusedCode => 'Unused Code',
      IssueCategory.nullSafety => 'Null Safety',
      IssueCategory.codeSmell => 'Code Smell',
      IssueCategory.convention => 'Convention',
      IssueCategory.flutterIssue => 'Flutter Issue',
      IssueCategory.flutterWidget => 'Widget Issue',
      IssueCategory.flutterWidgetTree => 'Widget Tree',
      IssueCategory.flutterWidgetKey => 'Widget Key',
      IssueCategory.flutterStatelessWidget => 'StatelessWidget',
      IssueCategory.flutterStatefulWidget => 'StatefulWidget',
      IssueCategory.flutterCustomWidget => 'Custom Widget',
      IssueCategory.flutterAnimation => 'Animation',
      IssueCategory.flutterTheme => 'Theme',
      IssueCategory.flutterMaterial => 'Material Design',
      IssueCategory.flutterCupertino => 'Cupertino Design',
      IssueCategory.flutterResponsive => 'Responsive Design',
      IssueCategory.flutterState => 'State Management',
      IssueCategory.flutterSetState => 'setState Issue',
      IssueCategory.flutterProvider => 'Provider',
      IssueCategory.flutterChangeNotifier => 'ChangeNotifier',
      IssueCategory.flutterBloc => 'BLoC Pattern',
      IssueCategory.flutterGetX => 'GetX',
      IssueCategory.flutterRiverpod => 'Riverpod',
      IssueCategory.flutterInherited => 'Inherited Widget',
      IssueCategory.flutterStateCache => 'State Cache',
      IssueCategory.flutterLifecycle => 'Lifecycle',
      IssueCategory.flutterInitState => 'initState',
      IssueCategory.flutterDispose => 'dispose()',
      IssueCategory.flutterDidUpdateWidget => 'didUpdateWidget',
      IssueCategory.flutterDidChangeDependencies => 'didChangeDependencies',
      IssueCategory.flutterResourceLeak => 'Resource Leak',
      IssueCategory.flutterStreamLeak => 'Stream Leak',
      IssueCategory.flutterAnimationLeak => 'Animation Leak',
      IssueCategory.flutterListenerLeak => 'Listener Leak',
      IssueCategory.flutterAsync => 'Async/Await',
      IssueCategory.flutterFutureBuilder => 'FutureBuilder',
      IssueCategory.flutterStreamBuilder => 'StreamBuilder',
      IssueCategory.flutterFutureNotAwaited => 'Future Not Awaited',
      IssueCategory.flutterAsyncGap => 'Async Gap',
      IssueCategory.flutterAsyncRace => 'Async Race',
      IssueCategory.flutterAsyncTimeout => 'Async Timeout',
      IssueCategory.flutterPerformance => 'Performance',
      IssueCategory.flutterExcessiveRebuild => 'Excessive Rebuild',
      IssueCategory.flutterHeavyBuild => 'Heavy Build',
      IssueCategory.flutterMissingConst => 'Missing const',
      IssueCategory.flutterMemoryLeak => 'Memory Leak',
      IssueCategory.flutterScrollPerformance => 'Scroll Performance',
      IssueCategory.flutterImagePerformance => 'Image Performance',
      IssueCategory.flutterJsonPerformance => 'JSON Performance',
      IssueCategory.flutterDatabasePerformance => 'Database Performance',
      IssueCategory.flutterNavigation => 'Navigation',
      IssueCategory.flutterNavigator => 'Navigator',
      IssueCategory.flutterRouteParameters => 'Route Parameters',
      IssueCategory.flutterDeepLink => 'Deep Link',
      IssueCategory.flutterNamedRoute => 'Named Route',
      IssueCategory.flutterModal => 'Modal/Dialog',
      IssueCategory.flutterPageTransition => 'Page Transition',
      IssueCategory.flutterNavigationStack => 'Navigation Stack',
      IssueCategory.flutterLocalization => 'Localization',
      IssueCategory.flutterTranslation => 'Translation',
      IssueCategory.flutterLocaleFormat => 'Locale Format',
      IssueCategory.flutterRTL => 'RTL Language',
      IssueCategory.flutterPlatformChannel => 'Platform Channel',
      IssueCategory.flutterMethodChannel => 'MethodChannel',
      IssueCategory.flutterEventChannel => 'EventChannel',
      IssueCategory.flutterPlatformSpecific => 'Platform Specific',
      IssueCategory.flutterTest => 'Test',
      IssueCategory.flutterWidgetTest => 'Widget Test',
      IssueCategory.flutterUnitTest => 'Unit Test',
      IssueCategory.flutterIntegrationTest => 'Integration Test',
      IssueCategory.flutterTestMock => 'Test Mock',
      IssueCategory.flutterTestAssertion => 'Test Assertion',
      IssueCategory.flutterPackage => 'Package',
      IssueCategory.flutterPackageVersionConflict => 'Package Version',
      IssueCategory.flutterMissingDependency => 'Missing Dependency',
      IssueCategory.flutterPlugin => 'Plugin',
      IssueCategory.flutterPubPackage => 'Pub.dev Package',
      IssueCategory.flutterSecurity => 'Security',
      IssueCategory.flutterHardcodedSecret => 'Hardcoded Secret',
      IssueCategory.flutterInsecureHttp => 'Insecure HTTP',
      IssueCategory.flutterEncryption => 'Encryption',
      IssueCategory.flutterPermission => 'Permission',
      IssueCategory.flutterBiometric => 'Biometric',
      IssueCategory.flutterAccessibility => 'Accessibility',
      IssueCategory.flutterSemantics => 'Semantics',
      IssueCategory.flutterContrast => 'Contrast',
      IssueCategory.flutterTouchTarget => 'Touch Target',
      IssueCategory.flutterScreenReader => 'Screen Reader',
      IssueCategory.flutterBuild => 'Build',
      IssueCategory.flutterGradle => 'Gradle',
      IssueCategory.flutterCocoapods => 'CocoaPods',
      IssueCategory.flutterCodegen => 'Code Generation',
      IssueCategory.flutterManifest => 'Manifest',
      IssueCategory.flutterBuildFlavor => 'Build Flavor',
      IssueCategory.other => 'Other',
    };
  }

  /// Get category color code (for UI display)
  String get colorCode {
    return switch (this) {
      // Core issues
      IssueCategory.syntaxError => '#FF0000',
      IssueCategory.typeError => '#FF6600',
      IssueCategory.unusedCode => '#9900FF',
      IssueCategory.nullSafety => '#FF0099',
      IssueCategory.codeSmell => '#FFCC00',
      IssueCategory.convention => '#00CCFF',
      // Flutter state & lifecycle
      IssueCategory.flutterIssue||
      IssueCategory.flutterState ||
      IssueCategory.flutterSetState ||
      IssueCategory.flutterLifecycle ||
      IssueCategory.flutterInitState ||
      IssueCategory.flutterDispose => '#00AA00',
      // Flutter performance
      IssueCategory.flutterPerformance ||
      IssueCategory.flutterExcessiveRebuild ||
      IssueCategory.flutterHeavyBuild ||
      IssueCategory.flutterMissingConst => '#FF9900',
      // Flutter leaks
      IssueCategory.flutterResourceLeak ||
      IssueCategory.flutterStreamLeak ||
      IssueCategory.flutterAnimationLeak ||
      IssueCategory.flutterListenerLeak => '#FF3333',
      // Flutter UI
      IssueCategory.flutterWidget ||
      IssueCategory.flutterWidgetTree ||
      IssueCategory.flutterCustomWidget => '#0099FF',
      // Flutter security
      IssueCategory.flutterSecurity ||
      IssueCategory.flutterHardcodedSecret ||
      IssueCategory.flutterInsecureHttp => '#FF0000',
      // Other
      _ => '#999999',
    };
  }

  /// Check if this is a Flutter-specific category
  bool get isFlutterCategory => name.startsWith('flutter');

  /// Check if this is a critical issue
  bool get isCritical {
    return switch (this) {
      IssueCategory.syntaxError ||
      IssueCategory.typeError ||
      IssueCategory.flutterDispose ||
      IssueCategory.flutterResourceLeak ||
      IssueCategory.flutterStreamLeak ||
      IssueCategory.flutterSecurity ||
      IssueCategory.flutterHardcodedSecret =>
        true,
      _ => false,
    };
  }

  /// Group related categories
  Set<IssueCategory> get relatedCategories {
    return switch (this) {
      IssueCategory.flutterSetState ||
      IssueCategory.flutterState =>
        {
          IssueCategory.flutterSetState,
          IssueCategory.flutterState,
          IssueCategory.flutterProvider,
          IssueCategory.flutterChangeNotifier,
        },
      IssueCategory.flutterDispose ||
      IssueCategory.flutterResourceLeak ||
      IssueCategory.flutterStreamLeak ||
      IssueCategory.flutterAnimationLeak =>
        {
          IssueCategory.flutterDispose,
          IssueCategory.flutterResourceLeak,
          IssueCategory.flutterStreamLeak,
          IssueCategory.flutterAnimationLeak,
          IssueCategory.flutterListenerLeak,
        },
      IssueCategory.flutterWidget ||
      IssueCategory.flutterWidgetTree ||
      IssueCategory.flutterCustomWidget =>
        {
          IssueCategory.flutterWidget,
          IssueCategory.flutterWidgetTree,
          IssueCategory.flutterCustomWidget,
          IssueCategory.flutterWidgetKey,
        },
      _ => {this},
    };
  }
}