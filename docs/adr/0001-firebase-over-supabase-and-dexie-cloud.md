---
status: accepted
---

# Firebase over Supabase and Dexie Cloud: offline writes over a DB-enforced schema

Apps on this platform are static PWAs whose only backend is the store, on a free tier, and the
first of them (the home catalogue) must accept writes offline. That leaves Firebase and Dexie
Cloud; Supabase has the stronger schema (enforced columns, history triggers) but pauses when idle
and needs a separate sync layer for offline writes. Firebase wins over Dexie Cloud on being free for
any household size, never pausing, and Security Rules giving server-side validation.

The cost is that the schema is not enforced by the database. It is enforced twice instead — zod
validators in apps and Firestore rules on the server — and the rules tests run both against the same
fixtures in the emulator so the two can't drift. See [Which backend-as-a-service fits](https://github.com/nadav-alon/side-projects-manager/issues/912) and
[Data platform shape](https://github.com/nadav-alon/side-projects-manager/issues/917).
