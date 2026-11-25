# Changelog

## v0.26.0

No rules change to redeploy.

- **Client (breaking)**: `linkIngredientToItem` is no longer a transaction: it reads the Recipe (the cache
  when offline) and writes the Ingredients, and drops the linked Ingredient's Bought, in one field
  write. Offline the link applies to the local cache at once and reaches the server on reconnect; the
  promise settles once the server has answered. It still throws for a stale position and name or an
  Ingredient that is Linked or Assumed, judged against what it read, so an edit to the Recipe made in
  between is overwritten. The rules cannot repeat that check; they refuse a link that leaves the first
  Ingredient Linked or Assumed while still Bought, and so a write that keeps that Bought.

## v0.25.0

Redeploy `firestore.rules`: they now accept `boughtIngredients` on a Recipe, and no longer look at
`bought` on an Ingredient.

- **Recipes (breaking)**: an Ingredient's Bought moves from `bought: true` on the Ingredient to the
  Recipe's `boughtIngredients`, a map from the Ingredient's name to `true`, so a reorder of the
  Ingredients cannot mark another one. `bought` on an Ingredient is no longer part of the schema; one
  already stored is ignored (the Ingredient reads as not bought) and nothing is migrated. The rules
  refuse a Bought on a Recipe that is not Wanted, and on the first Ingredient when it names an Item or
  is assumed.
- **Client (breaking)**: `setIngredientBought(db, recipeId, name, bought)` takes the Ingredient's name
  instead of its position, and is one field write rather than a transaction, so it applies to the
  local cache at once and reaches the server when the connection returns offline. It no longer throws
  for a Recipe that is not Wanted or an Ingredient that is Linked or Assumed; the rules refuse those.
  `setRecipeWanted` stays a transaction and clears `boughtIngredients` when it un-Wants.
- **Client**: `linkIngredientToItem` drops the linked Ingredient's name from `boughtIngredients`
  instead of clearing `bought` on the Ingredient.
- **MCP**: `set_ingredient_link` drops the Ingredient's Bought when it links or assumes it.

## v0.24.0

- **Client**: `linkIngredientToItem(db, recipeId, { position, name }, itemId)` links one Unlinked
  Ingredient of a Recipe to an Item and clears its `bought`. It names the Ingredient by the position and
  name the caller saw, and throws, writing nothing, when that position no longer holds that name or
  the Ingredient is already Linked or Assumed.

## v0.23.0

Redeploy `firestore.rules`: they now accept `estimated` on a Log Entry.

- **Nutrition**: a Log Entry can be marked `estimated: true` when its Nutrition is a guess rather than a
  label or source; `false` is spelled as absence, as on a Food.

## v0.22.0

- **MCP**: the household server gains `list_foods`, `add_food` and `log_food`, so Claude can save a Food
  and log it to the signed-in Member's own log. An estimate is saved with `estimated: true`.
- **Nutrition**: the `nutrition` namespace now exports `guessMealType`, `guessMealTypeAtClock` and
  `scaleNutrition`. The meal-type guess: before 11:00 breakfast, before 16:00 lunch, after 21:30 snack
  (21:30 itself is dinner), otherwise dinner.

## v0.21.0

Redeploy `firestore.rules`: they now accept `nutritionLogs/{uid}/entries`.

- **Nutrition**: a Member's Log Entries (`nutritionLogs/{uid}/entries/{id}`): `eatenAt`, `mealType`
  (`breakfast` | `lunch` | `dinner` | `snack`), `source` (`{ kind: 'food', foodId }` or
  `{ kind: 'quick' }`), `name`, positive `servings`, `nutrition` totals, optional `googleHealthId`
  and `deletedAt`; `LogEntryId` is branded. Only the owning Member reads, creates, updates,
  soft-deletes and restores them; hard delete is denied. The schema joins `COLLECTION_SCHEMAS`.
- **Local**: `owner-with-foods` also seeds a day of the Owner's Log Entries.

## v0.20.0

Redeploy `firestore.rules`: they now accept the `foods` collection.

- **Nutrition** (`nutrition` namespace): the third app's module. A Food is one Household-shared document in
  `foods/{id}` (`name`, optional `place`, `perServing` Nutrition, optional `servingLabel`, optional
  `estimated: true`, `deletedAt`); `FoodId` is branded. Any Member creates, updates, soft-deletes and
  restores one; hard delete is denied. Its schemas join `COLLECTION_SCHEMAS`.
