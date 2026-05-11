---
"systemd-ts": minor
---

**Breaking change:** Rename result-shaped success types and simplify materialization path access. `SystemdMaterializeResult` is now `SystemdMaterialization`, `StartResult` is now `StartStatus`, and `CommandResult` is now `CommandOutput`.

```ts
const materialized = await systemd.materialize(service);
if (materialized.ok) {
  materialized.value.materialized[0]?.path;
  systemd.pathFor(service);
}
```

As part of this cleanup, the materialization object no longer exposes a `pathFor(unit)` lookup method. Use the `materialized` entries on the returned value, or call `systemd.pathFor(unit)` on the configured `Systemd` instance instead.

`materialize()` also no longer raises a runtime error for mismatched timer and service groups. That relationship is left to the type system, so runtime materialization now proceeds when the inputs are otherwise valid.
