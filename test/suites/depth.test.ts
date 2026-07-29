import { describe, it, expectPixel } from "../harness";
import {
  useRenderer,
  readCenter,
  expectNoGLError,
  FULLSCREEN_QUAD,
} from "../gl";

const DEPTH_VERT = /* glsl */ `
  precision mediump float;
  attribute vec2 position;
  uniform float z;
  void main() { gl_Position = vec4(position, z, 1.0); }
`;

const colorFrag = (r: number, g: number, b: number) => /* glsl */ `
  precision mediump float;
  void main() { gl_FragColor = vec4(${r}.0, ${g}.0, ${b}.0, 1.0); }
`;

describe("depth testing", () => {
  it("keeps the nearer surface regardless of draw order", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
    const layer = (frag: string, z: number) =>
      renderer.program({
        vert: DEPTH_VERT,
        frag,
        attributes: { position: { buffer, size: 2 } },
        uniforms: { z },
        depth: true,
      });

    renderer.clear([0, 0, 0, 1]);
    layer(colorFrag(1, 0, 0), -0.5).draw(); // near
    layer(colorFrag(0, 1, 0), 0.5).draw(); // far, must not win

    expectNoGLError(gl, "after a depth-tested draw");
    expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
  });

  it("lets the last draw win when depth testing is off", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
    const layer = (frag: string, z: number) =>
      renderer.program({
        vert: DEPTH_VERT,
        frag,
        attributes: { position: { buffer, size: 2 } },
        uniforms: { z },
      });

    renderer.clear([0, 0, 0, 1]);
    layer(colorFrag(1, 0, 0), -0.5).draw();
    layer(colorFrag(0, 1, 0), 0.5).draw();

    expectPixel(readCenter(gl, 64, 64), [0, 255, 0, 255]);
  });

  it("resets the depth buffer on clear so the next frame draws", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
    const far = renderer.program({
      vert: DEPTH_VERT,
      frag: colorFrag(0, 0, 1),
      attributes: { position: { buffer, size: 2 } },
      uniforms: { z: 0.5 },
      depth: true,
    });

    renderer.clear([0, 0, 0, 1]);
    far.draw();
    // Without a depth clear the stored 0.5 would reject the identical draw.
    renderer.clear([0, 0, 0, 1]);
    far.draw();

    expectPixel(readCenter(gl, 64, 64), [0, 0, 255, 255]);
  });

  it("depth tests inside a render target that asked for a depth buffer", () => {
    const { renderer, gl } = useRenderer();
    const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
    const fbo = renderer.framebuffer(
      renderer.texture({ width: 16, height: 16 }),
      { depth: true },
    );
    const layer = (frag: string, z: number) =>
      renderer.program({
        vert: DEPTH_VERT,
        frag,
        attributes: { position: { buffer, size: 2 } },
        uniforms: { z },
        depth: true,
      });

    fbo.use(() => {
      renderer.clear([0, 0, 0, 1]);
      layer(colorFrag(1, 0, 0), -0.5).draw();
      layer(colorFrag(0, 1, 0), 0.5).draw();
      expectNoGLError(gl, "after depth testing into a render target");
      expectPixel(readCenter(gl, 16, 16), [255, 0, 0, 255]);
    });
  });

  it("leaves depth testing disabled for programs that did not ask for it", () => {
    const { renderer, gl } = useRenderer();
    const depthTested = renderer.program({
      frag: colorFrag(1, 0, 0),
      depth: true,
    });
    const plain = renderer.program({ frag: colorFrag(0, 1, 0) });

    depthTested.draw();
    plain.draw();

    expectPixel([gl.getParameter(gl.DEPTH_TEST) ? 1 : 0], [0]);
  });
});
