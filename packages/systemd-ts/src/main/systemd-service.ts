import {
  cloneUnitSection,
  freezeUnitOptions,
  normalizeUnitName,
  renderUnitFile,
  validateServiceSection,
} from "./internal.ts";
import type { ServiceBaseName, ServiceFilename, SystemdServiceOptions } from "./types.ts";

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
