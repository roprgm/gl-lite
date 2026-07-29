import type { GLContext, GLResource } from "./types";
import type { GLMap } from "./constants";
import { glMap } from "./constants";
import { GLBuffer } from "./buffer";
import { GLTexture } from "./texture";

type BlendFactor = keyof GLMap["blendFactor"];
type BlendEquation = keyof GLMap["blendEquation"];
export type GLBlendConfig = {
  enabled?: boolean;
  srcFactor?: BlendFactor | [BlendFactor, BlendFactor];
  dstFactor?: BlendFactor | [BlendFactor, BlendFactor];
  equation?: BlendEquation | [BlendEquation, BlendEquation];
};

export type GLAttribute = {
  buffer: GLBuffer;
  size: number;
  type?: keyof GLMap["attributeType"];
  normalized?: boolean;
  stride?: number;
  offset?: number;
};

export type GLAttributes<Props = {}> = Record<
  string,
  GLAttribute | ((props: Props) => GLAttribute)
>;

export type GLUniformValue =
  | number
  | boolean
  | readonly number[]
  | Float32Array
  | Int32Array
  | GLTexture;

export type GLUniforms<Props = {}> = Record<
  string,
  GLUniformValue | ((props: Props) => GLUniformValue)
>;

export type GLProgramDefinition<Props extends {} = {}> = {
  vert?: string;
  frag?: string;
  primitive?: keyof GLMap["primitive"];
  count?: number;
  offset?: number;
  indexType?: keyof GLMap["indexType"];
  elements?: GLBuffer;
  attributes?: GLAttributes<Props>;
  uniforms?: GLUniforms<Props>;
  blend?: GLBlendConfig;
};

type GLProgramUniform<Props> = {
  name: string;
  location: WebGLUniformLocation;
  value: GLUniformValue | ((props: Props) => GLUniformValue);
};

type GLProgramAttribute<Props> = {
  name: string;
  location: number;
  value: GLAttribute | ((props: Props) => GLAttribute);
};

function parseBlendParam<K>(key: K | [K, K]): [K, K] {
  if (Array.isArray(key)) {
    return key;
  }
  return [key, key];
}

export class GLProgram<Props extends {} = {}> implements GLResource {
  readonly gl: GLContext;
  readonly handle: WebGLProgram;

  private blend: GLBlendConfig = {
    enabled: false,
  };

  private elements?: GLBuffer;
  private primitive: keyof GLMap["primitive"];
  private count: number;
  private offset: number;
  private indexType?: keyof GLMap["indexType"];

  private uniforms: Record<string, GLProgramUniform<Props>> = {};
  private attributes: Record<string, GLProgramAttribute<Props>> = {};

