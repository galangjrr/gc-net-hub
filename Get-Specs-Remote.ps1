# Script Penarik Spek Jarak Jauh (Remote lewat LAN/TCP/IP)
# Syarat: Firewall di PC Client harus mengizinkan WMI (Windows Management Instrumentation) atau WinRM.
# PC Client juga harus memiliki password Administrator yang Anda ketahui.



$pcList = @(
    "PC-Iyoo",
    "PC-Moya",
    "PC-Bino",
    "PC-Love",
    "PC-Yubi",
    "PC-Mokiya",
    "PC-Oscardino",
    "PC-Tom",
    "PC-Ruby",
    "PC-Ruru"
)

Write-Host "Masukkan Username & Password Administrator PC Client (biasanya username: Administrator)" -ForegroundColor Yellow
$cred = Get-Credential

$allData = @()

foreach ($pc in $pcList) {
    Write-Host "Menyuntik PC: $pc..." -ForegroundColor Cyan

    try {
        $cimSession = New-CimSession -ComputerName $pc -Credential $cred -ErrorAction Stop

        $cpu = (Get-CimInstance Win32_Processor -CimSession $cimSession).Name -join ", "
        $gpu = (Get-CimInstance Win32_VideoController -CimSession $cimSession).Name -join ", "
        $ramBytes = (Get-CimInstance Win32_ComputerSystem -CimSession $cimSession).TotalPhysicalMemory
        $ram = [math]::Round($ramBytes / 1GB, 2).ToString() + " GB"
        
        $storage = (Get-CimInstance Win32_DiskDrive -CimSession $cimSession | ForEach-Object { "$($_.Model) ($([math]::Round($_.Size / 1GB, 0)) GB)" }) -join " | "
        
        $monitors = (Get-CimInstance Win32_DesktopMonitor -CimSession $cimSession | Where-Object { $_.Name -ne $null } | Select-Object -ExpandProperty Name)
        if (-not $monitors) { $monitors = "Tidak terdeteksi" }

        $keyboard = (Get-CimInstance Win32_Keyboard -CimSession $cimSession).Name -join ", "
        $mouse = (Get-CimInstance Win32_PointingDevice -CimSession $cimSession).Name -join ", "

        Remove-CimSession $cimSession

        $allData += @"
# Spesifikasi PC: $pc
- **CPU:** $cpu
- **VGA:** $gpu
- **RAM:** $ram
- **Storage:** $storage
- **Monitor:** $monitors
- **Keyboard:** $keyboard
- **Mouse:** $mouse

"@
        Write-Host "Berhasil sedot data dari $pc!" -ForegroundColor Green
    }
    catch {
        Write-Host "Gagal konek ke $pc. Pastikan PC hidup & Firewall WMI terbuka." -ForegroundColor Red
    }
}

$outputPath = "$env:USERPROFILE\Desktop\Rekap_Spek_Warnet.md"
Set-Content -Path $outputPath -Value ($allData -join "`n") -Encoding UTF8
Write-Host "Selesai! Semua data rekap disimpan di: $outputPath" -ForegroundColor Yellow
