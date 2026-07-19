output "s3_bucket_name" {
  description = "Name of the S3 bucket holding the static export"
  value       = aws_s3_bucket.heirloom.bucket
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.heirloom.id
}

output "domain_name" {
  description = "Domain name for the Heirloom application"
  value       = var.domain_name
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.heirloom.domain_name
}
