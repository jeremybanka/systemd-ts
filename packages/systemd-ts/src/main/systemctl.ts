import { defaultCommandExecutor } from "./internal.ts";
import type {
  CommandExecutor,
  CommandOutput,
  SystemctlOptions,
  SystemctlShowOptions,
  SystemctlStatusOptions,
} from "./types.ts";

/**
 * A TypeScript-first client for invoking `systemctl` with structured argument
 * vectors instead of shell-composed command strings.
 *
 * This lower-level primitive is useful both on its own and as the subprocess
 * transport underneath higher-level abstractions such as {@link Systemd}.
 */
export class Systemctl {
  /** Command executor used for `systemctl` subprocesses. */
  public readonly executor: CommandExecutor;
  /** The target manager scope, either `system` or `user`. */
  public readonly scope: `system` | `user`;

  public constructor(options: SystemctlOptions = {}) {
    this.scope = options.scope ?? `system`;
    this.executor = options.executor ?? defaultCommandExecutor;
    Object.freeze(this);
  }

  /** Reloads the targeted systemd manager. */
  public async daemonReload(): Promise<CommandOutput> {
    return this.run(`daemon-reload`);
  }

  /** Enables a unit by filename. */
  public async enable(unit: string): Promise<CommandOutput> {
    return this.run(`enable`, unit);
  }

  /** Links a unit file path into the targeted manager. */
  public async link(path: string): Promise<CommandOutput> {
    return this.run(`link`, path);
  }

  /**
   * Queries `systemctl show` for a unit.
   *
   * When `properties` are provided, only those properties are requested.
   */
  public async show(unit: string, options: SystemctlShowOptions = {}): Promise<CommandOutput> {
    const propertyFlag =
      options.properties === undefined || options.properties.length === 0
        ? []
        : [`--property=${options.properties.join(`,`)}`];
    return this.run(`show`, unit, ...propertyFlag);
  }

  /** Starts a unit by filename. */
  public async start(unit: string): Promise<CommandOutput> {
    return this.run(`start`, unit);
  }

  /**
   * Queries `systemctl status` for a unit.
   *
   * This is primarily a human-oriented command and is best paired with
   * `show()` when structured state is needed.
   */
  public async status(unit: string, options: SystemctlStatusOptions = {}): Promise<CommandOutput> {
    const args = [`status`, unit] as string[];
    if (options.noPager ?? true) {
      args.push(`--no-pager`);
    }
    if (options.lines !== undefined) {
      args.push(`--lines`, String(options.lines));
    }

    return this.run(...args);
  }

  /** Executes a raw `systemctl` invocation with scope-aware arguments. */
  public async run(...args: readonly string[]): Promise<CommandOutput> {
    return this.executor(`systemctl`, [...this.scopeArgs(), ...args]);
  }

  private scopeArgs(): readonly string[] {
    return this.scope === `user` ? [`--user`] : [];
  }
}
