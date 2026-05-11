---
"systemd-ts": patch
---

Hardened command execution by removing the remaining internal shell-wrapped `systemctl` and `systemd-notify` paths.

```ts
const result = await notify.ready({
  executor,
  socketPath: `/run/systemd/notify`,
  status: `ready`,
});
```

Custom executors may now receive structured execution options, including environment overrides, so notification delivery and systemd diagnostics can be invoked directly without composing `bash -lc` command strings.
