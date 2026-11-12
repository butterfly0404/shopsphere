# 04 – Pipeline and control panel specification

## Triggers

| Trigger | How |
| --- | --- |
| Git push | GitHub webhook → `http://<ip>:8080/github-webhook/` → `githubPush()` in `Jenkinsfile`. Job must tick "GitHub hook trigger for GITScm polling" |
| Backup | `pollSCM('H/5 * * * *')` |
| Button | Control panel → `POST /job/shopsphere/buildWithParameters?ACTION=deploy` with Basic auth (Jenkins user + API token) |
| Rollback button | Same with `ACTION=rollback` |

## Parameters and environment (`Jenkinsfile`)

- `ACTION`: `deploy` (default) | `rollback`. Before the first run the job has no parameters, so the panel falls back to `/build`.
- `DOCKER_IMAGE = '<dockerhub-user>/shopsphere'` ← **set from MY_DETAILS.md**
- `IMAGE_TAG = "v${BUILD_NUMBER}"`, `KUBECONFIG = /var/lib/jenkins/.kube/config`, `NAMESPACE = shopsphere`,
  `APP_HEALTH_URL = http://localhost/api/health`
- Options: `skipDefaultCheckout()`, `disableConcurrentBuilds()`, keep 20 builds, 30 min timeout.

## Stages (names are a contract with the control panel; do not rename)

| Stage | When | Commands | Failure behaviour |
| --- | --- | --- | --- |
| Checkout | deploy | `checkout scm` | stop |
| Test | deploy | `docker build --target test -t shopsphere-test:$TAG .` (runs `npm test`) | stop; nothing deployed |
| Build Image | deploy | `docker build --build-arg APP_VERSION=$TAG -t $IMAGE:$TAG -t $IMAGE:latest .` | stop |
| Push Image | deploy | login with credential `dockerhub-creds`, push both tags, logout | stop |
| Deploy | deploy | apply namespace, secret, mongo; `sed IMAGE_PLACEHOLDER` into app.yaml and apply; apply ingress; annotate change-cause | `post failure` → `rollout undo` |
| Health Check | deploy | `rollout status` mongo + app; poll `APP_HEALTH_URL` until it contains the new tag (30 × 3 s) | `post failure` → `rollout undo` |
| Rollback | rollback | `rollout undo`, `rollout status`, print history + health | fail |

`post`: success → description `"vN live at http://<ip>"`; failure → undo only if `DEPLOY_STARTED == 'true'`;
always → remove test image, `docker image prune -f`.

## Jenkins prerequisites

- Plugins: suggested set + **Pipeline: Stage View** (provides `/wfapi/describe` used by the panel) + GitHub + Git.
- Credential: *Username with password*, ID `dockerhub-creds`, username = Docker Hub user, password = Docker Hub access token.
- Job `shopsphere`: Pipeline script from SCM → Git → repo URL → branch `*/main` → script path `Jenkinsfile`.
- OS: user `jenkins` in group `docker`; kubeconfig at `/var/lib/jenkins/.kube/config`.

## Control panel contract (`control-panel/`)

Server (`server.js`, Node 22, no dependencies), env from `/etc/shopsphere-panel.env`:
`PORT=5000`, `JENKINS_URL=http://localhost:8080`, `JENKINS_USER`, `JENKINS_API_TOKEN`, `JOB_NAME=shopsphere`,
`APP_HEALTH_URL=http://localhost/api/health`, `APP_PUBLIC_URL=http://<ip>`, `JENKINS_PUBLIC_URL=http://<ip>:8080`.

| Endpoint | Purpose |
| --- | --- |
| `GET /` | The page |
| `GET /api/config` | public URLs, whether credentials are configured |
| `POST /api/deploy`, `POST /api/rollback` | trigger; returns `{queueId}` from the `Location` header |
| `GET /api/queue/:id` | `queued` / `started` (+ build number) / `cancelled` |
| `GET /api/build/:n` | number, building, result, action, startedAt, durationMillis, stages[{name,status,durationMillis}], consoleUrl |
| `GET /api/last` | last build (resumes the view if a build is running) |
| `GET /api/app` | proxies the shop health check: up, version, pod, db |

Page behaviour: Deploy Now → poll queue every 1.5 s → poll build every 2 s → render six stages
(pending / running / done / failed / skipped) and progress bar → on SUCCESS show a banner and **redirect to
`APP_PUBLIC_URL` after 5 s** (Open now / Stay here buttons) → on failure show the failed stage, and say whether the
site kept the last good version. Auto-open only happens for builds started from this page.
The API token never reaches the browser.

## Per-session script (`infra/new-session.sh`)

Detects the new public IP, rewrites `APP_PUBLIC_URL` / `JENKINS_PUBLIC_URL`, restarts the panel, updates Jenkins'
URL setting, waits for Jenkins and the shop, prints a service check and the new webhook URL (with `gh api` commands).
