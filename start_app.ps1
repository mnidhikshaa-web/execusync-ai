Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   EXECUSYNC AI - Planning-to-Execution Intelligence     " -ForegroundColor Yellow
Write-Host "   Oil India Limited - Smart India Hackathon 2026        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$projectDir = Join-Path $PSScriptRoot "execusync-ai-bridge-main"

if (Test-Path $projectDir) {
    Set-Location $projectDir
    & ".\start_app.ps1"
} else {
    Write-Error "Project directory execusync-ai-bridge-main not found!"
}
