param(
    [Parameter(Mandatory=$true)][string]$url1,
    [Parameter(Mandatory=$true)][string]$url2,
    [string]$clientData = ""
)

Write-Host "Ejecutando fetch de dos páginas..."
Write-Host "1) $url1"
Write-Host "2) $url2"
if ($clientData -ne "") { Write-Host "ClientData:" $clientData }

$nodeCmd = "node .\fetch-two-pages.js `"$url1`" `"$url2`""
if ($clientData -ne "") { $nodeCmd = $nodeCmd + " --clientData `"$clientData`"" }

Invoke-Expression $nodeCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "El script JS terminó con código de error $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "Proceso completado. Revisa la carpeta fetch-results\<timestamp>\ref1_* y ref2_*" -ForegroundColor Green
