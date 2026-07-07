# translation_Code-Package-p5.js.md

Notas de migración de 6 ejemplos del **Code Package p5.js** del libro *Generative
Design* (org GitHub **`generative-design`**, Apache-2.0), capítulo M (métodos
complejos), a la galería `MILPA`. Se **renombraron por sus características
visuales** (vistas en los PNG de preview de cada carpeta).

## Mapa nombre viejo → nuevo (por su visual)

| Origen | Nombre nuevo / slug | Por qué ese nombre (visual) |
|---|---|---|
| `M_1_4_01` | **Terreno de Ruido** / `terreno-ruido` | Malla 3D teal ondulada de ruido Perlin |
| `M_1_5_03` | **Líneas de Humo** / `lineas-humo` | Contornos negros que fluyen sobre blanco, como humo |
| `M_1_5_04` | **Abanicos de Agentes** / `abanicos-agentes` | Pinceladas en abanico teal/oro |
| `M_2_3_01` | **Ondas Moduladas** / `ondas-moduladas` | Seno modulado (AM) negro sobre portadora cian |
| `M_2_3_02` | **Órbitas de Lissajous** / `orbitas-lissajous` | Órbitas elípticas punteadas entrelazadas |
| `M_2_5_01` | **Malla Armónica** / `malla-armonica` | Malla densa de líneas formando envolventes |

Registradas en `lib/sketches/index.ts` con `author: "Generative Design"`.
Originales vendorizados en `originals/Code-Package-p5.js/02_M/...`
(`npm run gen:originals`, 34/34). Owner añadido a `lib/config.ts`
(`Code-Package-p5.js → generative-design`).

## Cambios más importantes del port

### Comunes
- **`gd.timestamp()`** (de la librería del libro, solo para nombrar el PNG al
  guardar con `s`) → nombre estático: `p.saveCanvas('<slug>', 'png')`.
- Ninguno usa GUI externa (el "MENU"/"?" era un tooltip de ayuda con
  jQuery/tooltipster) ni assets (nada de loadImage/font/sound/table).
- Los que usaban `windowWidth`/`windowHeight` (M_1_5_03/04, M_2_3_01) pasan a
  **tamaño fijo** del contenedor de la galería.

### Terreno de Ruido (M_1_4_01)
- Único en **modo global** y único **3D**: se convirtió a modo instancia
  (prefijo `p.`) **manteniendo WEBGL** (`createCanvas(600,600,p.WEBGL)`,
  `rotateX/Z`, `translate(x,y,z)`, `beginShape(TRIANGLE_STRIP)`, `vertex(x,y,z)`).
- `float(width)` → `p.width`. `falloff` se acota con `p.constrain`.
- **Fix de fondo**: el original dejaba `colorMode` en RGB tras el bucle de
  `lerpColor`, así que a partir del 2º frame `background(0,0,100)` se interpretaba
  en RGB (azul oscuro). Se fija `colorMode(HSB)` al inicio de `draw` antes del
  `background`, garantizando el fondo blanco del preview.
- Interacción conservada: arrastrar izq = rango de ruido, der = cámara; flechas =
  falloff/octavas; `+`/`-` = zoom; espacio = semilla.

### Líneas de Humo (M_1_5_03) y Abanicos de Agentes (M_1_5_04)
- Su clase `Agent` (en `Agent.js`) **dependía del global `myp5`**. Se portaron a
  bibliotecas que **reciben `p`**: `lib/bibliotecas/agenteHumo.ts` (line/wrap +
  ruido) y `lib/bibliotecas/agenteAbanico.ts` (color HSB teal/oro + trazo en
  abanico o elipse). Son clases distintas, específicas de cada pieza.
- Defaults hardcodeados (los del sketch). `abanicosAgentes` usa `colorMode(HSB)`.
- Fidelidad menor: el `backspace` para limpiar usa **blanco en HSB** (`0,0,100`);
  el original llamaba `background(255)` incluso en modo HSB (habría dado un tono
  azulado). Se corrige al blanco intencional.

### Ondas Moduladas / Órbitas de Lissajous / Malla Armónica (M_2_3_01/02, M_2_5_01)
- Ya venían como `var sketch = function(p){...}`; port casi mecánico a factory
  (`var`→`let/const`, quitar `new p5(sketch)`, tipar).
- **Órbitas de Lissajous**: conserva `mouseX` = número de puntos.
- **Malla Armónica**: es **estática** (dibuja en `setup`, redibuja en
  `keyPressed`). El doble bucle es **O(n²)** sobre `pointCount = 1000`
  (~500k iteraciones), pero se paga solo al redibujar, no por frame. El
  `stroke(lineColor, alpha)` del original (sobrecarga no estándar de p5:
  `p5.Color` + alfa) se reescribió como `p.stroke(0, a * lineAlpha)` (negro con
  alfa calculado), equivalente y válido en TS.

## Notas para implementar en conjunto

- **Bibliotecas nuevas**: `AgenteHumo` y `AgenteAbanico` son reutilizables para
  otras piezas de "agentes sobre campo de ruido"; ambas reciben `p` (patrón del
  repo), sin depender de globales.
- **WEBGL**: `terreno-ruido` es la primera pieza 3D de la galería; el wrapper la
  monta sin cambios (modo instancia con `p.WEBGL`).
- **Código original mostrado**: el panel "Código original" muestra el `sketch.js`
  del libro (que referencia `new Agent(...)` y `myp5`); la clase real ejecutada es
  la portada en `bibliotecas/`. Es esperado.
- **Rendimiento**: si `malla-armonica` se siente lenta al redibujar, bajar
  `pointCount`.
- **Verificación**: `npx tsc --noEmit` exit 0; `npm run build` genera **34 rutas**
  de sketch (6 nuevas). `next lint` sigue sin configurarse en el proyecto.
