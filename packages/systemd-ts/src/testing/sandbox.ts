import { randomUUID } from "node:crypto";

import { Logger } from "takua";

import { getTestHostInfo, runGuestCommand } from "./host.ts";

export interface TestSandbox {
  readonly id: string;
  readonly linkedUnitDir: string;
  readonly namePrefix: string;
  readonly rootDir: string;
  readonly workDir: string;
}

export interface DestroyTestSandboxOptions {
  readonly noisy?: boolean;
}

let currentSandbox: TestSandbox | undefined;
const teardownLogger = new Logger({ colorEnabled: false });

export async function createTestSandbox(testName?: string): Promise<TestSandbox> {
  const id = randomUUID().slice(0, 8);
  const slug = slugify(testName ?? `sandbox`);
  const namePrefix = `systemd-ts-${slug}-${id}`;
  const rootDir = `${getTestHostInfo().repoRoot}.colima/tests/${namePrefix}`;
  const linkedUnitDir = `${rootDir}/linked-units`;
  const workDir = `${rootDir}/work`;

  await runGuestCommand(
    `set -euo pipefail
rm -rf ${shellQuote(rootDir)}
mkdir -p ${shellQuote(linkedUnitDir)} ${shellQuote(workDir)}`,
  );

  currentSandbox = {
    id,
    linkedUnitDir,
    namePrefix,
    rootDir,
    workDir,
  };

  return currentSandbox;
}

export async function destroyCurrentTestSandbox(
  options: DestroyTestSandboxOptions = {},
): Promise<void> {
  if (currentSandbox === undefined) {
    return;
  }

  const sandbox = currentSandbox;
  currentSandbox = undefined;
  const chronicle = teardownLogger.makeChronicle({ inline: false });
  const noisy = options.noisy ?? false;
  chronicle.mark(`teardown:start`);

  const unitsOutput = await runGuestCommand(
    `systemctl --user list-unit-files --all --no-legend ${shellQuote(`${sandbox.namePrefix}*`)} 2>/dev/null | awk '{print $1}' || true`,
  );
  chronicle.mark(`teardown:list-unit-files`);

  const units = unitsOutput
    .split(`\n`)
    .map((unit) => unit.trim())
    .filter((unit) => unit.length > 0);

  if (units.length > 0) {
    await runGuestCommand(`systemctl --user stop ${units.map(shellQuote).join(` `)} || true`);
    chronicle.mark(`teardown:stop-units`);

    await runGuestCommand(`systemctl --user disable ${units.map(shellQuote).join(` `)} || true`);
    chronicle.mark(`teardown:disable-units`);

    await runGuestCommand(
      `systemctl --user reset-failed ${units.map(shellQuote).join(` `)} || true`,
    );
    chronicle.mark(`teardown:reset-failed`);
  }

  await runGuestCommand(`systemctl --user daemon-reload || true`);
  chronicle.mark(`teardown:daemon-reload`);

  await runGuestCommand(`rm -rf ${shellQuote(sandbox.rootDir)}`);
  chronicle.mark(`teardown:remove-root`);

  if (noisy) {
    chronicle.logMarks();
  }
}

export function useCurrentTestSandbox(): TestSandbox {
  if (currentSandbox === undefined) {
    throw new Error(`No active test sandbox is available`);
  }

  return currentSandbox;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, `-`)
    .replaceAll(/^-+|-+$/g, ``)
    .slice(0, 32);
}
