/**
 * WebGL helpers shared by the test suites.
 */

import { GLRenderer, type GLRendererParams } from "gl-lite";
import { onCleanup } from "./harness";

export type RendererHandle = {
  renderer: GLRenderer;
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
};

/**
 * Creates a renderer scoped to the current test.
 *
 * Browsers cap the number of simultaneously live WebGL contexts (~16), and a
 * suite creates far more than that, so each context is explicitly killed with
 * WEBGL_lose_context once the test finishes rather than waiting for GC.
 */
export function useRenderer(
  params: GLRendererParams = {},
  size = 64,
): RendererHandle {
  const canvas = params.canvas ?? document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const renderer = new GLRenderer({ ...params, canvas });
  const gl = renderer.gl;
  onCleanup(() => {
    renderer.dispose();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  });
  return { renderer, gl, canvas };
}

/** Creates a bare WebGL1 context scoped to the current test. */
export function useWebGL1Context(size = 64): WebGLRenderingContext {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const gl = canvas.getContext("webgl");
  if (!gl) {
    throw new Error("WebGL1 is unavailable in this browser");
  }
  onCleanup(() => gl.getExtension("WEBGL_lose_context")?.loseContext());
  return gl;
}

/** Reads a single RGBA pixel from whatever is currently bound. */
export function readPixel(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  x: number,
  y: number,
): number[] {
  const pixel = new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  return Array.from(pixel);
}

/** Reads the centre pixel of the current draw surface. */
export function readCenter(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  width: number,
  height: number,
): number[] {
  return readPixel(gl, Math.floor(width / 2), Math.floor(height / 2));
}

/** Fragment shader emitting a constant colour, for geometry assertions. */
export function solidFrag(r: number, g: number, b: number, a = 1): string {
  return /* glsl */ `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)}, ${a.toFixed(3)});
    }
  `;
}

/** Vertices of a triangle strip covering the whole clip volume. */
export const FULLSCREEN_QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

/** Asserts that the context has recorded no GL error. */
export function expectNoGLError(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  context = "",
) {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    const names: Record<number, string> = {
      [gl.INVALID_ENUM]: "INVALID_ENUM",
      [gl.INVALID_VALUE]: "INVALID_VALUE",
      [gl.INVALID_OPERATION]: "INVALID_OPERATION",
      [gl.OUT_OF_MEMORY]: "OUT_OF_MEMORY",
      [gl.INVALID_FRAMEBUFFER_OPERATION]: "INVALID_FRAMEBUFFER_OPERATION",
    };
    throw new Error(
      `unexpected GL error ${names[error] ?? error}${context ? ` (${context})` : ""}`,
    );
  }
}
