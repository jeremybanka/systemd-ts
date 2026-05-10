# systemd compatibility records

Each file in this directory records the review outcome for one upstream
`systemd` release.

When Renovate opens a PR that changes `systemd.version`, CI requires a matching
file at `compatibility/systemd/<version>.yaml` before the PR can pass.

Use this shape:

```yaml
version: v260.1
status: compatible
reviewedAt: 2026-05-09
notes: No directive updates required for this release.
```

`status` must be `compatible` for the PR check to pass.
