$files = @("faulty1.ts", "faulty2.ts", "faulty3.ts", "faulty4.ts", "faulty5.ts", "faulty6.ts", "faulty7.ts", "faulty8.ts", "faulty9.ts", "faulty10.ts", "faulty11.ts", "faulty12.ts", "faulty13.ts", "faulty14.ts", "faulty15.ts", "faulty16.ts", "faulty17.ts", "faulty18.ts", "faulty19.ts", "faulty20.ts", "faulty21.ts", "faulty22.ts", "faulty23.ts", "faulty24.ts", "faulty25.ts", "faulty26.ts", "faulty27.ts", "faulty28.ts", "faulty29.ts", "faulty30.ts", "faulty31.ts", "faulty32.ts", "faulty33.ts", "faulty34.ts", "faulty35.ts", "faulty36.ts", "faulty37.ts", "faulty38.ts", "faulty39.ts", "faulty40.ts", "faulty41.ts", "faulty42.ts", "faulty43.ts", "faulty44.ts", "faulty45.ts", "faulty46.ts", "faulty47.ts", "faulty48.ts", "faulty49.ts", "faulty50.ts", "faulty51.ts", "faulty52.ts", "faulty53.ts", "faulty54.ts", "faulty55.ts", "faulty56.ts", "faulty57.ts", "faulty58.ts", "faulty59.ts", "faulty60.ts", "faulty61.ts", "faulty62.ts", "faulty63.ts", "faulty64.ts", "faulty65.ts", "faulty66.ts", "faulty67.ts", "faulty68.ts", "faulty69.ts", "faulty70.ts", "faulty71.ts", "faulty72.ts", "faulty73.ts", "faulty74.ts", "faulty75.ts", "faulty76.ts", "faulty77.ts", "faulty78.ts", "faulty79.ts", "faulty80.ts", "faulty81.ts", "faulty82.ts", "faulty83.ts", "faulty84.ts", "faulty85.ts", "faulty86.ts", "faulty87.ts", "faulty88.ts", "faulty89.ts", "faulty90.ts",
"faulty91.ts", "faulty92.ts", "faulty93.ts", "faulty94.ts", "faulty95.ts", "faulty96.ts", "faulty97.ts", "faulty98.ts", "faulty99.ts", "faulty100.ts",
"faulty101.ts", "faulty102.ts", "faulty103.ts", "faulty104.ts", "faulty105.ts", "faulty106.ts", "faulty107.ts", "faulty108.ts", "faulty109.ts", "faulty110.ts", "faulty111.ts", "faulty112.ts", "faulty113.ts", "faulty114.ts", "faulty115.ts", "faulty116.ts", "faulty117.ts", "faulty118.ts", "faulty119.ts", "faulty120.ts","faulty121.ts", "faulty122.ts", "faulty123.ts", "faulty124.ts", "faulty125.ts", "faulty126.ts", "faulty127.ts", "faulty128.ts", "faulty129.ts", "faulty130.ts", "faulty131.ts", "faulty132.ts", "faulty133.ts", "faulty134.ts", "faulty135.ts", "faulty136.ts", "faulty137.ts", "faulty138.ts", "faulty139.ts", "faulty140.ts", "faulty141.ts", "faulty142.ts", "faulty143.ts", "faulty144.ts", "faulty145.ts", "faulty146.ts", "faulty147.ts", "faulty148.ts", "faulty149.ts", "faulty150.ts","faulty151.ts", "faulty152.ts", "faulty153.ts", "faulty154.ts", "faulty155.ts", "faulty156.ts", "faulty157.ts", "faulty158.ts", "faulty159.ts", "faulty160.ts","faulty161.ts", "faulty162.ts", "faulty163.ts", "faulty164.ts", "faulty165.ts", "faulty166.ts", "faulty167.ts", "faulty168.ts", "faulty169.ts", "faulty170.ts")
$errors = @()
foreach ($f in $files) {
    $result = & .\tscheck.exe check ".\test\faulty\$f" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "X" -NoNewline -ForegroundColor Red
        $errors += $f
    }else{
        Write-Host "." -NoNewline -ForegroundColor Green
    }
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Total de archivos probados: $($files.Count)" -ForegroundColor White
Write-Host "Archivos con error (correcto): $($files.Count - $errors.Count)" -ForegroundColor Green
Write-Host "Archivos sin error (fallido): $($errors.Count)" -ForegroundColor Red

if ($errors.Count -eq 0) {
    Write-Host "`nAll tests passed!" -ForegroundColor Green
}
else {
    Write-Host "`nThe following tests failed:" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "  - $e" -ForegroundColor Red
    }
    exit 1
}
