import 'package:flutter/material.dart';
import 'dart:math';
import 'dart:async';
import 'dart:developer' as developer;
import 'dart:collection';
import 'dart:typed_data';

void main() { 
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // --- Test dart:math ---
    final rand = Random().nextInt(100);
    final point = Point(10, 20);

    // --- Test dart:async ---
    Timer(const Duration(seconds: 1), () {
      developer.log('Timer fired!');
    });
    Future.delayed(const Duration(milliseconds: 500), () {
      developer.log('Future completed');
    });


    // --- Test dart:collection ---
    final queue = Queue<int>();
    queue.add(1);
    queue.addLast(2);

    // --- Test dart:typed_data ---
    final bytes = Uint8List(8);
    bytes[0] = 255;

    // --- Test dart:developer ---
    developer.log('Build complete. Random: $rand, Point: $point');

    return Container();
  }
}
