---
"systemd-ts": minor
---

Add `Executable`, `defineExecutable()`, and `notify` helpers for TypeScript-native service entrypoints and `sd_notify` integration.

For example, a module can now define its own runnable entrypoint and be passed directly into a service directive:

```ts
export default defineExecutable(async () => {
  console.log("running backup");
});
```

```ts
const service = new SystemdService({
  name: "backup-db",
  service: {
    ExecStart: executable,
  },
});
```

Services can also send readiness and watchdog signals with `notify.ready()` and `notify.watchdog()`.
