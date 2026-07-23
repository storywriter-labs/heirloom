# Terraform S3 Backend Configuration for Heirloom Staging
#
# NOTE: the state key is intentionally "heirloom-staging/terraform.tfstate", not
# "environments/staging/..." — it predates this environments/ layout and the live
# instance is already tracked under it. Keeping the key avoids a state migration
# on an already-provisioned box. (To fully match the backend's key convention you
# could `terraform init -migrate-state` to environments/staging/terraform.tfstate,
# but that's optional and not needed for correctness.)
#
# The lock/profile settings changed from the original inline backend block, so run
# `terraform init -reconfigure` once when you pull this.

terraform {
  backend "s3" {
    bucket       = "storywriter-terraform-state-548846592016"
    key          = "heirloom-staging/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
    profile      = "storywriter"
  }
}
