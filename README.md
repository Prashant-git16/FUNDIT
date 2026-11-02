# Fundit — Full-Stack Verified Crowdfunding Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-orange.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

**Fundit** is a full-stack, trust-first crowdfunding web application where individuals and organizations can start verified fundraisers, accept online donations, track expenses with proof receipts, and ensure complete transparency for donors.

Built with **React 19**, **Node.js (Express)**, **MySQL 8.0**, and **Razorpay**, with support for **Docker** and cloud deployment on **AWS**.

---

## 🌟 Why Fundit?

Most traditional donation platforms suffer from trust issues—fraudulent campaigns, unverified organizers, and zero accountability for how collected funds are spent. Fundit tackles this with three core principles:

1. **Mandatory Identity Verification**: Organizers must submit a valid Government ID (Aadhaar, PAN, Passport) and supporting proof documents (hospital bills, certificates, estimate letters) before a campaign can go live.
2. **Admin Moderation Workflow**: Every submitted campaign lands in an administrative portal where admins review proofs, request further verification, send direct remarks, or approve the campaign to the homepage.
3. **Transparent Expense Tracking**: Fundraisers can post ongoing expense updates with attached receipts and bills so donors can track exactly how their contributions are utilized.
4. **Donor & Organizer Privacy**: Organizers' personal phone numbers and government ID details are verified internally by admins and strictly redacted from the public view to prevent spam and identity theft.

---

## 🛠️ Tech Stack

### Frontend
* **React 19** + **Vite 8**: Component-driven Single Page Application (SPA).
* **React Router v7**: Client-side routing with protected routes for authenticated users and administrators.
* **Vanilla CSS (Design Tokens)**: Clean, custom-built design system with responsive layouts, accessible typography, and smooth micro-interactions. No heavyweight UI frameworks.

### Backend
* **Node.js & Express.js**: Modular REST API with structured route handlers.
* **Security Middleware**: `helmet` for security headers, `cors` with origin whitelisting, and `express-rate-limit` for brute-force protection.
* **Authentication**: Stateless JWT authentication stored in secure **HTTP-only, SameSite=Lax** cookies (immune to JavaScript XSS theft), with support for Google OAuth 2.0.
* **Validation**: `express-validator` for strict schema checking on all incoming payloads.

### Database & Storage
* **MySQL 8.0**: Relational database with parameterized queries (`mysql2/promise`), foreign keys, and atomic transactions.
* **AWS S3 + CloudFront CDN**: Cloud media storage for campaign cover images and proof documents (with local disk storage fallback for offline development).

### Payments
* **Razorpay SDK**: Real-time payments supporting UPI, Cards, and Netbanking with server-side HMAC-SHA256 signature verification.

---

## 📁 Repository Structure

```
FUNDIT/
├── backend/                       # Express REST API
│   ├── routes/
│   │   ├── adminRoutes.js         # Moderation & organizer inquiries
│   │   ├── authRoutes.js          # Signup, Login, Google OAuth, Profile
│   │   ├── campaignRoutes.js      # Campaign CRUD, pagination, filtering
│   │   ├── donationRoutes.js      # Razorpay order generation & HMAC verification
│   │   └── expenseRoutes.js       # Expense tracking & proof uploads
│   ├── auth.js                    # JWT verification & password hashing
│   ├── categories.js              # Supported campaign categories
│   ├── db.js                      # MySQL2 connection pool
│   ├── upload.js                  # Multer S3 / local disk image handler
│   ├── schema.sql                 # MySQL table definitions
│   ├── seed.sql                   # Sample demo data for local testing
│   ├── Dockerfile                 # Multi-stage production container
│   ├── package.json
│   └── .env.example               # Template environment configuration
│
├── frontend/                      # React 19 + Vite client
│   ├── src/
│   │   ├── components/            # Navbar, Footer, CampaignCard, ProtectedRoute
│   │   ├── context/               # AuthContext for global user session
│   │   ├── pages/                 # Home, Explore, Detail, Admin, Dashboard, Auth
│   │   ├── api.js                 # Central fetch client with credentials
│   │   └── index.css              # Custom CSS design system
│   ├── nginx.conf                 # Nginx config for Docker SPA serving
│   ├── Dockerfile                 # Multi-stage frontend container
│   └── package.json
├── docker-compose.yml             # Multi-container orchestration (App + MySQL)
├── package.json                   # Root convenience scripts
├── PRODUCTION_DEPLOYMENT.md       # Complete step-by-step AWS EC2 + RDS deployment guide
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Option 1: Running with Docker (Fastest)

If you have Docker Desktop installed, you can start the entire platform with one command:

```bash
# 1. Clone the repository
git clone https://github.com/Prashant-git16/FUNDIT.git
cd FUNDIT

