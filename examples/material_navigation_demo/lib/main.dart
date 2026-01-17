import 'package:flutter/material.dart';

void main() {
  runApp(const NavigationDemoApp());
}

class NavigationDemoApp extends StatelessWidget {
  const NavigationDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Navigation Demo',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.green),
      home: const NavigationHome(),
    );
  }
}

class NavigationHome extends StatefulWidget {
  const NavigationHome({super.key});

  @override
  State<NavigationHome> createState() => _NavigationHomeState();
}

class _NavigationHomeState extends State<NavigationHome> {
  int _screenIndex = 0;

  @override
  Widget build(BuildContext context) {
    // Responsive Navigation strategy
    // Narrow < 600: NavigationBar (Bottom)
    // Wide >= 600: NavigationRail (Left)

    // For manual testing we will just show NavigationBar example first

    return Scaffold(
      appBar: AppBar(title: const Text('Navigation')),
      drawer: NavigationDrawer(
        children: const [
          DrawerHeader(child: Text('Drawer Header')),
          NavigationDrawerDestination(
            icon: Icon(Icons.home),
            label: Text('Home'),
          ),
          NavigationDrawerDestination(
            icon: Icon(Icons.settings),
            label: Text('Settings'),
          ),
        ],
      ),
      body: Row(
        children: [
          // Show Rail only if screen is wide (simulated)
          // NavigationRail(
          //   destinations: const [
          //      NavigationRailDestination(icon: Icon(Icons.home), label: Text('Home')),
          //      NavigationRailDestination(icon: Icon(Icons.star), label: Text('Favorites')),
          //   ],
          //   selectedIndex: _screenIndex,
          //   onDestinationSelected: (val) => setState(() => _screenIndex = val),
          // ),
          // Vertical Divider
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Selected Index: $_screenIndex'),
                  const SizedBox(height: 20),
                  const Text('Tabs Demo:'),
                  const SizedBox(height: 10),
                  const SizedBox(
                    height: 200,
                    child: DefaultTabController(
                      length: 3,
                      child: Column(
                        children: [
                          TabBar(
                            tabs: [
                              Tab(icon: Icon(Icons.cloud), text: 'Cloud'),
                              Tab(
                                icon: Icon(Icons.beach_access),
                                text: 'Beach',
                              ),
                              Tab(icon: Icon(Icons.sunny), text: 'Sunny'),
                            ],
                          ),
                          Expanded(
                            child: TabBarView(
                              children: [
                                Center(child: Text('Cloudy')),
                                Center(child: Text('Rainy')),
                                Center(child: Text('Sunny')),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _screenIndex,
        onDestinationSelected: (val) => setState(() => _screenIndex = val),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.explore), label: 'Explore'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
