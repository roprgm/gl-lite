import type { GLContext, GLResource } from "./types";
import { GLBuffer, type GLBufferParams } from "./buffer";
import { GLTexture, type GLTextureParams } from "./texture";
import { GLFramebuffer, type GLFramebufferParams } from "./framebuffer";
import { GLProgram, type GLProgramDefinition } from "./program";

export type GLRendererParams = {
  context?: GLContext;
  canvas?: HTMLCanvasElement | null;
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
    const gl = this.gl;
    const [r, g, b, a] = color;
    gl.clearColor(r, g, b, a);
    // Clearing depth on a target that has none is a no-op, so this stays
    // correct whether or not a depth buffer is in play.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Registers a resource for bulk cleanup, and unregisters it again when it is
   * disposed on its own so a long-running app does not accumulate dead
   * wrappers.
   */
  private track<T extends GLResource>(resource: T, onDispose?: () => void): T {
    this.resources.add(resource);
    const dispose = resource.dispose.bind(resource);
    resource.dispose = () => {
      this.resources.delete(resource);
      onDispose?.();
      dispose();
    };
    return resource;
  }

  program<Props extends {} = {}>(definition: GLProgramDefinition<Props>) {
    const key = definition as GLProgramDefinition;
    const cached = this.programs.get(key);
    if (cached) {
      return cached as GLProgram<Props>;
    }
    const program = this.track(new GLProgram(this.gl, definition), () =>
      this.programs.delete(key),
    );
    this.programs.set(key, program as GLProgram);
    return program;
  }

  texture(params: Partial<GLTextureParams> = {}) {
    return this.track(new GLTexture(this.gl, params));
  }

  /**
   * A framebuffer never disposes its texture — whoever created the texture
   * owns it. When one is created here it is tracked like any other resource.
   */
  framebuffer(
    texture?: GLTexture,
    params: Partial<GLFramebufferParams> = {},
  ): GLFramebuffer {
    const target =
      texture ??
      this.texture({
        width: this.canvas.width,
        height: this.canvas.height,
      });
    return this.track(new GLFramebuffer(this.gl, target, params));
  }

  buffer(params: Partial<GLBufferParams> = {}) {
    return this.track(new GLBuffer(this.gl, params));
  }

  dispose() {
    for (const resource of this.resources) {
      resource.dispose();
    }
    this.resources.clear();
    this.programs = new WeakMap();
  }
}
