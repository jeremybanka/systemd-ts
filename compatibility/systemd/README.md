# systemd compatibility records

Each file in this directory records the review outcome for one upstream
`systemd` release.

When Renovate opens a PR that changes `systemd.version`, CI requires a matching
file at `compatibility/systemd/<version>.yaml` before the PR can pass.

Before reviewing a new upstream release, refresh the cached manpage source used
for compatibility work:

```bash
pnpm run manpages:fetch -- --current
```

You can also fetch a specific upstream release directly:

```bash
pnpm run manpages:fetch -- v260.1
```

The fetch workflow verifies the exact GitHub Release tag first, caches the
download under local ignored `.manpages/`, and reuses the cached tree on later
runs when it is still valid.

Use this shape:

```yaml
version: v260.1
status: compatible
reviewedAt: 2026-05-09
notes: No directive updates required for this release.
```

`status` must be `compatible` for the PR check to pass.
