# Docker Quick Reference for Nexus5Proxy

## 🚀 Common Commands

### Development
```bash
# Start with hot-reload
docker compose up

# Build and start
docker compose up --build

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Remove everything (careful!)
docker compose down -v
```

### Production
```bash
# Start production services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f api-server

# Stop services
docker compose -f docker-compose.prod.yml down

# Full restart
docker compose -f docker-compose.prod.yml restart
```

### Database
```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d nexus5proxy

# Backup database
docker compose exec -T postgres pg_dump -U postgres nexus5proxy > backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres nexus5proxy < backup.sql

# Run migrations
docker compose exec api-server pnpm run migrate

# Seed database
docker compose exec api-server pnpm run seed
```

### Docker Image Management
```bash
# Build images
docker compose build

# List images
docker images | grep nexus5proxy

# Remove images
docker rmi nexus5proxy:latest

# Inspect image
docker inspect nexus5proxy:latest
```

### Troubleshooting
```bash
# Check running containers
docker compose ps

# Restart a service
docker compose restart api-server

# View detailed logs
docker compose logs --tail 100 api-server

# Execute command in container
docker compose exec api-server sh

# Check resource usage
docker stats

# Clean up
docker system prune -a
```

## 📋 Environment Setup

```bash
# Copy template
cp .env.example .env

# Edit values
nano .env  # or use your preferred editor

# Verify configuration
cat .env | grep -v '^#'
```

## 🔍 Health Checks

```bash
# Check service health
docker compose ps

# Manual health check
curl http://localhost:8080/health

# Container logs
docker compose logs api-server
```

For detailed documentation, see **DOCKER.md**
