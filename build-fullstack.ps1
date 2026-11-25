# Build and verify fullstack React + Laravel application for Wasmer Edge deployment
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Building Fullstack App for Wasmer Edge" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$publicDir = Join-Path $scriptDir "public"

# 1. Build Frontend directly into public/
Write-Host "`n[1/3] Building React Frontend with Vite..." -ForegroundColor Yellow
Push-Location $scriptDir
try {
    npm run build
} finally {
    Pop-Location
}

# 2. Verify Built Public Assets
Write-Host "`n[2/3] Verifying compiled assets in Laravel public directory..." -ForegroundColor Yellow
$indexHtml = Join-Path $publicDir "index.html"
$assetsDir = Join-Path $publicDir "assets"
if ((Test-Path $indexHtml) -and (Test-Path $assetsDir)) {
    Write-Host "  -> Verified index.html and assets/ in $publicDir" -ForegroundColor Green
} else {
    Write-Error "Compiled frontend assets were not generated in $publicDir."
}

# 3. Validation
Write-Host "`n[3/3] Validating Wasmer configuration..." -ForegroundColor Yellow
$wasmerToml = Join-Path $scriptDir "wasmer.toml"
$appYaml = Join-Path $scriptDir "app.yaml"
if ((Test-Path $wasmerToml) -and (Test-Path $appYaml)) {
    Write-Host "  -> wasmer.toml and app.yaml verified in $scriptDir" -ForegroundColor Green
} else {
    Write-Warning "Wasmer configuration files missing in $scriptDir"
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host " Build Complete & Ready for Wasmer Deploy!" -ForegroundColor Green
Write-Host " Run the following from the project root to deploy to Wasmer Edge:" -ForegroundColor White
Write-Host "   & `"`$HOME\.wasmer\bin\wasmer.exe`" deploy" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
