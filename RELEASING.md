# Releasing

Bump the version in `package.json`, in a pull request. Merging it into `main` is what releases it:
the [Release Action](.github/workflows/release.yml) builds `dist/` and pushes tag `v<version>` on a
commit made just for it.

Apps pin a release with `npm install github:nadav-alon/data-platform#v<version>`.

Pushing to `main` without a version change tags nothing, so merging anything else is safe.
