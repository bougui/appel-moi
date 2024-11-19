variable "aws_region" {
  description = "Région AWS à utiliser"
  type        = string
  default     = "ca-central-1" # Canada (Montreal)
}

variable "twilio_account_sid" {
  description = "Twilio Account SID"
  type        = string
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  sensitive   = true
}

variable "twilio_workflow_sid" {
  description = "Twilio Workflow SID"
  type        = string
  sensitive   = true
}

variable "app_password" {
  description = "Mot de passe pour l'application web"
  type        = string
  sensitive   = true
}

variable "phone_numbers" {
  description = "Liste des numéros de téléphone disponibles pour le transfert"
  type        = list(string)
  default = [
    "+33100000001",
    "+33100000002",
    "+33100000003"
  ]
}

variable "project_name" {
  description = "Nom du projet pour les ressources AWS"
  type        = string
  default     = "twilio-transfer"
}

variable "environment" {
  description = "Environnement (dev, prod, etc.)"
  type        = string
  default     = "prod"
}

variable "tags" {
  description = "Tags à appliquer aux ressources AWS"
  type        = map(string)
  default = {
    Project     = "twilio-transfer"
    Environment = "prod"
    ManagedBy   = "terraform"
  }
} 
