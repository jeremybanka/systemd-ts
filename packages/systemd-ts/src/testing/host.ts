import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const commandMaxBufferBytes = 16 * 1024 * 1024;
const dockerBuildTimeoutMs = 5 * 60 * 1_000;
const dockerExecTimeoutMs = 60 * 1_000;
const repoRoot = fileURLToPath(new URL(`../../../../`, import.meta.url));
const dockerfilePath = fileURLToPath(new URL(`./systemd-container.Dockerfile`, import.meta.url));
const selectedBackendName = resolveBackendName(process.env[`SYSTEMD_TS_TEST_HOST_BACKEND`]);
const colimaHome = process.env[`COLIMA_HOME`] ?? `${repoRoot}.colima`;
const limaHome = process.env[`LIMA_HOME`] ?? `${colimaHome}/_lima`;
const colimaProfile = process.env[`COLIMA_PROFILE`] ?? `systemd-ts`;
const dockerStateRoot = process.env[`SYSTEMD_TS_TEST_HOST_ROOT`] ?? `${repoRoot}.docker`;
const dockerImage = process.env[`SYSTEMD_TS_TEST_DOCKER_IMAGE`] ?? `systemd-ts-test-host:local`;
const dockerUser = process.env[`SYSTEMD_TS_TEST_DOCKER_USER`] ?? `runner`;
const dockerConfiguredUserId = process.env[`SYSTEMD_TS_TEST_DOCKER_UID`];
const dockerContainer =
  process.env[`SYSTEMD_TS_TEST_DOCKER_CONTAINER`] ?? defaultDockerContainerName();

export interface TestHostInfo {
  readonly backend: TestHostBackendName;
  readonly colimaHome?: string;
  readonly colimaProfile?: string;
  readonly limaHome?: string;
  readonly repoRoot: string;
  readonly stateRoot: string;
}

type TestHostBackendName = `colima` | `docker`;

interface TestHostBackend {
  readonly info: TestHostInfo;
  ensureHost(): Promise<void>;
  createGuestShellProcess(): ChildProcessWithoutNullStreams;
  runIsolatedCommand(script: string): Promise<string>;
}

let ensuredHost: Promise<TestHostInfo> | undefined;
let guestShell: GuestShell | undefined;

export function getTestHostInfo(): TestHostInfo {
  return backend.info;
}

export function ensureTestHost(): Promise<TestHostInfo> {
  ensuredHost ??= ensureTestHostInner();
  return ensuredHost;
}

export async function runGuestCommand(script: string): Promise<string> {
  const shell = getGuestShell();
  return shell.run(script);
}

export async function runIsolatedGuestCommand(script: string): Promise<string> {
  return backend.runIsolatedCommand(script);
}

async function ensureTestHostInner(): Promise<TestHostInfo> {
  logTestHost(`Ensuring ${backend.info.backend} test host`);
  await backend.ensureHost();
  logTestHost(`Waiting for systemd --user readiness`);
  await waitForUserSystemd();
  logTestHost(`Test host ready`);
  return getTestHostInfo();
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
      logTestHost(
        `systemd --user ready after ${attempt + 1} attempt${attempt === 0 ? `` : `s`}: ${summarizeSystemdState(state)}`,
      );
      return;
    }

    if (attempt === 0 || (attempt + 1) % 5 === 0) {
      logTestHost(
        `systemd --user not ready yet (${attempt + 1}/30): ${summarizeSystemdState(state)}`,
      );
    }

    await delay(1_000);
  }

  throw new Error(`Timed out waiting for systemd --user in the ${backend.info.backend} guest`);
}

function getGuestShell(): GuestShell {
  guestShell ??= new GuestShell(
    () => backend.createGuestShellProcess(),
    () => {
      if (guestShell !== undefined) {
        guestShell = undefined;
      }
    },
  );
  return guestShell;
}

function mergeOutput(stdout: string, stderr: string): string {
  return [stdout, stderr].filter((output) => output.length > 0).join(`\n`);
}

function summarizeSystemdState(state: string): string {
  return state
    .split(`\n`)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(`; `);
}

function inferBackendName(): TestHostBackendName {
  if (process.platform === `darwin`) {
    return `colima`;
  }

  if (process.platform === `linux`) {
    return `docker`;
  }

  throw new Error(
    `Unsupported test host platform: ${process.platform}. Set SYSTEMD_TS_TEST_HOST_BACKEND explicitly if you have a compatible backend.`,
  );
}

function resolveBackendName(value: string | undefined): TestHostBackendName {
  if (value === undefined) {
    return inferBackendName();
  }

  if (value === `colima` || value === `docker`) {
    return value;
  }

  throw new Error(
    `Unsupported SYSTEMD_TS_TEST_HOST_BACKEND value: ${value}. Expected "colima" or "docker".`,
  );
}

