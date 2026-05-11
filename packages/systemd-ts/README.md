# systemd-ts

`systemd-ts` is a library for declaring, rendering, and managing `systemd`
services and timers from TypeScript.

## Usage

The example below materializes a user-scoped service and timer for a small
nightly backup job. The service does the work, the timer schedules it, and
`Systemd` writes both unit files before enabling and starting the timer.

```ts
import { homedir } from "node:os";
import { join } from "node:path";

import { Systemd, SystemdService, SystemdTimer } from "systemd-ts";

const userUnitDir = join(homedir(), ".config/systemd/user");

const service = new SystemdService({
  name: "backup-db",
  unit: {
    Description: "Write a nightly database backup",
  },
  service: {
    Type: "oneshot",
    ExecStart: "/usr/bin/bash -lc '/srv/app/bin/backup-db >> /srv/app/log/backup-db.log 2>&1'",
  },
});

const timer = new SystemdTimer({
  name: "backup-db",
  unit: {
    Description: "Run the database backup every night",
  },
  timer: {
    OnCalendar: "03:15",
    Persistent: true,
    Unit: service.filename,
  },
  install: {
    WantedBy: "timers.target",
  },
});

const systemd = new Systemd({
  scope: "user",
  unitDir: userUnitDir,
  linkUnits: true,
});

const materialized = await systemd.materialize(service, timer);
if (!materialized.ok) {
  throw materialized.error;
}

console.log(systemd.pathFor(service));
console.log(systemd.pathFor(timer));
console.log(materialized.value.materialized);

const enabled = await systemd.enable(timer);
if (!enabled.ok) {
  throw enabled.error;
}

const started = await systemd.start(timer);
if (!started.ok) {
  throw started.error;
}
```

That will materialize `backup-db.service` and `backup-db.timer` into the user's
unit directory, enable the timer under `timers.target`, and ask `systemd --user`
to start waiting for the first scheduled run.
