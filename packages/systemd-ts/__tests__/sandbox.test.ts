import { chmod, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { Logger, type Chronicle } from "takua";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test";

import {
  Executable,
  Systemd,
  SystemdService,
  SystemdTimer,
  UnitLogsReadError,
  UnitStartError,
  notify,
  type CommandOutput,
} from "../src/main/index.ts";
import { ensureTestHost, runGuestCommand, runIsolatedGuestCommand } from "../src/test/host.ts";
import {
  createTestSandbox,
  destroyCurrentTestSandbox,
  useCurrentTestSandbox,
} from "../src/test/sandbox.ts";

const materializeTestName = `materializes a user service and timer into an isolated systemd sandbox`;
const guestExecutableFixturePath = fileURLToPath(
  new URL(`./fixtures/guest-executable-fixture.sh`, import.meta.url),
);
const chronicleLogger = new Logger({ colorEnabled: false });
let chronicle: Chronicle | undefined;

beforeAll(async () => {
  await chmod(guestExecutableFixturePath, 0o755);
  await ensureTestHost();
}, 45_000);

beforeEach(async (context) => {
  chronicle = chronicleLogger.makeChronicle({ inline: false });
  chronicle.mark(`beforeEach:start`);

  await createTestSandbox(context.task.name);

  chronicle.mark(`beforeEach:sandbox-ready`);
});

afterEach(async () => {
  chronicle?.mark(`afterEach:start`);

  await destroyCurrentTestSandbox();

  chronicle?.mark(`afterEach:sandbox-destroyed`);
  chronicle?.logMarks();
  chronicle = undefined;
});

describe(`systemd-ts sandbox`, () => {
  test(materializeTestName, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    chronicle?.mark(`test:start`);

    const service = new SystemdService({
      name: sandbox.namePrefix,
      unit: {
        Description: `Write a marker file`,
      },
      service: {
        Type: `oneshot`,
        ExecStart: `/usr/bin/bash -lc 'echo installed > ${sandbox.workDir}/marker.txt'`,
      },
      install: {
        WantedBy: `default.target`,
      },
    });
    const timer = new SystemdTimer({
      name: sandbox.namePrefix,
      timer: {
        OnCalendar: `hourly`,
        Persistent: true,
        Unit: service.filename,
      },
      install: {
        WantedBy: `timers.target`,
      },
    });
    chronicle?.mark(`test:definitions-ready`);

    const result = await systemd.materialize(service, timer);
    chronicle?.mark(`test:materialize-finished`);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }

    expect(result.value.directory).toBe(sandbox.linkedUnitDir);
    const servicePath = systemd.pathFor(service);
    const timerPath = systemd.pathFor(timer);
    expect(servicePath).toBe(`${sandbox.linkedUnitDir}/${sandbox.namePrefix}.service`);
    expect(timerPath).toBe(`${sandbox.linkedUnitDir}/${sandbox.namePrefix}.timer`);
    expect(sandbox.namePrefix).toContain(`systemd-ts-`);

    const guestFiles = await runGuestCommand(
      `test -f '${servicePath}' && test -f '${timerPath}' && echo ok`,
    );
    chronicle?.mark(`test:guest-path-check-finished`);
    expect(guestFiles).toContain(`ok`);

    expect(result.value.materialized).toContainEqual({ path: servicePath, unit: service });
    expect(result.value.materialized).toContainEqual({ path: timerPath, unit: timer });

    const materializedService = await readFile(servicePath, `utf8`);
    const materializedTimer = await readFile(timerPath, `utf8`);
    chronicle?.mark(`test:host-read-finished`);

    expect(materializedService).toContain(`[Service]`);
    expect(materializedService).toContain(
      `ExecStart=/usr/bin/bash -lc 'echo installed > ${sandbox.workDir}/marker.txt'`,
    );
    expect(materializedTimer).toContain(`[Timer]`);
    expect(materializedTimer).toContain(`Persistent=true`);
    chronicle?.mark(`test:assertions-finished`);
  });

  test(`enables a timer so it is wanted by timers.target in the sandbox`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const timer = new SystemdTimer({
      name: sandbox.namePrefix,
      unit: {
        Description: `Enable me`,
      },
      timer: {
        OnCalendar: `hourly`,
        Persistent: true,
        Unit: `${sandbox.namePrefix}.service`,
      },
      install: {
        WantedBy: `timers.target`,
      },
    });

    const materialized = await systemd.materialize(timer);
    expect(materialized.ok).toBe(true);
    const enabled = await systemd.enable(timer);
    expect(enabled).toEqual({ ok: true, value: undefined });

    const systemdStatus = await runGuestCommand(
      `systemctl --user is-enabled ${shellQuote(timer.filename)}`,
    );
    expect(systemdStatus).toContain(`enabled`);

    const wantsLink = await runGuestCommand(
      `readlink -f "$HOME/.config/systemd/user/timers.target.wants/${timer.filename}"`,
    );
    expect(wantsLink.trim()).toBe(systemd.pathFor(timer));
  });

  test(`rejects start when the unit was never materialized into the sandbox`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        ExecStart: `/usr/bin/true`,
      },
    });

    expect(await systemd.start(service)).toMatchObject({
      ok: false,
      error: {
        command: `systemctl`,
        stage: `link`,
        unitName: service.filename,
      } satisfies Partial<UnitStartError>,
    });
  });

  test(`runs an executable-backed service command inside the sandbox`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const markerFile = `${sandbox.workDir}/executable-marker.txt`;
    const executable = new Executable({
      modulePath: guestExecutableFixturePath,
      runtimeEntrypoint: `/usr/bin/bash`,
    });
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        Environment: `SYSTEMD_TS_MARKER_FILE=${markerFile}`,
        ExecStart: executable,
      },
    });

    const result = await systemd.materialize(service);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }
    const materializedService = await readFile(systemd.pathFor(service), `utf8`);
    const execStart = executable.toExecStart();
    expect(execStart.ok).toBe(true);
    if (!execStart.ok) {
      throw execStart.error;
    }

    expect(materializedService).toContain(`ExecStart=${execStart.value}`);
    expect(materializedService).toContain(`Environment=SYSTEMD_TS_MARKER_FILE=${markerFile}`);
    expect(
      await runGuestCommand(`test -x ${shellQuote(executable.runtimeEntrypoint)} && echo ok`),
    ).toContain(`ok`);

    await runGuestCommand(
      `SYSTEMD_TS_MARKER_FILE=${shellQuote(markerFile)} ${execStart.value}`,
    );

    expect(await runGuestCommand(`cat ${shellQuote(markerFile)}`)).toBe(`ran`);
  });

  test(`starts a oneshot service and observes successful completion`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const markerFile = `${sandbox.workDir}/start-marker.txt`;
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        ExecStart: `/usr/bin/bash -lc 'echo started > ${markerFile}'`,
      },
    });

    expect(await systemd.materialize(service)).toMatchObject({ ok: true });
    const started = await systemd.start(service);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      throw started.error;
    }

    expect((await runGuestCommand(`cat ${shellQuote(markerFile)}`)).trim()).toBe(`started`);
    expect(started.value.unit).toBe(service.filename);
    expect(started.value.result).toBe(`success`);
    expect(started.value.activeState).toBe(`inactive`);
    expect(started.value.subState).toBe(`dead`);
    expect(started.value.execMainStatus).toBe(0);
  });

  test(`rejects start when a oneshot service exits non-zero and leaves failure details inspectable`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        ExecStart: `/usr/bin/bash -lc 'echo sandbox-failure >&2; exit 17'`,
      },
    });

    expect(await systemd.materialize(service)).toMatchObject({ ok: true });
    const started = await systemd.start(service);
    expect(started).toMatchObject({
      ok: false,
      error: {
        command: `systemctl`,
        stage: `start`,
        unitName: service.filename,
      } satisfies Partial<UnitStartError>,
    });
    if (started.ok) {
      throw new Error(`Expected start() to fail`);
    }
    expect(started.error.diagnostics?.showStatus?.unit).toBe(service.filename);
    expect(started.error.diagnostics?.showStatus?.activeState).toBe(`failed`);
    expect(started.error.diagnostics?.showStatus?.subState).toBe(`failed`);
    expect(started.error.diagnostics?.showStatus?.result).toBe(`exit-code`);
    expect(started.error.diagnostics?.showStatus?.execMainStatus).toBe(17);
    expect(started.error.diagnostics?.statusOutput).toContain(service.filename);

    const status = parseSystemctlShow(
      await runGuestCommand(
        `systemctl --user show ${shellQuote(service.filename)} --property=Id,ActiveState,SubState,Result,ExecMainStatus`,
      ),
    );

    expect(status[`Id`]).toBe(service.filename);
    expect(status[`ActiveState`]).toBe(`failed`);
    expect(status[`SubState`]).toBe(`failed`);
    expect(status[`Result`]).toBe(`exit-code`);
    expect(parseNumber(status[`ExecMainStatus`])).toBe(17);
  });

  test(`reads recent journald output for a managed unit`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const logLine = `sandbox-log-${sandbox.id}`;
    const logFile = `${sandbox.workDir}/service.log`;
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        StandardOutput: `append:${logFile}`,
        ExecStart: `/usr/bin/bash -lc 'echo ${logLine}'`,
      },
    });

    expect(await systemd.materialize(service)).toMatchObject({ ok: true });
    expect(await systemd.start(service)).toMatchObject({ ok: true });

    const logs = await systemd.logs(service, { lines: 20 });
    expect(logs.ok).toBe(true);
    if (!logs.ok) {
      throw logs.error;
    }
    expect(logs.value).toContain(logLine);
  });

  test(`surfaces failed unit status through logs() after start rejection`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        ExecStart: `/usr/bin/bash -lc 'echo failed-log-line >&2; exit 23'`,
      },
    });

    expect(await systemd.materialize(service)).toMatchObject({ ok: true });
    expect(await systemd.start(service)).toMatchObject({
      ok: false,
      error: {
        command: `systemctl`,
        stage: `start`,
        unitName: service.filename,
      } satisfies Partial<UnitStartError>,
    });

    const logs = await systemd.logs(service, { lines: 20 });
    expect(logs.ok).toBe(true);
    if (!logs.ok) {
      throw logs.error;
    }
    expect(logs.value).toContain(service.filename);
    expect(logs.value).toContain(`failed`);
    expect(logs.value).toContain(`23`);
  });

  test(`wraps missing file-backed logs in a named error`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const missingLogFile = `${sandbox.workDir}/missing.log`;
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        StandardOutput: `append:${missingLogFile}`,
        ExecStart: `/usr/bin/true`,
      },
    });

    expect(await systemd.logs(service)).toMatchObject({
      ok: false,
      error: {
        reason: `missing-log-file`,
        stage: `read-log-file`,
        unitName: service.filename,
        unitPath: missingLogFile,
      } satisfies Partial<UnitLogsReadError>,
    });
  });

  test(`signals READY=1 from a notify service process`, () => {
    const sandbox = useCurrentTestSandbox();
    const socketPath = `/tmp/systemd-ts-ready-${sandbox.id}.sock`;
    const outputPath = `/tmp/systemd-ts-ready-${sandbox.id}.txt`;
    return (async () => {
      await startNotifyCapture(socketPath, outputPath);
      const result = await notify.ready({
        executor: guestCommandExecutor,
        socketPath,
        status: `ready-status`,
      });
      expect(result).toEqual({ ok: true, value: undefined });

      const payload = await waitForNotifyPayload(outputPath);
      expect(payload).toContain(`READY=1`);
      expect(payload).toContain(`STATUS=ready-status`);
    })();
  });

  test(`signals watchdog heartbeats for a service with WatchdogSec configured`, () => {
    const sandbox = useCurrentTestSandbox();
    const socketPath = `/tmp/systemd-ts-watchdog-${sandbox.id}.sock`;
    const outputPath = `/tmp/systemd-ts-watchdog-${sandbox.id}.txt`;
    return (async () => {
      await startNotifyCapture(socketPath, outputPath);
      const result = await notify.watchdog({
        executor: guestCommandExecutor,
        pid: 1234,
        socketPath,
        status: `watchdog-status`,
      });
      expect(result).toEqual({ ok: true, value: undefined });

      const payload = await waitForNotifyPayload(outputPath);
      expect(payload).toContain(`WATCHDOG=1`);
      expect(payload).toContain(`STATUS=watchdog-status`);
      expect(payload).toContain(`MAINPID=1234`);
    })();
  });

  test(`materializes, enables, and runs a timer-driven service end to end`, async () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = isolatedSandboxSystemd();
    chronicle?.mark(`timer:start`);
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        Type: `oneshot`,
        ExecStart: `/usr/bin/true`,
      },
    });
    const timer = new SystemdTimer({
      name: sandbox.namePrefix,
      timer: {
        OnActiveSec: `1s`,
        Unit: service.filename,
      },
      install: {
        WantedBy: `timers.target`,
      },
    });
    chronicle?.mark(`timer:definitions-ready`);

    expect(await systemd.materialize(service, timer)).toMatchObject({ ok: true });
    chronicle?.mark(`timer:materialize-finished`);
    expect(await systemd.enable(timer)).toEqual({ ok: true, value: undefined });
    chronicle?.mark(`timer:enable-finished`);
    const started = await systemd.start(timer);
    chronicle?.mark(`timer:start-finished`);
    expect(started.ok).toBe(true);
    if (!started.ok) {
      throw started.error;
    }

    expect(started.value.unit).toBe(timer.filename);
    expect(started.value.activeState).toBe(`active`);
    expect(started.value.subState).toBe(`waiting`);
    const triggered = await waitForTimerTrigger(timer, service);
    expect(triggered.timerResult).toBe(`success`);
    expect(triggered.serviceResult).toBe(`success`);
    expect(triggered.execMainStatus).toBe(0);
    chronicle?.mark(`timer:marker-observed`);

    await runIsolatedGuestCommand(
      `systemctl --user stop ${shellQuote(timer.filename)} ${shellQuote(service.filename)} || true
systemctl --user disable ${shellQuote(timer.filename)} || true
systemctl --user reset-failed ${shellQuote(service.filename)} || true`,
    );
    chronicle?.mark(`timer:manual-cleanup-finished`);
  }, 15_000);
});

