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

# Target: Antigravity IDE extensions directory
$AntigravityExtDir = "$env:USERPROFILE\.antigravity\extensions"
$TargetExtDir      = Join-Path $AntigravityExtDir $ExtId

if (Test-Path $AntigravityExtDir) {
    Write-Host "  Antigravity extensions directory: $AntigravityExtDir"
    Write-Host "  Installing as: $ExtId"

    # Extract VSIX (it's a ZIP) → copy the 'extension' subfolder into target
    $ZipPath = [System.IO.Path]::ChangeExtension($VsixPath, ".zip")
    $TempDir = Join-Path $env:TEMP "entron-vsix-extract-$([System.Guid]::NewGuid().ToString('N').Substring(0,8))"

    Copy-Item $VsixPath $ZipPath -Force
    try {
        Remove-Item -Recurse -Force $TargetExtDir -ErrorAction SilentlyContinue
        Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force

        $ExtContent = Join-Path $TempDir "extension"
        if (Test-Path $ExtContent) {
            Copy-Item $ExtContent $TargetExtDir -Recurse -Force
        } else {
            # Fallback: VSIX root contains files directly
            New-Item -ItemType Directory -Force -Path $TargetExtDir | Out-Null
            Copy-Item "$TempDir\*" $TargetExtDir -Recurse -Force
        }
    } finally {
        Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
    }

    Write-Host "  Installed to: $TargetExtDir" -ForegroundColor Green

} elseif ($AgyCmd) {
    # Fallback: try agy plugin install (future compatibility)
    Write-Host "  Attempting: agy plugin install $VsixPath"
    agy plugin install $VsixPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Installation failed (exit code $LASTEXITCODE)." -ForegroundColor Red
        Write-Host "Manual installation steps:" -ForegroundColor Yellow
        Write-Host "  1. Open Antigravity IDE."
        Write-Host "  2. Extensions panel > '...' > 'Install from VSIX...'"
        Write-Host "  3. Select: $VsixPath"
        exit $LASTEXITCODE
    }
} else {
    Write-Host ""
    Write-Host "WARNING: Could not detect Antigravity extensions directory or 'agy' CLI." -ForegroundColor Yellow
    Write-Host "Manual installation steps:" -ForegroundColor Yellow
    Write-Host "  1. Open Antigravity IDE."
    Write-Host "  2. Extensions panel > '...' > 'Install from VSIX...'"
    Write-Host "  3. Select: $VsixPath"
    Write-Host "  OR extract the VSIX into: %USERPROFILE%\.antigravity\extensions\$ExtId"
    exit 1
}

# --- Done -------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Installation complete! ===" -ForegroundColor Green
Write-Host "Extension : $ExtName v$ExtVersion"
Write-Host "VSIX      : $VsixPath"
Write-Host ""
Write-Host "To test: Open any .entron or .ent file in Antigravity IDE." -ForegroundColor Cyan
Write-Host "To update: Edit files, bump the version in package.json, then re-run this script." -ForegroundColor Cyan
