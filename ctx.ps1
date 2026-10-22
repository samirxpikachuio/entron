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
