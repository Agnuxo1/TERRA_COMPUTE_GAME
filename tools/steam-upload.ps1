$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$AppId,

  [Parameter(Mandatory = $true)]
  [string]$DepotId,

  [Parameter(Mandatory = $true)]
  [string]$SteamUser,

  [string]$SteamCmd = "steamcmd"
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$steamworks = Join-Path $root "steamworks"
$generated = Join-Path $steamworks "generated"
$content = Join-Path $root "release\win-unpacked"

if (!(Test-Path -LiteralPath $content)) {
  throw "Build folder not found: $content. Run npm run build:steam first."
}

New-Item -ItemType Directory -Force -Path $generated | Out-Null

$appBuild = Get-Content -LiteralPath (Join-Path $steamworks "app_build_template.vdf") -Raw
$depotBuild = Get-Content -LiteralPath (Join-Path $steamworks "depot_build_template.vdf") -Raw

$appBuildPath = Join-Path $generated "app_build_$AppId.vdf"
$depotBuildPath = Join-Path $generated "depot_build_$DepotId.vdf"
$depotBuildFile = Split-Path -Leaf $depotBuildPath

$appBuild = $appBuild.Replace("__STEAM_APP_ID__", $AppId).Replace("__STEAM_DEPOT_ID__", $DepotId).Replace("__STEAM_DEPOT_BUILD_FILE__", $depotBuildFile)
$depotBuild = $depotBuild.Replace("__STEAM_DEPOT_ID__", $DepotId)

Set-Content -LiteralPath $appBuildPath -Value $appBuild -NoNewline
Set-Content -LiteralPath $depotBuildPath -Value $depotBuild -NoNewline

Write-Host "Generated SteamPipe scripts:"
Write-Host "  $appBuildPath"
Write-Host "  $depotBuildPath"
Write-Host ""
Write-Host "Steam Guard may prompt in this terminal."

& $SteamCmd +login $SteamUser +run_app_build_http $appBuildPath +quit
