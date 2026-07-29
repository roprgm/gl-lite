import { GLProgram } from "gl-lite";
import { describe, it, expect, expectPixel, captureWarnings } from "../harness";
import {
  useRenderer,
  readCenter,
  readPixel,
  solidFrag,
  expectNoGLError,
  FULLSCREEN_QUAD,
} from "../gl";

describe("GLProgram", () => {
  describe("compilation", () => {
    it("surfaces the shader info log when a shader fails to compile", () => {
      const { renderer } = useRenderer();
      expect(() =>
        renderer.program({ frag: "void main() { this is not glsl }" }),
      ).toThrow("Shader compile failed");
    });

    it("surfaces the program info log when linking fails", () => {
      const { renderer } = useRenderer();
      expect(() =>
        renderer.program({
          vert: /* glsl */ `
            attribute vec2 position;
            varying vec2 missmatched;
            void main() {
              missmatched = position;
              gl_Position = vec4(position, 0.0, 1.0);
            }
          `,
          frag: /* glsl */ `
            precision mediump float;
            varying vec3 missmatched;
            void main() { gl_FragColor = vec4(missmatched, 1.0); }
          `,
        }),
      ).toThrow(/link failed|compile failed/);
    });

    it("rejects an empty shader source", () => {
      const { renderer } = useRenderer();
      expect(() => renderer.program({ frag: "" })).toThrow(
        "requires both vertex and fragment shaders",
      );
    });

    it("draws a fullscreen quad with the built-in defaults", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({});

      renderer.clear([0, 0, 0, 1]);
      program.draw();

      expectNoGLError(gl, "after drawing the default program");
      // DEFAULT_FRAG renders uv as red/green, so the centre is mid grey-ish.
      const centre = readCenter(gl, 64, 64);
      expect(Math.abs(centre[0]! - 128) <= 8).toBe(true);
      expect(Math.abs(centre[1]! - 128) <= 8).toBe(true);
      expect(centre[2]).toBe(0);
    });
  });

  describe("uniforms", () => {
    const uniformFrag = (declaration: string, body: string) => /* glsl */ `
      precision mediump float;
      ${declaration}
      void main() { ${body} }
    `;

    it("writes a float uniform", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({
        frag: uniformFrag(
          "uniform float value;",
          "gl_FragColor = vec4(value, 0.0, 0.0, 1.0);",
        ),
        uniforms: { value: 1 },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
    });

    it("writes vec2, vec3 and vec4 uniforms from plain arrays", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({
        frag: uniformFrag(
          "uniform vec2 a; uniform vec3 b; uniform vec4 c;",
          "gl_FragColor = vec4(a.x * b.y, c.z, c.w, 1.0);",
        ),
        uniforms: { a: [1, 0], b: [0, 1, 0], c: [0, 0, 1, 1] },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectPixel(readCenter(gl, 64, 64), [255, 255, 255, 255]);
    });

    it("writes a boolean uniform", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({
        frag: uniformFrag(
          "uniform bool flag;",
          "gl_FragColor = flag ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);",
        ),
        uniforms: { flag: true },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectPixel(readCenter(gl, 64, 64), [0, 255, 0, 255]);
    });

    it("writes a mat4 uniform from a 16-element Float32Array", () => {
      const { renderer, gl } = useRenderer();
      const identity = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]);
      const program = renderer.program({
        vert: /* glsl */ `
          precision mediump float;
          attribute vec2 position;
          uniform mat4 transform;
          void main() { gl_Position = transform * vec4(position, 0.0, 1.0); }
        `,
        frag: solidFrag(1, 0, 1),
        uniforms: { transform: identity },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectNoGLError(gl, "after writing a mat4 uniform");
      expectPixel(readCenter(gl, 64, 64), [255, 0, 255, 255]);
    });

    it("evaluates function uniforms against the draw props", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program<{ level: number }>({
        frag: uniformFrag(
          "uniform float level;",
          "gl_FragColor = vec4(0.0, level, 0.0, 1.0);",
        ),
        uniforms: { level: (props) => props.level },
      });

      renderer.clear([0, 0, 0, 1]);
      program.draw({ level: 1 });
      expectPixel(readCenter(gl, 64, 64), [0, 255, 0, 255]);

      renderer.clear([0, 0, 0, 1]);
      program.draw({ level: 0 });
      expectPixel(readCenter(gl, 64, 64), [0, 0, 0, 255]);
    });

    it("writes an int uniform as an integer", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({
        frag: uniformFrag(
          "uniform int steps;",
          "gl_FragColor = steps == 3 ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);",
        ),
        uniforms: { steps: 3 },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectNoGLError(gl, "after writing an int uniform");
      expectPixel(readCenter(gl, 64, 64), [0, 255, 0, 255]);
    });

    it("writes an ivec2 uniform", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({
        frag: uniformFrag(
          "uniform ivec2 grid;",
          "gl_FragColor = (grid.x == 2 && grid.y == 5) ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);",
        ),
        uniforms: { grid: [2, 5] },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectNoGLError(gl, "after writing an ivec2 uniform");
      expectPixel(readCenter(gl, 64, 64), [0, 255, 0, 255]);
    });

    it("writes a mat2 uniform", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({
        frag: uniformFrag(
          "uniform mat2 rot;",
          "gl_FragColor = vec4(rot[0][0], rot[1][1], 0.0, 1.0);",
        ),
        uniforms: { rot: [1, 0, 0, 1] },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectNoGLError(gl, "after writing a mat2 uniform");
      expectPixel(readCenter(gl, 64, 64), [255, 255, 0, 255]);
    });

    it("writes an array uniform of the same length as a matrix", () => {
      const { renderer, gl } = useRenderer();
      // Nine floats: an array, not the mat3 a length-based guess would pick.
      const program = renderer.program({
        frag: uniformFrag(
          "uniform float levels[9];",
          "gl_FragColor = vec4(levels[0], levels[4], levels[8], 1.0);",
        ),
        uniforms: { levels: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
      });
      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectNoGLError(gl, "after writing a float[9] uniform");
      expectPixel(readCenter(gl, 64, 64), [255, 255, 255, 255]);
    });

    it("skips a uniform the shader does not use instead of failing", () => {
      const { renderer, gl } = useRenderer();
      let program!: ReturnType<typeof renderer.program>;
      const warnings = captureWarnings(() => {
        program = renderer.program({
          frag: uniformFrag(
            "uniform float used;",
            "gl_FragColor = vec4(used);",
          ),
          uniforms: { used: 1, neverDeclared: 5 },
        });
      });

      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain("neverDeclared");

      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectPixel(readCenter(gl, 64, 64), [255, 255, 255, 255]);
    });

    it("reports the uniform by name when the value has the wrong size", () => {
      const { renderer } = useRenderer();
      const program = renderer.program({
        frag: uniformFrag("uniform vec4 tint;", "gl_FragColor = tint;"),
        uniforms: { tint: [1, 2, 3, 4, 5] },
      });
      expect(() => program.draw()).toThrow(
        'Uniform "tint" expects a multiple of 4 values, received 5',
      );
    });
  });

  describe("attributes", () => {
    it("draws geometry supplied through an attribute", () => {
      const { renderer, gl } = useRenderer();
      // A triangle covering only the bottom-left half of the viewport.
      const buffer = renderer.buffer({
        data: new Float32Array([-1, -1, 1, -1, -1, 1]),
      });
      const program = renderer.program({
        frag: solidFrag(1, 0, 0),
        attributes: { position: { buffer, size: 2 } },
        primitive: "triangles",
        count: 3,
      });

      renderer.clear([0, 0, 0, 1]);
      program.draw();

      expectPixel(readPixel(gl, 4, 4), [255, 0, 0, 255]);
      expectPixel(readPixel(gl, 60, 60), [0, 0, 0, 255]);
    });

    it("evaluates function attributes against the draw props", () => {
      const { renderer, gl } = useRenderer();
      const wide = renderer.buffer({ data: FULLSCREEN_QUAD });
      const degenerate = renderer.buffer({
        data: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]),
      });
      const program = renderer.program<{ visible: boolean }>({
        frag: solidFrag(0, 0, 1),
        attributes: {
          position: (props) => ({
            buffer: props.visible ? wide : degenerate,
            size: 2,
          }),
        },
      });

      renderer.clear([0, 0, 0, 1]);
      program.draw({ visible: true });
      expectPixel(readCenter(gl, 64, 64), [0, 0, 255, 255]);

      renderer.clear([0, 0, 0, 1]);
      program.draw({ visible: false });
      expectPixel(readCenter(gl, 64, 64), [0, 0, 0, 255]);
    });

    it("skips an attribute the shader does not declare instead of failing", () => {
      const { renderer, gl } = useRenderer();
      const buffer = renderer.buffer({ data: FULLSCREEN_QUAD });
      let program!: ReturnType<typeof renderer.program>;
      const warnings = captureWarnings(() => {
        program = renderer.program({
          vert: /* glsl */ `
            attribute vec2 position;
            void main() { gl_Position = vec4(position, 0.0, 1.0); }
          `,
          frag: solidFrag(1, 0, 0),
          attributes: {
            position: { buffer, size: 2 },
            missing: { buffer, size: 2 },
          },
        });
      });

      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain("missing");

      renderer.clear([0, 0, 0, 1]);
      program.draw();
      expectPixel(readCenter(gl, 64, 64), [255, 0, 0, 255]);
    });

    it("stays quiet when the built-in quad does not fit a custom shader", () => {
      const { renderer } = useRenderer();
      const warnings = captureWarnings(() => {
        renderer.program({
          vert: /* glsl */ `
            void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); }
          `,
          frag: solidFrag(1, 0, 0),
        });
      });
      expect(warnings).toEqual([]);
    });
  });

  describe("blending", () => {
    it("is disabled by default", () => {
      const { renderer, gl } = useRenderer();
      renderer.program({ frag: solidFrag(1, 0, 0) }).draw();
      expect(gl.getParameter(gl.BLEND)).toBe(false);
    });

    it("adds source and destination when configured additively", () => {
      const { renderer, gl } = useRenderer();
      const base = renderer.program({ frag: solidFrag(1, 0, 0) });
      const additive = renderer.program({
        frag: solidFrag(0, 1, 0),
        blend: { enabled: true, srcFactor: "one", dstFactor: "one" },
      });

      renderer.clear([0, 0, 0, 1]);
      base.draw();
      additive.draw();

      expectPixel(readCenter(gl, 64, 64), [255, 255, 0, 255]);
    });

    it("supports separate RGB and alpha factors", () => {
      const { renderer, gl } = useRenderer();
      const base = renderer.program({ frag: solidFrag(1, 0, 0, 1) });
      const separate = renderer.program({
        frag: solidFrag(0, 1, 0, 1),
        blend: {
          enabled: true,
          // RGB accumulates; alpha keeps only the destination.
          srcFactor: ["one", "zero"],
          dstFactor: ["one", "one"],
        },
      });

      renderer.clear([0, 0, 0, 1]);
      base.draw();
      separate.draw();

      expect(gl.getParameter(gl.BLEND_SRC_RGB)).toBe(gl.ONE);
      expect(gl.getParameter(gl.BLEND_SRC_ALPHA)).toBe(gl.ZERO);
      expect(gl.getParameter(gl.BLEND_DST_RGB)).toBe(gl.ONE);
      expect(gl.getParameter(gl.BLEND_DST_ALPHA)).toBe(gl.ONE);
      expectPixel(readCenter(gl, 64, 64), [255, 255, 0, 255]);
    });

    it("supports separate RGB and alpha equations", () => {
      const { renderer, gl } = useRenderer();
      const program = renderer.program({
        frag: solidFrag(0, 1, 0),
        blend: {
          enabled: true,
          srcFactor: "one",
          dstFactor: "one",
          equation: ["subtract", "add"],
        },
      });
      program.draw();
      expect(gl.getParameter(gl.BLEND_EQUATION_RGB)).toBe(gl.FUNC_SUBTRACT);
      expect(gl.getParameter(gl.BLEND_EQUATION_ALPHA)).toBe(gl.FUNC_ADD);
    });
  });

  describe("lifecycle", () => {
    it("restores the previously bound program after use()", () => {
      const { renderer, gl } = useRenderer();
      const first = renderer.program({ frag: solidFrag(1, 0, 0) });
      const second = renderer.program({ frag: solidFrag(0, 1, 0) });

      first.use(() => {
        const inside = gl.getParameter(gl.CURRENT_PROGRAM);
        second.use(() => {
          expect(gl.getParameter(gl.CURRENT_PROGRAM) === inside).toBe(false);
        });
        expect(gl.getParameter(gl.CURRENT_PROGRAM)).toBe(inside);
      });
    });

    it("exposes a reusable fullscreen quad buffer factory", () => {
      const { gl } = useRenderer();
      const buffer = GLProgram.createFSQuadBuffer(gl);
      expect(gl.isBuffer(buffer.handle)).toBe(true);
      expect(buffer.target).toBe("array");
      buffer.dispose();
    });
  });
});
