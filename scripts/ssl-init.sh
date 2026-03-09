#!/bin/bash
# Obtain initial Let's Encrypt certificate for the domain.
# Usage: bash ssl-init.sh DOMAIN EMAIL
# Run once after DNS is pointed at the server.

set -euo pipefail

DOMAIN="${1:?Usage: $0 DOMAIN EMAIL}"
EMAIL="${2:?Usage: $0 DOMAIN EMAIL}"

# Temporarily stop Nginx so certbot can bind port 80
systemctl stop nginx || true

certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN"

# Replace placeholder in nginx config
NGINX_CONF="/opt/lingua-pro/nginx/conf.d/lingua.conf"
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "$NGINX_CONF"

# Copy nginx config into place and restart
cp /opt/lingua-pro/nginx/nginx.conf /etc/nginx/nginx.conf
cp /opt/lingua-pro/nginx/conf.d/lingua.conf /etc/nginx/conf.d/lingua.conf
nginx -t
systemctl start nginx

# Auto-renewal cron (certbot renews 30 days before expiry)
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -

echo "SSL certificate obtained for $DOMAIN."
echo "Nginx configured and auto-renewal scheduled."
