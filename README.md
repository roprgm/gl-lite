# gl-lite

> A minimalist WebGL library for the browser

**gl-lite** is a lightweight, type-safe WebGL wrapper that makes it easy to work with WebGL/WebGL2 in the browser. It provides a clean, declarative API for creating shader programs, managing textures, buffers, and framebuffers without the boilerplate of raw WebGL.

🌐 **[gl-lite.dev](https://gl-lite.dev)**

## What is gl-lite?

**gl-lite** is a thin abstraction layer over WebGL/WebGL2 that simplifies common graphics programming tasks. Unlike full-featured 3D engines (Three.js, Babylon.js) or high-level frameworks, gl-lite focuses on providing a minimal, type-safe interface for direct WebGL operations. It's perfect for:

- **Shader-based graphics** - Creating custom shader effects, visualizations, and GPU-accelerated computations
- **2D/3D rendering** - Building custom rendering pipelines without the overhead of a full 3D engine
- **WebGL utilities** - Managing WebGL resources (textures, buffers, programs) with automatic cleanup
- **Learning WebGL** - Understanding WebGL concepts with a cleaner API than raw WebGL
- **Performance-critical graphics** - When you need direct GPU control without framework overhead
- **Render-to-texture** - Post-processing effects, off-screen rendering, and multi-pass rendering

## When to use gl-lite

✅ **Use gl-lite when:**

- You need direct WebGL control with less boilerplate
- You're building custom shader-based visualizations or effects
- You want type safety and modern TypeScript APIs
- You need a lightweight library (zero dependencies, small bundle)
- You're creating 2D graphics, data visualizations, or procedural art
- You want to learn WebGL with a cleaner API

❌ **Consider alternatives when:**

- You need a full 3D engine with scene graphs, cameras, and lighting (use Three.js, Babylon.js)
- You're building complex 3D applications with models, animations, and physics
- You need built-in geometry primitives and materials
- You want a high-level framework that handles everything for you

## Features

- 🎯 **Minimalist API** - Simple, intuitive interface for WebGL operations
- 📦 **Zero dependencies** - Pure TypeScript with no external deps
- 🎨 **Type-safe** - Full TypeScript support with comprehensive types
- 🚀 **Modern** - Built for ES modules and modern browsers
- 🔧 **Flexible** - Low-level control when you need it
- 🪶 **Lightweight** - Small bundle size
- 🧹 **Resource management** - Automatic cleanup and disposal of WebGL resources
- 💾 **Program caching** - Efficient program reuse via WeakMap-based caching
- 🔄 **Dynamic uniforms/attributes** - Support for function-based uniforms and attributes

## Installation

```bash
npm install gl-lite
```

## Quick Start

```typescript
import { GLRenderer } from "gl-lite";

// Create a renderer
const renderer = new GLRenderer({
  canvas: document.querySelector("canvas"),
});

// Create a shader program
const program = renderer.program({
  vert: `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,
  frag: `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.5, 1.0);
    }
  `,
  attributes: {
    position: {
      buffer: renderer.buffer({
        data: new Float32Array([-1, -1, 1, -1, 0, 1]),
      }),
      size: 2,
    },
  },
  count: 3,
});

// Render loop
function render() {
  renderer.clear([0, 0, 0, 1]);
  program.draw();
  requestAnimationFrame(render);
}
render();
```

## API Overview

### GLRenderer

The main entry point for creating a WebGL context and managing resources.

```typescript
const renderer = new GLRenderer({
  canvas: HTMLCanvasElement, // Optional: custom canvas element
  context: WebGLContext, // Optional: existing context
  attributes: WebGLContextAttributes, // Optional: context attributes
});

renderer.resize(width, height); // Resize canvas and viewport
renderer.clear([r, g, b, a]); // Clear colour and depth
renderer.program(definition); // Create/cache a program
renderer.texture(params); // Create a texture
renderer.framebuffer(texture, { depth }); // Create a framebuffer
renderer.buffer(params); // Create a buffer
renderer.dispose(); // Clean up every resource it created
```

### GLProgram

Manages shaders, uniforms, and attributes.

```typescript
const program = renderer.program({
  vert: string,                     // Vertex shader source
  frag: string,                     // Fragment shader source
  attributes: GLAttributes,         // Vertex attributes
  uniforms: GLUniforms,             // Shader uniforms
  primitive: 'triangles',           // Draw mode
  count: number,                    // Vertex count
  offset: number,                   // Vertex offset
  blend: GLBlendConfig,             // Blend configuration
  depth: boolean,                   // Enable depth testing
  instances: number,                // Instanced draw count (WebGL2)
  elements: GLBuffer,               // Index buffer (optional)
});

