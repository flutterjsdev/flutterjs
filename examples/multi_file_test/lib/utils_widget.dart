import 'package:flutter/material.dart';

class UtilsWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.blue,
      child: Text('I am a widget from another file!'),
    );
  }
}

class UnusedWidget extends StatelessWidget {
  const UnusedWidget({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Container();
  }
}
