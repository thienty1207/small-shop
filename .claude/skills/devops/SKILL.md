---
name: devops
description: Production-grade DevOps — Docker (multi-stage builds, Compose, optimization), Kubernetes (kubectl, Helm, security, GitOps), Cloudflare (Workers, R2, D1, Pages), GCP (Cloud Run, GKE, Cloud SQL), CI/CD pipelines, Terraform/IaC, monitoring, multi-region deployment. Use for containerization, orchestration, serverless, infrastructure as code, and deployment automation.
license: MIT
---

# DevOps Engineering Mastery

Production-grade infrastructure, deployment, and operations across Docker, Kubernetes, Cloudflare, and Google Cloud Platform.

## Platform Selection

| Need | Choose | Why |
|------|--------|-----|
| Sub-50ms latency globally | Cloudflare Workers | Edge computing, 300+ PoPs |
| Large file storage (zero egress) | Cloudflare R2 | S3-compatible, no egress fees |
| SQL database (global reads) | Cloudflare D1 | SQLite at the edge |
| Static site + API | Cloudflare Pages | Git-based, auto-deploy |
| Containerized workloads | Docker + Cloud Run | Auto-scaling, pay-per-use |
| Enterprise Kubernetes | GKE | Managed K8s, Autopilot |
| Managed relational DB | Cloud SQL | PostgreSQL/MySQL managed |
| Infrastructure as Code | Terraform | Multi-cloud, declarative |
| CI/CD pipelines | GitHub Actions | Native Git integration |

## Quick Start

```bash
# Docker: build + run
docker build -t myapp . && docker run -p 3000:3000 myapp

# Docker Compose: multi-service
docker compose up -d

# Cloudflare Worker
npx wrangler init my-worker && cd my-worker && npx wrangler deploy

# GCP Cloud Run
gcloud run deploy my-service --image gcr.io/project/image --region us-central1

# Kubernetes
kubectl apply -f manifests/ && kubectl get pods

# Terraform
terraform init && terraform plan && terraform apply
```

## Reference Navigation

### Containerization
- **[Docker Fundamentals](references/docker-fundamentals.md)** — Dockerfile best practices, multi-stage builds, layer caching, security
- **[Docker Compose](references/docker-compose.md)** — Multi-service apps, networks, volumes, health checks, profiles
- **[Container Optimization](references/container-optimization.md)** — Image size reduction, build caching, security scanning, distroless

### Orchestration
- **[Kubernetes Core](references/kubernetes-core.md)** — Pods, Deployments, Services, ConfigMaps, Secrets, Namespaces
- **[Kubernetes Operations](references/kubernetes-ops.md)** — kubectl mastery, debugging, resource management, scaling
- **[Helm Charts](references/helm-charts.md)** — Chart structure, templates, values, hooks, repositories
- **[Kubernetes Security](references/kubernetes-security.md)** — RBAC, NetworkPolicies, PodSecurityStandards, secrets management
- **[GitOps & CI/CD](references/gitops-cicd.md)** — ArgoCD, Flux, GitHub Actions, progressive delivery

### Cloud Platforms
- **[Cloudflare Platform](references/cloudflare-platform.md)** — Workers, R2, D1, KV, Pages, Queues, Durable Objects
- **[GCP Services](references/gcp-services.md)** — Cloud Run, GKE, Cloud SQL, Cloud Storage, IAM

### Infrastructure as Code
- **[Terraform Patterns](references/terraform-patterns.md)** — Modules, state management, workspaces, best practices

### Monitoring & Observability
- **[Monitoring Stack](references/monitoring-stack.md)** — Prometheus, Grafana, alerting, SLIs/SLOs, log aggregation

## Architecture Patterns

### Development → Staging → Production
```
Local Dev:     Docker Compose (all services locally)
CI/CD:         GitHub Actions → build → test → push image
Staging:       Cloud Run (auto-deploy on PR merge to staging)
Production:    Cloud Run / GKE (deploy on release tag)
```

### Cost Optimization
| Strategy | Savings |
|----------|---------|
| Multi-stage Docker builds | 50-80% image size reduction |
| Cloudflare R2 over S3 | Zero egress fees |
| Spot/preemptible instances | 60-80% compute savings |
| Cloud Run vs always-on | Pay only for requests |
| Resource limits on K8s | Prevent over-provisioning |

## Best Practices

**Containers:** Non-root user, multi-stage builds, .dockerignore, health checks, security scanning
**Kubernetes:** Resource limits, PDB, HPA, NetworkPolicies, secrets encryption, namespace isolation
**CI/CD:** Fast feedback (lint → unit → build → integration → deploy), cache dependencies, parallel jobs
**Security:** Image scanning, RBAC, secrets in vault, TLS everywhere, audit logging
**Monitoring:** RED metrics (Rate, Errors, Duration), SLIs/SLOs, alerting on symptoms not causes

## Related Skills

| Skill | When to Use |
|-------|-------------|
| [rust-backend-advance](../rust-backend-advance/SKILL.md) | Containerizing Rust apps, deployment configs |
| [databases](../databases/SKILL.md) | Database hosting, replication, backups |
| [testing](../testing/SKILL.md) | CI/CD test pipeline integration |
| [debugging](../debugging/SKILL.md) | Production incident investigation |
