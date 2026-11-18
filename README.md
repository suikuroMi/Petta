# Petta — Centralized Pet Health Record & Clinic Appointment System

Full-stack working prototype built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS + PostgreSQL (`pg`) / SQLite (`node:sqlite`)**, implementing the CS318 Software Engineering I architecture and UI mockups.

## Key Features

- **Role-Based Authentication & Portals (`/login`, `/register`, `/`)**
  - Password hashing (`crypto.scryptSync` + per-user salt) & `HttpOnly` session cookies (`petta_session`).
  - Authentication is required before accessing pet profiles, health ledgers, or clinic queues.
  - Role-based access control for **Pet Owners (`owner`)**, **Attending Veterinarians (`vet`)**, **Clinic Staff (`staff`)**, and **System Admins (`admin`)**.
- **Pet Owner Portal (`/overview`, `/pets`, `/pets/[id]/history`, `/appointments`, `/appointments/book`, `/assistant`)**
  - Register, edit, and manage companion profiles (species, breed, sex, DOB, weight, allergies, microchip ID).
  - Immutable **Digital Health & Vaccination Ledger** with category tabs, batch/lot traceability, next booster due dates, and print-to-PDF support.
  - **Capacity-Controlled Appointment Booking** with interactive calendar, Morning/Afternoon live slot availability, remaining quota display, full-capacity blocking, rescheduling, cancellation, and in-person settlement policy notice.
  - **Preventive Health Reminders** popover & dashboard alerts.
  - **AI Care Assistant (`/assistant`)** UI shell ready for Phase 2 LLM/RAG training and guardrails.
- **Clinic & Veterinarian Portal (`/dashboard`, `/schedule`, `/records`)**
  - Live patient queue with status transitions (`Pending` → `Confirmed` → `Checked-In` → `In-Consultation` → `Completed` / `Cancelled`), search, filtering, and walk-in booking.
  - **Immutable Clinical EMR & Vaccine Batch Entry** (restricted to `vet` role).
  - **Capacity & Slot Configuration** (`/schedule`) controlling slot duration, concurrent vets, and Mon–Sun operating hours & quotas.
- **Admin Governance Portal (`/clinics`)**
  - Register new veterinary facilities and toggle clinic verification status.

## Seeded Accounts (Password: `password123`)

- **Pet Owner (Milo & Luna):** `maria.santos@petta.local`
- **Pet Owner (Bantay):** `carlos.cruz@petta.local`
- **Attending Veterinarian:** `dr.renz@healthypaws.vet`
- **Clinic Staff:** `marco.staff@healthypaws.vet`
- **System Admin:** `admin@petta.local`

## Local Development (Zero-Config SQLite)

```bash
npm install
npm run dev
```

When `DATABASE_URL` is not set, Petta automatically initializes and seeds `data/petta.db` using SQLite (`db/schema.sql`).

## Deploying Database & App to Render (PostgreSQL)

1. **Create a PostgreSQL Database on Render** (`New` → `PostgreSQL`) and copy its **External Database URL**.
2. **Initialize & Seed the Render Database** from your local machine before deploying the app:
   ```powershell
   $env:DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE"
   npm run db:init
   ```
   *(This runs `scripts/init-postgres.mjs` using `db/schema.postgres.sql` and seeds all tables & accounts.)*
3. **Deploy the Web Service on Render** (`New` → `Web Service` connected to `https://github.com/suikuroMi/Petta.git`, or use the included `render.yaml` Blueprint):
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variable:** Set `DATABASE_URL` to your Render PostgreSQL **Internal Database URL** and `NODE_ENV=production`.
