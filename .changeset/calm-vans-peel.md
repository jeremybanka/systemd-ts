---
"systemd-ts": minor
---

Promote `Systemd.materialize()` and `SystemdMaterializeResult` as the primary API for writing unit files into the unit directory.

For example, code that previously wrote unit files with `await systemd.install(service, timer)` can now use `const result = await systemd.materialize(service, timer)` and then read `result.pathFor(timer)`.

Remove the `Systemd.install()` method and `SystemdInstallResult` export as breaking changes. For example, code that previously imported `SystemdInstallResult` and called `await systemd.install(service, timer)` should now import `SystemdMaterializeResult` and call `await systemd.materialize(service, timer)`.

Remove the `installed` property from `SystemdMaterializeResult` as a breaking change. For example, code that previously read `result.installed` should now read `result.materialized`.
