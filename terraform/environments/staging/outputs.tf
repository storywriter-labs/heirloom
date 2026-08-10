# Re-export module outputs for the staging environment

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = module.heirloom_server.instance_id
}

output "elastic_ip" {
  description = "Elastic IP of the Heirloom server (SSH/deploy target)"
  value       = module.heirloom_server.elastic_ip
}

output "public_dns" {
  description = "Public DNS name of the server"
  value       = module.heirloom_server.public_dns
}

output "security_group_id" {
  description = "ID of the security group. This is the value for the deploy workflow's DEPLOY_SECURITY_GROUP_ID secret."
  value       = module.heirloom_server.security_group_id
}

output "github_deploy_role_arn" {
  description = "ARN of the role the deploy workflow assumes to open port 22 for its runner. This is the value for the deploy workflow's AWS_DEPLOY_ROLE_ARN secret."
  value       = module.heirloom_server.github_deploy_role_arn
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = module.heirloom_server.ssh_command
}

output "domain_name" {
  description = "Public domain for the Heirloom application"
  value       = var.domain_name
}

output "domain_dns_record" {
  description = "Route 53 A record FQDN pointing at the Elastic IP"
  value       = module.heirloom_server.domain_dns_record
}
