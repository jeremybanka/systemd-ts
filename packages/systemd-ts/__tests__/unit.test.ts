import { describe, expect, test } from "vite-plus/test";

import { Systemd, SystemdService, SystemdTimer } from "../src/index.ts";

describe(`systemd-ts unit`, () => {
  test(`renders a service unit`, () => {
    const service = new SystemdService({
      name: `backup-db`,
      unit: {
        Description: `Back up the database`,
      },
      service: {
        Type: `oneshot`,
        ExecStart: `/usr/bin/env node /srv/app/backup.mjs`,
      },
      install: {
        WantedBy: `multi-user.target`,
      },
    });

    expect(service.filename).toBe(`backup-db.service`);
    expect(service.render()).toContain(`[Service]`);
    expect(service.render()).toContain(`ExecStart=/usr/bin/env node /srv/app/backup.mjs`);
  });

  test(`renders a timer unit`, () => {
    const timer = new SystemdTimer({
      name: `backup-db`,
      timer: {
        OnCalendar: `daily`,
        Persistent: true,
        Unit: `backup-db.service`,
      },
      install: {
        WantedBy: `timers.target`,
      },
    });

    expect(timer.filename).toBe(`backup-db.timer`);
    expect(timer.render()).toContain(`[Timer]`);
    expect(timer.render()).toContain(`Unit=backup-db.service`);
    expect(timer.render()).toContain(`Persistent=true`);
  });

  test(`tracks implicit and explicit timer attachment targets`, () => {
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });
    const implicitTimer = new SystemdTimer({
      name: `backup-db`,
      timer: {
        OnCalendar: `daily`,
      },
    });
    const explicitTimer = new SystemdTimer({
      name: `nightly-backup`,
      timer: {
        OnCalendar: `daily`,
        Unit: service.filename,
      },
    });

    expect(implicitTimer.targetUnit).toBe(`backup-db.service`);
    expect(implicitTimer.targetServiceName).toBe(`backup-db`);
    expect(explicitTimer.targetUnit).toBe(`backup-db.service`);
    expect(explicitTimer.targetServiceName).toBe(`backup-db`);
  });

  test(`keeps unit definitions immutable`, () => {
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/env node /srv/app/backup.mjs`,
      },
    });

    expect(Object.isFrozen(service)).toBe(true);
    expect(Object.isFrozen(service.service)).toBe(true);
  });

  test(`rejects non-absolute exec paths`, () => {
    const service = new SystemdService({
      name: `bad-service`,
      service: {
        ExecStart: `node scripts/run.mjs`,
      },
    });

    expect(() => service.render()).toThrow(/absolute executable path/u);
  });

  test(`defaults system scope to the canonical unit directory`, () => {
    expect(new Systemd().unitDir).toBe(`/etc/systemd/system`);
  });
});

function assertTypeRelationships(): void {
  const systemd = new Systemd({
    unitDir: `/tmp/systemd-ts-typecheck`,
  });
  const attachedService = new SystemdService({
    name: `backup-db`,
    service: {
      ExecStart: `/usr/bin/true`,
    },
  });
  const attachedTimer = new SystemdTimer({
    name: `nightly-backup`,
    timer: {
      OnCalendar: `daily`,
      Unit: attachedService.filename,
    },
  });
  const implicitTimer = new SystemdTimer({
    name: `backup-db`,
    timer: {
      OnCalendar: `daily`,
    },
  });
  const mismatchedService = new SystemdService({
    name: `cleanup-db`,
    service: {
      ExecStart: `/usr/bin/true`,
    },
  });

  void systemd.install(attachedService, attachedTimer);
  void systemd.install(attachedService, implicitTimer);

  // @ts-expect-error mismatched timers and services should be rejected when both are present
  void systemd.install(mismatchedService, attachedTimer);
}

void assertTypeRelationships;
