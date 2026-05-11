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
  SystemctlCommandError,
  Systemctl,
  UnitEnableError,
  UnitLogsReadError,
  UnitMaterializationError,
  UnitStartError,
  notify,
} from "../src/main/index.ts";
import {
  createGuestCommandExecutor,
  guestCommandExecutor,
  isolatedGuestCommandExecutor,
} from "../src/test/index.ts";

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

  test(`builds scope-aware systemctl invocations directly`, async () => {
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const systemctl = new Systemctl({
      executor: async (command, args) => {
        calls.push({ command, args });
        if (args[1] === `list-timers`) {
          return {
            stdout: JSON.stringify([
              {
                next: 1778463355991577,
                left: 1778463355991577,
                last: 0,
                passed: 0,
                unit: `backup-db.timer`,
                activates: `backup-db.service`,
              },
            ]),
            stderr: ``,
          };
        }
        return { stdout: ``, stderr: `` };
      },
      scope: `user`,
    });

    await expect(systemctl.daemonReload()).resolves.toMatchObject({ ok: true });
    await expect(systemctl.enable(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(systemctl.disable(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(systemctl.link(`/tmp/backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(systemctl.start(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(systemctl.stop(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(systemctl.restart(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(systemctl.resetFailed()).resolves.toMatchObject({ ok: true });
    await expect(systemctl.resetFailed([`backup-db.service`])).resolves.toMatchObject({ ok: true });
    await expect(
      systemctl.show(`backup-db.service`, {
        properties: [`Id`, `ActiveState`],
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      systemctl.showProperties(`backup-db.service`, {
        properties: [`Id`, `Description`],
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(systemctl.showServiceStatus(`backup-db.service`)).resolves.toMatchObject({
      ok: true,
    });
    await expect(systemctl.showStatus(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(
      systemctl.listTimers({
        all: true,
        patterns: [`backup-db.timer`],
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(systemctl.isEnabled(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(
      systemctl.isEnabled(`backup-db.service`, {
        full: true,
        quiet: true,
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(systemctl.isActive(`backup-db.service`)).resolves.toMatchObject({ ok: true });
    await expect(
      systemctl.isFailed(`backup-db.service`, {
        quiet: true,
      }),
    ).resolves.toMatchObject({ ok: true });
    await expect(systemctl.isSystemRunning()).resolves.toMatchObject({ ok: true });
    await expect(systemctl.isSystemRunning({ wait: true })).resolves.toMatchObject({ ok: true });
    await expect(
      systemctl.status(`backup-db.service`, {
        lines: 20,
      }),
    ).resolves.toMatchObject({ ok: true });

    expect(calls).toEqual([
      { command: `systemctl`, args: [`--user`, `daemon-reload`] },
      { command: `systemctl`, args: [`--user`, `enable`, `backup-db.service`] },
      { command: `systemctl`, args: [`--user`, `disable`, `backup-db.service`] },
      { command: `systemctl`, args: [`--user`, `link`, `/tmp/backup-db.service`] },
      { command: `systemctl`, args: [`--user`, `start`, `backup-db.service`] },
      { command: `systemctl`, args: [`--user`, `stop`, `backup-db.service`] },
      { command: `systemctl`, args: [`--user`, `restart`, `backup-db.service`] },
      { command: `systemctl`, args: [`--user`, `reset-failed`] },
      { command: `systemctl`, args: [`--user`, `reset-failed`, `backup-db.service`] },
      {
        command: `systemctl`,
        args: [`--user`, `show`, `backup-db.service`, `--property=Id,ActiveState`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `show`, `backup-db.service`, `--property=Id,Description`],
      },
      {
        command: `systemctl`,
        args: [
          `--user`,
          `show`,
          `backup-db.service`,
          `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
        ],
      },
      {
        command: `systemctl`,
        args: [
          `--user`,
          `show`,
          `backup-db.service`,
          `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
        ],
      },
      {
        command: `systemctl`,
        args: [`--user`, `list-timers`, `--all`, `--no-pager`, `--output=json`, `backup-db.timer`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `is-enabled`, `backup-db.service`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `is-enabled`, `--full`, `--quiet`, `backup-db.service`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `is-active`, `backup-db.service`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `is-failed`, `--quiet`, `backup-db.service`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `is-system-running`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `is-system-running`, `--wait`],
      },
      {
        command: `systemctl`,
        args: [`--user`, `status`, `backup-db.service`, `--no-pager`, `--lines`, `20`],
      },
    ]);
  });

  test(`parses typed query outputs from systemctl`, async () => {
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const systemctl = new Systemctl({
      executor: async (command, args) => {
        calls.push({ command, args });
        const subcommand = args[1];
        if (subcommand === `show` && args.includes(`--property=Id,Description`)) {
          return {
            stdout: `Id=backup-db.service\nDescription=Backup DB nightly\nEmpty=\n`,
            stderr: ``,
          };
        }
        if (subcommand === `show`) {
          return {
            stdout: `Id=backup-db.service\nActiveState=inactive\nSubState=dead\nResult=success\nExecMainStatus=0\n`,
            stderr: ``,
          };
        }
        if (subcommand === `is-enabled`) {
          return { stdout: `enabled\n`, stderr: `` };
        }
        if (subcommand === `is-active`) {
          return { stdout: `active\n`, stderr: `` };
        }
        if (subcommand === `is-failed`) {
          return { stdout: `inactive\n`, stderr: `` };
        }
        if (subcommand === `is-system-running`) {
          return { stdout: `running\n`, stderr: `` };
        }

        return { stdout: ``, stderr: `` };
      },
      scope: `user`,
    });

    await expect(
      systemctl.showProperties(`backup-db.service`, {
        properties: [`Id`, `Description`],
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        Id: `backup-db.service`,
        Description: `Backup DB nightly`,
        Empty: ``,
      },
    });
    await expect(systemctl.showStatus(`backup-db.service`)).resolves.toEqual({
      ok: true,
      value: {
        unit: `backup-db.service`,
        activeState: `inactive`,
        subState: `dead`,
        result: `success`,
        execMainStatus: 0,
      },
    });
    await expect(systemctl.showServiceStatus(`backup-db.service`)).resolves.toEqual({
      ok: true,
      value: {
        unit: `backup-db.service`,
        activeState: `inactive`,
        subState: `dead`,
        result: `success`,
        execMainStatus: 0,
      },
    });
    await expect(systemctl.isEnabled(`backup-db.service`)).resolves.toEqual({
      ok: true,
      value: `enabled`,
    });
    await expect(systemctl.isActive(`backup-db.service`)).resolves.toEqual({
      ok: true,
      value: `active`,
    });
    await expect(systemctl.isFailed(`backup-db.service`)).resolves.toEqual({
      ok: true,
      value: `inactive`,
    });
    await expect(systemctl.isSystemRunning()).resolves.toEqual({
      ok: true,
      value: `running`,
    });

    expect(calls).toHaveLength(7);
  });

  test(`returns the observed typed list-timers json shape`, async () => {
    const systemctl = new Systemctl({
      executor: async (_command, args) => {
        if (args[1] === `list-timers`) {
          return {
            stdout: JSON.stringify([
              {
                next: 1778463355991577,
                left: 1778463355991577,
                last: 0,
                passed: 0,
                unit: `backup-db.timer`,
                activates: `backup-db.service`,
              },
            ]),
            stderr: ``,
          };
        }

        return { stdout: ``, stderr: `` };
      },
      scope: `user`,
    });

    await expect(
      systemctl.listTimers({
        all: true,
        patterns: [`backup-db.timer`],
      }),
    ).resolves.toEqual({
      ok: true,
      value: [
        {
          next: 1778463355991577,
          left: 1778463355991577,
          last: 0,
          passed: 0,
          unit: `backup-db.timer`,
          activates: `backup-db.service`,
        },
      ],
    });
  });

  test(`wraps systemctl execution failures in a structured Result error`, async () => {
    const systemctl = new Systemctl({
      executor: async () => {
        throw Object.assign(new Error(`spawn systemctl ENOENT`), { code: `ENOENT` });
      },
      scope: `user`,
    });

    await expect(systemctl.isActive(`missing.service`)).resolves.toMatchObject({
      ok: false,
      error: {
        operation: `is-active`,
        command: `systemctl`,
        reason: `executor-failed`,
        environmentReason: `missing-command`,
      } satisfies Partial<SystemctlCommandError>,
    });
  });

  test(`creates a guest command executor that preserves argv and env boundaries`, async () => {
    let observedScript = ``;
    const executor = createGuestCommandExecutor(async (script) => {
      observedScript = script;
      return `ok`;
    });

    await expect(
      executor(`/usr/bin/printf`, [`hello world`, `it's fine`], {
        env: {
          EMPTY: undefined,
          GREETING: `hello world`,
        },
      }),
    ).resolves.toEqual({
      stderr: ``,
      stdout: `ok`,
    });

    expect(observedScript).toBe(
      `'env' '-u' 'EMPTY' 'GREETING=hello world' '/usr/bin/printf' 'hello world' 'it'\\''s fine'`,
    );
  });

  test(`wraps guest command runner failures in command-shaped errors`, async () => {
    const executor = createGuestCommandExecutor(async () => {
      throw new Error(`guest exploded`);
    });

    await expect(executor(`/usr/bin/false`, [])).rejects.toMatchObject({
      code: 1,
      stderr: ``,
      stdout: `guest exploded`,
    });
  });

  test(`exports reusable guest executors`, () => {
    expect(typeof guestCommandExecutor).toBe(`function`);
    expect(typeof isolatedGuestCommandExecutor).toBe(`function`);
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

  test(`includes stderr when systemctl status writes diagnostics there`, async () => {
    const systemd = new Systemd({
      executor: async () => ({
        stderr: `unit not found`,
        stdout: ``,
      }),
      unitDir: `/tmp/systemd-ts-logs`,
    });
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });

    const logs = await systemd.logs(service);
    expect(logs).toEqual({
      ok: true,
      value: `unit not found`,
    });
  });

  test(`returns captured status output even when systemctl exits non-zero`, async () => {
    const systemd = new Systemd({
      executor: async () => {
        throw Object.assign(new Error(`status failed`), {
          code: 3,
          stderr: `backup-db.service - failed`,
          stdout: `Loaded: loaded (/tmp/backup-db.service; static)`,
        });
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
    expect(logs).toEqual({
      ok: true,
      value: `Loaded: loaded (/tmp/backup-db.service; static)\nbackup-db.service - failed`,
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

  test(`reports the failing link path during enable preparation`, async () => {
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });
    const systemd = new Systemd({
      executor: async (_command, args) => {
        if (args[0] === `link`) {
          throw new Error(`link exploded`);
        }

        return { stdout: ``, stderr: `` };
      },
      linkUnits: true,
      unitDir: `/tmp/systemd-ts-link`,
    });

    const enabled = await systemd.enable(service);
    expect(enabled).toMatchObject({
      ok: false,
      error: {
        stage: `link`,
        unitName: service.filename,
        unitPath: systemd.pathFor(service),
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
    const calls: Array<{
      command: string;
      args: readonly string[];
      env: Readonly<Record<string, string | undefined>> | undefined;
    }> = [];
    const result = await notify.ready({
      executor: async (command, args, options) => {
        calls.push({ args, command, env: options?.env });
        throw Object.assign(new Error(`notify exploded`), { code: `ENOENT` });
      },
      socketPath: `/tmp/systemd-ts-notify.sock`,
      status: `warming up`,
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        environmentReason: `missing-command`,
        reason: `executor-failed`,
      } satisfies Partial<NotifySendError>,
    });
    expect(calls).toEqual([
      {
        args: [`--no-block`, `READY=1`, `STATUS=warming up`],
        command: `systemd-notify`,
        env: {
          NOTIFY_SOCKET: `/tmp/systemd-ts-notify.sock`,
        },
      },
    ]);
  });

  test(`exposes the low-level systemctl client through Systemd`, async () => {
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const systemd = new Systemd({
      executor: async (command, args) => {
        calls.push({ command, args });
        return {
          stderr: ``,
          stdout:
            args[1] === `show`
              ? `Id=backup-db.service\nActiveState=active\nSubState=running\nResult=success\nExecMainStatus=0\n`
              : ``,
        };
      },
      scope: `user`,
      unitDir: `/tmp/systemd-ts-systemctl-client`,
    });
    const service = new SystemdService({
      name: `backup-db`,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });

    const started = await systemd.start(service);
    expect(started).toMatchObject({
      ok: true,
      value: {
        unit: `backup-db.service`,
        activeState: `active`,
      },
    });
    expect(systemd.systemctl).toBeInstanceOf(Systemctl);
    expect(calls).toEqual([
      { command: `systemctl`, args: [`--user`, `daemon-reload`] },
      { command: `systemctl`, args: [`--user`, `start`, `backup-db.service`] },
      {
        command: `systemctl`,
        args: [
          `--user`,
          `show`,
          `backup-db.service`,
          `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
        ],
      },
    ]);
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
