import type { GLContext, GLResource } from "./types";
import type { GLMap } from "./constants";
import { glMap } from "./constants";

export type GLBufferData = ArrayBufferView | ArrayLike<number> | null;

export type GLBufferParams = {
  target: keyof GLMap["bufferTarget"];
  usage: keyof GLMap["bufferUsage"];
  data: GLBufferData;
};

export class GLBuffer implements GLResource {
  target: keyof GLMap["bufferTarget"];
  usage: keyof GLMap["bufferUsage"];

  readonly gl: GLContext;
  readonly handle: WebGLBuffer;

  constructor(gl: GLContext, params: Partial<GLBufferParams> = {}) {
    this.gl = gl;
    this.handle = gl.createBuffer();

    this.target = params.target ?? "array";
    this.usage = params.usage ?? "static";

    if (params.data) {
      this.update(params.data);
    }
  }

  private normalizeData(data: GLBufferData): ArrayBufferView | null {
    if (ArrayBuffer.isView(data)) {
      return data;
    }
    if (Array.isArray(data)) {
      return new Float32Array(data);
    }
    return null;
  }

  use(fn: () => void) {
    if (!this.handle) return;
    const targetEnum = glMap(this.gl).bufferTarget[this.target];
    this.gl.bindBuffer(targetEnum, this.handle);
    fn();
    this.gl.bindBuffer(targetEnum, null);
  }

  update(data: GLBufferData) {
    if (!this.handle) return;
    const targetEnum = glMap(this.gl).bufferTarget[this.target];
    const usageEnum = glMap(this.gl).bufferUsage[this.usage];
    const payload = this.normalizeData(data);
    this.use(() => {
      if (payload) {
        this.gl.bufferData(targetEnum, payload, usageEnum);
      } else {
        this.gl.bufferData(targetEnum, 0, usageEnum);
      }
    });
  }

  dispose() {
    this.gl.deleteBuffer(this.handle);
  }
}
