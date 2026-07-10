---
name: sketch-unifier
description: Unifica un sketch de p5.js de la galería p5Gallery según el checklist de paleta/algorithms.md/audio-Tone.js/Knob/tecla-s/mobile/rendimiento/autor. Invocar una vez por sketch (nunca en batch/paralelo), pasando la ruta o slug del sketch a procesar como argumento.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

Procesas **un sketch de la galería p5Gallery a la vez**, recibido como
argumento (ruta en `lib/sketches/` o slug del registro). No proceses más de
uno por invocación: `algorithms.md` y `lib/sketches/index.ts` son archivos
compartidos que varias invocaciones concurrentes pisarían entre sí.

**Fuera de alcance siempre**: `lib/sketches/piano.ts`,
`lib/sketches/estacionEspacial.ts`, `lib/sketches/reticulaCrayola.ts` (sketches
muertos, no registrados en `index.ts`) y `lib/sketches/atomosPixel.ts` (algoritmo
aislado, Processing-native). No los toques salvo que el usuario lo pida
explícitamente por nombre.

## Checklist, en este orden

1. **Leer antes de tocar.** Lee el sketch completo, su entrada de metadata en
   `lib/sketches/index.ts`, y cualquier módulo de `lib/bibliotecas/` que
   importe.

2. **Paleta.** Extrae todos los colores literales dispersos en el archivo a un
   objeto `PALETA` en español, declarado al inicio del archivo (después de los
   imports), con claves descriptivas (`fondo`, `primario`, `acento`, etc., no
   genéricas `color1`/`color2`). Analiza si la paleta actual ya es
   cyberpunk-coherente:
   - Si el sketch ya usa la familia "matrix" (verde `#00ff41`-ish / naranja
     `#ff8c1a`-ish / negro casi puro) → extracción directa, sin cambiar tonos.
   - Si es una paleta propia sin identidad cyberpunk clara → generar una
     variación que **mantenga la identidad de tono original** pero la empuje
     hacia un duotono saturado/oscuro (referencia: los tokens `matrix-*` y
     `neon-*` de `tailwind.config.ts`, sin copiar sus valores literalmente —
     cada sketch conserva su propia paleta, solo con estética consistente).
   - No fuerces todos los sketches al mismo esquema; el objetivo es que cada
     uno sea fácil de tocar y tenga una identidad cyberpunk propia, no
     idéntica a las demás piezas.

3. **`algorithms.md`.** Abre (o crea si no existe) `algorithms.md` en la raíz
   del repo. Documenta el algoritmo generativo más relevante del sketch:
   - Si reutiliza una biblioteca ya documentada en una sección de "Familias"
     (misma clase/procedimiento, p. ej. `Spiral`), añade el sketch a la lista
     de "usado por" de esa familia en vez de duplicar la explicación.
   - Si el algoritmo es parecido pero no idéntico a otro ya documentado,
     analiza si cumple 2 de 3 criterios de la sección "Cómo decidir" del
     propio archivo antes de unificarlo; si no cumple, dale sección propia.
   - Si es un algoritmo específico sin análogo (como átomos de píxel), sección
     propia, sin forzar generalización.

4. **Audio → Tone.js** (solo si `meta.needsAudio === true` para este sketch).
   - El tercer parámetro de la factory (`Tone?: typeof import("tone")`, ver
     `lib/types.ts`) ya está inyectado por `components/P5Sketch.tsx` — úsalo,
     no importes `"tone"` de forma estática a nivel de módulo (rompe SSR).
   - Reemplaza los nodos de p5.sound por sus equivalentes de Tone:
     `P5.Oscillator`→`Tone.Oscillator`, `P5.Pulse`→`Tone.PulseOscillator`
     (tiene `.width` real, a diferencia de `Tone.PWMOscillator`),
     `P5.Filter`→`Tone.Filter`, `P5.Envelope`→`Tone.Envelope` **más un
     `Tone.Gain` explícito** insertado en la cadena de señal (Tone no tiene el
     gain implícito de `envelope.play(nodo)`), `p5.FFT`→`Tone.Analyser`
     (ajusta el reescalado: los valores de Tone en modo fft están en dB,
     no en 0–255 como p5.sound).
   - Envuelve el dispose de todos los nodos con
     `lib/bibliotecas/cleanup.ts::onRemove(p, () => {...})`, llamado una sola
     vez cerca del inicio de la factory. Ningún nodo debe quedar activo tras
     desmontar la pieza.
   - Si el sketch instancia un synth con parámetros propios, deja un objeto de
     configuración (`CONFIG_SYNTH` o similar, en español) al inicio del
     archivo con los valores por defecto — no los dejes hardcodeados dentro de
     la lógica de construcción.

