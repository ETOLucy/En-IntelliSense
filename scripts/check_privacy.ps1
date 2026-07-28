$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

$sensitiveTrackedPaths = @(
    ".env",
    ".dev.vars",
    "store/partner-center.json",
    "config.json",
    "wrangler-production.jsonc"
)

Push-Location $projectRoot
try {
    $tracked = @(git ls-files --cached --others --exclude-standard)
    foreach ($path in $sensitiveTrackedPaths) {
        if ($tracked -contains $path) {
            throw "Sensitive local file is tracked: $path"
        }
    }

    $sensitiveExtensions = @(".pfx", ".p12", ".pem", ".key", ".cer", ".crt", ".sqlite", ".sqlite3", ".db")
    foreach ($path in $tracked) {
        if ($sensitiveExtensions -contains [IO.Path]::GetExtension($path).ToLowerInvariant()) {
            throw "Certificate or key file is tracked: $path"
        }
    }

    $patterns = @(
        @{ Name = "API key"; Regex = '(?i)\bsk-[a-z0-9_-]{16,}\b' },
        @{ Name = "GitHub token"; Regex = '\bgh[pousr]_[A-Za-z0-9_]{30,}\b' },
        @{ Name = "Google API key"; Regex = '\bAIza[0-9A-Za-z_-]{30,}\b' },
        @{ Name = "private key"; Regex = '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----' },
        @{ Name = "Windows user path"; Regex = '(?i)\bC:\\Users\\[^\\\s]+' },
        @{ Name = "local proxy"; Regex = '\b127\.0\.0\.1:789[0-9]\b' },
        @{ Name = "known private endpoint"; Regex = '(?i)q1ngyuan' }
    )

    $violations = [System.Collections.Generic.List[string]]::new()
    foreach ($path in $tracked) {
        if ($path -eq "scripts/check_privacy.ps1") { continue }
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }
        $item = Get-Item -LiteralPath $path
        if ($item.Length -gt 2MB) { continue }
        try {
            $content = Get-Content -LiteralPath $path -Raw -ErrorAction Stop
        }
        catch {
            continue
        }
        foreach ($pattern in $patterns) {
            if ($content -match $pattern.Regex) {
                $violations.Add("$path ($($pattern.Name))")
            }
        }
    }

    if ($violations.Count) {
        $summary = ($violations | Sort-Object -Unique) -join [Environment]::NewLine
        throw "Privacy scan failed. Remove or replace these tracked values:`n$summary"
    }

    $history = git log --all -p -- .
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect Git history."
    }
    foreach ($pattern in $patterns) {
        if ($history -match $pattern.Regex) {
            throw "Privacy scan failed: Git history contains a possible $($pattern.Name). Rotate it before publishing and remove it from history."
        }
    }

    Write-Host "Privacy scan passed: no secrets, private endpoints, proxy ports, or local user paths found in publishable files or Git history."
}
finally {
    Pop-Location
}
