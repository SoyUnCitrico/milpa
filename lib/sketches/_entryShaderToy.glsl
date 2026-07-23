/* ═══════════════════════════════════════════════════════════════════════════
   BUZÓN DE SHADERS DE ENTRADA          lib/sketches/_entryShaderToy.glsl
   ═══════════════════════════════════════════════════════════════════════════

   PARA QUÉ SIRVE ESTE ARCHIVO
   ───────────────────────────
   Es el buzón donde se pega GLSL traído de shadertoy.com (o de cualquier otra
   fuente) que se quiere convertir en una pieza de la galería.

   El archivo está vacío a propósito. Su contenido es una señal:

       vacío (solo esta plantilla)  →  no hay ningún shader pendiente de portar
       con GLSL debajo             →  hay un shader esperando volverse pieza

   CÓMO SE USA
   ───────────
   1. Pegar el shader tal cual viene, sin limpiarlo. Si tiene varias pasadas
      (Buffer A, Buffer B, Image), pegarlas todas y separarlas con un comentario
      que diga cuál es cuál: el orden de las pasadas y qué escribe cada una es
      parte del algoritmo, y se pierde si no se anota.
   2. Anotar la URL de origen y el autor. La galería acredita la fuente en el
      docblock de la pieza y en `algorithms.md`; sin eso hay que ir a buscarla.
   3. Pedirle la pieza a `.claude/agents/sketch-creator.md`, describiendo qué se
      quiere que haga (paleta, interacción, controles). El agente lee este
      archivo, porta el shader a p5 en modo instancia y lo documenta.
   4. Ya portado, este archivo vuelve a quedar vacío con esta plantilla. El
      shader vive en la pieza: dejar aquí una copia solo crea dos versiones que
      se desincronizan y nadie sabe cuál es la buena.

   QUÉ NO ES
   ─────────
   No es un shader que se compile ni que alguien importe: ningún módulo lo lee.
   No se registra en `lib/sketches/index.ts` (por eso el prefijo `_`, igual que
   `_plantilla.ts`).

   QUÉ HAY QUE TRADUCIR AL PORTAR DESDE SHADERTOY
   ──────────────────────────────────────────────
   Shadertoy no escribe shaders completos: los envuelve. Al portar hay que
   reponer a mano lo que su editor daba gratis.

   - `mainImage(out vec4 fragColor, in vec2 fragCoord)` en lugar de `main()`.
   - `fragCoord` viene en píxeles y con el origen abajo-izquierda; p5 en WEBGL
     no. Resolver la orientación una sola vez y dejarla comentada — es lo que
     más se rompe al portar.
   - Uniforms implícitos que hay que declarar y alimentar: `iResolution`,
     `iTime`, `iMouse`, `iFrame`, `iChannel0..3`.
   - `iMouse.xy` con `iMouse.z > 0` como "hay clic" suele ser el punto donde se
     engancha la interacción real de la pieza (mano, audio, toque).
   - Una pasada que se lee a sí misma (`iChannel0` = su propio buffer) necesita
     ping-pong de framebuffers, con sus trampas de formato y `blendMode`
     — ver "Marea de Manos" en `algorithms.md`.
   - Los colores del original se reemplazan por la paleta de la pieza, pasada
     como uniforms: dentro del GLSL no queda ningún valor de color suelto.

   ───────────────────────────────────────────────────────────────────────────
   Última pieza portada desde aquí: `filtros-camara` (2026-07-23), banco de
   cuatro filtros de post-proceso de cámara portados juntos (Basura 2600
   `tcccWj` de matrixmane; Rejilla de Onda `fcXSDS` de yonibr; Espejo Complejo
   `scsGDH` de Refurio; Flujo Óptico Lucas–Kanade, gist 983). Convención común:
   todos son *image passes* sobre `iChannel0` = cámara compartida, con un
   selector (teclado / toque) para cambiar de filtro. Los filtros temporales
   usan un buffer del cuadro anterior (`uPrev`) en vez de las 3 pasadas del
   flujo óptico original. Cómo agregar más: ver el bloque de `FILTROS` en la
   pieza.
   ═══════════════════════════════════════════════════════════════════════════ */
