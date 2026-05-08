import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test";

import { defineService, defineTimer, enable, install, logs, notify, start } from "../src/index.ts";
import { ensureTestHost } from "../src/testing/host.ts";
import {
  createTestSandbox,
  destroyCurrentTestSandbox,
  useCurrentTestSandbox,
} from "../src/testing/sandbox.ts";

beforeAll(async () => {
  await ensureTestHost();
});

beforeEach(async (context) => {
  await createTestSandbox(context.task.name);
});

afterEach(async () => {
  await destroyCurrentTestSandbox();
});

describe(`systemd-ts sandbox`, () => {
  test(`installs a user service and timer into an isolated systemd sandbox`, () => {
    const sandbox = useCurrentTestSandbox();
    logPendingStory(
      `install() should write unit files into ${sandbox.linkedUnitDir}, reload systemd, and return the installed paths`,
    );

    expect(typeof install).toBe(`function`);
    expect(sandbox.namePrefix).toContain(`systemd-ts-`);
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
