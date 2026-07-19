# 🔐 Immutable Audit Log Management System

**Production-grade full-stack MERN app with cryptographic SHA-256 hash chaining, tamper-proof audit trails, and role-based access control.**

---

## 🎯 What This Project Does

Every user action (login, logout, create, update, delete) is recorded as an **immutable, cryptographically chained audit log**. Each log's SHA-256 hash includes the previous log's hash — like a blockchain — so any database tampering is **instantly detected**.

> Built to demonstrate enterprise-grade concepts: cryptography, immutability, RBAC, full-stack architecture.

---

## ⚡ Key Features at a Glance

| Feature | Description |
|---|---|
| 🔗 **SHA-256 Hash Chaining** | Every log links to the previous via hash — tampering breaks the chain |
| 🛡️ **Tamper Detection** | Admin integrity scan recomputes all hashes and flags any mismatch |
| 🔒 **Immutable Logs** | Mongoose pre-hooks block all update/delete on audit log collection |
| 👑 **Admin Panel** | Manage users, view all logs, change roles, activate/deactivate accounts |
| 👤 **User Dashboard** | Secure Notes CRUD, personal audit log viewer with hash certificate |
| 🔑 **Auth System** | JWT login, role-based routing, forgot/reset password, blocked account detection |
| 📤 **Export** | Download logs as CSV or JSON |
| 🔍 **Filtering** | Filter by action type, date range, username search |

---

## 🛠 Tech Stack

```
Frontend  →  React 18 · React Router v6 · Axios · CSS3
Backend   →  Node.js · Express.js
Database  →  MongoDB Atlas · Mongoose ODM
Auth      →  JWT (JSON Web Tokens) · bcryptjs
Crypto    →  Node.js built-in crypto module (SHA-256)
Validation→  express-validator
```

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/your-username/audit-log-system.git
cd audit-log-system

# 2. Backend
cd backend && npm install
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm start              # runs on http://localhost:2000

# 3. Frontend (new terminal)
cd frontend && npm install
npm start              # runs on http://localhost:7000
```

**Environment Variables (backend/.env)**
```env
PORT=2000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>
JWT_SECRET=your_strong_32char_secret
JWT_EXPIRE=7d
NODE_ENV=development
```

---

## 📡 API Endpoints

### Auth &nbsp;`/api/auth`
| Method | Route | Description |
|---|---|---|
| POST | `/register` | Register (USER or ADMIN role) |
| POST | `/login` | Login → returns JWT |
| POST | `/logout` | Logout → records LOGOUT audit log |
| GET | `/me` | Get current user |
| POST | `/forgot-password` | Send reset token |
| POST | `/reset-password/:token` | Reset with token |

### Audit Logs &nbsp;`/api/audit-logs`
| Method | Route | Role | Description |
|---|---|---|---|
| GET | `/my-logs` | USER | Own logs — paginated, filterable |
| GET | `/all-logs` | ADMIN | All users' logs |
| GET | `/stats` | ADMIN | Action count statistics |
| GET | `/verify` | ADMIN | Run cryptographic integrity scan |

### Notes &nbsp;`/api/notes`
| Method | Route | Description |
|---|---|---|
| GET | `/` | Get user's notes |
| POST | `/` | Create note → **CREATE** log |
| PUT | `/:id` | Update note → **UPDATE** log |
| DELETE | `/:id` | Delete note → **DELETE** log |

### Users &nbsp;`/api/users` (Admin Only)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List all users |
| PATCH | `/:id/status` | Activate / Deactivate |
| PATCH | `/:id/role` | Promote / Demote role |

---

## 🔒 Security Architecture

### How Cryptographic Hash Chaining Works

```
Log #1  { action: LOGIN   previousHash: "0"     hash: SHA256(data + "0")    }
Log #2  { action: CREATE  previousHash: hash1   hash: SHA256(data + hash1)  }
Log #3  { action: UPDATE  previousHash: hash2   hash: SHA256(data + hash2)  }
```
> Edit any log in MongoDB → chain breaks → Admin scan detects it immediately.

### 🔍 How to Verify the Chain in the UI (For Recruiters)
To easily see the cryptographic blockchain-like chaining working in action:
1. Go to **Secure Notes CRUD** in the sidebar.
2. Click **`+ Create Secure Note`**, fill in a title (e.g., "Note A"), and click **Save**.
3. Navigate to **Activity Logs** and click on the **CREATE** log. Look at the popup certificate and note down the **Cryptographic SHA-256 Hash**.
4. Go back to **Secure Notes CRUD**, click the ✏️ pencil icon to edit "Note A", change its content, and click **Save**.
5. Go back to **Activity Logs** and click the new **UPDATE** log certificate.
6. Observe that the **Previous Hash Link** on this new log matches the **Cryptographic SHA-256 Hash** from the previous log exactly. This confirms they are cryptographically chained!

### 3-Layer Immutability
1. **Mongoose pre-hooks** — block `updateOne`, `deleteMany` at ODM level
2. **No edit/delete API** — audit log routes are GET-only
3. **Immutable timestamp** — schema field marked `immutable: true`

### RBAC (Role-Based Access Control)
- `ProtectedRoute.js` — decodes JWT client-side for live role check
- `authorize.js` middleware — validates role server-side on every request
- Admin cannot deactivate or change their own role

---

## 📊 Verified Feature Matrix

| Feature | Status | Audit Event |
|---|---|---|
| Register / Login / Logout | ✅ | LOGIN / LOGOUT |
| Failed login (suspended account) | ✅ | FAILED_LOGIN |
| Forgot & Reset Password | ✅ | — |
| Note Create / Update / Delete | ✅ | CREATE / UPDATE / DELETE |
| Admin: User management | ✅ | UPDATE |
| Admin: Cryptographic integrity scan | ✅ | — |
| Tamper detection | ✅ | — |
| Log filtering + pagination | ✅ | — |
| Export CSV & JSON | ✅ | — |
| SHA-256 hash certificate per log | ✅ | — |

> All 15 automated backend tests pass ✅

---

## 📁 Project Structure

```
audit-log-system/
├── backend/
│   ├── controllers/   authController · auditLogController · noteController · userController
│   ├── middleware/    auth.js (JWT) · authorize.js (RBAC)
│   ├── models/        User · AuditLog (immutable + hash chain) · Note
│   ├── routes/        authRoutes · auditLogRoutes · noteRoutes · userRoutes
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/  ProtectedRoute.js
│   │   ├── pages/       Home · Login · Register · ForgotPassword · UserDashboard · AdminDashboard
│   │   └── services/    api.js (Axios)
│   └── App.js
├── .gitignore
└── README.md
```

---

## 🚢 Deployment

| Service | Platform | Steps |
|---|---|---|
| **Backend** | [Render.com](https://render.com) | Connect GitHub → set env vars → deploy `backend/` |
| **Frontend** | [Vercel.com](https://vercel.com) | Connect GitHub → set `REACT_APP_API_URL` → deploy `frontend/` |
| **Database** | MongoDB Atlas | Already cloud-hosted |

---

## 📄 License

MIT — free to use, fork, and build upon.

---

<div align="center">

**Built with ❤️ | MERN Stack | SHA-256 Cryptography | Enterprise Security Patterns**

*"Every action leaves a trace. This system makes sure that trace is permanent."*

⭐ Star this repo if it helped you!

</div>
