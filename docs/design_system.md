# Design & Architecture - JustRight Calendar

## 🏗 System Architecture
The "JustRight" module follows a hybrid storage architecture designed for maximum reliability.

### 1. Data Flow (The Tiered Strategy)
We use a custom hook `useEventsUnified` that orchestrates data from three tiers:
1.  **Primary (SQLite)**: If the local Node.js server is running, the app performs full CRUD operations on `database.sqlite`. 
2.  **Secondary (Firebase)**: If the server is offline but there's a network, it tries to sync with Firestore. (Current implementation focuses mainly on tier 1).
3.  **Tertiary (LocalStorage)**: Fallback for absolute offline use, ensuring the UI nunca breaks.

### 2. Frontend Components
- **CalendarGrid**: The main engine. Uses `date-fns` for date generation and `GSAP` for premium layout transitions.
- **ScheduleList**: A modern slide-over modal that expands multi-day events into a chronological agenda.
- **IdentityPortal**: A framer-motion inspired user selection screen.

### 3. Backend (Minimalist & Solid)
- **better-sqlite3**: Chosen for synchronous performance (preferred for local SQLite apps).
- **Express**: Simple REST API for `get/post/put/delete` operations on users and events.

## 🎨 Design Philosophy
- **Rich Aesthetics**: High contrast, vibrant purple/green accents, and glassmorphism (translucency).
- **Responsive-First**: Every UI element is tested for desktop (hover states) and mobile (tap targets and overflow).
- **Micro-interactions**: Use of scale animations (active:scale-95) and layout shifts to provide tactile feedback to the user.

## 🛠 Key Files
- `src/hooks/useEventsUnified.ts`: The data orchestrator.
- `src/hooks/useUser.ts`: User state and filtering control.
- `server/db.js`: Database schema and default user initialization.
- `src/components/ScheduleList.tsx`: Logic for expanding date intervals.
