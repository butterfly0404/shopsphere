#!/usr/bin/env bash
# Installs the "Deploy Now" control panel as a service on port 5000, and publishes it on port 80 at
# http://<server-ip>/deploy/ through the k3s Ingress (for networks that block port 5000).
# Run from the repo folder on the server:
#   First time:  sudo JENKINS_USER=<user> JENKINS_API_TOKEN=<token> bash infra/install-control-panel.sh
#   Re-install:  sudo bash infra/install-control-panel.sh   (reuses the user/token saved in /etc/shopsphere-panel.env)
set -euo pipefail

ENV_FILE=/etc/shopsphere-panel.env
# Reuse the saved Jenkins credentials when they are not given on the command line.
if [ -f "$ENV_FILE" ]; then
  [ -n "${JENKINS_USER:-}" ]      || JENKINS_USER="$(sed -n 's/^JENKINS_USER=//p' "$ENV_FILE")"
  [ -n "${JENKINS_API_TOKEN:-}" ] || JENKINS_API_TOKEN="$(sed -n 's/^JENKINS_API_TOKEN=//p' "$ENV_FILE")"
fi
if [ -z "${JENKINS_USER:-}" ] || [ -z "${JENKINS_API_TOKEN:-}" ]; then
  echo "Usage: sudo JENKINS_USER=<jenkins user> JENKINS_API_TOKEN=<api token> bash infra/install-control-panel.sh"
  echo "Create the token in Jenkins: your name (top right) > Security > API Token > Add new token"
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_IP="$(curl -fs -m 3 https://checkip.amazonaws.com || hostname -I | awk '{print $1}')"
NODE_IP="$(hostname -I | awk '{print $1}')"   # private IP: Traefik reaches the panel through it
BASE_PATH=/deploy
PANEL_URL="http://${PUBLIC_IP}${BASE_PATH}/"

install -d /opt/shopsphere-panel/public
install -m 644 "$REPO_DIR/control-panel/server.js" /opt/shopsphere-panel/server.js
install -m 644 "$REPO_DIR/control-panel/public/index.html" /opt/shopsphere-panel/public/index.html

cat > "$ENV_FILE" <<EOF
PORT=5000
BASE_PATH=${BASE_PATH}
JENKINS_URL=http://localhost:8080
JENKINS_USER=${JENKINS_USER}
JENKINS_API_TOKEN=${JENKINS_API_TOKEN}
JOB_NAME=${JOB_NAME:-shopsphere}
APP_HEALTH_URL=http://localhost/api/health
APP_PUBLIC_URL=http://${PUBLIC_IP}
JENKINS_PUBLIC_URL=http://${PUBLIC_IP}:8080
EOF
chmod 600 "$ENV_FILE"

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

# Publish the panel on port 80 at /deploy/ (Service + Endpoints -> this server's private IP:5000, plus an Ingress)
kubectl apply -f "$REPO_DIR/k8s/namespace.yaml"
sed "s|NODE_IP|${NODE_IP}|g" "$REPO_DIR/k8s/panel-ingress.yaml" | kubectl apply -f -

echo -n "Checking the panel"
OK_5000=no; OK_80=no
for i in $(seq 1 20); do
  curl -fs -m 3 -o /dev/null http://localhost:5000/api/config && OK_5000=yes
  curl -fs -m 3 -o /dev/null "http://localhost${BASE_PATH}/api/config" && OK_80=yes
  [ "$OK_5000" = yes ] && [ "$OK_80" = yes ] && break
  echo -n "."; sleep 2
done
echo
echo "  port 5000 (backup):  $([ "$OK_5000" = yes ] && echo '[OK]' || echo '[FAIL]')"
echo "  port 80 ${BASE_PATH}/:      $([ "$OK_80" = yes ] && echo '[OK]' || echo '[FAIL]')"
echo
echo "Control panel (give this to faculty): ${PANEL_URL}"
echo "Backup address:                      http://${PUBLIC_IP}:5000"
echo "PANEL_URL=${PANEL_URL}"
