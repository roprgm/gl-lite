import type { GLContext } from "./types.js";

// Map WebGL constants to human-readable values
export const glMap = (gl: GLContext) => ({
  format: {
    rgba: gl.RGBA,
    rgb: gl.RGB,
    alpha: gl.ALPHA,
    luminance: gl.LUMINANCE,
    luminanceAlpha: gl.LUMINANCE_ALPHA,
  },
  type: {
    uint8: gl.UNSIGNED_BYTE,
    float: gl.FLOAT,
  },
  wrap: {
    clamp: gl.CLAMP_TO_EDGE,
    repeat: gl.REPEAT,
    mirror: gl.MIRRORED_REPEAT,
  },
  filter: {
    nearest: gl.NEAREST,
    linear: gl.LINEAR,
  },
  attributeType: {
    float: gl.FLOAT,
    byte: gl.BYTE,
    short: gl.SHORT,
    unsignedByte: gl.UNSIGNED_BYTE,
    unsignedShort: gl.UNSIGNED_SHORT,
  },
  indexType: {
    uint8: gl.UNSIGNED_BYTE,
    uint16: gl.UNSIGNED_SHORT,
    uint32: gl.UNSIGNED_INT,
  },
  blendFactor: {
    zero: gl.ZERO,
    one: gl.ONE,
    srcColor: gl.SRC_COLOR,
    oneMinusSrcColor: gl.ONE_MINUS_SRC_COLOR,
    dstColor: gl.DST_COLOR,
    oneMinusDstColor: gl.ONE_MINUS_DST_COLOR,
  },
  blendEquation: {
    add: gl.FUNC_ADD,
    subtract: gl.FUNC_SUBTRACT,
    reverseSubtract: gl.FUNC_REVERSE_SUBTRACT,
  },
  primitive: {
    points: gl.POINTS,
    lines: gl.LINES,
    lineStrip: gl.LINE_STRIP,
    lineLoop: gl.LINE_LOOP,
    triangleStrip: gl.TRIANGLE_STRIP,
    triangleFan: gl.TRIANGLE_FAN,
  },
  drawMode: {
    points: gl.POINTS,
    lines: gl.LINES,
    lineStrip: gl.LINE_STRIP,
    lineLoop: gl.LINE_LOOP,
    triangleStrip: gl.TRIANGLE_STRIP,
    triangleFan: gl.TRIANGLE_FAN,
  },
  bufferTarget: {
    array: gl.ARRAY_BUFFER,
    element: gl.ELEMENT_ARRAY_BUFFER,
  },
  bufferUsage: {
    static: gl.STATIC_DRAW,
    dynamic: gl.DYNAMIC_DRAW,
    stream: gl.STREAM_DRAW,
  },
});

export type GLMap = ReturnType<typeof glMap>;
