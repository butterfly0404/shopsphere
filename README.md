# ShopSphere – Automated CI/CD Deployment of an E-Commerce Application

ShopSphere is a full-stack online store (React + Node.js + MongoDB) delivered by a fully automated pipeline on AWS:

**Git push or one button click → Jenkins → tests → Docker image → Docker Hub → Kubernetes → live website at `http://<server-ip>` (opens automatically).**

## Team
| | |
| --- | --- |
| Team | Alishri Poddar (RA2311003010155) |
| College / Dept. | SRM Institute Of Science And Technology – Department of Computing Technologies |
| Guide | Dr. Deeban V Chakravarthy |
| Submitted | 13-11-2026 |

## Requirements covered

| Requirement | Implementation |
| --- | --- |
| AWS cloud (mandatory) | EC2 t3.medium, Ubuntu 24.04, us-east-1 (AWS Academy Learner Lab) |
| Git (mandatory) | GitHub repository; every push triggers the pipeline through a webhook |
| Jenkins (mandatory) | Declarative `Jenkinsfile` with 6 stages + rollback |
| Two DevOps tools | **Docker** (multi-stage build, tests in Docker, versioned images on Docker Hub) and **Kubernetes** (k3s: 2 app replicas, MongoDB with persistent volume, Ingress on port 80) |
| Dynamic application | Accounts, catalogue, cart, checkout, order tracking, admin dashboard, all stored in MongoDB |
| Automated deployment | No manual step between trigger and live site; health-checked; automatic rollback on failure |
| Opens by IP address | `http://<server-ip>` |
| One-click deploy for faculty | Control panel `http://<server-ip>/deploy/` → **Deploy Now** → live stages → website opens |

## How it works

```
Developer ──git push──▶ GitHub ──webhook──▶ Jenkins ◀──Deploy Now── Control panel (/deploy/)
                                              │
       Checkout → Test → Build Image → Push Image → Deploy → Health Check
                          (Docker)    (Docker Hub)   (Kubernetes)
                                              │
                Visitor ──http://<ip>──▶ Ingress :80 ──▶ 2 app pods ──▶ MongoDB
```

| Stage | What happens | On failure |
| --- | --- | --- |
| Checkout | Latest commit from GitHub | stop |
| Test | `docker build --target test` runs 16 API tests | stop, nothing deployed |
| Build Image | `alishri/shopsphere:v<build>` (frontend + API in one image) | stop |
| Push Image | Push `v<build>` and `latest` to Docker Hub | stop |
| Deploy | Apply namespace, secret, MongoDB, app (new image), ingress | automatic rollback |
| Health Check | Rollout finished and `http://localhost/api/health` reports the new version | automatic rollback |

If the new version fails the Health Check, the **Rollback** stage puts the previous version back automatically.
The control panel also has a **Rollback to previous version** button.

The website footer shows the running **version** and **Kubernetes pod**, so every deployment is visible.

## Final architecture

Everything runs on **one EC2 instance** (t3.medium, Ubuntu 24.04, 30 GB gp3, us-east-1). This keeps the
Learner Lab budget low: no load balancer, no Elastic IP, no managed Kubernetes.

```
                        EC2 instance (public IP changes every lab session)
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │  Jenkins :8080 ── docker build/push ──▶ Docker Hub (alishri/shopsphere:vN)    │
 │     │                                                                          │
 │     └── kubectl apply ──▶ k3s (namespace shopsphere)                           │
 │                             ├─ Traefik Ingress :80                             │
 │                             │    ├─ /         → service shopsphere → 2 pods    │
 │                             │    └─ /deploy/  → control panel                  │
 │                             ├─ NodePort :30080 (backup to the shop)            │
 │                             └─ mongo pod + 1 Gi persistent volume              │
 │  Control panel :5000 (systemd service shopsphere-panel, calls Jenkins API)     │
 └──────────────────────────────────────────────────────────────────────────────┘
   Security group inbound TCP: 22 (SSH), 80 (shop + panel), 8080 (Jenkins + webhook), 5000 (panel backup)
```

