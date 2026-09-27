# Releasing

Bump the version in `package.json`, in a pull request. Merging it into `main` is what releases it:
the [Release Action](.github/workflows/release.yml) builds `dist/` and pushes tag `v<version>` on a
commit made just for it. The version must be `major.minor.patch`: no pre-release or build tag.

Apps pin a release with `npm install github:nadav-alon/data-platform#v<version>`; only those tags
carry a built `dist/`, so pinning `#main` or a commit SHA does not work.

Pushing to `main` without a version change tags nothing, so merging anything else is safe.

The Release Action re-runs `npm run typecheck` and `npm test` itself before tagging, so a commit
that fails either never gets a tag, even though CI runs the same checks in parallel on the same
push.

The `v0.0.0` tag came from the Release Action's first run, since `package.json` was already at
`0.0.0` with no tag for it.
