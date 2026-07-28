import { GLBuffer } from "gl-lite";
import { describe, it, expect, expectPixel } from "../harness";
import {
  useRenderer,
  readCenter,
  solidFrag,
  expectNoGLError,
  FULLSCREEN_QUAD,
} from "../gl";

describe("GLBuffer", () => {
  it("defaults to a static array buffer", () => {
    const { renderer } = useRenderer();
    const buffer = renderer.buffer();
    expect(buffer.target).toBe("array");
    expect(buffer.usage).toBe("static");
  });

  it("uploads typed array data usable as vertex positions", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
    const program = renderer.program({
      frag: solidFrag(1, 0, 0),
      attributes: { position: { buffer, size: 2 } },
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();

    expectNoGLError(gl, "after drawing from a typed-array buffer");
    expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
  });

  it("replaces contents on update", () => {
    const { renderer, gl } = useRenderer();
    // Degenerate geometry first: nothing should be rasterised.
    const buffer = renderer.buffer({
      data: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]),
    });
    const program = renderer.program({
      frag: solidFrag(0, 1, 0),
      attributes: { position: { buffer, size: 2 } },
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();
    expectPixel(readCenter(gl, 64, 64), [0, 0, 0, 255]);

    buffer.update(FULLSCREEN_QUAD);
    renderer.clear([0, 0, 0, 1]);
    program.draw();
    expectPixel(readCenter(gl, 64, 64), [0, 255, 0, 255]);
  });

  it("accepts a plain number array as float vertex data", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: [-1, -1, 1, -1, -1, 1, 1, 1] });
    const program = renderer.program({
      frag: solidFrag(0, 0, 1),
      attributes: { position: { buffer, size: 2 } },
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();
    expectPixel(readCenter(gl, 64, 64), [0, 0, 255, 255]);
  });

  it("binds and unbinds around use()", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
    let boundInside: unknown;
    buffer.use(() => {
      boundInside = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    });
    expect(boundInside).toBe(buffer.handle);
  });

  it("draws indexed geometry from a Uint16Array element buffer", () => {
    const { renderer, gl } = useRenderer();
    const positions = renderer.buffer({
      data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    });
    const elements = renderer.buffer({
      target: "element",
      data: new Uint16Array([0, 1, 2, 0, 2, 3]),
    });
    const program = renderer.program({
      frag: solidFrag(1, 1, 0),
      attributes: { position: { buffer: positions, size: 2 } },
      elements,
      primitive: "triangles",
      count: 6,
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();

    expectNoGLError(gl, "after an indexed draw");
    expectPixel(readCenter(gl, 64, 64), [255, 255, 0, 255]);
  });

  it("rejects an element buffer used as an attribute source", () => {
    const { renderer } = useRenderer();
    const elements = renderer.buffer({
      target: "element",
      data: new Uint16Array([0, 1, 2]),
    });
    expect(() =>
      renderer
        .program({
          frag: solidFrag(1, 0, 0),
          attributes: { position: { buffer: elements, size: 2 } },
        })
        .draw(),
    ).toThrow("array");
  });

  it("rejects an array buffer used for indexed draws", () => {
    const { renderer } = useRenderer();
    const positions = renderer.buffer({ data: FULLSCREEN_QUAD });
    expect(() =>
      renderer
        .program({
          frag: solidFrag(1, 0, 0),
          attributes: { position: { buffer: positions, size: 2 } },
          elements: positions,
          primitive: "triangles",
          count: 3,
        })
        .draw(),
    ).toThrow("element buffer");
  });

  it("is constructible directly from a context", () => {
    const { gl } = useRenderer();
    const buffer = new GLBuffer(gl, { data: FULLSCREEN_QUAD });
    expect(gl.isBuffer(buffer.handle)).toBe(true);
    buffer.dispose();
    expect(gl.isBuffer(buffer.handle)).toBe(false);
  });
});
