import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": ["dprint fmt --allow-no-files", "vp check --no-fmt --fix"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  run: {
    cache: true,
  },
});
