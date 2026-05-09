---
"systemd-ts": minor
---

Add the core `systemd-ts` unit model around immutable unit definitions plus a stateful `Systemd` facade.

For example, you can now define a service and timer as values and then install and enable them through one configured runtime:

```ts
const service = new SystemdService({
  name: "backup-db",
  service: {
    Type: "oneshot",
    ExecStart: "/usr/bin/true",
  },
});

const timer = new SystemdTimer({
  name: "backup-db",
  timer: {
    OnCalendar: "daily",
  },
  install: {
    WantedBy: "timers.target",
  },
});

const systemd = new Systemd({ scope: "user" });
await systemd.install(service, timer);
await systemd.enable(timer);
```
