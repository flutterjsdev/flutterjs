# FlutterJS Workspace Reset Script (Windows)
# This script forcefully terminates processes and deletes build artifacts to resolve "EBUSY" errors.

Write-Host "🧹 Starting FlutterJS Workspace Reset..." -ForegroundColor Cyan

# 1. Kill Node.js processes related to FlutterJS
Write-Host "`n🔍 Searching for locking Node.exe processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*node.exe*" -and ($_.CommandLine -like "*flutterjs*" -or $_.Path -like "*flutterjs*")
}

if ($nodeProcesses) {
    Write-Host "   Killing $($nodeProcesses.Count) node processes..." -ForegroundColor Red
    $nodeProcesses | Stop-Process -Force
} else {
    Write-Host "   No relevant node processes found." -ForegroundColor DarkGray
}

# 2. Kill Dart processes running flutterjs.dart
Write-Host "`n🔍 Searching for locking Dart.exe processes..." -ForegroundColor Yellow
$dartProcesses = Get-Process dart -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -like "*flutterjs.dart*" -or $_.CommandLine -like "*flutterjs run*"
}

if ($dartProcesses) {
    Write-Host "   Killing $($dartProcesses.Count) dart processes..." -ForegroundColor Red
    $dartProcesses | Stop-Process -Force
} else {
    Write-Host "   No relevant dart processes found." -ForegroundColor DarkGray
}

# 3. Forcefully delete build and cache directories
$dirsToClean = @(
    "build",
    ".dart_tool",
    ".flutterjs-cache",
    "bin/flutterjs.exe"
)

Write-Host "`n🧹 Deleting artifacts..." -ForegroundColor Yellow
foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Write-Host "   Removing: $dir" -ForegroundColor Red
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
        } catch {
            Write-Host "   ⚠️  Failed to remove $dir: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   Attempting forceful rmdir..." -ForegroundColor Yellow
            & cmd /c "rmdir /s /q $dir" 2>$null
        }
    }
}

# 4. Success message
Write-Host "`n✅ Reset complete! You can now run 'dart run tool/init.dart' to re-initialize." -ForegroundColor Green
