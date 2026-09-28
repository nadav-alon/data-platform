# Changelog

## v0.2.0

- **Rules** (`firestore.rules`): a signed-in non-member may now `get` `meta/household` and
  `meta/platform` (to tell whether the Household is claimed) and their own `members/{uid}` doc
  (to tell whether they've been added); `list` on either stays Member-only. `members/{uid}`
  writes are validated against `memberSchema`: `email` is required on create and update, and
  `addedAt` must be the server's own commit time on create and unchanged on update.

## v0.1.0

The first release: everything the home catalogue pins against.

- **Schemas** (`src/core/`, `src/catalogue/`): Item, State and State history; Member
  (`members/{uid}`), Household and platform meta (`meta/household`, `meta/platform`); Category,
  Shop, CatalogueItem (with its Shop override) and Necessity.
- **Rules** (`firestore.rules`): the membership gate, first-claim bootstrap of a Household, and
  owner-only writes to `members/{uid}`; per-collection validation, with `stateHistory` entries
  create-only and server-timestamped.
- **Guard** (`src/core/platform.ts`): `checkPlatform` compares a deployed `meta/platform` version
  against the version an app requires, majors only, so before 1.0 it tells `missing` from `ok` and
  never reports `outdated`.
- **Deploy** (`scripts/deploy/`, `docs/household-setup.md`): `npm run deploy` deploys
  `firestore.rules` and writes `meta/platform` with this release's version, from a clone or from
  the repo's `Deploy` Action.
