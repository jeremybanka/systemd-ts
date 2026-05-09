import {
  cloneUnitSection,
  freezeUnitOptions,
  normalizeUnitName,
  renderUnitFile,
  resolveTimerTargetUnit,
} from "./internal.ts";
import type {
  ExactSystemdTimerOptions,
  SystemdTimerOptions,
  TimerBaseName,
  TimerFilename,
  TimerTargetServiceName,
  TimerTargetUnit,
} from "./types.ts";

export class SystemdTimer<const TOptions extends SystemdTimerOptions = SystemdTimerOptions> {
  public readonly install: TOptions[`install`] | undefined;
  public readonly name: TimerBaseName<TOptions[`name`]>;
  public readonly options: Readonly<TOptions>;
  public readonly targetServiceName: TimerTargetServiceName<TOptions>;
  public readonly targetUnit: TimerTargetUnit<TOptions>;
  public readonly timer: TOptions[`timer`];
  public readonly unit: TOptions[`unit`] | undefined;

  public constructor(options: TOptions & ExactSystemdTimerOptions<TOptions>) {
    this.options = freezeUnitOptions(options as unknown as TOptions);
    this.name = normalizeUnitName(options.name, `.timer`) as TimerBaseName<TOptions[`name`]>;
    this.unit = cloneUnitSection(options.unit) as TOptions[`unit`] | undefined;
    this.timer = (cloneUnitSection(options.timer) ?? {}) as TOptions[`timer`];
    this.install = cloneUnitSection(options.install) as TOptions[`install`] | undefined;
    this.targetUnit = resolveTimerTargetUnit(
      options as unknown as TOptions,
    ) as TimerTargetUnit<TOptions>;
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
