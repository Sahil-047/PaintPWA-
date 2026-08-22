# Run as Administrator: Right-click PowerShell -> Run as administrator
# Then: Set-ExecutionPolicy Bypass -Scope Process -Force; D:\PaintPWA-\scripts\setup-rabbitmq-windows.ps1

$ErrorActionPreference = "Continue"

$ErlangHome = "C:\Program Files\Erlang OTP 27"
$RabbitSbin = "C:\Program Files\RabbitMQ Server\rabbitmq_server-4.3.5\sbin"

Write-Host "Setting ERLANG_HOME..." -ForegroundColor Cyan
[Environment]::SetEnvironmentVariable("ERLANG_HOME", $ErlangHome, "Machine")
$env:ERLANG_HOME = $ErlangHome

Write-Host "Stopping RabbitMQ and Erlang processes..." -ForegroundColor Cyan
net stop RabbitMQ 2>$null
Stop-Process -Name erl, erlsrv, epmd -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host "Clearing old RabbitMQ database..." -ForegroundColor Cyan
Remove-Item "$env:APPDATA\RabbitMQ\db" -Recurse -Force -ErrorAction SilentlyContinue

Set-Location $RabbitSbin

Write-Host "Reinstalling RabbitMQ Windows service..." -ForegroundColor Cyan
cmd /c "rabbitmq-service.bat stop"
cmd /c "rabbitmq-service.bat remove"
cmd /c "rabbitmq-service.bat install"
cmd /c "rabbitmq-plugins.bat enable rabbitmq_management"

Write-Host "Starting RabbitMQ..." -ForegroundColor Cyan
net start RabbitMQ
Start-Sleep -Seconds 12

Write-Host "Checking status..." -ForegroundColor Cyan
cmd /c "rabbitmq-diagnostics.bat ping"
$p15672 = Test-NetConnection localhost -Port 15672 -WarningAction SilentlyContinue
$p5672 = Test-NetConnection localhost -Port 5672 -WarningAction SilentlyContinue

Write-Host ""
Write-Host "Port 15672 (Management UI): $($p15672.TcpTestSucceeded)" -ForegroundColor $(if ($p15672.TcpTestSucceeded) { "Green" } else { "Red" })
Write-Host "Port 5672 (AMQP):         $($p5672.TcpTestSucceeded)" -ForegroundColor $(if ($p5672.TcpTestSucceeded) { "Green" } else { "Red" })
Write-Host ""
if ($p15672.TcpTestSucceeded) {
  Write-Host "Open http://localhost:15672 - login guest / guest" -ForegroundColor Green
} else {
  Write-Host "If ports are closed, check log:" -ForegroundColor Yellow
  $logFile = Join-Path $env:APPDATA "RabbitMQ\log\rabbit@$($env:COMPUTERNAME).log"
  Write-Host $logFile
}
