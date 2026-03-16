# AURA – PowerShell build script (Windows alternative to Makefile)
# Usage: .\Makefile.ps1 install | dev | dev-gateway | dev-dashboard | docker | etc.

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("install", "install-gateway", "install-dashboard", "install-tests",
                 "dev", "dev-gateway", "dev-dashboard", "docker", "docker-down",
                 "test-gateway", "test-e2e", "build", "help")]
    [string]$Target
)

switch ($Target) {
    "install" {
        & $PSScriptRoot\Makefile.ps1 install-gateway
        & $PSScriptRoot\Makefile.ps1 install-dashboard
        & $PSScriptRoot\Makefile.ps1 install-tests
    }
    "install-gateway" {
        Write-Host "Installing gateway dependencies…" -ForegroundColor Cyan
        Set-Location $PSScriptRoot\gateway; npm install; Set-Location $PSScriptRoot
    }
    "install-dashboard" {
        Write-Host "Installing dashboard dependencies…" -ForegroundColor Cyan
        Set-Location $PSScriptRoot\dashboard; npm install; Set-Location $PSScriptRoot
    }
    "install-tests" {
        Write-Host "Installing test dependencies…" -ForegroundColor Cyan
        Set-Location $PSScriptRoot\tests; npm install; Set-Location $PSScriptRoot
    }
    "dev" {
        Write-Host "Starting gateway and dashboard in parallel…" -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\gateway'; npm run dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\dashboard'; npm run dev"
        Write-Host "Gateway: http://localhost:3000 | Dashboard: http://localhost:5173" -ForegroundColor Green
    }
    "dev-gateway" {
        Set-Location $PSScriptRoot\gateway; npm run dev
    }
    "dev-dashboard" {
        Set-Location $PSScriptRoot\dashboard; npm run dev
    }
    "docker" {
        docker compose up --build -d
    }
    "docker-down" {
        docker compose down
    }
    "test-gateway" {
        Set-Location $PSScriptRoot\gateway; npm test; Set-Location $PSScriptRoot
    }
    "test-e2e" {
        Set-Location $PSScriptRoot\tests; npm run test:e2e; Set-Location $PSScriptRoot
    }
    "build" {
        Set-Location $PSScriptRoot\dashboard; npm run build; Set-Location $PSScriptRoot
    }
    "help" {
        Write-Host ""
        Write-Host "  AURA PowerShell targets:" -ForegroundColor Yellow
        Write-Host "  .\Makefile.ps1 install       Install all dependencies"
        Write-Host "  .\Makefile.ps1 dev           Start gateway + dashboard (new windows)"
        Write-Host "  .\Makefile.ps1 dev-gateway   Start gateway only (port 3000)"
        Write-Host "  .\Makefile.ps1 dev-dashboard Start dashboard only (port 5173)"
        Write-Host "  .\Makefile.ps1 docker        Start Docker containers"
        Write-Host "  .\Makefile.ps1 test-gateway  Run gateway tests"
        Write-Host ""
    }
}
