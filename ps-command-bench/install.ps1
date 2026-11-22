# Install ps-command-bench into the desktop profile.
# Copies the plugin into the profile's node_modules and adds its package name
# to dsh.profile.bundles. A full DSH restart is required afterwards.
# Usage: right-click "Run with PowerShell", or run .\install.ps1

$ErrorActionPreference = 'Stop'

$profileDir = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
$pkgJson = Join-Path $profileDir 'package.json'
$destDir = Join-Path $profileDir 'node_modules\ps-command-bench'
$srcDir = $PSScriptRoot

if (-not (Test-Path $pkgJson)) {
    Write-Error "Profile package.json not found: $pkgJson"
}

# 1) Copy plugin files (replace the previous copy so stale files cannot linger)
Write-Host "Copying plugin to $destDir ..."
if (Test-Path $destDir) { Remove-Item -Recurse -Force $destDir }
New-Item -ItemType Directory -Force $destDir | Out-Null
Copy-Item -Recurse -Force (Join-Path $srcDir 'lib') $destDir
Copy-Item -Force `
    (Join-Path $srcDir 'package.json'), `
    (Join-Path $srcDir 'cordis.patch.yml') `
    -Destination $destDir

# 2) Add bundle entry (idempotent, with backup)
$backup = "$pkgJson.bak-$(Get-Date -Format yyyyMMddHHmmss)"
Copy-Item $pkgJson $backup -Force
Write-Host "Backed up package.json -> $backup"

$json = Get-Content $pkgJson -Raw | ConvertFrom-Json
$bundles = @($json.dsh.profile.bundles)
if ($bundles -notcontains 'ps-command-bench') {
    $json.dsh.profile.bundles = @($bundles) + @('ps-command-bench')
    # Write UTF-8 WITHOUT BOM: a BOM would break JSON.parse in the Node loader.
    $text = $json | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($pkgJson, $text, [System.Text.UTF8Encoding]::new($false))
    Write-Host 'Added ps-command-bench to dsh.profile.bundles.'
} else {
    Write-Host 'ps-command-bench already present in bundles, skipped.'
}

Write-Host ''
Write-Host 'Done. Fully quit and reopen DSH Next, then open the "PS console"'
Write-Host 'entry in the left sidebar.'
