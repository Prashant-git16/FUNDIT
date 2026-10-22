# 📘 Fundit — Complete End-to-End Setup & Deployment Guide

This document is the **single source of truth** for setting up, running, configuring, testing, and deploying the **Fundit** Crowdfunding Platform from absolute scratch.

Whether you are running it locally on your laptop for the first time, demoing it in a third-year capstone viva/interview, or deploying it to production on AWS, every step is explained in plain English with exact commands.

---

## 📑 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Database Setup from Scratch (MySQL 8.0)](#step-1-database-setup-from-scratch-mysql-80)
3. [Step 2: Backend Setup & Environment Variables](#step-2-backend-setup--environment-variables)
4. [Step 3: Image Uploads (Local vs AWS S3 + CloudFront)](#step-3-image-uploads-local-vs-aws-s3--cloudfront)
5. [Step 4: Payment Gateway (Simulated vs Real Razorpay)](#step-4-payment-gateway-simulated-vs-real-razorpay)
6. [Step 5: Google OAuth Setup (Optional)](#step-5-google-oauth-setup-optional)
7. [Step 6: Frontend Setup & Running the Full Stack App](#step-6-frontend-setup--running-the-full-stack-app)
8. [Step 7: Pre-Seeded Test Accounts](#step-7-pre-seeded-test-accounts)
9. [Step 8: AWS Cloud Production Deployment Guide](#step-8-aws-cloud-production-deployment-guide)
10. [Troubleshooting & Common Errors](#troubleshooting--common-errors)

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

| Requirement | Recommended Version | Verification Command | Download Link |
|---|---|---|---|
| **Node.js** | v18.0.0 or higher (v20+ recommended) | `node -v` | [nodejs.org](https://nodejs.org/) |
| **npm** | v9.0.0 or higher | `npm -v` | Bundled with Node.js |
| **MySQL Server** | v8.0 or higher | `mysql --version` | [dev.mysql.com](https://dev.mysql.com/downloads/installer/) |
| **Git** | Any modern version | `git --version` | [git-scm.com](https://git-scm.com/) |

---

## Step 1: Database Setup from Scratch (MySQL 8.0)

### 1.1 Ensure MySQL Service is Running
- **On Windows**:
  1. Press `Win + R`, type `services.msc`, and press Enter.
  2. Locate **MySQL80** (or `MySQL`). Ensure its status says **Running**.
  3. Or run in Administrator PowerShell:
     ```powershell
     Start-Service MySQL80
     ```
- **On Linux / Ubuntu**:
  ```bash
  sudo systemctl start mysql
  sudo systemctl enable mysql
  ```

---

### 1.2 Create Database and User
Open your command prompt or terminal and connect to MySQL as `root`:
```bash
mysql -u root -p
```
*(Enter your MySQL root password when prompted)*

Run the following SQL commands:
```sql
-- 1. Create the database with full UTF-8 support (supports Hindi text and emojis)
CREATE DATABASE IF NOT EXISTS fundit_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 2. Create dedicated user 'fundit_user' with password 'Fundit@123'
CREATE USER IF NOT EXISTS 'fundit_user'@'localhost' IDENTIFIED BY 'Fundit@123';

-- 3. Grant necessary privileges
GRANT ALL PRIVILEGES ON fundit_db.* TO 'fundit_user'@'localhost';

-- 4. Apply changes
FLUSH PRIVILEGES;

-- 5. Exit MySQL
EXIT;
```

---

### 1.3 Import Schema & Seed Data
From the root of the `FUNDIT` project, run:

- **Command Prompt (CMD) / PowerShell**:
  ```bash
  # Import database tables
  mysql -u fundit_user -pFundit@123 fundit_db < backend\schema.sql

  # Import sample campaigns, users, donations, and expenses
  mysql -u fundit_user -pFundit@123 fundit_db < backend\seed.sql
  ```

- **Linux / macOS**:
  ```bash
  mysql -u fundit_user -pFundit@123 fundit_db < backend/schema.sql
  mysql -u fundit_user -pFundit@123 fundit_db < backend/seed.sql
  ```

---

### 1.4 Verify Database
Run a quick query to verify that tables and seed data exist:
```bash
mysql -u fundit_user -pFundit@123 -e "USE fundit_db; SHOW TABLES; SELECT count(*) AS total_campaigns FROM campaigns;"
```
Expected output:
```
+---------------------+
| Tables_in_fundit_db |
+---------------------+
| campaigns           |
| donations           |
| expenses            |
| moderation_logs     |
| users               |
+---------------------+
total_campaigns: 6
```

---

## Step 2: Backend Setup & Environment Variables

### 2.1 Install Backend Dependencies
Open a terminal in the `backend/` folder:
```bash
cd backend
npm install
```

---

### 2.2 Configure `backend/.env`
Create or edit `backend/.env`. A complete configuration looks like this:

```ini
# Server Port
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=fundit_user
DB_PASSWORD=Fundit@123
DB_NAME=fundit_db

# JSON Web Token (Session Security)
JWT_SECRET=dev_jwt_secret_change_before_production_use_128bit
JWT_EXPIRES_IN=15m

# CORS Allowed Origins (Comma-separated)
# In development, any localhost port is automatically allowed
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# ─── OPTIONAL INTEGRATIONS (Can be left blank for offline/local testing) ───

# Razorpay Test Credentials (Leave blank for built-in Simulated Demo Mode)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# AWS S3 & CloudFront (Leave blank for built-in Local Disk Storage in backend/uploads/)
AWS_REGION=ap-south-1
S3_BUCKET_NAME=
CLOUDFRONT_DOMAIN=

# Google OAuth Client ID (Leave blank to use email/password auth only)
GOOGLE_CLIENT_ID=
```

---

### 2.3 Start Backend Server
```bash
npm run dev
```
You will see:
```
[db] MySQL connection pool ready
[server] Fundit API running on port 5000 (development)
```
Test health check in browser: **`http://localhost:5000/api/health`** (Returns `{"status":"ok"}`).

> **Note on Port 5000 (`EADDRINUSE`)**: If port 5000 is already in use by an old Node process or another app, see [Troubleshooting](#troubleshooting--common-errors) below.

---

## Step 3: Image Uploads (Local vs AWS S3 + CloudFront)

Fundit features a smart storage adapter in [`backend/upload.js`](file:///c:/Users/hp/OneDrive/Desktop/progrram/FUNDIT/backend/upload.js):

### Option A: Local Disk Storage (Default — Zero Setup)
- If `S3_BUCKET_NAME` is left blank in `.env`, Fundit **automatically** saves uploaded campaign images to `backend/uploads/campaigns/`.
- Images are served instantly through `http://localhost:5000/uploads/campaigns/...` and proxied through Vite.
- **No AWS account required** for local development or college vivas!

---

### Option B: AWS S3 + CloudFront (Production Mode)
To use real AWS cloud storage:

1. **Create an S3 Bucket**:
   - Go to [AWS S3 Console](https://s3.console.aws.amazon.com/).
   - Click **Create Bucket**.
   - Name: e.g. `fundit-assets-prod`.
   - Region: `ap-south-1` (Asia Pacific - Mumbai).
   - **Keep "Block all public access" ENABLED** (Best practice: private bucket).
   - Click **Create Bucket**.

2. **Create IAM User & Access Keys**:
   - Go to [AWS IAM Console](https://us-east-1.console.aws.amazon.com/iam/).
   - Click **Users** → **Create user** (e.g. `fundit-app-user`).
   - Attach policy directly: Create inline policy for S3:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
           "Resource": "arn:aws:s3:::fundit-assets-prod/*"
         }
       ]
     }
     ```
   - Go to **Security credentials** tab → **Create access key** → Application running outside AWS.
   - Configure AWS credentials locally:
     ```bash
     aws configure
     # Enter AWS Access Key ID, AWS Secret Access Key, and region (ap-south-1)
     ```

3. **Create CloudFront Distribution**:
   - Go to [AWS CloudFront](https://console.aws.amazon.com/cloudfront/).
   - Origin domain: select your S3 bucket `fundit-assets-prod.s3.ap-south-1.amazonaws.com`.
   - Origin Access: Choose **Origin access control settings (recommended)** → Create control setting.
   - Click **Create Distribution**.
   - Copy the policy statement provided by CloudFront and paste it into the S3 Bucket Policy.
   - Note your CloudFront domain: `https://d123456abcdef8.cloudfront.net`.

4. **Update `backend/.env`**:
   ```ini
   AWS_REGION=ap-south-1
   S3_BUCKET_NAME=fundit-assets-prod
   CLOUDFRONT_DOMAIN=https://d123456abcdef8.cloudfront.net
   ```

---

## Step 4: Payment Gateway (Simulated vs Real Razorpay)

### Option A: Simulated Demo Mode (Default — Zero Setup)
- If `RAZORPAY_KEY_ID` is left empty in `.env`:
  - When a user clicks **Donate ₹500**, Fundit runs in **Simulated Demo Mode**.
  - It generates a valid order ID (`order_sim_...`), records the donation in MySQL, runs an **atomic database transaction** (`UPDATE campaigns SET raised_amount = raised_amount + ?`), adds the user to the Donor Wall, and updates the campaign progress bar!
  - **Perfect for vivas and demonstrations without internet gateway dependency.**

---

### Option B: Real Razorpay Test Account
To test with the official Razorpay Checkout modal:

1. Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com/).
2. Switch toggle to **Test Mode** (top-right).
3. Navigate to **Account & Settings** → **API Keys** → **Generate Test Key**.
4. Copy the generated credentials into `backend/.env`:
   ```ini
   RAZORPAY_KEY_ID=rzp_test_YourKeyIdHere
   RAZORPAY_KEY_SECRET=YourSecretKeyHere
   ```
5. Restart backend (`npm run dev`).
6. When donating, the Razorpay Checkout popup will appear:
   - **Test Card**: `4111 1111 1111` (any future expiry, any CVV)
   - **OTP**: Enter `123456`
   - The backend validates the payment using **HMAC-SHA256 signature verification**.

---

## Step 5: Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project: `Fundit`.
3. Go to **APIs & Services** → **OAuth consent screen** → External → Set App Name to `Fundit`.
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**.
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `http://localhost:5174`
5. Copy the **Client ID** into `backend/.env`:
   ```ini
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

---

## Step 6: Frontend Setup & Running the Full Stack App

### 6.1 Install Frontend Dependencies
Open a second terminal in the `frontend/` folder:
```bash
cd frontend
npm install
```

---

### 6.2 Start Frontend Dev Server
```bash
npm run dev
```
Output:
```
  VITE v8.3.4  ready in 200 ms

  ➜  Local:   http://localhost:5173/
```
Open your browser at **`http://localhost:5173/`**.

---

### 6.3 Convenience Commands (From Project Root)
You can also run commands from the project root:
```bash
# Install all packages (both frontend and backend)
npm run install:all

# Run backend from root
npm run dev:backend

# Run frontend from root
npm run dev:frontend

# Build frontend production bundle
npm run build:frontend
```

---

## Step 7: Pre-Seeded Test Accounts

The seed script has already generated 4 verified accounts ready for testing:

| Role | Email | Password | What You Can Test |
|---|---|---|---|
| **Admin** | `admin@fundit.local` | `Admin@123` | Access `/admin` moderation page, close/delete campaigns, inspect moderation audit logs, view user list |
| **Organizer** | `priya@example.com` | `User@123` | Access `/dashboard`, view created campaigns, upload receipts and expense reports with proof images |
| **Donor** | `rahul@example.com` | `User@123` | Donate to campaigns, toggle anonymous donation, inspect donation history in `/dashboard` |
| **User** | `ananya@example.com` | `User@123` | General user account |

---

## Step 8: AWS Cloud Production Deployment Guide

### 8.1 AWS Infrastructure Plan
- **AWS EC2 (Ubuntu 22.04 LTS)**: Runs Node.js API server and serves static frontend build via Nginx.
- **AWS RDS MySQL**: Managed multi-AZ MySQL database.
- **AWS S3 + CloudFront**: Media delivery with global edge caching.

---

### 8.2 EC2 Server Setup
1. Launch an EC2 instance:
   - AMI: **Ubuntu Server 22.04 LTS**
   - Instance Type: `t3.micro` or `t3.small`
   - Security Group Inbound rules:
     - Port 22 (SSH)
     - Port 80 (HTTP)
     - Port 443 (HTTPS)

2. Connect via SSH:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. Install Node.js 20 & Git:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx git
   sudo npm install -g pm2
   ```

4. Clone Repository & Setup:
   ```bash
   git clone https://github.com/Prashant-git16/FUNDIT.git
   cd FUNDIT
   npm run install:all

   # Configure production .env
   cp backend/.env.example backend/.env
   nano backend/.env # Enter your RDS MySQL host, secrets, and AWS bucket

   # Build frontend static files
   cd frontend
   npm run build
   cd ..
   ```

5. Run Backend with PM2:
   ```bash
   cd backend
   pm2 start index.js --name "fundit-backend"
   pm2 startup
   pm2 save
   ```

6. Configure Nginx Reverse Proxy (`/etc/nginx/sites-available/default`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Serve Frontend SPA
       location / {
           root /home/ubuntu/FUNDIT/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Reverse proxy to Express API
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Proxy local uploads (if not using S3)
       location /uploads/ {
           proxy_pass http://localhost:5000;
       }
   }
   ```
   Restart Nginx:
   ```bash
   sudo nginx -t && sudo systemctl restart nginx
   ```

7. Install Free SSL with Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

---

## Troubleshooting & Common Errors

### 1. `EADDRINUSE: listen :::5000`
**Cause**: Another process (or a previous Node background instance) is already using port 5000.  
**Fix**:
- **On Windows PowerShell**:
  ```powershell
  # Find PID using port 5000
  Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess

  # Kill the process (replace 12345 with the PID)
  Stop-Process -Id 12345 -Force
  ```
- **Or one-liner in Command Prompt**:
  ```cmd
  for /f "tokens=5" %a in ('netstat -aon ^| findstr :5000') do taskkill /f /pid %a
  ```

---

### 2. `Access denied for user 'fundit_user'@'localhost'`
**Cause**: Wrong password or user hasn't been granted permissions.  
**Fix**:
Log in as root and reset the password:
```sql
ALTER USER 'fundit_user'@'localhost' IDENTIFIED BY 'Fundit@123';
GRANT ALL PRIVILEGES ON fundit_db.* TO 'fundit_user'@'localhost';
FLUSH PRIVILEGES;
```

---

### 3. `CORS: origin http://localhost:5174 is not allowed`
**Cause**: Vite started on port 5174 because 5173 was occupied, but backend only had 5173 configured.  
**Fix**:
The backend's [`backend/index.js`](file:///c:/Users/hp/OneDrive/Desktop/progrram/FUNDIT/backend/index.js) has been updated to dynamically allow all `localhost` ports in development mode. No manual change is needed!

---

### 4. Icons appearing small / low contrast
**Fix**:
The global design system in [`frontend/src/index.css`](file:///c:/Users/hp/OneDrive/Desktop/progrram/FUNDIT/frontend/src/index.css) has been scaled up with responsive root `rem` scaling, modern `.icon-box` components, glowing gradient badges, and larger card ratios. Everything is crisp and immediately visible at 100% zoom.
