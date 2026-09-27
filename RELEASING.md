# Releasing

Bump the version in `package.json`, in a pull request. Merging it into `main` is what releases it:
the [Release Action](.github/workflows/release.yml) builds `dist/` and pushes tag `v<version>` on a
commit made just for it. The version must be `major.minor.patch`: no pre-release or build tag.

Apps pin a release with `npm install github:nadav-alon/data-platform#v<version>`; only those tags
carry a built `dist/`, so pinning `#main` or a commit SHA does not work.

A push to `main` tags `v<version>` only if that tag doesn't already exist yet — the check is tag
existence, not whether the version changed since the last push. Once a version's tag exists, the
normal case after a successful release, pushing again without a version bump tags nothing. But if a
release run failed after the version bump merged, or that tag was deleted, the next push to `main` —
even one unrelated to the version — will still tag `v<version>` from whatever commit it lands on.

The Release Action re-runs `npm run typecheck` and `npm test` itself before tagging, so a commit
that fails either never gets a tag. The rules harness (`npm run test:rules`) runs only in CI and
does not gate the tag.

The `v0.0.0` tag came from the Release Action's first run, since `package.json` was already at
`0.0.0` with no tag for it.
