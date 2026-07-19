variable "environment" {
  description = "Environment name (staging/production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "domain_name" {
  description = "Domain name for the Heirloom application"
  type        = string
  default     = "heirloom-staging.storywriter.net"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for the static export"
  type        = string
  default     = "storywriter-staging-heirloom"
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}
