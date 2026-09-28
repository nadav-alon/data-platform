# Changelog

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
