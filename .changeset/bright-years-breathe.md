---
"systemd-ts": minor
---

**Breaking change:** Change the public API from throw-based control flow to `Result` unions for normal failures. `Systemd.materialize()`, `enable()`, `start()`, `logs()`, `notify.ready()`, and `notify.watchdog()` now return `{ ok: true, value } | { ok: false, error }` instead of rejecting for expected operation failures.

```ts
const started = await systemd.start(service);

if (!started.ok) {
  console.error(started.error.code, started.error.message);
} else {
  console.log(started.value.activeState);
}
```

`SystemdService.render()`, `SystemdTimer.render()`, and executable rendering helpers now follow the same pattern instead of throwing for invalid exec directives or executable inference failures.
