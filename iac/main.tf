terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    # Añadimos el proveedor beta explícitamente aquí
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }
  backend "gcs" {
    bucket = "desafio-queplan-tfstate"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Habilitar todas las APIs necesarias
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com", "sqladmin.googleapis.com", "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com", "cloudbuild.googleapis.com", "vpcaccess.googleapis.com", "iam.googleapis.com", "cloudresourcemanager.googleapis.com", "servicenetworking.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

# 1. Reservar un rango de IP para los servicios de Google (como Cloud SQL)
resource "google_compute_global_address" "private_ip_address" {
  provider      = google-beta 
  name          = "private-ip-for-google-services"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = "projects/${var.project_id}/global/networks/default"
}

# 2. Establecer la conexión de red de servicios privados
resource "google_service_networking_connection" "private_vpc_connection" {
  provider                = google-beta
  network                 = "projects/${var.project_id}/global/networks/default"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
  depends_on = [google_project_service.apis["servicenetworking.googleapis.com"]]
}

# Redes: VPC Connector para Cloud Run -> Cloud SQL
resource "google_vpc_access_connector" "main_connector" {
  name          = "main-vpc-connector"
  ip_cidr_range = "10.8.0.0/28"
  network       = "default"
  depends_on    = [google_project_service.apis]
}

# Base de Datos: Cloud SQL (Postgres) con IP privada
resource "random_password" "db_password" {
  length  = 16
  special = false
}

resource "google_sql_database_instance" "main_instance" {
  name             = "desafio-db-instance"
  database_version = "POSTGRES_14"
  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/default"
    }
  }
  deletion_protection = false
  depends_on          = [google_service_networking_connection.private_vpc_connection]
}

resource "google_sql_database" "default_db" {
  instance = google_sql_database_instance.main_instance.name
  name     = "app-db"
}

resource "google_sql_user" "db_user" {
  instance = google_sql_database_instance.main_instance.name
  name     = "app-user"
  password = random_password.db_password.result
}

# Secret Manager para la contraseña
resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "db-password"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password_secret.id
  secret_data = random_password.db_password.result
}

# Artifact Registry para imágenes Docker
resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = "desafio-apps"
  format        = "DOCKER"
  description   = "Docker repository for desafio apps"
  depends_on    = [google_project_service.apis]
}

# IAM: Service Account para los servicios de Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "cloud-run-runtime-sa"
  display_name = "Service Account for Cloud Run Services"
  depends_on = [google_project_service.apis["iam.googleapis.com"]]
}

# Permisos para la SA de Cloud Run
resource "google_project_iam_member" "sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# IAM: Permisos para la SA por defecto de Cloud Build
data "google_project" "project" {}
resource "google_project_iam_member" "cloudbuild_cloudrun_admin" {
    project = var.project_id
    role    = "roles/run.admin"
    member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
    depends_on = [google_project_service.apis["cloudbuild.googleapis.com"]]
}
resource "google_project_iam_member" "cloudbuild_iam_user" {
    project = var.project_id
    role    = "roles/iam.serviceAccountUser"
    member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
    depends_on = [google_project_service.apis["cloudbuild.googleapis.com"]]
}

# IAM: Permisos para la SA de Compute Engine que ejecuta builds
resource "google_project_iam_member" "compute_sa_secret_accessor" {
    project = var.project_id
    role    = "roles/secretmanager.secretAccessor"
    member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}
resource "google_project_iam_member" "compute_sa_sql_client" {
    project = var.project_id
    role    = "roles/cloudsql.client"
    member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}
resource "google_project_iam_member" "compute_sa_cloudbuild_editor" {
    project = var.project_id
    role    = "roles/cloudbuild.builds.editor"
    member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# --- Creación de un Worker Pool Privado para Cloud Build ---
resource "google_cloudbuild_worker_pool" "private_pool" {
  provider = google-beta
  name     = "private-pool-vpc"
  location = var.region
  network_config {
    peered_network = google_service_networking_connection.private_vpc_connection.network
  }
  depends_on = [google_service_networking_connection.private_vpc_connection]
}