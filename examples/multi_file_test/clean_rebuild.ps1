Write-Host "🧹 Complete Clean Rebuild Script" -ForegroundColor Cyan

# Kill all running dev servers
Write-Host "`n1. Stopping all running dev servers..." -ForegroundColor Yellow
Get-Process -Name "dart" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clear dev cache
Write-Host "`n2. Clearing .dev/node_modules..." -ForegroundColor Yellow
Remove-Item ".dev" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   ✓ Cleared" -ForegroundColor Green

# Rebuild material package
Write-Host "`n3. Rebuilding @flutterjs/material package..." -ForegroundColor Yellow
Set-Location "..\..\packages\flutterjs_engine\package\material"
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Material package rebuilt" -ForegroundColor Green
} else {
    Write-Host "   ✗ Build failed" -ForegroundColor Red
    exit 1
}

# Go back to example
Set-Location "..\..\..\..\examples\multi_file_test"

# Start fresh dev server
Write-Host "`n4. Starting fresh dev server..." -ForegroundColor Yellow
Write-Host "`n📌 IMPORTANT: Clear browser cache (Ctrl+Shift+Delete) and hard refresh (Ctrl+Shift+R)`n" -ForegroundColor Magenta

dart run ..\..\bin\flutterjs.dart run --to-js --serve
