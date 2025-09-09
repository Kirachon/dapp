# LoveConnect Production Deployment Guide

This guide covers the complete production deployment process for the LoveConnect dating application.

## 🚀 Quick Start

1. **Copy environment configuration:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Configure production environment:**
   Edit `.env.production` with your production values (see [Environment Configuration](#environment-configuration))

3. **Deploy to production:**
   ```bash
   ./scripts/deploy-production.sh
   ```

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM
- At least 20GB disk space
- SSL certificates (for HTTPS)

## 🔧 Environment Configuration

### Required Environment Variables

Copy `.env.production.example` to `.env.production` and update these critical values:

```bash
# Database Security
POSTGRES_PASSWORD=your_strong_database_password_here

# MinIO Security
MINIO_ROOT_PASSWORD=your_strong_minio_password_here

# SuperTokens Security
SUPERTOKENS_API_KEY=your_supertokens_api_key_here

# Application Security
JWT_SECRET=your_very_long_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key

# Domain Configuration
DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com
FRONTEND_DOMAIN=app.yourdomain.com

# Email Configuration (Production SMTP)
SMTP_HOST=smtp.your-email-provider.com
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your_email_password
```

### SSL Certificate Setup

1. **Place SSL certificates in the `nginx/ssl/` directory:**
   ```bash
   mkdir -p nginx/ssl
   cp your-certificate.pem nginx/ssl/cert.pem
   cp your-private-key.pem nginx/ssl/key.pem
   ```

2. **Update Nginx configuration:**
   Edit `nginx/nginx.prod.conf` and update the `server_name` directives with your actual domain.

## 🏗️ Architecture Overview

### Services

- **Frontend (Next.js)**: Port 3000
- **Backend API (Fastify + GraphQL)**: Port 8080
- **PostgreSQL Database**: Port 5432
- **Redis Cache**: Port 6379
- **MinIO Object Storage**: Ports 9000, 9001
- **SuperTokens Auth**: Port 3567
- **Nginx Reverse Proxy**: Ports 80, 443

### Data Persistence

- **Database**: `pgdata_prod` volume
- **Redis**: `redis_data_prod` volume
- **MinIO**: `minio_data_prod` volume

## 🚀 Deployment Process

### Automated Deployment

Use the provided deployment script:

```bash
./scripts/deploy-production.sh
```

This script will:
1. Check prerequisites
2. Create backup of existing data
3. Build production images
4. Deploy services with zero-downtime
5. Run health checks
6. Clean up old images

### Manual Deployment

If you prefer manual control:

```bash
# 1. Build images
docker build -f Dockerfile.prod -t loveconnect-api:latest .
docker build -f frontend/Dockerfile.prod -t loveconnect-frontend:latest ./frontend

# 2. Start infrastructure
docker-compose -f docker-compose.prod.yml up -d postgres redis minio supertokens

# 3. Wait for database and run migrations
docker-compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

# 4. Start application services
docker-compose -f docker-compose.prod.yml up -d api frontend nginx
```

## 🔍 Monitoring & Health Checks

### Health Check Script

Run comprehensive health checks:

```bash
./scripts/health-check.sh
```

For continuous monitoring:

```bash
./scripts/health-check.sh monitor
```

### Service URLs

- **Application**: https://yourdomain.com
- **API Health**: http://localhost:8080/health
- **MinIO Console**: http://localhost:9001
- **Database**: localhost:5432

### Container Logs

View logs for all services:

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

View logs for specific service:

```bash
docker-compose -f docker-compose.prod.yml logs -f api
```

## 💾 Backup & Recovery

### Automated Backups

Run the backup script:

```bash
./scripts/backup-production.sh
```

This creates backups of:
- PostgreSQL database
- MinIO object storage
- Redis data
- Application logs

### Backup Schedule

Set up automated backups with cron:

```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/your/app/scripts/backup-production.sh
```

### Recovery Process

1. **Stop services:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restore database:**
   ```bash
   gunzip -c backup/database.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U app -d dating
   ```

3. **Restore MinIO data:**
   ```bash
   docker-compose -f docker-compose.prod.yml exec -T minio tar xzf - -C / < backup/minio-data.tar.gz
   ```

4. **Restart services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🔒 Security Considerations

### Network Security

- All services run in isolated Docker network
- Only necessary ports exposed to host
- Nginx handles SSL termination
- Rate limiting configured

### Data Security

- Database passwords are configurable
- JWT secrets are environment-specific
- File uploads are validated and scanned
- User data is encrypted at rest

### Access Control

- SuperTokens handles authentication
- Role-based access control (RBAC)
- Admin panel with proper authorization
- API rate limiting

## 📊 Performance Optimization

### Database

- Comprehensive indexing strategy
- Connection pooling
- Query optimization
- Regular VACUUM and ANALYZE

### Caching

- Redis for session storage
- Application-level caching
- CDN for static assets
- Browser caching headers

### Resource Limits

Services have configured resource limits:
- API: 1GB RAM, 0.5 CPU
- Frontend: 512MB RAM, 0.25 CPU
- Database: 2GB RAM, 1.0 CPU

## 🔧 Troubleshooting

### Common Issues

1. **Database connection failed:**
   - Check if PostgreSQL container is running
   - Verify DATABASE_URL in environment
   - Check network connectivity

2. **SSL certificate errors:**
   - Verify certificate files exist in `nginx/ssl/`
   - Check certificate validity
   - Ensure domain names match

3. **High memory usage:**
   - Check container resource usage: `docker stats`
   - Review application logs for memory leaks
   - Consider scaling horizontally

### Debug Commands

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats

# Check disk usage
docker system df

# View container logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Execute commands in containers
docker-compose -f docker-compose.prod.yml exec api bash
```

## 🔄 Updates & Maintenance

### Application Updates

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Deploy updates:**
   ```bash
   ./scripts/deploy-production.sh
   ```

### Database Migrations

```bash
docker-compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

### Security Updates

Regularly update base images:

```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 📞 Support

For production issues:

1. Check health status: `./scripts/health-check.sh`
2. Review logs: `docker-compose -f docker-compose.prod.yml logs`
3. Create backup before making changes
4. Test changes in staging environment first

## 📝 Changelog

Track production deployments and changes in your deployment log.
