# Fundit — Production Deployment Guide (AWS EC2 + Node.js + PM2 + Nginx + AWS RDS)

This is the **step-by-step production deployment manual** for running Fundit on AWS **without Docker**, using the standard, high-performance Linux web stack:
* **Compute**: AWS EC2 (Ubuntu 24.04 LTS, Free Tier `t2.micro` / `t3.micro`)
* **Backend Runtime**: Node.js 20 LTS managed 24/7 by **PM2** (automatic restarts and zero downtime)
* **Web Server & Reverse Proxy**: **Nginx** (serves the compiled React SPA and proxies `/api/*` requests)
* **Database**: **AWS RDS MySQL 8.0** (Managed Cloud Database, Free Tier `db.t3.micro` / `db.t4g.micro`)
* **Media Storage**: AWS S3 Bucket + CloudFront CDN

This setup uses **under 400 MB of RAM**, running lightning-fast and cool on the AWS Free Tier.

---

## 📑 Step-by-Step Chronological Index
1. [Architecture Overview](#1-architecture-overview)
2. [Step 1: Collect All 3rd-Party Secret Keys (On Your Laptop)](#step-1-collect-all-3rd-party-secret-keys-on-your-laptop)
3. [Step 2: Provision AWS RDS MySQL 8.0 Database (In AWS Console)](#step-2-provision-aws-rds-mysql-80-database-in-aws-console)
4. [Step 3: Launch Your AWS EC2 Instance (In AWS Console)](#step-3-launch-your-aws-ec2-instance-in-aws-console)
5. [Step 4: Authorize EC2 to Talk to RDS (Security Group Inbound Rule)](#step-4-authorize-ec2-to-talk-to-rds-security-group-inbound-rule)
6. [Step 5: Connect to EC2 via SSH & Install Dependencies (Node.js, PM2, Nginx)](#step-5-connect-to-ec2-via-ssh--install-dependencies-nodejs-pm2-nginx)
7. [Step 6: Clone Your GitHub Repository on EC2](#step-6-clone-your-github-repository-on-ec2)
8. [Step 7: Initialize Database Tables on AWS RDS](#step-7-initialize-database-tables-on-aws-rds)
9. [Step 8: Configure `backend/.env` & Start Backend with PM2](#step-8-configure-backendenv--start-backend-with-pm2)
10. [Step 9: Build React Frontend & Configure Nginx](#step-9-build-react-frontend--configure-nginx)
11. [Step 10: Test in Your Browser!](#step-10-test-in-your-browser)
12. [Step 11: (Optional) Connect Domain & Free SSL (HTTPS)](#step-11-optional-connect-domain--free-ssl-https)
13. [Step 12: Zero-Downtime Code Updates & Maintenance](#step-12-zero-downtime-code-updates--maintenance)

---

## 1. Architecture Overview

```
[ User Browser / Mobile App ]
           │
           │ (HTTP 80 / HTTPS 443)
           ▼
┌────────────────────────────────────────────────────────┐
│               AWS EC2 Instance (Ubuntu 24.04)          │
│               Free Tier: t2.micro / t3.micro           │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Nginx Web Server (Port 80 / 443)                 │  │
│  │  - Serves compiled React frontend (/dist)        │  │
│  │  - Forwards /api/* requests to localhost:5000    │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │ Node.js Express API (Port 5000)                  │  │
│  │ Managed 24/7 by PM2 process supervisor           │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │
                              │ Port 3306 (Private VPC Traffic)
                              ▼
        ┌───────────────────────────────────────────────┐
        │       AWS RDS Managed MySQL 8.0 Database      │
        │       Endpoint: fundit-mysql-prod.ckloq...    │
        │       Storage: 20 GB gp3 (Encrypted)          │
        │       Automated Daily Snapshots               │
        └───────────────────────────────────────────────┘
                              │
                              ▼
        ┌───────────────────────────────────────────────┐
        │       AWS S3 Bucket + CloudFront CDN          │
        │       Images & Campaign Verification Proofs   │
        └───────────────────────────────────────────────┘
```

---

## Step 1: Collect All 3rd-Party Secret Keys (On Your Laptop)

Before setting up your cloud server, gather your credentials and save them in a temporary notepad on your laptop:

### 1. Generate `JWT_SECRET`
Open PowerShell on your PC and run:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
*Save the generated 64-character random string.*

### 2. Get Razorpay Keys
1. Go to [https://dashboard.razorpay.com](https://dashboard.razorpay.com) ➔ **Account & Settings** ➔ **API Keys**.
2. Click **Generate Key** (Test or Live).
3. Copy `RAZORPAY_KEY_ID` (starts with `rzp_test_...`) and `RAZORPAY_KEY_SECRET`.

### 3. Get Google OAuth Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/) ➔ **APIs & Services** ➔ **Credentials**.
2. Click **+ Create Credentials** ➔ **OAuth client ID** (Web application).
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost`
   - `http://localhost:5173`
   *(You will also add your EC2 Public IP here after Step 3).*
4. Copy your `GOOGLE_CLIENT_ID`.

### 4. Get AWS S3 & CloudFront Details
1. S3 Bucket Name: (e.g. `fundit-uploads-prod`)
2. Region: `us-east-1` (US East N. Virginia)
3. CloudFront URL: (e.g. `https://drjmib65d0s49.cloudfront.net`)
4. IAM User Credentials: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with S3 read/write permissions.

---

## Step 2: Provision AWS RDS MySQL 8.0 Database (In AWS Console)

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/) and make sure your region is set to **US East (N. Virginia) us-east-1** (or your preferred region).
2. Search for **RDS** ➔ click **Databases** ➔ click **Create database**.
3. **Creation Method**: Select **Standard create**.
4. **Engine Options**:
   - Engine type: **MySQL**
   - Version: **MySQL 8.0.x** (e.g., 8.0.35).
5. **Templates**: Select **Free tier** (*Very important for ₹0 cost!*).
6. **Settings**:
   - DB instance identifier: `fundit-mysql-prod`
   - Master username: `admin` (or `fundit_admin`)
   - Master password: Enter a strong password (e.g. `FunditRdsPass2026!`) and note it down.
7. **Instance Configuration**:
   - Class: **Burstable classes** ➔ `db.t3.micro` or `db.t4g.micro` (Free tier: 750 hours/month).
8. **Storage**:
   - Storage type: General Purpose SSD (gp3)
   - Allocated storage: **20 GiB**
   - Uncheck "Enable storage autoscaling".
9. **Connectivity**:
   - Virtual private cloud (VPC): **Default VPC** (100% Free).
   - Public access: **No** (Strict security: only your EC2 instance will be able to reach it).
   - VPC security group: Select **Create new** ➔ Name: `fundit-rds-sg`.
10. **Additional Configuration**:
    - Initial database name: `fundit_db` (*Important: creates the database automatically*).
    - Backup retention: 7 days.
11. Click **Create database**.

> [!NOTE]
> RDS takes about 5–10 minutes to spin up. Once its status turns **Available**, click on `fundit-mysql-prod` and copy your **Endpoint** (e.g. `fundit-mysql-prod.ckloq660s570.us-east-1.rds.amazonaws.com`).

---

## Step 3: Launch Your AWS EC2 Instance (In AWS Console)

1. In the AWS Console, search for **EC2** ➔ click **Launch instance** (Make sure you are in **us-east-1**).
2. **Name**: `fundit-server`.
3. **Application and OS Images**: **Ubuntu Server 24.04 LTS (HVM)** (*Free tier eligible*).
4. **Instance type**: `t2.micro` or `t3.micro` (*Free tier: 750 hours/month free*).
5. **Key pair (login)**:
   - Click **Create new key pair**.
   - Name: `fundit-key`.
   - Format: **.pem**.
   - Click **Create key pair** and save `fundit-key.pem` to your computer.
6. **Network settings**:
   - Firewall: Create security group named `fundit-ec2-sg`.
   - [x] **Allow SSH traffic from**: My IP (or `0.0.0.0/0`).
   - [x] **Allow HTTP traffic from the internet** (Port 80).
   - [x] **Allow HTTPS traffic from the internet** (Port 443).
7. **Storage**: 1 x 20 GiB gp3 (Free tier).
8. Click **Launch instance**.

### Note Down Your EC2 IPs:
Once the instance is **Running**, click on it and copy:
* **Public IPv4 address**: (e.g. `54.198.xxx.xxx`)
* **Private IPv4 address**: (e.g. `172.31.16.201`)

*(Now open Google Cloud Console ➔ Credentials ➔ OAuth Client ID ➔ Add `http://<YOUR-EC2-PUBLIC-IP>` to Authorized JavaScript Origins).*

---

## Step 4: Authorize EC2 to Talk to RDS (Security Group Inbound Rule)

Now authorize your EC2 instance to query your AWS RDS database:

1. In the AWS Console, go to **EC2** ➔ **Security Groups** (in left menu).
2. Click on the RDS security group: **`fundit-rds-sg`**.
3. Click the **Inbound rules** tab ➔ click **Edit inbound rules**.
4. Click **Add rule**:
   - **Type**: **MYSQL/Aurora** (Port 3306)
   - **Source**: Select **Custom** ➔ choose your EC2 security group `fundit-ec2-sg` (OR enter your EC2 Private IP: `172.31.16.201/32`).
5. Click **Save rules**.

---

## Step 5: Connect to EC2 via SSH & Install Dependencies (Node.js, PM2, Nginx)

1. Open PowerShell on your Windows PC and navigate to where your `.pem` key was downloaded:
   ```powershell
   cd C:\Users\hp\Downloads
   ssh -i "fundit-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```
   *(If prompted `Are you sure you want to continue connecting?`, type `yes` and press Enter).*

2. Install Node.js 20 LTS, Nginx web server, PM2, and MySQL Client in **one command**:
   ```bash
   # Install Node.js 20 LTS repository
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

   # Install Node.js, Nginx, Git, and MySQL client
   sudo apt update && sudo apt install -y nodejs nginx git mysql-client

   # Install PM2 globally (Process Manager to keep Node running 24/7)
   sudo npm install -g pm2
   ```

3. Verify installations:
   ```bash
   node -v       # Should show v20.x.x
   npm -v        # Should show 10.x.x
   nginx -v      # Should show nginx/1.x
   pm2 -v        # Should show 5.x
   ```

---

## Step 6: Clone Your GitHub Repository on EC2

Still in your SSH session on the EC2 server, clone your repository into your home directory:
```bash
git clone https://github.com/Prashant-git16/FUNDIT.git
cd FUNDIT
```

You now have the full project code and `backend/schema.sql` ready on the server.

---

## Step 7: Initialize Database Tables on AWS RDS

Now import the database tables into your AWS RDS instance:

```bash
mysql -h fundit-mysql-prod.ckloq660s570.us-east-1.rds.amazonaws.com -u admin -p fundit_db < backend/schema.sql
```
*(Enter your RDS master password when prompted. It creates: `users`, `campaigns`, `donations`, `expenses`, `admin_actions`).*

To optionally load test seed campaigns:
```bash
mysql -h fundit-mysql-prod.ckloq660s570.us-east-1.rds.amazonaws.com -u admin -p fundit_db < backend/seed.sql
```

### Verify Tables in RDS:
```bash
mysql -h fundit-mysql-prod.ckloq660s570.us-east-1.rds.amazonaws.com -u admin -p -e "USE fundit_db; SHOW TABLES;"
```

---

## Step 8: Configure `backend/.env` & Start Backend with PM2

### 1. Install Backend Dependencies:
```bash
cd /home/ubuntu/FUNDIT/backend
npm install --omit=dev
```

### 2. Create the Production Environment File:
```bash
nano .env
```

Paste your complete configuration into the editor:

```env
# ─── Server Configuration ───
PORT=5000
NODE_ENV=production
CORS_ORIGIN=http://localhost,http://<YOUR-EC2-PUBLIC-IP>

# ─── Authentication ───
JWT_SECRET=paste_your_generated_64_character_hex_string_from_step_1

# ─── AWS RDS Database Connection ───
DB_HOST=fundit-mysql-prod.ckloq660s570.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=fundit_db
DB_USER=admin
DB_PASSWORD=YourChosenRdsPassword2026!

# ─── Google OAuth 2.0 ───
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# ─── Razorpay Payment Gateway ───
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

# ─── AWS S3 & CloudFront ───
AWS_REGION=us-east-1
AWS_S3_BUCKET=fundit-uploads-prod
AWS_CLOUDFRONT_URL=https://your-cloudfront-id.cloudfront.net
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
```

Save and exit:
* Press `Ctrl + O` and press `Enter` to write the file.
* Press `Ctrl + X` to exit nano.

### 3. Start Backend with PM2:
```bash
# Start the Express API with PM2
pm2 start index.js --name fundit-api

# Save PM2 process list and configure auto-restart on system reboot
pm2 save
pm2 startup
```
*(Copy and run the `sudo env PATH=...` command that `pm2 startup` displays if prompted).*

Verify backend is running:
```bash
pm2 status
```
*You will see `fundit-api` with status `online` on port 5000.*

---

## Step 9: Build React Frontend & Configure Nginx

### 1. Build Frontend Static Assets:
```bash
cd /home/ubuntu/FUNDIT/frontend
npm install
npm run build
```
This generates the optimized, production-ready bundle inside `/home/ubuntu/FUNDIT/frontend/dist`.

### 2. Configure Nginx:
Open the Nginx default configuration file:
```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the entire contents of this file with:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # 1. Serve compiled React frontend
    root /home/ubuntu/FUNDIT/frontend/dist;
    index index.html;

    # 2. SPA client-side routing fallback: send all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 3. Reverse proxy API calls to the PM2 Node.js backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Proxy local uploads if not on S3
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Save and exit:
* Press `Ctrl + O` and `Enter` to save.
* Press `Ctrl + X` to exit.

### 3. Test & Restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```
*(If `sudo nginx -t` says `syntax is ok` and `test is successful`, Nginx is live!).*

---

## Step 10: Test in Your Browser!

Open your browser on your laptop or mobile phone:
```
http://<YOUR-EC2-PUBLIC-IP>
```
**🎉 Congratulations! Fundit is now 100% live on the internet!**
* The frontend loads instantly from Nginx.
* All `/api/` calls route seamlessly to Node.js on PM2.
* All data is durably stored in AWS RDS MySQL 8.0.

---

## Step 11: (Optional) Connect Domain & Free SSL (HTTPS)

### Option A: Using Cloudflare (Recommended — Free & 2 Clicks)
1. Register any domain (e.g. from Namecheap, GoDaddy, Hostinger).
2. Create a free account at [Cloudflare.com](https://cloudflare.com) and add your domain.
3. In Cloudflare DNS settings, add an **A Record**:
   - **Type**: `A`
   - **Name**: `@`
   - **IPv4 Address**: `<YOUR-EC2-PUBLIC-IP>`
   - **Proxy Status**: **Proxied (Orange Cloud)**.
4. In Cloudflare **SSL/TLS** tab ➔ select **Flexible** or **Full**.
5. In `/home/ubuntu/FUNDIT/backend/.env`, update `CORS_ORIGIN`:
   ```env
   CORS_ORIGIN=http://localhost,http://<YOUR-EC2-PUBLIC-IP>,https://yourdomain.com
   ```
   Restart backend: `pm2 restart fundit-api`.
6. Visit `https://yourdomain.com`!

### Option B: Using Certbot (Let's Encrypt Directly on EC2)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Step 12: Zero-Downtime Code Updates & Maintenance

Whenever you make improvements to your code on your laptop and push to GitHub:

### To Update Your Live Server:
Connect via SSH to your EC2 instance and run:
```bash
cd /home/ubuntu/FUNDIT
git pull origin main

# Update backend (if backend changed)
cd backend
npm install --omit=dev
pm2 restart fundit-api

# Update frontend (if frontend changed)
cd ../frontend
npm install
npm run build
```
The update completes in **under 20 seconds with zero downtime**!

### Helpful Commands:
* **View backend logs in real-time**: `pm2 logs fundit-api`
* **Restart backend**: `pm2 restart fundit-api`
* **Stop backend**: `pm2 stop fundit-api`
* **Check memory and CPU usage**: `pm2 monit`
* **Check Nginx status**: `sudo systemctl status nginx`
