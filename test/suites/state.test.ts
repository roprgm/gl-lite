/**
 * Cross-cutting GL state tests.
 *
 * WebGL is one big global state machine, so every `use()` helper must leave
 * the context exactly as it found it. A leaked binding shows up as a blank
 * screen somewhere else entirely, which is why these get their own suite.
 */

import { describe, it, expect } from "../harness";
import { useRenderer, solidFrag } from "../gl";

describe("GL state", () => {
  it("leaves the current program untouched by GLProgram.use()", () => {
    const { renderer, gl } = useRenderer();
    const outer = renderer.program({ frag: solidFrag(1, 0, 0) });
    const inner = renderer.program({ frag: solidFrag(0, 1, 0) });

    outer.use(() => {
      const before = gl.getParameter(gl.CURRENT_PROGRAM);
      inner.use(() => {});
      expect(gl.getParameter(gl.CURRENT_PROGRAM)).toBe(before);
    });
    expect(gl.getParameter(gl.CURRENT_PROGRAM)).toBe(null);
  });

  it("restores the program even when the callback throws", () => {
    const { renderer, gl } = useRenderer();
    const program = renderer.program({ frag: solidFrag(1, 0, 0) });

    expect(() =>
      program.use(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(gl.getParameter(gl.CURRENT_PROGRAM)).toBe(null);
  });
});
