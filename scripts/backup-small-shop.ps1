param(
    [string]$DumpPath = "$(Split-Path -Parent $PSScriptRoot)\backups\small-shop-latest.dump"
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { Join-Path $RootDir "backend\.env" }
$PgDumpCmd = Get-Command pg_dump -ErrorAction SilentlyContinue
if ($PgDumpCmd) {
    $PgDumpExe = $PgDumpCmd.Source
}
else {
    $candidates = @(
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    )
    $PgDumpExe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $PgDumpExe) {
    throw "pg_dump not found. Install PostgreSQL client tools first."
}

if (-not $env:DATABASE_URL) {
    if (-not (Test-Path $EnvFile)) {
        throw "DATABASE_URL is not set and env file was not found: $EnvFile"
    }

    $dbLine = Select-String -Path $EnvFile -Pattern '^DATABASE_URL=' | Select-Object -First 1
    if (-not $dbLine) {
        throw "DATABASE_URL is missing in $EnvFile"
    }

    $env:DATABASE_URL = $dbLine.Line.Substring("DATABASE_URL=".Length).Trim().Trim('"')
}

$databaseUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "DATABASE_URL is empty."
}

if (-not [System.IO.Path]::IsPathRooted($DumpPath)) {
    $DumpPath = Join-Path $RootDir $DumpPath
}

$dumpDir = Split-Path -Parent $DumpPath
if (-not [string]::IsNullOrWhiteSpace($dumpDir) -and -not (Test-Path $dumpDir)) {
    New-Item -ItemType Directory -Path $dumpDir -Force | Out-Null
}

$tempPath = "$DumpPath.tmp"
if (Test-Path $tempPath) {
    Remove-Item -Path $tempPath -Force
}

& $PgDumpExe `
    --clean `
    --if-exists `
    --create `
    --no-owner `
    --no-privileges `
    --format=custom `
    --compress=9 `
    --file $tempPath `
    $databaseUrl

if ($LASTEXITCODE -ne 0) {
    if (Test-Path $tempPath) {
        Remove-Item -Path $tempPath -Force
    }
    throw "pg_dump failed with exit code $LASTEXITCODE"
}

Move-Item -Path $tempPath -Destination $DumpPath -Force

Write-Host "Backup created at: $DumpPath"
