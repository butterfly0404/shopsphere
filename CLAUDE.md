# CLAUDE.md – Instructions for Claude Code

You are helping a student finish and deploy **ShopSphere**, a college DevOps project.
The application code is already written and tested. Your job is to: personalise it, verify it, push it to GitHub,
deploy it on an AWS Academy Learner Lab EC2 server, and make sure every requirement below is demonstrably met.

Read these before doing anything:
1. `MY_DETAILS.md` – the student's details (usernames, passwords, names). Ask the student for anything still blank.
2. `docs/06-TASKS.md` – the ordered task list. Work through it phase by phase and tick items off.
3. The other files in `docs/` when a task points to them.

## The assignment (hard requirements – never drop any of these)

| # | Requirement | How it is met |
| --- | --- | --- |
| R1 | AWS cloud is mandatory | One EC2 instance (Ubuntu 24.04, t3.medium, us-east-1) in AWS Academy Learner Lab |
| R2 | Git is mandatory | Code in a GitHub repo; a push triggers Jenkins via webhook (pollSCM backup) |
| R3 | Jenkins is mandatory | `Jenkinsfile` declarative pipeline runs every step |
| R4 | Exactly two of Terraform / Ansible / Docker / Kubernetes | **Docker + Kubernetes (k3s)**. Do NOT add Terraform or Ansible |
| R5 | Automated deployment | No manual step between trigger and live site |
| R6 | Dynamic application, not static | Express API + MongoDB: login, catalogue, cart, orders, admin |
| R7 | Pipeline must be triggered from Git | GitHub webhook → Jenkins `githubPush()` |
| R8 | Open the app directly by IP | `http://<public-ip>` (port 80 via k3s Traefik Ingress). `:30080` NodePort is a backup |
| R9 | One button for faculty starts everything and opens the site | Control panel `http://<ip>:5000` → **Deploy Now** → pipeline → auto-opens the site |
| R10 | Good-looking but not over-animated frontend | React UI in `frontend/`, subtle hover effects only |

## Fixed decisions (do not change without the student asking)

- Stack: React 18 + Vite (frontend), Node.js 22 + Express 4 + Mongoose 8 (backend), MongoDB 7, Jest + Supertest.
- One Docker image serves both frontend and API (multi-stage `Dockerfile`; target `test` runs the tests).
- Kubernetes = k3s on the same EC2 instance as Jenkins. Namespace `shopsphere`.
- Images go to Docker Hub as `<dockerhub-user>/shopsphere:v<BUILD_NUMBER>` and `:latest`.
- Jenkins job name `shopsphere`; Docker Hub credential ID `dockerhub-creds`.
- Pipeline stage names are a contract with the control panel – keep exactly:
  `Checkout`, `Test`, `Build Image`, `Push Image`, `Deploy`, `Health Check`, `Rollback`.
- The control panel has zero npm dependencies (plain Node `http`), runs as systemd service `shopsphere-panel`.
- Currency is Indian Rupees (₹). Free shipping from ₹999, otherwise ₹49.

## Repository map

```
backend/           Express API. src/app.js (routes), server.js (startup), seed.js, store/{mongo,memory}.js
backend/tests/     Jest + Supertest (16 tests). Must stay green.
frontend/          React app. src/pages/*, src/components/*, src/context/AppContext.jsx, src/styles.css
Dockerfile         stages: frontend, deps, test, runtime
k8s/               namespace, secret, mongo (PVC), app (Deployment x2 + NodePort 30080), ingress (port 80)
Jenkinsfile        CI/CD pipeline
control-panel/     Deploy Now page: server.js + public/index.html
infra/             setup-server.sh (one-time install), install-control-panel.sh, new-session.sh (every lab session)
docs/              specs, runbook, task list, demo script
```

## Commands

```bash
# Backend
cd backend && npm install && npm test        # all 16 tests must pass
npm start                                    # :3000, in-memory data when MONGO_URI is unset
# Frontend
cd frontend && npm install && npm run build  # must build without errors
npm run dev                                  # :5173, proxies /api to :3000
# Server (over SSH, as ubuntu user)
sudo bash infra/setup-server.sh
sudo JENKINS_USER=<u> JENKINS_API_TOKEN=<t> bash infra/install-control-panel.sh
sudo bash infra/new-session.sh               # at the start of every Learner Lab session
sudo kubectl -n shopsphere get pods,svc,ingress
```

SSH: `ssh -i <path-to-labsuser.pem> ubuntu@<public-ip>` (key path is in `MY_DETAILS.md`; on macOS/Linux run `chmod 400` on it first).
To run repo scripts on the server: `git clone` the student's repo there (or `git pull` if already cloned).

## Environment facts: AWS Academy Learner Lab

- Only **us-east-1** and us-west-2 work. Use **us-east-1**. Key pair **vockey** (PEM downloadable from the lab's "AWS Details").
- A lab session lasts **4 hours**; when it ends, instances STOP (data is kept). Next session they start again.
- **The public IP changes every session.** Run `sudo bash infra/new-session.sh` and update the GitHub webhook URL.
- Budget is limited ($50). Never create extra instances, load balancers, NAT gateways, EKS, RDS or Elastic IPs.
- Instance: `t3.medium`, 30 GB gp3. Security group inbound TCP: 22, 80, 8080, 5000 (30080 optional).

## What you can and cannot do

- You CAN: edit code, run tests/builds locally, git commit/push, SSH into the server and run scripts, run kubectl,
  use `gh` (GitHub CLI) if the student is logged in (e.g. create the repo, add/update the webhook).
- You CANNOT: click in the AWS console, the Learner Lab page, Jenkins' web UI, or Docker Hub's website.
  For those steps, give the student short numbered instructions (copy them from `docs/05-DEPLOY-AWS-ACADEMY.md`)
  and wait for them to confirm before continuing.
- Optional (only if the student agrees): automate the Jenkins web-UI steps on the server (see docs/06-TASKS.md, Phase 6 option B).

## Rules

- Never commit real secrets: Docker Hub tokens, Jenkins API tokens and `.pem` keys stay out of Git.
  (`k8s/secret.yaml` holds demo-only values: tell the student not to reuse a real password there.)
- Keep all 16 tests passing; add tests for any new backend behaviour.
- Keep the UI calm: no heavy animation libraries. Keep the existing look (indigo accent, white cards).
- After any change to `Jenkinsfile`, `k8s/`, `control-panel/` or `infra/`, re-read `docs/04-PIPELINE-SPEC.md` and keep the contract.
- Explain to the student, in simple words, what you did after each phase. They are learning DevOps.

## Definition of done

All boxes in `docs/01-REQUIREMENTS.md` → "Acceptance checklist" are ticked, verified on the real server:
the faculty can open `http://<ip>:5000`, click **Deploy Now**, watch six green stages, and land on the live shop
at `http://<ip>`; a `git push` deploys by itself; a failing test blocks the deploy; rollback works.
