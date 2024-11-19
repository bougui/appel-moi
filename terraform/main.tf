provider "aws" {
  region = var.aws_region
}

# Lambda Function
resource "aws_lambda_function" "twilio_transfer" {
  filename      = "../backend/index.js.zip"
  function_name = "twilio-transfer-manager"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs14.x"

  environment {
    variables = {
      TWILIO_ACCOUNT_SID  = var.twilio_account_sid
      TWILIO_AUTH_TOKEN   = var.twilio_auth_token
      TWILIO_WORKFLOW_SID = var.twilio_workflow_sid
      APP_PASSWORD        = var.app_password
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "twilio-transfer-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.twilio_transfer.invoke_arn
}

resource "aws_apigatewayv2_route" "route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /transfer"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Création des paramètres SSM
resource "aws_ssm_parameter" "app_password" {
  name        = "/${var.project_name}/${var.environment}/app_password"
  description = "Mot de passe pour l'application de transfert Twilio"
  type        = "SecureString"
  value       = var.app_password
}

resource "aws_ssm_parameter" "phone_numbers" {
  name        = "/${var.project_name}/${var.environment}/phone_numbers"
  description = "Liste des numéros de téléphone pour le transfert"
  type        = "SecureString"
  value       = jsonencode(var.phone_numbers)
}

# Modification de la Lambda pour inclure la permission de lire SSM
resource "aws_iam_role_policy" "lambda_ssm" {
  name = "lambda_ssm_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          aws_ssm_parameter.app_password.arn,
          aws_ssm_parameter.phone_numbers.arn
        ]
      }
    ]
  })
}

# Création du bucket S3 pour l'hébergement web
resource "aws_s3_bucket" "website" {
  bucket = "${var.project_name}-website"
}

# Activation de l'hébergement de site web statique
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Politique pour permettre l'accès public au bucket
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      },
    ]
  })
}

# Activation du CORS
resource "aws_s3_bucket_cors_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Output pour l'URL du site web
output "website_url" {
  value = "http://${aws_s3_bucket.website.bucket}.s3-website.${var.aws_region}.amazonaws.com"
}
