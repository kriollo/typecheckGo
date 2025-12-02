$faultyDir = ".\test\faulty"
$files = Get-ChildItem -Path $faultyDir -Filter "*.ts" | Sort-Object Name
$totalFiles = $files.Count
$filesWithErrors = 0
$filesWithoutErrors = @()
$errorCount = 0

Write-Host "Analyzing $totalFiles files in test/faulty/..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $result = & .\tscheck.exe check $file.FullName 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        # No errors detected
        $filesWithoutErrors += $file.Name
        Write-Host "[ ] $($file.Name) - NO ERRORS DETECTED" -ForegroundColor Red
    } else {
        # Errors detected
        $filesWithErrors++
        # Count errors (rough estimate based on TS error codes)
        $errors = ([regex]::Matches($result, "TS\d{4}")).Count
        $errorCount += $errors
        Write-Host "[X] $($file.Name) - $errors error(s)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total files: $totalFiles"
Write-Host "Files with errors detected: $filesWithErrors" -ForegroundColor Green
Write-Host "Files WITHOUT errors (FALSE NEGATIVES): $($filesWithoutErrors.Count)" -ForegroundColor Red
Write-Host "Total errors detected: $errorCount"
Write-Host ""

if ($filesWithoutErrors.Count -gt 0) {
    Write-Host "Files missing error detection:" -ForegroundColor Yellow
    foreach ($file in $filesWithoutErrors) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
}
