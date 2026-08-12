<p align="center">
  <img src="https://raw.githubusercontent.com/galangjrr/gc-net-hub/main/public/logo/Logo%20GC%20Net%20Anim.gif" width="520" alt="GC Net Animated Logo" />
</p>

<h1 align="center">GC Net Booking & Management System</h1>

<p align="center">
  <img src="https://img.shields.io/github/last-commit/galangjrr/gc-net-hub?style=for-the-badge&color=7c3aed" alt="Last Commit" />
  <img src="https://img.shields.io/badge/BUILD-PASSING-4c1?style=for-the-badge" alt="Build Passing" />
  <img src="https://img.shields.io/badge/HOSTED%20ON-VERCEL-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Hosted on Vercel" />
  <img src="https://img.shields.io/badge/DATABASE-SUPABASE-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Database Supabase" />
</p>

GC Net Booking is an end-to-end, real-time iCafe (Internet Cafe) management system built for high-performance operations, automated billing, live PC status monitoring, POS inventory management, and financial reporting.

---

## Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/NEXT.JS-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TYPESCRIPT-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/REACT-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TAILWIND_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/SUPABASE-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/POSTGRESQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/NODE.JS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
</p>

---

## Architecture Overview

The system is built on Next.js App Router and utilizes Supabase PostgreSQL as its persistent database layer. Data fetching and state updates operate in real-time using pollers and serverless API endpoints backed by a Service Role security model.

```
+-------------------------------------------------------+
|                    Client Layer                       |
|  (Next.js React Server & Client Components / Tailwind) |
+---------------------------+---------------------------+
                            | (HTTP / REST)
                            v
+-------------------------------------------------------+
|                    Server Layer                       |
|           Next.js App Router API Routes               |
|      (Auth Guard, Payload Validation, Business Logic)  |
+---------------------------+---------------------------+
                            | (Supabase Service Role Key)
                            v
+-------------------------------------------------------+
|                   Database Layer                      |
|                Supabase PostgreSQL                   |
|  (Tables: pcs, pakets, inventory, bookings, logs, etc)|
+-------------------------------------------------------+
```

---

## Features

### 1. Public Self-Service Portal
* **Real-time PC Monitoring:** Live availability indicators across all station units with countdown timers for occupied seats.
* **Online Booking Request:** Automated seat reservation with custom duration selection and payment proof upload (QRIS / Cash).
* **Responsive Interface:** Dark-mode optimized UI with smooth motion animations designed for both desktop and mobile web.

### 2. Admin & Staff Dashboard
* **Verification Queue:** Real-time queue for approving or rejecting incoming customer booking requests.
* **Audio & Desktop Alerts:** Automatic sound chimes and browser push notifications when new booking requests arrive.
* **Manual Billing Override:** Instant activation of sessions for walk-in cash customers.
* **Dynamic Time Extensions:** Capability to extend, modify, or cancel active sessions.

### 3. POS & Inventory Management
* **Point of Sale (POS):** Fast-checkout interface for food, drinks, and gaming merchandise.
* **Real-Time Stock Deductions:** Automatic inventory validation preventing negative stock checkout.
* **Inventory Master Control:** Full CRUD interface to update product pricing, categories, and stock counts.

### 4. Financial & Reporting System
* **Automated Shift Audit:** Automated parser for daily PDF revenue reports with instant DB sync.
* **Activity Logs:** Comprehensive transaction history recording start time, end time, total price, and cancellation reasons.

### 5. Security & Access Control
* **Cookie-Based Authentication:** Protected administrative routes verified via server-side session checks.
* **Payload Validation:** MIME-type verification for file uploads (images and PDFs) on both client and server.
* **Database Isolation:** Row Level Security (RLS) enabled on PostgreSQL; API routes execute via a secured Service Role key to prevent unauthorized direct database writes.

---

## Database Schema

The PostgreSQL database consists of 6 primary relational tables:

* `pcs`: Manages hardware specs, status (`available`, `occupied`), and expected end times.
* `pakets`: Defines billing packages (hourly, fixed-time specials, and custom rates).
* `inventory`: Tracks store merchandise, pricing, and stock levels.
* `bookings`: Stores active and pending reservation records.
* `logs`: Archives completed or cancelled transactions for auditing.
* `settings`: Stores global configurations, counters, and daily revenue metrics.

---

## Environment Variables

To run the application, configure the following environment variables in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

---

## Getting Started

### Prerequisites
* Node.js v18.x or higher
* npm / pnpm / yarn
* Supabase Account & Project

### Local Installation

1. **Clone Repository**
   ```bash
   git clone https://github.com/galangjrr/gc-net-hub.git
   cd gc-net-hub
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   * Navigate to the Supabase SQL Editor for your project.
   * Execute the database initialization script (schema and seed data).

4. **Environment Setup**
   * Create a `.env.local` file in the root directory.
   * Populate the required environment variables as listed above.

5. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment

### Vercel Deployment

1. Import the repository into your Vercel Dashboard.
2. Set the build command to `npm run build`.
3. Add the `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` into the **Environment Variables** panel.
4. Trigger the deployment.

---

## License

Copyright (c) 2026 GC Net. All rights reserved.