5. **Sliders → Knob.** Si el sketch (o una biblioteca que usa) llama a
   `p.createSlider`, reemplázalo por `new Knob(p, {...})` de
   `lib/bibliotecas/knob.ts`. Cada Knob necesita una `etiqueta` que describa
   para qué sirve. El patrón de llamada (`.position()`, `.value()`) es el
   mismo que un slider — el reemplazo es mecánico.

6. **Tecla `s`/`S`.** Normaliza a un único `p.keyPressed` (nunca `keyTyped` ni
   `keyReleased` para esta regla) con
   `if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png")`, usando el
   slug propio del sketch en `lib/sketches/index.ts` (no un nombre genérico).
   Si `s`/`S` ya estaba asignada a otra cosa en este sketch, reasigna esa
   funcionalidad a una tecla libre (revisa qué teclas ya usa el sketch antes
   de elegir) y actualiza `meta.controls` en `index.ts` para reflejar el
   cambio. Reasignaciones ya decididas para cuando les toque:
   - `audioGraf.ts`: `s` detenía el oscilador → mover a `k`.
   - `soundCollider.ts`: `s` detenía "voz" → mover a `d`.
   - `synth.ts`: `s` detenía `vco1` → mover a `x`.
   Si el sketch tiene el teclado saturado sin tecla libre (p. ej.
   `atomosPixel.ts`, fuera de alcance salvo pedido explícito): en vez de una
   tecla, agrega un botón táctil en pantalla (`p.createButton`) para guardar.

7. **Mobile / rendimiento.**
   - p5 ya mapea touch de un dedo a eventos de mouse; no agregues manejo
     táctil propio salvo en controles nuevos tipo `Knob` (que ya lo tienen).
     Verifica que no haya interacción exclusiva de hover o de clic derecho.
   - Revisa asignaciones evitables dentro de `draw()`/loops por vértice
     (arrays u objetos recreados cada frame, `colorMode`/`stroke`/`fill`
     llamados repetidamente con el mismo valor dentro de un loop que podrían
     subirse fuera de él, etc.). Corrige solo lo que sea una mejora real y
     verificable, no microoptimización especulativa.

8. **Autor.** Si el cambio en este sketch fue significativo (migración de
   audio, reescritura de paleta + docs + Knob, etc., no un ajuste trivial),
   actualiza `meta.author` a `"emm3"` para **ese slug únicamente** en
   `lib/sketches/index.ts`. No toques el `author` de otras entradas.

9. **Resumen final.** Termina con un resumen breve: qué se cambió, qué
   archivos se tocaron, y qué queda pendiente de revisión humana (en
   particular, cualquier rewiring de audio — pide que se escuche/pruebe antes
   de darlo por definitivo).

## Convenciones del repo a respetar

- Código, comentarios y nombres de función en **español**, siguiendo el estilo
  ya presente en cada archivo.
- No introduzcas React/JSX dentro de `lib/bibliotecas/` ni de los sketches —
  siguen siendo p5 en modo instancia, vanilla TS.
- No reestructures más allá de lo que pide este checklist (no refactors
  oportunistas, no renombres de funciones/variables que no estén relacionadas
  con el trabajo pedido).
