output "api_url" {
  value       = aws_apigatewayv2_api.api.api_endpoint
  description = "URL de l'API Gateway"
}

output "website_url" {
  value       = "http://${aws_s3_bucket.website.bucket}.s3-website.${var.aws_region}.amazonaws.com"
  description = "URL du site web"
}

output "project_description" {
  value = var.project_description
}
