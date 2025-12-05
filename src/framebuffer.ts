import type { GLContext, GLResource } from "./types";
import { GLTexture } from "./texture";

export class GLFramebuffer implements GLResource {
  readonly gl: GLContext;
  readonly texture: GLTexture;
  readonly handle: WebGLFramebuffer;

  constructor(gl: GLContext, texture: GLTexture) {
    this.gl = gl;
    this.texture = texture;
    const handle = gl.createFramebuffer();
    if (!handle) {
      throw new Error("Failed to create framebuffer");
    }
    this.handle = handle;

    // bind
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture.handle,
      0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  use(fn: () => void) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.handle);
    this.gl.viewport(0, 0, this.texture.width, this.texture.height);
    fn();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  dispose() {
    this.gl.deleteFramebuffer(this.handle);
    this.texture.dispose();
  }
}
