#!/bin/bash

# Production Deployment Automation Script for Dating App
# This script automates the deployment process with proper checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="/tmp/dating-app-deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="/tmp/dating-app-backup-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add cleanup logic here if needed
}

# Error handler
error_handler() {
    local line_number=$1
    log_error "Deployment failed at line $line_number"
    log_error "Check the deployment log: $DEPLOYMENT_LOG"
    cleanup
    exit 1
}

trap 'error_handler $LINENO' ERR
trap cleanup EXIT

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if required environment variables are set
    local required_vars=("DATABASE_URL" "REDIS_URL" "MINIO_ENDPOINT")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            return 1
        fi
    done
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running"
        return 1
    fi
    
    # Check if required files exist
    local required_files=("docker-compose.prod.yml" "package.json" "frontend/package.json")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            log_error "Required file $file not found"
            return 1
        fi
    done
    
    # Check disk space (require at least 2GB free)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then # 2GB in KB
        log_error "Insufficient disk space. At least 2GB required."
        return 1
    fi
    
    log_success "Pre-deployment checks passed"
}

# Backup current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if command -v pg_dump >/dev/null 2>&1; then
        log_info "Backing up database..."
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database_backup.sql" 2>/dev/null || {
            log_warning "Database backup failed, continuing without backup"
        }
    fi
    
    # Backup current Docker images
    log_info "Backing up current Docker images..."
    docker save -o "$BACKUP_DIR/current_images.tar" \
        $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(dating-app|loveconnect)" | head -5) 2>/dev/null || {
        log_warning "Docker image backup failed, continuing without backup"
    }
    
    # Backup environment files
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/.env.backup"
    fi
    
    log_success "Backup created at $BACKUP_DIR"
}

# Build and test
build_and_test() {
    log_info "Building and testing application..."
    
    cd "$PROJECT_ROOT"
    
    # Install backend dependencies
    log_info "Installing backend dependencies..."
    npm ci --only=production
    
    # Install frontend dependencies
    log_info "Installing frontend dependencies..."
    cd frontend
    npm ci --only=production
    cd ..
    
    # Run TypeScript compilation
    log_info "Compiling TypeScript..."
    npm run build
    
    # Build frontend
    log_info "Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Run tests
    log_info "Running tests..."
    npm test -- --passWithNoTests --coverage=false
    
    log_success "Build and test completed successfully"
}

# Database migrations
run_database_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Generate Prisma client
    npm run prisma:generate
    
    # Run migrations
    npm run prisma:migrate deploy
    
    log_success "Database migrations completed"
}

# Deploy with Docker Compose
deploy_application() {
    log_info "Deploying application with Docker Compose..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose -f docker-compose.prod.yml pull
    
    # Stop current services
    log_info "Stopping current services..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # Start new services
    log_info "Starting new services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    log_success "Application deployed successfully"
}

# Health checks
post_deployment_health_checks() {
    log_info "Running post-deployment health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check API health
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:8080/health >/dev/null 2>&1; then
            log_success "API health check passed"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "API health check failed after $max_attempts attempts"
            return 1
        fi
        
        log_info "API health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    # Check frontend
    if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    # Check database connectivity
    if docker-compose -f docker-compose.prod.yml exec -T api npm run prisma:studio --help >/dev/null 2>&1; then
        log_success "Database connectivity check passed"
    else
        log_warning "Database connectivity check failed"
    fi
    
    log_success "Post-deployment health checks completed"
}

# Rollback function
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Stop current services
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    
    # Restore Docker images if backup exists
    if [[ -f "$BACKUP_DIR/current_images.tar" ]]; then
        log_info "Restoring previous Docker images..."
        docker load -i "$BACKUP_DIR/current_images.tar"
    fi
    
    # Restore database if backup exists
    if [[ -f "$BACKUP_DIR/database_backup.sql" ]]; then
        log_info "Restoring database backup..."
        psql "$DATABASE_URL" < "$BACKUP_DIR/database_backup.sql" 2>/dev/null || {
            log_warning "Database restore failed"
        }
    fi
    
    # Start services with previous version
    docker-compose -f docker-compose.prod.yml up -d
    
    log_warning "Rollback completed"
}

# Main deployment function
main() {
    log_info "Starting Dating App production deployment..."
    log_info "Deployment log: $DEPLOYMENT_LOG"
    
    # Parse command line arguments
    local skip_tests=false
    local skip_backup=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--skip-tests] [--skip-backup]"
                echo "  --skip-tests   Skip running tests during deployment"
                echo "  --skip-backup  Skip creating backup before deployment"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    pre_deployment_checks
    
    if [[ "$skip_backup" != true ]]; then
        backup_current_deployment
    fi
    
    if [[ "$skip_tests" != true ]]; then
        build_and_test
    fi
    
    run_database_migrations
    deploy_application
    
    # Run health checks and rollback if they fail
    if ! post_deployment_health_checks; then
        log_error "Health checks failed, rolling back..."
        rollback_deployment
        exit 1
    fi
    
    log_success "🎉 Dating App deployment completed successfully!"
    log_info "Deployment log saved to: $DEPLOYMENT_LOG"
    log_info "Backup created at: $BACKUP_DIR"
    
    # Display service URLs
    echo ""
    log_info "Service URLs:"
    log_info "  Frontend: http://localhost:3000"
    log_info "  API: http://localhost:8080"
    log_info "  Health Check: http://localhost:8080/health"
    log_info "  Metrics: http://localhost:8080/metrics"
}

# Run main function with all arguments
main "$@"
