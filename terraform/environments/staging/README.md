# Heirloom staging infrastructure

Next.js **Node server** on a `t4g.micro` EC2 instance at
`https://heirloom-staging.storywriter.net`, behind nginx with Let's Encrypt SSL.
This replaces the previous static export (S3 + CloudFront). See
`HEIRLOOM_HOSTING.md` ("Node server: EC2 vs. ECS") at the storywriter repo root
for the decision and rationale, and Fizzy #71/#72.

The layout mirrors `backend/terraform`: a reusable module under
`terraform/modules/heirloom-server/` plus thin per-environment wrappers under
`terraform/environments/<env>/`. This directory (`environments/staging/`) wires
`terraform.tfvars` into that module; `environments/prod/` is the same shape,
ready to fill in.

The module follows `backend/terraform/modules/storywriter-server`, minus
PostgreSQL/PHP/Composer/SSM, since Heirloom is a rendering layer only — all data,
auth, and secrets live in the Laravel backend, and `NEXT_PUBLIC_*` values are baked
in at build time.

Files in this env: `backend.tf` (S3 state config), `main.tf` (provider + variable
declarations + module call), `outputs.tf`, and a gitignored `terraform.tfvars` you
create. The provisioning script (`user-data.sh`) and resources live in the module.

State lives in the shared bucket `storywriter-terraform-state-548846592016` under
`heirloom-staging/terraform.tfstate` (see the note in `backend.tf` on why the key
keeps the old name), with S3-native locking (`use_lockfile`).

## Cutover from the static setup

The S3 backend key is **unchanged** from the static-export revision, so the first
`apply` of this revision *is* the cutover in a single step:

- **Destroys:** the S3 bucket, CloudFront distribution + OAC + url-rewrite
  function, and the ACM certificate.
- **Creates:** the EC2 instance, its security group, an Elastic IP, and repoints
  the same `heirloom-staging.storywriter.net` Route 53 record from the CloudFront
  alias to the instance's Elastic IP.

Because it is one `apply`, expect a short window where the site is unreachable
while the instance provisions and the first app deploy runs. This is staging, so
that is acceptable; for production, provision the instance first and cut DNS over
after verifying it, rather than doing both in one apply.

## One-time setup

