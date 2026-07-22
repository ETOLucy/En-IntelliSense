$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$venvRoot = Join-Path $projectRoot ".venv-build"
$python = Join-Path $venvRoot "Scripts\python.exe"

if (-not (Test-Path $python)) {
    python -m venv $venvRoot
}

Push-Location $projectRoot
try {
    & $python -m pip install --disable-pip-version-check -r (Join-Path $projectRoot "requirements-build.txt")
    & $python (Join-Path $projectRoot "scripts\build_icon.py")
    & $python -m PyInstaller --noconfirm --clean (Join-Path $projectRoot "En-IntelliSense.spec")

    $distRoot = Join-Path $projectRoot "dist"
    Copy-Item (Join-Path $projectRoot ".env.example") (Join-Path $distRoot "En-IntelliSense.env.example") -Force
    Write-Host "Built: $(Join-Path $distRoot 'En-IntelliSense.exe')"
}
finally {
    Pop-Location
}
