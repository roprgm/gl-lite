/**
 * Cross-cutting GL state tests.
 *
 * WebGL is one big global state machine, so every `use()` helper must leave
 * the context exactly as it found it. A leaked binding shows up as a blank
 * screen somewhere else entirely, which is why these get their own suite.
 */

import { describe, it, expect } from "../harness";
import { useRenderer, solidFrag, FULLSCREEN_QUAD } from "../gl";

describe("GL state", () => {
  it("restores the array buffer binding after GLBuffer.use()", () => {
    const { renderer, gl } = useRenderer();
    const outer = renderer.buffer({ data: FULLSCREEN_QUAD });
    const inner = renderer.buffer({ data: FULLSCREEN_QUAD });

    outer.use(() => {
      inner.use(() => {});
      expect(gl.getParameter(gl.ARRAY_BUFFER_BINDING)).toBe(outer.handle);
    });
    expect(gl.getParameter(gl.ARRAY_BUFFER_BINDING)).toBe(null);
  });

  it("restores the element buffer binding after GLBuffer.use()", () => {
    const { renderer, gl } = useRenderer();
    const outer = renderer.buffer({
      target: "element",
      data: new Uint16Array([0, 1, 2]),
    });
    const inner = renderer.buffer({
      target: "element",
      data: new Uint16Array([0, 1, 2]),
    });

    outer.use(() => {
      inner.use(() => {});
      expect(gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)).toBe(
        outer.handle,
      );
    });
    expect(gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)).toBe(null);
  });

  it("restores the framebuffer binding after GLFramebuffer.use()", () => {
    const { renderer, gl } = useRenderer();
    const outer = renderer.framebuffer(
      renderer.texture({ width: 16, height: 16 }),
    );
    const inner = renderer.framebuffer(
      renderer.texture({ width: 8, height: 8 }),
    );

    outer.use(() => {
      inner.use(() => {});
      expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(outer.handle);
    });
    expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(null);
  });

  it("restores the viewport after GLFramebuffer.use()", () => {
    const { renderer, gl } = useRenderer();
    renderer.resize(64, 64);
    const fbo = renderer.framebuffer(renderer.texture({ width: 8, height: 8 }));

    fbo.use(() => {
      expect(Array.from(gl.getParameter(gl.VIEWPORT))).toEqual([0, 0, 8, 8]);
    });

    expect(Array.from(gl.getParameter(gl.VIEWPORT))).toEqual([0, 0, 64, 64]);
  });

  it("restores the viewport of an enclosing framebuffer pass", () => {
    const { renderer, gl } = useRenderer();
    const outer = renderer.framebuffer(
      renderer.texture({ width: 32, height: 32 }),
    );
    const inner = renderer.framebuffer(
      renderer.texture({ width: 8, height: 8 }),
    );

    outer.use(() => {
      inner.use(() => {});
      expect(Array.from(gl.getParameter(gl.VIEWPORT))).toEqual([0, 0, 32, 32]);
    });
  });

  it("restores bindings even when the callback throws", () => {
    const { renderer, gl } = useRenderer();
    renderer.resize(64, 64);
    const fbo = renderer.framebuffer(renderer.texture({ width: 8, height: 8 }));
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });

    expect(() =>
      fbo.use(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(null);
    expect(Array.from(gl.getParameter(gl.VIEWPORT))).toEqual([0, 0, 64, 64]);

    expect(() =>
      buffer.use(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(gl.getParameter(gl.ARRAY_BUFFER_BINDING)).toBe(null);
  });

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
