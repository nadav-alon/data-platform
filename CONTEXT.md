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
A kind of place a CatalogueItem is bought at (pharmacy, grocery), not a specific store.
_Avoid_: store

**Category**:
A grouping of CatalogueItems, carrying the default Shop they're bought at.

**CatalogueItem**:
Per-Household catalogue data for a Core Item, keyed by its id: Category, Necessity, and an
optional Shop override that takes precedence over the Category's default.

**Soft delete**:
Marking an Item, CatalogueItem, Category or Shop deleted with `deletedAt` rather than removing it,
so its history survives. A record without `deletedAt` is _live_. A soft-deleted record holds no
reference counts and can't be referenced.
_Avoid_: archive

**Necessity**:
How essential a CatalogueItem is: `essential` / `important` / `optional`.
