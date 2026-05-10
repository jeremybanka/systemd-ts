import type { StartStatus } from "./types.ts";

export type SystemdTsErrorCode =
  | `SYSTEMD_TS_INVALID_EXEC_DIRECTIVE`
  | `SYSTEMD_TS_NO_UNITS_PROVIDED`
  | `SYSTEMD_TS_EXECUTABLE_INFERENCE`
  | `SYSTEMD_TS_UNIT_MATERIALIZATION`
  | `SYSTEMD_TS_UNIT_ENABLE`
  | `SYSTEMD_TS_UNIT_START`
  | `SYSTEMD_TS_UNIT_LOGS`
  | `SYSTEMD_TS_NOTIFY_SEND`;

export interface SystemdTsErrorOptions {
  readonly cause?: unknown;
}

export interface SystemdCommandErrorOptions extends SystemdTsErrorOptions {
  readonly args?: readonly string[];
  readonly command?: string;
  readonly environmentReason?: SystemdCommandEnvironmentReason;
  readonly stage?: string;
  readonly unitName?: string;
}

export interface UnitStartDiagnostics {
  readonly showOutput?: string;
  readonly showStatus?: StartStatus;
  readonly statusOutput?: string;
}

export interface UnitStartErrorOptions extends SystemdCommandErrorOptions {
  readonly diagnostics?: UnitStartDiagnostics;
}

export interface UnitMaterializationErrorOptions extends SystemdTsErrorOptions {
  readonly reason?: UnitMaterializationErrorReason;
  readonly operation?: `create-directory` | `write-file`;
  readonly unitName?: string;
  readonly unitPath?: string;
}

export type UnitMaterializationErrorReason =
  | `file-system-failed`
  | `invalid-unit-directory`
  | `permission-denied`;

export interface UnitLogsReadErrorOptions extends SystemdCommandErrorOptions {
  readonly reason?: UnitLogsReadErrorReason;
  readonly unitPath?: string;
}

export type UnitLogsReadErrorReason =
  | `missing-log-file`
  | `log-file-read-failed`
  | `status-command-failed`;

export interface NotifySendErrorOptions extends SystemdCommandErrorOptions {
  readonly reason?: NotifySendErrorReason;
}

export type NotifySendErrorReason = `executor-failed` | `systemd-notify-failed`;

export type SystemdCommandEnvironmentReason =
  | `manager-unavailable`
  | `missing-command`
  | `permission-denied`;

export class SystemdTsError extends Error {
  public readonly code: SystemdTsErrorCode;

  public constructor(
    code: SystemdTsErrorCode,
    message: string,
    options: SystemdTsErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.code = code;
    this.name = new.target.name;
  }
}

export class InvalidExecDirectiveError extends SystemdTsError {
  public readonly directive: string;

  public constructor(directive: string, options: SystemdTsErrorOptions = {}) {
    super(
      `SYSTEMD_TS_INVALID_EXEC_DIRECTIVE`,
      `${directive} must use an absolute executable path for systemd`,
      options,
    );
    this.directive = directive;
  }
}

export class NoUnitsProvidedError extends SystemdTsError {
  public readonly operation: string;

  public constructor(operation: string, options: SystemdTsErrorOptions = {}) {
    super(
      `SYSTEMD_TS_NO_UNITS_PROVIDED`,
      `${operation} requires at least one service or timer`,
      options,
    );
    this.operation = operation;
  }
}

export class ExecutableInferenceError extends SystemdTsError {
  public constructor(options: SystemdTsErrorOptions = {}) {
    super(
      `SYSTEMD_TS_EXECUTABLE_INFERENCE`,
      `Could not infer the calling module path for defineExecutable(); pass { modulePath } explicitly`,
      options,
    );
  }
}

export class UnitMaterializationError extends SystemdTsError {
  public readonly operation: `create-directory` | `write-file` | undefined;
  public readonly reason: UnitMaterializationErrorReason | undefined;
  public readonly unitName: string | undefined;
  public readonly unitPath: string | undefined;

  public constructor(message: string, options: UnitMaterializationErrorOptions = {}) {
    super(`SYSTEMD_TS_UNIT_MATERIALIZATION`, message, options);
    this.operation = options.operation;
    this.reason = options.reason;
    this.unitName = options.unitName;
    this.unitPath = options.unitPath;
  }
}

export class UnitEnableError extends SystemdTsError {
  public readonly args: readonly string[] | undefined;
  public readonly command: string | undefined;
  public readonly environmentReason: SystemdCommandEnvironmentReason | undefined;
  public readonly exitCode: number | undefined;
  public readonly stage: string | undefined;
  public readonly stderr: string | undefined;
  public readonly stdout: string | undefined;
  public readonly unitName: string | undefined;

  public constructor(message: string, options: SystemdCommandErrorOptions = {}) {
    super(`SYSTEMD_TS_UNIT_ENABLE`, message, options);
    const details = extractCommandErrorDetails(options.cause);
    this.args = options.args;
    this.command = options.command;
    this.environmentReason =
      options.environmentReason ?? classifyCommandEnvironmentReason(options.cause);
    this.exitCode = details.exitCode;
    this.stage = options.stage;
    this.stderr = details.stderr;
    this.stdout = details.stdout;
    this.unitName = options.unitName;
  }
}

