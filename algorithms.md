# Algoritmos generativos

Este documento cataloga los algoritmos generativos detrás de las piezas más
relevantes de la galería: qué hacen, en qué biblioteca viven (si aplica) y qué
otros sketches comparten la misma base. El objetivo es que una pieza nueva se
pueda ubicar rápido en una familia existente, o documentarse aparte si no
encaja en ninguna sin forzarlo.

Se completa de forma incremental — cada vez que un sketch se unifica (ver
`.claude/agents/sketch-unifier.md`), se agrega o actualiza su entrada aquí.

## Cómo decidir: ¿unificar o dejar aparte?

Un algoritmo se documenta como **familia compartida** (con referencias
cruzadas entre los sketches que la usan) si cumple al menos 2 de 3:

1. **Misma estructura matemática/procedimiento** — no solo "se ve parecido".
2. **Mismo propósito visual** (paisaje, órbita, partícula, epiciclo, etc.).
3. **Compartir la descripción no fuerza un acoplamiento artificial** entre
   piezas que deban poder evolucionar por separado.

Si un algoritmo no cumple 2/3 — por ejemplo, **Átomos de Píxel**, que
descompone una imagen en partículas con un motor propio de Processing sin
análogo en el resto de la galería — se documenta en su propia sección, sin
intentar generalizarlo ni referenciarlo desde otras piezas.

---

## Familias

### Espirales polares (biblioteca `Spiral`, `lib/bibliotecas/spiral.ts`)

Colocación de partículas en coordenadas polares: para cada partícula `i` de
`total`, el radio se interpola linealmente entre `radioInt` y `radioExt` según
`i/total`, y el ángulo acumula `ciclos * TWO_PI / total` por paso (más
`stepsRadio` controlando cuánto avanza el radio por vuelta). Si `radioInt !==
radioExt` la trayectoria implícita es una espiral; si son iguales, un círculo.
Cada partícula se dibuja como `square` o `circle` rotada a su propio ángulo
polar.

Usado por:
- **Girasol** (`girasol.ts`) — cuatro instancias de `Spiral` superpuestas
  (centro, dos coronas de semillas, pétalos), estáticas (`noLoop()` tras el
  primer frame).
- **Spiral Gira** (`spiralGira.ts`) — referencia cruzada, aún no revisado por
  el agente de unificación; misma biblioteca, pero con radios/ciclos animados
  en ping-pong y offsets de ángulo rotando en sentidos contrarios.
- **Spiral One** (`spiralOne.ts`) — referencia cruzada, aún no revisado;
  variante de tres espirales concéntricas con ping-pong de radio.

### Relieve por ruido Perlin, tema matrix

Malla o trazo cuya altura/posición se calcula muestreando `p.noise(x, y)` (o
`p.noise(x)` en 2D) sobre un dominio que se recorre con `p.map()`, coloreado
por interpolación (`lerpColor`) entre los tonos de la paleta matrix
(`fondo` negro → `cuerpo` verde → `cima` naranja) según la altura del ruido.

Usado por:
- **Terreno de Ruido** (`terrenoRuido.ts`) — malla WEBGL (`TRIANGLE_STRIP`)
  de `tileCount × tileCount`, con dos LFOs senoidales modulando el rango de
  ruido en X/Y de forma autónoma y giro continuo en Z.
- Referencia cruzada (no revisados aún): **Ondas Moduladas**, **Órbitas de
  Lissajous**, **Malla Armónica**, **Líneas de Humo**, **Abanicos de
  Agentes** — comparten la paleta matrix (verde/naranja/negro) pero no el
  mismo procedimiento de muestreo (son osciladores/Lissajous/campos de
  agentes, no relieve por altura), así que se documentan aparte cuando se
  revisen, con nota de paleta compartida en vez de algoritmo compartido.

### Síntesis modular (VCO/PWM/VCF/ADSR)

Cadena de síntesis sustractiva clásica: uno o más osciladores (`VCO` onda
simple, `PWM` onda cuadrada de ancho variable) → filtro (`VCF`, pasabajos por
defecto) → envolvente(s) de amplitud (`ADSR`). Cada módulo es una clase que
posee su propio nodo de audio, sus controles (antes sliders, ahora `Knob`) y
su propio osciloscopio/espectro (`ScreenPlotter`).

Usado por:
- **Synth Modular** (`synth.ts`, `lib/bibliotecas/synth/{vco,vcf,adsr,
  screenPlotter}.ts`) — única pieza que instancia esta cadena completa hoy.

---

## Piezas individuales

### Synth Modular — motor de audio

Ver "Síntesis modular" arriba para el algoritmo de señal. Migrado de
`p5.sound` a **Tone.js**: `VCO`→`Tone.Oscillator`, `PWM`→`Tone.PulseOscillator`,
`VCF`→`Tone.Filter`, `ADSR`→`Tone.Envelope` + `Tone.Gain` explícito en la
cadena de señal (Tone no tiene el gain implícito que `p5.sound` aplicaba en
`envelope.play(nodo)`), `ScreenPlotter`→`Tone.Analyser`. Todos los nodos se
disponen vía `lib/bibliotecas/cleanup.ts::onRemove` al desmontar la pieza.
Parámetros por defecto centralizados en `CONFIG_SYNTH` al inicio de
`synth.ts`.

### Terreno de Ruido — malla por altura

Ver "Relieve por ruido Perlin, tema matrix" arriba. Particularidad de
rendimiento: `p.colorMode(p.RGB)` se llama una sola vez por frame (no por
vértice) para evitar ~2,600 llamadas redundantes por frame en la malla de
50×50.

---

## Átomos de Píxel (aparte)

Algoritmo de descomposición de imagen en partículas, portado de un sketch de
**Processing** (`pixelAtomProject/pixelAtomProject.pde`, con su propio
`CLAUDE.md` en el monorepo). Captura una imagen (webcam o archivo), la
descompone en partículas que conservan el color/posición del píxel original,
y las anima con 15 modos (steering behaviors, composiciones generativas,
colonización de espacios) sobre 7 tipos de flow field. No comparte estructura
ni propósito visual con ninguna otra pieza de la galería — se documenta aquí
en solitario, sin forzar una familia ni referencias cruzadas, tal como pide
la convención de este documento.
