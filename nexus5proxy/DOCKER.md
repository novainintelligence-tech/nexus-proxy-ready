# Docker Setup Guide for Nexus5Proxy

## 📋 Overview

This guide covers Docker setup for the Nexus5Proxy project, a TypeScript-based pnpm workspace with an Express API server, PostgreSQL database, and various microservices.

**Project Stack:**
- **Runtime:** Node.js 24 with TypeScript
- **Package Manager:** pnpm
- **Main Service:** Express API Server
- **Database:** PostgreSQL 16
- **Architecture:** Multi-stage Docker builds, pnpm workspace

---

## 🚀 Quick Start

### Prerequisites
- Docker (20.10+)
- Docker Compose (2.0+)

### Development Environment

```bash
# 1. Clone the repository
git clone https://github.com/novainintelligence-tech/Nexus5Proxy.git
cd Nexus5Proxy

# 2. Copy environment template
cp .env.example .env

# 3. Start development services with hot-reload
docker compose up --build

# 4. API Server will be available at http://localhost:8080
```

### Production Environment

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with production values (see Configuration section)

# 2. Start production services
docker compose -f docker-compose.prod.yml up -d

# 3. Verify services are running
docker compose -f docker-compose.prod.yml ps

# 4. Check logs
docker compose -f docker-compose.prod.yml logs -f api-server
```

---

## 📦 Docker Files Included

### 1. **Dockerfile** (Production)
Multi-stage build for optimized production images:
- **Stage 1:** Build - Compiles TypeScript, runs tests
- **Stage 2:** Runtime - Only production dependencies, smaller image
- **Base Image:** Node.js 24 Alpine (~200MB)
- **Features:** Health checks, source maps, security hardening

### 2. **Dockerfile.dev** (Development)
Development-focused with features for rapid iteration:
- Full development dependencies
- Volume mounts for live code changes
- Environment variables pre-configured
- Optimized for hot-reload

### 3. **docker-compose.yml** (Development)
Single API server with volume mounts for local development:
```yaml
Services:
  - api-server (with hot-reload volumes)
```

### 4. **docker-compose.prod.yml** (Production)
Complete production stack:
```yaml
Services:
  - postgres (PostgreSQL 16)
  - api-server (production build)
Features:
  - Health checks
  - Restart policies
  - JSON logging with rotation
  - Database persistence volumes
```

### 5. **.dockerignore**
Optimizes build context - excludes:
- node_modules, build artifacts
- Version control (.git, .github)
- Development tools (.vscode, .idea)
- Test and coverage files
- CI/CD configuration

### 6. **.env.example**
Template for environment variables with documentation

---

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Key Variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | production | Runtime environment |
| `PORT` | 8080 | API server port |
| `LOG_LEVEL` | info | Logging verbosity |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | changeme_secure_password_here | Database password |
| `DB_NAME` | nexus5proxy | Database name |
| `CLERK_SECRET_KEY` | - | Clerk authentication |
| `DATABASE_URL` | auto-generated | Full connection string |

### Custom Configuration

**For database:**
```bash
export DB_USER=myuser
export DB_PASSWORD=mypassword
export DB_NAME=mydb
```

**For logging:**
```bash
export LOG_LEVEL=debug      # Development
export LOG_LEVEL=info       # Production
```

---

## 🔧 Development Workflow

### Build Images

**Development image:**
```bash
docker build -f Dockerfile.dev -t nexus5proxy:dev .
```

**Production image:**
```bash
docker build -f Dockerfile -t nexus5proxy:latest .
```

### Run Services

**Start development:**
```bash
docker compose up
```

**Start production:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api-server

# Last 100 lines
docker compose logs --tail 100
```

### Database Management

**Connect to PostgreSQL:**
```bash
docker compose exec postgres psql -U postgres -d nexus5proxy
```

**Run database migrations (if applicable):**
```bash
docker compose exec api-server pnpm run migrate
```

**Seed database:**
```bash
docker compose exec api-server pnpm run seed
```

**Backup database:**
```bash
docker compose exec postgres pg_dump -U postgres nexus5proxy > backup.sql
```

