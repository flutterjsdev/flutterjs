import 'package:flutter/material.dart';
import '../models/data_model.dart';
import 'action_button.dart';

class UserProfileCard extends StatefulWidget {
  final User user;

  const UserProfileCard({Key? key, required this.user}) : super(key: key);

  @override
  State<UserProfileCard> createState() => _UserProfileCardState();
}

class _UserProfileCardState extends State<UserProfileCard> {
  bool _isFollowing = false;

  void _toggleFollow() {
    setState(() {
      _isFollowing = !_isFollowing;
    });
    // print('Follow status for ${widget.user.name}: $_isFollowing');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.grey.shade300,
            ),
            padding: const EdgeInsets.all(18),
            child: Text(
              widget.user.name[0],
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.user.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.user.role,
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          ActionButton(
            label: _isFollowing ? 'Unfollow' : 'Follow',
            onPressed: _toggleFollow,
            color: _isFollowing ? Colors.red : Colors.blue,
          ),
        ],
      ),
    );
  }
}
