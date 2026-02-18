# Firebase + Worker Dev Deploy (Spark)

## 1. Prerequisites
- Install Firebase CLI (`firebase --version`)
- Authenticate CLI:
  - `firebase login`
- Ensure Java is installed for Firestore emulator tests

## 2. Configure Project IDs
Create `/Users/spr/spids/.env` from `/Users/spr/spids/.env.example` and set:
- `FIREBASE_DEV_PROJECT`
- `FIREBASE_PROD_PROJECT`

Then generate aliases:
- `bash /Users/spr/spids/scripts/configure_firebase_aliases.sh`

## 3. First Dev Deploy (ordered)
Run:
- `bash /Users/spr/spids/scripts/deploy_dev.sh`

This performs:
1. Build Web
2. Deploy Firestore rules/indexes
3. Deploy Hosting
4. Deploy Cloudflare Worker (`pairents`)

## 4. Manual Equivalent Commands
From `/Users/spr/spids`:
- `firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only firestore:rules,firestore:indexes`
- `firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only hosting`
- `npx wrangler deploy --cwd worker`

## 5. Required Worker Secrets
Set these before production traffic:
- `npx wrangler secret put GEMINI_API_KEY --cwd worker`
- `npx wrangler secret put GROQ_API_KEY --cwd worker`
- `npx wrangler secret put FIREBASE_WEB_API_KEY --cwd worker`
