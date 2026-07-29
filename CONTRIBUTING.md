# Contributing

Thanks for helping out. Issues and pull requests are welcome.

## Getting set up

```bash
bun install
bun run test
```

That is the whole setup. The suite runs in a headless Chromium against a real
WebGL context; on a machine without a GPU it falls back to SwiftShader, so no
special hardware is needed. If Playwright has no browser installed yet:

```bash
bunx playwright install chromium
```

## Before opening a pull request

```bash
bun run typecheck
bun run test        # against src/
bun run test:dist   # against the built package
bun run format
```

CI runs exactly these.

## Tests

Suites live in `test/suites/`. Because this is a rendering library, the useful
assertion is almost always about pixels rather than about calls made:

```ts
renderer.clear([0, 0, 0, 1]);
program.draw();
expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
```

`useRenderer()` gives you a renderer scoped to the test and disposes it
afterwards. Use `readPixel` / `readCenter` to read back, and `expectNoGLError`
when a change could plausibly raise one.

When fixing a bug, check that the new test fails without your fix. A test that
passes either way documents behaviour but protects nothing.

Run a subset while iterating:

```bash
bun test/run.ts --filter blend
bun test/run.ts --headed     # watch it in a visible browser
```

## Scope

gl-lite is deliberately small: a thin, type-safe layer over WebGL with no
dependencies. Additions that a caller could write themselves in a few lines
over the existing API are usually better left out.
