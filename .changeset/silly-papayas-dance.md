---
"systemd-ts": minor
---

Add rich failure metadata for operational errors. `UnitStartError` now includes best-effort diagnostics from `systemctl show` and `systemctl status`, while `UnitLogsReadError`, `NotifySendError`, and `UnitMaterializationError` expose structured `reason` fields. Command-backed errors such as `UnitEnableError`, `UnitStartError`, `UnitLogsReadError`, and `NotifySendError` also expose `environmentReason` to distinguish cases like a missing `systemctl`, a permission problem, or an unavailable systemd manager.

```ts
const started = await systemd.start(service);
if (!started.ok) {
  console.log(started.error.environmentReason);
  console.log(started.error.diagnostics?.showStatus?.result);
}
```
