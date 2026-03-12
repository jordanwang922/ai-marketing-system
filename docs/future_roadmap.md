# Future Roadmap - AI Marketing System

This document outlines the planned progression for the AI Marketing System, building upon the successfully deployed JustRight Calendar module.

---

## 📍 Phase 1: Cloud Deployment (COMPLETED ✅)
- [x] **Domain Setup**: Pointed `justright.51winwin.com` to `8.159.153.134`.
- [x] **Nginx Reverse Proxy**: Site live at [https://justright.51winwin.com](https://justright.51winwin.com).
- [x] **SSL (Let's Encrypt)**: Mandatory HTTPS enabled.
- [x] **PM2 Persistence**: Backend running stable on port 3001.
- [x] **Environment Adaptability**: API URL switches dynamically between Prod and Dev.
- [x] **Mobile Optimization**: Fixed compatibility issues for mobile browsers.

## 📍 Phase 2: Core Platform Infrastructure
- [ ] **Portal Dashboard**: Implement `core-portal` to act as the single entry point for all sub-systems.
- [ ] **Unified Authentication**: 
  - Centralized login system (OAuth or JWT).
  - Shared user state across modules (Calendar, CRM, etc.).
- [ ] **Global Search**: Search for events, marketing tasks, or users across the entire system.

## 📍 Phase 3: AI Marketing Features
- [ ] **Smart Event Generation**: Use AI to suggest marketing schedules based on user business goals.
- [ ] **Automated Content Pipeline**: Integration with social media APIs to schedule posts directly from the Calendar.
- [ ] **Performance Analytics**: Track the success of scheduled marketing activities.

## 📍 Phase 4: System Integration
- [ ] **Database Migration**: Move from SQLite to a managed PostgreSQL cluster for high availability.
- [ ] **Micro-frontend Architecture**: Scale the mono-repo to support independent deployment of large modules.
