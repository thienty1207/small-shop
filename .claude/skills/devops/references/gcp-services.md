# GCP Services

## Cloud Run (Serverless Containers)

### Deploy
```bash
# From Dockerfile
gcloud run deploy my-service \
  --image gcr.io/PROJECT_ID/my-service \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=..."

# From source (auto-build)
gcloud run deploy my-service --source .

# Revision traffic splitting (canary)
gcloud run services update-traffic my-service \
  --to-revisions=my-service-v2=10,my-service-v1=90
```

### Configuration
```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 80
      containers:
        - image: gcr.io/PROJECT_ID/my-service
          ports:
            - containerPort: 3000
          resources:
            limits:
              cpu: "1"
              memory: "512Mi"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-url
                  key: latest
```

## Cloud SQL (Managed PostgreSQL)

```bash
# Create instance
gcloud sql instances create mydb \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-size=10GB \
  --storage-type=SSD

# Create database
gcloud sql databases create myapp --instance=mydb

# Create user
gcloud sql users create appuser --instance=mydb --password=secret

# Connect via proxy
gcloud sql connect mydb --user=appuser --database=myapp

# Cloud SQL Proxy (for local dev)
cloud-sql-proxy PROJECT_ID:REGION:mydb --port=5432
```

### Cloud Run + Cloud SQL (Private IP)
```yaml
# In Cloud Run service.yaml
annotations:
  run.googleapis.com/cloudsql-instances: PROJECT_ID:REGION:mydb
```

```bash
# Connection via Unix socket
DATABASE_URL=postgres://user:pass@/myapp?host=/cloudsql/PROJECT_ID:REGION:mydb
```

## GKE (Google Kubernetes Engine)

```bash
# Create Autopilot cluster (recommended)
gcloud container clusters create-auto my-cluster \
  --region=us-central1

# Standard cluster (more control)
gcloud container clusters create my-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=e2-standard-4

# Get credentials
gcloud container clusters get-credentials my-cluster --region=us-central1

# Deploy
kubectl apply -f manifests/
```

## Cloud Storage

```bash
# Create bucket
gcloud storage buckets create gs://my-bucket --location=us-central1

# Upload/download
gcloud storage cp local-file.txt gs://my-bucket/
gcloud storage cp gs://my-bucket/file.txt ./local-file.txt

# Signed URL (temporary access)
gcloud storage sign-url gs://my-bucket/file.txt --duration=1h
```

## IAM (Identity & Access Management)

```bash
# Create service account
gcloud iam service-accounts create my-sa --display-name="My Service"

# Grant role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Create key (for local dev only — use Workload Identity in production)
gcloud iam service-accounts keys create key.json \
  --iam-account=my-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Secret Manager

```bash
# Create secret
echo -n "my-database-url" | gcloud secrets create db-url --data-file=-

# Access secret
gcloud secrets versions access latest --secret=db-url

# Use in Cloud Run
gcloud run services update my-service \
  --set-secrets=DATABASE_URL=db-url:latest
```

## Essential Commands

```bash
# Project management
gcloud config set project PROJECT_ID
gcloud config set compute/region us-central1

# Container Registry
gcloud auth configure-docker
docker push gcr.io/PROJECT_ID/my-image:tag

# Artifact Registry (newer, recommended)
gcloud artifacts repositories create my-repo --repository-format=docker --location=us-central1
docker push us-central1-docker.pkg.dev/PROJECT_ID/my-repo/my-image:tag

# Logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50 --format=json

# Billing
gcloud billing budgets create --billing-account=ACCOUNT_ID --budget-amount=100USD
```
