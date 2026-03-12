# AI Handover Guide - AI Marketing System

**Attention Next AI Assistant:**  
This project is currently in a transition phase from "Development" to "Deployment". The goal is to build a robust **AI Marketing System** starting with the **JustRight Calendar** module.

---

## 🚀 Current Project State
1. **Status**: **Production Ready**. Live at [https://justright.51winwin.com](https://justright.51winwin.com).
2. **Architecture**: Mono-repo. The main application is located in `modules/justright-calendar`.
3. **Infrastructure**: 
   - **Frontend**: Vite + React + TypeScript + Tailwind CSS + Radix UI + GSAP.
   - **Backend**: Express.js server in `modules/justright-calendar/server`.
   - **Database**: SQLite (`database.sqlite`) managed by `better-sqlite3`.
4. **Synchronization**: The system prioritizes local SQLite when available, falling back to Firebase or LocalStorage.

## 🛠 Critical Technical Context
- **The "Unified" Hooks**: Always use `useEventsUnified.ts` to interact with event data. It handles the complexity of multiple data sources.
- **Data Types**: SQLite stores dates as strings. The frontend **MUST** convert these back to `Date` objects immediately after fetching (see `useEventsSQLite.ts`) and before any logical checks (see `ScheduleList.tsx`). Failure to do so will result in "white screen" runtime crashes.
- **Mobile Browser Support**: **IMPORTANT**. Do not use `AbortSignal.timeout` as it breaks older mobile browsers. Always use the manual `AbortController` + `setTimeout` pattern for fetch timeouts.
- **Production Build (TSC)**: The CI/CD or manual `npm run build` uses strict TypeScript checks. Ensure no unused imports or variables exist before pushing to `main`, otherwise, the build on the server will fail.

## 📅 2026-03-13 Final Status
### **Deployment & Cloud Launch (Mission Success) 🚀**
- **Server Deployment**: Successfully deployed the entire system to **8.159.153.134**.
- **Domain & SSL**: 
  - Host: `justright.51winwin.com`
  - Signed by: **Let's Encrypt** via Certbot.
  - Automatic HTTPS redirection enabled.
- **Mobile Compatibility Fix**: Switched `AbortSignal.timeout` to a universal `AbortController` pattern to support older mobile browsers (e.g., iOS Safari).
- **Production Build Pipeline**: Resolved TypeScript strict mode errors that were blocking the remote build.

### **Refactoring & Infrastructure**
- **Refactored** the project into a **Mono-repo structure**.
  - Current calendar code moved to `modules/justright-calendar`.
  - Created placeholder directories: `core-portal`, `docs`.
  - Added root-level `package.json` for mono-repo management.
- **Git & GitHub Integration**:
  - Pushed code to: `https://github.com/jordanwang922/ai-marketing-system`.

## 🏁 Project Roadmap
- [x] **Phase 1: Cloud Deployment**: COMPLETED.
- [ ] **Phase 2: Authentication**: Proper login/security layer for AI Marketing System.
- [ ] **Phase 3: Multi-module Integration**: Shared user state across future modules.

## 📦 Running the project
- Root: `npm run justright:dev`
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

**Good luck! The foundation is solid, focusing on clean code and premium UI aesthetics is a priority for the USER.**
