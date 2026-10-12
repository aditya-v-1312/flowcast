# ⚡ FlowCast — Freelance Invoice Generator & Cash Flow Forecasting Tool

A production-grade, full-stack **MERN + TypeScript** platform tailored for freelancers and contractors to manage client billing, issue professional branded PDF invoices, and project cash flow using predictive delay algorithms and native MongoDB aggregation pipelines.

> **Final Semester Project:** Advanced Web Development (MERN Stack)  
> **Author:** Aditya  
> **Tech Stack:** TypeScript, React (Vite), Node.js, Express, MongoDB Atlas / Mongoose, Tailwind CSS, Recharts, PDFKit, node-cron

---

## 🌟 Key Highlights & Engineering Innovations

1. **Predictive Cash Flow Forecasting Engine:**
   * Instead of naively assuming invoices are settled on their `dueDate`, FlowCast computes each client's **Historical Payment Lag** (e.g. Client A usually pays 8 days late; Client B pays early).
   * Dynamically shifts projected settlement dates into realistic **30, 60, and 90-day cash buckets**.
   * Integrates fixed **Recurring Business Expenses** (software subscriptions, rent, taxes) to compute **Net Cash Runway**.
   * **"What-If" Scenario Simulator**: Interactive slider allowing freelancers to simulate the cash impact if client payments are delayed by 15, 30, or 45 days.

2. **Database-Native Aggregations (Zero In-Memory Overhead):**
   * **Pipeline 1 (`$facet`)**: Computes executive KPI cards (Total Outstanding, Overdue Amount, Collected Revenue, Tax Reserves) and 6-month historical revenue trends in a **single database round-trip**.
   * **Pipeline 2 (Client Reliability)**: Joins invoice payments, computes date differences (`$subtract`, `$divide`), calculates average delays, and scores client reliability (0–100).
   * **Pipeline 3 (Forecast Aggregation)**: Correlates pending balances with client delay metrics to output time-series projections.

3. **Vectorized Server-Side PDF Engine:**
   * Generates crisp, downloadable A4 PDF invoices on the server with clean typography, line items table, dynamic tax and discount calculations, and bank/UPI payment instructions.

4. **Background Automation (`node-cron`):**
   * Scheduled daily midnight cron job (`0 0 * * *`) that scans for invoices where `dueDate < today` and automatically transitions status from `SENT` / `VIEWED` to `OVERDUE`.
   * On-demand trigger endpoint (`POST /api/analytics/trigger-cron-check`) for demonstrations and testing.

5. **Tokenized Public Client Portal:**
   * Generates a secret access link for each invoice (e.g., `/pay/:token`).
   * Clients can view branded invoices and bank wire details without logging in.
   * Automatically logs open receipts by marking invoice status as `VIEWED` upon client link opening.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** (Local instance on `mongodb://localhost:27017` or a free MongoDB Atlas URI)

### 2. Environment Setup
The backend `.env` file is located in `server/.env`:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/freelance_invoice_db
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

### 3. Quick Setup & Seed Database
In the root directory:
```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# (Optional) Seed database with realistic demo freelancer, clients, invoices, and expenses
cd ../server && npm run seed
```

### 4. Running Development Servers
You can run the backend and frontend in separate terminals:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Starts Express server on http://localhost:5001
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Starts Vite React dev server on http://localhost:5173
```

---

## 📁 Repository Structure

```text
final-project/
├── PROJECT_DOCUMENTATION.md    # Detailed academic specification & architectural blueprints
├── README.md                   # Quickstart and overview guide
│
├── server/                     # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/             # Database connection (db.ts)
│   │   ├── controllers/        # Auth, Invoice, Client, Project, Expense, Analytics
│   │   ├── cron/               # Scheduled node-cron tasks (invoiceCron.ts)
│   │   ├── middleware/         # JWT authentication & global error handler
│   │   ├── models/             # Mongoose schemas (User, Client, Invoice, Project, Payment, Expense)
│   │   ├── pipelines/          # Advanced MongoDB aggregation pipelines ($facet, $lookup, $group)
│   │   ├── routes/             # REST API routes
│   │   ├── services/           # Vectorized PDF generator (pdfService.ts)
│   │   ├── types/              # TypeScript interfaces and DTOs
│   │   ├── seed.ts             # Realistic database seeder
│   │   └── server.ts           # Server entry point
│   ├── tsconfig.json
│   └── package.json
│
└── client/                     # Frontend Application (React + Vite + TypeScript)
    ├── src/
    │   ├── api/                # Axios instance with JWT interceptors
    │   ├── components/         # Layout and navigation Sidebar
    │   ├── context/            # AuthContext (login, state persistence)
    │   ├── pages/
    │   │   ├── DashboardPage.tsx       # KPI cards, Recharts revenue trends, overdue alerts
    │   │   ├── CashFlowPage.tsx        # Predictive forecast visualizer & What-If simulator
    │   │   ├── InvoicesPage.tsx        # Invoices list, status pills, manual payment modal
    │   │   ├── InvoiceBuilderPage.tsx  # Dynamic line item calculator & live preview
    │   │   ├── InvoiceDetailPage.tsx   # Detailed invoice view & payment history
    │   │   ├── ClientsPage.tsx         # Client profiles with reliability badges
    │   │   ├── ProjectsPage.tsx        # Projects & milestone trackers
    │   │   ├── PublicInvoicePage.tsx   # Token-based client view portal (/pay/:token)
    │   │   ├── SettingsPage.tsx        # Freelancer branding, currency, and bank details
    │   │   ├── LoginPage.tsx           # Authentication with quick demo fill
    │   │   └── RegisterPage.tsx        # Onboarding
    │   ├── types/              # Frontend TypeScript definitions
    │   ├── App.tsx             # React Router routing
    │   └── main.tsx
    ├── tsconfig.json
    ├── tailwind.config.js
    └── package.json
```

---

## 🧪 Evaluation & Viva Demonstration Tips

When demonstrating the project during evaluation:

1. **MongoDB Aggregation Pipelines:** Show `server/src/pipelines/analyticsPipelines.ts` to highlight how the dashboard statistics (`$facet`) and cash flow predictions run directly inside the database engine.
2. **Client Reliability & Lag:** Open the **Clients** tab to demonstrate how each client has an empirical payment delay factor (e.g. `+8 Days Late`, `+24 Days Late`) that dynamically feeds into the forecast.
3. **Cash Flow Visualizer:** Open the **Cash Flow Forecast** tab and move the **"What-If" Runway Simulator slider** to demonstrate how potential payment delays stress-test the net cash position against recurring expenses.
4. **Server-Side PDF Generation:** Click **"Download PDF"** on any invoice to show the server generating a vectorized A4 invoice buffer with payment details.
5. **Client Portal & Open Tracking:** Click **"Client Link"**, open the URL in an incognito window without logging in, and show how opening the invoice automatically updates the status from `SENT` to `VIEWED`.
6. **node-cron Automation:** Click **"Sync Data & Delays"** on the dashboard to demonstrate on-demand execution of the overdue cron job.
