# Turborepo Pipelines & Caching

Task orchestration and build caching in Turborepo monorepos.

## Pipeline Configuration

### turbo.json Structure
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "env": ["NODE_ENV"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": true
    }
  }
}
```

### Dependency Types

| Syntax | Meaning | Example |
|--------|---------|---------|
| `^build` | Run in dependencies first | Build packages before apps |
| `build` | Run in same package first | Lint after build in same package |
| `@pkg/ui#build` | Specific package task | Only wait for ui package build |

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]  // Build dependencies first
    },
    "test": {
      "dependsOn": ["build"]   // Build same package first
    },
    "deploy": {
      "dependsOn": ["@myapp/web#build"]  // Specific dependency
    }
  }
}
```

## Output Configuration

### Cacheable Outputs
```json
{
  "pipeline": {
    "build": {
      "outputs": [
        ".next/**",           // Next.js build
        "dist/**",            // Generic build output
        "!dist/**/*.map"      // Exclude source maps
      ]
    },
    "test": {
      "outputs": [
        "coverage/**"         // Test coverage reports
      ]
    },
    "lint": {
      "outputs": []           // No outputs (but still cacheable)
    }
  }
}
```

### Non-Cacheable Tasks
```json
{
  "pipeline": {
    "dev": {
      "cache": false,         // Never cache dev server
      "persistent": true      // Keep running
    },
    "deploy": {
      "cache": false          // Always run deploys
    }
  }
}
```

## Environment Variables

### Global Environment
```json
{
  "globalDependencies": [
    ".env",
    ".env.local"
  ],
  "globalEnv": [
    "CI",
    "VERCEL"
  ]
}
```

### Per-Task Environment
```json
{
  "pipeline": {
    "build": {
      "env": [
        "NODE_ENV",
        "NEXT_PUBLIC_*"       // Wildcard matching
      ],
      "passThroughEnv": [
        "AWS_SECRET_KEY"      // Don't include in hash
      ]
    }
  }
}
```

## Remote Caching

### Vercel Remote Cache (Easiest)
```bash
# Login to Vercel
npx turbo login

# Link your repo
npx turbo link

# Now builds share cache across team/CI
npx turbo run build
```

### Self-Hosted Remote Cache
```bash
# Using official server
docker run -p 8080:8080 ducktors/turborepo-remote-cache

# Configure turbo
```

```json
// .turbo/config.json
{
  "teamId": "team_myteam",
  "apiUrl": "https://cache.mycompany.com"
}
```

### CI Configuration
```yaml
# GitHub Actions
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install
        run: npm ci
      
      - name: Build
        run: npx turbo run build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

## Filtering

### Run Specific Packages
```bash
# Single package
turbo run build --filter=@myapp/web

# Package and its dependencies
turbo run build --filter=@myapp/web...

# Package and its dependents
turbo run build --filter=...@myapp/ui

# Multiple packages
turbo run build --filter=@myapp/web --filter=@myapp/admin

# All packages in apps/
turbo run build --filter="./apps/*"
```

### Changed Files Since
```bash
# Since last commit
turbo run build --filter="[HEAD^1]"

# Since branch point from main
turbo run build --filter="[origin/main]"

# Packages that changed + their dependents
turbo run build --filter="...[origin/main]"
```

## Parallel Execution

### Concurrency Control
```bash
# Limit parallel tasks
turbo run build --concurrency=4

# Percentage of CPUs
turbo run build --concurrency=50%

# Sequential (useful for debugging)
turbo run build --concurrency=1
```

### Graph Visualization
```bash
# Generate task graph
turbo run build --graph

# Output to file
turbo run build --graph=graph.png

# Dry run (show what would run)
turbo run build --dry-run
```

## Common Pipeline Patterns

### Full CI Pipeline
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "outputs": [],
      "cache": false
    }
  }
}
```

### CI Script
```json
// package.json
{
  "scripts": {
    "ci": "turbo run lint type-check test build",
    "ci:quick": "turbo run lint type-check --parallel",
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test"
  }
}
```

## Cache Debugging

### Cache Status
```bash
# See cache hits/misses
turbo run build --summarize

# Verbose output
turbo run build --verbosity=2

# Why was cache missed?
turbo run build --dry-run=json | jq '.tasks[] | {name, cache}'
```

### Clear Cache
```bash
# Clear local cache
turbo run build --force

# Clear remote cache (if you have access)
# Usually done via provider dashboard
```

### Cache Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Cache always misses | Missing outputs config | Define `outputs` correctly |
| Different local/CI results | Env var differences | Add to `env` or `globalEnv` |
| Cache bloat | Large outputs | Exclude unnecessary files |
| Stale builds | Missing dependencies | Add `dependsOn` properly |

## Package-Specific Config

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    // Override for specific package
    "@myapp/web#build": {
      "dependsOn": ["^build", "^db:generate"],
      "outputs": [".next/**"],
      "env": ["DATABASE_URL"]
    }
  }
}
```

## Watch Mode

```json
{
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "dev:packages": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    }
  }
}
```

```bash
# Run dev with watch on dependencies
turbo run dev dev:packages --parallel
```

## Related Skills

- [Turborepo Setup](turborepo-setup.md) — Initial monorepo setup
- [GitOps CI/CD](../../devops/references/gitops-cicd.md) — CI/CD integration
- [Next.js App Router](nextjs-app-router.md) — Building Next.js apps
