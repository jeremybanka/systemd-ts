import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

import { Executable } from "./executable.ts";
import type {
  AnySystemdService,
  CommandResult,
  NotifyOptions,
  StartResult,
  SystemdServiceOptions,
  SystemdTimerOptions,
  SystemdUnit,
  UnitSection,
  UnitValue,
} from "./types.ts";
import { SystemdService } from "./systemd-service.ts";
import { SystemdTimer } from "./systemd-timer.ts";

type RequiredExecKey = (typeof REQUIRED_EXEC_KEYS)[number];

const REQUIRED_EXEC_KEYS = [`ExecStart`, `ExecStop`, `ExecReload`] as const;
const execFileAsync = promisify(execFile);
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

export function cloneUnitSection<TSection extends UnitSection | undefined>(
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

export function validateServiceSection(service: UnitSection): void {
  for (const key of REQUIRED_EXEC_KEYS) {
    assertAbsoluteExecValue(key, service[key]);
  }
}

export function assertInstallableTogether(units: readonly SystemdUnit[]): void {
  const installedServices = new Set(
    units
      .filter((unit): unit is AnySystemdService => unit instanceof SystemdService)
      .map((unit) => unit.name),
  );

  if (installedServices.size === 0) {
    return;
  }

  for (const unit of units) {
    if (!(unit instanceof SystemdTimer)) {
      continue;
    }

    if (!installedServices.has(unit.targetServiceName)) {
      throw new Error(
        `Cannot install ${unit.filename} alongside unrelated services: expected ${unit.targetUnit}`,
      );
    }
  }
}

export function parseStartResult(unit: string, output: string): StartResult {
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
  sections: ReadonlyArray<readonly [string, UnitSection | undefined]>,
): string {
  const renderedSections = sections
    .flatMap(([sectionName, section]) => {
      if (section === undefined) {
        return [];
      }

      const lines = Object.entries(section).flatMap(([key, value]) => {
        if (value === undefined) {
          return [];
        }

        if (isUnitValueList(value)) {
          return value.map((entry) => `${key}=${stringifyUnitValue(entry)}`);
        }

        return `${key}=${stringifyUnitValue(value)}`;
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
): Promise<CommandResult> {
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
    await options.executor(`bash`, [`-lc`, command]);
    return;
  }

  const result = await execFileAsync(`systemd-notify`, args, {
    env: {
      ...process.env,
      ...(options.socketPath === undefined ? {} : { NOTIFY_SOCKET: options.socketPath }),
    },
  });

  void result;
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

function assertAbsoluteExecValue(key: RequiredExecKey, value: UnitSection[string]): void {
  if (typeof value === `string` && value.length > 0 && !value.startsWith(`/`)) {
    throw new Error(`${key} must use an absolute executable path for systemd`);
  }

  if (value instanceof Executable && !value.runtimeEntrypoint.startsWith(`/`)) {
    throw new Error(`${key} must use an absolute executable path for systemd`);
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

function isUnitValueList(value: UnitSection[string]): value is readonly UnitValue[] {
  return Array.isArray(value);
}

function buildNotifyShellCommand(args: readonly string[], socketPath: string | undefined): string {
  const prefix = socketPath === undefined ? `` : `NOTIFY_SOCKET=${shellQuote(socketPath)} `;
  const command = [`systemd-notify`, ...args].map(shellQuote).join(` `);
  return `${prefix}${command}`;
}
