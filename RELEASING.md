# Releasing

Bump the version in `package.json`, in a pull request. Merging it into `main` is what releases it:
the [Release Action](.github/workflows/release.yml) builds `dist/` and pushes tag `v<version>` on a
commit made just for it. The version must be `major.minor.patch`: no pre-release or build tag.

Apps pin a release with `npm install github:nadav-alon/data-platform#v<version>`; only those tags
carry a built `dist/`, so pinning `#main` or a commit SHA does not work.

Pushing to `main` without a version change tags nothing, so merging anything else is safe. The one
exception is the first push after this Action lands: `package.json` is already at `0.0.0` with no
tag yet for it, so that push bootstraps a `v0.0.0` release ahead of the first intentional version
bump.
