# gl-lite

> A minimalist WebGL library for the browser

**gl-lite** is a lightweight, type-safe WebGL wrapper that makes it easy to work with WebGL/WebGL2 in the browser.

🌐 **[gl-lite.dev](https://gl-lite.dev)**

## Features

- 🎯 **Minimalist API** - Simple, intuitive interface for WebGL operations
- 📦 **Zero dependencies** - Pure TypeScript with no external deps
- 🎨 **Type-safe** - Full TypeScript support with comprehensive types
- 🚀 **Modern** - Built for ES modules and modern browsers
- 🔧 **Flexible** - Low-level control when you need it
- 🪶 **Lightweight** - Small bundle size

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
renderer.clear([r, g, b, a]); // Clear with color
renderer.program(definition); // Create/cache a program
renderer.texture(params); // Create a texture
renderer.framebuffer(texture); // Create a framebuffer
renderer.buffer(params); // Create a buffer
renderer.dispose(); // Clean up resources
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
  elements: GLBuffer,               // Index buffer (optional)
});

program.draw(props);                // Draw with optional props
program.use(() => { ... });         // Use program in callback
program.dispose();                  // Clean up
```

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
  data: Float32Array | number[],    // Buffer data
});

buffer.update(data);                // Update buffer data
buffer.use(() => { ... });          // Bind buffer in callback
buffer.dispose();                   // Clean up
```

### GLFramebuffer

Render to texture functionality.

```typescript
const fbo = renderer.framebuffer(texture);

fbo.use(() => {
  // Render to texture
  renderer.clear([0, 0, 0, 1]);
  program.draw();
});

fbo.dispose(); // Clean up (also disposes texture)
```

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

## Browser Support

gl-lite works in all modern browsers that support WebGL or WebGL2:

- Chrome/Edge 56+
- Firefox 51+
- Safari 15+

## Development

```bash
# Install dependencies
bun install

# Build the library
bun run build

# Watch mode for development
bun run dev

# Run the example (builds and serves on http://localhost:3000)
bun run example

# Format code
bun run format
```

## Links

- 🌐 Website: [gl-lite.dev](https://gl-lite.dev)
- 📦 GitHub: [github.com/roprgm/gl-lite](https://github.com/roprgm/gl-lite)

## License

MIT © [roprgm](https://github.com/roprgm)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
