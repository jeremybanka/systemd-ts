---
"systemd-ts": patch
---

Replace broad section buckets with explicit `SystemdUnitSection`, `SystemdInstallSection`, `SystemdServiceSection`, and `SystemdTimerSection` interfaces derived from the `systemd` manuals.

This makes misspelled directives fail at construction time. For example, this is now a type error:

```ts
new SystemdTimer({
  name: "backup-db",
  timer: {
    OnCalendar: "daily",
    Persistant: true,
  },
});
```

The same work also restores compile-time rejection for mismatched service/timer installs when both units are present together.