function sandboxSystemd(): Systemd {
  const sandbox = useCurrentTestSandbox();
  return new Systemd({
    executor: guestCommandExecutor,
    linkUnits: true,
    scope: `user`,
    unitDir: sandbox.linkedUnitDir,
  });
}

function isolatedSandboxSystemd(): Systemd {
  const sandbox = useCurrentTestSandbox();
  return new Systemd({
    executor: isolatedGuestCommandExecutor,
    linkUnits: true,
    scope: `user`,
    unitDir: sandbox.linkedUnitDir,
  });
}

async function guestCommandExecutor(
  command: string,
  args: readonly string[],
): Promise<CommandOutput> {
  const stdout = await runGuestCommand(
    [command, ...args].map((part) => shellQuote(part)).join(` `),
  );

  return {
    stderr: ``,
    stdout,
  };
}

async function isolatedGuestCommandExecutor(
  command: string,
  args: readonly string[],
): Promise<CommandOutput> {
  const stdout = await runIsolatedGuestCommand(
    [command, ...args].map((part) => shellQuote(part)).join(` `),
  );

  return {
    stderr: ``,
    stdout,
  };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
}

async function startNotifyCapture(socketPath: string, outputPath: string): Promise<void> {
  const python = [
    `import os, pathlib, socket, sys`,
    `socket_path, output_path = sys.argv[1:3]`,
    `try:`,
    `    os.unlink(socket_path)`,
    `except FileNotFoundError:`,
    `    pass`,
    `sock = socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM)`,
    `sock.bind(socket_path)`,
    `data, _ = sock.recvfrom(4096)`,
    `pathlib.Path(output_path).write_text(data.decode("utf8"), encoding="utf8")`,
    `sock.close()`,
  ].join(`\n`);

  await runGuestCommand(
    [
      `rm -f ${shellQuote(socketPath)} ${shellQuote(outputPath)}`,
      `nohup python3 -c ${shellQuote(python)} ${shellQuote(socketPath)} ${shellQuote(outputPath)} >/dev/null 2>&1 &`,
    ].join(`\n`),
  );

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const ready = await runGuestCommand(`if [ -S ${shellQuote(socketPath)} ]; then echo ready; fi`);
    if (ready.includes(`ready`)) {
      return;
    }

    await delay(50);
  }

  throw new Error(`Timed out waiting for notify capture socket at ${socketPath}`);
}