- **Nutrition**: `kcal`/`grams` (and `isKcal`/`isGrams`) now accept 0: `Kcal` and `Grams` are
  units, at least 0, shared by Nutrition and Targets. A Target still has to be above zero.
- **Local**: an `owner-with-foods` scenario seeds a few Foods.

## v0.19.0

Redeploy `firestore.rules`: they now accept `nutritionTargets`.

- **Nutrition**: a Member's daily Targets (`nutritionTargets/{uid}`): optional `kcal`, `proteinG`,
  `carbsG` and `fatG`, each a positive number. The schema is `nutrition.targetsSchema`, merged into
  `COLLECTION_SCHEMAS`. Only the owning Member reads or writes the doc.

## v0.18.0

Redeploy `firestore.rules`: they now accept `wanted` and `bought`, and `meta/settings` is new. The
MCP server code is not part of the published package's exports; the **Local** entry below is.

- **Recipes**: a Recipe takes an optional `wanted: true`, and an Unlinked Ingredient (no Item, not
  assumed) an optional `bought: true`; `bought` on a Linked or Assumed Ingredient fails validation.
  `data-platform/client` adds `setRecipeWanted` (not Wanted clears every `bought` in the same write)
  and `setIngredientBought` (refuses on a Recipe that is not Wanted). The MCP server's
  `setIngredientLink` clears `bought` when it links or assumes an Ingredient.
- **Client**: the Household carries an optional Shop for Recipe Ingredients, in `meta/settings`
  (`recipeIngredientShopId`; absent means unset). `watchRecipeIngredientShop` reads it live and
  `setRecipeIngredientShop` sets or clears it, refusing a Shop that is not a live Shop of the
  Household. Any Member may set it.
- **MCP server** (`src/mcp/`): `add_catalogue_item` adds an Item and its CatalogueItem in one batch,
  parsed by the domain zod schemas first and passing `firestore.rules` as the signed-in Member. It
  asks for no confirmation beyond Claude Code's own tool-permission prompt.
- **MCP server**: an `add_recipe` tool adds a Recipe with its Ingredients from structured input,
  validated by the Recipe zod schema before it is sent and checked by `firestore.rules` as the
  signed-in Member. It too asks for no confirmation of its own.

- **Local** (`data-platform/local`): `connectLocal` takes optional `{ authHost, firestoreHost }`
  (`host:port` each, validated as an `EmulatorHost`) to reach emulators on other ports. The
  defaults stay `127.0.0.1:9099` and `127.0.0.1:8090`.
- **Tests**: `npm run test:rules:parallel` runs the rules suite on Auth 9199 and Firestore 8190
  (`firebase.parallel.json`), so it can run beside another emulator on the default ports. The
  suite takes its ports from `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`.

## v0.16.0

No redeploy needed: rules and schemas are unchanged, and the new code is not part of the published
package's exports.

- **MCP server** (`src/mcp/`): a read-only stdio MCP server that answers questions about the
  Household's Items and Recipes from Claude Code, signed in as the developer's own Member through
  Google OAuth so every read passes `firestore.rules`. It runs from a clone (`npm run mcp`); setup is
  in the README. `@modelcontextprotocol/sdk` is a dev dependency only.

## v0.15.2

No redeploy needed: additive client and `data-platform/local` code only.

- **Local** (`src/local/`): `data-platform/local` exports `LOCAL_WEB_CONFIG`, the web config whose
  `projectId` is `LOCAL_PROJECT_ID`, so an app passes it straight to `initFirebase` in local mode.
- **Client**: `data-platform/client` exports `isRulesRefusal(error)`, true when Firestore's rules
  denied the request (`permission-denied`), so an app can tell a refusal from a network or
  programming error.

## v0.15.1

Client only; rules and schemas are unchanged, so no redeploy is needed.

- **Client**: `data-platform/client` exports `terminateFirebase(client)`, which terminates Firestore
  and deletes the app, so a reset can call `initFirebase` again from a different config.

## v0.15.0

Rules and schemas are unchanged, but `initFirebase`'s `local` option changes type, so the minor moves
(pre-1.0 it is the breaking digit). Redeploy to move `meta/platform` to `0.15.0`; until then
`checkPlatform` reads `outdated`.

- **Client** (breaking): `initFirebase(config, { local })` takes the local kit as an argument,
  `{ local: localKit }` with `localKit` from `data-platform/local`, instead of `{ local: true }`.
  `data-platform/client` no longer imports anything under `local/`, so a production bundle that never
  imports `data-platform/local` carries none of the kit's project ID or emulator ports. `LocalKit` is
  exported as a type.
