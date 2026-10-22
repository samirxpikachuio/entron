# install.ps1 — Build Entron and install the standalone binary globally.
#
# Usage (from any PowerShell):
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -InstallDir "C:\my\bin"
#
# Default install target is the Bun global bin directory ($env:USERPROFILE\.bun\bin),
# which is already on the PATH. Shims (entron.cmd / entron.ps1) are written so the
# `entron` command works from cmd.exe, PowerShell, and Git Bash without spawning Bun.

param(
    [string]$InstallDir = "$env:USERPROFILE\.bun\bin"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot

# --- 1. Build the standalone executable -------------------------------------------
Write-Host "Building entron.exe ..." -ForegroundColor Cyan
bun run build
if ($LASTEXITCODE -ne 0) {
    throw "Build failed (exit code $LASTEXITCODE). Nothing was installed."
}
if (-not (Test-Path "$ProjectRoot\entron.exe")) {
    throw "Build reported success but '$ProjectRoot\entron.exe' was not found."
}

# --- 2. Install binary --------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item "$ProjectRoot\entron.exe" "$InstallDir\entron.exe" -Force

# --- 3. Install shell shims that call the exe (no Bun runtime needed) ---------------
$cmdContent = '@echo off' + "`r`n" + '"%~dp0entron.exe" %*' + "`r`n"
Set-Content -Path "$InstallDir\entron.cmd" -Value $cmdContent -Encoding ascii

$ps1Content = '& "$PSScriptRoot\entron.exe" @args' + "`r`n"
Set-Content -Path "$InstallDir\entron.ps1" -Value $ps1Content

# --- 4. Sanity check: make sure the install dir is on PATH --------------------------
$pathDirs = $env:Path -split ';'
if (($pathDirs | ForEach-Object { $_.Trim() }) -notcontains $InstallDir) {
    Write-Warning "Install directory is NOT on your PATH: $InstallDir"
    Write-Warning "Add it to your PATH, or override it: .\install.ps1 -InstallDir <dir on PATH>"
}

Write-Host ""
Write-Host "Installed entron to $InstallDir" -ForegroundColor Green
Write-Host "Try it from any directory: entron run examples\01_hello.entron"
