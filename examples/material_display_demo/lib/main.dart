// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:flutter/material.dart';

void main() {
  runApp(const DisplayDemoApp());
}

class DisplayDemoApp extends StatelessWidget {
  const DisplayDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Display Demo',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.purple),
      home: const DisplayPage(),
    );
  }
}

class DisplayPage extends StatelessWidget {
  const DisplayPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Display & Feedback')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Chips',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                const Chip(label: Text('Chip')),
                ActionChip(
                  avatar: const Icon(Icons.favorite),
                  label: const Text('Action Chip'),
                  onPressed: () {},
                ),
                const Chip(
                  avatar: CircleAvatar(
                    backgroundColor: Colors.blue,
                    child: Text('J'),
                  ),
                  label: Text('Avatar Chip'),
                ),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'Cards',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            const Card(
              child: SizedBox(
                width: 300,
                height: 100,
                child: Center(child: Text('Elevated Card')),
              ),
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                side: BorderSide(color: Theme.of(context).colorScheme.outline),
                borderRadius: const BorderRadius.all(Radius.circular(12)),
              ),
              child: const SizedBox(
                width: 300,
                height: 100,
                child: Center(child: Text('Outlined Card')),
              ),
            ),
            const Divider(height: 30),

            const Text(
              'Badges',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Badge(
                  label: const Text('3'),
                  child: IconButton(
                    icon: const Icon(Icons.notifications),
                    onPressed: () {},
                  ),
                ),
                const SizedBox(width: 20),
                Badge(
                  child: IconButton(
                    icon: const Icon(Icons.email),
                    onPressed: () {},
                  ),
                ),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'Progress',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            const LinearProgressIndicator(),
            const SizedBox(height: 20),
            const Row(
              children: [
                CircularProgressIndicator(),
                SizedBox(width: 20),
                CircularProgressIndicator(value: 0.5),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'Tooltips',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Tooltip(
              message: 'This is a tooltip',
              child: ElevatedButton(
                onPressed: () {},
                child: const Text('Hover Me'),
              ),
            ),

            const Divider(height: 30),

            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('This is a SnackBar'),
                    action: SnackBarAction(label: 'UNDO', onPressed: () {}),
                  ),
                );
              },
              child: const Text('Show SnackBar'),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showMaterialBanner(
                  const MaterialBanner(
                    content: Text('This is a Banner'),
                    actions: [
                      TextButton(onPressed: null, child: Text('DISMISS')),
                    ],
                  ),
                );
              },
              child: const Text('Show Banner (Mock)'),
            ),
          ],
        ),
      ),
    );
  }
}
