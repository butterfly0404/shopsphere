# 01 – Requirements and acceptance checklist

## Assignment as given by the faculty

1. Three things are mandatory: **AWS cloud**, **Git**, **Jenkins**.
2. From **Terraform, Ansible, Docker, Kubernetes**, integrate **two** tools. Chosen: **Docker + Kubernetes**.
3. **Automate the deployment.**
4. The application must be **dynamic** (not a static page), any domain: chosen domain is e-commerce.
5. Running the Jenkins pipeline is connected to Git: pushing code triggers it.
6. A cloud **instance** runs the project, and the application opens **directly through its IP address**.
7. Faculty experience: one link with a **button**. Clicking it starts the whole process (test, build, store image,
   deploy) and the **website opens**.
8. The frontend should look good: polished but not heavily animated.

## Requirement → implementation map

| Requirement | Where it lives | How to prove it in the demo |
| --- | --- | --- |
| AWS | EC2 t3.medium, us-east-1, Learner Lab | Show the instance in the EC2 console |
| Git | GitHub repo, `.gitignore`, commit history | Show the repo and a commit triggering a build |
| Jenkins | `Jenkinsfile`, job `shopsphere` | Show Stage View with green stages |
| Docker | `Dockerfile` (multi-stage), Docker Hub tags | Show `vN` tags on Docker Hub; `docker images` |
| Kubernetes | `k8s/*.yaml`, k3s | `sudo kubectl -n shopsphere get pods,svc,ingress` |
| Automated deploy | Jenkins stages Deploy + Health Check | Push → site updates, footer version increases |
| Dynamic app | `backend/` + MongoDB | Register, order, admin changes status, data persists after refresh |
| Git triggers pipeline | GitHub webhook + `githubPush()` + `pollSCM` backup | Push and watch Jenkins start within seconds |
| Opens by IP | `k8s/ingress.yaml` (port 80) | Open `http://<ip>` |
| One-click button | `control-panel/` on port 5000 | Faculty click **Deploy Now**, site opens automatically |
| Only tested code ships | `Test` stage, `docker build --target test` | Break a test, push, pipeline stops at Test, site unchanged |
| Safe releases | RollingUpdate maxUnavailable 0, auto-undo on failure, Rollback button | Click Rollback |

## Acceptance checklist (Claude Code: verify each on the real server, then tick)

### Application
- [x] `cd backend && npm test` → 16/16 pass
- [x] `cd frontend && npm run build` succeeds
- [ ] Home, Shop (search, category, sort), Product, Cart, Checkout, My Orders, Login, Register, Admin pages work
- [ ] Customer can register, add to cart, place an order (COD/UPI/Card demo), see it in My Orders
- [ ] Admin (`admin@shopsphere.com`) can add/edit/delete products and change order status
- [ ] Footer shows Version `vN`, pod name and "Database up"

### Infrastructure
- [ ] EC2 instance running in us-east-1, security group allows 22, 80, 8080, 5000
- [ ] `sudo kubectl get nodes` → Ready
- [ ] Jenkins reachable at `http://<ip>:8080`, plugin **Pipeline: Stage View** installed
- [ ] Jenkins credential `dockerhub-creds` exists; job `shopsphere` uses "Pipeline script from SCM"

### Pipeline
- [ ] Build runs all six stages green: Checkout, Test, Build Image, Push Image, Deploy, Health Check
- [ ] Docker Hub shows `shopsphere:vN` and `:latest`
- [ ] `sudo kubectl -n shopsphere get pods` → 2 × shopsphere Running, 1 × mongo Running
- [ ] `http://<ip>` opens the shop (port 80) and `http://<ip>:30080` also works
- [ ] GitHub webhook shows a green tick; a `git push` starts a build without any click
- [ ] A deliberately failing test stops the pipeline at **Test** and the live site keeps working
- [ ] Data survives a redeploy (orders still there after a new version rolls out)

### Control panel
- [ ] `http://<ip>:5000` loads, shows "Live" status, version and pod
- [ ] **Deploy Now** → stages light up live → success banner → site opens automatically after 5 s
- [ ] **Rollback to previous version** works and the footer version goes back
- [ ] After a new Learner Lab session, `sudo bash infra/new-session.sh` brings everything back with the new IP

### Documentation
- [ ] README has the student's names, the architecture, and the run steps
- [ ] `docs/07-DEMO-AND-TROUBLESHOOTING.md` rehearsed at least once end to end
