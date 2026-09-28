# systemd-ts

A TypeScript-first toolkit for creating and managing `systemd` services and timers from application code.

Usage instructions and examples live in [`packages/systemd-ts/`](./packages/systemd-ts).

## Workspace

- [`packages/systemd-ts/`](./packages/systemd-ts): the publishable library

## Toolchain

- `mise` manages Node.js, pnpm, and the Docker/Colima tools.
- `pnpm install` installs the pinned npm toolchain, including Vite Plus and dprint.
- `vp` runs linting, typechecking, tests, builds, and staged checks.
- `dprint` formats TypeScript, JSON, Markdown, TOML, and YAML through npm-installed plugins.

## Upstream Tracking

- `systemd.version` contains the latest stable upstream `systemd` release version
- Renovate watches `systemd/systemd` GitHub releases and updates that file hourly
- `pnpm run manpages:fetch -- --current` refreshes the local cached upstream manpage source under `.manpages/`
- PRs that change `systemd.version` must add a matching review record in `compatibility/systemd/`

## Commands

```bash
pnpm install --frozen-lockfile
pnpm run fmt
pnpm run check
pnpm run test
pnpm run build
```

## Repository commands

See [the command guide](docs/commands.md) for formatting, static checks, tests, coverage where available, and release commands.
