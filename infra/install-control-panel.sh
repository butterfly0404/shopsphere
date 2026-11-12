#!/usr/bin/env bash
# Installs the "Deploy Now" control panel as a service on port 5000.
# Run from the repo folder on the server:
#   sudo JENKINS_USER=admin JENKINS_API_TOKEN=<token> bash infra/install-control-panel.sh
set -euo pipefail

if [ -z "${JENKINS_USER:-}" ] || [ -z "${JENKINS_API_TOKEN:-}" ]; then
  echo "Usage: sudo JENKINS_USER=<jenkins user> JENKINS_API_TOKEN=<api token> bash infra/install-control-panel.sh"
  echo "Create the token in Jenkins: your name (top right) > Security > API Token > Add new token"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_IP="$(curl -fs -m 3 https://checkip.amazonaws.com || hostname -I | awk '{print $1}')"

install -d /opt/shopsphere-panel/public
install -m 644 "$REPO_DIR/control-panel/server.js" /opt/shopsphere-panel/server.js
install -m 644 "$REPO_DIR/control-panel/public/index.html" /opt/shopsphere-panel/public/index.html

cat > /etc/shopsphere-panel.env <<EOF
PORT=5000
JENKINS_URL=http://localhost:8080
JENKINS_USER=${JENKINS_USER}
JENKINS_API_TOKEN=${JENKINS_API_TOKEN}
JOB_NAME=${JOB_NAME:-shopsphere}
APP_HEALTH_URL=http://localhost/api/health
APP_PUBLIC_URL=http://${PUBLIC_IP}
JENKINS_PUBLIC_URL=http://${PUBLIC_IP}:8080
EOF
chmod 600 /etc/shopsphere-panel.env

cat > /etc/systemd/system/shopsphere-panel.service <<'EOF'
[Unit]
Description=ShopSphere Deploy Control Panel
After=network-online.target jenkins.service

[Service]
EnvironmentFile=/etc/shopsphere-panel.env
ExecStart=/usr/bin/node /opt/shopsphere-panel/server.js
Restart=always
User=nobody
WorkingDirectory=/opt/shopsphere-panel

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now shopsphere-panel
systemctl restart shopsphere-panel
echo "Control panel running: http://${PUBLIC_IP}:5000"