# 2. Create your backend environment file
cp backend/.env.example backend/.env

# 3. Start Frontend, Backend, and local MySQL
docker compose --profile local up --build
```

Open your browser at **`http://localhost`**.

---

### Option 2: Running with Node.js & Local MySQL

#### 1. Prerequisites
* **Node.js** v18 or v20+
* **MySQL 8.0** running locally on port 3306

#### 2. Setup Database
Open your MySQL terminal and run:
```sql
CREATE DATABASE IF NOT EXISTS fundit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'fundit_user'@'localhost' IDENTIFIED BY 'Fundit@123';
GRANT ALL PRIVILEGES ON fundit_db.* TO 'fundit_user'@'localhost';
FLUSH PRIVILEGES;
```

Load the schema and sample seed data:
```bash
mysql -u fundit_user -pFundit@123 fundit_db < backend/schema.sql
mysql -u fundit_user -pFundit@123 fundit_db < backend/seed.sql
```

#### 3. Install Dependencies
```bash
# From root directory:
npm run install:all
```

#### 4. Configure Environment
Copy `backend/.env.example` to `backend/.env` and update your values:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=fundit_user
DB_PASSWORD=Fundit@123
DB_NAME=fundit_db
JWT_SECRET=your_super_secret_jwt_key_here
CORS_ORIGIN=http://localhost:5173
```
*(Razorpay, Google OAuth, and AWS S3 keys are optional for local development—the app automatically runs in test simulation mode with local image storage if keys are left blank).*

#### 5. Start Servers
Open two terminals:

```bash
# Terminal 1 — Backend API (:5000)
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend (:5173)
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Pre-Seeded Test Accounts

When you import `backend/seed.sql`, the following test accounts are ready to use:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Platform Admin** | `admin@fundit.in` | `Password1!` | Approve/reject campaigns, request proof, send remarks |
| **Campaign Owner** | `priya@example.com` | `Password1!` | Create campaigns, post expenses, view donor stats |
| **Donor** | `rahul@example.com` | `Password1!` | Explore causes, make donations, view history |

---

## 📡 Key REST API Routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Sign in and set HTTP-only JWT cookie |
| `POST` | `/api/auth/google` | Public | Google OAuth 2.0 credential exchange |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |
| `POST` | `/api/auth/logout` | Authenticated | Clear session cookie |
| `GET` | `/api/campaigns` | Public | Browse approved campaigns with search, filter, and sort |
| `GET` | `/api/campaigns/:id` | Public | View campaign details, proof docs, and expense reports |
| `POST` | `/api/campaigns` | Authenticated | Create fundraiser with cover image and KYC verification |
| `POST` | `/api/donations/create-order` | Authenticated | Create Razorpay order |
| `POST` | `/api/donations/verify` | Authenticated | Verify HMAC-SHA256 signature and record donation |
| `POST` | `/api/expenses/:campaignId` | Owner | Submit expense receipt with bill image |
| `GET` | `/api/admin/campaigns` | Admin | Review pending, review, active, and rejected campaigns |
| `POST` | `/api/admin/campaigns/:id/moderate` | Admin | Approve, request proof, send remarks, close, or delete |

---

## ☁️ Production Deployment on AWS (Without Docker)

Fundit can be deployed on a lightweight **AWS EC2 Free Tier** instance (`t2.micro` or `t3.micro`) backed by **AWS RDS MySQL 8.0**:
* **Backend**: Node.js 20 managed 24/7 by **PM2** process supervisor (automatic crash restarts and reboot recovery).
* **Frontend & Reverse Proxy**: **Nginx** serves compiled React static assets and reverse-proxies `/api/*` requests to port 5000.
* **Database**: **AWS RDS MySQL 8.0** managed cloud database in a private VPC.

For the complete step-by-step walkthrough, see **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)**.

---

## 🛡️ Security Implementation Details

* **No XSS Token Leaks**: Auth tokens are stored in `HttpOnly; SameSite=Lax` cookies, preventing any client-side JavaScript from accessing session keys.
* **SQL Injection Prevention**: All queries execute using `mysql2` prepared statements with parameterized placeholders (`?`). String interpolation in SQL is strictly forbidden.
* **Exact Rupee Math**: Monetary amounts use `DECIMAL(12, 2)` instead of floating-point numbers to eliminate binary rounding errors.
* **Atomic Payment Verification**: Donation recording and campaign balance updates run inside single database transactions (`START TRANSACTION` ... `COMMIT`). If either step fails, the entire transaction rolls back.
* **Safe Uploads**: Uploaded files are validated for MIME type, restricted to 5 MB, and saved with randomly generated UUID filenames to prevent path traversal attacks.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
