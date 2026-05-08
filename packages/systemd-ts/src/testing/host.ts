import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
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
let guestShell: GuestShell | undefined;

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
  const shell = getGuestShell();
  return shell.run(script);
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

function getGuestShell(): GuestShell {
  guestShell ??= new GuestShell();
  return guestShell;
}

class GuestShell {
  private readonly process = spawn(`colima`, [`ssh`, `--`, `bash`, `--noprofile`, `--norc`, `-s`], {
    env: hostEnv,
    stdio: [`pipe`, `pipe`, `pipe`],
  });
  private buffer = ``;
  private current:
    | {
        marker: string;
        reject: (error: Error) => void;
        resolve: (output: string) => void;
      }
    | undefined;
  private readonly queue: Array<{
    script: string;
    reject: (error: Error) => void;
    resolve: (output: string) => void;
  }> = [];

  public constructor() {
    this.process.stdout.setEncoding(`utf8`);
    this.process.stderr.setEncoding(`utf8`);
    this.process.stdout.on(`data`, (chunk: string) => this.onData(chunk));
    this.process.stderr.on(`data`, (chunk: string) => this.onData(chunk));
    this.process.on(`exit`, (code, signal) => {
      const reason = new Error(
        `Persistent guest shell exited unexpectedly (code=${code ?? `null`}, signal=${signal ?? `null`})`,
      );
      this.failCurrent(reason);
      while (this.queue.length > 0) {
        this.queue.shift()?.reject(reason);
      }
      if (guestShell === this) {
        guestShell = undefined;
      }
    });

    process.once(`exit`, () => {
      this.process.kill();
    });
  }

  public run(script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ script, resolve, reject });
      this.drain();
    });
  }

  private drain(): void {
    if (this.current !== undefined) {
      return;
    }

    const next = this.queue.shift();
    if (next === undefined) {
      return;
    }

    const marker = `__SYSTEMD_TS_END_${randomUUID()}__`;
    this.current = {
      marker,
      reject: next.reject,
      resolve: next.resolve,
    };

    this.buffer = ``;
    const command = `{
${next.script}
} 2>&1
status=$?
printf '\\n${marker}:%s\\n' "$status"
`;

    this.process.stdin.write(command);
  }

  private failCurrent(error: Error): void {
    const current = this.current;
    this.current = undefined;
    current?.reject(error);
  }

  private onData(chunk: string): void {
    if (this.current === undefined) {
      return;
    }

    this.buffer += chunk;
    const markerIndex = this.buffer.indexOf(this.current.marker);
    if (markerIndex === -1) {
      return;
    }

    const output = this.buffer.slice(0, markerIndex).replace(/\n$/, ``);
    const statusMatch = this.buffer
      .slice(markerIndex)
      .match(/^__SYSTEMD_TS_END_[^:]+__:(\d+)\r?\n?/u);

    if (statusMatch === null) {
      return;
    }

    const status = Number(statusMatch[1]);
    const remainder = this.buffer.slice(markerIndex + statusMatch[0].length);
    const current = this.current;
    this.current = undefined;
    this.buffer = remainder;

    if (status === 0) {
      current.resolve(output);
    } else {
      current.reject(new Error(output.length > 0 ? output : `Guest command failed`));
    }

    this.drain();
  }
}
