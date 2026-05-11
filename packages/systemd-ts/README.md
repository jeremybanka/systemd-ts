# systemd-ts

`systemd-ts` lets you work with `systemd` from TypeScript.

It is designed around a few practical jobs:

- keep application-owned units defined in `.timer` and `.service`up to date from TypeScript
- use `systemctl` from TypeScript
- define a service from TypeScript
- define a service that runs on a timer from TypeScript
- keep the code that runs the job close to the code that defines the service and timer

The library has two layers:

- `systemd.ts.*` is the code-owned upkeep layer for attaching, reattaching, and
  detaching application-managed units.
- `systemd.*` stays close to raw `systemd` concepts like materializing units and
  starting them directly.

That lets the README start from the application code story without giving up a
lower-level `systemd` surface when you want it.

It is also a good place to learn `systemd` itself. The unit directives are
deeply typed, documented in the TypeScript surface, and maintained against
versioned upstream manpage material, so the library doubles as a guided way to
explore what `systemd` can do without starting from loose strings and scattered
shell examples.

## What It Can Do

### Keep application-owned units up to date

If your application owns a service or timer and wants to keep that unit set up
to date across reinstalls, updates, or reconfiguration, use `systemd.ts`.

```ts
import { homedir } from "node:os";
import { join } from "node:path";

import backupJob from "./backup-job.ts";
import { Systemd, SystemdService, SystemdTimer } from "systemd-ts";

const systemd = new Systemd({
  scope: `user`,
  unitDir: join(homedir(), `.config/systemd/user`),
  linkUnits: true,
});

const service = new SystemdService({
  name: `backup-db`,
  service: {
    Type: `oneshot`,
    ExecStart: backupJob,
  },
});

const timer = new SystemdTimer({
  name: `backup-db`,
  timer: {
    OnCalendar: `daily`,
    Persistent: true,
    Unit: service.filename,
  },
  install: {
    WantedBy: `timers.target`,
  },
});

const attached = await systemd.ts.reattach([service, timer], {
  owner: `com.example.backup-db`,
  enable: true,
  start: true,
  prune: true,
});
if (!attached.ok) {
  throw attached.error;
}
```

This is the highest-level upkeep workflow in the library. It is designed for
desktop apps, self-updating agents, OTA-managed software, and other code-owned
service setups where the application itself is responsible for the unit set it
maintains.

### Use `systemctl` from TypeScript

If you want a typed, argv-first `systemctl` client, use `Systemctl`.

```ts
import { Systemctl } from "systemd-ts";

const systemctl = new Systemctl({ scope: `user` });

const timers = await systemctl.listTimers({ all: true });
if (!timers.ok) {
  throw timers.error;
}

const status = await systemctl.showServiceStatus(`backup-db.service`);
if (!status.ok) {
  throw status.error;
}

console.log(timers.value);
console.log(status.value);
```

This is a good fit when you already know the units you want to inspect or
control and you want to stay inside TypeScript instead of shelling out from app
code by hand.

### Define a service from TypeScript

If you want to describe a service unit in code, use `SystemdService`.

```ts
import { SystemdService } from "systemd-ts";

const service = new SystemdService({
  name: `backup-db`,
  unit: {
    Description: `Write a database backup`,
  },
  service: {
    Type: `oneshot`,
    ExecStart: `/srv/app/bin/backup-db`,
    StandardOutput: `append:/srv/app/log/backup-db.log`,
    StandardError: `append:/srv/app/log/backup-db.log`,
  },
});
```

That service can be rendered into a real unit file, materialized into a unit
directory, and then managed through `Systemd` or `Systemctl`.

### Define a service that runs on a timer

If you want a scheduled job, pair `SystemdService` with `SystemdTimer`.

```ts
import { SystemdService, SystemdTimer } from "systemd-ts";

const service = new SystemdService({
  name: `backup-db`,
  service: {
    Type: `oneshot`,
    ExecStart: `/srv/app/bin/backup-db`,
  },
});

const timer = new SystemdTimer({
  name: `backup-db`,
  unit: {
    Description: `Run the backup every night`,
  },
  timer: {
    OnCalendar: `03:15`,
    Persistent: true,
    Unit: service.filename,
  },
  install: {
    WantedBy: `timers.target`,
  },
});
```

This gives you a real `.service` plus a real `.timer`, both defined from the
same TypeScript module.

### Keep the executable close to the unit definitions

For many projects, the nicest workflow is to colocate the job entrypoint with
the service and timer that run it.

`defineExecutable()` is designed for that pattern:

```ts
import { defineExecutable } from "systemd-ts";

export default defineExecutable(async () => {
  console.log(`Writing backup...`);
});
```

Then you can use that executable directly in a service definition:

