import { readFile } from "node:fs/promises";

import { Logger, type Chronicle } from "takua";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test";

import { defineService, defineTimer, enable, install, logs, notify, start } from "../src/index.ts";
import { ensureTestHost, runGuestCommand } from "../src/testing/host.ts";
import {
  createTestSandbox,
  destroyCurrentTestSandbox,
  useCurrentTestSandbox,
} from "../src/testing/sandbox.ts";

const installTestName = `installs a user service and timer into an isolated systemd sandbox`;
const chronicleLogger = new Logger({ colorEnabled: false });
let chronicle: Chronicle | undefined;

beforeAll(async () => {
  await ensureTestHost();
});

beforeEach(async (context) => {
  chronicle = chronicleLogger.makeChronicle({ inline: false });
  chronicle.mark(`beforeEach:start`);

  await createTestSandbox(context.task.name);

  chronicle?.mark(`beforeEach:sandbox-ready`);
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
    chronicle?.mark(`test:start`);
    const service = defineService({
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
    const timer = defineTimer({
      timer: {
        OnCalendar: `hourly`,
        Persistent: true,
        Unit: `${sandbox.namePrefix}.service`,
      },
      install: {
        WantedBy: `timers.target`,
      },
    });
    chronicle?.mark(`test:definitions-ready`);

    const result = await install({
      directory: sandbox.linkedUnitDir,
      name: sandbox.namePrefix,
      service,
      timer,
    });
    chronicle?.mark(`test:install-finished`);

    expect(result.directory).toBe(sandbox.linkedUnitDir);
    expect(result.servicePath).toBe(`${sandbox.linkedUnitDir}/${sandbox.namePrefix}.service`);
    expect(result.timerPath).toBe(`${sandbox.linkedUnitDir}/${sandbox.namePrefix}.timer`);
    expect(sandbox.namePrefix).toContain(`systemd-ts-`);

    const guestFiles = await runGuestCommand(
      `test -f '${result.servicePath}' && test -f '${result.timerPath}' && echo ok`,
    );
    chronicle?.mark(`test:guest-path-check-finished`);
    expect(guestFiles).toContain(`ok`);

    const installedService = await readFile(result.servicePath!, `utf8`);
    const installedTimer = await readFile(result.timerPath!, `utf8`);
    chronicle?.mark(`test:host-read-finished`);

    expect(installedService).toContain(`[Service]`);
    expect(installedService).toContain(
      `ExecStart=/usr/bin/bash -lc 'echo installed > ${sandbox.workDir}/marker.txt'`,
    );
    expect(installedTimer).toContain(`[Timer]`);
    expect(installedTimer).toContain(`Persistent=true`);
    chronicle?.mark(`test:assertions-finished`);
  });

  test(`enables a timer so it is wanted by timers.target in the sandbox`, () => {
    const sandbox = useCurrentTestSandbox();
    logPendingStory(
      `enable() should create the expected systemd wants-linkage for ${sandbox.namePrefix}*.timer and report that the timer is enabled`,
    );

    expect(typeof enable).toBe(`function`);
  });

  test(`starts a oneshot service and observes successful completion`, () => {
    const sandbox = useCurrentTestSandbox();
    logPendingStory(
      `start() should run the service from ${sandbox.workDir}, wait for completion, and expose the final systemd state`,
    );

    expect(typeof start).toBe(`function`);
  });

  test(`reads recent journald output for a managed unit`, () => {
    const sandbox = useCurrentTestSandbox();
    logPendingStory(
      `logs() should return recent journal lines for ${sandbox.namePrefix}*.service and preserve enough structure for assertions`,
    );

    expect(typeof logs).toBe(`function`);
  });

  test(`signals READY=1 from a notify service process`, () => {
    logPendingStory(
      `notify.ready() should send sd_notify readiness to the sandboxed systemd notification socket`,
    );

    expect(typeof notify.ready).toBe(`function`);
  });

  test(`signals watchdog heartbeats for a service with WatchdogSec configured`, () => {
    logPendingStory(
      `notify.watchdog() should emit watchdog heartbeats often enough to keep the sandboxed service healthy`,
    );

    expect(typeof notify.watchdog).toBe(`function`);
  });

  test(`installs, enables, and runs a timer-driven service end to end`, () => {
    logPendingStory(
      `defineService(), defineTimer(), install(), enable(), and start() should work together so a timer can trigger a real workload in the sandbox`,
    );

    expect(typeof defineService).toBe(`function`);
    expect(typeof defineTimer).toBe(`function`);
    expect(typeof install).toBe(`function`);
    expect(typeof enable).toBe(`function`);
    expect(typeof start).toBe(`function`);
  });
});

function logPendingStory(message: string): void {
  console.info(`TODO: ${message}`);
}
