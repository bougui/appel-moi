output "api_url" {
  value       = aws_apigatewayv2_api.api.api_endpoint
  description = "URL de l'API Gateway"
}

output "project_description" {
  value = var.project_description
}
