# systemd-ts

## 0.3.2

### Patch Changes

- a282877: Ship published source files and JavaScript sourcemaps in the package tarball so downstream debugging can resolve bundled code back to the original TypeScript modules.

## 0.3.1

### Patch Changes

- 905d4e8: Export reusable sandbox harness plumbing from `systemd-ts/test`, including
  `sandboxSystemd()`, `isolatedSandboxSystemd()`, and guest command executors.

## 0.3.0

### Minor Changes

- 280fe6d: Added a new public `Systemctl` client for argv-first `systemctl` execution and typed query helpers.

  ```ts
  const systemctl = new Systemctl({ scope: `user` });

  await systemctl.start(`backup-db.service`);
  await systemctl.showServiceStatus(`backup-db.service`);
  await systemctl.listTimers({ all: true });
  await systemctl.isSystemRunning();
  ```

  The new client includes typed helpers for service status, timer listing, unit enablement and runtime state checks, and common lifecycle commands such as `start()`, `stop()`, `restart()`, `enable()`, `disable()`, `link()`, `resetFailed()`, and `daemonReload()`.

- 8759967: Added a new `systemd.ts` application-owned upkeep layer for reconciling managed unit sets from TypeScript.

  ```ts
  const systemd = new Systemd({
    scope: `user`,
    unitDir: join(homedir(), `.config/systemd/user`),
    linkUnits: true,
  });

  const result = await systemd.ts.reattach([service, timer], {
    owner: `com.example.backup-db`,
    enable: true,
    start: true,
    prune: true,
  });
  ```

  This new namespace introduces manifest-backed `attach()`, `detach()`, and `reattach()` workflows intended for desktop apps, self-updating agents, and other code-managed service setups. The package README now leads with this higher-level upkeep model, while the lower-level `Systemd` materialization and lifecycle flow remains documented in a dedicated subsection for direct `systemd` usage.

### Patch Changes

- 280fe6d: Hardened command execution by removing the remaining internal shell-wrapped `systemctl` and `systemd-notify` paths.

  ```ts
  const result = await notify.ready({
    executor,
    socketPath: `/run/systemd/notify`,
    status: `ready`,
  });
  ```

  Custom executors may now receive structured execution options, including environment overrides, so notification delivery and systemd diagnostics can be invoked directly without composing `bash -lc` command strings.

## 0.2.0

### Minor Changes

- f34e844: **Breaking change:** Change the public API from throw-based control flow to `Result` unions for normal failures. `Systemd.materialize()`, `enable()`, `start()`, `logs()`, `notify.ready()`, and `notify.watchdog()` now return `{ ok: true, value } | { ok: false, error }` instead of rejecting for expected operation failures.

  ```ts
  const started = await systemd.start(service);

  if (!started.ok) {
    console.error(started.error.code, started.error.message);
  } else {
    console.log(started.value.activeState);
  }
  ```

  `SystemdService.render()`, `SystemdTimer.render()`, and executable rendering helpers now follow the same pattern instead of throwing for invalid exec directives or executable inference failures.

- 5802e13: **Breaking change:** Rename `Systemd.install()` to `Systemd.materialize()`. As part of that rename, the `installed` property on the result is now named `materialized`.

  ```ts
  // Old way
  const result = await systemd.install(service, timer);
  result.installed;

  // New way
  const result = await systemd.materialize(service, timer);
  result.materialized;
  ```

- f34e844: **Breaking change:** Rename result-shaped success types and simplify materialization path access. `SystemdMaterializeResult` is now `SystemdMaterialization`, `StartResult` is now `StartStatus`, and `CommandResult` is now `CommandOutput`.

  ```ts
  const materialized = await systemd.materialize(service);
  if (materialized.ok) {
    materialized.value.materialized[0]?.path;
    systemd.pathFor(service);
  }
  ```

  As part of this cleanup, the materialization object no longer exposes a `pathFor(unit)` lookup method. Use the `materialized` entries on the returned value, or call `systemd.pathFor(unit)` on the configured `Systemd` instance instead.

  `materialize()` also no longer raises a runtime error for mismatched timer and service groups. That relationship is left to the type system, so runtime materialization now proceeds when the inputs are otherwise valid.

- f34e844: Add named error exports for the library’s public failure modes so callers can branch on stable types instead of parsing generic `Error` messages. The package now exports `SystemdTsError` plus errors such as `InvalidExecDirectiveError`, `NoUnitsProvidedError`, `UnitMaterializationError`, `UnitEnableError`, `UnitStartError`, `UnitLogsReadError`, `NotifySendError`, and `ExecutableInferenceError`.

  ```ts
  const logs = await systemd.logs(service);
  if (!logs.ok && logs.error instanceof UnitLogsReadError) {
    console.error(logs.error.reason);
  }
  ```

- 4fa7279: **Breaking change:** Remove the deprecated `UnitSection` export.
- f34e844: Add rich failure metadata for operational errors. `UnitStartError` now includes best-effort diagnostics from `systemctl show` and `systemctl status`, while `UnitLogsReadError`, `NotifySendError`, and `UnitMaterializationError` expose structured `reason` fields. Command-backed errors such as `UnitEnableError`, `UnitStartError`, `UnitLogsReadError`, and `NotifySendError` also expose `environmentReason` to distinguish cases like a missing `systemctl`, a permission problem, or an unavailable systemd manager.

  ```ts
  const started = await systemd.start(service);
  if (!started.ok) {
    console.log(started.error.environmentReason);
    console.log(started.error.diagnostics?.showStatus?.result);
  }
  ```

## 0.1.1

### Patch Changes

- 4da8250: Reformed the directive typings and JSDoc in `types.ts` so the built-in systemd directives are modeled more precisely and documented from cached systemd v260.1 manpages.

  For example, timer booleans such as `Persistent` and `WakeSystem` are now plain booleans instead of broad scalar unions, and repeatable directives such as `OnCalendar` are represented as repeated directive lines rather than generic scalar arrays.

- afa0126: Expanded the package README to show a practical user-scoped service and timer installation flow.
- 4da8250: Simplified the remaining convenience typings around executable and resource-limit directives, and cleaned up the generated documentation vocabulary for spellcheck.

  For example, `ExecStart` now uses the simpler `ExecDirective` command model while `ExecPaths` is typed as a path list instead of an executable command, and process resource limits now promote values like `"infinity"` and `soft:hard` in editor completions.

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
