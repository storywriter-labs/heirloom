# State migration for the module -> flat refactor.
#
# The resources previously lived in module.heirloom_server; inlining them changes
# their state addresses. These moved{} blocks tell Terraform to relocate the
# existing state entries instead of destroying and recreating the live instance.
#
# On the first `terraform plan` after this change, expect "N resources will be
# moved" and NO create/destroy. Once applied (state persisted), this file can be
# deleted.

moved {
  from = module.heirloom_server.aws_security_group.server
  to   = aws_security_group.server
}

moved {
  from = module.heirloom_server.aws_eip.server
  to   = aws_eip.server
}

moved {
  from = module.heirloom_server.aws_instance.server
  to   = aws_instance.server
}

moved {
  from = module.heirloom_server.aws_eip_association.server
  to   = aws_eip_association.server
}

moved {
  from = module.heirloom_server.aws_route53_record.server
  to   = aws_route53_record.server
}
