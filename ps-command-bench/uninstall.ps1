# Uninstall ps-command-bench: remove its bundle entry and the copied plugin dir.
$ErrorActionPreference = 'Stop'

$profileDir = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
$pkgJson = Join-Path $profileDir 'package.json'
$destDir = Join-Path $profileDir 'node_modules\ps-command-bench'

if (Test-Path $pkgJson) {
    $backup = "$pkgJson.bak-$(Get-Date -Format yyyyMMddHHmmss)"
    Copy-Item $pkgJson $backup -Force
    $json = Get-Content $pkgJson -Raw | ConvertFrom-Json
    $json.dsh.profile.bundles = @(@($json.dsh.profile.bundles) | Where-Object { $_ -ne 'ps-command-bench' })
    $text = $json | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($pkgJson, $text, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Removed ps-command-bench from dsh.profile.bundles (backup: $backup)"
}

if (Test-Path $destDir) {
    Remove-Item -Recurse -Force $destDir
    Write-Host "Deleted $destDir"
}

Write-Host 'Uninstall done. Restart DSH Next to take effect.'
