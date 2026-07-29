/**
 * Vertex attribute arrays live on the context, not on the program, so two
 * programs sharing an attribute location overwrite each other's setup.
 */

import { describe, it, expect, expectPixel } from "../harness";
import {
  useRenderer,
  readCenter,
  solidFrag,
  expectNoGLError,
  FULLSCREEN_QUAD,
} from "../gl";

describe("attribute state", () => {
  it("rebinds its own geometry after another program drew", () => {
    const { renderer, gl } = useRenderer();
    const wide = renderer.buffer({ data: FULLSCREEN_QUAD });
    const corner = renderer.buffer({
      data: new Float32Array([-1, -1, -0.9, -1, -1, -0.9, -0.9, -0.9]),
    });

    const red = renderer.program({
      frag: solidFrag(1, 0, 0),
      attributes: { position: { buffer: wide, size: 2 } },
    });
    const green = renderer.program({
      frag: solidFrag(0, 1, 0),
      attributes: { position: { buffer: corner, size: 2 } },
    });

    renderer.clear([0, 0, 0, 1]);
    red.draw();
    green.draw();
    renderer.clear([0, 0, 0, 1]);
    red.draw();

    expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
  });

  it("leaves no attribute array enabled after a draw", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
    const program = renderer.program({
      frag: solidFrag(1, 0, 0),
      attributes: { position: { buffer, size: 2 } },
    });

    program.draw();

    expect(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED)).toBe(false);
  });

  it("does not leak an extra attribute into a program that has fewer", () => {
    const { renderer, gl } = useRenderer();
    const positions = renderer.buffer({ data: FULLSCREEN_QUAD });
    // Deliberately shorter than the position buffer: if this array stayed
    // enabled, the next draw would read out of bounds.
    const colors = renderer.buffer({ data: new Float32Array([1, 0, 0, 1]) });

    const twoAttributes = renderer.program({
      vert: /* glsl */ `
        precision mediump float;
        attribute vec2 position;
        attribute vec2 tint;
        varying vec2 vTint;
        void main() {
          vTint = tint;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `,
      frag: /* glsl */ `
        precision mediump float;
        varying vec2 vTint;
        void main() { gl_FragColor = vec4(vTint, 0.0, 1.0); }
      `,
      attributes: {
        position: { buffer: positions, size: 2 },
        tint: { buffer: colors, size: 2 },
      },
      count: 2,
      primitive: "lines",
    });

    const oneAttribute = renderer.program({
      frag: solidFrag(0, 0, 1),
      attributes: { position: { buffer: positions, size: 2 } },
    });

    twoAttributes.draw();
    renderer.clear([0, 0, 0, 1]);
    oneAttribute.draw();

    expectNoGLError(gl, "after drawing a program with fewer attributes");
    expectPixel(readCenter(gl, 64, 64), [0, 0, 255, 255]);
  });

  it("disables attribute arrays even when the draw throws", () => {
    const { renderer, gl } = useRenderer();
    const positions = renderer.buffer({ data: FULLSCREEN_QUAD });
    const badElements = renderer.buffer({ data: new Float32Array([0, 1, 2]) });
    const program = renderer.program({
      frag: solidFrag(1, 0, 0),
      attributes: { position: { buffer: positions, size: 2 } },
      elements: badElements,
    });

    expect(() => program.draw()).toThrow("element buffer");
    expect(gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED)).toBe(false);
  });
});
