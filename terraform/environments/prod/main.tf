# Heirloom Production Environment  (TEMPLATE — not yet applied)
#
# Mirrors environments/staging against the same ../../modules/heirloom-server
# module. Before first use:
#   1. Set domain_name (no default on purpose — confirm the prod hostname) and the
#      rest of the required inputs in terraform.tfvars.
#   2. Generate a prod-specific deploy keypair.
#   3. Add a prod deploy workflow (there isn't one yet — the staging workflow
#      deploys on merge to main; prod should be gated, e.g. on v* tags like the
#      backend's deploy-prod.yml).

terraform {
  required_version = ">= 1.1"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = var.aws_region
  profile = "storywriter"

  default_tags {
    tags = {
      app_name    = "heirloom"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

# --- Variables ---

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name for resource naming"
  type        = string
  default     = "heirloom-production"
}

variable "domain_name" {
  description = "Domain name for the environment (confirm the prod hostname)"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t4g.micro"
}

variable "app_port" {
  description = "Localhost port the Next.js server listens on"
  type        = number
  default     = 3000
}

variable "deploy_branch" {
  description = "Git branch/ref that deploys to this environment"
  type        = string
  default     = "main"
}

variable "vpc_id" {
  description = "ID of the existing VPC to deploy into"
  type        = string
}

variable "subnet_id" {
  description = "ID of the public subnet for the EC2 instance"
  type        = string
}

variable "key_pair_name" {
  description = "Name of the existing AWS key pair for SSH access"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for storywriter.net"
  type        = string
}

variable "allowed_ssh_cidrs" {
  description = "List of CIDR blocks allowed to SSH into the server"
  type        = list(string)
}

variable "admin_email" {
  description = "Email address for Let's Encrypt SSL certificate notifications"
  type        = string
}

variable "github_actions_public_key" {
  description = "Public SSH key for the deploy user (GitHub Actions + manual SSH)"
  type        = string
}

# --- Module ---

module "heirloom_server" {
  source = "../../modules/heirloom-server"

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
