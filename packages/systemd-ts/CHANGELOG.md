# systemd-ts

## 0.1.0

### Minor Changes

- 8104376: Add the core `systemd-ts` unit model around immutable unit definitions plus a stateful `Systemd` facade.

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

- 8104376: Export public test utilities at `systemd-ts/test` and back them with a real Linux `systemd --user` integration harness.

  For example, consumers can reuse the same test-host helpers the package uses internally:

  ```ts
  import { ensureTestHost, createTestSandbox } from "systemd-ts/test";

  await ensureTestHost();
  await createTestSandbox("my integration test");
  ```

  The package test suite now proves install, enable, oneshot start, timer-driven activation, log access, and notify/watchdog signaling against a real user manager.

- 8104376: Add `Executable`, `defineExecutable()`, and `notify` helpers for TypeScript-native service entrypoints and `sd_notify` integration.

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

### Patch Changes

- 8104376: Replace broad section buckets with explicit `SystemdUnitSection`, `SystemdInstallSection`, `SystemdServiceSection`, and `SystemdTimerSection` interfaces derived from the `systemd` manuals.

  This makes misspelled directives fail at construction time. For example, this is now a type error:

  ```ts
  new SystemdTimer({
    name: "backup-db",
    timer: {
      OnCalendar: "daily",
      Persistant: true, // ❌ TS2322: Type 'true' is not assignable to type 'never'.
    },
  });
  ```

  The same work also restores compile-time rejection for mismatched service/timer installs when both units are present together.

- 8104376: Add JSDoc across the main public API and broaden executable-directive validation beyond just `ExecStart`.

  For example, executable-valued directives such as `ExecCondition`, `ExecStartPre`, `ExecStop`, and `ExecReload` now follow the same absolute-runtime validation rules as `ExecStart`, and the public classes and helpers now document their behavior directly in editor tooltips.

- 98b2be5: Fix `Exec*` absolute-path validation so documented systemd exec prefixes are accepted before the executable path check.

  For example, rendering a service with `ExecStart: "-@/usr/bin/env custom-argv0 node /srv/app/start.mjs"` now succeeds instead of throwing an absolute-path validation error just because the command starts with `-@` instead of `/`.
