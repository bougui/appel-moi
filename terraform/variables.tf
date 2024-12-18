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
  description = "Twilio Studio Flow SID"
  type        = string
  sensitive   = true
}

variable "app_password" {
  description = "Mot de passe pour l'application web"
  type        = string
  sensitive   = true
}

variable "phone_numbers" {
  type = list(object({
    number      = string
    description = string
    sendSms     = bool
  }))
  description = "Liste des numéros de téléphone avec leurs configurations"
}

variable "project_name" {
  description = "Nom du projet pour les ressources AWS"
  type        = string
  default     = "twilio-transfer"
}

variable "project_description" {
  type        = string
  description = "Description du projet pour les logs CloudWatch"
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

variable "twilio_number" {
  type        = string
  description = "Twilio Phone Number"
}

variable "twilio_phone_sid" {
  type        = string
  description = "Twilio Phone Number SID (commence par PN...)"
}

variable "twilio_twiml_sid" {
  type        = string
  description = "Twilio TwiML Bin SID (commence par EH...)"
}

variable "app_username" {
  type        = string
  description = "Nom d'utilisateur pour l'application"
}

variable "frontend_url" {
  type        = string
  description = "URL du frontend (Vercel)"
}
