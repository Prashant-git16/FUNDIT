# Fundit — Verified Crowdfunding Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933.svg?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20RDS%20%7C%20S3-FF9900.svg?logo=amazonwebservices&logoColor=white)](https://aws.amazon.com/)
[![PM2](https://img.shields.io/badge/Process%20Manager-PM2-2B037A.svg?logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![Nginx](https://img.shields.io/badge/Web%20Server-Nginx-009639.svg?logo=nginx&logoColor=white)](https://nginx.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

**Fundit** is a full-stack, trust-first crowdfunding web application where individuals and non-profits can launch verified fundraisers, accept real-time donations via UPI/cards/netbanking, submit expense receipts with proof-of-work documentation, and guarantee full transparency for donors.

Designed with **React 19**, **Node.js 20 (Express)**, **MySQL 8.0**, and **Razorpay**, with full support for local development, containerized environments via **Docker**, and production deployment on **AWS (EC2 + RDS + PM2 + Nginx + S3/CloudFront)**.

---

## 📑 Table of Contents

- [🌟 Core Platform Features & Recent Updates](#-core-platform-features--recent-updates)
- [🏛️ System Architecture](#️-system-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Repository Structure](#-repository-structure)
- [🚀 Quick Start (Local Development)](#-quick-start-local-development)
  - [Option 1: Bare-Metal Node.js & Local MySQL (Standard)](#option-1-bare-metal-nodejs--local-mysql-standard)
  - [Option 2: Docker Compose (Local Profile)](#option-2-docker-compose-local-profile)
- [🧪 Pre-Seeded Test Accounts](#-pre-seeded-test-accounts)
- [🗄️ Database Schema & Incremental Migrations](#️-database-schema--incremental-migrations)
- [📡 REST API Reference](#-rest-api-reference)
- [☁️ Production Deployment on AWS](#️-production-deployment-on-aws)
  - [Strategy 1: AWS EC2 + PM2 + Nginx + AWS RDS (Recommended — Under 400 MB RAM)](#strategy-1-aws-ec2--pm2--nginx--aws-rds-recommended--under-400-mb-ram)
  - [Strategy 2: Multi-Container Production Docker](#strategy-2-multi-container-production-docker)
  - [Zero-Downtime Updates & Operations](#zero-downtime-updates--operations)
- [🛡️ Security & Privacy Safeguards](#️-security--privacy-safeguards)
- [📄 License](#-license)

---

## 🌟 Core Platform Features & Recent Updates

### 1. Mandatory Identity Verification (KYC Workflow)
- Organizers must submit **Government ID proof** (Aadhaar, PAN, Voter ID, Passport) along with official supporting documents (hospital estimate letters, NGO registration, tuition invoices, community certificates) before a fundraiser can be published.
- Submissions are placed into a `pending` state and held in the moderation queue until verified.

### 2. Admin Moderation & Remarks Portal (`/admin`)
- Administrative dashboard with filterable tabs: **Pending**, **Under Review**, **Active**, **Rejected**, and **All Campaigns**.
- Admins can **Approve**, **Reject**, or transition campaigns into **Under Review** with custom inquiries and direct remarks to request additional documentation.
- Built-in campaign management actions including manual closing, soft deletion, and real-time moderation logging.

### 3. Strict Identity & Privacy Protection
- Organizer personal phone numbers, addresses, and government ID numbers are securely verified by platform administrators and **strictly redacted from the public eye**.
- Non-admin donors and public API consumers never see sensitive organizer contact numbers or raw KYC documents, preventing phishing, identity theft, and spam.

### 4. Dual-Engine Payment Gateway (Real Razorpay + Simulation Mode)
- **Live / Test Razorpay Integration**: Supports UPI QR/apps, debit/credit cards, and netbanking with server-side **HMAC-SHA256 signature verification**.
- **Automated Fallback Simulation Mode**: When Razorpay credentials are not set in `.env`, Fundit automatically enables simulated payments so contributors can test donation workflows end-to-end without needing financial API keys.

### 5. Resilient Dual Storage (AWS S3 + Local Disk Fallback)
- In production, campaign cover images, receipts, and proofs are stored in **AWS S3** and served through **CloudFront CDN**.
- When AWS credentials are omitted during local development, the backend automatically switches to local disk storage (`backend/uploads/`) with no code changes or setup required.

### 6. Dynamic Frontend Runtime Configuration (`GET /api/config`)
- The frontend dynamically negotiates public configurations (Google Client ID, Razorpay Key ID, active storage provider) from `/api/config` upon loading.
- Eliminates the need to bake environment variables or secret keys into compiled client bundles.

### 7. Google OAuth 2.0 & Guided Profile Completion
- One-tap and popup Google Sign-In with automated IPv4 DNS pre-warming to bypass Windows getaddrinfo resolution latency.
- Dedicated `/complete-profile` onboarding for Google users to complete missing phone numbers, occupations, and addresses.

### 8. Full Campaign Lifecycle Management & Editing
- Organizers can edit campaign stories, revise funding targets, upload updated cover photos, and refresh documents at `/campaign/:id/edit`.
- Organizers can post ongoing **Expense Updates** with attached receipt photos and itemized expenditures so donors can audit every spent rupee.

### 9. Modern "Peaceful Charity" UI Design System
- Built with custom CSS design tokens (soft greens, clean card elevations, fluid typography, and dark-mode ready contrast).
- Fixed navigation bar with backdrop blur, mobile drawer menu, and real-time password strength entropy bar with interactive visibility toggles.

---

## 🏛️ System Architecture

```
[ Donors & Organizers ]
           │
           │  (HTTP / HTTPS)
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Nginx Web Server / Proxy                  │
│                                                              │
│  ┌───────────────────────────────┐ ┌──────────────────────┐  │
│  │ Serves Compiled React SPA     │ │ Proxies /api/* and   │  │
│  │ (Vite Static Files /dist)     │ │ /uploads/* to Port   │  │
│  └───────────────────────────────┘ └──────────┬───────────┘  │
└───────────────────────────────────────────────┼──────────────┘
                                                │
                                                ▼
┌──────────────────────────────────────────────────────────────┐
│                Node.js Express Backend (Port 5000)           │
│                Managed 24/7 by PM2 Process Supervisor        │
│                                                              │
│  • Helmet Security Headers          • Rate Limiting (Brute) │
│  • HTTP-only Cookie JWT Auth        • Express-Validator     │
│  • Dynamic Config API (/api/config) • Razorpay HMAC Verification│
└──────────────┬────────────────────────────────┬──────────────┘
               │                                │
               │ Parameterized SQL Queries      │ Media Uploads & Proofs
               ▼                                ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   MySQL 8.0 Database         │ │ Storage Engine               │
│   • AWS RDS (Production)     │ │ • AWS S3 + CloudFront (Prod) │
│   • Local MySQL / Docker     │ │ • Local Disk /uploads (Dev)  │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | **React 19**, **Vite 8**, **React Router v7**, Context API (`AuthContext`), Google Sign-In SDK, Razorpay Checkout SDK, Custom CSS Design Tokens |
| **Backend** | **Node.js 20 LTS**, **Express 4.21**, `helmet`, `cors`, `express-rate-limit`, `cookie-parser`, `express-validator`, `bcrypt`, `jsonwebtoken` |
| **Database** | **MySQL 8.0+** with `mysql2/promise` connection pooling, foreign key constraints, indexes, and atomic transactions |
| **Storage & CDN** | **AWS S3** (`@aws-sdk/client-s3`, `multer-s3`), **Amazon CloudFront**, local disk fallback via `multer` |
| **Payments** | **Razorpay SDK** with server-side HMAC-SHA256 verification and automatic test simulation |
| **Production DevOps** | **AWS EC2 (Ubuntu 24.04 LTS)**, **PM2**, **Nginx**, **AWS RDS**, **Docker & Docker Compose** |

---

## 📁 Repository Structure

```
FUNDIT/
├── backend/                       # Express REST API
│   ├── routes/
│   │   ├── adminRoutes.js         # Moderation queue, user management, status transitions
│   │   ├── authRoutes.js          # Signup, Login, Google OAuth, Profile update, Me
│   │   ├── campaignRoutes.js      # CRUD, filtering, pagination, KYC uploads, editing
│   │   ├── donationRoutes.js      # Razorpay order generation & HMAC payment verification
│   │   └── expenseRoutes.js       # Expense tracking & proof receipt submissions
│   ├── auth.js                    # JWT signing, HTTP-only cookie setting, bcrypt
│   ├── categories.js              # Supported campaign categories list
│   ├── db.js                      # MySQL2 connection pool & health checks
│   ├── index.js                   # Application entry point, CORS, security, /api/config
│   ├── migrate.js                 # Incremental database migration script
│   ├── schema.sql                 # Complete MySQL schema & table definitions
│   ├── seed.sql                   # Sample test users, campaigns, and donations
│   ├── upload.js                  # Multer S3 / Local disk storage resolver
│   ├── Dockerfile                 # Multi-stage production container for backend
│   ├── package.json
│   └── .env.example               # Environment variables template
│
├── frontend/                      # React 19 + Vite client application
│   ├── src/
│   │   ├── components/            # Navbar, Footer, CampaignCard, ProtectedRoute, GoogleSignInButton
│   │   ├── context/               # AuthContext for session management
│   │   ├── pages/                 # Home, Explore, Detail, Create/Edit, Admin, Dashboard, Auth, Profile
│   │   ├── api.js                 # Central fetch client with credentials support
│   │   ├── categories.js          # Client category definitions & icons
│   │   ├── index.css              # Custom CSS design system
│   │   ├── main.jsx               # Application bootstrap
│   │   └── utils.js               # Formatting helpers (currency, date calculations)
│   ├── nginx.conf                 # Nginx configuration for Docker SPA serving
│   ├── Dockerfile                 # Multi-stage frontend container (Node build + Nginx alpine)
│   ├── vite.config.js             # Vite configuration with local API proxy
│   └── package.json
│
├── docker-compose.yml             # Orchestration for Frontend, Backend, and optional local MySQL
├── package.json                   # Root convenience scripts (install:all, dev:backend, dev:frontend)
├── PRODUCTION_DEPLOYMENT.md       # Complete step-by-step AWS EC2 + PM2 + RDS deployment manual
├── SETUP_GUIDE.md                 # Detailed zero-to-hero local and cloud setup guide
└── README.md                      # Project documentation
```

---

## 🚀 Quick Start (Local Development)

### Option 1: Bare-Metal Node.js & Local MySQL (Standard)

#### 1. Prerequisites
- **Node.js**: v18 or v20+
- **MySQL Server**: 8.0+ running locally on port 3306

#### 2. Clone and Install Dependencies
```bash
git clone https://github.com/Prashant-git16/FUNDIT.git
cd FUNDIT

# Install root, backend, and frontend dependencies in one command:
npm run install:all
```

#### 3. Setup the MySQL Database
Log into MySQL and initialize the database:
```sql
CREATE DATABASE IF NOT EXISTS fundit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fundit_user'@'localhost' IDENTIFIED BY 'Fundit@123';
GRANT ALL PRIVILEGES ON fundit_db.* TO 'fundit_user'@'localhost';
FLUSH PRIVILEGES;
```

Load the schema and seed data:
```bash
mysql -u fundit_user -pFundit@123 fundit_db < backend/schema.sql
mysql -u fundit_user -pFundit@123 fundit_db < backend/seed.sql
```
*(If updating an existing database, run `node backend/migrate.js` to automatically apply new columns and KYC tables).*

#### 4. Configure Backend Environment
Copy the example environment file:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=fundit_user
DB_PASSWORD=Fundit@123
DB_NAME=fundit_db
JWT_SECRET=super_secure_random_jwt_secret_at_least_32_characters_long
CORS_ORIGIN=http://localhost:5173
```
> [!NOTE]
> `RAZORPAY_KEY_ID`, `GOOGLE_CLIENT_ID`, and AWS S3 keys are optional for local testing. The application automatically operates in test payment simulation mode and uses local disk storage under `backend/uploads/` when these keys are omitted.

#### 5. Start the Development Servers
Open two terminal windows:

```bash
# Terminal 1 — Backend Express API (Runs on http://localhost:5000)
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend React App (Runs on http://localhost:5173)
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

### Option 2: Docker Compose (Local Profile)

If you prefer running everything in isolated Docker containers with a containerized MySQL 8.0 database:

```bash
# 1. Copy backend environment template
cp backend/.env.example backend/.env

# 2. Build and start frontend, backend, and containerized MySQL
docker compose --profile local up --build
```

- **Frontend**: `http://localhost` (Port 80)
- **Backend API**: `http://localhost:5000`
- **MySQL 8.0**: `localhost:3306`

---

## 🧪 Pre-Seeded Test Accounts

When you import `backend/seed.sql`, the following test accounts are ready to use immediately:

| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Platform Administrator** | `admin@fundit.in` | `Password1!` | Access `/admin`, moderate campaigns, request proofs, approve/reject, close/delete |
| **Campaign Owner** | `priya@example.com` | `Password1!` | Create campaigns, edit fundraisers, post expense receipts, view donor stats |
| **Generous Donor** | `rahul@example.com` | `Password1!` | Browse campaigns, make live/simulated donations, view personal contribution history |

---

## 🗄️ Database Schema & Incremental Migrations

The database is built on **MySQL 8.0** using InnoDB, full UTF-8 character encoding (`utf8mb4`), foreign key constraints, and exact financial arithmetic.

### Key Tables
1. **`users`**: User accounts (name, email, password hash, Google ID, role, verified phone, occupation, address, profile status).
2. **`campaigns`**: Fundraisers (`target_amount`, `raised_amount` in `DECIMAL(12,2)`, deadline, status enum `['pending', 'review', 'active', 'rejected', 'closed', 'deleted']`, KYC details, proof document keys, admin remarks).
3. **`donations`**: Contribution records (`amount`, `currency`, `is_anonymous`, `razorpay_order_id`, `razorpay_payment_id`, status).
4. **`expenses`**: Audited expense entries linked to campaigns (`amount`, `description`, `proof_image_key`, receipt timestamps).
5. **`moderation_logs`**: Administrative audit trail for campaign decisions.

### Running Migrations
To upgrade an existing database without dropping data:
```bash
node backend/migrate.js
```

---

## 📡 REST API Reference

### System & Configuration
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Service health status, environment, and uptime |
| `GET` | `/api/config` | Public | Exposes public Google Client ID, Razorpay Key ID, and storage provider status |

### Authentication & Profiles
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new account with validation & password strength |
| `POST` | `/api/auth/login` | Public | Authenticate via email/password; sets HTTP-only JWT cookie |
| `POST` | `/api/auth/google` | Public | Google OAuth 2.0 credential exchange |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current session user profile |
| `PUT` | `/api/auth/profile` | Authenticated | Update user phone, occupation, address (`/complete-profile`) |
| `POST` | `/api/auth/logout` | Authenticated | Clear HTTP-only session cookie |

### Campaigns
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/campaigns` | Public | List active campaigns with search, category filtering, sort, and pagination |
| `GET` | `/api/campaigns/:id` | Public | View campaign story, funding progress, verified expenses, and sanitized organizer info |
| `GET` | `/api/campaigns/my/list` | Authenticated | List all fundraisers created by the logged-in user |
| `POST` | `/api/campaigns` | Authenticated | Create fundraiser with cover photo and KYC documents (`pending` status) |
| `PUT` / `PATCH` | `/api/campaigns/:id` | Owner / Admin | Edit campaign title, description, target amount, or cover image |
| `POST` | `/api/campaigns/:id/close` | Owner / Admin | Mark an active campaign as closed |
| `DELETE` | `/api/campaigns/:id` | Owner / Admin | Soft-delete a campaign |

### Donations & Payments
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/donations/create-order`| Authenticated | Generate a Razorpay order ID or simulated test order |
| `POST` | `/api/donations/verify` | Authenticated | Verify HMAC-SHA256 signature and atomically credit the campaign |
| `GET` | `/api/donations/my` | Authenticated | Retrieve the current user's complete donation history |

### Expenses & Receipts
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/expenses/:campaignId` | Public | Retrieve verified expense breakdown and receipt images for a campaign |
| `POST` | `/api/expenses/:campaignId` | Owner | Submit new expense record with attached receipt image |

### Admin Moderation
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/campaigns` | Admin | Review campaigns across all statuses (`pending`, `review`, `active`, etc.) |
| `POST` | `/api/admin/campaigns/:id/moderate` | Admin | Take moderation action: `approve`, `reject`, `request_proof`, `remark`, `close`, `delete` |
| `GET` | `/api/admin/users` | Admin | List registered platform users and roles |

---

## ☁️ Production Deployment on AWS

Fundit provides two production deployment models depending on your infrastructure preference:

### Strategy 1: AWS EC2 + PM2 + Nginx + AWS RDS (Recommended — Under 400 MB RAM)

This is the **most resource-efficient, cost-effective setup**, designed to run smoothly on the **AWS Free Tier** (`t2.micro` / `t3.micro` EC2 + `db.t3.micro` RDS):
- **Compute**: AWS EC2 instance running Ubuntu 24.04 LTS.
- **Backend Supervisor**: **PM2** manages Node.js 24/7 with automatic restarts, log rotation, and boot-up persistence.
- **Web Server & Reverse Proxy**: **Nginx** serves the compiled React Single Page Application and proxies all `/api/*` traffic to Node.js on port 5000.
- **Database**: **AWS RDS MySQL 8.0** in a private VPC with automated daily backups and encrypted gp3 storage.
- **Storage & CDN**: **AWS S3** bucket + **Amazon CloudFront** distribution for ultra-fast, global asset delivery.

👉 **For the complete, step-by-step walkthrough, see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).**

#### Quick AWS Server Setup Summary:

```bash
# 1. SSH into your Ubuntu 24.04 EC2 instance
ssh -i "fundit-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>

# 2. Install Node.js 20 LTS, Nginx, PM2, and MySQL Client
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs nginx git mysql-client
sudo npm install -g pm2

# 3. Clone Repository
git clone https://github.com/Prashant-git16/FUNDIT.git
cd FUNDIT

# 4. Initialize Database on AWS RDS
mysql -h <YOUR-RDS-ENDPOINT> -u admin -p fundit_db < backend/schema.sql

# 5. Configure backend/.env & Start PM2
cd backend
npm install --omit=dev
nano .env  # Enter your production credentials (RDS host, JWT secret, S3, Razorpay)
pm2 start index.js --name fundit-api
pm2 save
pm2 startup

# 6. Build Frontend & Configure Nginx
cd ../frontend
npm install
npm run build

# 7. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/default
# Point root to /home/ubuntu/FUNDIT/frontend/dist and proxy /api/ to http://localhost:5000
sudo nginx -t && sudo systemctl restart nginx
```

---

### Strategy 2: Multi-Container Production Docker

If you prefer Docker containerization in production:
1. Ensure your AWS RDS database is provisioned and reachable.
2. In `backend/.env`, set `DB_HOST` to your AWS RDS endpoint.
3. Run the production containers without starting the local MySQL container:
```bash
docker compose up -d --build backend frontend
```
The frontend container uses a multi-stage build that compiles the React app and serves it via an optimized, gzip-compressed Alpine Nginx server, automatically reverse-proxying `/api/` to the backend container.

---

### Zero-Downtime Updates & Operations

When deploying updates from your GitHub repository to your production server:

```bash
cd /home/ubuntu/FUNDIT
git pull origin main

# Update backend (if modified)
cd backend
npm install --omit=dev
pm2 restart fundit-api

# Update frontend (if modified)
cd ../frontend
npm install
npm run build
```

#### Essential Diagnostic Commands:
- **Live backend logs**: `pm2 logs fundit-api`
- **Process status & RAM usage**: `pm2 status` or `pm2 monit`
- **Nginx status**: `sudo systemctl status nginx`
- **Test Nginx syntax**: `sudo nginx -t`

---

## 🛡️ Security & Privacy Safeguards

- **Immune to XSS Session Hijacking**: JWT auth tokens are delivered solely in `HttpOnly; SameSite=Lax` cookies, preventing client-side scripts from reading session credentials.
- **SQL Injection Elimination**: 100% of database interactions use `mysql2` parameterized prepared statements with `?` placeholders.
- **Precise Financial Arithmetic**: All monetary transactions use `DECIMAL(12, 2)` to eliminate floating-point precision errors.
- **Atomic Double-Entry Transactions**: Donation records and campaign balances update within ACID transactions (`START TRANSACTION` ... `COMMIT`). If either step fails, the entire transaction rolls back.
- **Public Organizer Privacy**: Organizers' personal phone numbers and KYC identity proofs are verified internally by admins and redacted from public API outputs.
- **Hardened File Uploads**: Uploads are restricted to 5 MB, validated against strict MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), and assigned cryptographically secure UUID filenames to prevent path traversal attacks.
- **Traffic Protection**: Security headers applied via `helmet`, rate limiting enabled via `express-rate-limit`, and CORS origin whitelisting strictly enforced.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
