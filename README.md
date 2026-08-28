# Pratha EMS - Enterprise HR Management System & Dashboard

A modern, high-performance **Enterprise HR Management System (EMS)** and Workforce Dashboard built with a unified identity model, dynamic RBAC, leave management, and company announcements.

---

## 🌟 Tech Stack

- **Monorepo**: Turborepo / PNPM / Bun Workspaces
- **Backend API**: Node.js, Express, TypeScript, Prisma ORM, Neon PostgreSQL
- **Frontend Dashboard**: Next.js 14 (App Router), React, Tailwind CSS, Framer Motion, Lucide Icons, Zustand
- **Security & Authentication**:
  - Argon2id password hashing
  - Rotating refresh tokens with token family theft detection
  - Live DB-rederived RBAC middleware & granular permissions
  - CSRF protection, rate limiting, and account lockouts

---

## 🏗️ Architecture & Core Modules

- **Unified Identity & Workforce**: Single `User` table managing authentication, employee profile (`employeeCode`, `position`, `departmentId`, `salary`, `status`).
- **3 System Roles**:
  - `ADMIN`: Full administrative control across users, roles, and settings.
  - `HR`: Workforce management, leave approvals, salary viewing, and announcements.
  - `EMPLOYEE`: Self-service profile, leave applications, and company noticeboard.
- **Leave & Time-Off Management**: Dynamic leave quota policies (`LeaveType`) and applications (`LeaveRequest`) with status workflows (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`).
- **Noticeboard / Announcements**: Company-wide broadcasts authored by HR/Admin.
- **Departments & Audit Logs**: Division tracking and immutable audit logging for security compliance.

---

## 🚀 Getting Started

### 1. Prerequisites
- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) (v20+)
- PostgreSQL database (or [Neon DB](https://neon.tech/))

### 2. Environment Setup
Copy the environment template and configure your database and JWT secrets:
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Database Setup & Seeding
```bash
bun x prisma generate
bun x prisma db push
bun x tsx prisma/seed.ts
```

### 5. Run Development Servers
```bash
# Run API (Port 5001)
bun run dev:api

# Run Web Dashboard (Port 3000)
bun run dev:web
```

---

## 🔑 Default Development Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **ADMIN** | `admin@pratha.com` | `Admin@123456` |
| **HR** | `hr@pratha.com` | `Hr@123456` |
| **EMPLOYEE** | `alex.morgan@pratha.com` | `Emp@123456` |
