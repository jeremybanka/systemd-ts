import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

import { InvalidExecDirectiveError, NotifySendError } from "./errors.ts";
import { Executable } from "./executable.ts";
import type {
  CommandOutput,
  NotifyOptions,
  SystemdServiceSection,
  StartStatus,
  SystemdServiceOptions,
  SystemdTimerOptions,
  UnitValue,
} from "./types.ts";

export type Result<TValue, TError> =
  | {
      readonly ok: true;
      readonly value: TValue;
    }
  | {
      readonly ok: false;
      readonly error: TError;
    };

type ExecDirectiveKey = (typeof EXEC_DIRECTIVE_KEYS)[number];

const EXEC_DIRECTIVE_KEYS = [
  `ExecCondition`,
  `ExecReload`,
  `ExecReloadPost`,
  `ExecStart`,
  `ExecStartPost`,
  `ExecStartPre`,
  `ExecStop`,
  `ExecStopPost`,
] as const;
const execFileAsync = promisify(execFile);
type SectionLike = object;

export function normalizeUnitName(name: string, suffix: `.service` | `.timer`): string {
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

export function resolveTimerTargetUnit(options: SystemdTimerOptions): string {
  const explicitTarget = options.timer[`Unit`];
  if (typeof explicitTarget === `string` && explicitTarget.length > 0) {
    return explicitTarget;
  }

  return `${normalizeUnitName(options.name, `.timer`)}.service`;
}

export function defaultUnitDirForScope(scope: `system` | `user`): string {
  if (scope === `user`) {
    return `${process.env[`HOME`] ?? `~`}/.config/systemd/user`;
  }

  return `/etc/systemd/system`;
}

export function freezeUnitOptions<TOptions extends SystemdServiceOptions | SystemdTimerOptions>(
  options: TOptions,
): Readonly<TOptions> {
  return Object.freeze({
    ...options,
    ...(options.unit === undefined ? {} : { unit: cloneUnitSection(options.unit) }),
    ...(options.install === undefined ? {} : { install: cloneUnitSection(options.install) }),
    ...(hasServiceSection(options) ? { service: cloneUnitSection(options.service) } : {}),
    ...(hasTimerSection(options) ? { timer: cloneUnitSection(options.timer) } : {}),
  }) as Readonly<TOptions>;
}

export function cloneUnitSection<TSection extends SectionLike | undefined>(
  section: TSection,
): TSection {
  if (section === undefined) {
    return section;
  }

  const entries = Object.entries(section).map(([key, value]) => {
    if (isUnitValueList(value)) {
      return [key, Object.freeze([...value])] as const;
    }

    return [key, value] as const;
  });

  return Object.freeze(Object.fromEntries(entries)) as TSection;
}

export function validateServiceSection(service: SystemdServiceSection): void {
  for (const key of EXEC_DIRECTIVE_KEYS) {
    assertAbsoluteExecValue(key, service[key]);
  }
}

export function parseStartStatus(unit: string, output: string): StartStatus {
  const properties = Object.fromEntries(
    output
      .split(`\n`)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const separatorIndex = line.indexOf(`=`);
        if (separatorIndex === -1) {
          return [line, ``] as const;
        }

        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)] as const;
      }),
  );

  return {
    activeState: properties[`ActiveState`] ?? `unknown`,
    execMainStatus:
      properties[`ExecMainStatus`] === undefined || properties[`ExecMainStatus`] === ``
        ? undefined
        : Number(properties[`ExecMainStatus`]),
    result: properties[`Result`] ?? `unknown`,
    subState: properties[`SubState`] ?? `unknown`,
    unit: properties[`Id`] ?? unit,
  };
}

export function renderUnitFile(
  sections: ReadonlyArray<readonly [string, SectionLike | undefined]>,
): string {
  const renderedSections = sections
    .flatMap(([sectionName, section]) => {
      if (section === undefined) {
        return [];
      }

      const lines = Object.entries(section as Record<string, unknown>).flatMap(([key, value]) => {
        if (value === undefined) {
          return [];
        }

        if (isUnitValueList(value)) {
          return value.map((entry) => `${key}=${stringifyUnitValue(entry)}`);
        }

        return `${key}=${stringifyUnitValue(value as UnitValue)}`;
      });

      if (lines.length === 0) {
        return [];
      }

      return [`[${sectionName}]`, ...lines, ``];
    })
    .join(`\n`);

  return renderedSections.endsWith(`\n`) ? renderedSections : `${renderedSections}\n`;
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
}

