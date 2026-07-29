import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    // Point at the source so the examples run against local changes with no
    // build step and no `bun link` to set up first.
    alias: {
      "gl-lite": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
});
