#!/bin/bash
set -e

# Log all output
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting provisioning at $(date)"

# Mark failure on any unexpected exit so a post-apply check can detect it.
trap 'echo "PROVISIONING FAILED at $(date) (exit $?, line $LINENO)"; touch /var/lib/heirloom-provisioning-failed' ERR

# Retry helper for flaky network operations (e.g. external apt/deb repos).
retry() {
    local n=1
    local max=10
    local delay=30
    while true; do
        "$@" && return 0
        if [ $n -ge $max ]; then
            echo "Command failed after $max attempts: $*"
            return 1
        fi
        n=$((n + 1))
        echo "Command failed, retrying ($n/$max) in $delay seconds: $*"
        sleep $delay
    done
}

# Variables from Terraform
DOMAIN_NAME="${domain_name}"
APP_NAME="${app_name}"
DEPLOY_BRANCH="${deploy_branch}"
APP_PORT="${app_port}"
APP_DIR="/var/www/$APP_NAME"
CURRENT_DIR="$APP_DIR/current"
RELEASES_DIR="$APP_DIR/releases"

# Make apt resilient to flaky mirrors.
cat > /etc/apt/apt.conf.d/99-retries << 'APT_RETRIES_EOF'
Acquire::Retries "15";
Acquire::Retries::Delay::Maximum "30";
Acquire::http::Timeout "30";
Acquire::https::Timeout "30";
APT_RETRIES_EOF

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y \
    curl \
    git \
    unzip \
    acl \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Node.js 24 (matches the CI build runtime — the standalone bundle is
# built on Node 24 in GitHub Actions, so the server runs the same major).
retry sh -c "curl -fsSL https://deb.nodesource.com/setup_24.x | bash -"
retry apt-get install -y nodejs
echo "Node $(node --version) / npm $(npm --version) installed"

# Application directories: releases/<sha> holds each deploy; `current` symlinks
# the live one so restarts and rollbacks are atomic.
mkdir -p "$RELEASES_DIR"
mkdir -p /var/www

# Create deploy user for GitHub Actions (and manual SSH)
useradd -m -s /bin/bash deploy || true
usermod -aG www-data deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
echo "${github_actions_public_key}" > /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# The deploy user owns the app tree so CI can write releases and flip the symlink.
chown -R deploy:www-data "$APP_DIR"
chmod -R 775 "$APP_DIR"

# systemd unit runs the Next.js standalone server from the `current` symlink.
# PORT/HOSTNAME bind it to localhost only; nginx is the public edge.
cat > /etc/systemd/system/$APP_NAME.service << SERVICE_EOF
[Unit]
Description=Heirloom Next.js server ($APP_NAME)
After=network.target

[Service]
Type=simple
User=deploy
Group=www-data
WorkingDirectory=$CURRENT_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable the service now; it will start on the first deploy once `current` exists.
systemctl daemon-reload
systemctl enable $APP_NAME.service

# Configure Nginx as a reverse proxy to the Node server
cat > /etc/nginx/sites-available/$APP_NAME << NGINX_EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${domain_name};

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        proxy_pass http://127.0.0.1:${app_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX_EOF

# Enable the site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Allow deploy user to manage the app service, reload nginx, and fix ownership
# of app releases without a password (least privilege).
cat > /etc/sudoers.d/deploy << SUDOERS_EOF
deploy ALL=(root) NOPASSWD: /bin/systemctl restart $APP_NAME
deploy ALL=(root) NOPASSWD: /bin/systemctl start $APP_NAME
deploy ALL=(root) NOPASSWD: /bin/systemctl stop $APP_NAME
deploy ALL=(root) NOPASSWD: /bin/systemctl reload nginx
deploy ALL=(root) NOPASSWD: /usr/bin/chown -R deploy\:www-data /var/www/$APP_NAME/*
SUDOERS_EOF
chmod 440 /etc/sudoers.d/deploy

# Set up SSL certificate with Let's Encrypt (nginx plugin adds the 443 server
# block and an HTTP->HTTPS redirect). Non-fatal so provisioning still completes
# if DNS hasn't propagated to the EIP yet — rerun certbot manually if so.
echo "==> Setting up SSL certificate for $DOMAIN_NAME..."
certbot --nginx \
  -d "$DOMAIN_NAME" \
  --non-interactive \
  --agree-tos \
  --email ${admin_email} \
  --redirect \
  || echo "WARNING: Certbot failed - SSL can be configured manually later (certbot --nginx -d $DOMAIN_NAME)"

echo "SSL certificate setup attempted"

echo "Provisioning completed at $(date)"
echo "App: $APP_NAME"
echo "Deploy Branch: $DEPLOY_BRANCH"
echo "Node port: $APP_PORT (nginx -> 127.0.0.1:$APP_PORT)"

# Final success marker — absence of this file means provisioning did not finish.
touch /var/lib/heirloom-provisioned
