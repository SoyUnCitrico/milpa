# translation_Talleres2021-CC3.md

Notas de migración de sketches del taller **`Talleres2021-CC3`** ("Código y Datos",
org **ccdtecno**) a la galería `MILPA`.

## Piezas portadas (2)

| Original (`.../CC3/`) | Factory nueva | slug |
|---|---|---|
| `Clase3/Ejemplo5.js` | `lib/sketches/reticulaCrayola.ts` | `reticula-crayola` |
| `Clase4/Ejemplo8.js` | `lib/sketches/estacionEspacial.ts` | `estacion-espacial` |

Registradas en `lib/sketches/index.ts` con `author: "ccdtecno"`. Originales
vendorizados en `originals/Talleres2021-CC3/...` (`npm run gen:originals`, 28/28).
Owner añadido a `lib/config.ts` (`Talleres2021-CC3 → ccdtecno`).

## Cambios más importantes del port

### Comunes
- Global → instancia: globales a clausura, API de p5 con `p.`, eliminado
  `.parent('sketch-container'/'main__sketch')`. Ninguno usa audio ni las
  bibliotecas del repo (Bolita/FlowField/GridBolita/neuron/mappa) — son p5 puro.

### reticulaCrayola (Ejemplo5)
- El original **descargaba el dataset de una URL externa**
  (`raw.githubusercontent.com/dariusk/corpora/.../crayola.json`). Se **repunta al
  mismo dataset servido localmente**: se copió `assets/js/scripts/CC3/data/data.json`
  a **`public/crayola.json`** y se carga con `p.loadJSON('/crayola.json', cb)`. Así
  la pieza queda autocontenida (sin red).
- La clase `Bolita` embebida en el sketch se conserva como **clase interna de la
  factory** (cierra sobre `p` y sobre la variable `nombre`, que muta al hacer clic).
  No se reutiliza ninguna biblioteca (es una bolita de datos trivial, distinta de
  `bibliotecas/particula`).

### estacionEspacial (Ejemplo8)
- Es una pieza de **datos en vivo**: las llamadas de red se mantienen (se ejecutan
  en el cliente). Dos ajustes de robustez para la galería:
  - **`setInterval(dondeEsta, 1000)` → sondeo por frames** (`frameCount % 60`),
    para no dejar un intervalo colgado cuando el wrapper desmonta la pieza
    (`instance.remove()` no limpia `setInterval`).
  - El **GIF externo** (giphy) se carga con **callback de error**: si falla
    (CORS/caído), `space` queda en `null` y la pieza sigue corriendo, solo sin el
    fondo. La sonda de la ISS se dibuja igual.
- Fuente de datos: API pública `wheretheiss.at` (sin API key, admite CORS). Si la
  red falla, `estacion` queda indefinida y solo se ve el fondo.

## Sketches excluidos / descartados

- **Triviales de taller (arrays hardcodeados de asistentes):** `Clase1/Ejemplo1`
  (además con bug de índice `i<=length`), `Clase1/Ejemplo2` (interactivo pero
  mínimo), `Clase2/Ejemplo3`.
- **Requieren API con key hardcodeada (clima, probablemente caducada):**
  `Clase3/Ejemplo6` y `Clase4/Ejemplo7` (OpenWeatherMap).
- **Autocontenido no elegido:** `Clase2/Ejemplo4` (color por segundo con
  `data.json` + fuente `LEMONMILK-Bold.otf`) — quedó fuera de esta tanda; si se
  retoma, hay que copiar el `.otf` a `public/` y `loadFont` de ahí.

## Notas para implementar en conjunto

- **Assets de datos**: `public/crayola.json` es el primer asset de datos de la
  galería (junto con `public/synth.mp3` de audio). Patrón: copiar el recurso a
  `public/` y cargarlo con ruta absoluta.
- **Piezas de red en vivo**: `estacion-espacial` depende de internet en runtime;
  no rompe el build estático (las llamadas son del cliente), pero puede quedarse
  sin datos/fondo si las APIs externas fallan. Está documentado en su descripción
  ("Requiere conexión a internet").
- **Sondeo periódico**: preferir `frameCount % N` a `setInterval` en piezas de la
  galería, por el ciclo de montaje/desmontaje del wrapper.
- **Verificación**: `npx tsc --noEmit` exit 0; `npm run build` genera **33 páginas**
  estáticas (2 nuevas). `next lint` sigue sin configurarse.
