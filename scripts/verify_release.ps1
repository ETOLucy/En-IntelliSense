$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot "release"
$installer = Get-ChildItem -LiteralPath $releaseRoot -Filter "WriteMelo-*-Setup-x64.exe" -File | Select-Object -First 1
$portable = Get-ChildItem -LiteralPath $releaseRoot -Filter "WriteMelo-*-Portable-x64.exe" -File | Select-Object -First 1

if (-not $installer) { throw "Windows installer is missing." }
if (-not $portable) { throw "Windows portable build is missing." }
if ($installer.Length -lt 10MB -or $portable.Length -lt 10MB) {
    throw "A Windows artifact is unexpectedly small."
}

$asar = Join-Path $releaseRoot "win-unpacked\resources\app.asar"
if (-not (Test-Path -LiteralPath $asar -PathType Leaf)) {
    throw "Packaged app.asar is missing."
}

$entries = & npx.cmd asar list $asar
if ($LASTEXITCODE -ne 0) { throw "Could not inspect app.asar." }
foreach ($required in @(
    "\apps\desktop\dist\main.js",
    "\apps\desktop\dist\preload.cjs",
    "\apps\web\dist\index.html",
    "\apps\web\dist\dictionary\en.dic"
)) {
    if ($entries -notcontains $required) {
        throw "Packaged app is missing $required"
    }
}

$hashLines = @($installer, $portable) | ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $($_.Name)"
}
$hashPath = Join-Path $releaseRoot "SHA256SUMS.txt"
[IO.File]::WriteAllLines($hashPath, $hashLines, [Text.UTF8Encoding]::new($false))
Write-Host "Release verification passed."
$hashLines | ForEach-Object { Write-Host $_ }