export class UnitStartError extends SystemdTsError {
  public readonly args: readonly string[] | undefined;
  public readonly command: string | undefined;
  public readonly diagnostics: UnitStartDiagnostics | undefined;
  public readonly environmentReason: SystemdCommandEnvironmentReason | undefined;
  public readonly exitCode: number | undefined;
  public readonly stage: string | undefined;
  public readonly stderr: string | undefined;
  public readonly stdout: string | undefined;
  public readonly unitName: string | undefined;

  public constructor(message: string, options: UnitStartErrorOptions = {}) {
    super(`SYSTEMD_TS_UNIT_START`, message, options);
    const details = extractCommandErrorDetails(options.cause);
    this.args = options.args;
    this.command = options.command;
    this.diagnostics = options.diagnostics;
    this.environmentReason =
      options.environmentReason ?? classifyCommandEnvironmentReason(options.cause);
    this.exitCode = details.exitCode;
    this.stage = options.stage;
    this.stderr = details.stderr;
    this.stdout = details.stdout;
    this.unitName = options.unitName;
  }
}

export class UnitLogsReadError extends SystemdTsError {
  public readonly args: readonly string[] | undefined;
  public readonly command: string | undefined;
  public readonly environmentReason: SystemdCommandEnvironmentReason | undefined;
  public readonly exitCode: number | undefined;
  public readonly reason: UnitLogsReadErrorReason | undefined;
  public readonly stage: string | undefined;
  public readonly stderr: string | undefined;
  public readonly stdout: string | undefined;
  public readonly unitName: string | undefined;
  public readonly unitPath: string | undefined;

  public constructor(message: string, options: UnitLogsReadErrorOptions = {}) {
    super(`SYSTEMD_TS_UNIT_LOGS`, message, options);
    const details = extractCommandErrorDetails(options.cause);
    this.args = options.args;
    this.command = options.command;
    this.environmentReason =
      options.environmentReason ?? classifyCommandEnvironmentReason(options.cause);
    this.exitCode = details.exitCode;
    this.reason = options.reason;
    this.stage = options.stage;
    this.stderr = details.stderr;
    this.stdout = details.stdout;
    this.unitName = options.unitName;
    this.unitPath = options.unitPath;
  }
}

export class NotifySendError extends SystemdTsError {
  public readonly args: readonly string[] | undefined;
  public readonly command: string | undefined;
  public readonly environmentReason: SystemdCommandEnvironmentReason | undefined;
  public readonly exitCode: number | undefined;
  public readonly reason: NotifySendErrorReason | undefined;
  public readonly stage: string | undefined;
  public readonly stderr: string | undefined;
  public readonly stdout: string | undefined;

  public constructor(message: string, options: NotifySendErrorOptions = {}) {
    super(`SYSTEMD_TS_NOTIFY_SEND`, message, options);
    const details = extractCommandErrorDetails(options.cause);
    this.args = options.args;
    this.command = options.command;
    this.environmentReason =
      options.environmentReason ?? classifyCommandEnvironmentReason(options.cause);
    this.exitCode = details.exitCode;
    this.reason = options.reason;
    this.stage = options.stage;
    this.stderr = details.stderr;
    this.stdout = details.stdout;
  }
}

export function classifyCommandEnvironmentReason(
  cause: unknown,
): SystemdCommandEnvironmentReason | undefined {
  if (cause === null || typeof cause !== `object`) {
    return undefined;
  }

  const record = cause as Record<string, unknown>;
  if (record[`code`] === `ENOENT`) {
    return `missing-command`;
  }

  if (record[`code`] === `EACCES` || record[`code`] === `EPERM`) {
    return `permission-denied`;
  }

  const combinedOutput = [record[`stderr`], record[`stdout`]]
    .filter((value): value is string => typeof value === `string` && value.length > 0)
    .join(`\n`);

  if (
    combinedOutput.includes(`Failed to connect to bus`) ||
    combinedOutput.includes(`System has not been booted with systemd`) ||
    combinedOutput.includes(`Failed to get D-Bus connection`)
  ) {
    return `manager-unavailable`;
  }

  return undefined;
}

export function classifyMaterializationReason(
  cause: unknown,
): UnitMaterializationErrorReason | undefined {
  if (cause === null || typeof cause !== `object`) {
    return undefined;
  }

  const record = cause as Record<string, unknown>;
  if (record[`code`] === `EACCES` || record[`code`] === `EPERM` || record[`code`] === `EROFS`) {
    return `permission-denied`;
  }

  if (record[`code`] === `EEXIST` || record[`code`] === `ENOTDIR` || record[`code`] === `EISDIR`) {
    return `invalid-unit-directory`;
  }

  return `file-system-failed`;
}

function extractCommandErrorDetails(cause: unknown): {
  readonly exitCode: number | undefined;
  readonly stderr: string | undefined;
  readonly stdout: string | undefined;
} {
  if (cause === null || typeof cause !== `object`) {
    return {
      exitCode: undefined,
      stderr: undefined,
      stdout: undefined,
    };
  }

  const record = cause as Record<string, unknown>;
  return {
    exitCode: typeof record[`code`] === `number` ? record[`code`] : undefined,
    stderr: typeof record[`stderr`] === `string` ? record[`stderr`] : undefined,
    stdout: typeof record[`stdout`] === `string` ? record[`stdout`] : undefined,
  };
}
