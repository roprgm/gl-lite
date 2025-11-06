import type { GLContext, GLResource } from "./types";
import { GLBuffer, type GLBufferParams } from "./buffer";
import { GLTexture, type GLTextureParams } from "./texture";
import { GLFramebuffer } from "./framebuffer";
import { GLProgram, type GLProgramDefinition } from "./program";

export type GLRendererParams = {
  context?: GLContext;
  canvas?: HTMLCanvasElement;
  attributes?: WebGLContextAttributes;
};

export class GLRenderer {
  gl: GLContext;
  programs: WeakMap<GLProgramDefinition, GLProgram>;
  private resources = new Set<GLResource>();

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
    this.resources.add(program as GLProgram);
    return program as GLProgram<Props>;
  }

  texture(params: Partial<GLTextureParams> = {}) {
    const texture = new GLTexture(this.gl, params);
    this.resources.add(texture);
    return texture;
  }

  framebuffer(texture?: GLTexture): GLFramebuffer {
    if (!texture) {
      texture = this.texture({
        width: this.canvas.width,
        height: this.canvas.height,
      });
    }
    const framebuffer = new GLFramebuffer(this.gl, texture);
    this.resources.add(framebuffer);
    return framebuffer;
  }

  buffer(params: Partial<GLBufferParams> = {}) {
    const buffer = new GLBuffer(this.gl, params);
    this.resources.add(buffer);
    return buffer;
  }

  dispose() {
    for (const resource of this.resources) {
      resource.dispose();
    }
    this.resources.clear();
    this.programs = new WeakMap();
  }
}
