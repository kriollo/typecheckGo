# Obtener todos los archivos de cada carpeta
$faultyFiles = Get-ChildItem ".\test\faulty\*.ts" | Select-Object -ExpandProperty Name
$okayFiles = Get-ChildItem ".\test\okay\*.ts" | Select-Object -ExpandProperty Name
$exampleFiles = Get-ChildItem ".\test\examples\*.ts" | Select-Object -ExpandProperty Name

# Contadores
$faultyErrors = @()      # Archivos faulty sin error detectado (MALO)
$faultyCorrect = 0       # Archivos faulty con error detectado (BUENO)

$okayErrors = @()        # Archivos okay con error (falso positivo - MALO)
$okayCorrect = 0         # Archivos okay sin error (BUENO)

$exampleErrors = @()     # Archivos examples con error (falso positivo - MALO)
$exampleCorrect = 0      # Archivos examples sin error (BUENO)

Write-Host ""
Write-Host "=== ANALIZANDO ARCHIVOS FAULTY ===" -ForegroundColor Cyan
Write-Host "Se espera que todos tengan errores" -ForegroundColor Gray
Write-Host ""

foreach ($f in $faultyFiles) {
    $result = & .\tscheck.exe check ".\test\faulty\$f" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "X $f - NO DETECTÓ ERROR" -ForegroundColor Red
        $faultyErrors += $f
    } else {
        Write-Host "✓" -NoNewline -ForegroundColor Green
        $faultyCorrect++
    }
}

Write-Host ""
Write-Host ""
Write-Host "=== ANALIZANDO ARCHIVOS OKAY ===" -ForegroundColor Cyan
Write-Host "Se espera que todos estén sin errores" -ForegroundColor Gray
Write-Host ""

foreach ($f in $okayFiles) {
    $result = & .\tscheck.exe check ".\test\okay\$f" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X $f - FALSO POSITIVO (detectó error cuando no debería)" -ForegroundColor Red
        $okayErrors += $f
    } else {
        Write-Host "✓" -NoNewline -ForegroundColor Green
        $okayCorrect++
    }
}

Write-Host ""
Write-Host ""
Write-Host "=== ANALIZANDO ARCHIVOS EXAMPLES ===" -ForegroundColor Cyan
Write-Host "Se espera que todos estén sin errores" -ForegroundColor Gray
Write-Host ""

foreach ($f in $exampleFiles) {
    $result = & .\tscheck.exe check ".\test\examples\$f" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X $f - FALSO POSITIVO (detectó error cuando no debería)" -ForegroundColor Red
        $exampleErrors += $f
    } else {
        Write-Host "✓" -NoNewline -ForegroundColor Green
        $exampleCorrect++
    }
}

# Resumen final
Write-Host ""
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           RESUMEN GENERAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "FAULTY (deben tener errores):" -ForegroundColor Yellow
Write-Host "  Total archivos: $($faultyFiles.Count)" -ForegroundColor White
Write-Host "  Correctos (con error detectado): $faultyCorrect" -ForegroundColor Green
Write-Host "  Fallidos (sin error detectado): $($faultyErrors.Count)" -ForegroundColor Red

Write-Host ""
Write-Host "OKAY (NO deben tener errores):" -ForegroundColor Yellow
Write-Host "  Total archivos: $($okayFiles.Count)" -ForegroundColor White
Write-Host "  Correctos (sin error): $okayCorrect" -ForegroundColor Green
Write-Host "  Falsos positivos (con error): $($okayErrors.Count)" -ForegroundColor Red

Write-Host ""
Write-Host "EXAMPLES (NO deben tener errores):" -ForegroundColor Yellow
Write-Host "  Total archivos: $($exampleFiles.Count)" -ForegroundColor White
Write-Host "  Correctos (sin error): $exampleCorrect" -ForegroundColor Green
Write-Host "  Falsos positivos (con error): $($exampleErrors.Count)" -ForegroundColor Red

$totalProblems = $faultyErrors.Count + $okayErrors.Count + $exampleErrors.Count
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "TOTAL DE PROBLEMAS: $totalProblems" -ForegroundColor $(if ($totalProblems -eq 0) { "Green" } else { "Red" })
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Detalles de los problemas
if ($faultyErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "ARCHIVOS FAULTY QUE NO DETECTARON ERROR:" -ForegroundColor Red
    foreach ($e in $faultyErrors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
}

if ($okayErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "ARCHIVOS OKAY CON FALSO POSITIVO:" -ForegroundColor Red
    foreach ($e in $okayErrors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
}

if ($exampleErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "ARCHIVOS EXAMPLES CON FALSO POSITIVO:" -ForegroundColor Red
    foreach ($e in $exampleErrors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
}

if ($totalProblems -eq 0) {
    Write-Host ""
    Write-Host "¡TODOS LOS TESTS PASARON CORRECTAMENTE!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "Se encontraron $totalProblems problema(s) que necesitan atención." -ForegroundColor Red
    exit 1
}
