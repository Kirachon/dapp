# PowerShell script to manage Docker development environment

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "logs", "shell", "exec", "build", "clean")]
    [string]$Action,
    
    [string]$Service = "",
    [string]$Command = ""
)

$ComposeFile = "docker-compose.dev.yml"

function Start-DevEnvironment {
    Write-Host "🚀 Starting development environment..." -ForegroundColor Green
    docker-compose -f $ComposeFile up -d
    Write-Host "✅ Development environment started!" -ForegroundColor Green
    Write-Host "📊 Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔧 API: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "💾 MinIO Console: http://localhost:9001" -ForegroundColor Cyan
}

function Stop-DevEnvironment {
    Write-Host "🛑 Stopping development environment..." -ForegroundColor Yellow
    docker-compose -f $ComposeFile down
    Write-Host "✅ Development environment stopped!" -ForegroundColor Green
}

function Restart-DevEnvironment {
    Write-Host "🔄 Restarting development environment..." -ForegroundColor Yellow
    docker-compose -f $ComposeFile restart
    Write-Host "✅ Development environment restarted!" -ForegroundColor Green
}

function Show-Logs {
    if ($Service) {
        docker-compose -f $ComposeFile logs -f $Service
    } else {
        docker-compose -f $ComposeFile logs -f
    }
}

function Enter-Shell {
    $Container = if ($Service) { "loveconnect-$Service-dev" } else { "loveconnect-dev-tools" }
    Write-Host "🐚 Entering shell for $Container..." -ForegroundColor Cyan
    docker exec -it $Container /bin/sh
}

function Execute-Command {
    $Container = if ($Service) { "loveconnect-$Service-dev" } else { "loveconnect-dev-tools" }
    if ($Command) {
        Write-Host "⚡ Executing command in $Container..." -ForegroundColor Cyan
        docker exec -it $Container $Command
    } else {
        Write-Host "❌ No command specified!" -ForegroundColor Red
        exit 1
    }
}

function Build-Images {
    Write-Host "🔨 Building development images..." -ForegroundColor Blue
    docker-compose -f $ComposeFile build
    Write-Host "✅ Images built successfully!" -ForegroundColor Green
}

function Clean-Environment {
    Write-Host "🧹 Cleaning development environment..." -ForegroundColor Red
    docker-compose -f $ComposeFile down -v --remove-orphans
    docker system prune -f
    Write-Host "✅ Environment cleaned!" -ForegroundColor Green
}

# Execute the requested action
switch ($Action) {
    "start" { Start-DevEnvironment }
    "stop" { Stop-DevEnvironment }
    "restart" { Restart-DevEnvironment }
    "logs" { Show-Logs }
    "shell" { Enter-Shell }
    "exec" { Execute-Command }
    "build" { Build-Images }
    "clean" { Clean-Environment }
}

# Show usage if no valid action
if (-not $Action -or $Action -notin @("start", "stop", "restart", "logs", "shell", "exec", "build", "clean")) {
    Write-Host @"
🐳 Docker Development Environment Manager

Usage: .\dev-docker.ps1 <action> [options]

Actions:
  start     - Start the development environment
  stop      - Stop the development environment  
  restart   - Restart the development environment
  logs      - Show logs (optionally for specific service)
  shell     - Enter shell in dev-tools container (or specific service)
  exec      - Execute command in container
  build     - Build development images
  clean     - Clean up containers, volumes, and images

Examples:
  .\dev-docker.ps1 start
  .\dev-docker.ps1 logs api
  .\dev-docker.ps1 shell frontend
  .\dev-docker.ps1 exec -Service api -Command "npm run migrate"
"@ -ForegroundColor Yellow
}
