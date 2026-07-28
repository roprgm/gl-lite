import { glMap } from "gl-lite";
import { describe, it, expect } from "../harness";
import { useRenderer } from "../gl";

describe("glMap", () => {
  it("maps texture formats and types to context enums", () => {
    const { gl } = useRenderer();
    const map = glMap(gl);
    expect(map.format.rgba).toBe(gl.RGBA);
    expect(map.format.luminanceAlpha).toBe(gl.LUMINANCE_ALPHA);
    expect(map.type.uint8).toBe(gl.UNSIGNED_BYTE);
    expect(map.type.float).toBe(gl.FLOAT);
  });

  it("maps sampler state to context enums", () => {
    const { gl } = useRenderer();
    const map = glMap(gl);
    expect(map.wrap.clamp).toBe(gl.CLAMP_TO_EDGE);
    expect(map.wrap.mirror).toBe(gl.MIRRORED_REPEAT);
    expect(map.filter.nearest).toBe(gl.NEAREST);
  });

  it("exposes every blend factor WebGL accepts", () => {
    const { gl } = useRenderer();
    const map = glMap(gl);
    const expected: Record<string, number> = {
      zero: gl.ZERO,
      one: gl.ONE,
      srcColor: gl.SRC_COLOR,
      oneMinusSrcColor: gl.ONE_MINUS_SRC_COLOR,
      dstColor: gl.DST_COLOR,
      oneMinusDstColor: gl.ONE_MINUS_DST_COLOR,
      srcAlpha: gl.SRC_ALPHA,
      oneMinusSrcAlpha: gl.ONE_MINUS_SRC_ALPHA,
      dstAlpha: gl.DST_ALPHA,
      oneMinusDstAlpha: gl.ONE_MINUS_DST_ALPHA,
      constantColor: gl.CONSTANT_COLOR,
      oneMinusConstantColor: gl.ONE_MINUS_CONSTANT_COLOR,
      constantAlpha: gl.CONSTANT_ALPHA,
      oneMinusConstantAlpha: gl.ONE_MINUS_CONSTANT_ALPHA,
      srcAlphaSaturate: gl.SRC_ALPHA_SATURATE,
    };
    expect(map.blendFactor).toEqual(expected);
  });

  it("exposes every draw primitive", () => {
    const { gl } = useRenderer();
    const map = glMap(gl);
    expect(map.primitive).toEqual({
      points: gl.POINTS,
      lines: gl.LINES,
      lineStrip: gl.LINE_STRIP,
      lineLoop: gl.LINE_LOOP,
      triangles: gl.TRIANGLES,
      triangleStrip: gl.TRIANGLE_STRIP,
      triangleFan: gl.TRIANGLE_FAN,
    });
  });

  it("maps buffer targets, usages and index types", () => {
    const { gl } = useRenderer();
    const map = glMap(gl);
    expect(map.bufferTarget.array).toBe(gl.ARRAY_BUFFER);
    expect(map.bufferTarget.element).toBe(gl.ELEMENT_ARRAY_BUFFER);
    expect(map.bufferUsage.static).toBe(gl.STATIC_DRAW);
    expect(map.bufferUsage.stream).toBe(gl.STREAM_DRAW);
    expect(map.indexType.uint16).toBe(gl.UNSIGNED_SHORT);
    expect(map.indexType.uint32).toBe(gl.UNSIGNED_INT);
  });

  it("maps blend equations", () => {
    const { gl } = useRenderer();
    const map = glMap(gl);
    expect(map.blendEquation.add).toBe(gl.FUNC_ADD);
    expect(map.blendEquation.subtract).toBe(gl.FUNC_SUBTRACT);
    expect(map.blendEquation.reverseSubtract).toBe(gl.FUNC_REVERSE_SUBTRACT);
  });
});
