# Docker Fundamentals

## Dockerfile Best Practices

### Multi-Stage Build (Rust example)
```dockerfile
# Stage 1: Build
FROM rust:1.77-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
# Cache dependencies
RUN mkdir src && echo "fn main(){}" > src/main.rs
RUN cargo build --release && rm -rf src
# Build actual app
COPY src/ src/
RUN touch src/main.rs && cargo build --release

# Stage 2: Runtime (minimal image)
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd -r -s /bin/false appuser
COPY --from=builder /app/target/release/myapp /usr/local/bin/
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1
CMD ["myapp"]
```

### Multi-Stage Build (Node.js example)
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
USER nextjs
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
```

## Layer Caching Strategy
```dockerfile
# Order from least to most frequently changed:
# 1. Base image
FROM node:20-alpine
# 2. System dependencies
RUN apk add --no-cache curl
# 3. Application dependencies (changes less often)
COPY package.json package-lock.json ./
RUN npm ci
# 4. Application code (changes most often)
COPY . .
RUN npm run build
```

## .dockerignore
```
node_modules
.git
.env
*.md
.DS_Store
.next
dist
target
Dockerfile
docker-compose*.yml
.github
```

## Security Checklist

- [ ] Use specific image tags (not `:latest`)
- [ ] Run as non-root user (`USER appuser`)
- [ ] Use multi-stage builds (no build tools in runtime)
- [ ] Scan images (`docker scout cves myimage`)
- [ ] No secrets in Dockerfile (use build secrets or env vars)
- [ ] Set read-only filesystem where possible
- [ ] Use distroless or alpine base images
- [ ] Health checks defined

## Useful Commands
```bash
# Build with build args
docker build --build-arg VERSION=1.0 -t myapp:1.0 .

# Build with cache mount (faster rebuilds)
docker build --mount=type=cache,target=/root/.cargo/registry -t myapp .

# Inspect image layers
docker history myapp --no-trunc

# Image size comparison
docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}"

# Remove dangling images
docker image prune -f

# Export/import
docker save myapp:latest | gzip > myapp.tar.gz
docker load < myapp.tar.gz
```
