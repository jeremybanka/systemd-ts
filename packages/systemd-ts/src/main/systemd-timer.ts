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

/**
 * An immutable definition of a `.timer` unit.
 *
 * Like {@link SystemdService}, this is a pure value object. It models the timer
 * configuration and its attachment target, but does not write files or interact
 * with the service manager directly.
 *
 * Source:
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
 */
export class SystemdTimer<const TOptions extends SystemdTimerOptions = SystemdTimerOptions> {
  /** Optional `[Install]` section for enable-time relationships. */
  public readonly install: TOptions[`install`] | undefined;
  /** The normalized base unit name, without the `.timer` suffix. */
  public readonly name: TimerBaseName<TOptions[`name`]>;
  /** The fully frozen original options used to construct this timer. */
  public readonly options: Readonly<TOptions>;
  /** The attached service basename inferred from `targetUnit`. */
  public readonly targetServiceName: TimerTargetServiceName<TOptions>;
  /** The unit name this timer activates, explicit or implicit. */
  public readonly targetUnit: TimerTargetUnit<TOptions>;
  /** The `[Timer]` section payload. */
  public readonly timer: TOptions[`timer`];
  /** Optional `[Unit]` section metadata and dependency configuration. */
  public readonly unit: TOptions[`unit`] | undefined;

  /**
   * Creates an immutable timer definition.
   *
   * If no explicit `timer.Unit` is provided, the target defaults to the service
   * with the same basename, matching systemd's native timer behavior.
   */
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

  /** The canonical unit filename, including the `.timer` suffix. */
  public get filename(): TimerFilename<TOptions[`name`]> {
    return `${this.name}.timer` as TimerFilename<TOptions[`name`]>;
  }

  /** Renders the timer as a complete unit file. */
  public render(): string {
    return renderUnitFile([
      [`Unit`, this.unit],
      [`Timer`, this.timer],
      [`Install`, this.install],
    ]);
  }
}
