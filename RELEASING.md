# Releasing

Bump the version in `package.json`, in a pull request. Merging it into `main` is what releases it:
the [Release Action](.github/workflows/release.yml) builds `dist/`, pushes tag `v<version>` on a
commit made just for it, and creates a GitHub Release for that tag with auto-generated notes. The
version must be `major.minor.patch`: no pre-release or build tag.

Apps pin a release with `npm install github:nadav-alon/data-platform#v<version>`; only those tags
carry a built `dist/`, so pinning `#main` or a commit SHA does not work.

A push to `main` tags `v<version>` only when it changed `version` — compared to what `package.json`
held before the push, not just its own last commit — and the tag doesn't exist yet. Once a version's
tag exists, the normal case after a successful release, pushing again tags nothing, version bump or
not. If a release run failed after the version bump merged, or that tag was deleted, no later push
releases it: the next push to `main` finds `v<version>` missing without having changed `version`
itself, and the Release Action fails, naming the missing tag, instead of releasing that push's
unrelated tree under it. Recover by re-running the Release Action for the version bump's push: it
checks out that push's own tree — the one the tag is supposed to contain — and tags it. Re-creating
the tag by hand instead produces one with no `dist/`, since only the Action's own run builds and
commits it.

The Release Action re-runs `npm run typecheck`, `npm test` and `npm run test:rules` itself before
tagging, so a commit that fails any of them never gets a tag.

Creating the GitHub Release itself is retried independently of the tag: every run, whether or not
it tags a new version, checks the tag for `package.json`'s current version and creates its Release
if that tag exists but has none yet. So a run where the tag push succeeds but the Release creation
fails (API error, rate limit, token problem) leaves nothing to fix by hand — the next push to `main`
creates the missing Release, without re-tagging or re-releasing anything.

The `v0.0.0` tag came from the Release Action's first run, since `package.json` was already at
`0.0.0` with no tag for it.

## Deploying a release

When the repo has a `FIREBASE_PROJECT_ID` Actions variable set (`docs/household-setup.md`), the
Release Action deploys the tag it just pushed — `firestore.rules` and `meta/platform` — to that
project, authenticated with the `FIREBASE_SERVICE_ACCOUNT` secret the same way
[deploy.yml](.github/workflows/deploy.yml) does. Left unset, as on a fork or another household's
clone, nothing deploys and the release behaves exactly as described above.

Deploying is retried the same way Release creation is: every run recomputes the current tag and,
once that tag exists on origin, deploys it, regardless of whether this run is the one that tagged
it. So a deploy that fails never un-releases the tag, and the next push to `main` — even one that
changes nothing else — deploys it without re-tagging.
