# LoveConnect Docker Setup Script
# This script sets up the complete Docker development environment

param(
    [switch]$Clean,
    [switch]$Build,
    [switch]$Logs,
    [switch]$Test
)

Write-Host "🐳 LoveConnect Docker Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

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

# Function to clean up existing containers and volumes
function Clean-Environment {
    Write-Host "🧹 Cleaning up existing containers and volumes..." -ForegroundColor Yellow
    
    # Stop and remove containers
    docker-compose down --volumes --remove-orphans
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    Write-Host "✅ Environment cleaned successfully" -ForegroundColor Green
}

# Function to build and start services
function Start-Services {
    Write-Host "🚀 Building and starting services..." -ForegroundColor Yellow
    
    # Build images
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
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
    docker-compose logs -f
}

# Function to run tests
function Run-Tests {
    Write-Host "🧪 Running comprehensive tests..." -ForegroundColor Yellow
    
    # Wait for services to be fully ready
    Start-Sleep -Seconds 10
    
    # Run database migrations
    Write-Host "📊 Running database migrations..." -ForegroundColor Yellow
    docker-compose exec api npx prisma migrate deploy
    
    # Run backend tests
    Write-Host "🔧 Running backend tests..." -ForegroundColor Yellow
    docker-compose exec api npm test
    
    # Run frontend tests
    Write-Host "🎨 Running frontend tests..." -ForegroundColor Yellow
    docker-compose exec frontend npm test
    
    Write-Host "✅ Tests completed" -ForegroundColor Green
}

# Main execution
if (-not (Test-DockerRunning)) {
    exit 1
}

if ($Clean) {
    Clean-Environment
}

if ($Build -or -not $Logs -and -not $Test) {
    Start-Services
}

if ($Test) {
    Run-Tests
}

if ($Logs) {
    Show-Logs
} else {
    Write-Host ""
    Write-Host "🎉 LoveConnect Docker environment is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔧 Backend API: http://localhost:8080/graphql" -ForegroundColor Cyan
    Write-Host "🗄️ Database: localhost:5432" -ForegroundColor Cyan
    Write-Host "📧 MailHog: http://localhost:8025" -ForegroundColor Cyan
    Write-Host "📦 MinIO Console: http://localhost:9001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Use 'docker-compose logs -f' to view logs" -ForegroundColor Gray
    Write-Host "Use 'docker-compose down' to stop services" -ForegroundColor Gray
}
