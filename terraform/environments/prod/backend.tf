# Terraform S3 Backend Configuration for Heirloom Production
#
# Fresh state key (no legacy to preserve, unlike staging), so it follows the
# backend's environments/<env>/ convention directly.

terraform {
  backend "s3" {
    bucket       = "storywriter-terraform-state-548846592016"
    key          = "environments/prod/heirloom/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
    profile      = "storywriter"
  }
}
