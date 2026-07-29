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
    const handle = gl.createBuffer();
    if (!handle) {
      throw new Error("Failed to create buffer");
    }
    this.handle = handle;

    this.target = params.target ?? "array";
    this.usage = params.usage ?? "static";

    if (params.data) {
      this.update(params.data);
    }
  }

  /**
   * Typed arrays are uploaded as-is. Loose numbers have no inherent type, so
   * it comes from the target: vertex data is float, indices are integer.
   */
  private normalizeData(data: GLBufferData): ArrayBufferView | null {
    if (data === null) {
      return null;
    }
    if (ArrayBuffer.isView(data)) {
      return data;
    }

    const values = Array.from(data);
    if (this.target !== "element") {
      return new Float32Array(values);
    }

    // Matches the default `indexType` of "uint16"; anything wider has to be
    // passed as a typed array so the draw call can be told about it too.
    if (values.some((value) => value < 0 || value > 0xffff)) {
      throw new Error(
        "Index values must be between 0 and 65535; wider indices need a Uint32Array drawn with indexType: 'uint32'",
      );
    }
    return new Uint16Array(values);
  }

  use(fn: () => void) {
    const gl = this.gl;
    const targetEnum = glMap(gl).bufferTarget[this.target];
    const bindingEnum =
      this.target === "array"
        ? gl.ARRAY_BUFFER_BINDING
        : gl.ELEMENT_ARRAY_BUFFER_BINDING;
    const previous = gl.getParameter(bindingEnum);

    gl.bindBuffer(targetEnum, this.handle);
    try {
      fn();
    } finally {
      gl.bindBuffer(targetEnum, previous);
    }
  }

  update(data: GLBufferData) {
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
