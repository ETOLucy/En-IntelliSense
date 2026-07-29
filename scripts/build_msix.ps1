param(
    [string]$Version = "1.0.0.0",
    [string]$PartnerPath,
    [string]$WindowsSdkRoot
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
if ($Version -notmatch '^\d+\.\d+\.\d+\.\d+$') {
    throw "MSIX version must contain four numeric parts."
}
if ([string]::IsNullOrWhiteSpace($PartnerPath)) {
    $PartnerPath = Join-Path $projectRoot "store\partner-center.json"
}
if (-not (Test-Path -LiteralPath $PartnerPath)) {
    throw "Create store\partner-center.json from the example and copy the exact identity values from Partner Center."
}

$partner = Get-Content -LiteralPath $PartnerPath -Raw | ConvertFrom-Json
foreach ($field in @("identity_name", "publisher", "publisher_display_name")) {
    $value = [string]$partner.$field
    if ([string]::IsNullOrWhiteSpace($value) -or $value -match "^(EXAMPLE_|example\.)") {
        throw "Partner Center field '$field' is missing or still contains an example value."
    }
}

$appRoot = Join-Path $projectRoot "dist\WriteMelo"
$stagingRoot = Join-Path $projectRoot "build\msix"
$assetsRoot = Join-Path $projectRoot "desktop-assets\store"
$manifestTemplate = Join-Path $projectRoot "store\Package.appxmanifest.template"
$output = Join-Path $projectRoot "dist\WriteMelo-$Version.msix"
$buildPython = Join-Path $projectRoot ".venv-build\Scripts\python.exe"
if (-not (Test-Path -LiteralPath (Join-Path $appRoot "WriteMelo.exe"))) {
    throw "Build the desktop app first: .\scripts\build_windows.ps1 -Version 1.0.0"
}
if (-not (Test-Path -LiteralPath $buildPython)) {
    throw "The build environment is missing. Run .\scripts\build_windows.ps1 first."
}

$sdkRoots = @()
if (-not [string]::IsNullOrWhiteSpace($WindowsSdkRoot)) { $sdkRoots += $WindowsSdkRoot }
$sdkRoots += "${env:ProgramFiles(x86)}\Windows Kits\10"
$sdkRoots += "D:\WindowsSDK"
$makeAppx = $sdkRoots |
    Where-Object { Test-Path -LiteralPath $_ } |
    ForEach-Object {
        Get-ChildItem -LiteralPath $_ -Filter makeappx.exe -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match '\\x64\\makeappx\.exe$' }
    } |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $makeAppx) {
    throw "makeappx.exe was not found. Install the Windows 10/11 SDK or pass -WindowsSdkRoot."
}

& $buildPython (Join-Path $projectRoot "scripts\build_icon.py")
if ($LASTEXITCODE -ne 0) { throw "Store asset generation failed." }
if (Test-Path -LiteralPath $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingRoot | Out-Null
Copy-Item -Path (Join-Path $appRoot "*") -Destination $stagingRoot -Recurse
Copy-Item -LiteralPath $assetsRoot -Destination (Join-Path $stagingRoot "Assets") -Recurse

$manifest = Get-Content -LiteralPath $manifestTemplate -Raw
$manifest = $manifest.Replace("{{IDENTITY_NAME}}", [string]$partner.identity_name)
$manifest = $manifest.Replace("{{PUBLISHER}}", [string]$partner.publisher)
$manifest = $manifest.Replace("{{PUBLISHER_DISPLAY_NAME}}", [string]$partner.publisher_display_name)
$manifest = $manifest.Replace("{{VERSION}}", $Version)
Set-Content -LiteralPath (Join-Path $stagingRoot "AppxManifest.xml") -Value $manifest -Encoding utf8

if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }
& $makeAppx pack /d $stagingRoot /p $output /o
if ($LASTEXITCODE -ne 0) { throw "MSIX packaging failed." }
Get-FileHash -Algorithm SHA256 $output