| Part | Details |
| --- | --- |
| App image | One image holds the React frontend and the Express API. Tags `v<BUILD_NUMBER>` and `latest` |
| App Deployment | 2 replicas, RollingUpdate with `maxUnavailable: 0`, so the old pods stay until the new ones are ready |
| Database | MongoDB 7 on a PersistentVolumeClaim, so orders and users survive redeploys and instance restarts |
| Triggers | GitHub webhook → `http://<ip>:8080/github-webhook/` (`githubPush()`), `pollSCM` as a backup, and the **Deploy Now** button |
| Secrets | Docker Hub token stored only in Jenkins (`dockerhub-creds`). `k8s/secret.yaml` has demo values only |

## Project structure

```
frontend/        React (Vite) store UI
backend/         Express API, MongoDB models, 16 Jest/Supertest tests
Dockerfile       multi-stage: frontend build, tests, runtime image
k8s/             namespace, secret, mongo (+PVC), app (Deployment + NodePort), ingress (port 80), panel-ingress (/deploy/)
Jenkinsfile      CI/CD pipeline
control-panel/   Deploy Now page (Node, no dependencies)
infra/           setup-server.sh, install-control-panel.sh, new-session.sh
docs/            requirements, architecture, specs, deployment runbook, tasks, demo + troubleshooting
CLAUDE.md        instructions for Claude Code; START_HERE.md for humans
```

## Links after deployment

Replace `<server-ip>` with the instance's public IP for **this** lab session.

| What | Address |
| --- | --- |
| Shop | `http://<server-ip>` (backup `http://<server-ip>:30080`) |
| Deploy Now control panel | `http://<server-ip>/deploy/` (backup `http://<server-ip>:5000`) |
| Jenkins | `http://<server-ip>:8080` (job `shopsphere`, Stage View) |

Store admin login: `admin@shopsphere.com` / `ShopDemo@2026` (demo value only).

## Run it

### Every lab session (about 5 minutes)

1. Learner Lab → **Start Lab** → wait for the green dot → **AWS** → EC2 → Instances.
   If the instance shows *stopped*: **Instance state → Start**. Copy the **new public IP**.
2. Bring everything back on the new IP. From the laptop over SSH:
   ```bash
   ssh -i <path-to-labsuser.pem> ubuntu@<new-ip> "cd shopsphere && git pull && sudo bash infra/new-session.sh"
   ```
   All six checks should say `[OK]`.
   **If SSH is blocked** (common on college Wi-Fi, or `Connection timed out`), use the browser instead:
   EC2 → select the instance → **Connect** → **EC2 Instance Connect** → **Connect**, then run:
   ```bash
   cd ~/shopsphere && git pull && sudo bash infra/new-session.sh
   ```
3. Point the GitHub webhook at the new IP:
   ```bash
   gh api repos/butterfly0404/shopsphere/hooks --jq '.[0].id'
   gh api -X PATCH repos/butterfly0404/shopsphere/hooks/<id> -f config[url]=http://<new-ip>:8080/github-webhook/ -f config[content_type]=json
   ```
   (Without `gh`: repo **Settings → Webhooks** → edit the Payload URL.)
4. Open `http://<new-ip>/deploy/` → **Deploy Now** → six green stages → the shop opens by itself.
5. When finished: **End Lab** (the instance stops, no data is lost).

### Deploy a change

Commit and `git push` to `main`. The webhook starts Jenkins, and the new version is live a few minutes later.
The footer version goes up. If a test fails, the pipeline stops at **Test** and the live site keeps the old version.

### First-time setup

Follow [`docs/05-DEPLOY-AWS-ACADEMY.md`](docs/05-DEPLOY-AWS-ACADEMY.md) Part A: launch the instance, run
`sudo bash infra/setup-server.sh`, set up Jenkins, install the panel with `infra/install-control-panel.sh` and add the webhook.
With Claude Code: see [`START_HERE.md`](START_HERE.md).

### Locally (no Docker needed)

```bash
cd backend && npm install && npm test && npm start     # API on :3000, in-memory data
cd frontend && npm install && npm run dev              # UI on http://localhost:5173
```
Local admin: `admin@shopsphere.com` / `admin123`.

### Useful server commands

```bash
sudo kubectl -n shopsphere get pods,svc,ingress
sudo kubectl -n shopsphere scale deployment shopsphere --replicas=3   # scaling demo, then back to 2
sudo systemctl status jenkins shopsphere-panel
```

Demo script and troubleshooting: [`docs/07-DEMO-AND-TROUBLESHOOTING.md`](docs/07-DEMO-AND-TROUBLESHOOTING.md).
