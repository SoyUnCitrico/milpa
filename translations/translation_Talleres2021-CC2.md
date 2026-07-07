# translation_Talleres2021-CC2.md

Notas de migración de sketches del taller **`Talleres2021-CC2`** ("Audio y Web",
org **ccdtecno**) a la galería `MILPA`.

## Piezas portadas (4)

| Original (`.../CC2/`) | Factory nueva | slug | Audio |
|---|---|---|---|
| `piano.js` | `lib/sketches/piano.ts` | `piano` | sí |
| `sumador.js` | `lib/sketches/sumador.ts` | `sumador` | no |
| `soundCollider.js` | `lib/sketches/soundCollider.ts` | `sound-collider` | sí |
| `fft_Visualization.js` | `lib/sketches/fftVisualization.ts` | `fft-visualization` | sí |

Registradas en `lib/sketches/index.ts` con `author: "ccdtecno"`. Originales
vendorizados en `originals/Talleres2021-CC2/...` (`npm run gen:originals`, 26/26).
Owner añadido a `lib/config.ts` (`Talleres2021-CC2 → ccdtecno`).

## Cambios más importantes del port

### Comunes
- Global → instancia: globales a clausura, API de p5 con `p.`, y **eliminado
  `.parent('sketch-container'/'sketch-info')`** (el wrapper monta el canvas). Los
  sliders/botones que el original parenteaba a `#sketch-info` ahora se **posicionan
  sobre el lienzo** con `.position(...)`.
- Piezas de audio (`piano`, `soundCollider`, `fftVisualization`): tipan la factory
  con el 2º argumento `P5` (constructor) para instanciar componentes de p5.sound
  (`new P5.Oscillator()`, `new P5.FFT()`, etc.), igual que `audioGraf`/`synth`.
  `needsAudio: true` → el wrapper carga `p5.sound` y muestra el overlay "Activar
  audio" (gesto del usuario).

### piano
- Corrupción de origen corregida: `osc.stop;` (sin paréntesis, no hacía nada) →
  `osc.stop()`.
- `cnv.mousePressed(toogleSystem)` se conserva (clic en el canvas enciende/apaga).

### sumador (reuso: **extender la biblioteca compartida**, decisión del usuario)
- `sumador` usa `PloterFourier` + la subclase `PloterFinalFourier`, que **no
  existían** en la `ploterFourier.ts` de la galería (esa venía de `spectografo`: 3
  ondas, se autolimpiaba el fondo, sin `factor` ni subclase).
- Se **extendió `lib/bibliotecas/ploterFourier.ts`** de forma casi aditiva:
  - Nuevo campo `factor` + método `changeFactor(f)`.
  - Nuevas funciones **4 (senoidal)** y **5 (armónicos con amplitud que decae por
    `factor`)** en el `switch`.
  - Nueva subclase **`PloterFinalFourier`** (dibuja un solo armónico; `timeStep`
    0.02).
  - **Se sacó el `background(0)` de `actualizar()`** para poder componer los 7
    plotters de `sumador` en un mismo canvas. Como `spectografo` dependía de ese
    limpiado, se le agregó `p.background(0)` al inicio de su `draw` → **su
    comportamiento no cambia** (verificado con `next build`).
- Nota de fidelidad: `sumador` hereda la paleta/constantes de la versión de la
  galería (no las de CC2, que tenía colores propios y factores 6.5/2.5); el
  resultado es equivalente pero no idéntico pixel a pixel. `setTimeStep(0.02)` se
  fija en el sketch para conservar la velocidad sin tocar el default de
  `spectografo`.

### soundCollider (reuso: 2 bibliotecas nuevas)
- Se portaron **`Colisionador`** (`lib/bibliotecas/colisionador.ts`) y **`Cajita`**
  (`lib/bibliotecas/cajita.ts`), cada una recibiendo `p`.
- **Desacople de audio**: `Cajita.revisaColision` llamaba directamente a los
  globales `voz/filtro/envolvente/midiToFreq` del sketch. Ahora `Cajita` recibe un
  callback **`onHit(nota, freq)`**; el sketch lo implementa (`alGolpear`) y ahí vive
  todo el audio. La biblioteca queda independiente del sketch.
- **`collideRectRect` / `collideRectCircle`** venían de **p5.collide2d** (no está en
  el core ni en la galería): se **reimplementaron** como funciones privadas dentro
  de `cajita.ts` (AABB y círculo-rectángulo).

### fftVisualization
- Carga la canción `synth.mp3` en `preload` con `p.loadSound('/synth.mp3')`. El
  asset se **copió del taller a `public/synth.mp3`** (primer sketch de la galería
  con asset de audio; el vendorizado de `originals/` solo copia el `.js`, así que el
  binario de runtime va en `public/`).
- `getAudioContext().suspend()` requirió un cast a `AudioContext` (en `@types/p5`
  `getAudioContext()` devuelve `object`).
- Conserva el toggle de micrófono (tecla `t`) y la autocorrelación + espectro
  polar (ángulos en grados, `angleMode(DEGREES)`).

## Sketches excluidos / descartados

- **Ya en la galería (otra versión):** `audioGraf.js`, `spectografo.js`, `synth.js`
  — la galería ya los tiene desde `creativeCode/` (versiones distintas; difieren
  cientos de líneas). No se re-portaron para no duplicar.
- **`arbolMIDI.js`** — depende de **WebMidi.js + un dispositivo MIDI físico** (y usa
  `prompt()` para elegir puerto): inviable en web estática.
- **`collideSeq.js`** — **roto**: usa clases `VisualSequencer/VoiceSynth/Cluster`
  que **no existen** en el repo y assets `songs/kick.wav`/`songs/hh.wav` faltantes.
- **`pruebaJs.js`** — prueba inconclusa (modo bundler, ~90% comentado, asset
  `nena.mp3` faltante).

## Notas para implementar en conjunto

- **Bibliotecas nuevas reutilizables**: `Colisionador` + `Cajita` (con `onHit`) sirven
  para cualquier pieza de "colisión dispara sonido"; el patrón de callback evita
  volver a acoplar audio a la biblioteca.
- **`ploterFourier.ts` es ahora compartida por 2 piezas** (`spectografo` y
  `sumador`): cualquier cambio futuro debe mantener que las funciones 1–3 y el
  limpiado-por-el-sketch sigan como están.
- **Assets de audio**: si se portan más piezas con `loadSound`, copiar el binario a
  `public/` y cargarlo con ruta absoluta (`/archivo.mp3`).
- **Verificación**: `npx tsc --noEmit` exit 0; `npm run build` genera **31 páginas**
  estáticas (4 nuevas). `next lint` sigue sin configurarse en el proyecto.
