/**
 * Browser-side entry point: imports every suite, runs them, and parks the
 * results on `window` for the Playwright runner to collect.
 */

import { runAll, type TestResult } from "./harness";

import "./suites/buffer.test";
import "./suites/framebuffer.test";
import "./suites/program.test";
import "./suites/renderer.test";
import "./suites/texture.test";
import "./suites/state.test";
import "./suites/constants.test";

declare global {
  interface Window {
    __glliteResults?: TestResult[];
    __glliteError?: string;
    __glliteDone?: boolean;
  }
}

runAll()
  .then((results) => {
    window.__glliteResults = results;
  })
  .catch((error: unknown) => {
    window.__glliteError =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
  })
  .finally(() => {
    window.__glliteDone = true;
  });
