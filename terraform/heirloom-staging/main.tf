# Heirloom Staging Environment
#
# Node (Next.js) server on a t4g.micro EC2 instance — replaces the previous
# static export (S3 + CloudFront). See HEIRLOOM_HOSTING.md ("Node server: EC2 vs.
# ECS") at the storywriter repo root for the decision and rationale, and this
# directory's README.md for the runbook.
#
# Single environment, so the config is flat (no module indirection). If a
# production environment is ever added, extract these resources into a shared
# module then.
#
# NOTE: the S3 backend key below is unchanged from the static setup, so the first
# `apply` of the EC2 revision was the cutover — it destroyed the old S3 bucket /
# CloudFront distribution / ACM cert and stood up the EC2 instance in their place,
# repointing the same Route 53 record from the CloudFront alias to the EIP.

terraform {
  required_version = ">= 1.1" # moved{} blocks require 1.1+
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

  # No hardcoded profile: for local applies, export AWS_PROFILE=storywriter first.
  default_tags {
    tags = {
      app_name    = "heirloom"
      environment = var.environment
      managed_by  = "terraform"
    }
  }
}

# --- Data sources for existing resources ---

data "aws_vpc" "selected" {
  id = var.vpc_id
}

data "aws_subnet" "selected" {
  id = var.subnet_id
}

# Latest Ubuntu 24.04 ARM64 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

# --- Compute ---

resource "aws_security_group" "server" {
  name        = "${var.app_name}-sg"
  description = "Security group for ${var.app_name}"
  vpc_id      = data.aws_vpc.selected.id

  # SSH access - restricted to specific IPs for security
  ingress {
    description = "SSH from trusted sources"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  # HTTP access (nginx; also required for Let's Encrypt HTTP-01 challenge)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-sg"
    Environment = var.environment
  }
}

# Elastic IP for stable DNS
resource "aws_eip" "server" {
  domain = "vpc"

  tags = {
    Name        = "${var.app_name}-eip"
    Environment = var.environment
  }
}

resource "aws_instance" "server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  subnet_id              = data.aws_subnet.selected.id
  vpc_security_group_ids = [aws_security_group.server.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  # Enforce IMDSv2 to prevent SSRF attacks
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "enabled"
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    domain_name               = var.domain_name
    app_name                  = var.app_name
    deploy_branch             = var.deploy_branch
    admin_email               = var.admin_email
    app_port                  = var.app_port
    github_actions_public_key = var.github_actions_public_key
  })

  tags = {
    Name        = var.app_name
    Environment = var.environment
  }
}

resource "aws_eip_association" "server" {
  instance_id   = aws_instance.server.id
  allocation_id = aws_eip.server.id
}

# Route 53 DNS A record -> Elastic IP (direct; no CloudFront in front of the
# dynamic SSR app — SSL terminates at nginx via Let's Encrypt)
resource "aws_route53_record" "server" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.server.public_ip]
}
