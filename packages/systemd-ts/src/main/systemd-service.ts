import {
  cloneUnitSection,
  freezeUnitOptions,
  normalizeUnitName,
  renderUnitFile,
  validateServiceSection,
} from "./internal.ts";
import type { ExecutableInferenceError, InvalidExecDirectiveError } from "./errors.ts";
import type { Result } from "./internal.ts";
import type {
  ExactSystemdServiceOptions,
  ServiceBaseName,
  ServiceFilename,
  SystemdServiceOptions,
} from "./types.ts";

/**
 * An immutable definition of a `.service` unit.
 *
 * `SystemdService` is a pure value object: it captures the intended unit name
 * and section contents, but it does not write files or talk to `systemd`
 * directly. Operational actions such as installation or startup belong on
 * {@link Systemd}.
 *
 * Source:
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
 */
export class SystemdService<const TOptions extends SystemdServiceOptions = SystemdServiceOptions> {
  /** Optional `[Install]` section for enable-time relationships. */
  public readonly install: TOptions[`install`] | undefined;
  /** The normalized base unit name, without the `.service` suffix. */
  public readonly name: ServiceBaseName<TOptions[`name`]>;
  /** The fully frozen original options used to construct this service. */
  public readonly options: Readonly<TOptions>;
  /** The `[Service]` section payload. */
  public readonly service: TOptions[`service`];
  /** Optional `[Unit]` section metadata and dependency configuration. */
  public readonly unit: TOptions[`unit`] | undefined;

  /**
   * Creates an immutable service definition.
   *
   * The constructor preserves literal types where possible and rejects unknown
   * directive names within the provided sections, while still allowing custom
   * `X-...` extension directives.
   */
  public constructor(options: TOptions & ExactSystemdServiceOptions<TOptions>) {
    this.options = freezeUnitOptions(options as unknown as TOptions);
    this.name = normalizeUnitName(options.name, `.service`) as ServiceBaseName<TOptions[`name`]>;
    this.unit = cloneUnitSection(options.unit) as TOptions[`unit`] | undefined;
    this.service = (cloneUnitSection(options.service) ?? {}) as TOptions[`service`];
    this.install = cloneUnitSection(options.install) as TOptions[`install`] | undefined;
    Object.freeze(this);
  }

  /** The canonical unit filename, including the `.service` suffix. */
  public get filename(): ServiceFilename<TOptions[`name`]> {
    return `${this.name}.service` as ServiceFilename<TOptions[`name`]>;
  }

  /**
   * Renders the service as a complete unit file.
   *
   * Rendering also validates executable-valued directives such as `ExecStart`
   * and `ExecStop`, ensuring they use absolute runtime entrypoints as required
   * by systemd.
   */
  public render(): Result<string, ExecutableInferenceError | InvalidExecDirectiveError> {
    const validation = validateServiceSection(this.service);
    if (!validation.ok) {
      return validation;
    }

    return renderUnitFile([
      [`Unit`, this.unit],
      [`Service`, this.service],
      [`Install`, this.install],
    ]);
  }
}
