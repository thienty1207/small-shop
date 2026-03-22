param(
    [string]$DumpPath = ""
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { Join-Path $RootDir "backend\.env" }
$SqlDir = Join-Path $RootDir "sql"

$PsqlCmd = Get-Command psql -ErrorAction SilentlyContinue
$PgRestoreCmd = Get-Command pg_restore -ErrorAction SilentlyContinue

if ($PsqlCmd) {
    $PsqlExe = $PsqlCmd.Source
}
if ($PgRestoreCmd) {
    $PgRestoreExe = $PgRestoreCmd.Source
}

if (-not $PsqlExe -or -not $PgRestoreExe) {
    $binCandidates = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin"
    )

    foreach ($bin in $binCandidates) {
        if (-not $PsqlExe) {
            $candidate = Join-Path $bin "psql.exe"
            if (Test-Path $candidate) { $PsqlExe = $candidate }
        }
        if (-not $PgRestoreExe) {
            $candidate = Join-Path $bin "pg_restore.exe"
            if (Test-Path $candidate) { $PgRestoreExe = $candidate }
        }
    }
}

if ([string]::IsNullOrWhiteSpace($DumpPath)) {
    $preferred = Join-Path $RootDir "backups\small-shop-latest.dump"
    if (Test-Path $preferred) {
        $DumpPath = $preferred
    }
    else {
        $latest = Get-ChildItem -Path (Join-Path $RootDir "backups") -Filter '*.dump' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if ($latest) {
            $DumpPath = $latest.FullName
        }
        else {
            $legacy = Join-Path $RootDir "small-shop.dump"
            $DumpPath = $legacy
        }
    }
}

if (-not $PgRestoreExe) {
    throw "pg_restore not found. Install PostgreSQL client tools first."
}

if (-not $PsqlExe) {
    throw "psql not found. Install PostgreSQL client tools first."
}

if (-not (Test-Path $DumpPath)) {
    throw "Dump file not found: $DumpPath"
}

if (-not $env:DATABASE_URL) {
    if (-not (Test-Path $EnvFile)) {
        throw "DATABASE_URL is not set and env file was not found: $EnvFile"
    }

    $dbLine = Select-String -Path $EnvFile -Pattern '^DATABASE_URL=' | Select-Object -First 1
    if (-not $dbLine) {
        throw "DATABASE_URL is missing in $EnvFile"
    }

    $env:DATABASE_URL = $dbLine.Line.Substring("DATABASE_URL=".Length)
}

$databaseUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "DATABASE_URL is empty."
}

$uri = [System.Uri]$databaseUrl
$dbName = $uri.AbsolutePath.TrimStart("/")
if ([string]::IsNullOrWhiteSpace($dbName)) {
    throw "Could not determine database name from DATABASE_URL."
}

$maintenanceUrl = if ($env:RESTORE_URL) { $env:RESTORE_URL } else { ($databaseUrl -replace '/[^/?]+(\?.*)?$', '/postgres') }

& $PsqlExe $databaseUrl -c 'select 1' *> $null
if ($LASTEXITCODE -ne 0) {
    & $PsqlExe $maintenanceUrl -v ON_ERROR_STOP=1 -c "CREATE DATABASE `"$dbName`""
}

& $PgRestoreExe `
    --clean `
    --if-exists `
    --no-owner `
    --no-privileges `
    --dbname $databaseUrl `
    $DumpPath

$tmpSql = [System.IO.Path]::GetTempFileName()
try {
    "BEGIN;" | Set-Content -Path $tmpSql

    Get-ChildItem -Path $SqlDir -Filter '*.sql' |
        Where-Object { $_.Name -match '^\d+_.+\.sql$' } |
        Sort-Object Name |
        ForEach-Object {
        $version = [int]($_.BaseName.Split('_')[0])
        $checksum = (Get-FileHash -Path $_.FullName -Algorithm SHA384).Hash.ToLowerInvariant()
        "UPDATE _sqlx_migrations SET checksum = decode('$checksum', 'hex') WHERE version = $version;" | Add-Content -Path $tmpSql
    }

    "COMMIT;" | Add-Content -Path $tmpSql
    & $PsqlExe $databaseUrl -v ON_ERROR_STOP=1 -f $tmpSql *> $null
}
finally {
    Remove-Item -Path $tmpSql -ErrorAction SilentlyContinue
}

Write-Host "Restore completed from: $DumpPath"
