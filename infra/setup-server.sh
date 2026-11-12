#!/usr/bin/env bash
# One-time server setup for ShopSphere (Ubuntu 24.04 or 22.04, run as root: sudo bash setup-server.sh)
# Installs: Docker, Jenkins (Java 21), Node.js 22 (for the control panel), k3s (lightweight Kubernetes).
# Run it once over SSH after launching the EC2 instance (Claude Code can do this for you).
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

# ---- 2 GB swap: Jenkins + Kubernetes + Docker builds need some headroom on a 4 GB machine ----
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update
apt-get install -y ca-certificates curl gnupg git fontconfig openjdk-21-jre-headless

# ---- Docker ----
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# ---- Jenkins (LTS) ----
if ! command -v jenkins >/dev/null && [ ! -d /var/lib/jenkins ]; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key -o /etc/apt/keyrings/jenkins-keyring.asc
  echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
    > /etc/apt/sources.list.d/jenkins.list
  apt-get update
  apt-get install -y jenkins
fi
usermod -aG docker jenkins          # let Jenkins run docker build / push

# ---- Node.js 22 (runs the Deploy Now control panel) ----
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# ---- k3s: lightweight Kubernetes on this same server ----
if ! command -v k3s >/dev/null; then
  curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--write-kubeconfig-mode 644" sh -
fi
# Give Jenkins its own kubeconfig so the pipeline can run kubectl
mkdir -p /var/lib/jenkins/.kube
cp /etc/rancher/k3s/k3s.yaml /var/lib/jenkins/.kube/config
chown -R jenkins:jenkins /var/lib/jenkins/.kube
chmod 600 /var/lib/jenkins/.kube/config

systemctl restart jenkins

set +x
echo "=================================================================="
echo " Setup complete."
echo " Jenkins:  http://<this-server-public-ip>:8080"
echo " Initial Jenkins admin password:"
cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null || echo " (Jenkins is still starting; run: sudo cat /var/lib/jenkins/secrets/initialAdminPassword)"
echo " Check Kubernetes: sudo kubectl get nodes"
echo "=================================================================="
