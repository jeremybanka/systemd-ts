import {
  Systemd,
  type CommandExecutionOptions,
  type CommandExecutor,
  type CommandOutput,
} from "../main/index.ts";

import { runGuestCommand, runIsolatedGuestCommand } from "./host.ts";
import { useCurrentTestSandbox } from "./sandbox.ts";

/**
 * Creates a command executor that runs argv-style commands inside the current
 * test host guest shell.
 */
export function createGuestCommandExecutor(
  runCommand: (script: string) => Promise<string>,
): CommandExecutor {
  return async (
    command: string,
    args: readonly string[],
    options: CommandExecutionOptions = {},
  ): Promise<CommandOutput> => {
    try {
      const stdout = await runCommand(buildGuestCommand(command, args, options));
      return {
        stderr: ``,
        stdout,
      };
    } catch (cause) {
      throw enrichGuestCommandError(cause);
    }
  };
}

/**
 * Executor that reuses the warm guest shell for fast sandbox-backed tests.
 */
export const guestCommandExecutor: CommandExecutor = createGuestCommandExecutor(runGuestCommand);

/**
 * Executor that runs each guest command in a fresh isolated guest shell.
 */
export const isolatedGuestCommandExecutor: CommandExecutor =
  createGuestCommandExecutor(runIsolatedGuestCommand);

/**
 * Creates a `Systemd` instance scoped to the active test sandbox and backed by
 * the warm guest-shell executor.
 */
export function sandboxSystemd(): Systemd {
  const sandbox = useCurrentTestSandbox();
  return new Systemd({
    executor: guestCommandExecutor,
    linkUnits: true,
    scope: `user`,
    unitDir: sandbox.linkedUnitDir,
  });
}

/**
 * Creates a `Systemd` instance scoped to the active test sandbox and backed by
 * a fresh guest shell per command.
 */
export function isolatedSandboxSystemd(): Systemd {
  const sandbox = useCurrentTestSandbox();
  return new Systemd({
    executor: isolatedGuestCommandExecutor,
    linkUnits: true,
    scope: `user`,
    unitDir: sandbox.linkedUnitDir,
  });
}

function buildGuestCommand(
  command: string,
  args: readonly string[],
  options: CommandExecutionOptions,
): string {
  const envArgs =
    options.env === undefined
      ? []
      : Object.entries(options.env).flatMap(([key, value]) =>
          value === undefined ? [`-u`, key] : [`${key}=${value}`],
        );

  return [`env`, ...envArgs, command, ...args].map((part) => shellQuote(part)).join(` `);
}

function enrichGuestCommandError(cause: unknown): Error {
  if (cause instanceof Error) {
    return Object.assign(cause, {
      code: 1,
      stderr: ``,
      stdout: cause.message,
    });
  }

  return Object.assign(new Error(`Guest command failed`), {
    code: 1,
    stderr: ``,
    stdout: ``,
  });
}

function shellQuote(value: string): string {
  return `'${value.replaceAll(`'`, `'\\''`)}'`;
}
