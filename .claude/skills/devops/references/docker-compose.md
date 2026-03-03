# Docker Compose

## Basic Structure
```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./src:/app/src  # Dev hot-reload
    restart: unless-stopped
    networks:
      - backend

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - backend

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    networks:
      - backend

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db
    networks:
      - backend

volumes:
  postgres_data:
  redis_data:
  mongo_data:

networks:
  backend:
    driver: bridge
```

## Profiles (optional services)
```yaml
services:
  app:
    # ... always runs

  monitoring:
    image: grafana/grafana
    profiles: ["monitoring"]
    ports:
      - "3001:3000"

  pgadmin:
    image: dpage/pgadmin4
    profiles: ["dev-tools"]
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
```
```bash
docker compose up                        # Only app + deps
docker compose --profile monitoring up   # Include monitoring
docker compose --profile dev-tools up    # Include dev tools
```

## Multi-Environment
```yaml
# docker-compose.override.yml (dev, auto-loaded)
services:
  app:
    build:
      target: development
    volumes:
      - ./src:/app/src
    environment:
      - NODE_ENV=development

# docker-compose.prod.yml
services:
  app:
    build:
      target: production
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "1"
          memory: 512M
```
```bash
# Dev (auto loads override)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Essential Commands
```bash
docker compose up -d                  # Start detached
docker compose down                   # Stop and remove
docker compose down -v                # + remove volumes
docker compose logs -f app            # Follow logs
docker compose exec app sh            # Shell into container
docker compose restart app            # Restart one service
docker compose ps                     # Status
docker compose build --no-cache       # Rebuild without cache
docker compose pull                   # Pull latest images
docker compose config                 # Validate and show merged config
```
