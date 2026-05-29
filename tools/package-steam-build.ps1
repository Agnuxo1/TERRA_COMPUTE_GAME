$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$release = Join-Path $root "release"
$unpacked = Join-Path $release "win-unpacked"
$zip = Join-Path $release "terra-compute-steam-win.zip"

if (!(Test-Path -LiteralPath $unpacked)) {
  throw "Steam build folder not found: $unpacked"
}

if (Test-Path -LiteralPath $zip) {
  Remove-Item -LiteralPath $zip -Force
}

Compress-Archive -Path (Join-Path $unpacked "*") -DestinationPath $zip -Force
Write-Host "Steam ZIP ready: $zip"
