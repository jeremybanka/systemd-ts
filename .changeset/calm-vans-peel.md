---
"systemd-ts": minor
---

**Breaking change:** Rename `Systemd.install()` to `Systemd.materialize()`. As part of that rename, the `installed` property on the result is now named `materialized`.

```ts
// Old way
const result = await systemd.install(service, timer);
result.installed;

// New way
const result = await systemd.materialize(service, timer);
result.materialized;
```
