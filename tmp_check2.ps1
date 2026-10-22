$path = 'C:\Users\USER\eng=\entron-vscode\install-extension.ps1'
$content = Get-Content -Raw $path
$errors = $null
$tokens = [System.Management.Automation.PSParser]::Tokenize($content, [ref]$errors)
$near = $tokens | Where-Object { $_.StartLine -ge 138 -and $_.StartLine -le 145 }
foreach ($t in $near) { Write-Host "Line $($t.StartLine) Col $($t.StartColumn): [$($t.Content)] type=$($t.Type)" }
Write-Host "Total tokens: $($tokens.Count)"
