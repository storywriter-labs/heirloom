# Heirloom Staging Environment
#
# Node (Next.js) server on a t4g.micro EC2 instance — replaces the previous
# static export (S3 + CloudFront). See HEIRLOOM_HOSTING.md ("Node server: EC2 vs.
# ECS") at the storywriter repo root for the decision and rationale.
#
# NOTE: the S3 backend key below is unchanged from the static setup, so the first
# `apply` of this revision is the cutover — it destroys the old S3 bucket /
# CloudFront distribution / ACM cert and stands up the EC2 instance in their
# place, repointing the same Route 53 record from the CloudFront alias to the
# instance's Elastic IP.

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
  region = var.aws_region

  # No hardcoded profile: CI authenticates via OIDC (AWS_ROLE_ARN). For local
  # applies, export AWS_PROFILE=storywriter first.
  default_tags {
    tags = {
      app_name    = "heirloom"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

module "heirloom_server" {
  source = "../modules/heirloom-server"

  aws_region                = var.aws_region
  vpc_id                    = var.vpc_id
  subnet_id                 = var.subnet_id
  key_pair_name             = var.key_pair_name
  instance_type             = var.instance_type
  domain_name               = var.domain_name
  app_name                  = var.app_name
  environment               = var.environment
  deploy_branch             = var.deploy_branch
  app_port                  = var.app_port
  route53_zone_id           = var.route53_zone_id
  allowed_ssh_cidrs         = var.allowed_ssh_cidrs
  admin_email               = var.admin_email
  github_actions_public_key = var.github_actions_public_key
}
