$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupDir = "backups"
$dbFile = "prisma/dev.db"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

if (Test-Path $dbFile) {
    $backupFile = "$backupDir/dev_backup_$timestamp.db"
    Copy-Item $dbFile $backupFile
    Write-Host "Veritabanı yedeklendi: $backupFile" -ForegroundColor Cyan
} else {
    Write-Host "Hata: Veritabanı dosyası bulunamadı ($dbFile)" -ForegroundColor Red
}
