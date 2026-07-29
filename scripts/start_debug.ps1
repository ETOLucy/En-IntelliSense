$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$env:WRITEMELO_DESKTOP = "1"
$env:WRITEMELO_HOST = "127.0.0.1"
$env:WRITEMELO_PORT = "8000"

Write-Host "WriteMelo debug UI: http://127.0.0.1:8000"
Write-Host "Use Ctrl+C to stop the debug server."
python server.py