```ts
import backupJob from "./backup-job.ts";
import { SystemdService, SystemdTimer } from "systemd-ts";

const service = new SystemdService({
  name: `backup-db`,
  service: {
    Type: `oneshot`,
    ExecStart: backupJob,
  },
});

const timer = new SystemdTimer({
  name: `backup-db`,
  timer: {
    OnCalendar: `daily`,
    Unit: service.filename,
  },
  install: {
    WantedBy: `timers.target`,
  },
});
```

That keeps the scheduled code, the service definition, and the timer definition
near each other instead of scattering them across shell scripts and unit files.

## A Typical Flow

Most applications use the library in a flow like this:

1. Define a `SystemdService`
2. Optionally define a matching `SystemdTimer`
3. Reattach the desired unit set through `systemd.ts`
4. Inspect or control units directly through `Systemctl` or `Systemd` when needed

```ts
import { homedir } from "node:os";
import { join } from "node:path";

import backupJob from "./backup-job.ts";
import { Systemd, SystemdService, SystemdTimer } from "systemd-ts";

const systemd = new Systemd({
  scope: `user`,
  unitDir: join(homedir(), `.config/systemd/user`),
  linkUnits: true,
});

const service = new SystemdService({
  name: `backup-db`,
  service: {
    Type: `oneshot`,
    ExecStart: backupJob,
  },
});

const timer = new SystemdTimer({
  name: `backup-db`,
  timer: {
    OnCalendar: `daily`,
    Persistent: true,
    Unit: service.filename,
  },
  install: {
    WantedBy: `timers.target`,
  },
});

const reattached = await systemd.ts.reattach([service, timer], {
  owner: `com.example.backup-db`,
  enable: true,
  start: true,
  prune: true,
});
if (!reattached.ok) {
  throw reattached.error;
}
```

### Using The `Systemd` API Directly

If you want to stay closer to raw `systemd` operations, use the lower-level
`Systemd` methods directly:

```ts
import { homedir } from "node:os";
import { join } from "node:path";

import backupJob from "./backup-job.ts";
import { Systemd, SystemdService, SystemdTimer } from "systemd-ts";

const systemd = new Systemd({
  scope: `user`,
  unitDir: join(homedir(), `.config/systemd/user`),
  linkUnits: true,
});

const service = new SystemdService({
  name: `backup-db`,
  service: {
    Type: `oneshot`,
    ExecStart: backupJob,
  },
});

const timer = new SystemdTimer({
  name: `backup-db`,
  timer: {
    OnCalendar: `daily`,
    Persistent: true,
    Unit: service.filename,
  },
  install: {
    WantedBy: `timers.target`,
  },
});

const materialized = await systemd.materialize(service, timer);
if (!materialized.ok) {
  throw materialized.error;
}

const enabled = await systemd.enable(timer);
if (!enabled.ok) {
  throw enabled.error;
}

const started = await systemd.start(timer);
if (!started.ok) {
  throw started.error;
}
```

This lower-level flow is useful when you want exact control over
materialization, enablement, or startup behavior without going through the
code-owned upkeep layer.

## Testing Against A Real User Manager

The package also ships a `systemd-ts/test` module for integration tests that
need a real `systemd --user` environment.

Use `ensureTestHost()` to warm the test host, `createTestSandbox()` to create
an isolated unit directory, and `sandboxSystemd()` when you want a `Systemd`
instance already pointed at that sandbox.

```ts
import { afterEach, beforeAll, beforeEach, test } from "vite-plus/test";

import { SystemdService } from "systemd-ts";
import {
  createTestSandbox,
  destroyCurrentTestSandbox,
  ensureTestHost,
  sandboxSystemd,
  useCurrentTestSandbox,
} from "systemd-ts/test";

beforeAll(async () => {
  await ensureTestHost();
});

beforeEach(async (context) => {
  await createTestSandbox(context.task.name);
});

afterEach(async () => {
  await destroyCurrentTestSandbox();
});

test(`starts a service in a sandbox`, async () => {
  const sandbox = useCurrentTestSandbox();
  const systemd = sandboxSystemd();
  const markerFile = `${sandbox.workDir}/started.txt`;
  const service = new SystemdService({
    name: sandbox.namePrefix,
    service: {
      Type: `oneshot`,
      ExecStart: `/usr/bin/bash -lc 'echo started > ${markerFile}'`,
    },
  });

  const materialized = await systemd.materialize(service);
  if (!materialized.ok) {
    throw materialized.error;
  }

  const started = await systemd.start(service);
  if (!started.ok) {
    throw started.error;
  }
});
```

If you need direct executor access for helpers outside `Systemd`, the same
module also exports `guestCommandExecutor`, `isolatedGuestCommandExecutor`, and
`createGuestCommandExecutor()`.

## Explore Further

The README is meant to answer what the library is for.

If you want the exact method surface, result types, or lower-level details, the
next places to look are:

- `Systemctl` for direct `systemctl` usage from TypeScript
- `Systemd` for materialization plus unit lifecycle workflows
- `SystemdService` and `SystemdTimer` for unit definitions
- `Executable` and `defineExecutable()` for colocated runnable entrypoints
