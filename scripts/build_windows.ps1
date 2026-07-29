param(
    [string]$Version = "0.0.0-dev",
    [switch]$RequireInstaller
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$venvRoot = Join-Path $projectRoot ".venv-build"
$python = Join-Path $venvRoot "Scripts\python.exe"
$distRoot = Join-Path $projectRoot "dist"
$appRoot = Join-Path $distRoot "WriteMelo"
$appExe = Join-Path $appRoot "WriteMelo.exe"
$portableZip = Join-Path $distRoot "WriteMelo-Portable.zip"
$setupExe = Join-Path $distRoot "WriteMelo-Setup.exe"
$temporaryCertificate = $null

function Find-SignTool {
    if ($env:SIGNTOOL_PATH -and (Test-Path -LiteralPath $env:SIGNTOOL_PATH)) {
        return $env:SIGNTOOL_PATH
    }
    $kitsRoot = "${env:ProgramFiles(x86)}\Windows Kits\10\bin"
    if (Test-Path -LiteralPath $kitsRoot) {
        return Get-ChildItem -Path $kitsRoot -Filter signtool.exe -Recurse |
            Sort-Object FullName -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }
    return $null
}

function Invoke-CodeSign([string]$Target) {
    if (-not $env:WINDOWS_CERTIFICATE_PATH) {
        Write-Host "Signing skipped: WINDOWS_CERTIFICATE_PATH is not configured."
        return
    }
    $signTool = Find-SignTool
    if (-not $signTool) {
        throw "signtool.exe was not found."
    }
    $arguments = @(
        "sign", "/fd", "SHA256",
        "/f", $env:WINDOWS_CERTIFICATE_PATH,
        "/tr", $(if ($env:WINDOWS_TIMESTAMP_URL) { $env:WINDOWS_TIMESTAMP_URL } else { "https://timestamp.digicert.com" }),
        "/td", "SHA256"
    )
    if ($env:WINDOWS_CERTIFICATE_PASSWORD) {
        $arguments += @("/p", $env:WINDOWS_CERTIFICATE_PASSWORD)
    }
    $arguments += $Target
    & $signTool @arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Code signing failed for $Target"
    }
}

function Find-InnoCompiler {
    if ($env:ISCC_PATH -and (Test-Path -LiteralPath $env:ISCC_PATH)) {
        return $env:ISCC_PATH
    }
    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    )
    return $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

function New-PortableArchive {
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            if (Test-Path -LiteralPath $portableZip) {
                Remove-Item -LiteralPath $portableZip -Force
            }
            Compress-Archive -Path (Join-Path $appRoot "*") -DestinationPath $portableZip -CompressionLevel Optimal
            return
        }
        catch {
            if ($attempt -eq 5) {
                throw
            }
            Write-Warning "Portable archive attempt $attempt failed: $($_.Exception.Message)"
            Start-Sleep -Seconds 2
        }
    }
}

if (-not (Test-Path -LiteralPath $python)) {
    python -m venv $venvRoot
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create the build virtual environment."
    }
}

$savedErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& $python -m pip --version *> $null
$pipStatus = $LASTEXITCODE
$ErrorActionPreference = $savedErrorActionPreference
if ($pipStatus -ne 0) {
    & $python -m ensurepip --upgrade
    if ($LASTEXITCODE -ne 0) {
        throw "The build virtual environment is missing pip and could not repair it."
    }
}

Push-Location $projectRoot
try {
    if (Test-Path -LiteralPath $setupExe) {
        Remove-Item -LiteralPath $setupExe -Force
    }
    if ($env:WINDOWS_CERTIFICATE_BASE64 -and -not $env:WINDOWS_CERTIFICATE_PATH) {
        $temporaryCertificate = Join-Path $env:TEMP "writemelo-signing.pfx"
        [IO.File]::WriteAllBytes($temporaryCertificate, [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE_BASE64))
        $env:WINDOWS_CERTIFICATE_PATH = $temporaryCertificate
    }

    & $python -m pip install --disable-pip-version-check -r (Join-Path $projectRoot "requirements-build.txt")
    if ($LASTEXITCODE -ne 0) {
        throw "Could not install build dependencies."
    }
    & $python (Join-Path $projectRoot "scripts\build_icon.py")
    if ($LASTEXITCODE -ne 0) {
        throw "Icon generation failed."
    }
    & $python -m PyInstaller --noconfirm --clean (Join-Path $projectRoot "WriteMelo.spec")
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $appExe)) {
        throw "PyInstaller did not produce the Windows application."
    }

    Invoke-CodeSign $appExe

    New-PortableArchive

    $iscc = Find-InnoCompiler
    if ($iscc) {
        & $iscc "/DMyAppVersion=$Version" (Join-Path $projectRoot "installer\WriteMelo.iss")
        if ($LASTEXITCODE -ne 0) {
            throw "Inno Setup failed."
        }
        Invoke-CodeSign $setupExe
    }
    elseif ($RequireInstaller) {
        throw "Inno Setup 6 is required but ISCC.exe was not found."
    }
    else {
        Write-Warning "Inno Setup was not found. Portable ZIP was built; installer was skipped."
    }

    $hashes = @((Get-FileHash -Algorithm SHA256 $portableZip))
    if (Test-Path -LiteralPath $setupExe) {
        $hashes += Get-FileHash -Algorithm SHA256 $setupExe
    }
    $hashes | ForEach-Object { "$($_.Hash)  $(Split-Path -Leaf $_.Path)" } |
        Set-Content -LiteralPath (Join-Path $distRoot "SHA256SUMS.txt") -Encoding ascii
    $hashes
}
finally {
    if ($temporaryCertificate -and (Test-Path -LiteralPath $temporaryCertificate)) {
        Remove-Item -LiteralPath $temporaryCertificate -Force
    }
    Pop-Location
}