1. **Deploy keypair.** Generate a keypair dedicated to Heirloom (don't reuse the
   backend's):

   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/heirloom-staging-deploy -C heirloom-staging-deploy
   ```

   - Public half → `github_actions_public_key` in `terraform.tfvars`.
   - Private half → the heirloom repo's `staging` GitHub environment as the
     `SSH_PRIVATE_KEY` secret.

2. **`terraform.tfvars`** (gitignored) — create it with the required inputs
   declared in `variables.tf` (the ones with no default):

   ```hcl
   vpc_id                    = "vpc-..."
   subnet_id                 = "subnet-..."
   key_pair_name             = "storywriter-staging-ec2-tf" # EC2 login keypair
   route53_zone_id           = "Z0402623XN8X8KI30YSL"        # storywriter.net zone
   admin_email               = "web@almerindo.net"           # Let's Encrypt
   allowed_ssh_cidrs         = ["0.0.0.0/0"]                  # prefer specific CIDRs
   github_actions_public_key = "ssh-ed25519 AAAA... heirloom-staging-deploy"
   ```

3. **GitHub `staging` environment** needs two secrets for the deploy workflow:
   - `SSH_PRIVATE_KEY` — private half of the deploy keypair (see step 1).
   - `STAGING_HOST` — the instance's public host, e.g.
     `heirloom-staging.storywriter.net` (or its Elastic IP).

   CI does **not** run Terraform (see below), so no AWS/OIDC secret is required
   by the workflow — infra is provisioned manually with the credentials you run
   `terraform` with locally.

## Provisioning

From this directory, with AWS credentials for the shared state bucket
(`export AWS_PROFILE=storywriter` for local runs):

```bash
terraform init -reconfigure   # -reconfigure: the backend's lock/profile settings
                              # changed from the original inline block
terraform plan                # should report NO changes for the already-live box
terraform apply
```

> **`moved.tf` (defensive, one-time):** a brief PR flattened the module into root
> resources. If that was never `apply`d — the normal case — the live box is still
> tracked as `module.heirloom_server.*`, `plan` shows no changes, and `moved.tf` is
> a no-op you can delete. If the flatten *was* applied, `moved.tf` moves the state
> back under the module. Either way, if a `plan` ever wants to **destroy and
> recreate** the instance, stop and reconcile the state addresses first.

Notes:

- `user-data.sh` installs Node 24, nginx, and certbot; writes the systemd unit
  (`heirloom-staging.service`) and nginx reverse-proxy config; creates the `deploy`
  user; and runs certbot. It finishes in a few minutes. Provisioning success is
  marked by `/var/lib/heirloom-provisioned`; failure by
  `/var/lib/heirloom-provisioning-failed` (tail `/var/log/user-data.log` to debug).
- The systemd service is *enabled* but won't start cleanly until the first deploy
  populates `/var/www/heirloom-staging/current`.
- If certbot ran before the Route 53 record propagated to the new Elastic IP,
  SSL may be missing — rerun `sudo certbot --nginx -d heirloom-staging.storywriter.net`
  on the box.

## Deploying the app

The normal path is CI: `.github/workflows/deploy-staging.yml` runs on every merge
to `main` (lint → build standalone → scp to the instance → flip `current` symlink
→ `systemctl restart` → verify). It is **SSH-only** — no Terraform runs in CI. The
instance is provisioned/updated manually with `terraform apply` from this
directory (same model as the backend); CI just ships the app to `STAGING_HOST`
using `SSH_PRIVATE_KEY`.

For a manual deploy from the repo root:

```bash
NEXT_PUBLIC_API_URL=https://staging-api.storywriter.net/api npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/
tar -czf heirloom.tar.gz -C .next/standalone .

HOST=heirloom-staging.storywriter.net   # DNS A record -> the instance's EIP
scp -i ~/.ssh/heirloom-staging-deploy heirloom.tar.gz deploy@"$HOST":/tmp/heirloom.tar.gz
ssh -i ~/.ssh/heirloom-staging-deploy deploy@"$HOST" '
  set -e
  R=/var/www/heirloom-staging/releases/manual-$(date +%s)
  mkdir -p "$R" && tar -xzf /tmp/heirloom.tar.gz -C "$R"
  ln -sfn "$R" /var/www/heirloom-staging/current
  sudo systemctl restart heirloom-staging'
```

`NEXT_PUBLIC_API_URL` is baked in at build time — a staging build must be built
pointing at the staging Laravel API; there is no runtime override.

## Layout

- `/var/www/heirloom-staging/releases/<sha>/` — each deploy's standalone bundle
  (`server.js`, `.next/`, pruned `node_modules/`, `public/`).
- `/var/www/heirloom-staging/current` → symlink to the live release.
- systemd runs `node server.js` from `current`, bound to `127.0.0.1:3000`; nginx
  proxies `:80/:443` to it.

## Verifying

```bash
curl -sI https://heirloom-staging.storywriter.net/         # 200 (SSR home)
curl -sI https://heirloom-staging.storywriter.net/login    # 200 (SSR login)
curl -sI http://heirloom-staging.storywriter.net/          # 301 -> https (certbot redirect)
```

## Production

`../prod/` is the same wiring against the same module, pre-scaffolded but not yet
applied. Before standing it up: set `domain_name` (no default — confirm the prod
hostname) and the other required inputs in `../prod/terraform.tfvars`, generate a
prod-specific deploy keypair, and add a gated prod deploy workflow (the staging
workflow deploys on merge to `main`; prod should trigger on `v*` tags, like the
backend's `deploy-prod.yml`). See the header comment in `../prod/main.tf`.
