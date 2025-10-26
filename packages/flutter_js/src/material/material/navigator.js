export class NavigatorObserver {
  // Called when route is pushed
  didPush(route, previousRoute) {}

  // Called when route is popped
  didPop(route, previousRoute) {}

  // Called when route is replaced
  didReplace(newRoute, oldRoute) {}

  // Called when route removal is started
  didStartUserGesture(route, previousRoute) {}

  // Called when user gesture dismissed
  didStopUserGesture() {}
}