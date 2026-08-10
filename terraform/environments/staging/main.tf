# Heirloom Staging Environment
#
# Node (Next.js) server on a t4g.micro EC2 instance — replaces the previous
# static export (S3 + CloudFront). See HEIRLOOM_HOSTING.md ("Node server: EC2 vs.
# ECS") at the storywriter repo root and this directory's README.md.
#
# Layout mirrors backend/terraform/environments/*: a thin environment that wires
# tfvars into the shared ../../modules/heirloom-server module.

terraform {
  required_version = ">= 1.1" # moved{} blocks require 1.1+

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
  default     = "staging"
}

variable "app_name" {
  description = "Application name for resource naming"
  type        = string
  default     = "heirloom-staging"
}

variable "domain_name" {
  description = "Domain name for the environment"
  type        = string
  default     = "heirloom-staging.storywriter.net"
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
  description = "Git branch that deploys to this environment"
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

  # Neither value is a secret, so they are set here rather than in tfvars: the
  # repo and the GitHub Environment name that the staging deploy job declares.
  # They scope the role that opens port 22 for a deploy runner.
  github_deploy_repository  = "storywriter-labs/heirloom"
  github_deploy_environment = "staging"
}
