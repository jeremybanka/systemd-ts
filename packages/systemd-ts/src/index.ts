import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

export interface UnitSection {
  readonly [key: string]: string | number | boolean | readonly string[] | undefined;
}

export interface SystemdServiceOptions {
  readonly install?: UnitSection;
  readonly name: string;
  readonly service: UnitSection;
  readonly unit?: UnitSection;
}

export interface SystemdTimerOptions {
  readonly install?: UnitSection;
  readonly name: string;
  readonly timer: UnitSection;
  readonly unit?: UnitSection;
}

export interface SystemdOptions {
  readonly executor?: CommandExecutor;
  readonly linkUnits?: boolean;
  readonly scope?: `system` | `user`;
  readonly unitDir?: string;
}

export interface CommandResult {
  readonly stderr: string;
  readonly stdout: string;
}

export type CommandExecutor = (command: string, args: readonly string[]) => Promise<CommandResult>;

export interface LogsOptions {
  readonly lines?: number;
}

export interface NotifyOptions {
  readonly pid?: number;
}

export type SystemdUnit = SystemdService | SystemdTimer;

export interface InstalledUnit {
  readonly path: string;
  readonly unit: SystemdUnit;
}

const REQUIRED_EXEC_KEYS = [`ExecStart`, `ExecStop`, `ExecReload`] as const;
const execFileAsync = promisify(execFile);

export class SystemdService {
  public readonly install: UnitSection | undefined;
  public readonly name: string;
  public readonly service: UnitSection;
  public readonly unit: UnitSection | undefined;

  public constructor(options: SystemdServiceOptions) {
    this.name = normalizeUnitName(options.name, `.service`);
    this.unit = cloneUnitSection(options.unit);
    this.service = cloneUnitSection(options.service) ?? {};
    this.install = cloneUnitSection(options.install);
    Object.freeze(this);
  }

  public get filename(): string {
    return `${this.name}.service`;
  }

  public render(): string {
    validateServiceSection(this.service);
    return renderUnitFile([
      [`Unit`, this.unit],
      [`Service`, this.service],
      [`Install`, this.install],
    ]);
  }
}

export class SystemdTimer {
  public readonly install: UnitSection | undefined;
  public readonly name: string;
  public readonly timer: UnitSection;
  public readonly unit: UnitSection | undefined;

  public constructor(options: SystemdTimerOptions) {
    this.name = normalizeUnitName(options.name, `.timer`);
    this.unit = cloneUnitSection(options.unit);
    this.timer = cloneUnitSection(options.timer) ?? {};
    this.install = cloneUnitSection(options.install);
    Object.freeze(this);
  }

  public get filename(): string {
    return `${this.name}.timer`;
  }

  public render(): string {
    return renderUnitFile([
      [`Unit`, this.unit],
      [`Timer`, this.timer],
      [`Install`, this.install],
    ]);
  }
}

export class SystemdInstallResult {
  public readonly directory: string;
  public readonly installed: readonly InstalledUnit[];
  private readonly pathByFilename: ReadonlyMap<string, string>;

  public constructor(directory: string, installed: readonly InstalledUnit[]) {
    this.directory = directory;
    this.installed = Object.freeze([...installed]);
    this.pathByFilename = new Map(installed.map((entry) => [entry.unit.filename, entry.path]));
    Object.freeze(this);
  }

  public pathFor(unit: SystemdUnit): string {
    const path = this.pathByFilename.get(unit.filename);
    if (path === undefined) {
      throw new Error(`No installed path is recorded for ${unit.filename}`);
    }

    return path;
  }
}

export class Systemd {
  public readonly executor: CommandExecutor;
  public readonly linkUnits: boolean;
  public readonly scope: `system` | `user`;
  public readonly unitDir: string;

  public constructor(options: SystemdOptions = {}) {
    this.scope = options.scope ?? `system`;
    this.unitDir = options.unitDir ?? defaultUnitDirForScope(this.scope);
    this.linkUnits = options.linkUnits ?? false;
    this.executor = options.executor ?? defaultCommandExecutor;
    Object.freeze(this);
  }

  public async install(...units: readonly SystemdUnit[]): Promise<SystemdInstallResult> {
    if (units.length === 0) {
      throw new Error(`Systemd.install() requires at least one service or timer`);
    }

    await mkdir(this.unitDir, { recursive: true });

    const installed: InstalledUnit[] = [];
    for (const unit of units) {
      const path = join(this.unitDir, unit.filename);
      await writeFile(path, unit.render(), `utf8`);
      installed.push({ path, unit });
    }

    return new SystemdInstallResult(this.unitDir, installed);
  }

  public async enable(...units: readonly SystemdUnit[]): Promise<void> {
    if (units.length === 0) {
      throw new Error(`Systemd.enable() requires at least one service or timer`);
    }

    const scopeArgs = this.scope === `user` ? [`--user`] : [];

    if (this.linkUnits) {
      for (const unit of units) {
        await this.executor(`systemctl`, [...scopeArgs, `link`, this.pathFor(unit)]);
      }
    }

    await this.executor(`systemctl`, [...scopeArgs, `daemon-reload`]);

    for (const unit of units) {
      await this.executor(`systemctl`, [...scopeArgs, `enable`, unit.filename]);
    }
  }

  public async start(_unit: SystemdUnit): Promise<void> {
    throw new Error(`Systemd.start() has not been implemented yet`);
  }

  public async logs(_unit: SystemdUnit, _options?: LogsOptions): Promise<string> {
    throw new Error(`Systemd.logs() has not been implemented yet`);
  }

  public pathFor(unit: SystemdUnit): string {
    return join(this.unitDir, unit.filename);
  }
}

let lazyDefaultSystemd: Systemd | undefined;

export function defaultSystemd(): Systemd {
  lazyDefaultSystemd ??= new Systemd();
  return lazyDefaultSystemd;
}

export const notify = {
  async ready(_options?: NotifyOptions): Promise<void> {
    throw new Error(`notify.ready() has not been implemented yet`);
  },
  async watchdog(_options?: NotifyOptions): Promise<void> {
    throw new Error(`notify.watchdog() has not been implemented yet`);
  },
};

function normalizeUnitName(name: string, suffix: `.service` | `.timer`): string {
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

function defaultUnitDirForScope(scope: `system` | `user`): string {
  if (scope === `user`) {
    return `${process.env[`HOME`] ?? `~`}/.config/systemd/user`;
  }

  return `/etc/systemd/system`;
}

function cloneUnitSection(section: UnitSection | undefined): UnitSection | undefined {
  if (section === undefined) {
    return undefined;
  }

  const entries = Object.entries(section).map(([key, value]) => {
    if (Array.isArray(value)) {
      return [key, Object.freeze([...value])] as const;
    }

    return [key, value] as const;
  });

  return Object.freeze(Object.fromEntries(entries));
}

function validateServiceSection(service: UnitSection): void {
  for (const key of REQUIRED_EXEC_KEYS) {
    const value = service[key];
    if (typeof value === `string` && value.length > 0 && !value.startsWith(`/`)) {
      throw new Error(`${key} must use an absolute executable path for systemd`);
    }
  }
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

function stringifyUnitValue(value: string | number | boolean): string {
  if (typeof value === `boolean`) {
    return value ? `true` : `false`;
  }

  return String(value);
}

function isUnitValueList(value: UnitSection[string]): value is readonly string[] {
  return Array.isArray(value);
}

async function defaultCommandExecutor(
  command: string,
  args: readonly string[],
): Promise<CommandResult> {
  const result = await execFileAsync(command, [...args]);
  return {
    stderr: result.stderr,
    stdout: result.stdout,
  };
}
