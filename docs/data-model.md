# Firestore Data Model

## Collections
- `users`: parent profile and account preferences.
- `children`: child profile (one child per parent in MVP).
- `developmentDomains`: reference content for domains.
- `milestones`: age-banded milestone knowledge rows.
- `observations`: parent observations and Q&A logs.
- `homeScreenings`: guided home screening responses.
- `dailyCheckins`: daily narrative + interpreted output.
- `screeningCredentials`: imported clinic credentials (immutable history).
- `blogContent`: static educational feed content.

## Ownership Model
- Every mutable child-linked document stores `parentId`.
- Rules enforce read/write only when `request.auth.uid == parentId`.
- `screeningCredentials` are append-only in MVP.
- For MVP single-child scope, child profile document ID is the parent UID.
