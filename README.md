# Military Asset Management System

A full-stack web application for tracking, managing, and auditing military assets (vehicles, weapons, equipment, etc.) across multiple bases. Features include asset purchases, transfers, assignments, role-based access control (RBAC), and comprehensive audit logging.

---

## Features

- **Asset Tracking:** Manage vehicles, weapons, equipment, and more.
- **Purchases & Transfers:** Record and approve asset purchases and inter-base transfers.
- **Assignments:** Assign assets to users and track their status.
- **RBAC:** Role-based access for Admin, Commander, and Officer.
- **Audit Logging:** All sensitive actions are logged for compliance.
- **Dashboard:** Visualize asset metrics, movements, and recent activities.

---

## Tech Stack

- **Frontend:** React, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT
- **Deployment:** Vercel (frontend), Render (backend)

---

## Data Models

- **User:** name, email, password, role, rank, base, department, permissions, status
- **Base:** name, location, commander, status, capacity
- **Asset:** assetId, name, type, category, specifications, currentBase, status, assignedTo, purchaseInfo, maintenanceHistory, location
- **Purchase, Transfer, Assignment, AuditLog** (see `/backend/models/` for full schema)

---

## Setup Instructions

### Backend

1. `cd backend`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your MongoDB URI and JWT secret.
4. (Optional) `node seed.js` to seed demo data.
5. `npm start`

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm start` (for development) or `npm run build` (for production)

### Database

- Use MongoDB Atlas or local MongoDB.
- Update your connection string in `backend/.env`.

---

## API Endpoints (Sample)

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/assignments/users/available` - List users for assignment
- `GET /api/assignments/assets/available` - List available assets
- `POST /api/assignments` - Create assignment
- `GET /api/assignments` - List assignments
- `POST /api/purchases` - Create purchase
- `GET /api/purchases` - List purchases
- `POST /api/transfers` - Create transfer
- `GET /api/transfers` - List transfers
- `GET /api/dashboard/metrics` - Dashboard metrics

---

## License

This project is for educational/demo purposes.
