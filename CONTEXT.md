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
