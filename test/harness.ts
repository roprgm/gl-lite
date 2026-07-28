/**
 * Minimal in-browser test harness.
 *
 * Tests run inside a real browser against a real WebGL context, because the
 * only honest assertion for a rendering library is "what pixels came out".
 * Results are collected on `window` and read back by `test/run.ts`.
 */

export type TestResult = {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
};

type TestCase = {
  suite: string;
  name: string;
  fn: () => void | Promise<void>;
};

const cases: TestCase[] = [];
let currentSuite = "";

export function describe(suite: string, fn: () => void) {
  const previous = currentSuite;
  currentSuite = previous ? `${previous} > ${suite}` : suite;
  fn();
  currentSuite = previous;
}

export function it(name: string, fn: () => void | Promise<void>) {
  cases.push({ suite: currentSuite, name, fn });
}

/** Cleanups registered by the current test, run in reverse order afterwards. */
let cleanups: Array<() => void> = [];

export function onCleanup(fn: () => void) {
  cleanups.push(fn);
}

export async function runAll(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const testCase of cases) {
    cleanups = [];
    const start = performance.now();
    let error: string | undefined;
    try {
      await testCase.fn();
    } catch (e) {
      error = e instanceof Error ? (e.stack ?? e.message) : String(e);
    }
    for (const cleanup of cleanups.reverse()) {
      try {
        cleanup();
      } catch {
        // A failing cleanup must not mask the test result.
      }
    }
    results.push({
      suite: testCase.suite,
      name: testCase.name,
      passed: !error,
      error,
      durationMs: performance.now() - start,
    });
  }
  return results;
}

// --- assertions ---------------------------------------------------------

function stringify(value: unknown): string {
  if (ArrayBuffer.isView(value)) {
    return `${value.constructor.name}(${Array.from(value as never).join(", ")})`;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
    const arrayA = ArrayBuffer.isView(a) ? Array.from(a as never) : a;
    const arrayB = ArrayBuffer.isView(b) ? Array.from(b as never) : b;
    return deepEqual(arrayA, arrayB);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    return (
      keysA.length === keysB.length &&
      keysA.every((k) =>
        deepEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
      )
    );
  }
  return false;
}

export function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(
          `expected ${stringify(actual)} to be ${stringify(expected)}`,
        );
      }
    },
    toEqual(expected: unknown) {
      if (!deepEqual(actual, expected)) {
        throw new Error(
          `expected ${stringify(actual)} to equal ${stringify(expected)}`,
        );
      }
    },
    toBeCloseTo(expected: number, tolerance = 1e-6) {
      if (
        typeof actual !== "number" ||
        Math.abs(actual - expected) > tolerance
      ) {
        throw new Error(
          `expected ${stringify(actual)} to be within ${tolerance} of ${expected}`,
        );
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`expected ${stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`expected ${stringify(actual)} to be falsy`);
      }
    },
    toContain(needle: string) {
      if (typeof actual !== "string" || !actual.includes(needle)) {
        throw new Error(
          `expected ${stringify(actual)} to contain ${stringify(needle)}`,
        );
      }
    },
    toThrow(match?: string | RegExp) {
      if (typeof actual !== "function") {
        throw new Error("expect(...).toThrow requires a function");
      }
      let thrown: unknown;
      try {
        actual();
      } catch (e) {
        thrown = e ?? new Error("thrown falsy value");
      }
      if (thrown === undefined) {
        throw new Error("expected function to throw, but it did not");
      }
      if (match !== undefined) {
        const message =
          thrown instanceof Error ? thrown.message : String(thrown);
        const ok =
          typeof match === "string"
            ? message.includes(match)
            : match.test(message);
        if (!ok) {
          throw new Error(
            `expected error message ${stringify(message)} to match ${match}`,
          );
        }
      }
    },
    notToThrow() {
      if (typeof actual !== "function") {
        throw new Error("expect(...).notToThrow requires a function");
      }
      actual();
    },
  };
}

/**
 * Pixel comparison with a tolerance: software rasterisation and lossy
 * framebuffer formats make exact equality too brittle for colour assertions.
 */
export function expectPixel(
  actual: readonly number[] | Uint8Array,
  expected: readonly number[],
  tolerance = 2,
) {
  const got = Array.from(actual);
  const ok =
    got.length === expected.length &&
    got.every((v, i) => Math.abs(v - (expected[i] as number)) <= tolerance);
  if (!ok) {
    throw new Error(
      `expected pixel [${got.join(", ")}] to be [${expected.join(", ")}] (±${tolerance})`,
    );
  }
}
