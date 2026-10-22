# Entron 1.0.1 Full Setup
# Builds entron.exe, installs to ~/.entron/bin, adds to PATH, and installs the VS Code/Antigravity extension.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$binDir = Join-Path $env:USERPROFILE ".entron\\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# Build exe
Write-Host "Building entron.exe..." -ForegroundColor Cyan
Push-Location $root
bun build src/cli.ts --compile --outfile (Join-Path $binDir "entron.exe")
Pop-Location

# Copy exe to root too
Copy-Item (Join-Path $binDir "entron.exe") (Join-Path $root "entron.exe") -Force

# Add to PATH (user)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$binDir*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User")
  Write-Host "Added $binDir to user PATH." -ForegroundColor Green
}

# Install VS Code extension
$vsix = Join-Path $root "extension\\entron-language-1.0.1.vsix"
if (Test-Path $vsix) {
  if (Get-Command code -ErrorAction SilentlyContinue) {
    code --install-extension $vsix --force | Out-Null
    Write-Host "Installed VS Code extension." -ForegroundColor Green
  }
}

# Install Antigravity extension
$agExtDir = Join-Path $env:USERPROFILE ".antigravity\\extensions\\entron-team.entron-language-1.0.1"
$entronVscode = Join-Path $root "entron-vscode"
$vsix2 = Join-Path $entronVscode "entron-language-1.0.1.vsix"
if (Test-Path $vsix2) {
  $tmp = Join-Path $env:TEMP "entron-extract"
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $tmp | Out-Null
  Copy-Item $vsix2 (Join-Path $tmp "entron.zip") -Force
  Expand-Archive -Path (Join-Path $tmp "entron.zip") -DestinationPath $tmp -Force
  Remove-Item -Recurse -Force $agExtDir -ErrorAction SilentlyContinue
  Copy-Item (Join-Path $tmp "extension") $agExtDir -Recurse -Force
  Remove-Item -Recurse -Force $tmp
  Write-Host "Installed Antigravity extension." -ForegroundColor Green
}

Write-Host "Entron 1.0.1 setup complete. Restart your terminal/IDE." -ForegroundColor Yellow