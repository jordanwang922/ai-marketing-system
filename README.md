# AI Marketing System (AIMS) 🚀

Welcome to the **AI Marketing System**, a high-performance, multi-module business platform designed for modern marketing workflows.

## 🌐 Live Access
The system is currently deployed and accessible at:
**[https://justright.51winwin.com](https://justright.51winwin.com)**

---

## 📅 Current Module: JustRight Calendar
The first core module of AIMS is a premium, high-aesthetic calendar system built for teams and individuals.

### Key Features:
- **Unified Event Management**: Syncs multiple data sources (SQLite, Firebase, and LocalStorage).
- **Pro Design**: Premium UI with smooth GSAP animations, glassmorphism effects, and dark mode support.
- **Mobile Optimized**: Fully responsive with custom touch interactions and mobile-compatible networking.
- **Monthly Schedule List**: A dedicated view to expand multi-day events into readable daily tasks.
- **Multi-user Support**: Real-time user creation with unique identity colors and validation.

---

## 🏗 System Architecture
This project follows a **Mono-repo** structure to support future marketing tools:
- `/modules/justright-calendar`: The primary calendar application.
- `/core-portal`: (Planned) Central entry point and dashboard.
- `/docs`: Comprehensive project documentation.

### Tech Stack:
- **Frontend**: Vite, React, TypeScript, Tailwind CSS, Radix UI, GSAP.
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (Better-SQLite3).
- **Infrastructure**: Nginx, PM2, SSL by Let's Encrypt.

---

## 📚 Documentation
For detailed technical info, please refer to the `docs/` directory:
- [Handover Guide](./docs/handover_guide.md) - For developers taking over the project.
- [Deployment Guide](./docs/deployment_guide.md) - Server setup and maintenance.
- [Development Log](./docs/development_log.md) - History of changes and bug fixes.
- [Future Roadmap](./docs/future_roadmap.md) - What's coming next.

---

## 📦 Getting Started (Local)
1. Clone the repo: `git clone https://github.com/jordanwang922/ai-marketing-system.git`
2. Install dependencies: `npm install`
3. Run the development environment: `npm run justright:dev`

---

**Developed by Antigravity AI for Jordan.**
