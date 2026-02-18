# Production Deployment Runbook

1. Create Firebase projects (`dev`, `prod`) and set aliases in `.firebaserc`.
2. Deploy security policies:
   - `firebase deploy --only firestore:rules,storage`
3. Seed `developmentDomains` and `milestones` datasets.
4. Deploy Cloud Functions:
   - `firebase deploy --only functions`
5. Configure environment secrets for AI provider.
6. Build and deploy web app:
   - `cd web && npm run build`
   - `firebase deploy --only hosting`
7. Run integration tests for:
   - auth ownership enforcement
   - profile export schema validity
   - screening import schema rejection/acceptance
   - five-part AI response format
8. Enable analytics and monitoring.
9. Perform security and penetration review.
10. Launch production.