function defaultDockerContainerName(): string {
  const digest = createHash(`sha256`).update(repoRoot).digest(`hex`).slice(0, 12);
  return `systemd-ts-${digest}`;
}

function logTestHost(message: string): void {
  console.info(`[systemd-ts:test-host] ${message}`);
}

function createBackend(name: TestHostBackendName): TestHostBackend {
  switch (name) {
    case `colima`:
      return new ColimaBackend();
    case `docker`:
      return new DockerBackend();
  }
}

class ColimaBackend implements TestHostBackend {
  public readonly info: TestHostInfo = {
    backend: `colima`,
    colimaHome,
    colimaProfile,
    limaHome,
    repoRoot,
    stateRoot: colimaHome,
  };

  public async ensureHost(): Promise<void> {
    if (await this.isRunning()) {
      return;
    }

    console.info(`Starting repo-local Colima host for integration tests...`);
    await this.execColima([
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

  public createGuestShellProcess(): ChildProcessWithoutNullStreams {
    return spawn(`colima`, [`ssh`, `--`, `bash`, `--noprofile`, `--norc`, `-s`], {
      env: this.hostEnv,
      stdio: [`pipe`, `pipe`, `pipe`],
    });
  }

  public async runIsolatedCommand(script: string): Promise<string> {
    return this.execColima([`ssh`, `--`, `bash`, `-lc`, script]);
  }

  private readonly hostEnv = {
    ...process.env,
    COLIMA_HOME: colimaHome,
    COLIMA_PROFILE: colimaProfile,
    LIMA_HOME: limaHome,
  };

  private async isRunning(): Promise<boolean> {
    try {
      const status = await this.execColima([`status`]);
      return status.includes(`is running`);
    } catch {
      return false;
    }
  }

  private async execColima(args: readonly string[]): Promise<string> {
    const result = await execFileAsync(`colima`, args, {
      env: this.hostEnv,
      maxBuffer: commandMaxBufferBytes,
    });
    return mergeOutput(result.stdout, result.stderr);
  }
}

class DockerBackend implements TestHostBackend {
  public readonly info: TestHostInfo = {
    backend: `docker`,
    repoRoot,
    stateRoot: dockerStateRoot,
  };

  private runtimeInfo:
    | {
        readonly home: string;
        readonly runtimeDir: string;
        readonly userId: number;
      }
    | undefined;

  public async ensureHost(): Promise<void> {
    logTestHost(`Building Docker test host image ${dockerImage}`);
    await this.execDocker(
      [`build`, `--quiet`, `--tag`, dockerImage, `--file`, dockerfilePath, repoRoot],
      { timeout: dockerBuildTimeoutMs },
    );
    logTestHost(`Docker test host image ready`);

    if (!(await this.isContainerRunning())) {
      await this.removeExistingContainer();
      logTestHost(`Starting Docker test host container ${dockerContainer}`);
      await this.execDocker([
        `run`,
        `--detach`,
        `--name`,
        dockerContainer,
        `--hostname`,
        `systemd-ts-test-host`,
        `--privileged`,
        `--cgroupns=host`,
        `--tmpfs`,
        `/run`,
        `--tmpfs`,
        `/run/lock`,
        `--volume`,
        `/sys/fs/cgroup:/sys/fs/cgroup:rw`,
        `--volume`,
        `${repoRoot}:${repoRoot}`,
        `--volume`,
        `${dockerStateRoot}:${dockerStateRoot}`,
        `--workdir`,
        repoRoot,
        dockerImage,
      ]);
      logTestHost(`Docker test host container started`);
    } else {
      logTestHost(`Reusing running Docker test host container ${dockerContainer}`);
    }

    await this.ensureUserSession();
  }

  public createGuestShellProcess(): ChildProcessWithoutNullStreams {
    const runtimeInfo = this.requireRuntimeInfo();
    return spawn(
      `docker`,
      [
        `exec`,
        `--interactive`,
        `--user`,
        dockerUser,
        `--env`,
        `HOME=${runtimeInfo.home}`,
        `--env`,
        `XDG_RUNTIME_DIR=${runtimeInfo.runtimeDir}`,
        `--env`,
        `DBUS_SESSION_BUS_ADDRESS=unix:path=${runtimeInfo.runtimeDir}/bus`,
        dockerContainer,
        `bash`,
        `--noprofile`,
        `--norc`,
        `-s`,
      ],
      {
        stdio: [`pipe`, `pipe`, `pipe`],
      },
    );
  }

  public async runIsolatedCommand(script: string): Promise<string> {
    const runtimeInfo = this.requireRuntimeInfo();
    const result = await execFileAsync(
      `docker`,
      [
        `exec`,
        `--user`,
        dockerUser,
        `--env`,
        `HOME=${runtimeInfo.home}`,
        `--env`,
        `XDG_RUNTIME_DIR=${runtimeInfo.runtimeDir}`,
        `--env`,
        `DBUS_SESSION_BUS_ADDRESS=unix:path=${runtimeInfo.runtimeDir}/bus`,
        dockerContainer,
        `bash`,
        `-lc`,
        script,
      ],
      { maxBuffer: commandMaxBufferBytes },
    );

    return mergeOutput(result.stdout, result.stderr);
  }

  private async isContainerRunning(): Promise<boolean> {
    try {
      const status = await this.execDocker([
        `inspect`,
        `--format`,
        `{{.State.Running}}`,
        dockerContainer,
      ]);
      return status.trim() === `true`;
    } catch {
      return false;
    }
  }

  private async removeExistingContainer(): Promise<void> {
    try {
      await this.execDocker([`rm`, `--force`, dockerContainer]);
    } catch {
      // Ignore missing containers so the first run can proceed.
    }
  }

  private async ensureUserSession(): Promise<void> {
    const runtimeInfo = await this.resolveRuntimeInfo();
    logTestHost(
      `Ensuring user session for ${dockerUser} (uid=${runtimeInfo.userId}, home=${runtimeInfo.home})`,
    );
    await this.execDocker(
      [
        `exec`,
        dockerContainer,
        `bash`,
        `-lc`,
        [
          `mkdir -p ${shellQuote(dockerStateRoot)}`,
          `loginctl enable-linger ${shellQuote(dockerUser)}`,
          `systemctl start user@${runtimeInfo.userId}.service`,
        ].join(`\n`),
      ],
      { timeout: dockerExecTimeoutMs },
    );
    logTestHost(`User session started for ${dockerUser}`);
  }

  private async execDocker(
    args: readonly string[],
    options?: {
      readonly timeout?: number;
    },
  ): Promise<string> {
    const result = await execFileAsync(`docker`, args, {
      maxBuffer: commandMaxBufferBytes,
      timeout: options?.timeout,
    });
    return mergeOutput(result.stdout, result.stderr);
  }

  private requireRuntimeInfo(): {
    readonly home: string;
    readonly runtimeDir: string;
    readonly userId: number;
  } {
    if (this.runtimeInfo === undefined) {
      throw new Error(`Docker test host runtime info is unavailable before ensureHost() completes`);
    }

    return this.runtimeInfo;
  }

  private async resolveRuntimeInfo(): Promise<{
    readonly home: string;
    readonly runtimeDir: string;
    readonly userId: number;
  }> {
    if (this.runtimeInfo !== undefined) {
      return this.runtimeInfo;
    }

    const userId =
      dockerConfiguredUserId === undefined
        ? await this.lookupUserId()
        : Number(dockerConfiguredUserId);
    const home = await this.lookupUserHome();

    this.runtimeInfo = {
      home,
      runtimeDir: `/run/user/${userId}`,
      userId,
    };

    return this.runtimeInfo;
  }

  private async lookupUserHome(): Promise<string> {
    logTestHost(`Resolving home directory for Docker test user ${dockerUser}`);
    const output = await this.execDocker([
      `exec`,
      dockerContainer,
      `bash`,
      `-lc`,
      `getent passwd ${shellQuote(dockerUser)} | cut -d: -f6`,
    ]);

    const home = output.trim();
    if (home.length === 0) {
      throw new Error(`Could not resolve home directory for Docker test user ${dockerUser}`);
    }

    logTestHost(`Resolved home directory for ${dockerUser}: ${home}`);
    return home;
  }

  private async lookupUserId(): Promise<number> {
    logTestHost(`Resolving uid for Docker test user ${dockerUser}`);
    const output = await this.execDocker([
      `exec`,
      dockerContainer,
      `bash`,
      `-lc`,
      `id -u ${shellQuote(dockerUser)}`,
    ]);

    const parsed = Number(output.trim());
    if (!Number.isInteger(parsed)) {
      throw new Error(`Could not resolve uid for Docker test user ${dockerUser}`);
    }

    logTestHost(`Resolved uid for ${dockerUser}: ${parsed}`);
    return parsed;
  }
}

class GuestShell {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly onExitCleanup: () => void;
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

  public constructor(
    createProcess: () => ChildProcessWithoutNullStreams,
    onExitCleanup: () => void,
  ) {
    this.process = createProcess();
    this.onExitCleanup = onExitCleanup;
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
      this.onExitCleanup();
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

function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
}

const backend = createBackend(selectedBackendName);
