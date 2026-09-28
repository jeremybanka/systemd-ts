# Repository commands

Run these commands from the repository root with `pnpm run <command>`. `mise.toml` selects the toolchain. Package-level commands keep the same meaning while narrowing their scope.

Following the [mise Node.js cookbook](https://mise.jdx.dev/mise-cookbook/nodejs.html#add-node-modules-binaries-to-the-path), mise adds the repository root’s `node_modules/.bin` to `PATH`. With shell activation or `mise exec -- <tool>`, installed dependency CLIs are available from the root and package directories.

| Command            | Contract                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `fmt`              | Apply the repository formatting policy.                                                                            |
| `check:fmt`        | Validate formatting without rewriting maintained files; language-specific validators are listed below.             |
| `check`            | Run every static check listed below. Generated prerequisites and caches may be written; source fixes are explicit. |
| `test`             | Run the normal test suite once and return a failing status when tests fail.                                        |
| `test:watch`       | Watch the available interactive test suites.                                                                       |
| `build`            | Build distributable artifacts.                                                                                     |
| `change`           | Author pending release notes.                                                                                      |
| `release:version`  | Prepare versions and release metadata without publishing.                                                          |
| `release:publish`  | Build as required by the release pipeline and publish packages.                                                    |
| `workflows:update` | Update pinned workflow tooling references.                                                                         |

## Static checks

- `check:deps`: `pin-checker --ignore-catalog`.
- `check:fmt`: `dprint check`.
- `check:vp`: `vp check --no-fmt`.
- `check:spelling`: `cspell lint --config ./cspell.json`.

`check:vp` runs linting and TypeScript typechecking with `lint.options.typeAware` and `lint.options.typeCheck` enabled. `check:fmt` validates formatting through dprint.

## Tool ownership and formatting

Mise installs Node.js, pnpm, and the non-npm test host tools. Use `pnpm install --frozen-lockfile` to bootstrap npm dependencies; Vite Plus and dprint come from the workspace lockfile. `pnpm-workspace.yaml` defines the workspace packages and shared dependency versions.

`fmt`, `check:fmt`, staged formatting, Changesets, and Renovate all use the root `dprint.json` policy. It covers TypeScript and JavaScript sources, JSON, Markdown, TOML, and YAML, including workflow files and upstream compatibility records. Generated output, dependency trees, test host state, cached manpages, and the generated pnpm lockfile are excluded. Markdown prose remains on a single source line per paragraph. Package `fmt` and `check:fmt` commands restrict the same policy to that package.

`pnpm run staged` formats staged files with dprint and runs Vite Plus lint fixes with formatting disabled.

## Command notes

Tests require the Docker or Colima host described in the package documentation.

## Migration

Use `check:fmt` for formatting validation and `check:<tool>` for static checks. Use the canonical commands directly; superseded names have been removed.
