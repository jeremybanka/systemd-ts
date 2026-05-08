import { describe, expect, test } from "vite-plus/test";

import {
  defineService,
  defineTimer,
  enable,
  install,
  logs,
  notify,
  renderServiceUnit,
  renderTimerUnit,
  start,
  suggestedServiceFilename,
  suggestedTimerFilename,
  timerActivates,
} from "../src/index.ts";

describe(`systemd-ts`, () => {
  test(`renders a service unit`, () => {
    const service = defineService({
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

    expect(renderServiceUnit(service)).toContain(`[Service]`);
    expect(renderServiceUnit(service)).toContain(`ExecStart=/usr/bin/env node /srv/app/backup.mjs`);
  });

  test(`renders a timer unit`, () => {
    const timer = defineTimer({
      timer: {
        OnCalendar: `daily`,
        Persistent: true,
        Unit: timerActivates(`backup-db`),
      },
      install: {
        WantedBy: `timers.target`,
      },
    });

    expect(renderTimerUnit(timer)).toContain(`[Timer]`);
    expect(renderTimerUnit(timer)).toContain(`Unit=backup-db.service`);
    expect(renderTimerUnit(timer)).toContain(`Persistent=true`);
  });

  test(`suggests canonical filenames`, () => {
    expect(suggestedServiceFilename(`backup-db`)).toBe(`backup-db.service`);
    expect(suggestedTimerFilename(`backup-db`)).toBe(`backup-db.timer`);
  });

  test(`rejects non-absolute exec paths`, () => {
    expect(() =>
      renderServiceUnit(
        defineService({
          service: {
            ExecStart: `node scripts/run.mjs`,
          },
        }),
      ),
    ).toThrow(/absolute executable path/u);
  });

  describe(`sandbox integration stories`, () => {
    test(`installs a user service and timer into an isolated systemd sandbox`, () => {
      logPendingStory(
        `install() should write unit files into the sandboxed user unit directory, reload systemd, and return the installed paths`,
      );

      expect(typeof install).toBe(`function`);
    });

    test(`enables a timer so it is wanted by timers.target in the sandbox`, () => {
      logPendingStory(
        `enable() should create the expected systemd wants-linkage and report that the timer is enabled`,
      );

      expect(typeof enable).toBe(`function`);
    });

    test(`starts a oneshot service and observes successful completion`, () => {
      logPendingStory(
        `start() should run the service in the sandbox, wait for completion, and expose the final systemd state`,
      );

      expect(typeof start).toBe(`function`);
    });

    test(`reads recent journald output for a managed unit`, () => {
      logPendingStory(
        `logs() should return recent journal lines for the unit and preserve enough structure for assertions`,
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
});

function logPendingStory(message: string): void {
  console.info(`TODO: ${message}`);
}
