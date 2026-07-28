import { describe, it, expect, expectPixel } from "../harness";
import {
  useRenderer,
  readPixel,
  readCenter,
  solidFrag,
  expectNoGLError,
} from "../gl";

describe("GLFramebuffer", () => {
  it("renders into its attached texture instead of the canvas", () => {
    const { renderer, gl } = useRenderer();
    const target = renderer.texture({ width: 16, height: 16 });
    const fbo = renderer.framebuffer(target);
    const program = renderer.program({ frag: solidFrag(1, 0, 0) });

    renderer.clear([0, 0, 0, 1]);
    fbo.use(() => {
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectPixel(readCenter(gl, 16, 16), [255, 0, 0, 255]);
    });

    // The canvas itself was never drawn to.
    expectPixel(readPixel(gl, 0, 0), [0, 0, 0, 255]);
  });

  it("produces a texture that can be sampled in a later pass", () => {
    const { renderer, gl } = useRenderer();
    const target = renderer.texture({ width: 16, height: 16 });
    const fbo = renderer.framebuffer(target);

    fbo.use(() => {
      renderer.clear([0, 0, 0, 1]);
      renderer.program({ frag: solidFrag(0, 0, 1) }).draw();
    });

    renderer.resize(64, 64);
    renderer.clear([0, 0, 0, 1]);
    renderer
      .program({
        frag: /* glsl */ `
          precision mediump float;
          uniform sampler2D tex;
          varying vec2 uv;
          void main() { gl_FragColor = texture2D(tex, uv); }
        `,
        uniforms: { tex: target },
      })
      .draw();

    expectNoGLError(gl, "after sampling a render target");
    expectPixel(readCenter(gl, 64, 64), [0, 0, 255, 255]);
  });

  it("creates a matching render target when none is supplied", () => {
    const { renderer } = useRenderer();
    renderer.resize(32, 32);
    const fbo = renderer.framebuffer();
    expect(fbo.texture.width).toBe(32);
    expect(fbo.texture.height).toBe(32);
  });

  it("unbinds itself so later draws reach the canvas", () => {
    const { renderer, gl } = useRenderer();
    const fbo = renderer.framebuffer(
      renderer.texture({ width: 16, height: 16 }),
    );
    fbo.use(() => {});
    expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(null);
  });

  it("releases the underlying GL object on dispose", () => {
    const { renderer, gl } = useRenderer();
    const fbo = renderer.framebuffer(renderer.texture({ width: 8, height: 8 }));
    expect(gl.isFramebuffer(fbo.handle)).toBe(true);
    fbo.dispose();
    expect(gl.isFramebuffer(fbo.handle)).toBe(false);
  });
});
