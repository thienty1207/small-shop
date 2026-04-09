param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Username = $env:SMOKE_ADMIN_USERNAME,
    [string]$Password = $env:SMOKE_ADMIN_PASSWORD,
    [switch]$AutoStartBackend,
    [int]$StartupTimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$message) {
    Write-Host "[SMOKE] $message"
}

function Wait-ServerReady([string]$url, [int]$timeoutSec) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-RestMethod -Method Get -Uri "$url/readyz" -ErrorAction Stop | Out-Null
            return $true
        }
        catch {
            Start-Sleep -Milliseconds 800
        }
    }
    return $false
}

if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    throw "Missing admin credentials. Set SMOKE_ADMIN_USERNAME/SMOKE_ADMIN_PASSWORD or pass -Username/-Password."
}

$backendJob = $null
if ($AutoStartBackend.IsPresent) {
    Write-Step "Auto-start backend"
    $backendJob = Start-Job -ScriptBlock {
        Set-Location "D:\Work\Rust\Project\small-shop\backend"
        cargo run
    }
}

if (-not (Wait-ServerReady -url $BaseUrl -timeoutSec $StartupTimeoutSeconds)) {
    if ($backendJob) {
        Write-Host "[SMOKE] Backend startup logs:"
        Receive-Job -Job $backendJob -Keep -ErrorAction SilentlyContinue | Select-Object -Last 80 | ForEach-Object { Write-Host $_ }
        Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
    }
    throw "Backend is not ready at $BaseUrl within $StartupTimeoutSeconds seconds"
}

Write-Step "Admin login"
$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/admin/auth/login" -ContentType "application/json" -Body $loginBody
if (-not $login.token) {
    throw "Login response missing token"
}
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

Write-Step "GET /api/admin/me"
$me = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/me" -Headers $headers
if (-not $me.id) {
    throw "Admin profile payload missing id"
}

Write-Step "GET /api/admin/customers?page=1&limit=5"
$customers = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/customers?page=1&limit=5" -Headers $headers
if ($null -eq $customers.items) {
    throw "Customers payload missing items"
}

Write-Step "GET /api/admin/orders?page=1&limit=5"
$orders = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/orders?page=1&limit=5" -Headers $headers
if ($null -eq $orders.items) {
    throw "Orders payload missing items"
}

Write-Step "POST /api/admin/auth/logout"
Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/admin/auth/logout" -Headers $headers | Out-Null

Write-Step "Verify revoked token is denied"
$revokedDenied = $false
try {
    Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/me" -Headers $headers | Out-Null
}
catch {
    $revokedDenied = $true
}

if (-not $revokedDenied) {
    if ($backendJob) {
        Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
    }
    throw "Revoked token was still accepted"
}

Write-Host "[SMOKE] PASS: admin core flow is healthy"

if ($backendJob) {
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
}
