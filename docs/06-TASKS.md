# 06 – Task list for Claude Code

Work top to bottom. Tick each box (`- [x]`) in this file as you finish it and commit the file, so progress survives
between sessions. After each phase, summarise for the student in 3–5 plain sentences what was done and why.

## Phase 0 – Understand
- [x] Read `CLAUDE.md`, `MY_DETAILS.md`, `docs/01` to `docs/05`.
- [x] Ask the student for any blank field in `MY_DETAILS.md` that the next phases need (GitHub user, Docker Hub user,
      demo admin password, names for the README). Write the answers into `MY_DETAILS.md`.
- [x] Confirm the laptop tools: `git --version`, `node --version` (22+ recommended), `ssh -V`, optional `gh --version`.
      If Node is missing, local tests can be skipped: Jenkins runs them inside Docker anyway.

## Phase 1 – Personalise and verify locally
- [x] Set `DOCKER_IMAGE` in `Jenkinsfile` to `alishri/shopsphere`. (done)
- [x] Set `k8s/secret.yaml`: random `JWT_SECRET`, demo `ADMIN_PASSWORD`, `ADMIN_EMAIL`. (done: admin password ShopDemo@2026)
- [x] Add a "Team" section to `README.md` (title, names, roll numbers, college, guide).
- [x] `cd backend && npm install && npm test` → 16 passed.
- [x] `cd frontend && npm install && npm run build` → success.
- [ ] (skipped, optional) Optional local run: backend `npm start` + frontend `npm run dev`, open http://localhost:5173 and click through.
- [x] `git status` shows no `node_modules`, `dist`, `.pem` or `.env` files staged.

## Phase 2 – GitHub
- [ ] Create the public repo and push `main` (docs/05 A3).
- [ ] Confirm on GitHub that `Jenkinsfile`, `Dockerfile`, `k8s/`, `control-panel/`, `infra/` are present.

## Phase 3 – AWS server (student clicks, then you)
- [ ] Give the student docs/05 A4 steps; wait for the IP and PEM path.
- [ ] Test SSH: `ssh -i <pem> ubuntu@<ip> "uname -a"`. (Windows: use the built-in OpenSSH in PowerShell. If it says the
      key permissions are too open, run `icacls <pem> /inheritance:r /grant:r "%USERNAME%:R"`.)
- [ ] Run `infra/setup-server.sh` on the server (docs/05 A5). Verify node Ready, Jenkins and Docker active.
- [ ] Give the student the Jenkins initial admin password.

## Phase 4 – Jenkins (student clicks)
- [ ] Give the student docs/05 A6 steps 1–7; wait for "done".
- [ ] Ask the student for the Jenkins username and API token (A6.8) in the chat.
- [ ] Watch the first build: `curl -s -u <u>:<t> http://<ip>:8080/job/shopsphere/lastBuild/api/json?tree=building,result`
      and the console text. Fix any failure (docs/07) and re-trigger:
      `curl -X POST -u <u>:<t> http://<ip>:8080/job/shopsphere/build`.
- [ ] Verify pods, ingress and `http://<ip>` (docs/05 A7).

## Phase 5 – One-click panel and webhook
- [ ] Install the control panel (docs/05 A8). Check `/api/config` → `configured: true`, `/api/app` → `up: true`.
- [ ] Create the GitHub webhook (docs/05 A9). Check delivery: `gh api repos/butterfly0404/shopsphere/hooks/<id>/deliveries --jq '.[0].status_code'` → 200.
- [ ] Student clicks **Deploy Now** on `http://<ip>:5000`; confirm six green stages and auto-open of `http://<ip>`.

## Phase 6 – Prove every requirement
- [ ] Git trigger: change the hero subtitle, push, build starts without a click, footer version goes up.
- [ ] Safety: change `toBe(847)` to `toBe(848)` in `backend/tests/api.test.js`, push → pipeline stops at **Test**,
      `http://<ip>` still serves the previous version. Revert, push → green again.
- [ ] Rollback: click **Rollback to previous version** on the panel → footer version goes back.
- [ ] Persistence: place an order, deploy again, the order is still in My Orders.
- [ ] Scaling demo: `sudo kubectl -n shopsphere scale deployment shopsphere --replicas=3`, refresh the site to see
      different pod names, then scale back to 2.
- [ ] Tick every box in `docs/01-REQUIREMENTS.md` → Acceptance checklist.

### Optional Phase 6B – Automate the Jenkins web-UI steps (only if the student asks)
Goal: `sudo bash infra/configure-jenkins.sh` performs docs/05 A6 without clicks. Suggested approach, which you must test
on the real server before relying on it:
- systemd override for Jenkins: `Environment="JAVA_OPTS=-Djava.awt.headless=true -Djenkins.install.runSetupWizard=false"`
- install plugins with the Jenkins Plugin Installation Manager jar (`--war /usr/share/java/jenkins.war
  --plugin-download-directory /var/lib/jenkins/plugins --plugins git github workflow-aggregator pipeline-stage-view credentials-binding`)
- Groovy scripts in `/var/lib/jenkins/init.groovy.d/` to create the admin user (HudsonPrivateSecurityRealm +
  FullControlOnceLoggedInAuthorizationStrategy), the `dockerhub-creds` credential (read the token from an env var or a
  root-only file, never from Git), the `shopsphere` pipeline job (CpsScmFlowDefinition + GitSCM + GitHubPushTrigger),
  and an API token written to a root-only file for `install-control-panel.sh`.
- Delete the init scripts that contain secrets after the first successful start.
Keep the manual path in docs/05 working as the fallback.

## Phase 7 – Hand-over
- [ ] Update `README.md` with the final architecture and the student's run steps (keep it accurate to what was done).
- [ ] Walk the student through `docs/07-DEMO-AND-TROUBLESHOOTING.md` once, end to end.
- [ ] Remind the student: **End Lab** after each session; run docs/05 Part B at the start of the next one.