**Restore database:**
```bash
docker compose exec -T postgres psql -U postgres nexus5proxy < backup.sql
```

---

## 🐛 Troubleshooting

### Container won't start

**Check logs:**
```bash
docker compose logs api-server
```

**Common issues:**
- Missing environment variables → Check `.env` file
- Port already in use → Change `PORT` in `.env`
- Database connection failed → Ensure postgres is running: `docker compose ps`

### Build fails

**Clear cache and rebuild:**
```bash
docker compose build --no-cache
```

**Check Docker disk space:**
```bash
docker system df
docker system prune -a
```

### Database connection errors

**Verify database is ready:**
```bash
docker compose exec postgres pg_isready -U postgres
```

**Check DATABASE_URL format:**
```
postgresql://user:password@postgres:5432/database
```

### Hot-reload not working (Development)

**Ensure volume mounts are correct:**
```bash
docker inspect <container-id> | grep -A 20 Mounts
```

**Verify file watch is enabled:**
```bash
docker compose logs api-server | grep -i watch
```

**Restart service:**
```bash
docker compose restart api-server
```

### Performance issues

**Monitor resource usage:**
```bash
docker stats
```

**Increase limits in docker-compose:**
```yaml
services:
  api-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

---

## 🔒 Security Best Practices

### Secrets Management

**Never commit .env files:**
```bash
echo ".env" >> .gitignore
echo ".env.*.local" >> .gitignore
```

**Use strong passwords:**
```bash
# Generate secure password
openssl rand -base64 32
```

### Image Security

**Regular updates:**
```bash
docker pull node:24-alpine
docker pull postgres:16-alpine
docker compose build --no-cache
```

**Scan for vulnerabilities:**
```bash
docker scan nexus5proxy:latest
```

### Network Security

**Isolate containers:**
- Containers only communicate via named network
- Database not exposed to host by default
- Use firewall rules for production

**Production deployment:**
```bash
# Don't expose database port
# Use environment variable for DATABASE_URL
# Set restrictive CORS_ALLOWED_ORIGINS
```

---

## 📊 Monitoring

### Health Checks

Built-in health checks monitor service status:

```bash
# Check health
docker compose exec api-server curl -s http://localhost:8080/health

# View health check status
docker compose ps
```

### Logging

**View application logs:**
```bash
docker compose logs -f api-server
```

**Filter logs:**
```bash
# Last 50 lines, follow output
docker compose logs --tail 50 -f

# Specific time range
docker compose logs --since 2024-01-01T00:00:00 --until 2024-01-02T00:00:00
```

### Container Statistics

```bash
# Real-time resource usage
docker stats

# Inspect container
docker inspect nexus5proxy-api-dev
```

---

## 🚢 Production Deployment

### Pre-deployment Checklist

- [ ] All environment variables configured in `.env`
- [ ] Database migrations run: `docker compose exec api-server pnpm run migrate`
- [ ] Health checks passing: `docker compose ps`
- [ ] Logs clean of errors: `docker compose logs`
- [ ] Security scan passed: `docker scan`

### Deploy Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Update environment
cp .env.example .env.prod
# Edit .env.prod with production values

# 3. Build and start
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f

# 5. Run migrations (if needed)
docker compose -f docker-compose.prod.yml exec api-server pnpm run migrate
```

### Scaling Services

**Horizontal scaling with docker-compose:**
```bash
# Scale API server to 3 instances (requires load balancer)
docker compose -f docker-compose.prod.yml up -d --scale api-server=3
```

### Backup & Recovery

**Automated backups:**
```bash
# Backup script (backup.sh)
#!/bin/bash
docker compose exec -T postgres pg_dump -U postgres nexus5proxy | \
  gzip > backups/nexus5proxy-$(date +%Y%m%d-%H%M%S).sql.gz
```

**Schedule with cron:**
```bash
0 2 * * * /path/to/backup.sh
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Official Image](https://hub.docker.com/_/node)
- [PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres)
- [pnpm Documentation](https://pnpm.io/)

---

## 🤝 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Docker logs: `docker compose logs`
3. Check environment variables: `cat .env | grep -v '^#'`
4. Open an issue on GitHub

---

## 📝 License

MIT License - See LICENSE file for details
