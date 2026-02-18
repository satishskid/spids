# SKIDS Parent Platform (Firebase + Cloudflare Worker)

This repository contains the SKIDS Parent MVP aligned to:
- `/Users/spr/Downloads/SKIDS_Parent_Firebase_Master_PRD.md`
- `/Users/spr/Downloads/SKIDS_Parent_Engineering_Companion.md`

The product combines:
- Parent-facing web app (React + Firebase)
- Safe AI guidance backend (Cloudflare Worker)
- Firestore-backed parent/child profile and timeline
- Milestone wall + blog library + chat workflow

## Current Product State

Implemented and deployed foundations include:
- Firebase Auth + Firestore integration for parent sessions and child profile ownership
- SKIDS chat experience with two modes:
  - `Question mode`
  - `Daily check-in mode`
- Milestone Growth Wall UI with:
  - age ruler
  - thin/minor and thick/major milestone lines
  - click-to-open milestone detail sheet
  - one-tap handoff from milestone to chat prompt
- Blog ingestion/search from SKIDS feed via Worker (`https://skids.clinic/feed`)
- Support tools collapsed under occasional actions:
  - Home screening check-in
  - Export parent summary
  - Import clinic report

## Clinical Data Positioning

Milestone rendering now uses a verified age-banded baseline dataset in:
- `/Users/spr/spids/web/src/data/verifiedMilestones.ts`

References are tracked in:
- `/Users/spr/spids/docs/clinical-milestone-sources.md`

Important clinical note:
- This app provides educational and screening-support guidance.
- It is **not** a diagnostic system.
- Final clinical interpretation remains with pediatric professionals.

## Architecture

### Frontend (`web/`)
- Stack: Vite + React + TypeScript + Firebase Web SDK
- Main screen sections:
  - Milestone wall (left pane)
  - Blog hero + searchable article rail
  - Chat panel (primary interaction surface)
  - Occasional support actions
- Core files:
  - `/Users/spr/spids/web/src/App.tsx`
  - `/Users/spr/spids/web/src/styles.css`
  - `/Users/spr/spids/web/src/api/functions.ts`
  - `/Users/spr/spids/web/src/data/verifiedMilestones.ts`

### Worker (`worker/`)
- Cloudflare Worker API with free-tier friendly provider routing:
  - Gemini primary
  - Groq fallback
- Also serves normalized SKIDS blog feed/search endpoints
- Core file:
  - `/Users/spr/spids/worker/src/index.ts`

### Firebase (`functions/`, rules, indexes)
- Firestore as system of record for profile/timeline entities
- Security rules enforce parent ownership boundaries
- Callable/HTTP support functions for timeline and screening workflows

## Key Functional Flows

1. Parent opens app -> Firebase anonymous auth session
2. Parent creates/updates child profile (name, age in months, domain focus)
3. Milestone wall loads age-windowed items
4. Parent clicks milestone -> detail sheet opens
5. Parent taps `Ask SKIDS` -> milestone becomes contextual chat prompt
6. Observations/check-ins/screenings are logged into timeline
7. Parent can export a share summary or import clinic report when needed

## Repo Layout

- `/Users/spr/spids/web` -> frontend app
- `/Users/spr/spids/worker` -> Cloudflare Worker backend
- `/Users/spr/spids/functions` -> Firebase functions + validation + screening logic
- `/Users/spr/spids/docs` -> deployment and product/clinical documentation
- `/Users/spr/spids/schemas` -> schema contracts
- `/Users/spr/spids/firestore.rules` -> Firestore security rules
- `/Users/spr/spids/firestore.indexes.json` -> Firestore composite indexes

## Environment Configuration

### Web env (`web/.env`)
Required:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`
- `VITE_WORKER_BASE_URL`

### Worker secrets (Wrangler)
Required:
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `FIREBASE_WEB_API_KEY`

## Local Development

From `/Users/spr/spids`:

1. Install dependencies
- `cd web && npm install`
- `cd ../worker && npm install`
- `cd ../functions && npm install`

2. Start frontend
- `cd /Users/spr/spids/web && npm run dev`

3. Optional local Firebase emulators
- `cd /Users/spr/spids && firebase emulators:start`

4. Worker local dev
- `cd /Users/spr/spids && npm run worker:dev`

## Validation Commands

- `cd /Users/spr/spids/web && npm run lint`
- `cd /Users/spr/spids/web && npm run build`

## Deployment

### Firebase Hosting
- `cd /Users/spr/spids && firebase deploy --project healthvoice-8461b --config firebase.json --only hosting`

### Firestore rules/indexes
- `cd /Users/spr/spids && firebase deploy --project healthvoice-8461b --config firebase.json --only firestore:rules,firestore:indexes`

### Cloudflare Worker
- `cd /Users/spr/spids && npm run worker:deploy`

## Live URLs (current)

- Firebase app: [https://healthvoice-8461b.web.app](https://healthvoice-8461b.web.app)
- Worker: [https://pairents.satish-9f4.workers.dev](https://pairents.satish-9f4.workers.dev)
- Worker health: [https://pairents.satish-9f4.workers.dev/health](https://pairents.satish-9f4.workers.dev/health)

## API Surface (high-level)

Worker routes:
- `GET /health`
- `POST /v1/ask`
- `POST /v1/checkin`
- `GET /v1/blogs`

Frontend data actions include:
- child profile save/load
- milestone wall fetch
- timeline fetch
- save home screening
- export parent summary
- import clinic report

## Safety Guardrails

- No diagnosis or treatment prescription
- Educational guidance with screening escalation language
- Sensitive keys remain server-side (Worker secrets)
- Parent data ownership enforced in Firestore security model

## Documentation

- `/Users/spr/spids/docs/firebase-dev-deploy.md`
- `/Users/spr/spids/docs/cloudflare-worker-setup.md`
- `/Users/spr/spids/docs/data-model.md`
- `/Users/spr/spids/docs/clinical-milestone-sources.md`

## Next Iteration Candidates

- Add pediatric reviewer signoff workflow for milestone dataset revisions
- Add domain/age-specific milestone confidence metadata
- Add richer milestone moderation pipeline before production clinical rollout
- Add code splitting/perf optimization for large frontend bundle
