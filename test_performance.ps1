# Performance Profiling Test Script
# This script demonstrates the performance profiling capabilities

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TypeChecker Performance Profiling Demo                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Test 1: First run without cache (sequential loading)
Write-Host "Test 1: First run with profiling (sequential loading)" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Command: TSCHECK_PROFILE=1 .\tscheck.exe check test" -ForegroundColor Gray
Write-Host ""

# Clear cache first
if (Test-Path "$env:TEMP\tscheck-cache") {
    Write-Host "Clearing cache..." -ForegroundColor Gray
    Remove-Item "$env:TEMP\tscheck-cache\*.snapshot" -ErrorAction SilentlyContinue
}

$env:TSCHECK_PROFILE = "1"
$env:TSCHECK_PARALLEL_LOAD = "0"

$time1 = Measure-Command {
    .\tscheck.exe check test 2>&1 | Out-Null
}

Write-Host "First run completed in: $($time1.TotalMilliseconds)ms" -ForegroundColor Green
Write-Host ""
Write-Host ""

# Test 2: Second run with cache
Write-Host "Test 2: Second run with cache (should be faster)" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Command: TSCHECK_PROFILE=1 .\tscheck.exe check test" -ForegroundColor Gray
Write-Host ""

$time2 = Measure-Command {
    .\tscheck.exe check test 2>&1 | Out-Null
}

Write-Host "Second run completed in: $($time2.TotalMilliseconds)ms" -ForegroundColor Green
$improvement = [math]::Round((($time1.TotalMilliseconds - $time2.TotalMilliseconds) / $time1.TotalMilliseconds) * 100, 1)
Write-Host "Improvement: $improvement% faster" -ForegroundColor Cyan
Write-Host ""
Write-Host ""

# Test 3: Parallel loading (first run)
Write-Host "Test 3: First run with parallel loading" -ForegroundColor Yellow
Write-Host "-------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Command: TSCHECK_PARALLEL_LOAD=1 TSCHECK_PROFILE=1 .\tscheck.exe check src" -ForegroundColor Gray
Write-Host ""

# Clear cache again
if (Test-Path "$env:TEMP\tscheck-cache") {
    Write-Host "Clearing cache..." -ForegroundColor Gray
    Remove-Item "$env:TEMP\tscheck-cache\*.snapshot" -ErrorAction SilentlyContinue
}

$env:TSCHECK_PARALLEL_LOAD = "1"

$time3 = Measure-Command {
    .\tscheck.exe check src 2>&1 | Out-Null
}

Write-Host "Parallel run completed in: $($time3.TotalMilliseconds)ms" -ForegroundColor Green
$parallelImprovement = [math]::Round((($time1.TotalMilliseconds - $time3.TotalMilliseconds) / $time1.TotalMilliseconds) * 100, 1)
Write-Host "Improvement vs sequential: $parallelImprovement% faster" -ForegroundColor Cyan
Write-Host ""
Write-Host ""

# Summary
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Performance Summary                                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sequential (first run):  $($time1.TotalMilliseconds)ms" -ForegroundColor White
Write-Host "Cached (second run):     $($time2.TotalMilliseconds)ms ($improvement% faster)" -ForegroundColor Green
Write-Host "Parallel (first run):    $($time3.TotalMilliseconds)ms ($parallelImprovement% faster)" -ForegroundColor Green
Write-Host ""
Write-Host "To see detailed profiling report, run:" -ForegroundColor Yellow
Write-Host "  `$env:TSCHECK_PROFILE=`"1`"; .\tscheck.exe check src" -ForegroundColor Gray
Write-Host ""
Write-Host "To enable parallel loading:" -ForegroundColor Yellow
Write-Host "  `$env:TSCHECK_PARALLEL_LOAD=`"1`"; .\tscheck.exe check src" -ForegroundColor Gray
Write-Host ""