async function waitForNotifyPayload(outputPath: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const payload = await runGuestCommand(
      `if [ -f ${shellQuote(outputPath)} ]; then cat ${shellQuote(outputPath)}; fi`,
    );
    if (payload.length > 0) {
      return payload;
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for notify payload at ${outputPath}`);
}

async function waitForTimerTrigger(
  timer: SystemdTimer,
  service: SystemdService,
): Promise<{
  readonly execMainStatus: number | undefined;
  readonly serviceResult: string;
  readonly timerResult: string;
}> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const timerShow = parseSystemctlShow(
      await runGuestCommand(
        `systemctl --user show ${shellQuote(timer.filename)} --property=LastTriggerUSec,Result,ActiveState,SubState`,
      ),
    );
    const serviceShow = parseSystemctlShow(
      await runGuestCommand(
        `systemctl --user show ${shellQuote(service.filename)} --property=Result,ExecMainStatus,ActiveState,SubState`,
      ),
    );

    const triggered =
      timerShow[`LastTriggerUSec`] !== undefined &&
      timerShow[`LastTriggerUSec`] !== `` &&
      timerShow[`LastTriggerUSec`] !== `n/a`;
    const serviceResult = serviceShow[`Result`] ?? ``;
    const execMainStatus = parseNumber(serviceShow[`ExecMainStatus`]);

    if (triggered && serviceResult === `success` && execMainStatus === 0) {
      return {
        execMainStatus,
        serviceResult,
        timerResult: timerShow[`Result`] ?? ``,
      };
    }

    await delay(100);
  }

  const timerStatus = await runIsolatedGuestCommand(
    `systemctl --user status ${shellQuote(timer.filename)} ${shellQuote(service.filename)} --no-pager --lines 20 || true`,
  );
  const timers = await runIsolatedGuestCommand(
    `systemctl --user list-timers --all --no-pager | grep ${shellQuote(timer.name)} || true`,
  );
  const show = await runIsolatedGuestCommand(
    `systemctl --user show ${shellQuote(timer.filename)} ${shellQuote(service.filename)} --property=Id,ActiveState,SubState,Result,ExecMainStatus,LastTriggerUSec,NextElapseUSecMonotonic,Triggers,TriggeredBy || true`,
  );

  throw new Error(
    [
      `Timed out waiting for ${timer.filename} to trigger ${service.filename}`,
      ``,
      `Timer status:`,
      timerStatus,
      ``,
      `Timer list:`,
      timers,
      ``,
      `Timer show:`,
      show,
    ].join(`\n`),
  );
}

function parseSystemctlShow(output: string): Record<string, string> {
  const entries = output
    .split(`\n`)
    .filter((line) => line.length > 0 && line.includes(`=`))
    .map((line) => {
      const [key, ...rest] = line.split(`=`);
      return [key, rest.join(`=`)] as const;
    });

  return Object.fromEntries(entries);
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
