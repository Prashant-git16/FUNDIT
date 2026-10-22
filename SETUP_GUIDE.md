# Fundit — Complete Setup, Deployment & Operations Guide

> **Audience:** Developer, Capstone Evaluators, Interviewers, New Contributors
> Every single step — from zero to production on AWS — is explained with exact commands.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Repository & Git Basics](#2-clone-the-repository--git-basics)
3. [Database Setup — MySQL 80](#3-database-setup--mysql-80)
4. [Backend Setup & Environment Variables](#4-backend-setup--environment-variables)
5. [Image Uploads — Local vs AWS S3 + CloudFront](#5-image-uploads--local-vs-aws-s3--cloudfront)
6. [Payment Gateway — Simulated vs Real Razorpay](#6-payment-gateway--simulated-vs-real-razorpay)
7. [Google OAuth 20 Setup](#7-google-oauth-20-setup)
8. [Frontend Setup & Running the Full Stack](#8-frontend-setup--running-the-full-stack)
9. [Pre-Seeded Test Accounts](#9-pre-seeded-test-accounts)
10. [Git Workflow — How to Commit & Push Anytime](#10-git-workflow--how-to-commit--push-anytime)
11. [GitHub Repository Setup](#11-github-repository-setup)
12. [AWS Production Deployment Architecture](#12-aws-production-deployment-architecture)
13. [Deploying Frontend to S3 + CloudFront](#13-deploying-the-frontend-to-s3--cloudfront)
14. [Deploying Backend to EC2](#14-deploying-the-backend-to-ec2)
15. [Razorpay Production Integration](#15-razorpay-production-integration)
16. [Environment Variable Quick Reference](#16-environment-variable-quick-reference)
17. [Troubleshooting](#17-troubleshooting--common-errors)

---

## 1. Prerequisites

| Tool | Minimum Version | Check | Install |
|---|---|---|---|
| Node.js | v18.0 (v20+ recommended) | `node -v` | https://nodejs.org/ |
| npm | v9.0+ | `npm -v` | Bundled with Node.js |
| MySQL Server | v8.0+ | `mysql --version` | https://dev.mysql.com/downloads/installer/ |
| Git | Any modern | `git --version` | https://git-scm.com/ |
| AWS CLI | v2+ (for deploy) | `aws --version` | https://aws.amazon.com/cli/ |

---

## 2. Clone the Repository & Git Basics

```bash
git clone https://github.com/Prashant-git16/FUNDIT.git
cd FUNDIT
```

Structure:
```
FUNDIT/
+-- backend/    <- Node.js + Express API
+-- frontend/   <- React 19 + Vite SPA
```

---

## 3. Database Setup — MySQL 8.0

### 3.1 Start MySQL

**Windows PowerShell (Admin):**
```powershell
Start-Service MySQL80
```

**Linux:**
```bash
sudo systemctl start mysql && sudo systemctl enable mysql
```

**macOS Homebrew:**
```bash
brew services start mysql
```

### 3.2 Create Database & Load Schema

**Option A — Automated (Windows):**
```powershell
cd backend
.\setup-db.bat
```

**Option B — Manual:**
```sql
-- Open MySQL shell
mysql -u root -p

CREATE DATABASE IF NOT EXISTS fundit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fundit_user'@'localhost' IDENTIFIED BY 'FunditPass123!';
GRANT ALL PRIVILEGES ON fundit_db.* TO 'fundit_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Then load schema + seed:
```bash
mysql -u root -p fundit_db < backend/schema.sql
mysql -u root -p fundit_db < backend/seed.sql
```

### 3.3 Verify

```sql
mysql -u fundit_user -p fundit_db
-- Password: FunditPass123!
SHOW TABLES;             -- users, campaigns, donations, expenses
SELECT COUNT(*) FROM campaigns;   -- 6
```

---

## 4. Backend Setup & Environment Variables

```bash
cd backend
npm install
copy .env.example .env   # Windows
cp .env.example .env     # Mac/Linux
```

Edit `backend/.env`:
```dotenv
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fundit_db
DB_USER=fundit_user
DB_PASS=FunditPass123!

# JWT & Cookie (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_64_char_random_secret
COOKIE_SECRET=another_64_char_random_secret

# AWS S3 (leave blank for local disk upload)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET_NAME=

# CloudFront CDN URL
CLOUDFRONT_URL=

# Razorpay (leave blank for simulated payments)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

Start backend:
```bash
npm run dev    # development (auto-restart)
npm start      # production
```

Backend runs at: http://localhost:5000
Health check: http://localhost:5000/api/health

---

## 5. Image Uploads — Local vs AWS S3 + CloudFront

### Local Disk (default dev mode)

When S3_BUCKET_NAME is blank, images go to `backend/uploads/` and are served at:
```
http://localhost:5000/uploads/<filename>
```
No config needed.

### AWS S3 + CloudFront (production)

**Step 1 — Create S3 Bucket:**
1. AWS S3 Console -> Create bucket
2. Name: `fundit-uploads-prod` (globally unique)
3. Region: ap-south-1 (Mumbai)
4. Block all public access: KEEP ENABLED (CloudFront serves files)
5. Create bucket

**Step 2 — Set Bucket CORS:**
In bucket -> Permissions -> CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET","PUT","POST"],
    "AllowedOrigins": ["https://yourdomain.com","http://localhost:5173"],
    "ExposeHeaders": []
  }
]
```

**Step 3 — Create CloudFront Distribution:**
1. CloudFront -> Create Distribution
2. Origin: your S3 bucket
3. Origin Access: Origin Access Control (OAC) -> Create new -> Sign requests: Yes
4. Viewer protocol: Redirect HTTP to HTTPS
5. Cache policy: CachingOptimized

**Step 4 — Update .env:**
```dotenv
S3_BUCKET_NAME=fundit-uploads-prod
CLOUDFRONT_URL=https://d1abc123xyz.cloudfront.net
```

---

## 6. Payment Gateway — Simulated vs Real Razorpay

### Simulated (default when RAZORPAY_KEY_ID is blank)

Backend returns `{ simulated: true }`, frontend shows payment confirmation.
Donations are still saved to DB. No config needed for testing.

### Real Razorpay

**Step 1:** Sign up at https://razorpay.com, complete KYC for production

**Step 2:** Dashboard -> Settings -> API Keys -> Generate
- Test keys: prefix `rzp_test_`
- Live keys: prefix `rzp_live_` (requires KYC)

**Step 3:** Update backend `.env`:
```dotenv
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

**Step 4:** Pass key to frontend — `frontend/.env.local`:
```dotenv
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

**Step 5 — Webhooks (Production):**
1. Razorpay Dashboard -> Settings -> Webhooks -> Add New
2. Webhook URL: `https://api.yourdomain.com/api/donations/webhook`
3. Events: `payment.captured`, `payment.failed`
4. Add `RAZORPAY_WEBHOOK_SECRET` to backend `.env`

---

## 7. Google OAuth 2.0 Setup

**Step 1 — Google Cloud Project:**
1. console.cloud.google.com -> New project: Fundit
2. Enable Google+ API and Google People API

**Step 2 — OAuth Consent Screen:**
1. APIs & Services -> OAuth consent screen
2. User Type: External
3. App name: Fundit, fill emails, scopes: email, profile
4. Add your email as test user

**Step 3 — Create OAuth Credentials:**
1. APIs & Services -> Credentials -> Create OAuth client ID
2. Application type: Web application
3. Authorized redirect URIs:
   - Dev: `http://localhost:5000/api/auth/google/callback`
   - Prod: `https://api.yourdomain.com/api/auth/google/callback`

**Step 4 — Update .env:**
```dotenv
GOOGLE_CLIENT_ID=123456789-abcde.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

## 8. Frontend Setup & Running the Full Stack

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```dotenv
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

```bash
npm run dev    # Runs at http://localhost:5173
```

**Run both at once — open TWO terminals:**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

---

## 9. Pre-Seeded Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@fundit.in | Password1! |
| Campaign Owner | priya@example.com | Password1! |
| Campaign Owner | rahul@example.com | Password1! |
| Donor | aarav@example.com | Password1! |
| Viewer | meera@example.com | Password1! |

---

## 10. Git Workflow — How to Commit & Push Anytime

### One-Time Setup

```bash
git config --global user.name "Your Name"
git config --global user.email "you@email.com"
```

### Everyday Workflow

```bash
# See what changed
git status

# Stage all changes
git add .

# OR stage specific files
git add frontend/src/pages/LoginPage.jsx

# Commit with a meaningful message
git commit -m "feat: add password visibility toggle and strength indicator"

# Push to GitHub
git push origin main
```

### Commit Message Convention (Conventional Commits)

| Prefix | Use when |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `style:` | CSS/UI changes |
| `refactor:` | Code restructure |
| `docs:` | Documentation |
| `chore:` | Config/dependencies |

Examples:
```bash
git commit -m "feat: add Razorpay checkout with HMAC verification"
git commit -m "fix: navbar always visible with position:fixed"
git commit -m "docs: add complete AWS deployment guide"
git commit -m "style: increase base font-size and icon sizing"
git commit -m "chore: update backend dependencies"
```

### Useful Git Commands

```bash
git log --oneline -10          # Last 10 commits
git diff                       # Uncommitted changes
git stash                      # Temporarily save changes
git stash pop                  # Restore stashed changes
git pull origin main           # Get latest from GitHub
git reset --soft HEAD~1        # Undo last commit (keeps changes)
git checkout -- <file>         # Discard file changes
```

### Branching (for features)

```bash
git checkout -b feature/google-oauth
# ... work and commit ...
git push origin feature/google-oauth
# Open Pull Request on GitHub -> merge to main
```

---

## 11. GitHub Repository Setup

### Create Repository

1. github.com/new
2. Name: FUNDIT, Description: Full-stack crowdfunding platform
3. Public (for portfolio visibility)
4. DO NOT initialize with README
5. Create repository

### Push Existing Code

```bash
cd FUNDIT
git init
git add .
git commit -m "chore: initial full-stack project with frontend and backend"
git branch -M main
git remote add origin https://github.com/Prashant-git16/FUNDIT.git
git push -u origin main
```

### GitHub Actions CI/CD

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd frontend && npm ci && npm run build
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      - run: aws s3 sync frontend/dist s3://fundit-frontend-prod --delete
      - run: aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/FUNDIT && git pull origin main
            cd backend && npm install --production
            pm2 restart fundit-api
```

Add to Settings -> Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EC2_HOST`
- `EC2_SSH_KEY`

---

## 12. AWS Production Deployment Architecture

```
Internet
    |
    v
Route 53 (DNS: yourdomain.com)
    |
    +-- yourdomain.com -------> CloudFront (CDN)
    |                               |
    |                        +------+------+
    |                        |             |
    |               S3: fundit-frontend  S3: fundit-uploads
    |               (React build)       (User images)
    |
    +-- api.yourdomain.com --> ALB (HTTPS:443 -> HTTP:5000)
                                    |
                            +-------+-------+
                            |               |
                         EC2 AZ-1       EC2 AZ-2  (Auto Scaling)
                            |               |
                            +-------+-------+
                                    |
                               RDS MySQL 8.0
                           (Private subnet, Multi-AZ)
```

### 12.1 IAM — Identity & Access Management

NEVER use root credentials in code. Create a dedicated IAM user:

1. IAM -> Users -> Create user -> name: `fundit-app`
2. Permissions -> Attach policies -> AmazonS3FullAccess, CloudFrontFullAccess
3. Security credentials -> Create access key
4. Copy Access Key ID and Secret -> add to EC2 `.env`

Better: Create IAM Role for EC2:
1. IAM -> Roles -> Create role -> AWS service: EC2
2. Attach: AmazonS3FullAccess + CloudFrontFullAccess
3. Name: FunditEC2Role
4. Attach role to EC2 instance (no hardcoded keys needed!)

### 12.2 EC2 — Backend Server

1. EC2 -> Launch instance
2. AMI: Ubuntu 22.04 LTS
3. Instance type: t3.small (2 vCPU, 2GB RAM)
4. Key pair: Create new -> download .pem
5. Security group: see section 12.8
6. Storage: 20 GB gp3

Connect:
```bash
chmod 400 fundit-key.pem
ssh -i fundit-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Setup on EC2:
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone & start
cd /home/ubuntu
git clone https://github.com/Prashant-git16/FUNDIT.git
cd FUNDIT/backend
npm install --production
nano .env   # Add production values

pm2 start index.js --name fundit-api
pm2 startup        # Follow the printed command
pm2 save
```

### 12.3 RDS — Managed MySQL

1. RDS -> Create database -> MySQL 8.0
2. Template: Free tier (capstone) or Production
3. DB instance: fundit-db
4. Instance class: db.t3.micro
5. VPC: same as EC2, PRIVATE subnet
6. Public access: NO
7. Security group: allow port 3306 from EC2 security group only

Load schema from EC2:
```bash
mysql -h <RDS_ENDPOINT> -u admin -p fundit_db < schema.sql
mysql -h <RDS_ENDPOINT> -u admin -p fundit_db < seed.sql
```

### 12.4 S3 — Static Asset Storage

Create TWO buckets:
- `fundit-frontend-prod` — React build files (served via CloudFront)
- `fundit-uploads-prod` — Campaign images (served via CloudFront)

Both: Block all public access (CloudFront OAC will serve them).

For frontend bucket: Properties -> Static website hosting -> Enable, Index: index.html, Error: index.html

### 12.5 CloudFront — CDN

Create Distribution 1 (Frontend):
- Origin: fundit-frontend-prod S3 bucket
- OAC: enabled
- Default root object: index.html
- Custom error: 404 -> /index.html -> 200 (for React Router)

Create Distribution 2 (Images):
- Origin: fundit-uploads-prod S3 bucket
- OAC: enabled
- Cache: CachingOptimized

### 12.6 ALB — Application Load Balancer

1. EC2 -> Load Balancers -> Create -> Application Load Balancer
2. Name: fundit-alb, Scheme: Internet-facing
3. Subnets: 2+ Availability Zones (public subnets)
4. Security group: allow 80 and 443 from 0.0.0.0/0
5. Listeners:
   - Port 80 -> Redirect to HTTPS (443)
   - Port 443 -> Forward to Target Group (EC2:5000)
6. Target Group: Protocol HTTP, Port 5000, Health check: /api/health
7. Attach SSL cert from ACM

### 12.7 NLB — Network Load Balancer (optional)

Use NLB only if you need:
- Static IP for load balancer
- Ultra-low latency TCP traffic
- WebSocket/real-time features

For Fundit HTTP API, ALB is sufficient. NLB would be useful for WebSocket real-time donation notifications.

### 12.8 VPC & Security Groups (Network Isolation)

This is your firewall / VPN equivalent on AWS.

ALB Security Group (fundit-alb-sg):
- HTTP  80   -> 0.0.0.0/0   (redirect to HTTPS)
- HTTPS 443  -> 0.0.0.0/0   (public web)

EC2 Security Group (fundit-ec2-sg):
- TCP   5000 -> fundit-alb-sg  (only ALB can call API)
- SSH   22   -> Your IP only   (admin access)

RDS Security Group (fundit-rds-sg):
- MySQL 3306 -> fundit-ec2-sg  (only app server can reach DB)

NEVER open port 3306 to 0.0.0.0/0.

### 12.9 ACM — Free SSL/TLS Certificate

1. Certificate Manager -> Request certificate -> Public
2. Domain: yourdomain.com and *.yourdomain.com
3. Validation: DNS validation
4. Click "Create records in Route 53" (auto-adds CNAME)
5. Wait ~5 min for status: Issued
6. Attach to ALB HTTPS listener

### 12.10 Route 53 — DNS

1. Route 53 -> Hosted zones -> Create
2. Domain: yourdomain.com -> Public hosted zone
3. Update domain registrar nameservers with Route 53 NS records

DNS Records:
| Name | Type | Value |
|---|---|---|
| yourdomain.com | A Alias | CloudFront frontend distribution |
| api.yourdomain.com | A Alias | ALB DNS name |
| www.yourdomain.com | CNAME | yourdomain.com |

---

## 13. Deploying the Frontend to S3 + CloudFront

```bash
cd frontend

# Create production env
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production
echo "VITE_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxx" >> .env.production

# Build
npm run build
# Output: frontend/dist/

# Deploy to S3
aws s3 sync dist/ s3://fundit-frontend-prod --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_CF_DIST_ID \
  --paths "/*"
```

---

## 14. Deploying the Backend to EC2

Option A — Manual:
```bash
ssh -i fundit-key.pem ubuntu@<EC2_IP>
cd /home/ubuntu/FUNDIT
git pull origin main
cd backend && npm install --production
pm2 restart fundit-api
pm2 logs fundit-api --lines 50
```

Option B — Automatic via GitHub Actions (every push to main triggers deploy).

Production .env on EC2:
```dotenv
NODE_ENV=production
PORT=5000
DB_HOST=fundit-db.xxxxxxxx.ap-south-1.rds.amazonaws.com
DB_NAME=fundit_db
DB_USER=admin
DB_PASS=YourRDSPassword
JWT_SECRET=<64-char random>
COOKIE_SECRET=<64-char random>
AWS_REGION=ap-south-1
S3_BUCKET_NAME=fundit-uploads-prod
CLOUDFRONT_URL=https://d2xxxxxxxx.cloudfront.net
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://yourdomain.com
```

---

## 15. Razorpay Production Integration

Production checklist:
- [ ] Complete Razorpay KYC / business verification
- [ ] Switch to rzp_live_ keys in both backend and frontend .env
- [ ] Configure webhook URL pointing to production API
- [ ] Test with a real Rs.1 payment before launch
- [ ] Verify HMAC webhook signature works

Webhook verification (already in donationRoutes.js):
```js
const hmac = crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET);
hmac.update(rawBody);
const digest = hmac.digest('hex');
if (digest !== req.headers['x-razorpay-signature']) {
  return res.status(400).json({ error: 'Invalid signature' });
}
```

---

## 16. Environment Variable Quick Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| NODE_ENV | Yes | development | development or production |
| PORT | Yes | 5000 | Backend port |
| DB_HOST | Yes | localhost | MySQL host |
| DB_NAME | Yes | fundit_db | Database name |
| DB_USER | Yes | fundit_user | MySQL username |
| DB_PASS | Yes | — | MySQL password |
| JWT_SECRET | Yes | — | 64+ char random string |
| COOKIE_SECRET | Yes | — | Cookie signing secret |
| S3_BUCKET_NAME | No | blank | Blank = local disk upload |
| CLOUDFRONT_URL | No | blank | CDN base URL |
| RAZORPAY_KEY_ID | No | blank | Blank = simulated payments |
| RAZORPAY_KEY_SECRET | No | blank | Razorpay API secret |
| RAZORPAY_WEBHOOK_SECRET | No | blank | Webhook HMAC verification |
| GOOGLE_CLIENT_ID | No | blank | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | No | blank | Google OAuth secret |
| GOOGLE_CALLBACK_URL | No | — | OAuth callback URL |
| FRONTEND_URL | Yes | http://localhost:5173 | For CORS + redirects |

---

## 17. Troubleshooting & Common Errors

### ECONNREFUSED — Backend cannot connect to MySQL

```bash
mysql -u root -p -e "SHOW DATABASES;"
# Windows
Get-Service MySQL80
# Linux
sudo systemctl status mysql
```

### CORS Error in Browser

Ensure FRONTEND_URL in backend .env exactly matches the URL your frontend is running on (including port number).

### Port 5000 Already in Use

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000 && kill -9 <PID>
```

### Images Not Showing After Upload

- Local mode: check backend/uploads/ folder exists and file is there
- S3 mode: check CLOUDFRONT_URL starts with https:// and S3 bucket policy allows CloudFront OAC

### EC2 Backend Not Responding

```bash
pm2 list                           # Check fundit-api status
pm2 logs fundit-api --lines 100    # Check error logs
sudo ufw status                    # Firewall status
```

### Razorpay Payment Fails in Production

- Confirm you are using rzp_live_ keys (not rzp_test_)
- Check webhook secret matches
- Payment amount must be in paise (multiply Rs amount by 100)

### Google OAuth Redirect Mismatch

GOOGLE_CALLBACK_URL in .env must exactly match the Authorized Redirect URI in Google Cloud Console. Update both when going to production.

---

Last updated: 2024 | Fundit — B.Tech CSE Capstone Project | github.com/Prashant-git16/FUNDIT
