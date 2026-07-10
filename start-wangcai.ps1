# WangCai Toolkit - One-Click Startup
# PowerShell script for Windows 11

$ErrorActionPreference = "Continue"

$FRONTEND_DIR = "D:\Develop\GitHub\trading-toolkit\trading-toolkit-web"
$BACKEND_DIR = "D:\Develop\GitHub\trading-toolkit\trading-toolkit-service\cloudrun"
$FRONTEND_PORT = 5173
$BACKEND_PORT = 8080
$PYTHON_EXE = "C:\Users\Administrator\AppData\Local\Programs\Python\Python314\python.exe"

function Write-Section($msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $msg
}

function Write-Warn($msg) {
    Write-Host "  [WARN] " -ForegroundColor Yellow -NoNewline
    Write-Host $msg
}

function Write-Err($msg) {
    Write-Host "  [ERR] " -ForegroundColor Red -NoNewline
    Write-Host $msg
}

function Write-Info($msg) {
    Write-Host "  [INFO] " -ForegroundColor Gray -NoNewline
    Write-Host $msg
}

function Test-PortInUse($port) {
    $result = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s"
    return ($result -ne $null)
}

Write-Section "WangCai Toolkit - Starting"

Write-Host ""
Write-Info "Checking paths..."

if (-not (Test-Path $FRONTEND_DIR)) {
    Write-Err "Frontend dir not found: $FRONTEND_DIR"
    Read-Host "Press Enter to exit"
    exit 1
}
if (-not (Test-Path $BACKEND_DIR)) {
    Write-Err "Backend dir not found: $BACKEND_DIR"
    Read-Host "Press Enter to exit"
    exit 1
}
if (-not (Test-Path $PYTHON_EXE)) {
    Write-Err "Python not found: $PYTHON_EXE"
    Write-Info "Please update PYTHON_EXE in the script"
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Ok "All paths verified"

Write-Host ""
Write-Info "Checking ports..."

$backendRunning = Test-PortInUse $BACKEND_PORT
$frontendRunning = Test-PortInUse $FRONTEND_PORT

if ($backendRunning) {
    Write-Warn "Backend port $BACKEND_PORT in use, skipping backend start"
} else {
    Write-Ok "Backend port $BACKEND_PORT free"
}

if ($frontendRunning) {
    Write-Warn "Frontend port $FRONTEND_PORT in use, skipping frontend start"
} else {
    Write-Ok "Frontend port $FRONTEND_PORT free"
}

# Log files (single window mode: backend/frontend run hidden, logs streamed here)
$BACKEND_LOG = "$env:TEMP\wangcai-backend.log"
$FRONTEND_LOG = "$env:TEMP\wangcai-frontend.log"
$BACKEND_ERR = "$env:TEMP\wangcai-backend.err.log"
$FRONTEND_ERR = "$env:TEMP\wangcai-frontend.err.log"
Remove-Item $BACKEND_LOG, $FRONTEND_LOG, $BACKEND_ERR, $FRONTEND_ERR -ErrorAction SilentlyContinue

$backendProcess = $null
$frontendProcess = $null

Write-Host ""
Write-Info "Starting backend (Flask :$BACKEND_PORT)..."
if (-not $backendRunning) {
    $backendProcess = Start-Process $PYTHON_EXE -ArgumentList "app.py" `
        -WorkingDirectory $BACKEND_DIR -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $BACKEND_LOG -RedirectStandardError $BACKEND_ERR
    Write-Ok "Backend started (hidden, PID $($backendProcess.Id))"
} else {
    Write-Warn "Backend already running, skipped"
}

Write-Host ""
Write-Info "Starting frontend (Vite :$FRONTEND_PORT)..."
if (-not $frontendRunning) {
    $frontendProcess = Start-Process "npm.cmd" -ArgumentList "run","dev" `
        -WorkingDirectory $FRONTEND_DIR -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $FRONTEND_LOG -RedirectStandardError $FRONTEND_ERR
    Write-Ok "Frontend started (hidden, PID $($frontendProcess.Id))"
} else {
    Write-Warn "Frontend already running, skipped"
}

Write-Host ""
Write-Info "Waiting for services to be ready..."
$waited = 0
$maxWait = 30
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
    $beReady = Test-PortInUse $BACKEND_PORT
    $feReady = Test-PortInUse $FRONTEND_PORT
    if (($beReady -or $backendRunning) -and ($feReady -or $frontendRunning)) { break }
    if ($waited % 5 -eq 0) {
        Write-Host "  ... waited $waited sec (backend=$beReady, frontend=$feReady)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Info "Opening browser..."
try {
    Start-Process "http://localhost:$FRONTEND_PORT"
    Write-Ok "Browser opened"
}
catch {
    Write-Warn "Cannot open browser automatically, please visit manually"
}

Write-Section "Startup Complete (single window mode)"
Write-Host ""
Write-Host "  Frontend: " -NoNewline
Write-Host "http://localhost:$FRONTEND_PORT" -ForegroundColor Green
Write-Host "  Backend:  " -NoNewline
Write-Host "http://localhost:$BACKEND_PORT" -ForegroundColor Green
Write-Host ""
Write-Host "  Logs:" -ForegroundColor Gray
Write-Host "    Backend:  $BACKEND_LOG" -ForegroundColor Gray
Write-Host "    Frontend: $FRONTEND_LOG" -ForegroundColor Gray
Write-Host ""
Write-Host "  Press " -NoNewline -ForegroundColor Gray
Write-Host "Ctrl+C" -NoNewline -ForegroundColor Yellow
Write-Host " to stop all services and close this window" -ForegroundColor Gray
Write-Host ""
Write-Host "  --- Live Logs ---" -ForegroundColor Cyan
Write-Host ""

# Background jobs to tail both logs in this single window
$backendJob = Start-Job -ScriptBlock { param($log) Get-Content $log -Wait -Tail 0 } -ArgumentList $BACKEND_LOG
$frontendJob = Start-Job -ScriptBlock { param($log) Get-Content $log -Wait -Tail 0 } -ArgumentList $FRONTEND_LOG

try {
    while ($true) {
        if ($backendProcess -and $backendProcess.HasExited) {
            Write-Err "Backend process exited (code $($backendProcess.ExitCode))"
            break
        }
        if ($frontendProcess -and $frontendProcess.HasExited) {
            Write-Err "Frontend process exited (code $($frontendProcess.ExitCode))"
            break
        }
        Receive-Job $backendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[BE] $_" -ForegroundColor Cyan }
        Receive-Job $frontendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[FE] $_" -ForegroundColor Green }
        Start-Sleep -Milliseconds 200
    }
}
finally {
    Write-Host ""
    Write-Info "Stopping all services..."
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    if ($backendProcess) { taskkill /PID $backendProcess.Id /T /F 2>$null | Out-Null }
    if ($frontendProcess) { taskkill /PID $frontendProcess.Id /T /F 2>$null | Out-Null }
    Write-Ok "All services stopped"
    Start-Sleep -Seconds 2
}
