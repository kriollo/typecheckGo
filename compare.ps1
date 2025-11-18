# Script para comparar TypeScript oficial con nuestro type checker

param(
    [string]$File = "test"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TypeScript Comparison Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Compilar nuestro checker
Write-Host "Building tscheck..." -ForegroundColor Yellow
go build -o tscheck.exe
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build tscheck" -ForegroundColor Red
    exit 1
}

Write-Host "`n--- TypeScript Official (tsc) ---`n" -ForegroundColor Green
# If checking a single file, use strict mode to match tsconfig
if (Test-Path $File -PathType Leaf) {
    npx tsc --noEmit --strict $File 2>&1 | Out-String | Write-Host
} else {
    # For directories, use project mode
    npx tsc --noEmit --project tsconfig.json 2>&1 | Out-String | Write-Host
}

$tscExitCode = $LASTEXITCODE

Write-Host "`n--- Our Type Checker (tscheck) ---`n" -ForegroundColor Green
.\tscheck.exe check $File 2>&1 | Out-String | Write-Host

$tscheckExitCode = $LASTEXITCODE

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Comparison Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TypeScript exit code: $tscExitCode" -ForegroundColor $(if ($tscExitCode -eq 0) { "Green" } else { "Red" })
Write-Host "tscheck exit code:    $tscheckExitCode" -ForegroundColor $(if ($tscheckExitCode -eq 0) { "Green" } else { "Red" })

if ($tscExitCode -eq $tscheckExitCode) {
    Write-Host "`n✓ Exit codes match!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Exit codes differ" -ForegroundColor Yellow
}
