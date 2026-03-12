# AI Handover Guide - AI Marketing System

**Attention Next AI Assistant:**  
This project is currently in a transition phase from "Development" to "Deployment". The goal is to build a robust **AI Marketing System** starting with the **JustRight Calendar** module.

---

## 🚀 Current Project State
1.  **Architecture**: Mono-repo. The main application is located in `modules/justright-calendar`.
2.  **Infrastructure**: 
    *   **Frontend**: Vite + React + TypeScript + Tailwind CSS + Radix UI + GSAP.
    *   **Backend**: Express.js server in `modules/justright-calendar/server`.
    *   **Database**: SQLite (`database.sqlite`) managed by `better-sqlite3`.
3.  **Synchronization**: The system prioritizes local SQLite when available, falling back to Firebase or LocalStorage.

## 🛠 Critical Technical Context
*   **The "Unified" Hooks**: Always use `useEventsUnified.ts` to interact with event data. It handles the complexity of multiple data sources.
*   **Data Types**: SQLite stores dates as strings. The frontend **MUST** convert these back to `Date` objects immediately after fetching (see `useEventsSQLite.ts`) and before any logical checks (see `ScheduleList.tsx`). Failure to do so will result in "white screen" runtime crashes.
*   **User Selection**: The app uses `localStorage` (`user-storage`) to remember the selected user profile.

## 🏁 Immediate Next Steps
1.  **Server Deployment**: 
    - The code is ready for 8.159.153.134.
    - Needs Nginx configuration for `justright.51winwin.com`.
    - **SSL/HTTPS**: Must use **Let's Encrypt** via Certbot for certificate signing.
    - Backend should be managed by PM2.
2.  **API URL Dynamic Handling**: Currently, the code in `useEventsSQLite.ts` needs a way to detect production vs. development to switch between `localhost:3001` and the production URL.
3.  **Authentication**: Currently, "Identity Portal" is used for switching profiles. A proper login/security layer might be needed later as part of the broader "AI Marketing System".

## 📦 Running the project
- Root: `npm run justright:dev`
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

**Good luck! The foundation is solid, focusing on clean code and premium UI aesthetics is a priority for the USER.**
