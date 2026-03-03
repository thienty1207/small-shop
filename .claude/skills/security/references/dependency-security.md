# Dependency Security

> Supply chain security through automated scanning, SBOM generation, and secure dependency management.

## Vulnerability Scanning by Stack

### Rust - cargo audit

```bash
# Install
cargo install cargo-audit

# Scan for vulnerabilities
cargo audit

# Output JSON for CI
cargo audit --json

# Fix vulnerabilities (updates Cargo.lock)
cargo audit fix

# Check with deny list
cargo audit --deny warnings

# Ignore specific advisories
cargo audit --ignore RUSTSEC-2020-0071
```

```toml
# .cargo/audit.toml
[advisories]
ignore = []
informational_warnings = ["unmaintained"]

[output]
format = "markdown"
```

### Rust - cargo deny

```bash
# Install
cargo install cargo-deny

# Initialize config
cargo deny init

# Check all
cargo deny check

# Check specific
cargo deny check licenses
cargo deny check bans
cargo deny check advisories
cargo deny check sources
```

```toml
# deny.toml
[advisories]
db-path = "~/.cargo/advisory-db"
vulnerability = "deny"
unmaintained = "warn"
yanked = "deny"

[licenses]
allow = [
    "MIT",
    "Apache-2.0",
    "Apache-2.0 WITH LLVM-exception",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "Zlib",
]
copyleft = "warn"
default = "deny"

[bans]
multiple-versions = "warn"
wildcards = "deny"
deny = [
    { name = "openssl" }, # Use rustls instead
]

[sources]
unknown-registry = "deny"
unknown-git = "deny"
allow-git = []
```

### Go - govulncheck

```bash
# Install
go install golang.org/x/vuln/cmd/govulncheck@latest

# Scan
govulncheck ./...

# Output JSON
govulncheck -json ./...

# Scan binary
govulncheck -mode=binary ./myapp
```

### Go - nancy

```bash
# Install
go install github.com/sonatype-nexus-community/nancy@latest

# Scan via go list
go list -json -deps ./... | nancy sleuth

# With SBOM
nancy sleuth -p Gopkg.lock
```

### Python - pip-audit / safety

```bash
# pip-audit (official PyPI tool)
pip install pip-audit
pip-audit
pip-audit --fix
pip-audit -r requirements.txt

# safety (alternative)
pip install safety
safety check
safety check -r requirements.txt
safety check --full-report
```

```bash
# With Poetry
poetry export -f requirements.txt | pip-audit -r /dev/stdin

# With pipenv
pipenv run pip-audit
```

### Node.js - npm audit

```bash
# Built-in npm audit
npm audit
npm audit --json
npm audit fix
npm audit fix --force

# Yarn
yarn audit
yarn audit --json

# pnpm
pnpm audit
pnpm audit --fix
```

### Snyk (Multi-language)

```bash
# Install
npm install -g snyk

# Authenticate
snyk auth

# Test project
snyk test

# Monitor project (continuous)
snyk monitor

# Container scan
snyk container test myimage:latest

# IaC scan
snyk iac test
```

## CI/CD Integration

### GitHub Actions - Multi-Stack

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  rust-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: dtolnay/rust-action@stable
      
      - name: Install cargo-audit
        run: cargo install cargo-audit
      
      - name: Run audit
        run: cargo audit --deny warnings

  rust-deny:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: EmbarkStudios/cargo-deny-action@v1

  go-vuln:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      
      - name: Install govulncheck
        run: go install golang.org/x/vuln/cmd/govulncheck@latest
      
      - name: Run govulncheck
        run: govulncheck ./...

  python-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run pip-audit
        run: |
          pip install pip-audit
          pip-audit

  node-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run audit
        run: npm audit --audit-level=high

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      
      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### GitLab CI

```yaml
security-scan:
  stage: test
  image: rust:latest
  before_script:
    - cargo install cargo-audit
  script:
    - cargo audit --deny warnings
  allow_failure: false

container-scan:
  stage: test
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Dependabot / Renovate

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  # Rust
  - package-ecosystem: "cargo"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    open-pull-requests-limit: 10
    groups:
      rust-minor:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  # Go
  - package-ecosystem: "gomod"
    directory: "/"
    schedule:
      interval: "weekly"

  # Python
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"

  # Node.js
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"

  # Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Renovate Configuration

```json
// renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:base",
    ":semanticCommits",
    "security:openssf-scorecard"
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  },
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["major"],
      "labels": ["major-update"]
    }
  ],
  "schedule": ["before 7am on Monday"]
}
```

## SBOM Generation

### Rust - cargo-sbom

```bash
# Install
cargo install cargo-sbom

# Generate CycloneDX SBOM
cargo sbom > sbom.json

# SPDX format
cargo sbom --format spdx > sbom.spdx.json
```

### Go - cyclonedx-gomod

```bash
# Install
go install github.com/CycloneDX/cyclonedx-gomod/cmd/cyclonedx-gomod@latest

# Generate
cyclonedx-gomod mod -json -output sbom.json
```

### Python - cyclonedx-bom

```bash
pip install cyclonedx-bom
cyclonedx-py requirements > sbom.json
```

### Node.js - @cyclonedx/cyclonedx-npm

```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

### Multi-Language - Syft

```bash
# Install
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Generate SBOM from directory
syft . -o cyclonedx-json > sbom.json

# From container
syft myimage:latest -o spdx-json > sbom.json
```

### CI SBOM Generation

```yaml
# .github/workflows/sbom.yml
name: Generate SBOM

on:
  release:
    types: [published]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          format: cyclonedx-json
          output-file: sbom.json
      
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
      
      - name: Attach to release
        uses: softprops/action-gh-release@v1
        with:
          files: sbom.json
```

## Container Security

### Trivy

```bash
# Image scan
trivy image myapp:latest

# Severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Exit code on vulnerability
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# Filesystem scan
trivy fs .

# Config scan (IaC)
trivy config .
```

### Dockerfile Best Practices

```dockerfile
# Use specific versions
FROM rust:1.77-slim AS builder

# Don't run as root
RUN useradd -m -u 1000 app
USER app

# Multi-stage builds
FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/myapp /myapp
USER nonroot
ENTRYPOINT ["/myapp"]
```

### Grype

```bash
# Install
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin

# Scan image
grype myapp:latest

# Scan SBOM
grype sbom:./sbom.json

# Fail on severity
grype myapp:latest --fail-on high
```

## Lock File Security

### Verify Lock Files

```bash
# Rust - verify Cargo.lock is up to date
cargo generate-lockfile --locked

# Go - verify go.sum
go mod verify

# Node.js - use npm ci (not npm install)
npm ci  # Fails if package-lock.json doesn't match

# Python - hash verification with pip
pip install --require-hashes -r requirements.txt
```

### Generate Requirements with Hashes

```bash
# Python - pip-tools
pip install pip-tools
pip-compile --generate-hashes requirements.in
```

## Security Checklist

### Pre-Commit
- [ ] `cargo audit` / `npm audit` / etc. passes
- [ ] No known vulnerabilities in dependencies
- [ ] Lock files are committed and verified

### CI/CD
- [ ] Automated vulnerability scanning on every PR
- [ ] Container images scanned before deployment
- [ ] SBOM generated for releases
- [ ] Dependabot/Renovate enabled

### Continuous
- [ ] Daily/weekly vulnerability scans
- [ ] Security advisories monitored
- [ ] Dependencies updated regularly
- [ ] Unused dependencies removed

### Supply Chain
- [ ] Dependencies from trusted sources only
- [ ] Signature verification where available
- [ ] Pinned dependency versions
- [ ] License compliance checked
