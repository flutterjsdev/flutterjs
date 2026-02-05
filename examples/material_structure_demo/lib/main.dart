// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import 'package:flutter/material.dart';

void main() {
  runApp(const StructureDemoApp());
}

class StructureDemoApp extends StatelessWidget {
  const StructureDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Structure Demo',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      home: const StructurePage(),
    );
  }
}

class StructurePage extends StatefulWidget {
  const StructurePage({super.key});

  @override
  State<StructurePage> createState() => _StructurePageState();
}

class _StructurePageState extends State<StructurePage> {
  final List<bool> _expanded = [false, false];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Structure & Layout')),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const ListTile(
              leading: Icon(Icons.info),
              title: Text('Standard List Tile'),
              subtitle: Text('Supporting text'),
              trailing: Icon(Icons.chevron_right),
            ),
            const Divider(),

            ExpansionPanelList(
              expansionCallback: (int index, bool isExpanded) {
                setState(() {
                  _expanded[index] =
                      isExpanded; // API difference: isExpanded is new state in recent Flutter, check your impl
                });
              },
              children: [
                ExpansionPanel(
                  headerBuilder: (c, e) =>
                      const ListTile(title: Text('Panel 1')),
                  body: const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Body 1'),
                  ),
                  isExpanded: _expanded[0],
                ),
                ExpansionPanel(
                  headerBuilder: (c, e) =>
                      const ListTile(title: Text('Panel 2')),
                  body: const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Body 2'),
                  ),
                  isExpanded: _expanded[1],
                ),
              ],
            ),
            const Divider(height: 30),

            const Text(
              'DataTable',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            DataTable(
              columns: const [
                DataColumn(label: Text('Name')),
                DataColumn(label: Text('Role')),
              ],
              rows: const [
                DataRow(
                  cells: [DataCell(Text('Alice')), DataCell(Text('Engineer'))],
                ),
                DataRow(
                  cells: [DataCell(Text('Bob')), DataCell(Text('Designer'))],
                ),
              ],
            ),
            const Divider(height: 30),

            GridView.count(
              shrinkWrap: true, // For demo inside ScrollView
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              children: [
                GridTile(
                  header: const GridTileBar(
                    title: Text('Header'),
                    backgroundColor: Colors.black45,
                  ),
                  footer: const GridTileBar(
                    title: Text('Footer'),
                    backgroundColor: Colors.black45,
                  ),
                  child: Container(color: Colors.amber, height: 100),
                ),
                Container(color: Colors.cyan, height: 100),
              ],
            ),

            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  builder: (c) => Container(
                    height: 200,
                    color: Colors.white,
                    child: Center(
                      child: ElevatedButton(
                        onPressed: () => Navigator.pop(c),
                        child: const Text('Close BottomSheet'),
                      ),
                    ),
                  ),
                );
              },
              child: const Text('Show BottomSheet'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
