# Data Platform

One Firebase store that side-project PWAs share. This repo owns the zod schemas and the Firestore
security rules for every app's collections; apps pin it as a git tag dependency and each Household
deploys the rules to its own Firebase project. Decided on
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

**Soft delete**:
Marking an Item, CatalogueItem, Category, Shop, Tag, Aisle or Store deleted with `deletedAt` rather than removing it,
so its history survives. A record without `deletedAt` is _live_. A soft-deleted record holds no
reference counts and can't be referenced. It is the only way an app deletes: the rules deny hard
delete on all seven, and only the Firebase console, as admin, can still remove one.
_Avoid_: archive

**Necessity**:
How essential a CatalogueItem is: `essential` / `important` / `optional`.
