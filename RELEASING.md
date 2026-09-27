# Releasing

Bump the version in `package.json`, in a pull request. Merging it into `main` is what releases it:
the [Release Action](.github/workflows/release.yml) builds `dist/` and pushes tag `v<version>` on a
commit made just for it. The version must be `major.minor.patch`: no pre-release or build tag.

Apps pin a release with `npm install github:nadav-alon/data-platform#v<version>`; only those tags
carry a built `dist/`, so pinning `#main` or a commit SHA does not work.

Pushing to `main` without a version change tags nothing, so merging anything else is safe.

(The first push after this Action landed bootstrapped `v0.0.0`, since `package.json` was already at
`0.0.0` with no tag yet for it. That has already happened; every push since then follows the rule
above with no exception.)
