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
