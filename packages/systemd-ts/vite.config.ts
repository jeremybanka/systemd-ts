import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const tsgoPath = fileURLToPath(new URL(`../../node_modules/.bin/tsgo`, import.meta.url));

const config: ReturnType<typeof defineConfig> = defineConfig({
  pack: {
    entry: {
      index: `src/main/index.ts`,
      test: `src/test/index.ts`,
    },
    sourcemap: true,
    dts: {
      generator: "tsgo",
      tsgo: {
        path: tsgoPath,
      },
    },
    exports: true,
    deps: { onlyBundle: [] },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  run: {
    tasks: {
      "test:task": {
        command: `vp test`,
        cache: {
          input: [
            { auto: true },
            { pattern: `!.colima/**`, base: `workspace` },
            { pattern: `!.docker/**`, base: `workspace` },
          ],
        },
      },
    },
  },
});

export default config;
