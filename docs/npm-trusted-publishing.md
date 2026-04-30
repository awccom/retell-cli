# npm Trusted Publishing

This repo publishes `retell-cli` through GitHub Actions and npm Trusted Publishing.

## One-Time npm Setup

In the `retell-cli` package settings on npmjs.com, add a Trusted Publisher:

- Publisher: GitHub Actions
- Organization or user: `awccom`
- Repository: `retell-cli`
- Workflow filename: `publish.yml`
- Environment name: leave blank

npm requires the workflow filename to match exactly and the file must live under `.github/workflows/`.

## Release Flow

1. Bump `package.json` to a version that is not already published.
2. Add a matching `CHANGELOG.md` entry.
3. Merge those changes to `main`.
4. The `Publish to npm` workflow installs dependencies, runs typecheck, tests, build, and publishes only if the package version is not already on npm.

The workflow also supports manual runs through `workflow_dispatch`, which is useful when publishing a version that was already merged before the workflow existed.
