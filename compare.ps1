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

# Buscar tsconfig.json en el directorio actual o superiores
$tsconfigPath = $null
$currentDir = Get-Location
while ($currentDir) {
    $potentialConfig = Join-Path $currentDir "tsconfig.json"
    if (Test-Path $potentialConfig) {
        $tsconfigPath = $potentialConfig
        Write-Host "Found tsconfig: $tsconfigPath`n" -ForegroundColor Gray
        break
    }
    $parent = Split-Path $currentDir -Parent
    if ($parent -eq $currentDir) {
        break
    }
    $currentDir = $parent
}

Write-Host "--- TypeScript Official (tsc) ---`n" -ForegroundColor Green

# Usar tsconfig.json si existe
if ($tsconfigPath -and (Test-Path $File -PathType Leaf)) {
    # Leer y parsear tsconfig.json
    $tsconfigContent = Get-Content $tsconfigPath -Raw | ConvertFrom-Json
    $compilerOptions = $tsconfigContent.compilerOptions

    Write-Host "Checking file with tsconfig settings...`n" -ForegroundColor Gray

    # Construir argumentos de tsc basados en tsconfig
    $tscArgs = @("--noEmit")

    # Opciones de strict mode
    if ($compilerOptions.strict) {
        $tscArgs += "--strict"
    }

    # Target y lib
    if ($compilerOptions.target) {
        $tscArgs += "--target"
        $tscArgs += $compilerOptions.target
    }
    if ($compilerOptions.lib -and $compilerOptions.lib.Count -gt 0) {
        $tscArgs += "--lib"
        $tscArgs += ($compilerOptions.lib -join ",")
    }

    # Module resolution
    if ($compilerOptions.moduleResolution) {
        $tscArgs += "--moduleResolution"
        $tscArgs += $compilerOptions.moduleResolution
    }
    if ($compilerOptions.module) {
        $tscArgs += "--module"
        $tscArgs += $compilerOptions.module
    }

    # Paths y baseUrl
    if ($compilerOptions.baseUrl) {
        $tscArgs += "--baseUrl"
        $tscArgs += $compilerOptions.baseUrl
    }

    # Skip lib check
    if ($compilerOptions.skipLibCheck) {
        $tscArgs += "--skipLibCheck"
    }

    # Add the file to check
    $tscArgs += $File

    # Ejecutar tsc con los argumentos
    & npx tsc @tscArgs 2>&1 | Out-String | Write-Host
} elseif ($tsconfigPath) {
    # Para directorios, usar proyecto completo
    Write-Host "Checking entire project...`n" -ForegroundColor Gray
    npx tsc --noEmit --project $tsconfigPath 2>&1 | Out-String | Write-Host
} else {
    Write-Host "No tsconfig.json found, using default strict mode`n" -ForegroundColor Yellow
    npx tsc --noEmit --strict $File 2>&1 | Out-String | Write-Host
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
    Write-Host "`nExit codes match!" -ForegroundColor Green
} else {
    Write-Host "`nExit codes differ" -ForegroundColor Yellow
}

Write-Host ""
