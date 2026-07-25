# gl-lite — Análisis y next steps

Estado analizado: `main` @ `9ec8fa4` · v0.0.2 publicada en npm · ~800 LOC en `src/` · 10.7 KB raw / 3.7 KB gzip.

La base es sólida y el alcance está bien elegido (wrapper delgado, sin dependencias, tipado).
Los problemas no son de diseño sino de madurez: **no hay tests, no hay CI, y hay cuatro bugs
funcionales confirmados** que un usuario encuentra en la primera hora de uso.

Los bugs de la sección P0 fueron reproducidos en Chromium headless con SwiftShader, con controles
que descartan falsos positivos (ver [Apéndice](#apéndice-cómo-se-verificaron-los-bugs)).

---

## P0 — Bugs confirmados

### 1. `GLFramebuffer.use()` no restaura el viewport

`src/framebuffer.ts:30-35` deja el viewport apuntando al tamaño de la textura. Todo lo que se dibuje
a pantalla después queda recortado, sin ningún error de WebGL que lo delate.

```
viewport antes de fbo.use()  → [0, 0, 64, 64]
viewport después de fbo.use() → [0, 0, 8, 8]   ← nunca se restaura
```

Es el bug más caro del repo porque rompe el caso de uso que el README destaca (render-to-texture,
post-procesado, multi-pass). **Fix:** guardar `gl.getParameter(gl.VIEWPORT)` y restaurarlo en un
`finally`.

### 2. `use()` restaura a `null` en vez de al binding previo

Mismo archivo, línea 34: `bindFramebuffer(FRAMEBUFFER, null)`. Con `use()` anidados, el interno
devuelve el render a pantalla y el externo sigue dibujando al canvas sin saberlo. `GLBuffer.use()`
(`src/buffer.ts:46-52`) tiene exactamente el mismo patrón. `GLProgram.use()` sí lo hace bien
(`src/program.ts:425-439`) — conviene unificar los tres con el mismo criterio save/restore + `finally`.

### 3. La caché de atributos se desincroniza del estado global

`src/program.ts:91` y `365-382`: `attributeCache` es **por programa**, pero los vertex attrib arrays
son **estado global** del contexto en WebGL1 (y en WebGL2 sin VAO). Dos programas que comparten la
location 0 se pisan entre sí y la caché impide el rebind.

Repro mínimo — `progA` (rojo, fullscreen) y `progB` (verde, esquina):

```js
progA.draw(); // cachea loc0 → bufA
progB.draw(); // rebindea loc0 → bufB (estado global)
progA.draw(); // cache hit → NO rebindea, dibuja con la geometría de B
```

Píxel central esperado `[255,0,0,255]`, obtenido `[0,0,0,255]`. Control: `progA` solo sí da rojo,
así que el fallo es la caché.

**Fix corto:** eliminar la caché (el rebind por draw es barato). **Fix correcto:** VAOs
(`createVertexArray`), que además hacen la caché innecesaria y son un win de performance real.
Ver [P2 #1](#p2--api-lo-que-falta-para-uso-serio).

### 4. Índices como `number[]` se convierten a `Float32Array` en silencio

`src/buffer.ts:36-44`: `normalizeData` asume Float32 siempre. Un element buffer creado con
`{ target: "element", data: [0,1,2,0,2,3] }` produce floats leídos como `uint16` → basura.
No se dibuja nada, `gl.getError()` devuelve `0`. Control con `Uint16Array`: dibuja correcto.

**Fix:** elegir el tipo según `target` (`element` → `Uint16Array`/`Uint32Array` según el rango) o
rechazar arrays planos en element buffers con un error explícito.

Relacionado, mismo método: el tipo declara `ArrayLike<number>` pero solo se maneja `Array.isArray`.
Cualquier otro `ArrayLike` cae en `return null` y **los datos se descartan sin aviso**.

---

## P1 — Infraestructura (bloquea todo lo demás)

### 5. Cero tests

No hay tests, no hay script `test`, y `tsconfig.json` incluye un directorio `test` que no existe.
Los cuatro bugs de arriba los habría atrapado cualquier suite mínima.

Lo bueno: **el testing headless con GPU real funciona**. Playwright + Chromium con SwiftShader
corre WebGL2 completo, y `readPixels` permite aserciones sobre píxeles — que es la única forma
honesta de testear esta librería. La receta exacta está en el apéndice.

Suite inicial sugerida (~30 tests): un test por bug de P0 como regresión, más cobertura de
compilación de shaders, uniforms de cada tipo, ciclo de vida de recursos y render-to-texture.

### 6. Sin CI

No existe `.github/`. Con una suite headless andando, el workflow es directo: typecheck →
`prettier --check` → tests en Chromium → chequeo de tamaño de bundle. Sumar `size-limit` con
presupuesto en gzip: el README vende "lightweight" y hoy nada lo defiende.

### 7. Build y packaging inconsistentes

| Problema      | Detalle                                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Formato       | `tsup.config.ts` declara `["esm","cjs"]`, pero el script de build pasa `--format esm` y gana el CLI. El `exports` no tiene condición `require`. Nunca se emitió CJS.     |
| Minificado    | `minify: true` publica `dist/index.js` minificado **sin sourcemaps**. Para una librería es contraproducente: el consumidor ya minifica, y así el stacktrace es ilegible. |
| Sourcemaps    | `tsconfig` pide `sourceMap` y `declarationMap`, pero tsup no recibe `--sourcemap` y no se emiten.                                                                        |
| `sideEffects` | Ausente en `package.json` → tree-shaking peor del necesario.                                                                                                             |

**Decisión pendiente:** ESM-only (y limpiar `tsup.config.ts`) o publicar ambos formatos de verdad.
Recomiendo ESM-only + sin minificar + con sourcemaps.

### 8. Release sin proceso

No hay tags de git, ni CHANGELOG, ni releases en GitHub. Hay **dos commits sin publicar** sobre
0.0.2, uno de ellos con una feature pedida por un usuario (blendFuncSeparate, issue #5). Quien la
pidió no tiene forma de usarla sin clonar el repo.

Sugerido: changesets o release-please + publish desde CI con npm provenance, y cortar 0.0.3 ya.

---

## P2 — API: lo que falta para uso serio

Ordenado por relación impacto/esfuerzo:

1. **VAOs (WebGL2).** Arregla el bug #3 de raíz, elimina la caché frágil y reduce llamadas por draw.
2. **Uniforms por introspección.** Hoy el tipo se adivina desde el valor JS: todo `number` va a
   `uniform1f`, así que un `uniform int` o un `sampler` manual genera error de GL; y un array de
   largo 9 o 16 se interpreta _siempre_ como `mat3`/`mat4`, con lo cual un `float[9]` es
   inexpresable (`src/program.ts:255-280`). Leer `getActiveUniform` al linkear resuelve tipos,
   arrays y structs de una vez.
3. **Uniform faltante no debería tirar.** `src/program.ts:159-162` y `172-177` lanzan cuando el
   compilador elimina un uniform no usado — algo normal durante el desarrollo de un shader.
   El PR #7 propuso un `missingHandler` (`error` | `warning` | `ignore`) y se cerró sin mergear;
   el problema sigue vigente y vale la pena retomarlo, con `warning` por defecto.
4. **Depth y stencil.** El contexto se crea con `depth: false` (`src/renderer.ts:26`), `clear()`
   solo limpia color, no hay config de depth test y el framebuffer no tiene depth attachment. El
   README promete "2D/3D rendering": hoy 3D real no es posible. Decidir si se implementa o se ajusta
   el README.
5. **Instancing.** `vertexAttribDivisor` + `drawArraysInstanced`. Es lo que más rinde para el
   público objetivo (partículas, arte procedural) y son ~30 líneas.
6. **Framebuffer completo.** `checkFramebufferStatus` tras construir, attachment de depth, MRT,
   y clarificar ownership: hoy `dispose()` destruye la textura **aunque la haya pasado el usuario**
   (`src/framebuffer.ts:37-40`), y una textura creada internamente por `renderer.framebuffer()` se
   destruye dos veces porque queda en `resources` y en el framebuffer.
7. **Pérdida de contexto.** No hay manejo de `webglcontextlost` / `webglcontextrestored`. En
   producción (móvil, tab en background) la app muere sin recuperación. Es el gap más grande para
   "performance-critical graphics".
8. **Estado de render.** Falta `cullFace`, `scissor`, `colorMask`, `depthMask`, `viewport` explícito.
9. **Texturas.** Sin mipmaps, cube maps, `texSubImage2D` (hoy `update()` re-aloca siempre con
   `texImage2D`), ni chequeo de extensiones para texturas float.

### Higiene de código

- `constants.ts:68-75`: `drawMode` es un duplicado de `primitive` al que le falta `triangles`,
  no se usa en ningún lado y se exporta públicamente vía el tipo `GLMap`. Borrar.
- `program.ts:286-291`: el parámetro `textureUnit` de `writeUniform` es código muerto —
  `applyUniforms` maneja las texturas inline y nunca lo pasa.
- `glMap(gl)` construye un objeto nuevo con 9 sub-objetos en **cada llamada**, y `draw()` la invoca
  ~8 veces (6 solo en `applyBlend`). Cachear por contexto en un `WeakMap` es trivial y elimina la
  basura por frame.
- `renderer.resources` es un `Set` que nunca se achica: `texture.dispose()` no se desregistra, así
  que una app que crea y destruye recursos filtra memoria indefinidamente.

---

## P3 — Docs y comunidad

- **Tres superficies de demo solapadas** que hay que consolidar: `example.html` (raíz, Tailwind por
  CDN, importa `./dist`), `examples/` (app Vite, no mencionada en el README) y `web/index.html`
  (landing con docs duplicadas del README → van a divergir).
- `examples/package.json` depende de `"gl-lite": "link:gl-lite"`, que exige un `bun link` previo en
  la raíz y no está documentado en ningún lado. Un contribuidor nuevo se traba ahí.
- Sin `CONTRIBUTING.md` ni templates de issue/PR — y el repo **sí tiene** contribución externa
  (4 PRs de @MrGazdag, 3 issues, todos reales y bien reportados). Vale la pena bajarle la fricción.
- El README dice "~10KB bundle": es correcto en crudo, pero citar gzip (3.7 KB) vende mejor y es la
  métrica que usa el resto del ecosistema.
- Falta una nota explícita: el `GLRenderer` pide `webgl2` sin fallback a `webgl1`, aunque los tipos
  aceptan `WebGLRenderingContext` (pasar un contexto WebGL1 a mano funciona, lo verifiqué).
  Definir la postura: WebGL2-only declarado, o fallback real.

---

## Plan sugerido

**0.0.3 — Correcciones (1-2 días).** Bugs #1-#4, restaurar estado en los tres `use()`, borrar
`drawMode` y el código muerto, cachear `glMap`. Publicar con las features ya mergeadas que están
esperando.

**0.1.0 — Bases de proyecto (3-5 días).** Suite Playwright con un test de regresión por bug, CI con
typecheck + format + tests + size-limit, packaging resuelto (ESM-only, sin minificar, con
sourcemaps, `sideEffects`), CHANGELOG y release automatizado.

**0.2.0 — API (1-2 semanas).** VAOs, uniforms por introspección, `missingHandler`, instancing,
framebuffer completo con depth. Aquí es donde la librería pasa de "juguete prolijo" a usable en
producción.

**0.3.0 — Producción.** Pérdida de contexto, estado de render completo, mejoras de texturas,
consolidación de demos y docs.

---

## Apéndice: cómo se verificaron los bugs

Chromium headless con SwiftShader da WebGL2 completo sin GPU, y `readPixels` permite afirmar sobre
el resultado real del render. Esta es la base recomendada para la suite de tests:

```js
const browser = await chromium.launch({
  args: [
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
```

Cada bug se comprobó con un control que descarta falsos positivos: para #3, que `progA` dibujado
solo sí da rojo; para #4, que los mismos índices como `Uint16Array` sí dibujan.
