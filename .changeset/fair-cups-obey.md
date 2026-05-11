---
"systemd-ts": minor
---

Add named error exports for the library’s public failure modes so callers can branch on stable types instead of parsing generic `Error` messages. The package now exports `SystemdTsError` plus errors such as `InvalidExecDirectiveError`, `NoUnitsProvidedError`, `UnitMaterializationError`, `UnitEnableError`, `UnitStartError`, `UnitLogsReadError`, `NotifySendError`, and `ExecutableInferenceError`.

```ts
const logs = await systemd.logs(service);
if (!logs.ok && logs.error instanceof UnitLogsReadError) {
  console.error(logs.error.reason);
}
```
