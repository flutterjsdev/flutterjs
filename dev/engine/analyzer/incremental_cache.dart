// lib/src/analyzer/incremental_cache.dart

import 'dart:io';
import 'dart:convert';
import 'package:path/path.dart' as path;

import 'model/class_model.dart';

class IncrementalCache {
  final String cacheDir;
  final Map<String, String> _fileHashes = {};
  final Map<String, FileDeclaration> _fileIRCache = {};

  IncrementalCache(this.cacheDir);

  Future<void> initialize() async {
    final dir = Directory(cacheDir);
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    
    await _loadHashIndex();
  }

  Future<String?> getFileHash(String filePath) async {
    return _fileHashes[filePath];
  }

  Future<void> setFileHash(String filePath, String hash) async {
    _fileHashes[filePath] = hash;
    await _saveHashIndex();
  }

  Future<FileDeclaration?> getFileDeclaration(String filePath) async {
    if (_fileIRCache.containsKey(filePath)) {
      return _fileIRCache[filePath];
    }
    
    final cacheFile = _getCacheFilePath(filePath);
    if (!await File(cacheFile).exists()) return null;
    
    final bytes = await File(cacheFile).readAsBytes();
    final fileIR = FileDeclaration.fromBinary(bytes);
    _fileIRCache[filePath] = fileIR;
    
    return fileIR;
  }

  Future<void> saveFileIR(String filePath, FileDeclaration fileIR) async {
    final cacheFile = _getCacheFilePath(filePath);
    final bytes = fileIR.toBinary();
    
    await File(cacheFile).writeAsBytes(bytes);
    _fileIRCache[filePath] = fileIR;
  }

  Future<void> saveAll(Map<String, FileDeclaration> fileIRs) async {
    for (final entry in fileIRs.entries) {
      await saveFileIR(entry.key, entry.value);
    }
  }

  String _getCacheFilePath(String filePath) {
    final hash = filePath.hashCode.toRadixString(16);
    return path.join(cacheDir, '$hash.ir.bin');
  }

  Future<void> _loadHashIndex() async {
    final indexFile = File(path.join(cacheDir, 'hash_index.json'));
    if (!await indexFile.exists()) return;
    
    final content = await indexFile.readAsString();
    final Map<String, dynamic> json = jsonDecode(content);
    _fileHashes.addAll(json.cast<String, String>());
  }

  Future<void> _saveHashIndex() async {
    final indexFile = File(path.join(cacheDir, 'hash_index.json'));
    final content = jsonEncode(_fileHashes);
    await indexFile.writeAsString(content);
  }

  void dispose() {
    _fileIRCache.clear();
  }
}