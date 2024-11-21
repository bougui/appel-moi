provider "aws" {
  region = var.aws_region
}

# Ajouter au début du fichier, avec les autres data sources
data "aws_caller_identity" "current" {}

# Lambda Function
resource "aws_lambda_function" "twilio_transfer" {
  filename         = "${path.module}/index.js.zip"
  source_code_hash = filebase64sha256("${path.module}/index.js.zip")
  function_name    = "${var.project_name}-manager"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5

  environment {
    variables = {
      TWILIO_ACCOUNT_SID  = var.twilio_account_sid
      TWILIO_AUTH_TOKEN   = var.twilio_auth_token
      TWILIO_WORKFLOW_SID = var.twilio_workflow_sid
      PROJECT_NAME        = var.project_name
      ENVIRONMENT         = var.environment
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_logs]
}

# API Gateway avec CORS configuré
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins  = ["*"]
    allow_methods  = ["GET", "POST", "OPTIONS"]
    allow_headers  = ["*"]
    expose_headers = ["*"]
    max_age        = 30
  }
}

# Stage avec logging activé
resource "aws_apigatewayv2_stage" "stage" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }
}

# Groupe de logs pour API Gateway
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${var.project_name}-api"
  retention_in_days = 14
}

# Integration Lambda
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.twilio_transfer.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Permission pour API Gateway d'invoquer Lambda
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.twilio_transfer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# Routes
resource "aws_apigatewayv2_route" "post" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /transfer"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "get" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /transfer"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Route OPTIONS explicite pour CORS
resource "aws_apigatewayv2_route" "options" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "OPTIONS /transfer"
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
  name = "/${var.project_name}/${var.environment}/phone_numbers"
  type = "SecureString"
  value = jsonencode([
    for i, number in var.phone_numbers : {
      number : number.number,
      description : "Numéro ${i + 1}: ${number.description}",
      sendSms : number.sendSms
    }
  ])
}

# Rôle IAM pour la Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Politique pour les logs CloudWatch
resource "aws_iam_role_policy" "lambda_logs" {
  name = "${var.project_name}-logs-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.lambda_logs.arn}",
          "${aws_cloudwatch_log_group.lambda_logs.arn}:*"
        ]
      }
    ]
  })
}

# Politique pour SSM
resource "aws_iam_role_policy" "lambda_ssm" {
  name = "${var.project_name}-ssm-policy"
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
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${var.environment}/*"
        ]
      }
    ]
  })
}

# Création du bucket S3
resource "aws_s3_bucket" "website" {
  bucket = var.project_name
}

# Désactiver le blocage des accès publics
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Configuration du site web
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Politique du bucket (à ajouter APRÈS aws_s3_bucket_public_access_block)
resource "aws_s3_bucket_policy" "website" {
  # Attendre que le blocage public soit désactivé
  depends_on = [aws_s3_bucket_public_access_block.website]

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
    max_age_seconds = 0
  }
}
# Création explicite du groupe de logs CloudWatch
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-manager"
  retention_in_days = 14 # Garde les logs pendant 14 jours
}

# Paramètres Twilio
resource "aws_ssm_parameter" "twilio_account_sid" {
  name  = "/${var.project_name}/${var.environment}/twilio_account_sid"
  type  = "SecureString"
  value = var.twilio_account_sid
}

resource "aws_ssm_parameter" "twilio_auth_token" {
  name  = "/${var.project_name}/${var.environment}/twilio_auth_token"
  type  = "SecureString"
  value = var.twilio_auth_token
}

resource "aws_ssm_parameter" "twilio_number" {
  name  = "/${var.project_name}/${var.environment}/twilio_number"
  type  = "SecureString"
  value = var.twilio_number
}

# Paramètre pour le Workflow SID
resource "aws_ssm_parameter" "twilio_workflow_sid" {
  name  = "/${var.project_name}/${var.environment}/twilio_workflow_sid"
  type  = "SecureString"
  value = var.twilio_workflow_sid
}

# Ajouter aux paramètres SSM
resource "aws_ssm_parameter" "twilio_phone_sid" {
  name  = "/${var.project_name}/${var.environment}/twilio_phone_sid"
  type  = "SecureString"
  value = var.twilio_phone_sid
}

# Ajouter aux paramètres SSM
resource "aws_ssm_parameter" "twilio_twiml_sid" {
  name  = "/${var.project_name}/${var.environment}/twilio_twiml_sid"
  type  = "SecureString"
  value = var.twilio_twiml_sid
}

# Paramètre pour le nom d'utilisateur
resource "aws_ssm_parameter" "app_username" {
  name  = "/${var.project_name}/${var.environment}/app_username"
  type  = "SecureString"
  value = var.app_username
}

# Paramètre SSM pour l'URL de l'API
resource "aws_ssm_parameter" "api_url" {
  name  = "/${var.project_name}/${var.environment}/api_url"
  type  = "String"
  value = aws_apigatewayv2_api.api.api_endpoint

  depends_on = [
    aws_apigatewayv2_route.post,
    aws_apigatewayv2_route.get
  ]
}
