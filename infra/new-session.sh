#!/usr/bin/env bash
# Run this at the start of EVERY AWS Academy Learner Lab session (sudo bash infra/new-session.sh).
# Why: each time the lab starts, the EC2 instance gets a NEW public IP address.
# This script points the control panel at the new IP, checks every service is up,
# and prints the new addresses (including the GitHub webhook URL you must update).
set -euo pipefail

IP="$(curl -fs -m 5 https://checkip.amazonaws.com || true)"
if [ -z "$IP" ]; then echo "Could not detect the public IP. Is the instance online?"; exit 1; fi

echo "Public IP this session: $IP"

# 1. Control panel: update its addresses and restart it
if [ -f /etc/shopsphere-panel.env ]; then
  sed -i "s|^APP_PUBLIC_URL=.*|APP_PUBLIC_URL=http://${IP}|" /etc/shopsphere-panel.env
  sed -i "s|^JENKINS_PUBLIC_URL=.*|JENKINS_PUBLIC_URL=http://${IP}:8080|" /etc/shopsphere-panel.env
  systemctl restart shopsphere-panel
  # Re-publish the panel on port 80 at /deploy/ (points Traefik at this server's private IP, port 5000)
  REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  NODE_IP="$(hostname -I | awk '{print $1}')"
  if [ -f "$REPO_DIR/k8s/panel-ingress.yaml" ]; then
    kubectl apply -f "$REPO_DIR/k8s/namespace.yaml" >/dev/null
    sed "s|NODE_IP|${NODE_IP}|g" "$REPO_DIR/k8s/panel-ingress.yaml" | kubectl apply -f - >/dev/null \
      || echo "WARNING: could not apply k8s/panel-ingress.yaml"
  fi
else
  echo "WARNING: control panel not installed yet (run infra/install-control-panel.sh)."
fi

# 2. Jenkins: update its own URL setting (used in links)
CFG=/var/lib/jenkins/jenkins.model.JenkinsLocationConfiguration.xml
if [ -f "$CFG" ]; then
  sed -i "s|<jenkinsUrl>.*</jenkinsUrl>|<jenkinsUrl>http://${IP}:8080/</jenkinsUrl>|" "$CFG"
fi

# 3. Wait for everything to come up after the restart
echo -n "Waiting for Jenkins"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 3 http://localhost:8080/login || true)
  [ "$code" = "200" ] && break
  echo -n "."; sleep 3
done
echo
echo -n "Waiting for the shop"
for i in $(seq 1 60); do
  curl -fs -m 3 http://localhost/api/health >/dev/null 2>&1 && break
  echo -n "."; sleep 3
done
echo

status() { if eval "$2" >/dev/null 2>&1; then echo "  [OK]   $1"; else echo "  [FAIL] $1"; fi; }
echo "Service check:"
status "Docker"            "systemctl is-active --quiet docker"
status "Jenkins"           "curl -fs -m 3 -o /dev/null http://localhost:8080/login"
status "Kubernetes (k3s)"  "kubectl get nodes | grep -q ' Ready'"
status "Shop website"      "curl -fs -m 3 http://localhost/api/health"
status "Control panel"     "curl -fs -m 3 http://localhost:5000/api/config"
status "Panel on port 80"  "curl -fs -m 3 http://localhost/deploy/api/config"

cat <<EOF

==================================================================
 Addresses for this session
   Website (give to faculty):   http://${IP}
   Deploy Now control panel:     http://${IP}/deploy/   (backup: http://${IP}:5000)
   Jenkins:                      http://${IP}:8080

 ACTION NEEDED: update the GitHub webhook Payload URL to
   http://${IP}:8080/github-webhook/
 (GitHub repo > Settings > Webhooks > Edit), or with the GitHub CLI:
   gh api repos/<owner>/<repo>/hooks --jq '.[].id'
   gh api -X PATCH repos/<owner>/<repo>/hooks/<id> -f config[url]=http://${IP}:8080/github-webhook/ -f config[content_type]=json
==================================================================
EOF
