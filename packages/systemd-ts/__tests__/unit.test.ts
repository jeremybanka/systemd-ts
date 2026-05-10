import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, test } from "vite-plus/test";

import {
  Executable,
  InvalidExecDirectiveError,
  NoUnitsProvidedError,
  Systemd,
  SystemdService,
  SystemdTimer,
} from "../src/main/index.ts";

const execFileAsync = promisify(execFile);

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

    expect(() => service.render()).toThrow(InvalidExecDirectiveError);
  });

  test(`accepts absolute exec paths with documented systemd prefixes`, () => {
    const service = new SystemdService({
      name: `prefixed-service`,
      service: {
        ExecCondition: `-/usr/bin/test -f /etc/prefixed-service.conf`,
        ExecReload: `@/usr/bin/env custom-argv0 node /srv/app/reload.mjs`,
        ExecStart: `!!:/usr/bin/env node /srv/app/start.mjs`,
        ExecStartPre: `-!@/usr/bin/printf preparing`,
        ExecStop: `+:@/usr/bin/env node /srv/app/stop.mjs`,
      },
    });

    expect(() => service.render()).not.toThrow();
    expect(service.render()).toContain(`ExecStart=!!:/usr/bin/env node /srv/app/start.mjs`);
    expect(service.render()).toContain(`ExecStartPre=-!@/usr/bin/printf preparing`);
  });

  test(`defaults system scope to the canonical unit directory`, () => {
    expect(new Systemd().unitDir).toBe(`/etc/systemd/system`);
  });

  test(`renders ExecStart from an executable helper`, () => {
    const executable = new Executable({
      args: [`--flag`, `value`],
      modulePath: `/srv/app/jobs/backup.ts`,
      runtimeEntrypoint: `/usr/local/bin/node`,
    });
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: executable,
      },
    });

    expect(service.render()).toContain(
      `ExecStart='/usr/local/bin/node' '/srv/app/jobs/backup.ts' '--flag' 'value'`,
    );
  });

  test(`defineExecutable runs the current module when executed directly`, async () => {
    const fixtureDir = await mkdtemp(join(tmpdir(), `systemd-ts-executable-`));
    const markerFile = join(fixtureDir, `marker.txt`);
    const moduleFile = new URL(`./fixtures/executable-fixture.ts`, import.meta.url);

    try {
      await execFileAsync(process.execPath, [moduleFile.pathname], {
        env: {
          ...process.env,
          SYSTEMD_TS_MARKER_FILE: markerFile,
        },
      });
      expect(await readFile(markerFile, `utf8`)).toBe(`ran`);
    } finally {
      await rm(fixtureDir, { force: true, recursive: true });
    }
  });

  test(`rejects empty materialize and enable operations with a named error`, async () => {
    const systemd = new Systemd({
      unitDir: `/tmp/systemd-ts-empty`,
    });

    await expect(systemd.materialize()).rejects.toBeInstanceOf(NoUnitsProvidedError);
    await expect(systemd.enable()).rejects.toBeInstanceOf(NoUnitsProvidedError);
  });

  test(`allows mismatched timer and service groups at runtime because the type system already guards this`, async () => {
    const systemd = new Systemd({
      unitDir: `/tmp/systemd-ts-mismatch`,
    });
    const service = new SystemdService({
      name: `cleanup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });
    const timer = new SystemdTimer({
      name: `nightly-backup`,
      timer: {
        OnCalendar: `daily`,
        Unit: `backup-db.service`,
      },
    });

    // @ts-expect-error mismatched timers and services are a type "warning", but not a runtime error
    await expect(systemd.materialize(service, timer)).resolves.toMatchObject({
      directory: `/tmp/systemd-ts-mismatch`,
    });
  });

  test(`reports written paths through the materialized entries and systemd.pathFor()`, async () => {
    const systemd = new Systemd({
      unitDir: `/tmp/systemd-ts-paths`,
    });
    const backup = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });
    const result = await systemd.materialize(backup);
    expect(result.materialized).toHaveLength(1);
    expect(result.materialized[0]?.unit).toBe(backup);
    expect(result.materialized[0]?.path).toBe(systemd.pathFor(backup));
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
  void systemd.materialize(attachedService, attachedTimer);
  void systemd.materialize(attachedService, implicitTimer);
  // @ts-expect-error mismatched timers and services should be rejected when both are present
  void systemd.materialize(mismatchedService, attachedTimer);

  void new SystemdTimer({
    name: `typo-timer`,
    timer: {
      OnCalendar: `daily`,
      // @ts-expect-error misspelled timer directives should be rejected
      Persistant: true,
    },
  });
}

void assertTypeRelationships;
