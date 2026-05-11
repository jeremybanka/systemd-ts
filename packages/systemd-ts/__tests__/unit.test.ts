import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, test } from "vite-plus/test";

import {
  Executable,
  ExecutableInferenceError,
  InvalidExecDirectiveError,
  Internal,
  NoUnitsProvidedError,
  NotifySendError,
  Systemd,
  SystemdService,
  SystemdTimer,
  UnitEnableError,
  UnitLogsReadError,
  UnitMaterializationError,
  UnitStartError,
  notify,
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
    const rendered = service.render();
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) {
      throw rendered.error;
    }
    expect(rendered.value).toContain(`[Service]`);
    expect(rendered.value).toContain(`ExecStart=/usr/bin/env node /srv/app/backup.mjs`);
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
    const rendered = timer.render();
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) {
      throw rendered.error;
    }
    expect(rendered.value).toContain(`[Timer]`);
    expect(rendered.value).toContain(`Unit=backup-db.service`);
    expect(rendered.value).toContain(`Persistent=true`);
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

    expect(service.render()).toMatchObject({
      ok: false,
      error: expect.any(InvalidExecDirectiveError),
    });
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

    const rendered = service.render();
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) {
      throw rendered.error;
    }
    expect(rendered.value).toContain(`ExecStart=!!:/usr/bin/env node /srv/app/start.mjs`);
    expect(rendered.value).toContain(`ExecStartPre=-!@/usr/bin/printf preparing`);
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

    const rendered = service.render();
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) {
      throw rendered.error;
    }
    expect(rendered.value).toContain(
      `ExecStart='/usr/local/bin/node' '/srv/app/jobs/backup.ts' '--flag' 'value'`,
    );
  });

  test(`wraps unexpected render failures in an executable inference error with cause`, () => {
    const cause = new Error(`boom`);
    const rendered = Internal.renderUnitFile([
      [
        `Service`,
        {
          ExecStart: {
            toString() {
              throw cause;
            },
          },
        },
      ],
    ]);

    expect(rendered).toMatchObject({
      ok: false,
      error: expect.any(ExecutableInferenceError),
    });
    if (rendered.ok) {
      throw new Error(`Expected renderUnitFile() to fail`);
    }
    expect(rendered.error.cause).toBe(cause);
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

    expect(await systemd.materialize()).toMatchObject({
      ok: false,
      error: expect.any(NoUnitsProvidedError),
    });
    expect(await systemd.enable()).toMatchObject({
      ok: false,
      error: expect.any(NoUnitsProvidedError),
    });
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
    expect(await systemd.materialize(service, timer)).toMatchObject({
      ok: true,
      value: {
        directory: `/tmp/systemd-ts-mismatch`,
      },
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
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`Expected materialize() to succeed`);
    }
    expect(result.value.materialized).toHaveLength(1);
    expect(result.value.materialized[0]?.unit).toBe(backup);
    expect(result.value.materialized[0]?.path).toBe(systemd.pathFor(backup));
  });

  test(`reports a structured reason when systemctl status logging fails`, async () => {
    const systemd = new Systemd({
      executor: async () => {
        throw new Error(`status exploded`);
      },
      unitDir: `/tmp/systemd-ts-logs`,
    });
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });

    const logs = await systemd.logs(service);
    expect(logs).toMatchObject({
      ok: false,
      error: {
        reason: `status-command-failed`,
      } satisfies Partial<UnitLogsReadError>,
    });
  });

  test(`classifies invalid unit directories during materialization`, async () => {
    const fixtureDir = await mkdtemp(join(tmpdir(), `systemd-ts-invalid-unit-dir-`));
    const unitDir = join(fixtureDir, `not-a-directory`);
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });

    try {
      await writeFile(unitDir, `occupied`, `utf8`);
      const systemd = new Systemd({ unitDir });
      const result = await systemd.materialize(service);

      expect(result).toMatchObject({
        ok: false,
        error: {
          reason: `invalid-unit-directory`,
          unitPath: unitDir,
        } satisfies Partial<UnitMaterializationError>,
      });
    } finally {
      await rm(fixtureDir, { force: true, recursive: true });
    }
  });

  test(`classifies missing systemctl as an environment dependency error`, async () => {
    const systemd = new Systemd({
      executor: async () => {
        throw Object.assign(new Error(`spawn systemctl ENOENT`), { code: `ENOENT` });
      },
      unitDir: `/tmp/systemd-ts-enable`,
    });
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });

    const enabled = await systemd.enable(service);
    expect(enabled).toMatchObject({
      ok: false,
      error: {
        environmentReason: `missing-command`,
      } satisfies Partial<UnitEnableError>,
    });
  });

  test(`classifies unavailable systemd managers during start`, async () => {
    const systemd = new Systemd({
      executor: async (_command, args) => {
        if (args.includes(`daemon-reload`)) {
          throw Object.assign(new Error(`Failed to connect to bus`), {
            code: 1,
            stderr: `Failed to connect to bus: No medium found`,
          });
        }

        return { stdout: ``, stderr: `` };
      },
      unitDir: `/tmp/systemd-ts-start`,
    });
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });

    const started = await systemd.start(service);
    expect(started).toMatchObject({
      ok: false,
      error: {
        environmentReason: `manager-unavailable`,
        stage: `daemon-reload`,
      } satisfies Partial<UnitStartError>,
    });
  });

  test(`reports a structured reason when notify executor delivery fails`, async () => {
    const result = await notify.ready({
      executor: async () => {
        throw Object.assign(new Error(`notify exploded`), { code: `ENOENT` });
      },
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        environmentReason: `missing-command`,
        reason: `executor-failed`,
      } satisfies Partial<NotifySendError>,
    });
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
