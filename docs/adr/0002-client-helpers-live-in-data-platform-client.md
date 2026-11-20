---
status: accepted
---

# Client helpers live in `data-platform/client`, with `firebase` as an optional peer

Sign-in, the membership gate and offline Firestore setup were written inside the home catalogue,
and the recipes app needs the same code. We extract it, without any UI, into a `data-platform/client`
subpath export. `firebase` is an optional peer dependency, the same pattern as `data-platform/local`,
and the main export stays free of any `firebase` import, which a test enforces.

Rejected: a separate client package. Keeping the helpers here means one release and one version
gate per change, following the precedent of `data-platform/local`.

The cost is that data-platform is no longer zod-only: it now ships code that talks to Firebase,
though only to consumers that import the subpath and install `firebase`.
