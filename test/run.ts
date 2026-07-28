/**
 * Test runner: bundles the browser-side suite, serves it, and drives a
 * headless Chromium with a real WebGL implementation.
 *
 * Usage:
 *   bun test/run.ts                 # run every suite against src/
 *   bun test/run.ts --target dist   # run against the built package
 *   bun test/run.ts --filter blend  # only suites/tests matching a substring
 *   bun test/run.ts --headed        # watch it run in a visible browser
 */

import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestResult } from "./harness";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : (args[index + 1] ?? "");
};
const has = (name: string) => args.includes(`--${name}`);

const target = flag("target") === "dist" ? "dist" : "src";
const filter = flag("filter");
const headed = has("headed");

// --- resolve the library entry the suite should be built against ----------

const entryForTarget =
  target === "dist"
    ? join(ROOT, "dist", "index.js")
    : join(ROOT, "src", "index.ts");

if (target === "dist" && !existsSync(entryForTarget)) {
  console.error("dist/index.js not found — run `bun run build` first.");
  process.exit(1);
}

// --- bundle ---------------------------------------------------------------

const build = await Bun.build({
  entrypoints: [join(ROOT, "test", "index.ts")],
  target: "browser",
  format: "esm",
  sourcemap: "inline",
  define: { "process.env.NODE_ENV": '"test"' },
  plugins: [
    {
      name: "gl-lite-target",
      setup(builder) {
        builder.onResolve({ filter: /^gl-lite$/ }, () => ({
          path: entryForTarget,
        }));
      },
    },
  ],
});

if (!build.success) {
  console.error("Failed to bundle the test suite:");
  for (const log of build.logs) console.error(log);
  process.exit(1);
}

const bundle = await build.outputs[0]!.text();

// --- serve ----------------------------------------------------------------

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>gl-lite tests</title></head>
<body><script type="module" src="/bundle.js"></script></body></html>`;

const server = Bun.serve({
  port: 0,
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/bundle.js") {
      return new Response(bundle, {
        headers: { "Content-Type": "text/javascript" },
      });
    }
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  },
});

// --- launch ---------------------------------------------------------------

/**
 * Prefer an explicitly provided browser, then any Chromium already present in
 * PLAYWRIGHT_BROWSERS_PATH (CI images and dev containers often preinstall one
 * whose revision does not match Playwright's default), then Playwright's own.
 */
function findChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath || !existsSync(browsersPath)) return undefined;
  const candidates = readdirSync(browsersPath)
    .filter((name) => name.startsWith("chromium-"))
    .map((name) => join(browsersPath, name, "chrome-linux", "chrome"))
    .filter((path) => existsSync(path));
  return candidates[0];
}

const executablePath = findChromium();

const browser = await chromium.launch({
  headless: !headed,
  ...(executablePath ? { executablePath } : {}),
  args: [
    // SwiftShader gives a complete, deterministic WebGL2 implementation on
    // machines with no GPU, which is the normal case in CI.
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const page = await browser.newPage();
const consoleErrors: string[] = [];
page.on("pageerror", (error) => consoleErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

await page.goto(server.url.toString());

let timedOut = false;
await page
  .waitForFunction(() => window.__glliteDone === true, undefined, {
    timeout: 120_000,
  })
  .catch(() => {
    timedOut = true;
  });

const results: TestResult[] = timedOut
  ? []
  : ((await page.evaluate(() => window.__glliteResults ?? [])) as TestResult[]);
const fatal = timedOut
  ? "test suite timed out"
  : await page.evaluate(() => window.__glliteError);

await browser.close();
server.stop(true);

// --- report ---------------------------------------------------------------

if (fatal) {
  console.error(`\nFatal error while running the suite:\n${fatal}`);
  if (consoleErrors.length) console.error(consoleErrors.join("\n"));
  process.exit(1);
}

const selected = filter
  ? results.filter((r) =>
      `${r.suite} ${r.name}`.toLowerCase().includes(filter.toLowerCase()),
    )
  : results;

let lastSuite = "";
let failures = 0;
for (const result of selected) {
  if (result.suite !== lastSuite) {
    console.log(`\n${result.suite}`);
    lastSuite = result.suite;
  }
  if (result.passed) {
    console.log(`  ✓ ${result.name}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${result.name}`);
    const indented = (result.error ?? "unknown error")
      .split("\n")
      .map((line) => `      ${line}`)
      .join("\n");
    console.log(indented);
  }
}

const passed = selected.length - failures;
console.log(
  `\n${passed}/${selected.length} passing${failures ? `, ${failures} failing` : ""} (target: ${target})`,
);

if (!selected.length) {
  console.error("No tests ran.");
  process.exit(1);
}

process.exit(failures ? 1 : 0);