- **Local** (`src/local/`): `data-platform/local` exports `localKit`.

## v0.14.0

Redeploy to get the new rules, which also moves `meta/platform` to `0.14.0`; until then
`checkPlatform` reads `outdated`. A Household whose repo has the `FIREBASE_PROJECT_ID` Actions
variable set is redeployed by the tag push itself; only the others need `npm run deploy` by hand.
The minor moves because Recipe writes need the new rules; nothing needs migrating, since the schema
is additive.

- **Schemas** (`src/recipes/`, exported as the `recipes` namespace): `COLLECTION_SCHEMAS` gains
  `recipes` (`recipeSchema`, soft-deletable), with `RecipeId`/`recipeIdSchema`, `RECIPES_COLLECTION`
  and `RECIPES_COLLECTION_SCHEMAS`. A Recipe embeds its `ingredients`, `prepSteps` and `steps`;
  an Ingredient never has `assumed` together with `itemId`, and a `unit` only with a `quantity`.
- **Rules** (`firestore.rules`): a Member creates and updates a live Recipe, and soft-deletes or
  restores it through `deletedAt`. Hard delete is denied. The rules check only the first element of
  `ingredients`, `prepSteps` and `steps`, as they do for `barcodes`; zod checks them all.
  `itemId` is not checked against existing Items.

## v0.13.0

Redeploy to move `meta/platform` to `0.13.0`; until then `checkPlatform` reads `outdated`, because
pre-1.0 the minor is the breaking digit. A Household whose repo has the `FIREBASE_PROJECT_ID` Actions
variable set (RELEASING.md, "Deploying a release") is redeployed by the tag push itself; only the
others need `npm run deploy` by hand. The rules and schemas are unchanged, so nothing needs migrating.

The minor moves only to mark the release of the `data-platform/client` subpath. It ships no new code
under `src/client/`. The tag both the home catalogue and the recipes app need is v0.15.0 or later (v0.15.1
for `terminateFirebase`); v0.15.0 changed `initFirebase`'s `local` option from `true` to the
`localKit` object, breaking.

- **Client** (`src/client/`, no change in this release): everything `data-platform/client` has exported
  since v0.12.1, including `initFirebase`, the Firebase web config helpers (`FirebaseWebConfig`,
  `getStoredFirebaseWebConfig`, `saveFirebaseWebConfig`, `clearFirebaseWebConfig`, `deviceTransferUrl`,
  `parseConfigFragment`), `authClient` and the household functions (`householdExists`,
  `isHouseholdMember`, `claimHousehold`, `joinFromInvite`), from v0.12.1 to v0.12.4.

## v0.12.4

No redeploy needed: additive client code only.

- **Client** (`src/client/household.ts`): `data-platform/client` gains `householdExists(db)`,
  `isHouseholdMember(db, uid)`, `claimHousehold(db, uid, email)` (the first-claim batch) and
  `joinFromInvite(db, uid, email)`, which resolves `false` when there is no Invite or the rules refuse
  the join.

## v0.12.3

No redeploy needed: additive client code only.

- **Client** (`src/client/auth-client.ts`): `authClient(app)` on `data-platform/client` returns
  `signIn()` (Google popup; resolves with the `AuthUser`), `signOut()`, `onAuthChange(listener)`
  (the `AuthUser`, or `null` when signed out; returns the unsubscribe) and `currentUid()`.
  `AuthUser` is `{ uid: Uid, email: Email }`; a signed-in user with no email or a bad uid throws
  rather than reading as signed out. The app's Auth is looked up on each call. On an app from
  `initFirebase(config, { local: true })` it signs in through the local kit's Auth and its emulator popup.
  Porting from home-catalogue's `src/auth/authClient.ts`, the four free functions become one object:
  `signInWithGoogle(app)` → `authClient(app).signIn()`, `signOutUser(app)` → `.signOut()`,
  `watchAuthState(app, cb)` → `.onAuthChange(cb)`, `currentUserUid(app)` → `.currentUid()`.

## v0.12.2

No redeploy needed: additive, client-only.

- **Client** (`src/client/`): `data-platform/client` gains the Firebase web config helpers.
  `getStoredFirebaseWebConfig`, `saveFirebaseWebConfig` and `clearFirebaseWebConfig` keep the config under one
  platform-wide localStorage key, `data-platform:firebase-config`, so every app on the same origin reuses
  it; a malformed stored value reads as `null` and never throws. `deviceTransferUrl(pageUrl, config)` and
  `parseConfigFragment(hash)` encode and decode the `#config=` device-transfer link (QR rendering stays in
  the apps). `FirebaseWebConfig` is the branded config type, with `isFirebaseWebConfig`,
  `firebaseWebConfig` and `InvalidFirebaseWebConfigError`. The home catalogue's old app-specific key is
  not migrated here.

