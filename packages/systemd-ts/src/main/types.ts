import type { Executable } from "./executable.ts";
import type { SystemdService } from "./systemd-service.ts";
import type { SystemdTimer } from "./systemd-timer.ts";

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
  readonly executor?: CommandExecutor;
  readonly pid?: number;
  readonly socketPath?: string;
  readonly status?: string;
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

export type StripUnitSuffix<
  Value extends string,
  Suffix extends string,
> = Value extends `${infer Base}${Suffix}` ? Base : Value;

export type ServiceBaseName<Value extends string> = StripUnitSuffix<Value, `.service`>;
export type TimerBaseName<Value extends string> = StripUnitSuffix<Value, `.timer`>;
export type ServiceFilename<Value extends string> = `${ServiceBaseName<Value>}.service`;
export type TimerFilename<Value extends string> = `${TimerBaseName<Value>}.timer`;

export type TimerTargetUnit<TOptions extends SystemdTimerOptions> = TOptions[`timer`] extends {
  readonly Unit: infer UnitName extends string;
}
  ? UnitName
  : ServiceFilename<TOptions[`name`]>;

export type TimerTargetServiceName<TOptions extends SystemdTimerOptions> =
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

export type ValidInstallUnits<TUnits extends readonly SystemdUnit[]> =
  HasMismatchedServiceTimerPairs<TUnits> extends true ? never : TUnits;

export type UnitValue = string | number | boolean | Executable;
