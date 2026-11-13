# 07 – Demo script and troubleshooting

## Before the demo (day before + 20 minutes before)

- [ ] Rehearse the full script below at least twice.
- [ ] 20 min before: Start Lab → instance running → `sudo bash infra/new-session.sh` (all `[OK]`) → update webhook.
- [ ] Open in browser tabs: `http://<ip>/deploy/` (panel), `http://<ip>` (shop), `http://<ip>:8080` (Jenkins),
      the GitHub repo, Docker Hub repository page, an SSH terminal.
- [ ] Have the "failing test" edit ready but not pushed.

## Demo script (about 8–10 minutes)

| # | Say | Do |
| --- | --- | --- |
| 1 | "ShopSphere is a dynamic e-commerce app deployed by a fully automated CI/CD pipeline on AWS." | Show the shop at `http://<ip>` |
| 2 | "Mandatory: AWS, Git, Jenkins. Our two tools: Docker and Kubernetes." | Show the EC2 instance, GitHub repo, `Jenkinsfile` |
| 3 | "One click runs everything." | Faculty open `http://<ip>/deploy/` and click **Deploy Now** |
| 4 | Explain each stage as it turns green | Checkout → Test (16 tests) → Build Image → Push Image → Deploy → Health Check |
| 5 | "The site opens by itself when the health check passes." | Footer shows new **Version vN** and **Pod** name |
| 6 | "Images are versioned on Docker Hub." | Show tag `vN` on Docker Hub |
| 7 | "Kubernetes runs two copies and MongoDB." | `sudo kubectl -n shopsphere get pods,svc,ingress` |
| 8 | "It is dynamic: real data in a database." | Register, add to cart, check out; admin marks the order **Shipped**; customer sees it |
| 9 | "A Git push deploys without any click." | Push a small text change; Jenkins starts within seconds |
| 10 | "Broken code never reaches users." | Push the failing test; pipeline stops at **Test**; site still up |
| 11 | "We can go back instantly." | Click **Rollback to previous version** |

Likely viva questions: Why Kubernetes on one server (k3s)? (Free, real Kubernetes API, fits the lab budget.)
What is a Docker image vs container? What does the Ingress do? How does the webhook reach Jenkins? What happens if the
health check fails? (Automatic `rollout undo`.) Why two replicas? (Zero-downtime rolling updates, self-healing.)

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `permission denied ... /var/run/docker.sock` in Jenkins | jenkins not in docker group | `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins` |
| Push Image: `unauthorized` / `denied` | wrong credential or image name | ID must be `dockerhub-creds`; password = access token; `DOCKER_IMAGE` must start with the Docker Hub username |
| Deploy: `kubectl ... connection refused` / `Unauthorized` | kubeconfig missing for jenkins | `sudo cp /etc/rancher/k3s/k3s.yaml /var/lib/jenkins/.kube/config && sudo chown jenkins: /var/lib/jenkins/.kube/config` |
| Health Check times out | pods not ready, Mongo slow on first start, or Ingress not ready | `sudo kubectl -n shopsphere get pods`, `describe pod`, `logs deploy/shopsphere`; re-run build |
| Pods `ImagePullBackOff` | Docker Hub repo private or wrong name | Make the Docker Hub repo public; check image name |
| Pods `OOMKilled` / server freezes | not enough memory | Use t3.medium; confirm swap (`swapon --show`); don't scale above 3 |
| `http://<ip>` does not open but `:30080` does | port 80 blocked or Ingress missing | Security group rule for 80; `sudo kubectl -n shopsphere get ingress`; `sudo kubectl -n kube-system get pods` (traefik Running) |
| Nothing opens at all | new session, IP changed / instance stopped | Use the new IP; run `infra/new-session.sh` |
| GitHub webhook red cross | old IP, port 8080 closed, missing trailing `/` | Update URL to `http://<ip>:8080/github-webhook/` |
| Push doesn't start a build | job trigger not ticked | Job → Configure → tick "GitHub hook trigger for GITScm polling" (pollSCM still catches it within 5 min) |
| Panel: "Jenkins refused the request: HTTP 401/403" | bad user/token | Re-run `install-control-panel.sh` with a fresh API token |
| Panel shows no stages | Stage View plugin missing | Install **Pipeline: Stage View** |
| Panel: "Cannot reach Jenkins" | Jenkins still starting | Wait 1–2 min; `systemctl status jenkins` |
| First build: "ACTION parameter" not shown | normal before first run | It appears after the first build |
| `git push` rejected | remote has new commits | `git pull --rebase` then push |
| Product images missing | no internet access to Unsplash | Coloured placeholders are shown; fine for the demo |
| Learner Lab budget nearly used | instance left running | End Lab after every session; never leave it on overnight |
