# 05 – Deployment runbook (AWS Academy Learner Lab)

Each step is marked **[YOU]** (needs a browser click by the student) or **[CLAUDE]** (Claude Code does it from the
laptop terminal). Claude Code: show the [YOU] steps to the student word for word and wait for "done".

Placeholders: `<ip>` = instance public IP this session, `butterfly0404`, `alishri` = from `MY_DETAILS.md`.

---

## Part A – One-time setup (about 1.5–2 hours, mostly waiting)

### A1. Accounts [YOU]
1. GitHub account. Optional but helpful: install GitHub CLI and run `gh auth login`.
2. Docker Hub account → profile → **Account settings → Personal access tokens → Generate new token**
   (Read & Write). Copy the token somewhere private. **Do not paste it into any file.**

### A2. Personalise the code [CLAUDE]
1. Read `MY_DETAILS.md`; ask for missing values.
2. `Jenkinsfile`: `DOCKER_IMAGE = 'alishri/shopsphere'`.
3. `k8s/secret.yaml`: set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (demo value), and a random `JWT_SECRET`
   (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. README: add title, student names, college, guide.
5. Run `cd backend && npm install && npm test` and `cd frontend && npm install && npm run build`. Both must succeed.

### A3. GitHub repository [CLAUDE, or YOU if no `gh`]
- With gh: `gh repo create butterfly0404/shopsphere --public --source . --remote origin --push`
- Without gh: [YOU] create an empty **public** repo `shopsphere` on github.com (no README), then [CLAUDE]:
  `git init && git add . && git commit -m "ShopSphere initial commit" && git branch -M main &&
  git remote add origin https://github.com/butterfly0404/shopsphere.git && git push -u origin main`

### A4. Start the lab and launch the server [YOU]
1. AWS Academy → course → **Modules → Launch AWS Academy Learner Lab** → **Start Lab**. Wait until the dot is green.
2. **AWS Details → Download PEM** → save `labsuser.pem`; write its path in `MY_DETAILS.md`.
3. Click **AWS** (green dot) to open the console. Check the region (top right) is **N. Virginia (us-east-1)**.
4. EC2 → **Launch instance**:
   - Name `shopsphere`
   - AMI **Ubuntu Server 24.04 LTS** (64-bit x86)
   - Instance type **t3.medium**
   - Key pair **vockey**
   - Network settings → **Edit** → Create security group `shopsphere-sg`, inbound rules (Custom TCP, source 0.0.0.0/0):
     **22, 80, 8080, 5000** (optionally 30080)
   - Storage **30 GiB gp3**
   - **Launch instance**
5. Open the instance → copy **Public IPv4 address** → write it in `MY_DETAILS.md`.

### A5. Install the server software [CLAUDE]
```bash
chmod 400 <path>/labsuser.pem            # macOS/Linux only
ssh -i <path>/labsuser.pem -o StrictHostKeyChecking=accept-new ubuntu@<ip> \
  "git clone https://github.com/butterfly0404/shopsphere.git && cd shopsphere && sudo bash infra/setup-server.sh"
```
Takes 5–10 minutes. Then verify:
```bash
ssh -i <pem> ubuntu@<ip> "sudo kubectl get nodes && systemctl is-active jenkins docker && sudo cat /var/lib/jenkins/secrets/initialAdminPassword"
```
Give the printed **initial admin password** to the student.

### A6. Jenkins first-time setup [YOU]
1. Open `http://<ip>:8080`, paste the initial admin password.
2. **Install suggested plugins**, wait.
3. Create the admin user (note username + password in `MY_DETAILS.md`, username only). **Save and Finish → Start using Jenkins**.
4. **Manage Jenkins → Plugins → Available plugins** → search **Pipeline: Stage View** → tick → **Install**.
   Also confirm **GitHub** and **Git** plugins are installed (Installed plugins tab).
5. **Manage Jenkins → Credentials → System → Global credentials (unrestricted) → Add Credentials**:
   Kind *Username with password*, Username `alishri`, Password = Docker Hub access token, **ID `dockerhub-creds`** → Create.
6. **New Item** → name `shopsphere` → **Pipeline** → OK:
   - Triggers: tick **GitHub hook trigger for GITScm polling**
   - Pipeline: *Pipeline script from SCM* → SCM *Git* → Repository URL `https://github.com/butterfly0404/shopsphere.git`
     → Branch Specifier `*/main` → Script Path `Jenkinsfile` → **Save**
7. Click **Build Now**. First build takes 5–10 minutes.
8. Your name (top right) → **Security → API Token → Add new token → Generate** → copy the token and give it to Claude Code
   in the chat (not in a file).

### A7. Verify the first deployment [CLAUDE]
```bash
ssh -i <pem> ubuntu@<ip> "sudo kubectl -n shopsphere get pods,svc,ingress && curl -s http://localhost/api/health"
```
Then ask the student to open `http://<ip>`. If the build failed, read the console log:
`curl -s -u <jenkins-user>:<api-token> http://<ip>:8080/job/shopsphere/lastBuild/consoleText | tail -80`
and fix (see docs/07, Troubleshooting).

### A8. Install the control panel [CLAUDE]
```bash
ssh -i <pem> ubuntu@<ip> "cd shopsphere && git pull && sudo JENKINS_USER=<jenkins-user> JENKINS_API_TOKEN=<api-token> bash infra/install-control-panel.sh"
```
Verify `curl -s http://<ip>:5000/api/config` shows `"configured":true`.

### A9. GitHub webhook [CLAUDE with gh, else YOU]
- gh: `gh api repos/butterfly0404/shopsphere/hooks -f name=web -F active=true -f 'events[]=push' -f config[url]=http://<ip>:8080/github-webhook/ -f config[content_type]=json`
- Browser: repo **Settings → Webhooks → Add webhook** → Payload URL `http://<ip>:8080/github-webhook/`, content type
  `application/json`, *Just the push event* → Add. A green tick = working.

### A10. End-to-end test [CLAUDE + YOU]
1. [YOU] Open `http://<ip>:5000` → **Deploy Now** → six green stages → shop opens automatically.
2. [CLAUDE] Make a small visible change (e.g. hero subtitle in `frontend/src/pages/Home.jsx`), commit, push.
   Confirm a build starts by itself and the footer version increases.
3. [CLAUDE] Tick the acceptance checklist in `docs/01-REQUIREMENTS.md`.

---

## Part B – Every new lab session (about 5 minutes)

1. [YOU] Learner Lab → **Start Lab** → wait for green → AWS → EC2. The instance starts automatically
   (if it shows *stopped*, select it → **Instance state → Start**). Copy the **new public IP**.
2. [CLAUDE] `ssh -i <pem> ubuntu@<new-ip> "cd shopsphere && git pull && sudo bash infra/new-session.sh"`
   All five services should say `[OK]`.
3. [CLAUDE with gh] update the webhook URL:
   `gh api repos/butterfly0404/shopsphere/hooks --jq '.[0].id'` then
   `gh api -X PATCH repos/butterfly0404/shopsphere/hooks/<id> -f config[url]=http://<new-ip>:8080/github-webhook/ -f config[content_type]=json`
   (without gh: [YOU] edit the webhook in GitHub settings).
4. New links: shop `http://<new-ip>`, panel `http://<new-ip>:5000`.

## Part C – Saving credits

- Click **End Lab** when you finish working (instances stop, nothing is lost).
- Never launch a second instance. Never allocate an Elastic IP, load balancer or NAT gateway.
- Check the remaining budget shown at the top of the Learner Lab page.
- After final evaluation: EC2 → instance → **Terminate** (only when you no longer need it).
