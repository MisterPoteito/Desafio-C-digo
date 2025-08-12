variable "project_id" {
  description = "El ID del proyecto de GCP."
  type        = string
  default     = "desafio-queplan"
}

variable "region" {
  description = "La región principal para los recursos de GCP."
  type        = string
  default     = "us-central1"
}