output "cloud_sql_private_ip" {
  description = "La IP privada de la instancia de Cloud SQL."
  value       = google_sql_database_instance.main_instance.private_ip_address
}

output "cloud_run_service_account_email" {
  description = "El email de la Service Account para los servicios de Cloud Run."
  value       = google_service_account.cloud_run_sa.email
}

output "artifact_registry_repo_url" {
  description = "La URL del repositorio de Artifact Registry."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}"
}