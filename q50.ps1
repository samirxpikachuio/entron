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

