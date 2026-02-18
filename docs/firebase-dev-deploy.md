# Firebase Wiring + First Dev Deploy

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
1. Build Functions
2. Build Web
3. Deploy rules/indexes/storage
4. Deploy functions
5. Deploy hosting

## 4. Manual Equivalent Commands
From `/Users/spr/spids`:
- `firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only firestore:rules,firestore:indexes,storage`
- `firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only functions`
- `firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only hosting`