## v0.12.1

No redeploy needed: additive, so `PLATFORM_VERSION`'s minor doesn't move and `checkPlatform` stays
at `ok` against a `0.12.0` deploy.

- **Client** (`src/client/`, `docs/adr/0002-…md`): a new `data-platform/client` export, with `firebase`
  an optional peer like `data-platform/local`; the main entry stays zod-only. It exports
  `initFirebase(config)`, which returns `{ app, db }` with a persistent Firestore cache so writes queue
  offline. `initFirebase(config, { local: true })` runs against the local kit: a memory cache, Auth
  created through `initLocalAuth`, and Auth and Firestore pointed at the emulators through
  `connectLocal`, so do not call `connectLocal` again.

## v0.12.0

Redeploy (`npm run deploy`) to get the new rules, which also moves `meta/platform` to `0.12.0`;
until then `checkPlatform` reads `outdated`. The minor moves because Aisle and Store writes need the
new rules; nothing needs migrating, since the schema is additive.

- **Schemas** (`src/catalogue/`): `COLLECTION_SCHEMAS` gains `aisles` (`aisleSchema`, soft-deletable),
  `aisleNames` (`aisleNameReservationSchema`) and `stores` (`storeSchema`: `name`, `shopId`, `aisleOrder`,
  empty by default, each Aisle at most once). `aisle.ts` exports `AisleId`/`aisleIdSchema`, `AisleNameKey`
  and `aisleNameKey(name)`, built exactly as `tagNameKey`; `store.ts` exports `StoreId`/`storeIdSchema`.
  A CatalogueItem gains an optional `aisleId`.
- **Rules** (`firestore.rules`): a Member creates, renames, soft-deletes and restores an Aisle, held
  by an `aisleNames` reservation exactly as a Tag is; and creates, renames, reorders, soft-deletes and
  restores a Store, whose `shopId` must name a live Shop and whose `aisleOrder` may not repeat an
  id. Hard delete is denied on `aisles` and `stores`. A CatalogueItem accepts an optional `aisleId`.
- **Writing an Aisle**: write the Aisle and its `aisleNames` reservation, keyed by
  `aisleNameKey(name)`, in one batch, or the write is denied. Stores take no reservation and do not
  count toward their Shop's `referenceCount`.

## v0.11.0

Redeploy (`npm run deploy`) to get the new rules, which also moves `meta/platform` to `0.11.0`;
until then `checkPlatform` reads `outdated`. The minor moves because Tag writes need the new rules;
nothing needs migrating, since the schema is additive.

- **Schemas** (`src/catalogue/`): `COLLECTION_SCHEMAS` gains `tags` (`tagSchema`, soft-deletable) and
  `tagNames` (`tagNameReservationSchema`). `tag.ts` also exports `TagId`/`tagIdSchema`, `TagNameKey`
  and `tagNameKey(name)`, which an app needs to write a reservation. A CatalogueItem gains an optional
  `tagIds` list of Tag ids, empty by default.
- **Rules** (`firestore.rules`): a Member creates, renames, soft-deletes and restores a Tag; hard
  delete is denied on `tags`. A live Tag's name is held by a `tagNames` doc, so no other live Tag can
  take it. A Member may release a `tagNames` reservation whose Tag was removed outright from the
  console, so a stranded name can be freed.
- **Writing a Tag**: write the Tag and its `tagNames` reservation, keyed by `tagNameKey(name)`, in one
  batch, or the write is denied. Names are unique ignoring case and surrounding spaces, so `" Fruit"`
  and `"fruit"` collide.

## v0.10.2

No redeploy needed: additive, so `PLATFORM_VERSION`'s minor doesn't move and `checkPlatform` stays
at `ok` against a `0.10.0` deploy.

- **Local kit** (`src/local/`, `docs/local-kit.md`): `data-platform/local` exports `initLocalAuth(app)`, which creates
  the app's Auth with in-memory persistence and the browser popup resolver so `signInWithPopup`
  can sign in as a scenario user through the Auth emulator. Call it before the app's first Auth call, including `connectLocal`.

## v0.10.1

No redeploy needed: the rules and schemas are unchanged, and a patch release keeps `checkPlatform` at `ok` against a `0.10.0` deploy.

