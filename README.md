# 🌾 Ethiopian Agriculture Management Information System (IMS)

A national-scale web platform built for the **Ethiopian Ministry of Agriculture**, **NGOs**, and **field agents** to register farmers, track aid distribution, monitor crop yields, and visualize agricultural data across all 12 regions of Ethiopia.

---

## 🇪🇹 The Problem This Solves

- 15M+ Ethiopian smallholder farmers have **zero digital identity**
- Aid is **duplicated** — same farmer receives fertilizer from 3 NGOs, others receive nothing
- Crop yield data is **6–12 months delayed** — food security planning is reactive
- 40+ NGOs operate with **completely separate spreadsheets** — no coordination
- Field agents collect data **on paper** — 3–8 weeks to reach ministry databases

---

## ✅ What This System Does

- **Farmer Registry** — unique digital ID per farmer with GPS, photo, land size, crops
- **Aid Deduplication** — blocks duplicate distributions cross-NGO in real time
- **Yield Reporting** — field agents submit live seasonal data via offline-capable PWA
- **Interactive Map** — Leaflet.js map with farm pins, zones, heatmaps
- **Analytics Dashboard** — regional charts, food security alerts, exportable reports
- **Multi-NGO Management** — unified platform for all partner organizations

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Animation | Framer Motion, GSAP, Three.js |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Cache | Redis |
| Maps | Leaflet.js, OpenStreetMap |
| Charts | Recharts, D3.js |
| Auth | JWT, Argon2, httpOnly cookies |
| Offline | PWA, Service Worker, IndexedDB |
| Export | PDFKit, ExcelJS |
| DevOps | Docker, Nginx, GitHub Actions |

---

## 👥 User Roles

| Role | Access |
|---|---|
| Super Admin | Full system access |
| Admin | Regional data management |
| Field Agent | Register farmers, submit yields (PWA) |
| NGO Partner | Record distributions, view coverage |
| Read-Only Viewer | View reports and dashboards |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker + Docker Compose

### Installation

```bash
# Clone the repository
git clone https://github.com/Yetemare-Yibeltal/Ethiopian-Agriculture-IMS.git
cd Ethiopian-Agriculture-IMS

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Run with Docker
cd ..
docker-compose up
```

### Access
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- API Health: `http://localhost:5000/api/v1/health`

---