  static readonly DEFAULT_VERT = /* glsl */ `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  static readonly DEFAULT_FRAG = /* glsl */ `
    precision mediump float;
    varying vec2 uv;
    void main() {
      gl_FragColor = vec4(uv, 0.0, 1.0);
    }
  `;

  static createFSQuadBuffer(gl: GLContext) {
    return new GLBuffer(gl, {
      target: "array",
      usage: "static",
      data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    });
  }

  constructor(gl: GLContext, definition: GLProgramDefinition<Props> = {}) {
    this.gl = gl;

    const vert = definition.vert ?? GLProgram.DEFAULT_VERT;
    const frag = definition.frag ?? GLProgram.DEFAULT_FRAG;
    const attributes = definition.attributes ?? {
      position: {
        buffer: GLProgram.createFSQuadBuffer(gl),
        size: 2,
      },
    };

    if (!vert.length || !frag.length) {
      throw new Error("Program requires both vertex and fragment shaders");
    }

    if (definition.blend) {
      this.blend = definition.blend;
    }

    this.elements = definition.elements;
    this.primitive = definition.primitive ?? "triangleStrip";
    this.count = definition.count ?? 4;
    this.offset = definition.offset ?? 0;
    this.indexType = definition.indexType ?? "uint16";

    this.handle = this.buildProgram(gl, vert, frag);

    if (definition.uniforms) {
      this.uniforms = this.buildUniforms(gl, definition.uniforms);
    }

    if (attributes) {
      this.attributes = this.buildAttributes(gl, attributes);
    }
  }

  private buildUniforms(gl: GLContext, uniforms: GLUniforms<Props>) {
    const result: Record<string, GLProgramUniform<Props>> = {};
    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(this.handle, name);
      if (!location) {
        throw new Error(`Uniform not found: ${name}`);
      }
      result[name] = { name, location, value };
    }
    return result;
  }

  private buildAttributes(gl: GLContext, attributes: GLAttributes<Props>) {
    const result: Record<string, GLProgramAttribute<Props>> = {};
    for (const [name, value] of Object.entries(attributes)) {
      const location = gl.getAttribLocation(this.handle, name);
      if (location === -1) {
        throw new Error(`Attribute not found: ${name}`);
      }
      result[name] = { name, location, value };
    }
    return result;
  }

  private compileShader(gl: GLContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Failed to create shader");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      const log = gl.getShaderInfoLog(shader) ?? "";
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${log}`);
    }

    return shader;
  }

  private buildProgram(gl: GLContext, vertSrc: string, fragSrc: string) {
    const vert = this.compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = this.compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      throw new Error("Failed to create program");
    }

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
      const log = gl.getProgramInfoLog(program) ?? "";
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      throw new Error(`Program link failed: ${log}`);
    }

    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  private writeUniformArray(
    gl: GLContext,
    location: WebGLUniformLocation,
    value: Float32Array | Int32Array,
  ): void {
    const length = value.length;

    if (value instanceof Int32Array) {
      const intArray = value;
      switch (length) {
        case 1:
          gl.uniform1iv(location, intArray);
          return;
        case 2:
          gl.uniform2iv(location, intArray);
          return;
        case 3:
          gl.uniform3iv(location, intArray);
          return;
        case 4:
          gl.uniform4iv(location, intArray);
          return;
        default:
          throw new Error("Unsupported integer uniform array length");
      }
    }

    const floatArray =
      value instanceof Float32Array ? value : new Float32Array(value);

    switch (length) {
      case 1:
        gl.uniform1fv(location, floatArray);
        return;
      case 2:
        gl.uniform2fv(location, floatArray);
        return;
      case 3:
        gl.uniform3fv(location, floatArray);
        return;
      case 4:
        gl.uniform4fv(location, floatArray);
        return;
      case 9:
        gl.uniformMatrix3fv(location, false, floatArray);
        return;
      case 16:
        gl.uniformMatrix4fv(location, false, floatArray);
        return;
      default:
        throw new Error("Unsupported float uniform array length");
    }
  }

  private writeUniform(
    gl: GLContext,
    location: WebGLUniformLocation,
    value: GLUniformValue,
    textureUnit?: number,
  ) {
    if (textureUnit !== undefined) {
      gl.uniform1i(location, textureUnit);
      return;
    }

    if (typeof value === "number") {
      gl.uniform1f(location, value);
      return;
    }

    if (typeof value === "boolean") {
      gl.uniform1i(location, value ? 1 : 0);
      return;
    }

    if (Array.isArray(value)) {
      this.writeUniformArray(gl, location, new Float32Array(value));
      return;
    }

    if (value instanceof Float32Array || value instanceof Int32Array) {
      this.writeUniformArray(gl, location, value);
      return;
    }

    throw new Error("Unsupported uniform value");
  }

  private applyUniforms(props: Props) {
    const gl = this.gl;

    let textureUnit = 0;
    for (const uniform of Object.values(this.uniforms)) {
      const value =
        typeof uniform.value === "function"
          ? uniform.value(props)
          : uniform.value;

      if (value instanceof GLTexture) {
        value.bind(textureUnit);
        gl.uniform1i(uniform.location, textureUnit);
        textureUnit += 1;
        continue;
      }

      // Write uniform value to shader
      this.writeUniform(gl, uniform.location, value);
    }
  }

  private writeAttribute(
    gl: GLContext,
    location: number,
    attribute: GLAttribute,
  ) {
    if (attribute.buffer.target !== "array") {
      throw new Error("Attribute buffers must use the 'array' target");
    }

    const type = glMap(gl).attributeType[attribute.type ?? "float"] ?? gl.FLOAT;
    const normalized = attribute.normalized ?? false;
    const stride = attribute.stride ?? 0;
    const offset = attribute.offset ?? 0;

    attribute.buffer.use(() => {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        attribute.size,
        type,
        normalized,
        stride,
        offset,
      );
    });
  }

  /**
   * Vertex attribute arrays are global context state, not program state, so
   * every draw sets up exactly the arrays it needs and the caller tears them
   * down again. Returns the locations that were enabled.
   */
  private applyAttributes(props: Props) {
    const gl = this.gl;
    const locations: number[] = [];
    for (const attribute of Object.values(this.attributes)) {
      const value =
        typeof attribute.value === "function"
          ? attribute.value(props)
          : attribute.value;

      this.writeAttribute(gl, attribute.location, value);
      locations.push(attribute.location);
    }
    return locations;
  }

  private applyBlend() {
    if (this.blend?.enabled) {
      this.gl.enable(this.gl.BLEND);

      const [srcRGB, srcAlpha] = parseBlendParam(this.blend.srcFactor ?? "one");
      const [dstRGB, dstAlpha] = parseBlendParam(
        this.blend.dstFactor ?? "zero",
      );
      this.gl.blendFuncSeparate(
        glMap(this.gl).blendFactor[srcRGB],
        glMap(this.gl).blendFactor[dstRGB],
        glMap(this.gl).blendFactor[srcAlpha],
        glMap(this.gl).blendFactor[dstAlpha],
      );

      const [modeRGB, modeAlpha] = parseBlendParam(
        this.blend.equation ?? "add",
      );
      this.gl.blendEquationSeparate(
        glMap(this.gl).blendEquation[modeRGB],
        glMap(this.gl).blendEquation[modeAlpha],
      );
    } else {
      this.gl.disable(this.gl.BLEND);
    }
  }

  private drawElements(elements: GLBuffer) {
    if (elements.target !== "element") {
      throw new Error("Indexed draws require an element buffer");
    }

    const mode = glMap(this.gl).primitive[this.primitive];
    const type = glMap(this.gl).indexType[this.indexType ?? "uint16"];

    elements.use(() => {
      this.gl.drawElements(mode, this.count ?? 4, type, this.offset ?? 0);
    });
  }

  private drawArrays() {
    const mode = glMap(this.gl).primitive[this.primitive];
    this.gl.drawArrays(mode, this.offset ?? 0, this.count ?? 4);
  }

  use(fn: () => void) {
    const gl = this.gl;
    const previous = gl.getParameter(gl.CURRENT_PROGRAM);
    if (previous === this.handle) {
      fn();
      return;
    }

    gl.useProgram(this.handle);
    try {
      fn();
    } finally {
      gl.useProgram(previous);
    }
  }

  draw(props: Props = {} as Props) {
    this.use(() => {
      this.applyBlend();
      this.applyUniforms(props);
      const locations = this.applyAttributes(props);

      try {
        if (this.elements) {
          this.drawElements(this.elements);
        } else {
          this.drawArrays();
        }
      } finally {
        for (const location of locations) {
          this.gl.disableVertexAttribArray(location);
        }
      }
    });
  }

  dispose() {
    this.gl.deleteProgram(this.handle);
  }
}
