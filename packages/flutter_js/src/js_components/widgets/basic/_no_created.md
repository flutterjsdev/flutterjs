'''
class WidgetToRenderBoxAdapter extends LeafRenderObjectWidget {

  WidgetToRenderBoxAdapter({required this.renderBox, this.onBuild, this.onUnmount})
    : super(key: GlobalObjectKey(renderBox));

  final RenderBox renderBox;

  final VoidCallback? onBuild;

  final VoidCallback? onUnmount;

  @override
  RenderBox createRenderObject(BuildContext context) => renderBox;

  @override
  void updateRenderObject(BuildContext context, RenderBox renderObject) {
    onBuild?.call();
  }

  @override
  void didUnmountRenderObject(RenderObject renderObject) {
    assert(renderObject == renderBox);
    onUnmount?.call();
  }
}

class Listener extends SingleChildRenderObjectWidget {

  const Listener({
    super.key,
    this.onPointerDown,
    this.onPointerMove,
    this.onPointerUp,
    this.onPointerHover,
    this.onPointerCancel,
    this.onPointerPanZoomStart,
    this.onPointerPanZoomUpdate,
    this.onPointerPanZoomEnd,
    this.onPointerSignal,
    this.behavior = HitTestBehavior.deferToChild,
    super.child,
  });

  final PointerDownEventListener? onPointerDown;

  final PointerMoveEventListener? onPointerMove;

  final PointerUpEventListener? onPointerUp;

  final PointerHoverEventListener? onPointerHover;

  final PointerCancelEventListener? onPointerCancel;

  final PointerPanZoomStartEventListener? onPointerPanZoomStart;

  final PointerPanZoomUpdateEventListener? onPointerPanZoomUpdate;

  final PointerPanZoomEndEventListener? onPointerPanZoomEnd;

  final PointerSignalEventListener? onPointerSignal;

  final HitTestBehavior behavior;

  @override
  RenderPointerListener createRenderObject(BuildContext context) {
    return RenderPointerListener(
      onPointerDown: onPointerDown,
      onPointerMove: onPointerMove,
      onPointerUp: onPointerUp,
      onPointerHover: onPointerHover,
      onPointerCancel: onPointerCancel,
      onPointerPanZoomStart: onPointerPanZoomStart,
      onPointerPanZoomUpdate: onPointerPanZoomUpdate,
      onPointerPanZoomEnd: onPointerPanZoomEnd,
      onPointerSignal: onPointerSignal,
      behavior: behavior,
    );
  }

  @override
  void updateRenderObject(BuildContext context, RenderPointerListener renderObject) {
    renderObject
      ..onPointerDown = onPointerDown
      ..onPointerMove = onPointerMove
      ..onPointerUp = onPointerUp
      ..onPointerHover = onPointerHover
      ..onPointerCancel = onPointerCancel
      ..onPointerPanZoomStart = onPointerPanZoomStart
      ..onPointerPanZoomUpdate = onPointerPanZoomUpdate
      ..onPointerPanZoomEnd = onPointerPanZoomEnd
      ..onPointerSignal = onPointerSignal
      ..behavior = behavior;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    final List<String> listeners = <String>[
      if (onPointerDown != null) 'down',
      if (onPointerMove != null) 'move',
      if (onPointerUp != null) 'up',
      if (onPointerHover != null) 'hover',
      if (onPointerCancel != null) 'cancel',
      if (onPointerPanZoomStart != null) 'panZoomStart',
      if (onPointerPanZoomUpdate != null) 'panZoomUpdate',
      if (onPointerPanZoomEnd != null) 'panZoomEnd',
      if (onPointerSignal != null) 'signal',
    ];
    properties.add(IterableProperty<String>('listeners', listeners, ifEmpty: '<none>'));
    properties.add(EnumProperty<HitTestBehavior>('behavior', behavior));
  }
}
'''