export async function defaultCommandExecutor(
  command: string,
  args: readonly string[],
): Promise<CommandOutput> {
  const result = await execFileAsync(command, [...args]);
  return {
    stderr: result.stderr,
    stdout: result.stdout,
  };
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function sendNotify(
  state: `READY=1` | `WATCHDOG=1`,
  options: NotifyOptions,
): Promise<void> {
  const args: string[] = [state];
  if (options.pid !== undefined) {
    args.push(`MAINPID=${options.pid}`);
  }
  if (options.status !== undefined) {
    args.push(`STATUS=${options.status}`);
  }

  if (options.executor !== undefined) {
    const command = buildNotifyShellCommand(args, options.socketPath);
    try {
      await options.executor(`bash`, [`-lc`, command]);
    } catch (cause) {
      throw new NotifySendError(
        `Failed to send systemd notification through the configured executor`,
        {
          args: [`-lc`, command],
          cause,
          command: `bash`,
          stage: `executor`,
        },
      );
    }
    return;
  }

  try {
    const result = await execFileAsync(`systemd-notify`, args, {
      env: {
        ...process.env,
        ...(options.socketPath === undefined ? {} : { NOTIFY_SOCKET: options.socketPath }),
      },
    });

    void result;
  } catch (cause) {
    throw new NotifySendError(`Failed to send systemd notification with systemd-notify`, {
      args,
      cause,
      command: `systemd-notify`,
      stage: `systemd-notify`,
    });
  }
}

function hasServiceSection(
  options: SystemdServiceOptions | SystemdTimerOptions,
): options is SystemdServiceOptions {
  return `service` in options;
}

function hasTimerSection(
  options: SystemdServiceOptions | SystemdTimerOptions,
): options is SystemdTimerOptions {
  return `timer` in options;
}

function assertAbsoluteExecValue(key: ExecDirectiveKey, value: unknown): void {
  if (isUnitValueList(value)) {
    for (const entry of value) {
      assertAbsoluteExecEntry(key, entry);
    }

    return;
  }

  assertAbsoluteExecEntry(key, value as UnitValue | undefined);
}

function assertAbsoluteExecEntry(key: ExecDirectiveKey, value: UnitValue | undefined): void {
  if (typeof value === `string` && value.length > 0 && !isAbsoluteExecCommand(value)) {
    throw new InvalidExecDirectiveError(key);
  }

  if (value instanceof Executable && !value.runtimeEntrypoint.startsWith(`/`)) {
    throw new InvalidExecDirectiveError(key);
  }
}

function stringifyUnitValue(value: UnitValue): string {
  if (value instanceof Executable) {
    return value.toExecStart();
  }

  if (typeof value === `boolean`) {
    return value ? `true` : `false`;
  }

  return String(value);
}

function isUnitValueList(value: unknown): value is readonly UnitValue[] {
  return Array.isArray(value);
}

function isAbsoluteExecCommand(value: string): boolean {
  let index = 0;
  let hasPrivilegePrefix = false;

  while (index < value.length) {
    const prefix = value[index];
    if (prefix === `@` || prefix === `-` || prefix === `:`) {
      index += 1;
      continue;
    }

    if (prefix === `+`) {
      if (hasPrivilegePrefix) {
        return false;
      }

      hasPrivilegePrefix = true;
      index += 1;
      continue;
    }

    if (prefix === `!`) {
      if (hasPrivilegePrefix) {
        return false;
      }

      hasPrivilegePrefix = true;
      index += value[index + 1] === `!` ? 2 : 1;
      continue;
    }

    break;
  }

  return value[index] === `/`;
}

function buildNotifyShellCommand(args: readonly string[], socketPath: string | undefined): string {
  const prefix = socketPath === undefined ? `` : `NOTIFY_SOCKET=${shellQuote(socketPath)} `;
  const command = [`systemd-notify`, ...args].map(shellQuote).join(` `);
  return `${prefix}${command}`;
}
