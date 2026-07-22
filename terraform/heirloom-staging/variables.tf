# Heirloom Staging Environment variables.
#
# Non-sensitive values default here. Account-specific IDs and the deploy key are
# required via terraform.tfvars (gitignored) — see terraform.tfvars.example.

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging/production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "app_name" {
  description = "Application name for resource naming"
  type        = string
  default     = "heirloom-staging"
}

variable "domain_name" {
  description = "Domain name for the Heirloom application"
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

# --- Required via terraform.tfvars ---

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
  validation {
    condition     = length(var.allowed_ssh_cidrs) > 0
    error_message = "You must specify at least one CIDR block for SSH access."
  }
}

variable "admin_email" {
  description = "Email address for Let's Encrypt SSL certificate notifications"
  type        = string
}

variable "github_actions_public_key" {
  description = "Public SSH key for the deploy user (GitHub Actions + manual SSH)"
  type        = string
}
