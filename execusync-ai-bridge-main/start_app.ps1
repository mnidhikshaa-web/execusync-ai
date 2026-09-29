# EXECUSYNC AI — 1-Click Startup Script (Windows PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   EXECUSYNC AI — Planning-to-Execution Platform" -ForegroundColor Yellow
Write-Host "   FastAPI (Python) + React (Vite) Full-Stack Prototype" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# Start FastAPI Backend in background job
$BackendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
}

Write-Host "[✓] FastAPI backend started at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "[✓] Starting React frontend dev server..." -ForegroundColor Cyan

try {
    npm run dev
} finally {
    Stop-Job $BackendJob
    Remove-Job $BackendJob
    Write-Host "[!] Backend server stopped." -ForegroundColor Yellow
}
