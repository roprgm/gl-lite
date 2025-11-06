// Generic type for WebGL context
export type GLContext = WebGLRenderingContext | WebGL2RenderingContext;

// Resource lifecycle interface
export type GLResource = {
  dispose(): void;
};
