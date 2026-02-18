# SKIDS Parent Platform (Firebase Consumer MVP)

This repository implements the SKIDS Parent Firebase consumer platform aligned to:
- `/Users/spr/Downloads/SKIDS_Parent_Firebase_Master_PRD.md`
- `/Users/spr/Downloads/SKIDS_Parent_Engineering_Companion.md`

## Current Scope
- Firebase-first architecture for parent app
- Firestore data model + hardened security rules
- Cloud Functions for AI calls and JSON interoperability validation
- JSON schema contracts for parent export and clinic import
- Responsive React web MVP shell for core modules

## Callable APIs (MVP)
- `createChildProfile`: creates/updates the single child profile (`childId = auth.uid`)
- `askQuestion`: returns mandatory 5-part developmental response
- `interpretCheckin`: interprets daily check-in into 5-part structure
- `saveHomeScreening`: persists structured home screening result
- `exportParentProfileSnapshot`: emits clinic importable parent JSON snapshot
- `importScreeningCredential`: validates + stores clinic screening JSON credential
- `getDevelopmentTimeline`: returns merged timeline across observations/check-ins/screenings/credentials

## Repository Layout
- `functions/` Cloud Functions (TypeScript)
- `web/` React web app (Vite + TypeScript)
- `schemas/` canonical JSON contracts for interop
- `docs/` architecture, data model, onboarding, deployment assets
- `firestore.rules`, `storage.rules` security policy

## Quick Start
1. Install Node.js LTS (20+ recommended)
2. Install Firebase CLI: `npm i -g firebase-tools`
3. Configure Firebase project aliases in `.firebaserc`
4. Install dependencies:
   - `cd functions && npm install`
   - `cd web && npm install`
5. Run local web app: `cd web && npm run dev`
6. Run Firebase emulators: `firebase emulators:start`

## Verification
- Functions lint/build:
  - `cd functions && npm run lint && npm run build`
- Functions tests (unit + Firestore rules):
  - `cd functions && npm test`
- Web lint/build:
  - `cd web && npm run lint && npm run build`

Notes:
- Firestore rules tests run via `firebase emulators:exec` and require Java.
- Emulator config is defined in `/Users/spr/spids/firebase.json`.

## Environment Variables
Functions require:
- `AI_PROVIDER_URL`
- `AI_PROVIDER_KEY`

Web app requires:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`

## Non-Negotiable Safety Rules
- No diagnosis, medication, lab interpretation, or emergency guidance
- Every AI response must keep the mandatory 5-part structure
- Parent owns child data; no cross-user reads/writes
- No direct AI calls from client; AI requests only via Cloud Functions
