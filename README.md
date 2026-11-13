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

The website footer shows the running **version** and **Kubernetes pod**, so every deployment is visible.

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

## Run it

- **Full deployment on AWS Academy:** follow [`docs/05-DEPLOY-AWS-ACADEMY.md`](docs/05-DEPLOY-AWS-ACADEMY.md).
- **With Claude Code:** see [`START_HERE.md`](START_HERE.md).
- **Locally (no Docker needed):**
  ```bash
  cd backend && npm install && npm test && npm start     # API on :3000, in-memory data
  cd frontend && npm install && npm run dev              # UI on http://localhost:5173
  ```
  Default admin: `admin@shopsphere.com` / value of `ADMIN_PASSWORD` (`admin123` locally).

## Links after deployment

| What | Address |
| --- | --- |
| Shop | `http://<server-ip>` |
| Deploy Now control panel | `http://<server-ip>/deploy/` (backup `http://<server-ip>:5000`) |
| Jenkins | `http://<server-ip>:8080` |

Demo script and troubleshooting: [`docs/07-DEMO-AND-TROUBLESHOOTING.md`](docs/07-DEMO-AND-TROUBLESHOOTING.md).
