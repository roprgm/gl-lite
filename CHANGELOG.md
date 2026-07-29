# Changelog

## Unreleased

### Fixed

- `GLFramebuffer.use()` left the viewport sized to its texture, silently
  clipping everything drawn to the canvas afterwards.
- `GLFramebuffer.use()`, its constructor, and `GLBuffer.use()` restored
  bindings to `null` instead of the previous binding, so nesting them sent the
  enclosing pass to the wrong target. All of them now restore in a `finally`.
- Vertex attribute bindings were cached per program even though attribute
  arrays are global context state, so two programs sharing a location silently
  rendered each other's geometry.
- Attribute arrays stayed enabled after a draw, leaking into the next program.
- A plain number array passed as index data became a `Float32Array` and was
  read as `uint16`, producing garbage indices with no GL error.
- `ArrayLike<number>` buffer data that was not a real `Array` was dropped
  without uploading anything.
- Uniform types were guessed from the JavaScript value, so `int` and `sampler`
  uniforms failed and any nine or sixteen floats were forced into a matrix.
  Types now come from the linked program.
- Disposed resources stayed in the renderer's tracking set forever.
- `GLFramebuffer.dispose()` destroyed a texture the caller had supplied.
- The program cache handed back programs that had already been disposed.
- An incomplete framebuffer discarded every draw with no error; completeness
  is now checked at construction and reported with the reason.

### Changed

- A uniform or attribute the shader does not use now warns and is skipped
  instead of throwing. (Addresses the problem raised in #7.)
- `renderer.clear()` clears depth alongside colour.
- The renderer no longer forces `depth: false` on the context, restoring
  WebGL's own default.
- `glMap` is built once per context instead of on every call.
- Published unminified as ESM with sourcemaps, and marked `sideEffects: false`.

### Added

- Depth testing: `depth: true` on a program, `{ depth: true }` on a render
  target.
- Instanced drawing: `divisor` on an attribute, `instances` on a program.
- `GLProgram.handle` is public, matching the other resources.
- A browser-based test suite and CI.

### Removed

- `drawMode` from `GLMap`: an unused duplicate of `primitive` that was missing
  `triangles`.

## 0.0.2

- Support for `blendFuncSeparate` and `blendEquationSeparate` (#5, #6).
- All remaining `blendFunc` values (#3, #4).
- `triangles` draw mode (#1, #2).
- Error handling for buffer creation.
