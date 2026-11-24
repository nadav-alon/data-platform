# Data Platform

One Firebase store that side-project PWAs share. This repo owns the zod schemas and the Firestore
security rules for every app's collections, plus the `data-platform/client` helpers (Firebase setup,
sign-in, the membership gate; see `docs/client.md`) and the `data-platform/local` kit; apps pin it as
a git tag dependency and each Household deploys the rules to its own Firebase project. Decided on
[Data platform shape](https://github.com/nadav-alon/side-projects-manager/issues/917) and [Auth model](https://github.com/nadav-alon/side-projects-manager/issues/919).

## Language

### Instances

**Household**:
One Firebase project and everything stored in it. The unit of forking: a new household creates its
own project and deploys this repo's rules to it.
_Avoid_: tenant, workspace, instance

**Member**:
A user allowed to read and write a Household's data, recorded as `members/{uid}`.
_Avoid_: user (for the gated role), account

**Owner**:
The Member who claimed the Household and manages its Members. Same data access as any Member.
_Avoid_: admin

**Invite**:
The Owner's standing offer of Membership to one Google email, recorded as `invites/{email}`
(lowercased) and spent when that person joins, or revoked by the Owner. Single-use, no expiry.
_Avoid_: invitation, pending member

### Ownership

**Core**:
Entities more than one app reads or writes, owned by the platform rather than any app
(`src/core/`). Today: Item identity, State and State history.
_Avoid_: shared, common

**Promotion**:
Moving an app-owned entity from `src/<app>/` into Core once a second app needs it. Collection
names are un-prefixed from day one, so promotion moves code, never data.

### Core entities

**Item**:
A generic product, not a brand, with an optional brand note; many barcodes may later point at one
Item.

**State**:
How much of an Item the Household has: `enough` / `running low` / `out`.
_Avoid_: have / almost gone / need, stock level

**State history**:
Every State change, timestamped by the server, append-only.

### Catalogue entities

**Shop**:
A kind of place a CatalogueItem is bought at (pharmacy, grocery), not a specific store; see **Store**.

**Shop for Recipe Ingredients**:
The one Shop the Household buys the Ingredients of its Wanted Recipes at, kept in `meta/settings` (`recipeIngredientShopId`; absent means unset). Any Member sets or clears it. It is not a reference the Shop counts, so the Shop can be soft-deleted while it is set; the client then reports it as unset.

**Category**:
A grouping of CatalogueItems, carrying the default Shop they're bought at.

**Tag**:
A household-defined label for finding CatalogueItems across Categories: many per CatalogueItem,
no Shop. Its name is unique among live Tags, ignoring case and surrounding spaces. A Tag can be
soft-deleted while CatalogueItems still carry it, so it has no reference count.

**Tag name reservation**:
The `tagNames` doc a live Tag holds on its name, so no other live Tag can take it. Created, moved
and released in the same batch as the Tag it belongs to. Unrelated to _claiming_ the Household.
_Avoid_: claim

**Aisle**:
A household-wide label for where in a store an Item sits ("dairy", "frozen"). Managed like a Tag:
created, renamed, soft-deleted and restored, with a name unique among live Aisles, ignoring case and
surrounding spaces. A CatalogueItem carries at most one. Not tied to any Shop or Store, and it can
be soft-deleted while CatalogueItems still carry it, so it has no reference count.

**Aisle name reservation**:
The `aisleNames` doc a live Aisle holds on its name, so no other live Aisle can take it. Created,
moved and released in the same batch as the Aisle it belongs to, as a Tag name reservation is.

**Store**:
A named store under one Shop ("Osher Ad" under "grocery"). Carries its **aisle order**: the Aisles
in the order one walks that store, each at most once. A CatalogueItem never points at a Store.
Branches are not modelled: a second differing branch is another Store with a longer name. Nothing
references a Store, so it has no reference count and doesn't count toward its Shop's.

**CatalogueItem**:
Per-Household catalogue data for a Core Item, keyed by its id: Category, Necessity, any number of
Tags (`tagIds`, empty by default), at most one Aisle (`aisleId`), and an optional Shop override that takes precedence over the
Category's default.

**Recipe**:
A household's cooking instructions, one document with everything embedded: a title, its
Ingredients, prep steps (done before cooking starts) and steps, and optionally servings, a source
URL and notes. It is _Wanted_ when the Household wants to make it (`wanted`). Soft-deletable and never hard-deleted, so its id stays stable.

**Ingredient**:
One line of a Recipe: a name, optionally the Item it names (`itemId`), a quantity with an optional
unit (a unit needs a quantity), and a prep note. It is _assumed_ when the Recipe takes it for granted
(`assumed`, like salt): an assumed Ingredient never names an Item. An Ingredient that names no Item and is not assumed
is _unlinked_, and only an unlinked Ingredient can be _bought_ (`bought`). The Wanted part is a
client guarantee, not a schema invariant: `setIngredientBought` refuses a Recipe that is not Wanted and
`setRecipeWanted` clears `bought` when it un-Wants, but the schema and rules accept `bought` on a Recipe
that is not Wanted.

**Nutrition**:
The macros of some amount of food: `kcal`, `proteinG`, `carbsG` and `fatG`, each a number of at least 0.
A value shape that other records embed, not a collection of its own; a Food's `perServing` is one.

**Food**:
A dish or product the Household has saved for the nutrition app that is not a Recipe, one document in
`foods/{id}` shared by every Member: a name, optionally where it is eaten or bought (`place`), the
Nutrition of one serving (`perServing`) with an optional label for it (`servingLabel`, "1 plate"), and
`estimated` when the numbers are a guess rather than a label or source. Soft-deletable and never
hard-deleted.

**Soft delete**:
Marking an Item, CatalogueItem, Category, Shop, Tag, Aisle, Store, Recipe, Food or Log Entry deleted with
`deletedAt` rather than removing it, so its history survives. A record without `deletedAt` is
_live_. A soft-deleted record holds no reference counts. Where a reference is unchecked, it can
still point at one: an Ingredient's `itemId` is not checked, so a Recipe may name a soft-deleted
Item. It is the only way an app deletes: the rules deny hard delete on all ten, and only the
Firebase console, as admin, can still remove one.
_Avoid_: archive

**Necessity**:
How essential a CatalogueItem is: `essential` / `important` / `optional`.

### Nutrition entities

**Targets**:
A Member's daily nutrition goals: optional `kcal`, `proteinG`, `carbsG` and `fatG`, each a positive
number, in one doc per Member (`nutritionTargets/{uid}`). What a day's intake is measured
against. Per day, not per meal or per week, and independent of Google Health's own goals. Only the
owning Member reads or writes them, not even another Member.

**Log Entry**:
One thing a Member ate, one document in `nutritionLogs/{uid}/entries/{id}` in that Member's own log:
when (`eatenAt`), which `mealType` (`breakfast`, `lunch`, `dinner` or `snack`), its `source` (a saved
Food by `foodId`, or `quick` for a one-off with no Food), a `name` and the `nutrition` totals for
`servings` (a positive number, 1.5 allowed), both snapshotted so editing a Food later never rewrites
history. `googleHealthId` is the data point it was pushed as; absent means not yet synced.
It can be marked `estimated: true` when its numbers are a guess rather than a label or source;
`false` is spelled as absence, as on a Food.
A quick entry's `nutrition` is given per serving and multiplied by `servings`, as a Food's is.
Soft-deletable and never hard-deleted. Only the owning Member reads or writes it, not even another
Member.
