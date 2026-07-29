import { describe, it, expect, expectPixel } from "../harness";
import { useRenderer, readPixel, expectNoGLError } from "../gl";

/** A small quad at the origin, shifted per instance by an offset attribute. */
const INSTANCED_VERT = /* glsl */ `
  precision mediump float;
  attribute vec2 position;
  attribute vec2 offset;
  void main() {
    gl_Position = vec4(position * 0.25 + offset, 0.0, 1.0);
  }
`;

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

describe("instanced drawing", () => {
  it("draws one copy per instance at its own offset", () => {
    const { renderer, gl } = useRenderer();
    renderer.resize(64, 64);

    const program = renderer.program({
      vert: INSTANCED_VERT,
      frag: /* glsl */ `
        precision mediump float;
        void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }
      `,
      attributes: {
        position: { buffer: renderer.buffer({ data: QUAD }), size: 2 },
        offset: {
          // Bottom-left and top-right corners.
          buffer: renderer.buffer({ data: [-0.6, -0.6, 0.6, 0.6] }),
          size: 2,
          divisor: 1,
        },
      },
      instances: 2,
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();

    expectNoGLError(gl, "after an instanced draw");
    expectPixel(readPixel(gl, 13, 13), [255, 0, 0, 255]);
    expectPixel(readPixel(gl, 51, 51), [255, 0, 0, 255]);
    // The centre is between both instances and stays clear.
    expectPixel(readPixel(gl, 32, 32), [0, 0, 0, 255]);
  });

  it("draws instanced indexed geometry", () => {
    const { renderer, gl } = useRenderer();
    renderer.resize(64, 64);

    const program = renderer.program({
      vert: INSTANCED_VERT,
      frag: /* glsl */ `
        precision mediump float;
        void main() { gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); }
      `,
      attributes: {
        position: {
          buffer: renderer.buffer({ data: [-1, -1, 1, -1, 1, 1, -1, 1] }),
          size: 2,
        },
        offset: {
          buffer: renderer.buffer({ data: [-0.6, -0.6, 0.6, 0.6] }),
          size: 2,
          divisor: 1,
        },
      },
      elements: renderer.buffer({
        target: "element",
        data: [0, 1, 2, 0, 2, 3],
      }),
      primitive: "triangles",
      count: 6,
      instances: 2,
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();

    expectNoGLError(gl, "after an instanced indexed draw");
    expectPixel(readPixel(gl, 13, 13), [0, 255, 0, 255]);
    expectPixel(readPixel(gl, 51, 51), [0, 255, 0, 255]);
  });

  it("resets the divisor so a later non-instanced draw is unaffected", () => {
    const { renderer, gl } = useRenderer();
    const offsets = renderer.buffer({ data: [-0.6, -0.6, 0.6, 0.6] });

    renderer
      .program({
        vert: INSTANCED_VERT,
        frag: /* glsl */ `
        precision mediump float;
        void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }
      `,
        attributes: {
          position: { buffer: renderer.buffer({ data: QUAD }), size: 2 },
          offset: { buffer: offsets, size: 2, divisor: 1 },
        },
        instances: 2,
      })
      .draw();

    const gl2 = gl as WebGL2RenderingContext;
    expect(gl2.getVertexAttrib(0, gl2.VERTEX_ATTRIB_ARRAY_DIVISOR)).toBe(0);
    expect(gl2.getVertexAttrib(1, gl2.VERTEX_ATTRIB_ARRAY_DIVISOR)).toBe(0);
  });

  it("reports that WebGL1 cannot draw instanced", () => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error("WebGL1 is unavailable");
    const { renderer } = useRenderer({ context: gl });

    const program = renderer.program({
      frag: /* glsl */ `
        precision mediump float;
        void main() { gl_FragColor = vec4(1.0); }
      `,
      instances: 2,
    });

    expect(() => program.draw()).toThrow("WebGL2");
  });
});
