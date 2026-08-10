# Module Outputs for Heirloom Server

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.server.id
}

output "elastic_ip" {
  description = "Elastic IP address of the server"
  value       = aws_eip.server.public_ip
}

output "public_dns" {
  description = "Public DNS name of the server"
  value       = aws_eip.server.public_dns
}

output "security_group_id" {
  description = "ID of the security group. This is the value for the deploy workflow's DEPLOY_SECURITY_GROUP_ID secret."
  value       = aws_security_group.server.id
}

output "github_deploy_role_arn" {
  description = "ARN of the role the deploy workflow assumes to open port 22 for its runner. This is the value for the deploy workflow's AWS_DEPLOY_ROLE_ARN secret. Empty when github_deploy_repository is not set."
  value       = try(aws_iam_role.github_deploy[0].arn, "")
}

output "ssh_command" {
  description = "SSH command to connect to the instance as the deploy user"
  value       = "ssh deploy@${aws_eip.server.public_ip}"
}

output "domain_dns_record" {
  description = "Route 53 DNS A record FQDN"
  value       = aws_route53_record.server.fqdn
}
