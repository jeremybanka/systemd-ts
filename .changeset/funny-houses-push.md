---
"systemd-ts": minor
---

Added a new public `Systemctl` client for argv-first `systemctl` execution and typed query helpers.

```ts
const systemctl = new Systemctl({ scope: `user` });

await systemctl.start(`backup-db.service`);
await systemctl.showServiceStatus(`backup-db.service`);
await systemctl.listTimers({ all: true });
await systemctl.isSystemRunning();
```

The new client includes typed helpers for service status, timer listing, unit enablement and runtime state checks, and common lifecycle commands such as `start()`, `stop()`, `restart()`, `enable()`, `disable()`, `link()`, `resetFailed()`, and `daemonReload()`.
