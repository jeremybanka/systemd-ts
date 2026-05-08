import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface UnitSection {
  readonly [key: string]: string | number | boolean | readonly string[] | undefined;
}

export interface ServiceUnitDefinition {
  readonly name?: string;
  readonly unit?: UnitSection;
  readonly service: UnitSection;
  readonly install?: UnitSection;
}

export interface TimerUnitDefinition {
  readonly name?: string;
  readonly unit?: UnitSection;
  readonly timer: UnitSection;
  readonly install?: UnitSection;
}

export interface InstallOptions {
  readonly directory: string;
  readonly name: string;
  readonly scope?: `system` | `user`;
  readonly service?: ServiceUnitDefinition;
  readonly timer?: TimerUnitDefinition;
}

export interface InstallResult {
  readonly directory: string;
  readonly servicePath?: string;
  readonly timerPath?: string;
}

export interface ServiceControlOptions {
  readonly scope?: `system` | `user`;
}

export interface LogsOptions {
  readonly scope?: `system` | `user`;
  readonly lines?: number;
}

export interface NotifyOptions {
  readonly pid?: number;
}

const REQUIRED_EXEC_KEYS = [`ExecStart`, `ExecStop`, `ExecReload`] as const;
type ScalarUnitValue = string | number | boolean;

export function defineService(service: ServiceUnitDefinition): ServiceUnitDefinition {
  return service;
}

export function defineTimer(timer: TimerUnitDefinition): TimerUnitDefinition {
  return timer;
}

export function renderServiceUnit(service: ServiceUnitDefinition): string {
  validateServiceUnit(service);
  return renderUnitFile([
    [`Unit`, service.unit],
    [`Service`, service.service],
    [`Install`, service.install],
  ]);
}

export function renderTimerUnit(timer: TimerUnitDefinition): string {
  return renderUnitFile([
    [`Unit`, timer.unit],
    [`Timer`, timer.timer],
    [`Install`, timer.install],
  ]);
}

export function suggestedServiceFilename(name: string): string {
  return ensureSuffix(name, `.service`);
}

export function suggestedTimerFilename(name: string): string {
  return ensureSuffix(name, `.timer`);
}

export function validateServiceUnit(service: ServiceUnitDefinition): void {
  for (const key of REQUIRED_EXEC_KEYS) {
    const value = service.service[key];
    if (typeof value === `string` && value.length > 0 && !value.startsWith(`/`)) {
      throw new Error(`${key} must use an absolute executable path for systemd`);
    }
  }
}

export function timerActivates(serviceName: string): string {
  return suggestedServiceFilename(serviceName);
}

export async function install(options: InstallOptions): Promise<InstallResult> {
  const serviceName = suggestedServiceFilename(options.name);
  const timerName = suggestedTimerFilename(options.name);

  if (options.service === undefined && options.timer === undefined) {
    throw new Error(`install() requires at least one of service or timer`);
  }

  await mkdir(options.directory, { recursive: true });

  let servicePath: string | undefined;
  let timerPath: string | undefined;

  if (options.service !== undefined) {
    servicePath = join(options.directory, serviceName);
    await writeFile(servicePath, renderServiceUnit(options.service), `utf8`);
  }

  if (options.timer !== undefined) {
    timerPath = join(options.directory, timerName);
    await writeFile(timerPath, renderTimerUnit(options.timer), `utf8`);
  }

  return {
    directory: options.directory,
    ...(servicePath === undefined ? {} : { servicePath }),
    ...(timerPath === undefined ? {} : { timerPath }),
  };
}

export async function enable(_options?: ServiceControlOptions): Promise<void> {
  throw new Error(`enable() has not been implemented yet`);
}

export async function start(_options?: ServiceControlOptions): Promise<void> {
  throw new Error(`start() has not been implemented yet`);
}

export async function logs(_options?: LogsOptions): Promise<string> {
  throw new Error(`logs() has not been implemented yet`);
}

export const notify = {
  async ready(_options?: NotifyOptions): Promise<void> {
    throw new Error(`notify.ready() has not been implemented yet`);
  },
  async watchdog(_options?: NotifyOptions): Promise<void> {
    throw new Error(`notify.watchdog() has not been implemented yet`);
  },
};

function ensureSuffix(name: string, suffix: `.service` | `.timer`): string {
  return name.endsWith(suffix) ? name : `${name}${suffix}`;
}

function renderUnitFile(
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

function isUnitValueList(value: UnitSection[string]): value is readonly string[] {
  return Array.isArray(value);
}

function stringifyUnitValue(value: ScalarUnitValue): string {
  if (typeof value === `boolean`) {
    return value ? `true` : `false`;
  }

  return String(value);
}
