$files = @("example1.ts", "example2.ts", "example3.ts", "example4.ts", "example5.ts", "example6.ts", "example7.ts", "example8.ts", "example9.ts", "example10.ts", "example11.ts", "example12.ts", "example13.ts", "example14.ts", "example15.ts", "example16.ts", "example17.ts", "example18.ts", "example19.ts", "example20.ts", "example21.ts", "example22.ts", "example23.ts", "example24.ts", "example25.ts", "example26.ts", "example27.ts", "example28.ts", "example29.ts", "example30.ts", "example31.ts", "example32.ts", "example33.ts", "example34.ts", "example35.ts", "example36.ts", "example37.ts", "example38.ts", "example39.ts", "example40.ts", "example41.ts", "example42.ts", "example43.ts", "example44.ts", "example45.ts", "example46.ts", "example47.ts", "example48.ts", "example49.ts", "example50.ts", "example51.ts", "example52.ts", "example53.ts", "example54.ts", "example55.ts", "example56.ts", "example57.ts", "example58.ts", "example59.ts", "example60.ts", "example61.ts", "example62.ts", "example63.ts", "example64.ts", "example65.ts", "example66.ts", "example67.ts", "example68.ts", "example69.ts", "example70.ts", "example71.ts", "example72.ts", "example73.ts", "example74.ts", "example75.ts", "example76.ts", "example77.ts", "example78.ts", "example79.ts", "example80.ts", "example81.ts", "example82.ts", "example83.ts", "example84.ts", "example85.ts", "example86.ts", "example87.ts", "example88.ts", "example89.ts", "example90.ts",
"example91.ts", "example92.ts", "example93.ts", "example94.ts", "example95.ts", "example96.ts", "example97.ts", "example98.ts", "example99.ts", "example100.ts",
"example101.ts", "example102.ts", "example103.ts", "example104.ts", "example105.ts", "example106.ts", "example107.ts", "example108.ts", "example109.ts", "example110.ts", "example111.ts", "example112.ts", "example113.ts", "example114.ts", "example115.ts", "example116.ts", "example117.ts", "example118.ts", "example119.ts", "example120.ts","example121.ts", "example122.ts", "example123.ts", "example124.ts", "example125.ts", "example126.ts", "example127.ts", "example128.ts", "example129.ts", "example130.ts", "example131.ts", "example132.ts", "example133.ts", "example134.ts", "example135.ts", "example136.ts", "example137.ts", "example138.ts", "example139.ts", "example140.ts", "example141.ts", "example142.ts", "example143.ts", "example144.ts", "example145.ts", "example146.ts", "example147.ts", "example148.ts", "example149.ts", "example150.ts","example151.ts", "example152.ts", "example153.ts", "example154.ts", "example155.ts", "example156.ts", "example157.ts", "example158.ts", "example159.ts", "example160.ts","example161.ts", "example162.ts", "example163.ts", "example164.ts", "example165.ts", "example166.ts", "example167.ts", "example168.ts", "example169.ts", "example170.ts")
$errors = @()
foreach ($f in $files) {
    $result = & .\tscheck.exe check ".\test\okay\$f" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "x" -NoNewline -ForegroundColor Red
        $errors += $f
    }else{
        Write-Host "." -NoNewline -ForegroundColor Green
    }
}

Write-Host "`n`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Total de archivos probados: $($files.Count)" -ForegroundColor White
Write-Host "Archivos sin error (correcto): $($files.Count - $errors.Count)" -ForegroundColor Green
Write-Host "Archivos con error (falso positivo): $($errors.Count)" -ForegroundColor Red

if ($errors.Count -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
}
else {
    Write-Host "`nArchivos con falsos positivos:" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
    exit 1
}
