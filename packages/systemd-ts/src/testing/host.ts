import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL(`../../../../`, import.meta.url));
const colimaHome = process.env[`COLIMA_HOME`] ?? `${repoRoot}.colima`;
const limaHome = process.env[`LIMA_HOME`] ?? `${colimaHome}/_lima`;
const colimaProfile = process.env[`COLIMA_PROFILE`] ?? `systemd-ts`;

const hostEnv = {
  ...process.env,
  COLIMA_HOME: colimaHome,
  COLIMA_PROFILE: colimaProfile,
  LIMA_HOME: limaHome,
};

export interface TestHostInfo {
  readonly colimaHome: string;
  readonly colimaProfile: string;
  readonly limaHome: string;
  readonly repoRoot: string;
}

let ensuredHost: Promise<TestHostInfo> | undefined;

export function getTestHostInfo(): TestHostInfo {
  return {
    colimaHome,
    colimaProfile,
    limaHome,
    repoRoot,
  };
}

export function ensureTestHost(): Promise<TestHostInfo> {
  ensuredHost ??= ensureTestHostInner();
  return ensuredHost;
}

export async function runGuestCommand(script: string): Promise<string> {
  const result = await execFileAsync(`colima`, [`ssh`, `--`, `bash`, `-lc`, script], {
    env: hostEnv,
  });

  return mergeOutput(result.stdout, result.stderr);
}

async function ensureTestHostInner(): Promise<TestHostInfo> {
  if (!(await isColimaRunning())) {
    console.info(`Starting repo-local Colima host for integration tests...`);
    await execColima([
      `start`,
      `--cpu`,
      `2`,
      `--memory`,
      `4`,
      `--disk`,
      `30`,
      `--runtime`,
      `containerd`,
    ]);
  }

  await waitForUserSystemd();
  return getTestHostInfo();
}

async function isColimaRunning(): Promise<boolean> {
  try {
    const status = await execColima([`status`]);
    return status.includes(`is running`);
  } catch {
    return false;
  }
}

async function waitForUserSystemd(): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const state = await runGuestCommand(
      `printf 'pid1=%s\n' "$(ps -p 1 -o comm=)"; systemctl --user is-system-running || true; printf 'xdg=%s\n' "$XDG_RUNTIME_DIR"`,
    );

    if (
      state.includes(`pid1=systemd`) &&
      state.includes(`xdg=/run/user/`) &&
      [`running`, `degraded`].some((status) => state.includes(status))
    ) {
      return;
    }

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for systemd --user in the Colima guest`);
}

async function execColima(args: readonly string[]): Promise<string> {
  const result = await execFileAsync(`colima`, args, { env: hostEnv });
  return mergeOutput(result.stdout, result.stderr);
}

function mergeOutput(stdout: string, stderr: string): string {
  return [stdout, stderr].filter((output) => output.length > 0).join(`\n`);
}
