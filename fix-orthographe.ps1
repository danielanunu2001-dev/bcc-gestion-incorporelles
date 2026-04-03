# fix-orthographe.ps1
Write-Host "🔍 Recherche des fichiers avec orthographe incorrecte..." -ForegroundColor Yellow

# Cherche les fichiers avec "revaluations" (un seul 'e')
$files = Get-ChildItem -Path .\src -Recurse -Include "*.jsx","*.js" | Select-String -Pattern "revaluations" | Select-Object -Unique Path

if ($files) {
    Write-Host "⚠️ Fichiers trouvés avec 'revaluations' (incorrect):" -ForegroundColor Red
    foreach ($file in $files) {
        Write-Host "  - $($file.Path)" -ForegroundColor Red
    }
} else {
    Write-Host "✅ Aucun fichier avec 'revaluations' trouvé" -ForegroundColor Green
}

Write-Host ""

# Cherche les fichiers avec "reevaluations" (deux 'e')
$files2 = Get-ChildItem -Path .\src -Recurse -Include "*.jsx","*.js" | Select-String -Pattern "reevaluations" | Select-Object -Unique Path

if ($files2) {
    Write-Host "✅ Fichiers trouvés avec 'reevaluations' (correct):" -ForegroundColor Green
    foreach ($file in $files2) {
        Write-Host "  - $($file.Path)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ Aucun fichier avec 'reevaluations' trouvé" -ForegroundColor Yellow
}