program.draw(props);                // Draw with optional props
program.use(() => { ... });         // Use program in callback
program.dispose();                  // Clean up
```

Uniform types come from the linked program, not from the shape of the value
you pass, so `int`, `bool`, `ivec`, `mat2`–`mat4`, samplers and float arrays
all write correctly. A uniform or attribute the shader does not use is
reported with `console.warn` and skipped — shader compilers drop unused
declarations, and that should not stop your program from running.

### GLTexture

Handles texture creation and management.

```typescript
const texture = renderer.texture({
  width: number,
  height: number,
  data: ImageData | HTMLImageElement | ArrayBufferView | null,
  format: "rgba" | "rgb" | "alpha" | "luminance" | "luminanceAlpha",
  type: "uint8" | "float",
  wrapS: "clamp" | "repeat" | "mirror",
  wrapT: "clamp" | "repeat" | "mirror",
  minFilter: "nearest" | "linear",
  magFilter: "nearest" | "linear",
  flipY: boolean,
});

texture.bind(unit); // Bind to texture unit
texture.update(params); // Update texture data
texture.resize(width, height); // Resize texture
texture.dispose(); // Clean up
```

### GLBuffer

Manages vertex and index buffers.

```typescript
const buffer = renderer.buffer({
  target: 'array' | 'element',      // Buffer type
  usage: 'static' | 'dynamic' | 'stream',
  data: TypedArray | number[],      // Buffer data
});

buffer.update(data);                // Update buffer data
buffer.use(() => { ... });          // Bind buffer in callback
buffer.dispose();                   // Clean up
```

Typed arrays are uploaded as they are. A plain number array has no inherent
type, so it takes one from the target: `float` for vertex data, `uint16` for
indices. Indices wider than that need an explicit `Uint32Array` together with
`indexType: 'uint32'`.

### GLFramebuffer

Render to texture functionality.

```typescript
const fbo = renderer.framebuffer(texture);

fbo.use(() => {
  // Render to texture
  renderer.clear([0, 0, 0, 1]);
  program.draw();
});

fbo.dispose(); // Clean up (the texture is not disposed)
```

A framebuffer frees only its own GL object — the texture belongs to whoever
created it. A render target created for you by `renderer.framebuffer()` is
still cleaned up by `renderer.dispose()`.

Pass `{ depth: true }` to attach a depth buffer when the pass needs depth
testing.

## Examples

### Dynamic Uniforms

```typescript
const program = renderer.program({
  frag: `
    precision mediump float;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 uv;
    
    void main() {
      vec2 p = uv * 2.0 - 1.0;
      float d = length(p);
      float c = sin(d * 10.0 - time) * 0.5 + 0.5;
      gl_FragColor = vec4(vec3(c), 1.0);
    }
  `,
  uniforms: {
    time: (props) => props.time,
    resolution: (props) => [props.width, props.height],
  },
});

// Render loop
let time = 0;
function render() {
  time += 0.016;
  renderer.clear();
  program.draw({
    time,
    width: canvas.width,
    height: canvas.height,
  });
  requestAnimationFrame(render);
}
```

### Texture Loading

```typescript
const image = new Image();
image.onload = () => {
  const texture = renderer.texture({
    data: image,
    flipY: true,
  });

  const program = renderer.program({
    frag: `
      precision mediump float;
      uniform sampler2D tex;
      varying vec2 uv;
      void main() {
        gl_FragColor = texture2D(tex, uv);
      }
    `,
    uniforms: {
      tex: texture,
    },
  });

  program.draw();
};
image.src = "image.png";
```

### Custom Geometry

```typescript
const positions = new Float32Array([
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
]);

const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

const program = renderer.program({
  attributes: {
    position: {
      buffer: renderer.buffer({ data: positions }),
      size: 2,
    },
  },
  elements: renderer.buffer({
    target: "element",
    data: indices,
  }),
  count: indices.length,
});

