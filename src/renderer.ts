import type { GLContext } from "./types.js";
import { GLBuffer, type GLBufferParams } from "./buffer.js";
import { GLTexture, type GLTextureParams } from "./texture.js";
import { GLFramebuffer } from "./framebuffer.js";
import { GLProgram, type GLProgramDefinition } from "./program.js";

export type GLRendererParams = {
  context?: GLContext;
  canvas?: HTMLCanvasElement;
  attributes?: WebGLContextAttributes;
};

export class GLRenderer {
  gl: GLContext;
  programs: WeakMap<GLProgramDefinition, GLProgram>;

  constructor(params: GLRendererParams = {}) {
    const canvas = params.canvas ?? document.createElement("canvas");
    const context =
      params.context ??
      canvas.getContext("webgl2", {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        depth: false,
        ...params.attributes,
      });

    if (!context) {
      throw new Error("Failed to create WebGL context");
    }

    this.gl = context;
    this.programs = new WeakMap();
  }

  get canvas() {
    return this.gl.canvas as HTMLCanvasElement;
  }

  resize(width: number, height: number) {
    if (this.canvas.width !== width) {
      this.canvas.width = width;
    }
    if (this.canvas.height !== height) {
      this.canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  }

  clear(color = [0, 0, 0, 1]) {
    const [r, g, b, a] = color;
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  program<Props extends {} = {}>(definition: GLProgramDefinition<Props>) {
    const cached = this.programs.get(definition as GLProgramDefinition);
    if (cached) {
      return cached;
    }
    const program = new GLProgram(this.gl, definition);
    this.programs.set(definition as GLProgramDefinition, program as GLProgram);
    return program as GLProgram<Props>;
  }

  texture(params: Partial<GLTextureParams> = {}) {
    return new GLTexture(this.gl, params);
  }

  framebuffer(texture?: GLTexture): GLFramebuffer {
    if (!texture) {
      texture = this.texture({
        width: this.canvas.width,
        height: this.canvas.height,
      });
    }
    return new GLFramebuffer(this.gl, texture);
  }

  buffer(params: Partial<GLBufferParams> = {}) {
    return new GLBuffer(this.gl, params);
  }

  dispose() {
    for (const program of Object.values(this.programs)) {
      program.dispose();
    }
    this.programs = new WeakMap();
  }
}
