# ViralLab

ViralLab is an independent content intelligence subsystem inside the AI Marketing System mono-repo.

## Structure

- `app/` React frontend console for collection, analysis, patterns, and generation
- `api/` NestJS API and Prisma data model
- `worker/` async job runner skeleton for collection and AI tasks
- `shared/` shared types and constants
- `docs/` subsystem-specific implementation notes

## Current Status

This module is scaffolded for V1 development. The current baseline includes:

- frontend shell and dashboard
- API shell with auth, health, collect, pattern, and generate modules
- Prisma schema for the core ViralLab entities
- worker bootstrap for async jobs

## Local Development

Install dependencies per package:

```bash
npm install --prefix modules/virallab/app
npm install --prefix modules/virallab/api
npm install --prefix modules/virallab/worker
```

Run:

```bash
npm run virallab:app
npm run virallab:api
npm run virallab:worker
```
