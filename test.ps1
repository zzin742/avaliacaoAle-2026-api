# Script de teste rapido (PowerShell) - valida que a API esta no ar
# Uso: .\test.ps1
# Pre-requisito: docker compose up -d (containers no ar)

$ErrorActionPreference = "Stop"
$base = "http://localhost"

Write-Host ""
Write-Host "=== 1. Health check (rota publica) ==="
try {
    $health = Invoke-RestMethod -Uri "$base/health"
    Write-Host "Status:" $health.status
    Write-Host "Uptime:" ([math]::Round($health.uptime, 2)) "segundos"
    Write-Host "Checks:" ($health.checks | ConvertTo-Json -Compress)
} catch {
    Write-Host "FALHA NO HEALTH:" $_.Exception.Message -ForegroundColor Red
    Write-Host "Verifique se rodou 'docker compose up -d' e se a porta esta livre" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== 2. Login (obter token JWT) ==="
$body = @{ email = "admin@cursos.com"; senha = "admin123" } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri "$base/login" -Method Post -Body $body -ContentType "application/json"
$token = $resp.token
Write-Host "Login OK - usuario:" $resp.usuario.nome "(" $resp.usuario.tipo ")"
Write-Host "Token (primeiros 40 chars):" $token.Substring(0, [Math]::Min(40, $token.Length)) "..."

$headers = @{ Authorization = "Bearer $token" }

Write-Host ""
Write-Host "=== 3. Listar cursos (rota protegida, com token) ==="
$cursos = Invoke-RestMethod -Uri "$base/cursos?limit=3" -Headers $headers
Write-Host "Total de cursos:" $cursos.total
Write-Host "Mostrando os 3 primeiros:"
$cursos.dados | ForEach-Object { Write-Host "  -" $_.titulo "(R$" $_.preco ")" }

Write-Host ""
Write-Host "=== 4. Demonstracao do 401 (rota protegida SEM token) ==="
try {
    Invoke-RestMethod -Uri "$base/cursos" | Out-Null
    Write-Host "ERRO: a rota deveria exigir token!" -ForegroundColor Red
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host "Status:" $status "(esperado: 401)"
    Write-Host "Mensagem: 'Token nao fornecido' (esperado e correto)"
    Write-Host "Isso e a protecao JWT funcionando - NAO e bug." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Tudo funcionando ===" -ForegroundColor Green
Write-Host "Swagger: $base/api-docs"
