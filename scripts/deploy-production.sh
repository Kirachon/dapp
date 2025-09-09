#!/bin/bash

# Production Deployment Script for LoveConnect Dating App
# This script handles the complete production deployment process

set -e  # Exit on any error

echo "🚀 Starting LoveConnect Production Deployment..."

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose is not installed. Please install docker-compose first."
        exit 1
    fi
    
    # Check if production environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Production environment file ($ENV_FILE) not found."
        log_info "Please copy .env.production.example to $ENV_FILE and configure it."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if it exists
    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U app dating > "$BACKUP_DIR/database.sql"
        log_success "Database backup created"
    fi
    
    # Backup MinIO data if it exists
    if docker-compose -f "$COMPOSE_FILE" ps minio | grep -q "Up"; then
        log_info "Backing up MinIO data..."
        docker-compose -f "$COMPOSE_FILE" exec -T minio tar czf - /data > "$BACKUP_DIR/minio-data.tar.gz"
        log_success "MinIO backup created"
    fi
    
    log_success "Backup completed: $BACKUP_DIR"
}

# Build images
build_images() {
    log_info "Building production images..."
    
    # Build backend
    log_info "Building backend image..."
    docker build -f Dockerfile.prod -t loveconnect-api:latest .
    
    # Build frontend
    log_info "Building frontend image..."
    docker build -f frontend/Dockerfile.prod -t loveconnect-frontend:latest ./frontend
    
    log_success "Images built successfully"
}

# Deploy services
deploy_services() {
    log_info "Deploying services..."
    
    # Stop existing services
    log_info "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Start infrastructure services first
    log_info "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis minio supertokens
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    timeout 60 bash -c 'until docker-compose -f '"$COMPOSE_FILE"' exec postgres pg_isready -U app -d dating; do sleep 2; done'
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy
    
    # Start application services
    log_info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d api frontend nginx
    
    log_success "Services deployed successfully"
}

# Health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check API health
    if curl -f http://localhost:8080/health &> /dev/null; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed (this might be normal if health endpoint is not implemented)"
    fi
    
    # Check database connection
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U app -d dating &> /dev/null; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        return 1
    fi
    
    log_success "Health checks completed"
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old images..."
    docker image prune -f
    log_success "Cleanup completed"
}

# Main deployment process
main() {
    echo "🚀 LoveConnect Production Deployment"
    echo "======================================"
    
    check_prerequisites
    
    # Ask for confirmation
    read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
    
    # Create backup if services are running
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        create_backup
    fi
    
    build_images
    deploy_services
    run_health_checks
    cleanup
    
    echo
    log_success "🎉 Production deployment completed successfully!"
    echo
    log_info "Services are now running:"
    log_info "  • Frontend: http://localhost:3000"
    log_info "  • API: http://localhost:8080"
    log_info "  • MinIO Console: http://localhost:9001"
    echo
    log_info "To view logs: docker-compose -f $COMPOSE_FILE logs -f"
    log_info "To stop services: docker-compose -f $COMPOSE_FILE down"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
