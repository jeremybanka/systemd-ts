import { afterEach, beforeAll, beforeEach } from "vite-plus/test";

import { ensureTestHost } from "../src/testing/host.ts";
import { createTestSandbox, destroyCurrentTestSandbox } from "../src/testing/sandbox.ts";

beforeAll(async () => {
  await ensureTestHost();
});

beforeEach(async (context) => {
  await createTestSandbox(context.task.name);
});

afterEach(async () => {
  await destroyCurrentTestSandbox();
});
