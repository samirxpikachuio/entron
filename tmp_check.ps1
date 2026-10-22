$path = 'C:\Users\USER\eng=\entron-vscode\install-extension.ps1'
$content = Get-Content -Raw $path
$errors = $null
$tokens = [System.Management.Automation.PSParser]::Tokenize($content, [ref]$errors)
Write-Host "ERRORS: $($errors.Count)"
$errors | ForEach-Object { Write-Host $_.Message; Write-Host "  Line $($_.Token.StartLine) Col $($_.Token.StartColumn)" }
