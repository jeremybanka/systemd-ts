import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const tsgoPath = fileURLToPath(new URL(`../../node_modules/.bin/tsgo`, import.meta.url));

const config: ReturnType<typeof defineConfig> = defineConfig({
  pack: {
    entry: {
      index: `src/index.ts`,
      test: `src/test.ts`,
    },
    dts: {
      tsgo: {
        path: tsgoPath,
      },
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});

export default config;
