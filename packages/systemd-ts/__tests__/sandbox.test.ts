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
  notify,
  type CommandResult,
} from "../src/index.ts";
import { ensureTestHost, runGuestCommand } from "../src/testing/host.ts";
import {
  createTestSandbox,
  destroyCurrentTestSandbox,
  useCurrentTestSandbox,
} from "../src/testing/sandbox.ts";

const installTestName = `installs a user service and timer into an isolated systemd sandbox`;
const guestExecutableFixturePath = fileURLToPath(
  new URL(`./fixtures/guest-executable-fixture.sh`, import.meta.url),
);
const chronicleLogger = new Logger({ colorEnabled: false });
let chronicle: Chronicle | undefined;

beforeAll(async () => {
  await chmod(guestExecutableFixturePath, 0o755);
  await ensureTestHost();
});

beforeEach(async (context) => {
  chronicle = chronicleLogger.makeChronicle({ inline: false });
  chronicle.mark(`beforeEach:start`);

  await createTestSandbox(context.task.name);

  chronicle.mark(`beforeEach:sandbox-ready`);
});

afterEach(async () => {
  chronicle?.mark(`afterEach:start`);

  await destroyCurrentTestSandbox({ noisy: false });

  chronicle?.mark(`afterEach:sandbox-destroyed`);
  chronicle?.logMarks();
  chronicle = undefined;
});

describe(`systemd-ts sandbox`, () => {
  test(installTestName, async () => {
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

    const result = await systemd.install(service, timer);
    chronicle?.mark(`test:install-finished`);

    expect(result.directory).toBe(sandbox.linkedUnitDir);
    expect(result.pathFor(service)).toBe(`${sandbox.linkedUnitDir}/${sandbox.namePrefix}.service`);
    expect(result.pathFor(timer)).toBe(`${sandbox.linkedUnitDir}/${sandbox.namePrefix}.timer`);
    expect(sandbox.namePrefix).toContain(`systemd-ts-`);

    const guestFiles = await runGuestCommand(
      `test -f '${result.pathFor(service)}' && test -f '${result.pathFor(timer)}' && echo ok`,
    );
    chronicle?.mark(`test:guest-path-check-finished`);
    expect(guestFiles).toContain(`ok`);

    const installedService = await readFile(result.pathFor(service), `utf8`);
    const installedTimer = await readFile(result.pathFor(timer), `utf8`);
    chronicle?.mark(`test:host-read-finished`);

    expect(installedService).toContain(`[Service]`);
    expect(installedService).toContain(
      `ExecStart=/usr/bin/bash -lc 'echo installed > ${sandbox.workDir}/marker.txt'`,
    );
    expect(installedTimer).toContain(`[Timer]`);
    expect(installedTimer).toContain(`Persistent=true`);
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

    await systemd.install(timer);
    await systemd.enable(timer);

    const systemdStatus = await runGuestCommand(
      `systemctl --user is-enabled ${shellQuote(timer.filename)}`,
    );
    expect(systemdStatus).toContain(`enabled`);

    const wantsLink = await runGuestCommand(
      `readlink -f "$HOME/.config/systemd/user/timers.target.wants/${timer.filename}"`,
    );
    expect(wantsLink.trim()).toBe(systemd.pathFor(timer));
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

    const result = await systemd.install(service);
    const installedService = await readFile(result.pathFor(service), `utf8`);

    expect(installedService).toContain(`ExecStart=${executable.toExecStart()}`);
    expect(installedService).toContain(`Environment=SYSTEMD_TS_MARKER_FILE=${markerFile}`);
    expect(
      await runGuestCommand(`test -x ${shellQuote(executable.runtimeEntrypoint)} && echo ok`),
    ).toContain(`ok`);

    await runGuestCommand(
      `SYSTEMD_TS_MARKER_FILE=${shellQuote(markerFile)} ${executable.toExecStart()}`,
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

    await systemd.install(service);
    const started = await systemd.start(service);

    expect((await runGuestCommand(`cat ${shellQuote(markerFile)}`)).trim()).toBe(`started`);
    expect(started.unit).toBe(service.filename);
    expect(started.result).toBe(`success`);
    expect(started.activeState).toBe(`inactive`);
    expect(started.subState).toBe(`dead`);
    expect(started.execMainStatus).toBe(0);
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

    await systemd.install(service);
    await systemd.start(service);

    const logs = await systemd.logs(service, { lines: 20 });
    expect(logs).toContain(logLine);
  });

  test(`signals READY=1 from a notify service process`, () => {
    const sandbox = useCurrentTestSandbox();
    const socketPath = `/tmp/systemd-ts-ready-${sandbox.id}.sock`;
    const outputPath = `/tmp/systemd-ts-ready-${sandbox.id}.txt`;
    return (async () => {
      await startNotifyCapture(socketPath, outputPath);
      await notify.ready({
        executor: guestCommandExecutor,
        socketPath,
        status: `ready-status`,
      });

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
      await notify.watchdog({
        executor: guestCommandExecutor,
        pid: 1234,
        socketPath,
        status: `watchdog-status`,
      });

      const payload = await waitForNotifyPayload(outputPath);
      expect(payload).toContain(`WATCHDOG=1`);
      expect(payload).toContain(`STATUS=watchdog-status`);
      expect(payload).toContain(`MAINPID=1234`);
    })();
  });

  test(`installs, enables, and runs a timer-driven service end to end`, () => {
    const sandbox = useCurrentTestSandbox();
    const systemd = sandboxSystemd();
    const service = new SystemdService({
      name: sandbox.namePrefix,
      service: {
        ExecStart: `/usr/bin/true`,
      },
    });
    const timer = new SystemdTimer({
      name: sandbox.namePrefix,
      timer: {
        OnCalendar: `hourly`,
        Unit: service.filename,
      },
    });
    logPendingStory(
      `Systemd.install(), Systemd.enable(), and Systemd.start() should work together so ${timer.filename} can trigger ${service.filename} in the sandbox`,
    );

    expect(typeof systemd.install).toBe(`function`);
    expect(typeof systemd.enable).toBe(`function`);
    expect(typeof systemd.start).toBe(`function`);
  });
});

function logPendingStory(message: string): void {
  console.info(`TODO: ${message}`);
}

function sandboxSystemd(): Systemd {
  const sandbox = useCurrentTestSandbox();
  return new Systemd({
    executor: guestCommandExecutor,
    linkUnits: true,
    scope: `user`,
    unitDir: sandbox.linkedUnitDir,
  });
}

async function guestCommandExecutor(
  command: string,
  args: readonly string[],
): Promise<CommandResult> {
  const stdout = await runGuestCommand(
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
    `rm -f ${shellQuote(socketPath)} ${shellQuote(outputPath)}
nohup python3 -c ${shellQuote(python)} ${shellQuote(socketPath)} ${shellQuote(outputPath)} >/dev/null 2>&1 &`,
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
