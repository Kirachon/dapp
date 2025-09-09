# LoveConnect Docker Setup Script for Windows
# This script sets up the complete Docker development environment

param(
    [switch]$Clean,
    [switch]$Build,
    [switch]$Logs,
    [switch]$Test,
    [switch]$WSL
)

Write-Host "🐳 LoveConnect Docker Setup for Windows" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        return $false
    }
}

# Function to check for WSL2
function Test-WSL2Available {
    try {
        $wslVersion = wsl --status 2>$null
        if ($wslVersion -match "Default Version: 2") {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Function to recommend WSL2 setup
function Show-WSL2Recommendation {
    Write-Host ""
    Write-Host "🔧 RECOMMENDATION: Use WSL2 for Better Performance" -ForegroundColor Yellow
    Write-Host "=================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For optimal performance and to avoid Windows file permission issues," -ForegroundColor White
    Write-Host "we recommend setting up the development environment in WSL2." -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Complete WSL2 setup guide: docs/WSL2-SETUP.md" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Quick WSL2 setup:" -ForegroundColor White
    Write-Host "1. wsl --install -d Ubuntu-22.04" -ForegroundColor Gray
    Write-Host "2. Follow the guide in docs/WSL2-SETUP.md" -ForegroundColor Gray
    Write-Host ""
    
    if ($WSL) {
        Write-Host "🚀 Opening WSL2 setup guide..." -ForegroundColor Green
        if (Test-Path "docs/WSL2-SETUP.md") {
            Start-Process "docs/WSL2-SETUP.md"
        }
        return $true
    }
    
    $response = Read-Host "Continue with Windows Docker setup? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Setup cancelled. Please consider using WSL2 for better performance." -ForegroundColor Yellow
        return $false
    }
    return $true
}

# Function to clean up existing containers and volumes
function Clean-Environment {
    Write-Host "🧹 Cleaning up existing containers and volumes..." -ForegroundColor Yellow
    
    # Stop and remove containers
    docker-compose -f docker-compose.dev.yml down --volumes --remove-orphans 2>$null
    docker-compose down --volumes --remove-orphans 2>$null
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    Write-Host "✅ Environment cleaned successfully" -ForegroundColor Green
}

# Function to build and start services
function Start-Services {
    Write-Host "🚀 Building and starting services..." -ForegroundColor Yellow
    
    # Use the development compose file
    $composeFile = "docker-compose.dev.yml"
    if (-not (Test-Path $composeFile)) {
        $composeFile = "docker-compose.yml"
    }
    
    Write-Host "📄 Using compose file: $composeFile" -ForegroundColor Cyan
    
    # Build images
    docker-compose -f $composeFile build --no-cache
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed. Trying alternative approach..." -ForegroundColor Red
        
        # Try building services individually
        Write-Host "🔄 Building backend..." -ForegroundColor Yellow
        docker-compose -f $composeFile build api
        
        Write-Host "🔄 Building frontend..." -ForegroundColor Yellow
        docker-compose -f $composeFile build frontend
    }
    
    # Start services
    docker-compose -f $composeFile up -d
    
    # Wait for services to be ready
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    # Check service health
    $services = @("loveconnect-postgres", "loveconnect-redis", "loveconnect-supertokens")
    foreach ($service in $services) {
        $health = docker inspect --format='{{.State.Health.Status}}' $service 2>$null
        if ($health -eq "healthy" -or $health -eq "") {
            Write-Host "✅ $service is ready" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $service health: $health" -ForegroundColor Yellow
        }
    }
}

# Function to show logs
function Show-Logs {
    Write-Host "📋 Showing service logs..." -ForegroundColor Yellow
    $composeFile = if (Test-Path "docker-compose.dev.yml") { "docker-compose.dev.yml" } else { "docker-compose.yml" }
    docker-compose -f $composeFile logs -f
}

# Function to run tests
function Run-Tests {
    Write-Host "🧪 Running comprehensive tests..." -ForegroundColor Yellow
    
    # Wait for services to be fully ready
    Start-Sleep -Seconds 10
    
    $composeFile = if (Test-Path "docker-compose.dev.yml") { "docker-compose.dev.yml" } else { "docker-compose.yml" }
    
    # Run database migrations
    Write-Host "📊 Running database migrations..." -ForegroundColor Yellow
    docker-compose -f $composeFile exec api npx prisma migrate deploy
    
    # Run backend tests
    Write-Host "🔧 Running backend tests..." -ForegroundColor Yellow
    docker-compose -f $composeFile exec api npm test
    
    # Run frontend tests
    Write-Host "🎨 Running frontend tests..." -ForegroundColor Yellow
    docker-compose -f $composeFile exec frontend npm test
    
    Write-Host "✅ Tests completed" -ForegroundColor Green
}

# Main execution
if (-not (Test-DockerRunning)) {
    exit 1
}

# Check for WSL2 and show recommendation
if (-not (Test-WSL2Available)) {
    if (-not (Show-WSL2Recommendation)) {
        exit 1
    }
}

if ($Clean) {
    Clean-Environment
}

if ($Build -or (-not $Logs -and -not $Test)) {
    try {
        Start-Services
    }
    catch {
        Write-Host "❌ Docker setup failed. This is likely due to Windows file permission issues." -ForegroundColor Red
        Write-Host ""
        Write-Host "🔧 RECOMMENDED SOLUTION: Use WSL2" -ForegroundColor Yellow
        Write-Host "=================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "WSL2 provides a Linux environment that eliminates Windows file permission issues." -ForegroundColor White
        Write-Host "Complete setup guide: docs/WSL2-SETUP.md" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Quick start:" -ForegroundColor White
        Write-Host "1. wsl --install -d Ubuntu-22.04" -ForegroundColor Gray
        Write-Host "2. Follow docs/WSL2-SETUP.md" -ForegroundColor Gray
        Write-Host "3. Run setup inside WSL2" -ForegroundColor Gray
        exit 1
    }
}

if ($Test) {
    Run-Tests
}

if ($Logs) {
    Show-Logs
} else {
    Write-Host ""
    Write-Host "🎉 LoveConnect Docker environment setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔧 Backend API: http://localhost:8080/graphql" -ForegroundColor Cyan
    Write-Host "🗄️ Database: localhost:5432" -ForegroundColor Cyan
    Write-Host "📧 MailHog: http://localhost:8025" -ForegroundColor Cyan
    Write-Host "📦 MinIO Console: http://localhost:9001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Useful commands:" -ForegroundColor White
    Write-Host "  docker-compose -f docker-compose.dev.yml logs -f" -ForegroundColor Gray
    Write-Host "  docker-compose -f docker-compose.dev.yml down" -ForegroundColor Gray
    Write-Host "  docker-compose -f docker-compose.dev.yml restart frontend" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  If you encounter file permission issues, use WSL2 setup instead." -ForegroundColor Yellow
    Write-Host "📖 WSL2 Guide: docs/WSL2-SETUP.md" -ForegroundColor Cyan
}
