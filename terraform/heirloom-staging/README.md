# Heirloom staging infrastructure

Static Next.js export served from a private S3 bucket behind CloudFront at
`https://heirloom-staging.storywriter.net`. Same pattern as
`frontend/terraform/frontend-staging/`, with three differences:

- A CloudFront Function (`url-rewrite.js`) maps clean URLs to the export's per-route
  `.html` files (`/login` → `/login.html`) — this is a multi-page export, not a SPA.
- Missing paths return a real 404 (`/404.html`), not the SPA 404→index.html rewrite.
- The cache behavior uses the managed `CachingOptimized` cache policy instead of the
  deprecated `forwarded_values` block.

State lives in the shared bucket `storywriter-terraform-state-548846592016` under
`heirloom-staging/terraform.tfstate`, locked via DynamoDB table `storywriter-terraform-locks`.

## Provisioning

From this directory, with AWS credentials that can reach the shared state bucket:

```bash
terraform init
terraform plan     # expect ~10 resources: S3 bucket + policy + public-access block,
                   # CloudFront distribution + OAC + function, ACM cert + validation,
                   # Route 53 alias + validation records
terraform apply
```

Notes:

- The ACM validation resource waits for DNS to propagate; first apply typically takes a
  few minutes (plus 5–15 min for the CloudFront distribution itself).
- Everything is in `us-east-1` (required for CloudFront certificates anyway).
- The `storywriter.net` hosted zone is read as a data source — it must already exist
  (it does; the other environments use it too).

## Deploying the app

The normal path is CI: `.github/workflows/deploy-staging.yml` runs on every merge to `main`
(lint → terraform plan/apply → build → S3 sync → CloudFront invalidation → verify). It
authenticates via OIDC using the `AWS_ROLE_ARN` secret in the repo's `staging` environment —
that IAM role's trust policy must include `repo:storywriter-labs/heirloom:*`.

For a manual deploy, build the static export (requires `output: 'export'` in `next.config.ts`, already set):

```bash
cd ../..   # heirloom repo root
NEXT_PUBLIC_API_URL=<staging API URL>/api npm run build
```

`NEXT_PUBLIC_API_URL` is baked in at build time — a staging build must be built pointing
at the staging Laravel API; there is no runtime override.

Then sync the `out/` directory and invalidate CloudFront:

```bash
aws s3 sync out/ s3://storywriter-staging-heirloom --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform -chdir=terraform/heirloom-staging output -raw cloudfront_distribution_id)" \
  --paths "/*"
```

(`--delete` removes stale hashed `_next/` assets; users mid-session on an old build will
refetch after the invalidation.)

## Verifying

```bash
curl -sI https://heirloom-staging.storywriter.net/            # 200, index page
curl -sI https://heirloom-staging.storywriter.net/login       # 200 via url-rewrite fn
curl -sI https://heirloom-staging.storywriter.net/nope        # 404, /404.html body
```
