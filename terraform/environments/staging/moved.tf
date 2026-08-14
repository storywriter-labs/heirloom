# Defensive state reconciliation.
#
# PR #6 briefly flattened the module into root resources. If that flatten was
# ever `terraform apply`d, the live state holds root addresses (aws_instance.server
# etc.); these blocks move them back under module.heirloom_server so this config
# matches without a destroy/recreate.
#
# If the flatten was NEVER applied (the normal case — the box is still tracked as
# module.heirloom_server.* from the original apply), each `from` address simply
# isn't in state and the block is a no-op.
#
# Either way, once `terraform plan` reports no changes, delete this file.

moved {
  from = aws_security_group.server
  to   = module.heirloom_server.aws_security_group.server
}

moved {
  from = aws_eip.server
  to   = module.heirloom_server.aws_eip.server
}

moved {
  from = aws_instance.server
  to   = module.heirloom_server.aws_instance.server
}

moved {
  from = aws_eip_association.server
  to   = module.heirloom_server.aws_eip_association.server
}

moved {
  from = aws_route53_record.server
  to   = module.heirloom_server.aws_route53_record.server
}
