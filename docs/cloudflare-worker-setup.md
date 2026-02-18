# Cloudflare Worker Setup (Spark-Compatible Backend)

Worker name: `pairents`  
Account ID: `9f4998a66a5d7bd7a230d0222544fbe6`

## 1. Verify auth
- `cd /Users/spr/spids`
- `npm run worker:whoami`

## 2. Set required secrets
- `cd /Users/spr/spids`
- `npx wrangler secret put GEMINI_API_KEY --cwd worker`
- `npx wrangler secret put GROQ_API_KEY --cwd worker`
- `npx wrangler secret put FIREBASE_WEB_API_KEY --cwd worker`

Notes:
- Gemini is primary provider.
- Groq is fallback when Gemini fails.

## 3. Deploy worker
- `cd /Users/spr/spids`
- `npm run worker:deploy`

## 4. Wire web app to worker URL
After deploy, Wrangler prints a workers.dev URL.

Set in `/Users/spr/spids/web/.env`:
- `VITE_WORKER_BASE_URL=https://<worker-url>.workers.dev`

Then rebuild + deploy hosting:
- `cd /Users/spr/spids/web && npm run build`
- `cd /Users/spr/spids && firebase deploy --project "$FIREBASE_DEV_PROJECT" --config firebase.json --only hosting`
