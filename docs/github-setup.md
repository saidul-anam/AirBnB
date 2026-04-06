# 🐙 GitHub Repository & Branch Setup Guide

## ISD Airbnb — Microservice Project

---

## 📋 Table of Contents

1. [Repository Strategy](#repository-strategy)
2. [Create the Repository](#create-the-repository)
3. [Initial Local Setup](#initial-local-setup)
4. [Branch Strategy](#branch-strategy)
5. [Create All Branches](#create-all-branches)
6. [Branch Protection Rules](#branch-protection-rules)
7. [GitHub Secrets Setup](#github-secrets-setup)
8. [Team Collaboration Workflow](#team-collaboration-workflow)
9. [Commit Message Convention](#commit-message-convention)

---

## 1. Repository Strategy

We use a **Monorepo** approach — one single GitHub repository contains:

```
isd-airbnb/
├── backend/        ← All Spring Boot microservices
├── frontend/       ← React application
├── .github/        ← CI/CD workflows
├── docs/           ← Documentation
└── docker-compose.yml
```

> **Why Monorepo?**
> - Easier for a university team to coordinate
> - Single PR reviews across frontend + backend
> - Shared CI/CD pipeline
> - One place for all documentation

---

## 2. Create the Repository

### Option A — GitHub Web UI (Recommended for first time)

1. Go to [https://github.com/new](https://github.com/new)
2. Fill in the details:

| Field | Value |
|---|---|
| **Repository name** | `isd-airbnb` |
| **Description** | `Airbnb-like rental platform — BUET CSE 326 ISD Project` |
| **Visibility** | `Private` (recommended for academic projects) |
| **Initialize with README** | ❌ No (we already have one) |
| **Add .gitignore** | ❌ No (we already have one) |
| **Choose a license** | Optional |

3. Click **Create repository**

---

### Option B — GitHub CLI

```bash
# Install GitHub CLI first: https://cli.github.com/
gh auth login

gh repo create isd-airbnb \
  --private \
  --description "Airbnb-like rental platform — BUET CSE 326 ISD Project" \
  --confirm
```

---

## 3. Initial Local Setup

### Step 1 — Navigate to your project folder

```bash
cd "C:\Buet\CSE 326 ISD\Airbnb project"
```

### Step 2 — Initialize Git

```bash
git init
```

### Step 3 — Configure your Git identity (if not already set)

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### Step 4 — Add all files and make first commit

```bash
git add .
git commit -m "chore: initial project structure — microservice scaffold"
```

### Step 5 — Link to GitHub remote

```bash
# Replace <your-github-username> with your actual username
git remote add origin https://github.com/<your-github-username>/isd-airbnb.git
```

### Step 6 — Push to main

```bash
git branch -M main
git push -u origin main
```

---

## 4. Branch Strategy

We follow **Git Flow** adapted for a microservice project:

```
main
│  └── Production-ready code only. Protected. Never commit directly.
│
develop
│  └── Integration branch. All features merge here first.
│
feature/<scope>/<short-description>
│  └── New features. Branch from develop. Merge back to develop via PR.
│
hotfix/<short-description>
│  └── Urgent production fixes. Branch from main. Merge to main + develop.
│
release/<version>
   └── Release preparation. Branch from develop. Merge to main + develop.
```

### Branch Naming Examples

| Type | Example |
|---|---|
| Feature | `feature/booking/status-history` |
| Feature | `feature/user/jwt-auth` |
| Feature | `feature/listing/create-endpoint` |
| Feature | `feature/payment/refund-logic` |
| Feature | `feature/availability/double-booking-guard` |
| Feature | `feature/frontend/booking-page` |
| Hotfix | `hotfix/fix-booking-status-null` |
| Release | `release/1.0.0` |

---

## 5. Create All Branches

Run these commands after the initial push to `main`:

```bash
# ── Create and push develop branch ──────────────────────────
git checkout -b develop
git push -u origin develop

# ── Feature branches per service ────────────────────────────
# User Service
git checkout -b feature/user/initial-setup develop
git push -u origin feature/user/initial-setup

# Booking Service
git checkout -b feature/booking/initial-setup develop
git push -u origin feature/booking/initial-setup

# Payment Service
git checkout -b feature/payment/initial-setup develop
git push -u origin feature/payment/initial-setup

# Listing Service
git checkout -b feature/listing/initial-setup develop
git push -u origin feature/listing/initial-setup

# Availability Service
git checkout -b feature/availability/initial-setup develop
git push -u origin feature/availability/initial-setup

# Search Service
git checkout -b feature/search/initial-setup develop
git push -u origin feature/search/initial-setup

# Notification Service
git checkout -b feature/notification/initial-setup develop
git push -u origin feature/notification/initial-setup

# Admin Service
git checkout -b feature/admin/initial-setup develop
git push -u origin feature/admin/initial-setup

# Frontend
git checkout -b feature/frontend/initial-setup develop
git push -u origin feature/frontend/initial-setup

# ── Go back to develop ───────────────────────────────────────
git checkout develop
```

---

## 6. Branch Protection Rules

Set these up in GitHub:
**Repository → Settings → Branches → Add branch protection rule**

### For `main` branch

| Rule | Setting |
|---|---|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ |
| Required approving reviews | `1` |
| Dismiss stale PR approvals | ✅ |
| Require status checks to pass | ✅ |
| Required status checks | `build-backend`, `build-frontend`, `test-backend` |
| Require branches to be up to date | ✅ |
| Do not allow bypassing the above settings | ✅ |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |

### For `develop` branch

| Rule | Setting |
|---|---|
| Branch name pattern | `develop` |
| Require a pull request before merging | ✅ |
| Required approving reviews | `1` |
| Require status checks to pass | ✅ |
| Allow force pushes | ❌ |

---

## 7. GitHub Secrets Setup

Go to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

### Required Secrets

| Secret Name | Description | Example Value |
|---|---|---|
| `MONGO_URI_TEST` | MongoDB Atlas URI for test DB | `mongodb+srv://tanim:tanim@cluster0...` |
| `JWT_SECRET_TEST` | JWT secret for test environment | `testSecretKey123` |
| `REACT_APP_API_BASE_URL` | API Gateway URL for frontend build | `http://localhost:8080` |
| `DOCKER_USERNAME` | Docker Hub username | `your_dockerhub_username` |
| `DOCKER_PASSWORD` | Docker Hub access token | `dckr_pat_...` |

### How to add a secret

```
1. Go to your repo on GitHub
2. Click Settings (top menu)
3. Left sidebar → Secrets and variables → Actions
4. Click "New repository secret"
5. Enter Name and Value
6. Click "Add secret"
```

> ⚠️ **IMPORTANT:** Never put real credentials in code. Always use secrets.

---

## 8. Team Collaboration Workflow

### Daily Development Workflow

```bash
# 1. Always start from the latest develop
git checkout develop
git pull origin develop

# 2. Create your feature branch
git checkout -b feature/booking/status-history

# 3. Work on your code...
# ... make changes ...

# 4. Stage and commit
git add .
git commit -m "feat(booking): add booking status history tracking"

# 5. Push your branch
git push -u origin feature/booking/status-history

# 6. Open a Pull Request on GitHub:
#    feature/booking/status-history → develop
```

### Pull Request Checklist

Before opening a PR, verify:

- [ ] Code compiles without errors (`mvn clean package`)
- [ ] All tests pass (`mvn test`)
- [ ] No hardcoded credentials or secrets
- [ ] `application.yml` uses `${ENV_VAR:default}` pattern
- [ ] Meaningful commit messages (see convention below)
- [ ] PR title is descriptive
- [ ] PR description explains what changed and why

### Merging to Main (Releases)

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# 2. Final testing, version bumps...

# 3. Merge to main via PR
# PR: release/1.0.0 → main

# 4. Tag the release
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 5. Merge back to develop
git checkout develop
git merge main
git push origin develop
```

---

## 9. Commit Message Convention

We follow **Conventional Commits** standard:

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `chore` | Maintenance, configs, tooling |
| `docs` | Documentation only |
| `refactor` | Code restructuring (no feature/fix) |
| `test` | Adding or fixing tests |
| `style` | Formatting, whitespace (no logic change) |
| `perf` | Performance improvements |
| `ci` | CI/CD pipeline changes |
| `build` | Build system changes (pom.xml, Dockerfile) |

### Scopes (use service name)

`user`, `booking`, `payment`, `listing`, `availability`, `search`, `notification`, `admin`, `gateway`, `frontend`, `docker`, `ci`

### Examples

```bash
git commit -m "feat(booking): add booking status history table and transitions"
git commit -m "feat(user): implement JWT authentication with refresh token"
git commit -m "fix(availability): resolve double booking race condition"
git commit -m "feat(payment): add partial refund calculation based on cancellation date"
git commit -m "chore(docker): update base image to eclipse-temurin:21-jre-alpine"
git commit -m "docs: add GitHub setup and branch strategy guide"
git commit -m "ci: add matrix build for all microservices in GitHub Actions"
git commit -m "fix(booking): correct status transition from CONFIRMED to CHECKED_IN"
```

---

## 10. Quick Reference — Key Git Commands

```bash
# See all branches (local + remote)
git branch -a

# Switch to a branch
git checkout <branch-name>

# Pull latest changes
git pull origin <branch-name>

# See commit history (pretty)
git log --oneline --graph --decorate --all

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Discard all local changes (DANGEROUS)
git checkout -- .

# Stash changes temporarily
git stash
git stash pop

# Delete a local branch
git branch -d feature/done-branch

# Delete a remote branch
git push origin --delete feature/done-branch
```

---

## ✅ Setup Checklist

- [ ] GitHub repository created: `isd-airbnb`
- [ ] Local git initialized and linked to remote
- [ ] Initial commit pushed to `main`
- [ ] `develop` branch created and pushed
- [ ] Feature branches created per service
- [ ] Branch protection rules set on `main` and `develop`
- [ ] GitHub Secrets added (MongoDB URI, JWT, Docker Hub)
- [ ] All team members added as collaborators
- [ ] CI/CD pipeline verified on first push

---

*BUET — CSE 326 Information System Design | ISD Airbnb Project*