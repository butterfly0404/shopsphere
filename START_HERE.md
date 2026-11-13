# START HERE – Using this project with Claude Code

This folder holds the complete ShopSphere project **and** the instructions Claude Code needs to finish and deploy it.

## What is in here

| File | Who reads it | Purpose |
| --- | --- | --- |
| `START_HERE.md` | You | This page |
| `MY_DETAILS.md` | You fill it, Claude Code reads it | Your usernames, names and lab details |
| `CLAUDE.md` | Claude Code (loaded automatically) | Project rules, requirements and limits |
| `docs/01-REQUIREMENTS.md` | Both | Your assignment + the final checklist |
| `docs/02-ARCHITECTURE.md` | Both | How the pieces fit together |
| `docs/03-APP-SPEC.md` | Claude Code | What the shop does (pages, API, data) |
| `docs/04-PIPELINE-SPEC.md` | Claude Code | Jenkins pipeline + Deploy Now panel details |
| `docs/05-DEPLOY-AWS-ACADEMY.md` | Both | Step-by-step deployment on your college AWS lab |
| `docs/06-TASKS.md` | Claude Code | The ordered to-do list it works through |
| `docs/07-DEMO-AND-TROUBLESHOOTING.md` | You | Demo-day script and fixes |
| `README.md` | Anyone on GitHub | Project overview |
| Everything else | – | The actual code (already written and tested) |

## What you need first

1. A **GitHub** account and a **Docker Hub** account (both free). Create a Docker Hub access token
   (Account settings → Personal access tokens) and keep it private.
2. Your **AWS Academy Learner Lab** access (college credits, no card).
3. On your laptop: **Git**, and ideally **Node.js 22** and the **GitHub CLI** (`gh auth login`), which let Claude Code do more for you.
4. **Claude Code** installed and signed in.

## Steps

1. Unzip this folder somewhere simple, e.g. `C:\projects\shopsphere` or `~/projects/shopsphere`.
2. Open `MY_DETAILS.md` and fill in what you know (leave blanks if unsure).
3. Open a terminal in the folder and start Claude Code: `claude`
4. Paste this first message:

```
Read CLAUDE.md, MY_DETAILS.md and every file in docs/. Then work through docs/06-TASKS.md phase by phase.
Ask me for anything missing from MY_DETAILS.md before you need it. When a step needs me to click something in
AWS, Jenkins, GitHub or Docker Hub, give me short numbered instructions and wait for me to say "done".
Explain what you did after each phase in simple words. Start with Phase 0.
```

5. Follow Claude Code's instructions. It will pause and ask you to:
   - start the Learner Lab and launch the EC2 server (it tells you exactly what to click),
   - do the Jenkins first-time setup in your browser,
   - paste your Jenkins API token into the chat.

## Every time you come back (new lab session)

The server's IP address changes every Learner Lab session. Start the lab, copy the new IP, start Claude Code in the
folder and paste:

```
New lab session. The new public IP is <paste IP>. Follow docs/05-DEPLOY-AWS-ACADEMY.md Part B,
then tell me the new website and control-panel links. Then continue docs/06-TASKS.md where we left off.
```

When you finish working, click **End Lab** in the Learner Lab page to save credits.

## The links you will end up with

- Shop: `http://<ip>`
- Deploy Now control panel (give this to your faculty): `http://<ip>/deploy/` (backup: `http://<ip>:5000`)
- Jenkins: `http://<ip>:8080`
