// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:flutter/material.dart';

void main() {
  runApp(const ButtonsDemoApp());
}

class ButtonsDemoApp extends StatelessWidget {
  const ButtonsDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Buttons Demo',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
      home: const ButtonsPage(),
    );
  }
}

class ButtonsPage extends StatefulWidget {
  const ButtonsPage({super.key});

  @override
  State<ButtonsPage> createState() => _ButtonsPageState();
}

class _ButtonsPageState extends State<ButtonsPage> {
  final List<bool> _toggleState = [true, false, false];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buttons & Toggles')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Common Buttons',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                ElevatedButton(onPressed: () {}, child: const Text('Elevated')),
                FilledButton(onPressed: () {}, child: const Text('Filled')),
                FilledButton.tonal(
                  onPressed: () {},
                  child: const Text('Filled Tonal'),
                ),
                OutlinedButton(onPressed: () {}, child: const Text('Outlined')),
                TextButton(onPressed: () {}, child: const Text('Text')),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'Icon Buttons',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                IconButton(icon: const Icon(Icons.add), onPressed: () {}),
                IconButton.filled(
                  icon: const Icon(Icons.edit),
                  onPressed: () {},
                ),
                IconButton.outlined(
                  icon: const Icon(Icons.delete),
                  onPressed: () {},
                ),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'Floating Action Buttons',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                FloatingActionButton(
                  onPressed: () {},
                  child: const Icon(Icons.add),
                ),
                const SizedBox(width: 10),
                FloatingActionButton.small(
                  onPressed: () {},
                  child: const Icon(Icons.remove),
                ),
                const SizedBox(width: 10),
                FloatingActionButton.large(
                  onPressed: () {},
                  child: const Icon(Icons.check),
                ),
                const SizedBox(width: 10),
                FloatingActionButton.extended(
                  onPressed: () {},
                  label: const Text('Extended'),
                  icon: const Icon(Icons.edit),
                ),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'Toggle Buttons',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            ToggleButtons(
              isSelected: _toggleState,
              onPressed: (index) {
                setState(() {
                  _toggleState[index] = !_toggleState[index];
                });
              },
              children: const [
                Icon(Icons.format_bold),
                Icon(Icons.format_italic),
                Icon(Icons.format_underline),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'Menu Buttons',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            MenuAnchor(
              builder:
                  (
                    BuildContext context,
                    MenuController controller,
                    Widget? child,
                  ) {
                    return FilledButton(
                      onPressed: () {
                        if (controller.isOpen) {
                          controller.close();
                        } else {
                          controller.open();
                        }
                      },
                      child: const Text('Show Menu'),
                    );
                  },
              menuChildren: [
                MenuItemButton(onPressed: () {}, child: const Text('Item 1')),
                MenuItemButton(onPressed: () {}, child: const Text('Item 2')),
                SubmenuButton(
                  menuChildren: [
                    MenuItemButton(
                      onPressed: () {},
                      child: const Text('Subitem 1'),
                    ),
                  ],
                  child: const Text('Submenu'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            PopupMenuButton(
              itemBuilder: (context) => [
                const PopupMenuItem(child: Text('Popup 1')),
                const PopupMenuItem(child: Text('Popup 2')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
