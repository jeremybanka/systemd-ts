import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export interface UnitSection {
  readonly [key: string]: UnitValue | readonly UnitValue[] | undefined;
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

export interface StartResult {
  readonly activeState: string;
  readonly execMainStatus: number | undefined;
  readonly result: string;
  readonly subState: string;
  readonly unit: string;
}

export interface ExecutableOptions {
  readonly args?: readonly string[];
  readonly modulePath?: string;
  readonly runtimeEntrypoint?: string;
}

type StripUnitSuffix<
  Value extends string,
  Suffix extends string,
> = Value extends `${infer Base}${Suffix}` ? Base : Value;

type ServiceBaseName<Value extends string> = StripUnitSuffix<Value, `.service`>;
type TimerBaseName<Value extends string> = StripUnitSuffix<Value, `.timer`>;
type ServiceFilename<Value extends string> = `${ServiceBaseName<Value>}.service`;
type TimerFilename<Value extends string> = `${TimerBaseName<Value>}.timer`;

type TimerTargetUnit<TOptions extends SystemdTimerOptions> = TOptions[`timer`] extends {
  readonly Unit: infer UnitName extends string;
}
  ? UnitName
  : ServiceFilename<TOptions[`name`]>;

type TimerTargetServiceName<TOptions extends SystemdTimerOptions> =
  TimerTargetUnit<TOptions> extends `${infer Base}.service` ? Base : never;

type IsWideString<Value extends string> = string extends Value ? true : false;

export type AnySystemdService = SystemdService<SystemdServiceOptions>;
export type AnySystemdTimer = SystemdTimer<SystemdTimerOptions>;
export type SystemdUnit = AnySystemdService | AnySystemdTimer;

export interface InstalledUnit<TUnit extends SystemdUnit = SystemdUnit> {
  readonly path: string;
  readonly unit: TUnit;
}

type ServiceNamesIn<TUnits extends readonly SystemdUnit[]> = TUnits[number] extends infer TUnit
  ? TUnit extends AnySystemdService
    ? TUnit[`name`]
    : never
  : never;

type TimerMatchesAnyService<TTimer extends AnySystemdTimer, TServiceNames extends string> =
  IsWideString<TimerTargetServiceName<TTimer[`options`]>> extends true
    ? true
    : IsWideString<TServiceNames> extends true
      ? true
      : [Extract<TServiceNames, TimerTargetServiceName<TTimer[`options`]>>] extends [never]
        ? false
        : true;

type MismatchedTimers<TUnits extends readonly SystemdUnit[]> = TUnits[number] extends infer TUnit
  ? TUnit extends AnySystemdTimer
    ? TimerMatchesAnyService<TUnit, ServiceNamesIn<TUnits>> extends true
      ? never
      : TUnit
    : never
  : never;

type HasServices<TUnits extends readonly SystemdUnit[]> = [ServiceNamesIn<TUnits>] extends [never]
  ? false
  : true;

type HasMismatchedServiceTimerPairs<TUnits extends readonly SystemdUnit[]> =
  HasServices<TUnits> extends true
    ? [MismatchedTimers<TUnits>] extends [never]
      ? false
      : true
    : false;

type ValidInstallUnits<TUnits extends readonly SystemdUnit[]> =
  HasMismatchedServiceTimerPairs<TUnits> extends true ? never : TUnits;

const REQUIRED_EXEC_KEYS = [`ExecStart`, `ExecStop`, `ExecReload`] as const;
const execFileAsync = promisify(execFile);
const currentModulePath = fileURLToPath(import.meta.url);

export type UnitValue = string | number | boolean | Executable;

export class Executable {
  public readonly args: readonly string[];
  public readonly modulePath: string;
  public readonly runtimeEntrypoint: string;

  public constructor(options: ExecutableOptions = {}) {
    this.runtimeEntrypoint = options.runtimeEntrypoint ?? process.execPath;
    this.modulePath = options.modulePath ?? inferCallerModulePath();
    this.args = Object.freeze([...(options.args ?? [])]);
    Object.freeze(this);
  }

  public toCommandParts(): readonly [string, ...string[]] {
    return [this.runtimeEntrypoint, this.modulePath, ...this.args];
  }

  public toExecStart(): string {
    return this.toCommandParts().map(shellQuote).join(` `);
  }
}

export class SystemdService<const TOptions extends SystemdServiceOptions = SystemdServiceOptions> {
  public readonly install: TOptions[`install`] | undefined;
  public readonly name: ServiceBaseName<TOptions[`name`]>;
  public readonly options: Readonly<TOptions>;
  public readonly service: TOptions[`service`];
  public readonly unit: TOptions[`unit`] | undefined;

  public constructor(options: TOptions) {
    this.options = freezeUnitOptions(options);
    this.name = normalizeUnitName(options.name, `.service`) as ServiceBaseName<TOptions[`name`]>;
    this.unit = cloneUnitSection(options.unit) as TOptions[`unit`] | undefined;
    this.service = (cloneUnitSection(options.service) ?? {}) as TOptions[`service`];
    this.install = cloneUnitSection(options.install) as TOptions[`install`] | undefined;
    Object.freeze(this);
  }

  public get filename(): ServiceFilename<TOptions[`name`]> {
    return `${this.name}.service` as ServiceFilename<TOptions[`name`]>;
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

export class SystemdTimer<const TOptions extends SystemdTimerOptions = SystemdTimerOptions> {
  public readonly install: TOptions[`install`] | undefined;
  public readonly name: TimerBaseName<TOptions[`name`]>;
  public readonly options: Readonly<TOptions>;
  public readonly targetServiceName: TimerTargetServiceName<TOptions>;
  public readonly targetUnit: TimerTargetUnit<TOptions>;
  public readonly timer: TOptions[`timer`];
  public readonly unit: TOptions[`unit`] | undefined;

  public constructor(options: TOptions) {
    this.options = freezeUnitOptions(options);
    this.name = normalizeUnitName(options.name, `.timer`) as TimerBaseName<TOptions[`name`]>;
    this.unit = cloneUnitSection(options.unit) as TOptions[`unit`] | undefined;
    this.timer = (cloneUnitSection(options.timer) ?? {}) as TOptions[`timer`];
    this.install = cloneUnitSection(options.install) as TOptions[`install`] | undefined;
    this.targetUnit = resolveTimerTargetUnit(options) as TimerTargetUnit<TOptions>;
    this.targetServiceName = normalizeUnitName(
      this.targetUnit,
      `.service`,
    ) as TimerTargetServiceName<TOptions>;
    Object.freeze(this);
  }

  public get filename(): TimerFilename<TOptions[`name`]> {
    return `${this.name}.timer` as TimerFilename<TOptions[`name`]>;
  }

  public render(): string {
    return renderUnitFile([
      [`Unit`, this.unit],
      [`Timer`, this.timer],
      [`Install`, this.install],
    ]);
  }
}

export class SystemdInstallResult<TUnits extends readonly SystemdUnit[] = readonly SystemdUnit[]> {
  public readonly directory: string;
  public readonly installed: readonly InstalledUnit<TUnits[number]>[];
  private readonly pathByFilename: ReadonlyMap<string, string>;

  public constructor(directory: string, installed: readonly InstalledUnit<TUnits[number]>[]) {
    this.directory = directory;
    this.installed = Object.freeze([...installed]);
    this.pathByFilename = new Map(installed.map((entry) => [entry.unit.filename, entry.path]));
    Object.freeze(this);
  }

  public pathFor(unit: TUnits[number]): string {
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

  public async install<const TUnits extends readonly SystemdUnit[]>(
    ...units: ValidInstallUnits<TUnits>
  ): Promise<SystemdInstallResult<TUnits>> {
    if (units.length === 0) {
      throw new Error(`Systemd.install() requires at least one service or timer`);
    }

    assertInstallableTogether(units);
    await mkdir(this.unitDir, { recursive: true });

    const installed: InstalledUnit<TUnits[number]>[] = [];
    for (const unit of units) {
      const path = join(this.unitDir, unit.filename);
      await writeFile(path, unit.render(), `utf8`);
      installed.push({ path, unit });
    }

    return new SystemdInstallResult<TUnits>(this.unitDir, installed);
  }

  public async enable(...units: readonly SystemdUnit[]): Promise<void> {
    if (units.length === 0) {
      throw new Error(`Systemd.enable() requires at least one service or timer`);
    }

    const scopeArgs = this.scopeArgs();
    await this.prepareUnits(scopeArgs, units);

    for (const unit of units) {
      await this.executor(`systemctl`, [...scopeArgs, `enable`, unit.filename]);
    }
  }

  public async start(unit: SystemdUnit): Promise<StartResult> {
    const scopeArgs = this.scopeArgs();
    await this.prepareUnits(scopeArgs, [unit]);
    await this.executor(`systemctl`, [...scopeArgs, `start`, unit.filename]);

    const status = await this.executor(`systemctl`, [
      ...scopeArgs,
      `show`,
      unit.filename,
      `--property=Id,ActiveState,SubState,Result,ExecMainStatus`,
    ]);

    return parseStartResult(unit.filename, status.stdout);
  }

  public async logs(_unit: SystemdUnit, _options?: LogsOptions): Promise<string> {
    const fileLogPath = resolveUnitLogPath(_unit);
    if (fileLogPath !== undefined) {
      const output = await readFile(fileLogPath, `utf8`);
      return tailLines(output, _options?.lines ?? 50);
    }

    const scopeArgs = this.scopeArgs();
    const lines = _options?.lines ?? 50;
    const command = [
      `systemctl`,
      ...scopeArgs,
      `status`,
      _unit.filename,
      `--no-pager`,
      `--lines`,
      String(lines),
    ]
      .map(shellQuote)
      .join(` `);
    const logs = await this.executor(`bash`, [`-lc`, `${command} || true`]);

    return logs.stdout;
  }

  public pathFor(unit: SystemdUnit): string {
    return join(this.unitDir, unit.filename);
  }

  private async prepareUnits(
    scopeArgs: readonly string[],
    units: readonly SystemdUnit[],
  ): Promise<void> {
    if (this.linkUnits) {
      for (const unit of units) {
        await this.executor(`systemctl`, [...scopeArgs, `link`, this.pathFor(unit)]);
      }
    }

    await this.executor(`systemctl`, [...scopeArgs, `daemon-reload`]);
  }

  private scopeArgs(): readonly string[] {
    return this.scope === `user` ? [`--user`] : [];
  }
}

function resolveUnitLogPath(unit: SystemdUnit): string | undefined {
  if (!(unit instanceof SystemdService)) {
    return undefined;
  }

  for (const key of [`StandardOutput`, `StandardError`] as const) {
    const value = unit.service[key];
    if (typeof value !== `string`) {
      continue;
    }

    const path = parseFileLogPath(value);
    if (path !== undefined) {
      return path;
    }
  }

  return undefined;
}

function parseFileLogPath(value: string): string | undefined {
  for (const prefix of [`append:`, `file:`] as const) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  return undefined;
}

function tailLines(output: string, lines: number): string {
  return output.split(`\n`).slice(-lines).join(`\n`);
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

export function defineExecutable(
  fn: () => void | Promise<void>,
  options: ExecutableOptions = {},
): Executable {
  const executable = new Executable(options);

  if (isMainModule(executable.modulePath)) {
    void Promise.resolve(fn()).catch((error: unknown) => {
      process.exitCode = 1;
      throw error;
    });
  }

  return executable;
}

function normalizeUnitName(name: string, suffix: `.service` | `.timer`): string {
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

function resolveTimerTargetUnit(options: SystemdTimerOptions): string {
  const explicitTarget = options.timer[`Unit`];
  if (typeof explicitTarget === `string` && explicitTarget.length > 0) {
    return explicitTarget;
  }

  return `${normalizeUnitName(options.name, `.timer`)}.service`;
}

function defaultUnitDirForScope(scope: `system` | `user`): string {
  if (scope === `user`) {
    return `${process.env[`HOME`] ?? `~`}/.config/systemd/user`;
  }

  return `/etc/systemd/system`;
}

function freezeUnitOptions<TOptions extends SystemdServiceOptions | SystemdTimerOptions>(
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

function cloneUnitSection<TSection extends UnitSection | undefined>(section: TSection): TSection {
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

function validateServiceSection(service: UnitSection): void {
  for (const key of REQUIRED_EXEC_KEYS) {
    const value = service[key];
    if (typeof value === `string` && value.length > 0 && !value.startsWith(`/`)) {
      throw new Error(`${key} must use an absolute executable path for systemd`);
    }

    if (value instanceof Executable && !value.runtimeEntrypoint.startsWith(`/`)) {
      throw new Error(`${key} must use an absolute executable path for systemd`);
    }
  }
}

function assertInstallableTogether(units: readonly SystemdUnit[]): void {
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

function parseStartResult(unit: string, output: string): StartResult {
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

function inferCallerModulePath(): string {
  const stack = new Error().stack ?? ``;
  for (const line of stack.split(`\n`).slice(1)) {
    const candidate = extractStackPath(line);
    if (candidate === undefined || candidate === currentModulePath) {
      continue;
    }

    return candidate;
  }

  throw new Error(
    `Could not infer the calling module path for defineExecutable(); pass { modulePath } explicitly`,
  );
}

function extractStackPath(line: string): string | undefined {
  const fileUrlMatch = line.match(/(file:\/\/\/[^)\s:]+(?:\.[cm]?[jt]s)?)/u);
  if (fileUrlMatch !== null) {
    return fileURLToPath(fileUrlMatch[1]);
  }

  const pathMatch = line.match(/(\/[^)\s:]+(?:\.[cm]?[jt]s)?)/u);
  if (pathMatch !== null) {
    return pathMatch[1];
  }

  return undefined;
}

function isMainModule(modulePath: string): boolean {
  const mainArg = process.argv[1];
  if (mainArg === undefined) {
    return false;
  }

  return normalizeFilePath(mainArg) === normalizeFilePath(modulePath);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
}

function normalizeFilePath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
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
