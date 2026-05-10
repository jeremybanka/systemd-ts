import { NotifySendError } from "./errors.ts";
import { sendNotify, type Result } from "./internal.ts";
import type { NotifyOptions } from "./types.ts";

/**
 * Helpers for sending `sd_notify` state updates to systemd.
 *
 * These helpers send notification payloads to the socket identified by
 * `NOTIFY_SOCKET`, or to `options.socketPath` when one is provided explicitly.
 * They are useful both in real services and in tests that want to observe
 * readiness or watchdog traffic directly.
 *
 * Source:
 * - https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html
 * - https://www.freedesktop.org/software/systemd/man/latest/systemd-notify.html
 */
export const notify = {
  /**
   * Sends `READY=1` to systemd.
   *
   * Use this when a `Type=notify` service has completed its startup work and is
   * ready to be considered fully started. If `options.status` is provided, it is
   * sent as an additional `STATUS=...` field.
   */
  async ready(options: NotifyOptions = {}): Promise<Result<void, NotifySendError>> {
    try {
      await sendNotify(`READY=1`, options);
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof NotifySendError
            ? error
            : new NotifySendError(`Failed to send READY=1 notification`, {
                cause: error,
                stage: `ready`,
              }),
      };
    }
  },

  /**
   * Sends `WATCHDOG=1` to systemd.
   *
   * Use this when a service configured with `WatchdogSec=` needs to emit a
   * watchdog heartbeat. If `options.pid` is provided, it is sent as
   * `MAINPID=...`, and `options.status` is forwarded as `STATUS=...`.
   */
  async watchdog(options: NotifyOptions = {}): Promise<Result<void, NotifySendError>> {
    try {
      await sendNotify(`WATCHDOG=1`, options);
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof NotifySendError
            ? error
            : new NotifySendError(`Failed to send WATCHDOG=1 notification`, {
                cause: error,
                stage: `watchdog`,
              }),
      };
    }
  },
};
