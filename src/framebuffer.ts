import type { GLContext, GLResource } from "./types";
import { GLTexture } from "./texture";

/**
 * An incomplete framebuffer silently discards every draw, so the reason is
 * worth naming at construction rather than leaving as a blank render target.
 */
function assertComplete(gl: GLContext) {
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status === gl.FRAMEBUFFER_COMPLETE) {
    return;
  }
  const reasons: Record<number, string> = {
    [gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT]:
      "the attached texture cannot be rendered to in this format",
    [gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT]: "nothing is attached",
    [gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS]:
      "the attachments have different sizes",
    [gl.FRAMEBUFFER_UNSUPPORTED]:
      "this combination of formats is unsupported here",
  };
  throw new Error(
    `Framebuffer is incomplete: ${reasons[status] ?? `status ${status}`}`,
  );
}

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

    const previous = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
    try {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.texture.handle,
        0,
      );
      assertComplete(gl);
    } catch (error) {
      gl.deleteFramebuffer(this.handle);
      throw error;
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, previous);
    }
  }

  use(fn: () => void) {
    const gl = this.gl;
    const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const [x, y, width, height] = gl.getParameter(gl.VIEWPORT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.handle);
    gl.viewport(0, 0, this.texture.width, this.texture.height);
    try {
      fn();
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
      gl.viewport(x, y, width, height);
    }
  }

  /** Frees the framebuffer only: the texture belongs to whoever created it. */
  dispose() {
    this.gl.deleteFramebuffer(this.handle);
  }
}
