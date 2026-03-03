# Terraform Patterns

## Project Structure
```
infrastructure/
├── main.tf              # Provider config, backend
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── versions.tf          # Required providers/versions
├── modules/
│   ├── vpc/
│   ├── database/
│   └── app/
└── environments/
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

## Basic Configuration

### Provider + Backend
```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "myapp-terraform-state"
    prefix = "terraform/state"
  }
}

# main.tf
provider "google" {
  project = var.project_id
  region  = var.region
}
```

### Cloud Run Example
```hcl
resource "google_cloud_run_v2_service" "api" {
  name     = "myapp-api"
  location = var.region

  template {
    containers {
      image = "gcr.io/${var.project_id}/myapp:${var.app_version}"
      ports {
        container_port = 3000
      }
      env {
        name  = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }
}

# Public access
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

### Cloud SQL PostgreSQL
```hcl
resource "google_sql_database_instance" "postgres" {
  name             = "myapp-db"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = "db-custom-2-4096"
    availability_type = "REGIONAL"  # HA with failover
    disk_size         = 20
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    ip_configuration {
      ipv4_enabled = false
      private_network = google_compute_network.vpc.id
    }
  }
  deletion_protection = true
}

resource "google_sql_database" "myapp" {
  name     = "myapp"
  instance = google_sql_database_instance.postgres.name
}
```

## Essential Commands
```bash
terraform init                    # Initialize providers
terraform plan                    # Preview changes
terraform apply                   # Apply changes
terraform destroy                 # Tear down
terraform plan -var-file=prod.tfvars  # With env vars
terraform state list              # List managed resources
terraform state show <resource>   # Inspect resource
terraform import <resource> <id>  # Import existing resource
terraform output                  # Show outputs
```

## Best Practices

- **State:** Remote backend (GCS/S3), state locking, encryption
- **Modules:** Reusable, versioned, tested
- **Variables:** Use `.tfvars` per environment, never hardcode secrets
- **Naming:** `<project>-<env>-<resource>` convention
- **Lifecycle:** Use `prevent_destroy` for critical resources
- **Security:** Use Secret Manager, no secrets in state
- **CI/CD:** `terraform plan` on PR, `terraform apply` on merge
