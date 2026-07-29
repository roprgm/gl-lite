# gl-lite — Roadmap

Estado: los defectos identificados en el análisis inicial están arreglados, con una suite de 95
tests que corre en un navegador real y CI que la ejecuta. Ver `CHANGELOG.md` para el detalle.

Lo que sigue es lo que quedó afuera y por qué.

---

## Antes de publicar 0.0.3

Hay dos commits sin publicar desde 0.0.2 más todo el trabajo de esta tanda. No hay tags de git ni
releases en GitHub, y quien pidió `blendFuncSeparate` (issue #5) todavía no puede usarlo desde npm.

- Cortar 0.0.3 y publicar.
- Automatizar el release (changesets o release-please) con publish desde CI y npm provenance.

El cambio de comportamiento a tener presente: un uniform o atributo que el shader no usa ahora
avisa por consola en vez de tirar. Es un cambio compatible en la práctica — antes ese caso era
fatal — pero conviene mencionarlo en las notas.

---

## Pendiente en la API

Ordenado por impacto. Nada de esto es un defecto; son capacidades que la librería todavía no tiene.

1. **Pérdida de contexto.** No hay manejo de `webglcontextlost` / `webglcontextrestored`. En móvil
   o con la pestaña en segundo plano la app muere sin recuperación. Es el gap más grande que queda,
   y también el más caro: requiere decidir una política de recreación de recursos, no solo escuchar
   el evento.
2. **Estado de render.** Faltan `cullFace`, `scissor`, `colorMask` y `depthMask`. Con `depth` ya
   implementado, `cullFace` es el siguiente paso natural para 3D real.
3. **Texturas.** Sin mipmaps, cube maps, ni `texSubImage2D` — hoy `update()` re-aloca siempre con
   `texImage2D`, que es caro para actualizaciones parciales por frame. Tampoco hay chequeo de
   extensiones para texturas float, así que pedir `type: "float"` sin la extensión falla de forma
   poco clara.
4. **MRT.** El framebuffer soporta un solo color attachment.
5. **Depth attachment y resize.** El renderbuffer de profundidad de un framebuffer se dimensiona al
   crearse y no acompaña a `texture.resize()`. Hoy hay que recrear el framebuffer.

Cada uno de estos suma superficie de API. La librería se define por ser chica, así que vale
agregarlos de a uno y con un caso de uso concreto detrás, no por completitud.

---

## Documentación y proyecto

- **Tres superficies de demo solapadas**: `example.html` (raíz), `examples/` (app Vite) y
  `web/index.html` (landing con docs duplicadas del README). Las tres funcionan y están
  verificadas, pero la landing va a divergir del README con el tiempo. Vale consolidar o generar
  la landing desde el README.
- **Templates de issue y PR.** Ya hay `CONTRIBUTING.md`; el repo tiene contribución externa real
  (4 PRs de @MrGazdag), así que bajar más la fricción tiene retorno.
- **Presupuesto de tamaño en CI.** Hoy el workflow reporta el tamaño del bundle pero no falla si
  crece. Con `size-limit` u otro chequeo, "lightweight" pasa de ser una afirmación del README a una
  garantía.

---

## Sobre los tests

La suite corre en Chromium headless con SwiftShader y afirma sobre píxeles con `readPixels`, que es
la única forma honesta de testear esto. Detalles en `CONTRIBUTING.md`.

Al arreglar un bug, verificar que el test nuevo falle sin el fix: un test que pasa en ambos casos
documenta el comportamiento pero no protege nada.
