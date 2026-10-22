# install-extension.ps1
# Packages and installs the Entron Language Support extension into Antigravity IDE.
#
# Usage (from the eng= project root or from entron-vscode/):
#   powershell -NoProfile -ExecutionPolicy Bypass -File entron-vscode\install-extension.ps1
#
# Options:
#   -VsixPath <path>   Use a pre-built VSIX instead of packaging from source.
#   -SkipPackage       Skip the packaging step (requires -VsixPath or an existing VSIX).
#
# The script never changes your global execution policy.

param(
    [string]$VsixPath = "",
    [switch]$SkipPackage = $false
)

$ErrorActionPreference = "Stop"

# --- Resolve extension directory --------------------------------------------------
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    # Fallback when called without a file path
    $ScriptDir = (Get-Location).Path
}

# If invoked from the project root, navigate into entron-vscode/
if (Test-Path (Join-Path $ScriptDir "entron-vscode\package.json")) {
    $ExtDir = Join-Path $ScriptDir "entron-vscode"
} elseif (Test-Path (Join-Path $ScriptDir "package.json")) {
    $ExtDir = $ScriptDir
} else {
    throw "Cannot locate entron-vscode/package.json. Run this script from the project root or from entron-vscode/."
}

Write-Host ""
Write-Host "=== Entron Language Support — Extension Installer ===" -ForegroundColor Cyan
Write-Host "Extension directory: $ExtDir"

# --- Read version from package.json -----------------------------------------------
$PkgJson = Get-Content (Join-Path $ExtDir "package.json") -Raw | ConvertFrom-Json
$ExtName = $PkgJson.name
$ExtVersion = $PkgJson.version
$DefaultVsix = Join-Path $ExtDir "$ExtName-$ExtVersion.vsix"

# --- Step 1: Package --------------------------------------------------------------
if (-not $SkipPackage -and -not $VsixPath) {
    Write-Host ""
    Write-Host "Step 1/2: Packaging extension with vsce..." -ForegroundColor Yellow

    # Ensure vsce is accessible via npx
    $VsceCheck = npx --yes @vscode/vsce --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Could not run '@vscode/vsce' via npx. Ensure Node.js and npm are installed and on PATH."
    }
    Write-Host "  vsce version: $VsceCheck"

    Push-Location $ExtDir
    try {
        # --allow-missing-publisher lets vsce work without a Marketplace account
        npx --yes @vscode/vsce package --no-dependencies --allow-missing-repository
        if ($LASTEXITCODE -ne 0) {
            throw "vsce packaging failed (exit code $LASTEXITCODE)."
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-Path $DefaultVsix)) {
        throw "Packaging reported success but '$DefaultVsix' was not found."
    }

    $VsixPath = $DefaultVsix
    Write-Host "  Packaged: $VsixPath" -ForegroundColor Green
} elseif ($SkipPackage -and -not $VsixPath) {
    # Try to find an existing VSIX
    $found = Get-ChildItem $ExtDir -Filter "*.vsix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $found) {
        throw "No VSIX found in '$ExtDir'. Run without -SkipPackage to build one first."
    }
    $VsixPath = $found.FullName
    Write-Host "Step 1/2: Skipped packaging. Using existing VSIX: $VsixPath" -ForegroundColor Yellow
} else {
    Write-Host "Step 1/2: Using supplied VSIX: $VsixPath" -ForegroundColor Yellow
}

if (-not (Test-Path $VsixPath)) {
    throw "VSIX file not found: $VsixPath"
}

# --- Step 2: Install --------------------------------------------------------------
Write-Host ""
Write-Host "Step 2/2: Installing extension into Antigravity IDE..." -ForegroundColor Yellow

$AgyCmd = Get-Command agy -ErrorAction SilentlyContinue

# Resolve publisher and name from package.json
$Publisher  = $PkgJson.publisher
if (-not $Publisher) { $Publisher = "unknown-publisher" }
$ExtId      = "$Publisher.$ExtName-$ExtVersion-universal"
