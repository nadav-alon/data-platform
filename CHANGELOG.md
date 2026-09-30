# Changelog

## v0.4.0

Redeploy (`npm run deploy`) before pinning an app to this release, or `checkPlatform` reports
`outdated` where it used to report `ok`; until the rules are live an invitee's join is denied.

- **Schemas** (`src/core/`): the `invites` collection — `invites/{email}`, keyed by the invited
  Google email, lowercased — with `inviteSchema` (`{invitedAt}`), `INVITES_COLLECTION` and
  `inviteDocPath(email)` beside `members`, and registered in `CORE_COLLECTION_SCHEMAS`.
- **Rules** (`firestore.rules`): only the Owner may create, list and delete invites; a new invite's
  `invitedAt` must be the server's own commit time and its id lowercased. A signed-in user may
  `get` only the invite whose id is their own token email, lowercased. An invitee joins with one
  batch that creates `members/{their uid}` and deletes `invites/{their email}`: the Member create
  needs that invite to exist and `request.auth.token.email_verified` to be true, and the invite
  delete needs the Member doc to exist after the batch. A join with no matching invite, an
  unverified email, or a Member doc under another uid is denied.

## v0.3.0

Breaking for existing Households: redeploy (`npm run deploy`) before pinning an app to this
release, or `checkPlatform` reports `outdated` where it used to report `ok`. A Shop or Category
written before this release has no `referenceCount`, so once these rules are live it fails
`shopSchema`/`categorySchema` parsing, can't be deleted, and can't be referenced by a new or
updated Category/CatalogueItem; a CatalogueItem that already references one can't be updated or
deleted either, until the Shop or Category is backfilled with a count. `npm run deploy` now
backfills `referenceCount` onto every existing Shop and Category itself, using the Admin SDK,
before the rules deploy — no separate step needed.

- **Schemas** (`src/catalogue/`): Shop and Category now carry a `referenceCount`
  (`referenceCountSchema`), tightened from v0.2.0's shape, so a write that used to pass — one
  missing it, or setting it outside a non-negative integer — can now be rejected.
- **Rules** (`firestore.rules`): a Shop or Category may no longer be deleted while its
  `referenceCount` is nonzero. Creating or updating a Category, or a CatalogueItem, must carry
  the matching `referenceCount` adjustment(s) on the Shop and/or Category it newly references,
  stops referencing, or moves its reference to/from, in the same batch — checked against that
  document's before/after state with `getAfter`; a write that leaves a count out of step is
  denied. A new Shop or Category must start at `referenceCount: 0`. A batch may only adjust a
  given Shop or Category's count through one referencing change; a batch that adds, removes, or
  moves two references to the same target at once is denied and must be split into one write per
  reference.
- **Deploy** (`scripts/deploy/`): `npm run deploy` now backfills `referenceCount` onto every
  existing Shop and Category, recomputed from the Categories and CatalogueItems that reference
  it, between the credential check and the rules deploy — idempotent, so a retried deploy is
  safe. It only writes a Shop or Category that has no `referenceCount` yet, so once these rules
  are live a routine redeploy leaves the rules-maintained count alone. Run the first upgrade
  deploy while nothing is writing catalogue data: a reference added between the backfill's read
  and its write is not counted.

## v0.2.0

Breaking for existing Households: redeploy (`npm run deploy`) before pinning an app to this
release, or `checkPlatform` reports `outdated` where it used to report `ok`.

- **Schemas** (`src/core/`, `src/catalogue/`): Item's `barcodes` now use the `Barcode` brand
  (`barcodeSchema`) — a GTIN, digits only, length 8, 12, 13 or 14 — tightened from v0.1.0's
  free-form string, so a write that used to pass can now be rejected. `CORE_COLLECTION_SCHEMAS`,
  `CATALOGUE_COLLECTION_SCHEMAS`, `COLLECTION_SCHEMAS` and `CollectionSchemas` map each
  collection's schema by its doc path; `catalogueItemDocPath` and `semverMinor` are also new.
- **Rules** (`firestore.rules`): a signed-in user who isn't a Member may now `get` `meta/household`
  and `meta/platform` (to tell whether the Household is claimed) and their own `members/{uid}` doc
  (to tell whether they've been added); `list` on `meta` and `members` stays Member-only.
  `members/{uid}` writes now require a non-empty `email` on create and update, and `addedAt` must
  be the server's own commit time on create and unchanged on update. `items` barcodes must now be
  GTINs, matching the `Barcode` brand above. The Owner can no longer delete their own
  `members/{uid}` doc.
- **Guard** (`src/core/platform.ts`): `checkPlatform` now treats a pre-1.0 **minor**, not just the
  major, as breaking: an app built against 0.2.0 reports `outdated` against a Household whose
  deployed platform is still below 0.2.0, where v0.1.0 reported `ok`.

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