program.draw();
```

### Instanced Drawing

```typescript
const program = renderer.program({
  vert: `
    attribute vec2 position;
    attribute vec2 offset;
    void main() {
      gl_Position = vec4(position * 0.1 + offset, 0.0, 1.0);
    }
  `,
  frag: `
    precision mediump float;
    void main() { gl_FragColor = vec4(1.0); }
  `,
  attributes: {
    position: { buffer: quad, size: 2 },
    // Advances once per instance instead of once per vertex.
    offset: { buffer: offsets, size: 2, divisor: 1 },
  },
  instances: 1000,
});
```

### Depth Testing

```typescript
const program = renderer.program({
  vert: shader,
  frag: shader,
  depth: true,
});

// Render targets need a depth buffer of their own.
const fbo = renderer.framebuffer(texture, { depth: true });
```

## Types

gl-lite is fully typed with TypeScript. All classes and functions have comprehensive type definitions:

```typescript
import type {
  GLContext,
  GLMap,
  GLTextureParams,
  GLBufferParams,
  GLProgramDefinition,
  GLAttribute,
  GLUniforms,
  GLBlendConfig,
} from "gl-lite";
```

## Constants Mapping

Use human-readable names instead of WebGL constants:

```typescript
import { glMap } from "gl-lite";

const map = glMap(gl);

// Instead of gl.CLAMP_TO_EDGE
const wrap = map.wrap.clamp;

// Instead of gl.LINEAR
const filter = map.filter.linear;

// Instead of gl.TRIANGLES
const primitive = map.primitive.triangles;
```

## Comparison with Other Libraries

| Feature           | gl-lite                              | Three.js        | Raw WebGL       |
| ----------------- | ------------------------------------ | --------------- | --------------- |
| Bundle size       | ~6.5KB gzipped                       | ~150KB+ gzipped | 0KB             |
| Dependencies      | Zero                                 | Many            | None            |
| Learning curve    | Low                                  | Medium          | High            |
| Type safety       | Full TypeScript                      | Partial         | None            |
| API style         | Declarative                          | Object-oriented | Imperative      |
| Use case          | Custom shaders, lightweight graphics | Full 3D engine  | Maximum control |
| Scene graph       | ❌                                   | ✅              | ❌              |
| Built-in geometry | ❌                                   | ✅              | ❌              |
| Shader management | ✅                                   | ✅              | Manual          |
| Resource cleanup  | ✅                                   | ✅              | Manual          |

**gl-lite** sits between raw WebGL and full-featured engines, providing just enough abstraction to reduce boilerplate while maintaining direct control over the GPU.

## Browser Support

`GLRenderer` requests a WebGL2 context, which is available in:

- Chrome/Edge 56+
- Firefox 51+
- Safari 15+

The API itself works on WebGL1 too — pass your own context via
`new GLRenderer({ context })`. Instanced drawing is the one feature that
requires WebGL2.

## Development

```bash
# Install dependencies
bun install

# Build the library
bun run build

# Watch mode for development
bun run dev

# Type check
bun run typecheck

# Run the test suite in a headless browser
bun run test

# Run the same suite against the built package
bun run test:dist

# Run the examples (Vite, resolves gl-lite from source)
cd examples && bun install && bun run dev

# Run the standalone demo page (builds and serves on http://localhost:3000)
bun run example

# Preview the landing page
bun run preview

# Format code
bun run format
```

Tests render in a real browser with a real WebGL context and assert on the
pixels that come out, which is the only way to catch the state bugs that
matter here. Playwright drives Chromium; on a machine without a GPU it falls
back to SwiftShader, so no special hardware is needed.

### Project Structure

```
gl-lite/
├── src/           # Library source code
├── test/          # Browser test suite and its runner
├── examples/      # Vite examples app
├── dist/          # Built library (generated)
├── web/           # Landing page (deployed to gl-lite.dev)
├── example.html   # Standalone demo page
└── README.md
```

## Links

- 🌐 Website: [gl-lite.dev](https://gl-lite.dev)
- 📦 GitHub: [github.com/roprgm/gl-lite](https://github.com/roprgm/gl-lite)

## License

MIT © [roprgm](https://github.com/roprgm)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
