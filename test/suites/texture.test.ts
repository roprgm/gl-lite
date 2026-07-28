import { describe, it, expect, expectPixel } from "../harness";
import { useRenderer, readPixel, readCenter, expectNoGLError } from "../gl";

const SAMPLE_FRAG = /* glsl */ `
  precision mediump float;
  uniform sampler2D tex;
  varying vec2 uv;
  void main() {
    gl_FragColor = texture2D(tex, uv);
  }
`;

describe("GLTexture", () => {
  it("applies documented defaults", () => {
    const { renderer } = useRenderer();
    const texture = renderer.texture();
    expect(texture.params.format).toBe("rgba");
    expect(texture.params.type).toBe("uint8");
    expect(texture.params.wrapS).toBe("clamp");
    expect(texture.params.minFilter).toBe("linear");
    expect(texture.params.flipY).toBe(false);
    expect(texture.width).toBe(1);
    expect(texture.height).toBe(1);
  });

  it("samples data uploaded from a typed array", () => {
    const { renderer, gl } = useRenderer();
    const texture = renderer.texture({
      width: 1,
      height: 1,
      data: new Uint8Array([255, 0, 0, 255]),
    });
    const program = renderer.program({
      frag: SAMPLE_FRAG,
      uniforms: { tex: texture },
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();

    expectNoGLError(gl, "after sampling a texture");
    expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
  });

  it("samples data uploaded from an ImageData source", () => {
    const { renderer, gl } = useRenderer();
    const source = new ImageData(new Uint8ClampedArray([0, 0, 255, 255]), 1, 1);
    const texture = renderer.texture({ data: source });
    const program = renderer.program({
      frag: SAMPLE_FRAG,
      uniforms: { tex: texture },
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();
    expectPixel(readCenter(gl, 64, 64), [0, 0, 255, 255]);
  });

  it("honours nearest filtering across texels", () => {
    const { renderer, gl } = useRenderer();
    // Two texels side by side: red on the left, green on the right.
    const texture = renderer.texture({
      width: 2,
      height: 1,
      data: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]),
      minFilter: "nearest",
      magFilter: "nearest",
    });
    const program = renderer.program({
      frag: SAMPLE_FRAG,
      uniforms: { tex: texture },
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();

    expectPixel(readPixel(gl, 8, 32), [255, 0, 0, 255]);
    expectPixel(readPixel(gl, 56, 32), [0, 255, 0, 255]);
  });

  it("merges partial params on update and keeps the rest", () => {
    const { renderer } = useRenderer();
    const texture = renderer.texture({ width: 4, height: 4, flipY: true });
    texture.update({ minFilter: "nearest" });
    expect(texture.params.minFilter).toBe("nearest");
    expect(texture.params.flipY).toBe(true);
    expect(texture.width).toBe(4);
  });

  it("resizes only when dimensions actually change", () => {
    const { renderer } = useRenderer();
    const texture = renderer.texture({ width: 4, height: 4 });
    texture.resize(4, 4);
    expect(texture.width).toBe(4);
    texture.resize(8, 16);
    expect(texture.width).toBe(8);
    expect(texture.height).toBe(16);
  });

  it("rejects non-positive dimensions", () => {
    const { renderer } = useRenderer();
    const texture = renderer.texture({ width: 4, height: 4 });
    expect(() => texture.resize(0, 4)).toThrow("positive");
    expect(() => texture.resize(4, -1)).toThrow("positive");
  });

  it("binds to the requested texture unit", () => {
    const { renderer, gl } = useRenderer();
    const texture = renderer.texture();
    texture.bind(3);
    expect(gl.getParameter(gl.ACTIVE_TEXTURE)).toBe(gl.TEXTURE0 + 3);
    expect(gl.getParameter(gl.TEXTURE_BINDING_2D)).toBe(texture.handle);
  });

  it("releases the underlying GL object on dispose", () => {
    const { renderer, gl } = useRenderer();
    const texture = renderer.texture();
    expect(gl.isTexture(texture.handle)).toBe(true);
    texture.dispose();
    expect(gl.isTexture(texture.handle)).toBe(false);
  });

  it("binds distinct units for multiple sampler uniforms", () => {
    const { renderer, gl } = useRenderer();
    const red = renderer.texture({
      width: 1,
      height: 1,
      data: new Uint8Array([255, 0, 0, 255]),
    });
    const green = renderer.texture({
      width: 1,
      height: 1,
      data: new Uint8Array([0, 255, 0, 255]),
    });
    const program = renderer.program({
      frag: /* glsl */ `
        precision mediump float;
        uniform sampler2D a;
        uniform sampler2D b;
        varying vec2 uv;
        void main() {
          gl_FragColor = texture2D(a, uv) + texture2D(b, uv);
        }
      `,
      uniforms: { a: red, b: green },
    });

    renderer.clear([0, 0, 0, 1]);
    program.draw();

    expectNoGLError(gl, "after sampling two textures");
    expectPixel(readCenter(gl, 64, 64), [255, 255, 0, 255]);
  });
});
