# Contributing

## Development

Use Node.js 22.22.0 or later.

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm pack --dry-run
```

Keep the node interface, descriptions, errors, and documentation in English. Do not add runtime dependencies, environment-variable access, or file-system access.

## Releases

Releases are published only by `.github/workflows/publish.yml`:

1. Update `package.json`, `package-lock.json`, and `CHANGELOG.md`.
2. Merge the validated change to `main`.
3. Create and push a tag matching the package version, such as `v0.2.0`.
4. GitHub Actions validates and publishes the package with npm provenance.

Do not publish releases from a local machine.
