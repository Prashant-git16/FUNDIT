# Fundit — Production Deployment & Cloud Architecture Guide

This comprehensive guide details the **cloud architecture, database hosting, Dockerization, CI/CD, and AWS deployment workflows** to take Fundit from local development to a fully production-ready, enterprise-grade system.

---

## 📑 Table of Contents
1. [Core Architectural Decisions (Docker, GitHub & CI/CD)](#1-core-architectural-decisions)
2. [Where is MySQL Stored in Production? (AWS RDS)](#2-where-is-mysql-stored-in-production)
3. [AWS Production Architecture Blueprints](#3-aws-production-architecture-blueprints)
   - [Blueprint A: Cloud-Native Serverless & Edge (Recommended)](#blueprint-a-cloud-native-serverless--edge)
   - [Blueprint B: Single-VM Docker Compose (Cost-Effective Capstone)](#blueprint-b-single-vm-docker-compose)
4. [Step-by-Step AWS Deployment Walkthrough](#4-step-by-step-aws-deployment-walkthrough)
5. [GitHub Actions CI/CD Pipeline](#5-github-actions-cicd-pipeline)
6. [Pre-Production Checklist (What is Left?)](#6-pre-production-checklist)

---

## 1. Core Architectural Decisions

### Should We Use Docker, GitHub, and CI/CD?
**Yes, 100% recommended.** Here is why these three components are essential for a professional deployment:

| Technology | Purpose | Production Benefit |
| :--- | :--- | :--- |
| **GitHub** | Version Control & Collaboration | Single source of truth. Enforces clean commit history, branch protection (`main`), and audit trails. |
| **GitHub Actions (CI/CD)** | Automated Testing & Delivery | Automatically lints code, runs unit tests, verifies the Vite frontend build, and validates Docker images on every pull request and push. Prevents broken code from reaching production. |
| **Docker & Containers** | Environment Parity | Eliminates "it worked on my machine" issues. Multi-stage Dockerfiles package Node.js and Nginx dependencies into lightweight, immutable container images that run identically in development, staging, and AWS ECS/EC2. |

---

## 2. Where is MySQL Stored in Production?

### AWS RDS MySQL 8.0 (Relational Database Service)
In production, **never** store database files inside an application container or local EC2 disk. If a container crashes, restarts, or scales, local container data is destroyed.

Instead, the database is stored in **AWS RDS MySQL 8.0**:

```
                       ┌────────────────────────────────────────┐
                       │          AWS Virtual Private Cloud     │
                       │                    (VPC)               │
                       │                                        │
  Public Subnet        │   Private Subnet (No Public IP)        │
┌──────────────────┐   │   ┌────────────────────────────────┐   │
│ Express API      │───┼───▶ AWS RDS MySQL 8.0              │   │
│ (ECS or EC2)     │   │   │ Endpoint: fundit-db.xyz.rds... │   │
│ Port 5000        │   │   │ Storage: EBS gp3 (Encrypted)   │   │
└──────────────────┘   │   └────────────────────────────────┘   │
                       │                   │                    │
                       │         Automated Standby              │
                       │   ┌────────────────────────────────┐   │
                       │   │ Multi-AZ Secondary Replica     │   │
                       │   │ (Instant Automated Failover)   │   │
                       │   └────────────────────────────────┘   │
                       └────────────────────────────────────────┘
```

### Why AWS RDS is Essential:
1. **Private Subnet Security**: RDS is assigned to private subnets with **no public IP address**. Only backend compute resources inside your VPC security group can connect to port `3306`. Hackers on the internet cannot access or port-scan your database.
2. **Automated Daily Backups & Point-in-Time Recovery**: RDS takes daily automated storage snapshots and transaction log backups. You can restore your database to any specific second in the past 35 days.
3. **Multi-AZ High Availability**: In production, RDS can replicate data synchronously to a secondary Availability Zone. If the primary hardware fails, AWS automatically fails over to the standby replica in under 60 seconds without data loss.
4. **Encryption at Rest**: All tables, transaction logs, and snapshots are encrypted using **AWS KMS (Key Management Service)** with AES-256 keys.
5. **Auto Minor Version Patching**: AWS automatically manages security patches and OS maintenance without manual intervention.

### Connecting the Backend to RDS:
In your production environment variables (`.env` or AWS Secrets Manager):
```env
DB_HOST=fundit-db.cabcdefg1234.ap-south-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=fundit_admin
DB_PASSWORD=YourStrongGeneratedPassword#123
DB_NAME=fundit_db
```

---

## 3. AWS Production Architecture Blueprints

### Blueprint A: Cloud-Native Serverless & Edge (Industry Standard)
This is the modern production architecture used by high-scale companies:

```
[ User Browser ]
       │
       ├──▶ Route 53 (DNS) ──▶ CloudFront CDN (Global Edge Caching + SSL)
       │                              │
       │                              ├──▶ S3 Bucket (Static React SPA: HTML/CSS/JS)
       │                              └──▶ S3 Bucket (Media Uploads / Images / Proofs)
       │
       └──▶ API Calls (/api/*) ──▶ AWS Application Load Balancer (ALB)
                                           │
                                  AWS ECS Fargate
                           (Serverless Docker Containers)
                                   ┌───────────────┐
                                   │ Fundit Node API│
                                   └───────┬───────┘
                                           │ (VPC Private Subnet)
                                           ▼
                                   AWS RDS MySQL 8.0
```

- **Frontend**: Vite build uploaded to an **Amazon S3** bucket configured as an Origin for **Amazon CloudFront**. Global edge caching guarantees sub-100ms load times worldwide.
- **Backend**: Containerized Express app running on **AWS ECS with AWS Fargate** (serverless containers — no EC2 server management, auto-scales on traffic).
- **Load Balancer**: **AWS ALB** terminates SSL/TLS with a free certificate from **AWS ACM (Certificate Manager)**.
- **Database**: **AWS RDS MySQL 8.0** in private subnets.
- **Media Storage**: Campaign cover images and proof PDFs uploaded directly to an **Amazon S3 Bucket** and delivered through CloudFront.

---

### Blueprint B: Single-VM Docker Compose (Cost-Effective Capstone)
Ideal for university viva demonstrations, portfolios, and running within the **AWS Free Tier** (< ₹400/month or free):

- **Compute**: One **AWS EC2 instance** (`t3.small` or `t4g.small` Ubuntu 24.04 in `ap-south-1` Mumbai).
- **Orchestration**: Runs `docker-compose.yml` containing:
  - `fundit-frontend`: Nginx Alpine serving React SPA on port 80/443.
  - `fundit-backend`: Node.js Express API on port 5000.
- **Database**: **AWS RDS MySQL 8.0** (`db.t4g.micro` Free Tier) or Dockerized MySQL with persistent EBS volume.
- **SSL**: Free Let's Encrypt SSL via Certbot.
- **Media**: AWS S3 + CloudFront CDN.

---

## 4. Step-by-Step AWS Deployment Walkthrough

### Step 1: Provision the MySQL Database on AWS RDS
1. Sign in to the **AWS Management Console** and select your closest region (e.g. `ap-south-1` Mumbai).
2. Navigate to **RDS** ➔ Click **Create database**.
3. Choose **Standard create** ➔ Engine: **MySQL** ➔ Version: **MySQL 8.0.x**.
4. Template: Choose **Free tier** (or **Production** if Multi-AZ is desired).
5. Settings:
   - DB instance identifier: `fundit-mysql-prod`
   - Master username: `fundit_admin`
   - Master password: Enter a strong 24-character password.
6. Instance configuration: `db.t4g.micro` or `db.t3.micro`.
7. Connectivity:
   - VPC: Default VPC (or your custom application VPC).
   - Public access: **No** (Strict security best practice).
   - VPC security group: Create new `fundit-rds-sg` allowing TCP port `3306` only from the backend security group.
8. Click **Create database**. Note down the **Endpoint** once created.
9. Initialize schema: Connect to RDS via EC2 or bastion host, then run `mysql -h <endpoint> -u fundit_admin -p fundit_db < backend/schema.sql`.

---

### Step 2: Configure AWS S3 & CloudFront for Media
1. In the **AWS S3 Console**, create a bucket named `fundit-media-prod-yourname`.
2. Keep **Block all public access** enabled (best practice).
3. In **CloudFront Console**, create a Distribution with:
   - Origin: Your S3 bucket `fundit-media-prod-yourname`.
   - Origin Access Control (OAC): Create OAC and attach the suggested S3 bucket policy so only CloudFront can read files.
4. Note your CloudFront domain (e.g. `https://d123456abcdef8.cloudfront.net`).

---

### Step 3: Deploy Backend on AWS (ECS Fargate or EC2)

#### Option A: AWS Elastic Container Service (ECS Fargate)
1. In **Amazon ECR**, create a private repository named `fundit-backend`.
2. Authenticate Docker with ECR:
   ```bash
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.ap-south-1.amazonaws.com
   ```
3. Build and tag the image:
   ```bash
   docker build -t fundit-backend ./backend
   docker tag fundit-backend:latest <aws_account_id>.dkr.ecr.ap-south-1.amazonaws.com/fundit-backend:latest
   docker push <aws_account_id>.dkr.ecr.ap-south-1.amazonaws.com/fundit-backend:latest
   ```
4. Create an ECS Task Definition with 0.5 vCPU and 1 GB RAM, pointing to the ECR image, and inject your environment variables from **AWS Systems Manager Parameter Store** or Secrets Manager.
5. Create an ECS Service behind an **Application Load Balancer** with target group health check on `/api/config`.

#### Option B: EC2 with Docker Compose
1. Launch an EC2 Ubuntu 24.04 instance (`t3.small`) with Security Group opening ports `22` (SSH), `80` (HTTP), `443` (HTTPS).
2. Connect via SSH:
   ```bash
   ssh -i your-key.pem ubuntu@<ec2-public-ip>
   ```
3. Install Docker & Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   ```
4. Clone your repository:
   ```bash
   git clone https://github.com/Prashant-git16/FUNDIT.git
   cd FUNDIT
   ```
5. Create production `.env` file with your RDS, Razorpay, Google OAuth, and AWS S3 credentials.
6. Launch containers:
   ```bash
   docker-compose up -d --build
   ```

---

## 5. GitHub Actions CI/CD Pipeline

The repository includes a ready-to-run GitHub Actions workflow located at `.github/workflows/ci-cd.yml`.

### What it does automatically on every push to `main`:
1. **Verification Job**:
   - Boots an Ubuntu runner.
   - Installs Node.js 20.
   - Validates backend syntax and dependencies.
   - Executes `npm run build` on Vite frontend to verify 0 syntax or bundling errors.
2. **Container Build Job**:
   - Uses Docker Buildx to build both `backend/Dockerfile` and `frontend/Dockerfile`.
   - Confirms that production images compile cleanly with zero missing files.

### Optional Continuous Deployment (CD) Extension:
To enable auto-deployment to AWS on every merge, add the following secrets in GitHub Repository Settings ➔ Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `ECR_REPOSITORY`

---

## 6. Pre-Production Checklist (What is Left?)

Before accepting real public donations with real money, verify these final items:

- [x] **IPv4-First DNS Pre-warming**: Configured in `backend/index.js` to eliminate Windows / IPv6 latency on external API calls.
- [x] **Organizer Privacy**: Phone numbers and government ID numbers redacted at both API and UI level for normal users.
- [x] **Admin Moderation Controls**: Approved campaigns only show remarks, close, and delete actions.
- [x] **Homepage Freshness**: New campaigns immediately visible at top of homepage (`sort=newest`).
- [x] **Multi-stage Dockerfiles**: `backend/Dockerfile` and `frontend/Dockerfile` created with non-root security.
- [x] **Nginx SPA Configuration**: `frontend/nginx.conf` configured with gzip compression and React Router fallback.
- [x] **CI/CD Pipeline**: `.github/workflows/ci-cd.yml` configured and active.
- [ ] **Custom Domain & SSL**: Purchase a domain (e.g. `fundit.org` or `fundit.in`) and attach an SSL certificate from AWS Certificate Manager (free) or Let's Encrypt.
- [ ] **Razorpay Live Mode**: Switch Razorpay API keys from `rzp_test_...` to `rzp_live_...` once your business/NGO KYC is completed with Razorpay.
- [ ] **Razorpay Webhooks**: Configure a webhook URL (`https://api.yourdomain.com/api/donations/webhook`) in the Razorpay dashboard to record donations even if the donor closes their browser before returning.
- [ ] **AWS SES Email Service**: Integrate AWS Simple Email Service (SES) to send automated donor receipts and KYC approval emails to campaign organizers.
- [ ] **CloudWatch Monitoring**: Set up a CloudWatch billing alarm ($10 threshold) and error rate alarm.
