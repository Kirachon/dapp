#!/bin/bash

# Production Health Check Script for LoveConnect Dating App
# This script monitors the health of all production services

set -e  # Exit on any error

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_CHECK_INTERVAL=30
MAX_RETRIES=3

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

# Check service health
check_service_health() {
    local service=$1
    local health_url=$2
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_success "$service is healthy"
            return 0
        else
            ((retries++))
            if [ $retries -lt $MAX_RETRIES ]; then
                log_warning "$service health check failed (attempt $retries/$MAX_RETRIES), retrying..."
                sleep 5
            fi
        fi
    done
    
    log_error "$service is unhealthy after $MAX_RETRIES attempts"
    return 1
}

# Check container status
check_container_status() {
    local service=$1
    
    if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        log_success "$service container is running"
        return 0
    else
        log_error "$service container is not running"
        return 1
    fi
}

# Check database connectivity
check_database() {
    log_info "Checking database connectivity..."
    
    if ! check_container_status "postgres"; then
        return 1
    fi
    
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U app -d dating > /dev/null 2>&1; then
        log_success "Database is accessible"
        
        # Check database size and connections
        local db_size=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U app -d dating -t -c "SELECT pg_size_pretty(pg_database_size('dating'));" | tr -d ' ')
        local connections=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U app -d dating -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='dating';" | tr -d ' ')
        
        log_info "Database size: $db_size"
        log_info "Active connections: $connections"
        
        return 0
    else
        log_error "Database is not accessible"
        return 1
    fi
}

# Check Redis connectivity
check_redis() {
    log_info "Checking Redis connectivity..."
    
    if ! check_container_status "redis"; then
        return 1
    fi
    
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis is accessible"
        
        # Check Redis memory usage
        local memory_usage=$(docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        log_info "Redis memory usage: $memory_usage"
        
        return 0
    else
        log_error "Redis is not accessible"
        return 1
    fi
}

# Check MinIO connectivity
check_minio() {
    log_info "Checking MinIO connectivity..."
    
    if ! check_container_status "minio"; then
        return 1
    fi
    
    if check_service_health "MinIO" "http://localhost:9000/minio/health/live"; then
        return 0
    else
        return 1
    fi
}

# Check API health
check_api() {
    log_info "Checking API health..."
    
    if ! check_container_status "api"; then
        return 1
    fi
    
    if check_service_health "API" "http://localhost:8080/health"; then
        # Check API response time
        local response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8080/health)
        log_info "API response time: ${response_time}s"
        
        return 0
    else
        return 1
    fi
}

# Check Frontend health
check_frontend() {
    log_info "Checking Frontend health..."
    
    if ! check_container_status "frontend"; then
        return 1
    fi
    
    # Check if frontend is responding (may not have a health endpoint)
    if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "Frontend is accessible"
        return 0
    else
        log_error "Frontend is not accessible"
        return 1
    fi
}

# Check SuperTokens health
check_supertokens() {
    log_info "Checking SuperTokens health..."
    
    if ! check_container_status "supertokens"; then
        return 1
    fi
    
    if check_service_health "SuperTokens" "http://localhost:3567/hello"; then
        return 0
    else
        return 1
    fi
}

# Check Nginx health
check_nginx() {
    log_info "Checking Nginx health..."
    
    if ! check_container_status "nginx"; then
        return 1
    fi
    
    if check_service_health "Nginx" "http://localhost/health"; then
        return 0
    else
        return 1
    fi
}

# Check system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    # Check disk usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        log_warning "Disk usage is high: ${disk_usage}%"
    else
        log_success "Disk usage is normal: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$memory_usage" -gt 80 ]; then
        log_warning "Memory usage is high: ${memory_usage}%"
    else
        log_success "Memory usage is normal: ${memory_usage}%"
    fi
    
    # Check Docker daemon
    if docker info > /dev/null 2>&1; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        return 1
    fi
}

# Generate health report
generate_health_report() {
    local timestamp=$(date)
    local report_file="./health-reports/health-report-$(date +%Y%m%d_%H%M%S).txt"
    
    mkdir -p "./health-reports"
    
    cat > "$report_file" << EOF
LoveConnect Production Health Report
===================================
Generated: $timestamp

Container Status:
================
EOF
    
    docker-compose -f "$COMPOSE_FILE" ps >> "$report_file"
    
    cat >> "$report_file" << EOF

System Resources:
================
Disk Usage: $(df -h /)
Memory Usage: $(free -h)

Docker Info:
===========
$(docker system df)

Service Logs (Last 50 lines):
=============================
EOF
    
    # Add recent logs for each service
    for service in api frontend postgres redis minio supertokens nginx; do
        echo "--- $service ---" >> "$report_file"
        docker-compose -f "$COMPOSE_FILE" logs --tail=10 "$service" >> "$report_file" 2>&1
        echo "" >> "$report_file"
    done
    
    log_info "Health report generated: $report_file"
}

# Main health check process
main() {
    echo "🏥 LoveConnect Production Health Check"
    echo "======================================"
    echo "Timestamp: $(date)"
    echo
    
    local failed_checks=0
    
    # Check all services
    check_database || ((failed_checks++))
    echo
    
    check_redis || ((failed_checks++))
    echo
    
    check_minio || ((failed_checks++))
    echo
    
    check_supertokens || ((failed_checks++))
    echo
    
    check_api || ((failed_checks++))
    echo
    
    check_frontend || ((failed_checks++))
    echo
    
    check_nginx || ((failed_checks++))
    echo
    
    check_system_resources || ((failed_checks++))
    echo
    
    # Generate report
    generate_health_report
    
    # Summary
    if [ $failed_checks -eq 0 ]; then
        log_success "🎉 All health checks passed!"
        exit 0
    else
        log_error "❌ $failed_checks health check(s) failed"
        exit 1
    fi
}

# Continuous monitoring mode
monitor() {
    log_info "Starting continuous health monitoring (interval: ${HEALTH_CHECK_INTERVAL}s)"
    log_info "Press Ctrl+C to stop monitoring"
    
    while true; do
        main
        echo
        log_info "Waiting ${HEALTH_CHECK_INTERVAL}s for next check..."
        sleep $HEALTH_CHECK_INTERVAL
        echo "========================================"
    done
}

# Handle command line arguments
case "${1:-}" in
    "monitor")
        monitor
        ;;
    *)
        main
        ;;
esac
