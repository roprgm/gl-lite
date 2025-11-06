import type { GLContext, GLResource } from "./types";
import type { GLMap } from "./constants";
import { glMap } from "./constants";

export type GLTextureSource = TexImageSource | ArrayBufferView | null;

export type GLTextureParams = {
  width: number;
  height: number;
  data: GLTextureSource;
  format: keyof GLMap["format"];
  type: keyof GLMap["type"];
  wrapS: keyof GLMap["wrap"];
  wrapT: keyof GLMap["wrap"];
  minFilter: keyof GLMap["filter"];
  magFilter: keyof GLMap["filter"];
  flipY: boolean;
};

export class GLTexture implements GLResource {
  readonly gl: GLContext;
  readonly handle: WebGLTexture;

  params: GLTextureParams = {
    width: 1,
    height: 1,
    data: null,
    format: "rgba",
    type: "uint8",
    wrapS: "clamp",
    wrapT: "clamp",
    minFilter: "linear",
    magFilter: "linear",
    flipY: false,
  };

  constructor(gl: GLContext, params: Partial<GLTextureParams> = {}) {
    const handle = gl.createTexture();
    if (!handle) {
      throw new Error("Failed to create texture");
    }

    this.gl = gl;
    this.handle = handle;
    this.update(params);
  }

  get width() {
    return this.params.width;
  }

  get height() {
    return this.params.height;
  }

  bind(unit = 0) {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.handle);
  }

  update(params: Partial<GLTextureParams> = {}) {
    const gl = this.gl;
    const map = glMap(gl);

    this.params = { ...this.params, ...params };

    const minFilter = map.filter[this.params.minFilter];
    const magFilter = map.filter[this.params.magFilter];
    const wrapS = map.wrap[this.params.wrapS];
    const wrapT = map.wrap[this.params.wrapT];
    const format = map.format[this.params.format];
    const type = map.type[this.params.type];
    const data = this.params.data;

    gl.bindTexture(gl.TEXTURE_2D, this.handle);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.params.flipY ? 1 : 0);

    if (data && !ArrayBuffer.isView(data)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, format, format, type, data);
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        format,
        this.width,
        this.height,
        0,
        format,
        type,
        data,
      );
    }
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) {
      throw new Error("Texture width and height must be positive");
    }
    if (width === this.width && height === this.height) {
      return;
    }
    this.update({ width, height });
  }

  dispose() {
    this.gl.deleteTexture(this.handle);
  }
}
