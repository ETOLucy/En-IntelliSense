param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https://')]
    [string]$ServiceUrl
)

$ErrorActionPreference = "Stop"
$baseUrl = $ServiceUrl.TrimEnd("/")
$adminSecret = [Environment]::GetEnvironmentVariable("SUBSCRIPTION_ADMIN_SECRET", "Process")
if ([string]::IsNullOrWhiteSpace($adminSecret)) {
    throw "Set SUBSCRIPTION_ADMIN_SECRET for this PowerShell process. The script never prints it."
}

$status = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/status"
if (-not $status.configured -or $status.provider_mode -ne "hosted") {
    throw "Hosted model status is not ready."
}

try {
    Invoke-RestMethod -Method Get -Uri "$baseUrl/api/admin/subscriptions?query=deployment-check-no-match" `
        -Headers @{ "X-Admin-Secret" = $adminSecret } | Out-Null
}
catch {
    throw "Admin API verification failed. Confirm Cloudflare Access, the admin secret, D1, and Durable Object bindings."
}

Write-Host "Deployment status and authenticated admin read check passed."
