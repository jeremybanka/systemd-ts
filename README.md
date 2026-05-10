# systemd-ts

A TypeScript-first toolkit for creating and managing `systemd` services and
timers from application code.

## Workspace

- `packages/systemd-ts`: the publishable library

## Toolchain

- `mise` manages `node`, `pnpm`, and `viteplus`
- `vp` drives install, format, lint, typecheck, test, and build

## Upstream Tracking

- `systemd.version` contains the latest stable upstream `systemd` release version
- Renovate watches `systemd/systemd` GitHub releases and updates that file hourly

## Commands

```bash
vp install
vp check
vp run -r test
vp run -r build
```
