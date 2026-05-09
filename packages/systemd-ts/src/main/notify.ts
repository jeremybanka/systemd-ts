import { sendNotify } from "./internal.ts";
import type { NotifyOptions } from "./types.ts";

export const notify = {
  async ready(options: NotifyOptions = {}): Promise<void> {
    await sendNotify(`READY=1`, options);
  },
  async watchdog(options: NotifyOptions = {}): Promise<void> {
    await sendNotify(`WATCHDOG=1`, options);
  },
};
