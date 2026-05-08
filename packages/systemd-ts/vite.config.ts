import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

const tsgoPath = fileURLToPath(new URL(`../../node_modules/.bin/tsgo`, import.meta.url));

const config: ReturnType<typeof defineConfig> = defineConfig({
  pack: {
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
