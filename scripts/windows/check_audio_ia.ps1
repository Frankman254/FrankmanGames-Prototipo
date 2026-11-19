# Diagnóstico del puesto de audio IA en el PC con Windows (docs/GUIA_AUDIO_MCP.md).
# Solo lee: no instala, no abre puertos y no cambia ajustes.
#   powershell -ExecutionPolicy Bypass -File scripts\windows\check_audio_ia.ps1
$ErrorActionPreference = 'Continue'
$fallos = 0
function Bien($t) { Write-Host "  bien   $t" -ForegroundColor Green }
function Mal($t)  { Write-Host "  FALLA  $t" -ForegroundColor Red; $script:fallos++ }
function Ojo($t)  { Write-Host "  ojo    $t" -ForegroundColor Yellow }

Write-Host 'GPU'
$smi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($smi) { & nvidia-smi --query-gpu=name,memory.total,memory.used,driver_version --format=csv,noheader | ForEach-Object { Bien $_ } }
else { Mal 'nvidia-smi no está: falta el controlador NVIDIA' }

Write-Host 'ACE-Step Studio (servicio 8792 y motor 8089)'
foreach ($port in 8792, 8089) {
    $l = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $l) { Ojo "$port no escucha (¿estudio cerrado?)"; continue }
    $abiertas = $l | Where-Object { $_.LocalAddress -notin @('127.0.0.1', '::1') }
    if ($abiertas) { Mal "$port escucha en $($abiertas.LocalAddress -join ', '): apaga Ajustes → Acceso de red" }
    else { Bien "$port solo en loopback" }
}

Write-Host 'Estadísticas anónimas'
$tel = [Environment]::GetEnvironmentVariable('STUDIO_TELEMETRY', 'User')
$dnt = [Environment]::GetEnvironmentVariable('DO_NOT_TRACK', 'User')
if ($tel -eq '0' -or $dnt -eq '1') { Bien "apagadas por entorno (STUDIO_TELEMETRY=$tel, DO_NOT_TRACK=$dnt)" }
else { Mal 'define STUDIO_TELEMETRY=0 y DO_NOT_TRACK=1 en las variables de usuario' }

Write-Host 'Acceso desde el Mac (OpenSSH + Tailscale)'
$sshd = Get-Service sshd -ErrorAction SilentlyContinue
if ($sshd -and $sshd.Status -eq 'Running') { Bien 'sshd en marcha' } else { Mal 'OpenSSH Server no está en marcha' }
$cfg = "$env:ProgramData\ssh\sshd_config"
if (Test-Path $cfg) {
    if (Select-String -Path $cfg -Pattern '^\s*PasswordAuthentication\s+no' -Quiet) { Bien 'sshd sin contraseñas (solo clave)' }
    else { Mal 'sshd admite contraseñas: pon PasswordAuthentication no' }
}
$ts = Get-Command tailscale -ErrorAction SilentlyContinue
if ($ts) { $ip = (& tailscale ip -4 2>$null); if ($ip) { Bien "Tailscale $ip" } else { Mal 'Tailscale instalado pero sin conectar' } }
else { Mal 'Tailscale no está instalado' }
$r = Get-NetFirewallRule -DisplayName '*OpenSSH*' -ErrorAction SilentlyContinue | Where-Object Enabled -eq 'True'
if ($r) { Ojo 'regla de firewall de OpenSSH activa: limítala a la interfaz de Tailscale (100.64.0.0/10)' }

Write-Host ''
if ($fallos) { Write-Host "$fallos fallos" -ForegroundColor Red; exit 1 } else { Write-Host 'todo en orden' -ForegroundColor Green }
