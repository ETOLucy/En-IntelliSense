$ErrorActionPreference = "Stop"

$runtimeDirectory = Join-Path $PSScriptRoot "..\.runtime"
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$env:WRANGLER_LOG_PATH = Join-Path $runtimeDirectory "wrangler.log"

try {
    & wrangler deploy --dry-run --outdir (Join-Path $runtimeDirectory "worker-build")
    if ($LASTEXITCODE -ne 0) {
        throw "Worker build failed."
    }
}
finally {
    Remove-Item Env:\WRANGLER_LOG_PATH -ErrorAction SilentlyContinue
}