'''


class RepaintBoundary extends SingleChildRenderObjectWidget {

  const RepaintBoundary({super.key, super.child});

  RepaintBoundary.wrap(Widget child, int childIndex)
    : super(key: ValueKey<Object>(child.key ?? childIndex), child: child);

  static List<RepaintBoundary> wrapAll(List<Widget> widgets) => <RepaintBoundary>[
    for (int i = 0; i < widgets.length; ++i) RepaintBoundary.wrap(widgets[i], i),
  ];

  @override
  RenderRepaintBoundary createRenderObject(BuildContext context) => RenderRepaintBoundary();
}

class IgnorePointer extends SingleChildRenderObjectWidget {

  const IgnorePointer({
    super.key,
    this.ignoring = true,
    @Deprecated(
      'Use ExcludeSemantics or create a custom ignore pointer widget instead. '
      'This feature was deprecated after v3.8.0-12.0.pre.',
    )
    this.ignoringSemantics,
    super.child,
  });

  final bool ignoring;

  @Deprecated(
    'Use ExcludeSemantics or create a custom ignore pointer widget instead. '
    'This feature was deprecated after v3.8.0-12.0.pre.',
  )
  final bool? ignoringSemantics;

  @override
  RenderIgnorePointer createRenderObject(BuildContext context) {
    return RenderIgnorePointer(ignoring: ignoring, ignoringSemantics: ignoringSemantics);
  }

  @override
  void updateRenderObject(BuildContext context, RenderIgnorePointer renderObject) {
    renderObject
      ..ignoring = ignoring
      ..ignoringSemantics = ignoringSemantics;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<bool>('ignoring', ignoring));
    properties.add(
      DiagnosticsProperty<bool>('ignoringSemantics', ignoringSemantics, defaultValue: null),
    );
  }
}

class AbsorbPointer extends SingleChildRenderObjectWidget {

  const AbsorbPointer({
    super.key,
    this.absorbing = true,
    @Deprecated(
      'Use ExcludeSemantics or create a custom absorb pointer widget instead. '
      'This feature was deprecated after v3.8.0-12.0.pre.',
    )
    this.ignoringSemantics,
    super.child,
  });

  final bool absorbing;

  @Deprecated(
    'Use ExcludeSemantics or create a custom absorb pointer widget instead. '
    'This feature was deprecated after v3.8.0-12.0.pre.',
  )
  final bool? ignoringSemantics;

  @override
  RenderAbsorbPointer createRenderObject(BuildContext context) {
    return RenderAbsorbPointer(absorbing: absorbing, ignoringSemantics: ignoringSemantics);
  }

  @override
  void updateRenderObject(BuildContext context, RenderAbsorbPointer renderObject) {
    renderObject
      ..absorbing = absorbing
      ..ignoringSemantics = ignoringSemantics;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<bool>('absorbing', absorbing));
    properties.add(
      DiagnosticsProperty<bool>('ignoringSemantics', ignoringSemantics, defaultValue: null),
    );
  }
}


class MetaData extends SingleChildRenderObjectWidget {

  const MetaData({
    super.key,
    this.metaData,
    this.behavior = HitTestBehavior.deferToChild,
    super.child,
  });

  final dynamic metaData;

  final HitTestBehavior behavior;

  @override
  RenderMetaData createRenderObject(BuildContext context) {
    return RenderMetaData(metaData: metaData, behavior: behavior);
  }

  @override
  void updateRenderObject(BuildContext context, RenderMetaData renderObject) {
    renderObject
      ..metaData = metaData
      ..behavior = behavior;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(EnumProperty<HitTestBehavior>('behavior', behavior));
    properties.add(DiagnosticsProperty<dynamic>('metaData', metaData));
  }
}

@immutable
class Semantics extends _SemanticsBase {

  Semantics({
    super.key,
    super.child,
    super.container = false,
    super.explicitChildNodes = false,
    super.excludeSemantics = false,
    super.blockUserActions = false,
    super.enabled,
    super.checked,
    super.mixed,
    super.selected,
    super.toggled,
    super.button,
    super.slider,
    super.keyboardKey,
    super.link,
    super.linkUrl,
    super.header,
    super.headingLevel,
    super.textField,
    super.readOnly,
    super.focusable,
    super.focused,
    super.inMutuallyExclusiveGroup,
    super.obscured,
    super.multiline,
    super.scopesRoute,
    super.namesRoute,
    super.hidden,
    super.image,
    super.liveRegion,
    super.expanded,
    super.isRequired,
    super.maxValueLength,
    super.currentValueLength,
    super.identifier,
    super.traversalParentIdentifier,
    super.traversalChildIdentifier,
    super.label,
    super.attributedLabel,
    super.value,
    super.attributedValue,
    super.increasedValue,
    super.attributedIncreasedValue,
    super.decreasedValue,
    super.attributedDecreasedValue,
    super.hint,
    super.attributedHint,
    super.tooltip,
    super.onTapHint,
    super.onLongPressHint,
    super.textDirection,
    super.sortKey,
    super.tagForChildren,
    super.onTap,
    super.onLongPress,
    super.onScrollLeft,
    super.onScrollRight,
    super.onScrollUp,
    super.onScrollDown,
    super.onIncrease,
    super.onDecrease,
    super.onCopy,
    super.onCut,
    super.onPaste,
    super.onDismiss,
    super.onMoveCursorForwardByCharacter,
    super.onMoveCursorBackwardByCharacter,
    super.onSetSelection,
    super.onSetText,
    super.onDidGainAccessibilityFocus,
    super.onDidLoseAccessibilityFocus,
    super.onFocus,
    super.onExpand,
    super.onCollapse,
    super.customSemanticsActions,
    super.role,
    super.controlsNodes,
    super.validationResult = SemanticsValidationResult.none,
    super.inputType,
    super.localeForSubtree,
  });

  const Semantics.fromProperties({
    super.key,
    super.child,
    super.container = false,
    super.explicitChildNodes = false,
    super.excludeSemantics = false,
    super.blockUserActions = false,
    super.localeForSubtree,
    required super.properties,
  }) : super.fromProperties();

  @override
  RenderSemanticsAnnotations createRenderObject(BuildContext context) {
    return RenderSemanticsAnnotations(
      container: container,
      explicitChildNodes: explicitChildNodes,
      excludeSemantics: excludeSemantics,
      blockUserActions: blockUserActions,
      properties: properties,
      localeForSubtree: localeForSubtree,
      textDirection: _getTextDirection(context),
    );
  }

  @override
  void updateRenderObject(BuildContext context, RenderSemanticsAnnotations renderObject) {
    renderObject
      ..container = container
      ..explicitChildNodes = explicitChildNodes
      ..excludeSemantics = excludeSemantics
      ..blockUserActions = blockUserActions
      ..properties = properties
      ..textDirection = _getTextDirection(context)
      ..localeForSubtree = localeForSubtree;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<bool>('container', container));
    properties.add(DiagnosticsProperty<SemanticsProperties>('properties', this.properties));
    this.properties.debugFillProperties(properties);
  }
}

class MergeSemantics extends SingleChildRenderObjectWidget {

  const MergeSemantics({super.key, super.child});

  @override
  RenderMergeSemantics createRenderObject(BuildContext context) => RenderMergeSemantics();
}

class BlockSemantics extends SingleChildRenderObjectWidget {

  const BlockSemantics({super.key, this.blocking = true, super.child});

  final bool blocking;

  @override
  RenderBlockSemantics createRenderObject(BuildContext context) =>
      RenderBlockSemantics(blocking: blocking);

  @override
  void updateRenderObject(BuildContext context, RenderBlockSemantics renderObject) {
    renderObject.blocking = blocking;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<bool>('blocking', blocking));
  }
}

class ExcludeSemantics extends SingleChildRenderObjectWidget {

  const ExcludeSemantics({super.key, this.excluding = true, super.child});

  final bool excluding;

  @override
  RenderExcludeSemantics createRenderObject(BuildContext context) =>
      RenderExcludeSemantics(excluding: excluding);

  @override
  void updateRenderObject(BuildContext context, RenderExcludeSemantics renderObject) {
    renderObject.excluding = excluding;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<bool>('excluding', excluding));
  }
}

class IndexedSemantics extends SingleChildRenderObjectWidget {

  const IndexedSemantics({super.key, required this.index, super.child});

  final int index;

  @override
  RenderIndexedSemantics createRenderObject(BuildContext context) =>
      RenderIndexedSemantics(index: index);

  @override
  void updateRenderObject(BuildContext context, RenderIndexedSemantics renderObject) {
    renderObject.index = index;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<int>('index', index));
  }
}

class KeyedSubtree extends StatelessWidget {

  const KeyedSubtree({super.key, required this.child});

  KeyedSubtree.wrap(this.child, int childIndex)
    : super(key: ValueKey<Object>(child.key ?? childIndex));

  final Widget child;

  static List<Widget> ensureUniqueKeysForList(List<Widget> items, {int baseIndex = 0}) {
    if (items.isEmpty) {
      return items;
    }

    final List<Widget> itemsWithUniqueKeys = <Widget>[
      for (final (int i, Widget item) in items.indexed) KeyedSubtree.wrap(item, baseIndex + i),
    ];

    assert(!debugItemsHaveDuplicateKeys(itemsWithUniqueKeys));
    return itemsWithUniqueKeys;
  }

  @override
  Widget build(BuildContext context) => child;
}

class Builder extends StatelessWidget {

  const Builder({super.key, required this.builder});

  final WidgetBuilder builder;

  @override
  Widget build(BuildContext context) => builder(context);
}

typedef StatefulWidgetBuilder = Widget Function(BuildContext context, StateSetter setState);

class StatefulBuilder extends StatefulWidget {

  const StatefulBuilder({super.key, required this.builder});

  final StatefulWidgetBuilder builder;

  @override
  State<StatefulBuilder> createState() => _StatefulBuilderState();
}

class _StatefulBuilderState extends State<StatefulBuilder> {
  @override
  Widget build(BuildContext context) => widget.builder(context, setState);
}

class ColoredBox extends SingleChildRenderObjectWidget {

  const ColoredBox({required this.color, super.child, super.key});

  final Color color;

  @override
  RenderObject createRenderObject(BuildContext context) {
    return _RenderColoredBox(color: color);
  }

  @override
  void updateRenderObject(BuildContext context, RenderObject renderObject) {
    (renderObject as _RenderColoredBox).color = color;
  }

  @override
  void debugFillProperties(DiagnosticPropertiesBuilder properties) {
    super.debugFillProperties(properties);
    properties.add(DiagnosticsProperty<Color>('color', color));
  }
}


class _RenderColoredBox extends RenderProxyBoxWithHitTestBehavior {
  _RenderColoredBox({required Color color})
    : _color = color,
      super(behavior: HitTestBehavior.opaque);

  Color get color => _color;
  Color _color;
  set color(Color value) {
    if (value == _color) {
      return;
    }
    _color = value;
    markNeedsPaint();
  }

  @override
  void paint(PaintingContext context, Offset offset) {

    if (size > Size.zero) {
      context.canvas.drawRect(offset & size, Paint()..color = color);
    }
    if (child != null) {
      context.paintChild(child!, offset);
    }
  }
}'''