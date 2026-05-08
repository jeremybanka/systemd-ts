import { describe, expect, test } from "vite-plus/test";

import {
  defineService,
  defineTimer,
  renderServiceUnit,
  renderTimerUnit,
  suggestedServiceFilename,
  suggestedTimerFilename,
  timerActivates,
} from "../src/index.ts";

describe(`systemd-ts unit`, () => {
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
});