- **Local kit** (`src/local/`): every scenario (`empty`, `owner-with-items`, `invited-member`) now
  seeds `meta/platform` with this release's `PLATFORM_VERSION`, so an app pinned to this release
  no longer reads `missing` against a local Household.

## v0.10.0

Redeploy (`npm run deploy`) to get the new rules. Nothing needs migrating.

- **Rules** (`firestore.rules`): a Shop's or Category's `referenceCount` no longer moves on behalf
  of a reference that didn't change. A live Category update that keeps its default Shop is denied
  if that Shop's count moves, unless the Category's own count moves in the same write; a live
  CatalogueItem update that keeps its Category, or its Shop override, is denied if that target's
  count moves. A restore batch against a Category or CatalogueItem that is still live is therefore refused as a whole,
  instead of leaving the count one too high for good.

## v0.9.0

Redeploy (`npm run deploy`) to get the new rules. Nothing needs migrating. Pin an app to this
release only once it soft-deletes Categories and Shops, or its Delete buttons will be denied.

- **Rules** (`firestore.rules`): hard delete is denied on `items`, `catalogueItems`,
  `categories` and `shops`, for every Member, the Owner included, live or soft-deleted. Setting
  `deletedAt` and restoring are unchanged. The Firebase console, as admin, can still delete.

## v0.8.0

No redeploy needed: the rules and schemas are unchanged, and a patch release keeps `checkPlatform` at `ok` against a `0.10.0` deploy.

- **Local kit** (`src/local/`, `docs/local-kit.md`): the `data-platform/local` export and the
  `data-platform-local` bin run an app against a local Household. The bin starts the Auth and
  Firestore emulators with `firestore.rules` under a `demo-` project ID and seeds a scenario
  (`empty`, `owner-with-items`, `invited-member`) picked by name. `connectLocal(app)` points a web
  app's Auth and Firestore at them, and seeding validates every fixture against
  `COLLECTION_SCHEMAS`. `firebase`, `firebase-admin` and `firebase-tools` are now optional peer dependencies, needed only
  for `data-platform/local`.
- **Tests**: `npm run test:rules` now starts the Auth emulator too, for the sign-in tests.

## v0.7.0

Redeploy (`npm run deploy`) before pinning an app to this release; until the rules are live a
Member doc's `email` is still unchecked on create.

- **Rules** (`firestore.rules`): a Member doc created by an invitee's join or by first-claim must
  record the caller's own verified token email, lowercased, as its `email`. A create whose
  `email` differs from it, or whose token email is unverified, is denied. Owner-created Member
  docs and existing Member docs are unchanged; nothing is migrated.

## v0.6.0

Redeploy (`npm run deploy`) to get the new rules. Nothing needs migrating.

- **Rules** (`firestore.rules`): any Member, not only the Owner, may `list` the Household's
  invites. Create and delete stay Owner-only (an invitee still deletes their own invite when
  joining), and `get` stays limited to the invite keyed by the caller's own token email. A
  non-Member is still refused.

## v0.5.0

Redeploy (`npm run deploy`) to get the new rules. Nothing needs migrating: a doc without
`deletedAt` is live and behaves exactly as before, and hard delete is still allowed.

- **Schemas**: an optional `deletedAt` (a Firestore timestamp) on Item, CatalogueItem, Category
  and Shop (`deletedAtSchema`). A record with it set is soft-deleted; without it, live.
- **Rules** (`firestore.rules`): `deletedAt` must be absent or a timestamp (never `null`: restore
  with `deleteField()`). It may only be set, on a live doc, to the server's commit time
  (`request.time`), so a soft-deleted doc keeps its original time; and a doc can't be created
  already soft-deleted.
  - Stricter than a bare reading of the soft delete: a soft delete may not move the doc's Category
    or Shop in the same write, and a doc that stays soft-deleted may not change its references.
  - A CatalogueItem soft-deleted in a batch must lower its Category's `referenceCount` by 1, and
    its Shop override's when set; restoring it (clearing `deletedAt`) must raise them. Its `items`
    doc must carry the same `deletedAt` after the batch, and the other way round.
  - A Category or Shop can be soft-deleted only at `referenceCount == 0`, in the same write that
    leaves that count as it was. A Category soft-deleted lowers its default Shop's count by 1;
    restoring it raises the Shop it then names by 1.
  - A CatalogueItem or Category may not be created, moved, or restored to point at a Category or
    Shop that is soft-deleted (live before the batch), though a restore may move to a live one in
    the same write.
  - Hard-deleting an already soft-deleted CatalogueItem or Category no longer adjusts counts: its
    soft delete already did.

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
