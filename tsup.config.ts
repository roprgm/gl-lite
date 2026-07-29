import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Published unminified with sourcemaps: consumers minify their own bundles,
  // and shipping pre-minified code only costs them a readable stack trace.
  sourcemap: true,
});
