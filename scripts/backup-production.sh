#!/bin/bash

# Production Backup Script for LoveConnect Dating App
# This script creates automated backups of the production database and files

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_BASE_DIR="./backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$DATE"

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

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
}

# Backup database
backup_database() {
    log_info "Backing up PostgreSQL database..."
    
    if ! docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        return 1
    fi
    
    # Create database dump
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
        -U app \
        -d dating \
        --verbose \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists > "$BACKUP_DIR/database.sql"
    
    # Compress the dump
    gzip "$BACKUP_DIR/database.sql"
    
    log_success "Database backup completed: $BACKUP_DIR/database.sql.gz"
}

# Backup MinIO data
backup_minio() {
    log_info "Backing up MinIO object storage..."
    
    if ! docker-compose -f "$COMPOSE_FILE" ps minio | grep -q "Up"; then
        log_error "MinIO container is not running"
        return 1
    fi
    
    # Create MinIO data backup
    docker-compose -f "$COMPOSE_FILE" exec -T minio \
        tar czf - /data > "$BACKUP_DIR/minio-data.tar.gz"
    
    log_success "MinIO backup completed: $BACKUP_DIR/minio-data.tar.gz"
}

# Backup Redis data
backup_redis() {
    log_info "Backing up Redis data..."
    
    if ! docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "Up"; then
        log_error "Redis container is not running"
        return 1
    fi
    
    # Create Redis backup
    docker-compose -f "$COMPOSE_FILE" exec -T redis \
        redis-cli --rdb - > "$BACKUP_DIR/redis-dump.rdb"
    
    # Compress the dump
    gzip "$BACKUP_DIR/redis-dump.rdb"
    
    log_success "Redis backup completed: $BACKUP_DIR/redis-dump.rdb.gz"
}

# Backup application logs
backup_logs() {
    log_info "Backing up application logs..."
    
    # Create logs directory
    mkdir -p "$BACKUP_DIR/logs"
    
    # Backup container logs
    for service in api frontend postgres redis minio supertokens nginx; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            log_info "Backing up $service logs..."
            docker-compose -f "$COMPOSE_FILE" logs --no-color "$service" > "$BACKUP_DIR/logs/$service.log" 2>&1
        fi
    done
    
    # Compress logs
    tar czf "$BACKUP_DIR/logs.tar.gz" -C "$BACKUP_DIR" logs
    rm -rf "$BACKUP_DIR/logs"
    
    log_success "Logs backup completed: $BACKUP_DIR/logs.tar.gz"
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."
    
    cat > "$BACKUP_DIR/manifest.txt" << EOF
LoveConnect Production Backup
============================
Date: $(date)
Backup Directory: $BACKUP_DIR

Files:
EOF
    
    # List all files with sizes
    find "$BACKUP_DIR" -type f -exec ls -lh {} \; | awk '{print $9 " (" $5 ")"}' >> "$BACKUP_DIR/manifest.txt"
    
    # Add system information
    cat >> "$BACKUP_DIR/manifest.txt" << EOF

System Information:
==================
Docker Version: $(docker --version)
Docker Compose Version: $(docker-compose --version)
Host: $(hostname)
Disk Usage: $(df -h /)

Container Status:
================
EOF
    
    docker-compose -f "$COMPOSE_FILE" ps >> "$BACKUP_DIR/manifest.txt"
    
    log_success "Backup manifest created: $BACKUP_DIR/manifest.txt"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    if [ -d "$BACKUP_BASE_DIR" ]; then
        find "$BACKUP_BASE_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
        
        # Count remaining backups
        backup_count=$(find "$BACKUP_BASE_DIR" -type d -name "20*" | wc -l)
        log_success "Cleanup completed. $backup_count backups remaining."
    fi
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    # Check if all expected files exist
    local files=("database.sql.gz" "minio-data.tar.gz" "redis-dump.rdb.gz" "logs.tar.gz" "manifest.txt")
    local missing_files=()
    
    for file in "${files[@]}"; do
        if [ ! -f "$BACKUP_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        log_success "Backup verification passed - all files present"
    else
        log_warning "Some backup files are missing: ${missing_files[*]}"
    fi
    
    # Calculate total backup size
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    log_info "Total backup size: $total_size"
}

# Send notification (placeholder for email/Slack integration)
send_notification() {
    local status=$1
    local message=$2
    
    log_info "Notification: $status - $message"
    
    # TODO: Implement email/Slack notifications
    # Example:
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"Backup '"$status"': '"$message"'"}' \
    #   YOUR_SLACK_WEBHOOK_URL
}

# Main backup process
main() {
    echo "🗄️  LoveConnect Production Backup"
    echo "=================================="
    
    local start_time=$(date +%s)
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        send_notification "FAILED" "Docker is not running"
        exit 1
    fi
    
    # Check if production services are running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_error "No production services are running"
        send_notification "FAILED" "No production services are running"
        exit 1
    fi
    
    create_backup_dir
    
    # Perform backups
    local backup_errors=0
    
    backup_database || ((backup_errors++))
    backup_minio || ((backup_errors++))
    backup_redis || ((backup_errors++))
    backup_logs || ((backup_errors++))
    
    create_manifest
    verify_backup
    cleanup_old_backups
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $backup_errors -eq 0 ]; then
        log_success "🎉 Backup completed successfully in ${duration}s"
        log_info "Backup location: $BACKUP_DIR"
        send_notification "SUCCESS" "Backup completed in ${duration}s"
    else
        log_warning "⚠️  Backup completed with $backup_errors errors in ${duration}s"
        send_notification "WARNING" "Backup completed with $backup_errors errors"
    fi
}

# Handle script interruption
trap 'log_error "Backup interrupted"; send_notification "FAILED" "Backup was interrupted"; exit 1' INT TERM

# Run main function
main "$@"
