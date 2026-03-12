# Future Roadmap - AI Marketing System

## 📍 Phase 1: Cloud Deployment (Current Priority)
- [ ] **Domain Setup**: Point `justright.51winwin.com` to `8.159.153.134`.
- [ ] **Nginx Reverse Proxy**: Handle SSL (HTTPS) and route traffic to the Node.js backend on port 3001.
- [ ] **PM2 Persistence**: Ensure the backend server stays alive 24/7.
- [ ] **Environment Variables**: Move API URLs to `.env` files.

## 📍 Phase 2: Feature Expansion
- [ ] **Event Drag & Drop**: Allow users to reschedule by dragging cards in the grid.
- [ ] **Categorization**: Add tags or categories (Work, Personal, Urgent) to events.
- [ ] **Reminders**: Implement browser or email notifications.
- [ ] **Search**: Global search for events by title or content.

## 📍 Phase 3: Platform Integration
- [ ] **Core Portal**: Create a main dashboard at `core-portal/` that acts as the entry point for all modules.
- [ ] **Cross-module Data**: Sharing user profiles and permissions across Different AI tools.
- [ ] **AI Assistant Integration**: Adding a chat interface inside the calendar to "Add event using natural language".
