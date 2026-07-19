terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "storywriter-terraform-state-548846592016"
    key            = "heirloom-staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "storywriter-terraform-locks"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      app_name    = "heirloom"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

# Data source for existing hosted zone
data "aws_route53_zone" "main" {
  name         = "storywriter.net"
  private_zone = false
}

# S3 Bucket for the static export (private; served only via CloudFront OAC)
resource "aws_s3_bucket" "heirloom" {
  bucket = var.s3_bucket_name

  tags = {
    Name = "${var.environment}-heirloom"
  }
}

resource "aws_s3_bucket_public_access_block" "heirloom" {
  bucket = aws_s3_bucket.heirloom.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "heirloom" {
  name                              = "${var.environment}-heirloom-oac"
  description                       = "OAC for ${var.environment} Heirloom"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Next.js static export emits one HTML file per route (/login -> /login.html),
# so extensionless request URIs must be rewritten before hitting S3.
resource "aws_cloudfront_function" "url_rewrite" {
  name    = "${var.environment}-heirloom-url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Map extensionless URIs to the .html files of the Next.js static export"
  publish = true
  code    = file("${path.module}/url-rewrite.js")
}

# Managed cache policy: caches on the normalized URL only (no cookies/query/headers),
# which is all a fingerprinted static export needs.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "heirloom" {
  origin {
    domain_name              = aws_s3_bucket.heirloom.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.heirloom.id
    origin_id                = "S3-${aws_s3_bucket.heirloom.bucket}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.environment} Heirloom Distribution"
  default_root_object = "index.html"

  aliases = [var.domain_name]

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.heirloom.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  # OAC-signed requests for missing keys return 403 from S3 (no ListBucket
  # permission), so both 403 and 404 map to the export's 404 page.
  custom_error_response {
    error_code         = 403
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  price_class = var.price_class

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.heirloom.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.environment}-heirloom"
  }
}

# ACM Certificate (must be us-east-1 for CloudFront)
resource "aws_acm_certificate" "heirloom" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Route53 DNS validation records
resource "aws_route53_record" "heirloom_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.heirloom.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# ACM Certificate validation
resource "aws_acm_certificate_validation" "heirloom" {
  certificate_arn         = aws_acm_certificate.heirloom.arn
  validation_record_fqdns = [for record in aws_route53_record.heirloom_cert_validation : record.fqdn]
}

# S3 Bucket Policy for CloudFront access
resource "aws_s3_bucket_policy" "heirloom" {
  bucket = aws_s3_bucket.heirloom.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.heirloom.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.heirloom.arn
          }
        }
      }
    ]
  })
}
