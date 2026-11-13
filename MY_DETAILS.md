# My details – fill this in before starting Claude Code

Claude Code reads this file. Fill in what you know; leave the rest blank and Claude Code will ask you.
**Do NOT put passwords for real accounts or access tokens here.** Those are typed into Jenkins directly.

## Project and team (used in README / report)

| Field | Value |
| --- | --- |
| Project title | ShopSphere – Automated CI/CD Deployment of an E-Commerce Application |
| Student name(s) and roll number(s) | ALISHRI PODDAR (RA2311003010155) |
| College / department | SRM Institute Of Science And Technology, Computing Technologies |
| Guide / faculty name | Dr. Deeban V Chakravarthy |
| Submission date | 13-11-2026 |

## Accounts

| Field | Value | Notes |
| --- | --- | --- |
| GitHub username | butterfly0404 | https://github.com/butterfly0404 |
| GitHub repository name | shopsphere | keep it **Public** so Jenkins can read it without a login |
| GitHub CLI (`gh`) installed and logged in? | yes: logged in as butterfly0404 | if yes, Claude Code can create the repo and webhook for you |
| Docker Hub username | alishri | already set in the `Jenkinsfile` (alishri/shopsphere) |
| Jenkins admin username you will create | alishri | you choose it in the Jenkins setup screen |

## Store settings (go into `k8s/secret.yaml`, which is in a public repo: use demo values only)

| Field | Value |
| --- | --- |
| Store admin email | admin@shopsphere.com |
| Store admin password (demo only, not a real password) | ShopDemo@2026 |

## AWS Academy Learner Lab (fill in after launching the instance)

| Field | Value |
| --- | --- |
| Region | us-east-1 |
| Key pair | vockey |
| Path to `labsuser.pem` on this laptop | `C:\Users\Alishri\Downloads\labsuser.pem` |
| EC2 instance ID | i-0964e4f188b229dcd |
| Public IP **this session** (changes every session) | 100.53.212.228 |

## Your laptop

| Field | Value |
| --- | --- |
| Operating system | Windows (use Git Bash as the terminal) |
| Git installed? | yes (Git Bash) |
| Node.js 22 installed? (only needed to run tests locally) | yes: Node v24.21.0, npm 11.19.0 (also Docker 29.9.2, OpenSSH 9.9) |
