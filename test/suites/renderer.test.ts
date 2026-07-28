import { GLRenderer } from "gl-lite";
import { describe, it, expect, expectPixel, onCleanup } from "../harness";
import { useRenderer, useWebGL1Context, readCenter, solidFrag } from "../gl";

describe("GLRenderer", () => {
  it("creates its own canvas when none is provided", () => {
    const renderer = new GLRenderer();
    onCleanup(() => {
      const gl = renderer.gl;
      renderer.dispose();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    });
    expect(renderer.canvas instanceof HTMLCanvasElement).toBe(true);
  });

  it("adopts an externally created context", () => {
    const gl = useWebGL1Context();
    const renderer = new GLRenderer({ context: gl });
    expect(renderer.gl).toBe(gl);
  });

  it("resizes the canvas and the viewport together", () => {
    const { renderer, gl, canvas } = useRenderer();
    renderer.resize(128, 96);
    expect(canvas.width).toBe(128);
    expect(canvas.height).toBe(96);
    expect(Array.from(gl.getParameter(gl.VIEWPORT))).toEqual([0, 0, 128, 96]);
  });

  it("clears to the requested colour", () => {
    const { renderer, gl } = useRenderer();
    renderer.clear([1, 0, 0, 1]);
    expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
  });

  it("clears to opaque black by default", () => {
    const { renderer, gl } = useRenderer();
    renderer.clear([1, 1, 1, 1]);
    renderer.clear();
    expectPixel(readCenter(gl, 64, 64), [0, 0, 0, 255]);
  });

  it("returns the same program instance for the same definition object", () => {
    const { renderer } = useRenderer();
    const definition = { frag: solidFrag(1, 0, 0) };
    expect(renderer.program(definition)).toBe(renderer.program(definition));
  });

  it("returns distinct programs for structurally equal but distinct definitions", () => {
    const { renderer } = useRenderer();
    const first = renderer.program({ frag: solidFrag(1, 0, 0) });
    const second = renderer.program({ frag: solidFrag(1, 0, 0) });
    expect(first === second).toBe(false);
  });

  it("disposes every resource it created", () => {
    const { renderer, gl } = useRenderer();
    const texture = renderer.texture();
    const buffer = renderer.buffer({ data: new Float32Array([0, 0]) });

    expect(gl.isTexture(texture.handle)).toBe(true);
    expect(gl.isBuffer(buffer.handle)).toBe(true);

    renderer.dispose();

    expect(gl.isTexture(texture.handle)).toBe(false);
    expect(gl.isBuffer(buffer.handle)).toBe(false);
  });

  it("works against a WebGL1 context", () => {
    const gl = useWebGL1Context();
    const renderer = new GLRenderer({ context: gl });
    renderer.resize(64, 64);
    renderer.clear([0, 0, 0, 1]);
    renderer.program({ frag: solidFrag(0, 1, 1) }).draw();
    expectPixel(readCenter(gl, 64, 64), [0, 255, 255, 255]);
  });
});
