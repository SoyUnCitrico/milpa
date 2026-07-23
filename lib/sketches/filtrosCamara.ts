import type p5 from "p5";
import type { SketchFactory } from "../types";
import { Knob } from "../bibliotecas/knob";
import { Boton, PanelEstado } from "../bibliotecas/boton";
import { Camara, SelectorCamara } from "../bibliotecas/camara";

/**
 * **Filtros de Cámara** — un banco de shaders de post-proceso de Shadertoy que
 * comen del **mismo** feed de cámara, con un selector para saltar de filtro con
 * el teclado (`1`–`4`, `←/→`, `n`) o tocando el lienzo.
 *
 * Los cuatro shaders llegaron juntos al buzón `_entryShaderToy.glsl`. Todos son
 * *image passes* que reciben la webcam por `iChannel0` y la reescriben pixel a
 * pixel — esa es su convención común, y es la que esta pieza generaliza: una
 * sola cámara, un solo cuad de pantalla completa, y un **registro de filtros**
 * (`FILTROS`) donde cada entrada aporta solo su `main()`. Agregar un filtro
 * nuevo es agregar una entrada al registro (ver las instrucciones sobre
 * `FILTROS`), no tocar el pipeline.
 *
 * La cámara se vuelca a un `p5.Graphics` 2D (espejada y recortada a *cover* una
 * sola vez) que viaja al shader como `uCamara`; el cuadro anterior se guarda en
 * `uPrev` para los filtros **temporales** (flujo óptico). En p5 1.9.4 una fuente
 * `p5.Graphics` se re-sube como textura cada frame (a diferencia de `p5.Image`,
 * que solo se sube si está `modified`), así que no hace falta framebuffer ni
 * `loadPixels`: basta redibujar el graphics y pasarlo por uniform.
 *
 * Los cuatro filtros portados (crédito/URL de cada uno en su entrada de
 * `FILTROS`):
 *
 * 1. **Basura 2600** (`tcccWj`, matrixmane) — teja la imagen y la cuantiza a una
 *    paleta de 8 colores estilo Atari 2600, con bloques de glitch y jitter por
 *    scanline. Single pass, fiel al original.
 * 2. **Rejilla de Onda** (`fcXSDS`, yonibr) — un caleidoscopio fractal (`tex`,
 *    `foldRotate`) enmascarado por el **contorno** de la cámara (detección de
 *    bordes). El original animaba la rejilla con el espectro de una canción por
 *    buffers de audio; como la galería no le da canal de audio a este filtro, la
 *    animación la mueve `uTiempo` y la cámara aporta el contorno (su rol de
 *    "procesar píxeles"). Sin la parte de audio se pierde el ping-pong de buffers.
 * 3. **Espejo Complejo** (`scsGDH`, Refurio) — deforma la cámara elevando al
 *    cuadrado la coordenada como número complejo (`z·z`). El original era un
 *    buffer con realimentación (acumulaba brillo, de ahí su "dampening" por
 *    mouse); acá es un solo pase (sin acumulación) con el brillo en una perilla.
 * 4. **Flujo Óptico** (Lucas–Kanade, gist 983) — estima el movimiento entre
 *    `uCamara` y `uPrev` resolviendo el sistema del tensor de estructura por
 *    ventana, rechaza features pobres por valores propios y pinta el flujo en
 *    HSV (tono = dirección, valor = magnitud). El original lo repartía en **tres
 *    buffers** (derivadas → tensor → visualización) por costo/precisión; acá va
 *    condensado en un pase que usa `uPrev` como la derivada temporal. Es el más
 *    caro (ventana de muestras por píxel); `pixelDensity(1)` es la palanca.
 *
 * Orientación (lo que más se rompe al portar Shadertoy a p5 WEBGL): el cuad usa
 * el vertex shader de siempre (`aTexCoord·2 − 1`, `vUv.y = 0` abajo, como en
 * `mareaManos.ts`/`cavernaImpulso.ts`), así el `vUv` coincide con el
 * `fragCoord/iResolution` de Shadertoy. La textura de cámara de p5 tiene el eje
 * Y al revés que ese `vUv`, así que **todo** el muestreo pasa por los macros
 * `CAM()`/`PREV()` del PRELUDIO (nunca `texture2D(uCamara,…)` directo): son el
 * único lugar donde se decide la orientación.
 */

const SLUG = "filtros-camara";

/**
 * Colores de la pieza. Los shaders que recolorean (1 y 2) reciben su paleta como
 * uniforms desde acá: ningún hex vive dentro del GLSL. Los filtros 3 y 4 no
 * tienen paleta (3 muestrea la cámara cruda, 4 sintetiza tono por HSV).
 */
const PALETA = {
  fondo: "#050805", // matrix-black
  /**
   * Paleta de 8 colores del filtro "Basura 2600". Se conserva su variedad
   * (era negro/rojo/naranja/amarillo/verde/azul/morado/blanco: es el carácter
   * del filtro) pero sesgada a la identidad de la galería.
   */
  atari: [
    "#050805", // 0 negro (fondo)
    "#ff3b3b", // 1 rojo
    "#ff8c1a", // 2 naranja (neon-orange)
    "#ffd21a", // 3 amarillo
    "#00ff41", // 4 verde matrix
    "#00e5ff", // 5 cian
    "#a855f7", // 6 morado (neon-violet)
    "#eafff0", // 7 casi blanco
  ] as const,
  /** Rejilla de Onda: color A (era el azulado `vec3(.7,.8,1)`) → cian-teal. */
  rejillaA: "#28d9a5",
  /** Rejilla de Onda: color B (era el violeta `vec3(.7,.5,1)`) → morado. */
  rejillaB: "#a855f7",
  hud: "#7fffa8", // matrix-text
  hudLinea: "#143b22", // matrix-line
  hudAcento: "#00ff41", // matrix-green
} as const;

const CONFIG = {
  ancho: 900,
  alto: 600,
  /** Resolución de la textura de cámara (3:2, igual que el lienzo). Densidad 1. */
  camAncho: 480,
  camAlto: 320,
  /** Ancho del preview de cámara, abajo a la derecha. */
  preview: 180,
  /** Valor inicial de los dos ajustes genéricos (0–1). */
  ajuste1: 0.5,
  ajuste2: 0.5,
  /** Velocidad del reloj `uTiempo` (para los filtros animados). */
  velTiempo: 1,
};

/**
 * Vertex shader del cuad de pantalla completa: **ignora cámara y proyección** y
 * manda `aTexCoord` directo a clip space. Mismo truco que `mareaManos.ts`,
 * `cavernaImpulso.ts` y compañía. Con `uv.y = 0` abajo, el `vUv` coincide con el
 * `fragCoord/iResolution` de Shadertoy sin inversión extra.
 */
const CUAD_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vUv;
void main() {
  vUv = aTexCoord;
  gl_Position = vec4(aTexCoord * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * PRELUDIO común a todos los filtros: uniforms compartidos + la convención de
 * muestreo de la cámara. Se antepone al `cuerpo` de cada entrada de `FILTROS`,
 * así todos ven la misma API (esto es lo que hace intercambiables los filtros).
 *
 * `CAM(uv)` / `PREV(uv)` son la **única** forma de leer la cámara: centralizan
 * la orientación (el eje Y de la textura de p5 va al revés que el `vUv` de
 * Shadertoy, con 0 abajo). Si la cámara sale de cabeza, cambiar el `1.0 - (uv).y`
 * de ACÁ y solo acá.
 */
const PRELUDIO = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uCamara;  // iChannel0: cámara compartida (ya espejada en JS)
uniform sampler2D uPrev;    // cuadro anterior de la MISMA cámara (filtros temporales)
uniform vec2 uResolucion;   // iResolution: tamaño del lienzo en px
uniform float uTiempo;      // iTime: segundos (× "Velocidad")
uniform vec2 uMouse;        // iMouse.xy normalizado 0..1 (y con 0 abajo)
uniform float uParam;       // "Ajuste 1" 0..1
uniform float uParam2;      // "Ajuste 2" 0..1

#define CAM(uv)  texture2D(uCamara, vec2((uv).x, 1.0 - (uv).y))
#define PREV(uv) texture2D(uPrev,   vec2((uv).x, 1.0 - (uv).y))

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

/** Una entrada del registro de filtros. */
interface Filtro {
  nombre: string;
  /** Autor + URL de Shadertoy (o "sin acreditar"). */
  credito: string;
  /** Qué controla el Ajuste 1 (perilla / uParam), para el HUD. */
  ajuste1: string;
  /** Qué controla el Ajuste 2 (perilla / uParam2), para el HUD. */
  ajuste2: string;
  /**
   * Uniforms de color `nombre → hex`. Se declaran como `uniform vec3 <nombre>;`
   * antes del cuerpo y se alimentan cada frame desde `PALETA`. `{}` = sin color.
   */
  colores: Record<string, string>;
  /** El `main()` del filtro (más sus funciones auxiliares), en GLSL ES 1.00. */
  cuerpo: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CÓMO AGREGAR UN FILTRO NUEVO
//  ────────────────────────────
//  1. Pegar el shader de Shadertoy en `lib/sketches/_entryShaderToy.glsl` (el
//     buzón), anotando autor y URL, y portarlo a GLSL ES 1.00 (WebGL1):
//       · `mainImage(out vec4 fragColor, in vec2 fragCoord)` → `void main()`,
//         con `fragCoord = vUv * uResolucion` y `fragColor` → `gl_FragColor`.
//       · `iResolution`→`uResolucion`, `iTime`→`uTiempo`, `iMouse.xy`→`uMouse`.
//       · **Leer la cámara SOLO con `CAM(uv)`** (y `PREV(uv)` si el filtro
//         necesita el cuadro anterior); nunca `texture2D(uCamara,…)` directo.
//       · Sin `texture()` (usar `texture2D`), sin `inverse()`/`round()`/`tanh()`
//         (no existen en ES 1.00: escribirlos a mano — ver flujo óptico abajo),
//         bucles con tope constante, y sin indexar arrays de uniforms con índice
//         variable (usar cadena de `if` — ver "Basura 2600").
//       · Los colores del original salen por uniforms (campo `colores`), no como
//         literales dentro del GLSL.
//  2. Exponer los dos controles continuos del filtro por `uParam`/`uParam2`
//     (ambos 0..1; el shader los reescala a su rango). Describirlos en
//     `ajuste1`/`ajuste2` para que el HUD diga qué hacen.
//  3. Agregar la entrada al array `FILTROS`. El selector, las perillas, el
//     preview y el teclado se ajustan solos (las teclas `1..9` cubren hasta 9).
//  4. Vaciar el buzón `_entryShaderToy.glsl` y documentar en `algorithms.md`.
// ═══════════════════════════════════════════════════════════════════════════

const FILTROS: Filtro[] = [
  // ── 1. Basura 2600 ───────────────────────────────────────────────────────
  {
    nombre: "Basura 2600",
    credito: "matrixmane · shadertoy.com/view/tcccWj",
    ajuste1: "tamaño de teja",
    ajuste2: "densidad de glitch",
    colores: {
      uCol0: PALETA.atari[0],
      uCol1: PALETA.atari[1],
      uCol2: PALETA.atari[2],
      uCol3: PALETA.atari[3],
      uCol4: PALETA.atari[4],
      uCol5: PALETA.atari[5],
      uCol6: PALETA.atari[6],
      uCol7: PALETA.atari[7],
    },
    cuerpo: `
#define TILE_H 6.0
#define GLITCH_DENSITY 0.9
#define SCANLINE_JITTER 0.3
#define RAND_SEED 341.73

float rand(float x){ return fract(sin(x * 12.9898 + RAND_SEED) * 43758.5453123); }
float rand2(vec2 p){ return rand(dot(p, vec2(37.0, 57.0))); }

// Paleta Atari de 8 colores. Se indexa con cadena de 'if' y NO con un arreglo de
// uniforms: GLSL ES 1.00 no garantiza indexar uniform arrays con índice variable.
vec3 atariPalette(float n){
  int idx = int(floor(fract(n) * 8.0));
  if (idx == 0) return uCol0;
  if (idx == 1) return uCol1;
  if (idx == 2) return uCol2;
  if (idx == 3) return uCol3;
  if (idx == 4) return uCol4;
  if (idx == 5) return uCol5;
  if (idx == 6) return uCol6;
  return uCol7;
}

void main(){
  vec2 res = uResolucion;
  vec2 fragCoord = vUv * res;

  // Ajuste 1: el tamaño de teja (era fijo 8x6 px).
  vec2 tileSize = vec2(8.0, 6.0) * (0.5 + uParam * 3.0);
  vec2 tileId = floor(fragCoord / tileSize);
  vec2 local  = fract(fragCoord / tileSize);

  float sTile = rand2(tileId);
  vec2 basePos = (tileId + 0.5) * tileSize;
  basePos = clamp(basePos, vec2(0.0), res - 1.0);

  vec2 jitter = (vec2(rand(sTile + 1.0), rand(sTile + 2.0)) - 0.5) * tileSize;
  vec2 samplePos = clamp(basePos + jitter * 0.4, vec2(0.0), res - 1.0);
  vec3 c = CAM(samplePos / res).rgb;

  float scanSeed = floor(fragCoord.y / TILE_H);
  float scanJit  = SCANLINE_JITTER * (rand(scanSeed + 99.0) - 0.5);

  float palN = dot(c, vec3(0.299, 0.587, 0.114)) + scanJit;
  vec3 palColor = atariPalette(palN);

  float rMode = rand(sTile + 10.0);
  float densidad = mix(0.2, 1.0, uParam2);   // Ajuste 2: densidad de glitch

  vec3 outCol;
  if (rMode < densidad) {
    float pattern = rand2(tileId + floor(local * 4.0));
    if (pattern < 0.33) {
      outCol = palColor;
    } else if (pattern < 0.66) {
      outCol = mix(c.bgr, palColor, 0.7);
    } else {
      outCol = mix(c, atariPalette(rand(sTile + pattern * 37.0)), 0.8);
    }
  } else {
    outCol = mix(c, palColor, 0.6);
  }

  gl_FragColor = vec4(outCol, 1.0);
}
`,
  },

  // ── 2. Rejilla de Onda ───────────────────────────────────────────────────
  {
    nombre: "Rejilla de Onda",
    credito: "yonibr · shadertoy.com/view/fcXSDS",
    ajuste1: "zoom del caleidoscopio",
    ajuste2: "torsión",
    colores: { uColorA: PALETA.rejillaA, uColorB: PALETA.rejillaB },
    cuerpo: `
#define N 7
#define INTERVAL 1.5
#define NN float(N)
#define PI 3.141592654
#define INTENSITY vec3((NN * INTERVAL - t) / (NN * INTERVAL))

mat2 rot(float x){ return mat2(cos(x), sin(x), -sin(x), cos(x)); }

vec2 foldRotate(vec2 p, float s){
  float a = PI / s - atan(p.x, p.y);
  float n = PI * 2.0 / s;
  a = floor(a / n) * n;
  p *= rot(a);
  return p;
}

float sdRect(vec2 p, vec2 b){
  vec2 d = abs(p) - b;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// TheGrid by dila (shadertoy.com/view/llcXWr)
float tex(vec2 p, float z){
  p = foldRotate(p, 8.0);
  vec2 q = (fract(p / 10.0) - 0.5) * 10.0;
  for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 2; j++) { q = abs(q) - 0.25; q *= rot(PI * 0.25); }
    q = abs(q) - vec2(1.0, 1.5);
    q *= rot(PI * 0.25 * z);
    q = foldRotate(q, 3.0);
  }
  float d = sdRect(q, vec2(1.0, 1.0));
  return smoothstep(0.9, 1.0, 1.0 / (1.0 + abs(d)));
}

float sm(float start, float end, float t, float smo){
  return smoothstep(start, start + smo, t) - smoothstep(end - smo, end, t);
}

// Contorno de la cámara (detección de bordes por luminancia): el rol de "píxel"
// de este filtro. Reemplaza el iChannel1 (webcam) del original.
float bw(vec2 c){ vec3 l = CAM(c).rgb; return l.r * 0.21 + l.g * 0.71 + l.b * 0.07; }
float outline(vec2 uv){
  const float sensitivity = 1.0 / 64.0;
  vec2 of = vec2(sensitivity, 0.0);
  return sqrt(
    pow(abs(bw(uv) - bw(uv + of.xx)), 2.0) +
    pow(abs(bw(uv + of.xy) - bw(uv + of.yx)), 2.0)
  );
}

void main(){
  vec2 uv = vUv;
  float img_outline = outline(uv);
  // round() no existe en ES 1.00 -> floor(x + 0.5).
  img_outline = min(floor(img_outline * 8.0 + 0.5), 2.0) * img_outline;

  float aspect = uResolucion.x / uResolucion.y;
  uv = uv * 2.0 - 1.0;
  uv.x *= aspect;
  uv *= 2.0 * (0.6 + uParam * 1.4);   // Ajuste 1: zoom

  vec3 col = vec3(0.0);
  for (int i = N - 1; i >= 0; i--) {
    float fi = float(i);
    // El original acumulaba esta fase con el espectro de audio; acá la mueve el
    // reloj (la galería no le da canal de audio a este filtro).
    float time = uTiempo * 0.6 + fi * 0.9;
    float offY = 0.5 + 0.5 * sin(uTiempo * 0.7 + fi);
    float ii = fi + 1.0;
    float t;

    t = ii * INTERVAL - mod(time + INTERVAL * 0.5, INTERVAL);
    col = mix(col, INTENSITY * uColorA * 1.3, tex(uv * max(0.0, t), 4.45));

    t = ii * INTERVAL - mod(time, INTERVAL);
    float r  = length(uv * 2.0 * max(0.0, t));
    float rr = sm(-24.0, -0.0, (r - mod(time * 30.0, 90.0)), 10.0);
    col = mix(
      col,
      mix(INTENSITY * vec3(1.0), INTENSITY * uColorB * 3.0, rr),
      tex(uv * 2.0 * max(0.0, t), 0.27 + 2.0 * offY * rr * (0.3 + uParam2))  // Ajuste 2: torsión
    );
  }

  gl_FragColor = vec4(col * img_outline, 1.0);
}
`,
  },

  // ── 3. Espejo Complejo ───────────────────────────────────────────────────
  {
    nombre: "Espejo Complejo",
    credito: "Refurio · shadertoy.com/view/scsGDH",
    ajuste1: "brillo",
    ajuste2: "zoom",
    colores: {},
    cuerpo: `
// Multiplicación de complejos: (a.x + i a.y)(b.x + i b.y).
vec2 cmul(vec2 a, vec2 b){ return mat2(a, -a.y, a.x) * b; }

void main(){
  float radius     = 0.35 + uParam2 * 0.9;   // Ajuste 2: zoom (era fijo 0.5)
  float dampening  = uParam * 1.6;            // Ajuste 1: brillo (era 1 - iMouse.y/res.y)

  vec2 fragCoord = vUv * uResolucion;
  float m = min(uResolucion.x, uResolucion.y);
  vec2 uv = (2.0 * fragCoord - uResolucion) / m;

  vec2 z = uv * radius;
  z = cmul(z, z);   // el warp: elevar la coordenada al cuadrado como complejo

  float aspect = uResolucion.x / uResolucion.y;
  vec2 tv = z; tv.y *= aspect; tv = tv * 0.5 + 0.5;
  // Fuera de [0,1) el warp saldría del encuadre: se cae a la imagen sin deformar.
  if (fract(tv) != tv) { tv = uv; tv.y *= aspect; tv = tv * 0.5 + 0.5; }

  gl_FragColor = vec4(dampening * CAM(tv).rgb, 1.0);
}
`,
  },

  // ── 4. Flujo Óptico ──────────────────────────────────────────────────────
  {
    nombre: "Flujo Óptico",
    credito: "Lucas–Kanade · gist.github.com/983",
    ajuste1: "sensibilidad",
    ajuste2: "escala del flujo",
    colores: {},
    cuerpo: `
#define PI 3.14159265
#define VENTANA 3   // radio de la ventana (2*VENTANA+1 muestras por eje)

vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main(){
  vec2 uv = vUv;
  vec2 texel = 1.0 / uResolucion;
  float paso = 1.0 + uParam2 * 3.0;   // Ajuste 2: separación de muestras (escala)

  // Tensor de estructura [[a, b],[b, d]] y lado derecho Atb, acumulados en la
  // ventana. La derivada temporal sale de uPrev (el cuadro anterior): eso es lo
  // que en el original vivía en un buffer aparte.
  float a = 0.0, b = 0.0, d = 0.0;
  vec2 atb = vec2(0.0);
  for (int i = -VENTANA; i <= VENTANA; i++) {
    for (int j = -VENTANA; j <= VENTANA; j++) {
      vec2 loc = uv + vec2(float(i), float(j)) * texel * paso;
      float c0 = lum(CAM(loc).rgb);
      float dx = lum(CAM(loc + vec2(texel.x, 0.0)).rgb) - c0;
      float dy = lum(CAM(loc + vec2(0.0, texel.y)).rgb) - c0;
      float dt = c0 - lum(PREV(loc).rgb);
      float w = exp(-float(i * i + j * j) / 8.0);
      a += w * dx * dx;
      b += w * dx * dy;
      d += w * dy * dy;
      atb.x -= w * dx * dt;
      atb.y -= w * dy * dt;
    }
  }

  // motion = inverse(tensor) * Atb, por Cramer (no hay inverse() en ES 1.00).
  float det = a * d - b * b;
  vec2 motion = abs(det) > 1e-6
    ? vec2(d * atb.x - b * atb.y, -b * atb.x + a * atb.y) / det
    : vec2(0.0);

  // Rechazo de features pobres por los valores propios del tensor.
  float mm = 0.5 * (a + d);
  float disc = sqrt(max(mm * mm - det, 0.0));
  if (mm + disc < 0.0008 || mm - disc < 0.0008) motion = vec2(0.0);

  float mag = length(motion);
  float ang = atan(motion.y, motion.x) / (2.0 * PI) + 0.5;
  mag = mag * (3.0 + uParam * 40.0) * smoothstep(0.0, 1.0, mag);   // Ajuste 1: sensibilidad

  gl_FragColor = vec4(hsv2rgb(vec3(ang, 1.0, clamp(mag, 0.0, 1.0))), 1.0);
}
`,
  },
];

export const filtrosCamara: SketchFactory = (p: p5) => {
  const camara = new Camara(p);

  // --- Estado en clausura ---------------------------------------------------
  /** Un shader compilado por filtro, en el mismo orden que `FILTROS`. */
  const shaders: p5.Shader[] = [];
  /** Cámara volcada (espejada + cover) y su cuadro anterior, como texturas. */
  let camGfx: p5.Graphics;
  let prevGfx: p5.Graphics;

  let indice = 0;
  let param1 = CONFIG.ajuste1;
  let param2 = CONFIG.ajuste2;
  let velTiempo = CONFIG.velTiempo;
  /** Reloj acumulado (para que la perilla de velocidad no dé saltos). */
  let tiempo = 0;

  let usarCamara = false;
  let mostrarHud = true;
  let selectorCamara: SelectorCamara;
  let panelEstado: PanelEstado;
  let botonFiltro: Boton;

  p.setup = () => {
    p.createCanvas(CONFIG.ancho, CONFIG.alto, p.WEBGL);
    // El flujo óptico cuesta por píxel (ventana de muestras): en retina, dejar
    // que p5 duplique la densidad cuadruplica el trabajo sin diferencia visible.
    p.pixelDensity(1);
    p.noStroke();
    p.frameRate(60);

    for (const f of FILTROS) shaders.push(p.createShader(CUAD_VERT, fuente(f)));

    // Densidad 1 en los graphics de cámara: así el `drawImage` va en px lógicos
    // sin el factor retina, y las dos texturas quedan alineadas pixel a pixel.
    camGfx = p.createGraphics(CONFIG.camAncho, CONFIG.camAlto);
    prevGfx = p.createGraphics(CONFIG.camAncho, CONFIG.camAlto);
    camGfx.pixelDensity(1);
    prevGfx.pixelDensity(1);
    camGfx.background(0);
    prevGfx.background(0);

    crearControles();
  };

  p.draw = () => {
    p.background(PALETA.fondo);

    tiempo += (p.deltaTime / 1000) * velTiempo;
    actualizarCamara();
    dibujarFiltro();

    p.resetShader();
    if (mostrarHud) dibujarPreview();
    panelEstado.actualizar(mostrarHud ? textoEstado() : "");
  };

  // --- Cámara compartida (uCamara / uPrev) ----------------------------------

  /**
   * Vuelca el cuadro nuevo a `camGfx` (espejado y recortado a cover) tras copiar
   * el cuadro viejo a `prevGfx`. El orden importa: `prevGfx` debe quedar con el
   * cuadro **anterior** cuando el flujo óptico lo lea, así que se copia antes de
   * redibujar. Sin cámara, un patrón de prueba anima la escena para que los
   * filtros tengan algo que procesar.
   */
  function actualizarCamara() {
    const cw = CONFIG.camAncho;
    const ch = CONFIG.camAlto;
    const prev = prevGfx.drawingContext as CanvasRenderingContext2D;
    const act = camGfx.drawingContext as CanvasRenderingContext2D;

    // Cuadro actual (del frame pasado) -> previo.
    prev.clearRect(0, 0, cw, ch);
    prev.drawImage(act.canvas, 0, 0, cw, ch);

    if (usarCamara && camara.listo) volcarVideo(act, cw, ch);
    else dibujarPatronPrueba();
  }

  /** Dibuja el `<video>` espejado y recortado a cover dentro de `camGfx`. */
  function volcarVideo(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const video = camara.video as HTMLVideoElement;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return;

    // Recorte centrado que llena cw×ch conservando el aspecto (cover).
    const arDestino = cw / ch;
    const arFuente = vw / vh;
    let sw: number, sh: number, sx: number, sy: number;
    if (arFuente > arDestino) {
      sh = vh;
      sw = vh * arDestino;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      sw = vw;
      sh = vw / arDestino;
      sx = 0;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    ctx.setTransform(-1, 0, 0, 1, cw, 0); // espejo horizontal (selfie)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.restore();
  }

  /**
   * Patrón de prueba (sin cámara): franjas que se desplazan + un disco que rebota,
   * en la paleta de la galería. Da bordes y movimiento reales para que los cuatro
   * filtros (contorno, warp, glitch, flujo) muestren algo vivo sin permiso.
   */
  function dibujarPatronPrueba() {
    const g = camGfx;
    const t = tiempo;
    g.push();
    g.background(PALETA.fondo);
    g.noStroke();
    const cols = [PALETA.rejillaA, PALETA.atari[4], PALETA.rejillaB, PALETA.atari[2]];
    const ancho = 46;
    for (let k = -2; k < g.width / ancho + 2; k++) {
      const x = ((k * ancho + t * 60) % (g.width + ancho * 4)) - ancho * 2;
      g.fill(cols[((k % cols.length) + cols.length) % cols.length]);
      g.rect(x, 0, ancho * 0.5, g.height);
    }
    const cx = g.width * (0.5 + 0.38 * Math.sin(t * 1.3));
    const cy = g.height * (0.5 + 0.34 * Math.cos(t * 1.1));
    g.fill(PALETA.atari[2]);
    g.circle(cx, cy, 90);
    g.fill(PALETA.fondo);
    g.circle(cx, cy, 46);
    g.pop();
  }

  // --- Dibujo del filtro ----------------------------------------------------

  function dibujarFiltro() {
    const f = FILTROS[indice];
    const sh = shaders[indice];
    p.push();
    p.shader(sh);
    // Las texturas p5.Graphics se re-suben cada frame en p5 1.9.4 (rama `else`
    // de Texture.update): basta pasarlas por uniform, sin loadPixels.
    sh.setUniform("uCamara", camGfx as unknown as p5.Image);
    sh.setUniform("uPrev", prevGfx as unknown as p5.Image);
    sh.setUniform("uResolucion", [p.width, p.height]);
    sh.setUniform("uTiempo", tiempo);
    sh.setUniform("uMouse", [
      p.constrain(p.mouseX / p.width, 0, 1),
      p.constrain(1 - p.mouseY / p.height, 0, 1),
    ]);
    sh.setUniform("uParam", param1);
    sh.setUniform("uParam2", param2);
    for (const [nombre, hex] of Object.entries(f.colores)) {
      sh.setUniform(nombre, rgb(hex));
    }
    p.plane(p.width, p.height);
    p.pop();
    p.resetShader();
  }

  /** Preview de la cámara compartida (lo que ven los filtros), abajo a la derecha. */
  function dibujarPreview() {
    const w = CONFIG.preview;
    const h = (w * CONFIG.camAlto) / CONFIG.camAncho;
    // WEBGL centra el origen: la esquina inferior derecha se calcula a mano.
    const x = p.width / 2 - w - 16;
    const y = p.height / 2 - h - 16;
    p.push();
    p.resetShader();
    p.tint(255); // noTint() rompe el draw en WEBGL (p5 1.9.4 pasa uTint: null)
    p.image(camGfx, x, y, w, h);
    p.noFill();
    p.stroke(PALETA.hudLinea);
    p.strokeWeight(1);
    p.rect(x, y, w, h);
    p.pop();
  }

  // --- Selección de filtro --------------------------------------------------

  function seleccionar(i: number) {
    indice = ((i % FILTROS.length) + FILTROS.length) % FILTROS.length;
    botonFiltro.texto(`Filtro ${indice + 1}/${FILTROS.length} ▸`);
  }

  function siguiente() {
    seleccionar(indice + 1);
  }

  // --- Controles táctiles ---------------------------------------------------

  function crearControles() {
    new Knob(p, {
      etiqueta: "Ajuste 1",
      min: 0,
      max: 1,
      valor: param1,
      paso: 0.01,
      onChange: (v) => {
        param1 = v;
      },
    }).position(12, 10);

    new Knob(p, {
      etiqueta: "Ajuste 2",
      min: 0,
      max: 1,
      valor: param2,
      paso: 0.01,
      onChange: (v) => {
        param2 = v;
      },
    }).position(76, 10);

    new Knob(p, {
      etiqueta: "Velocidad",
      min: 0,
      max: 3,
      valor: velTiempo,
      paso: 0.02,
      onChange: (v) => {
        velTiempo = v;
      },
    }).position(140, 10);

    // Menú de cámaras: los `label` de `enumerateDevices()` llegan vacíos hasta
    // que hay permiso, por eso el selector trae su propio botón "Buscar".
    selectorCamara = new SelectorCamara(p, {
      ancho: 200,
      onCambio: (deviceId) => {
        // Cambio en caliente: reabrir el stream sin recrear nada más.
        if (usarCamara) void camara.abrir(deviceId);
      },
    });
    selectorCamara.position(660, 10);

    // El selector de filtro es la acción central de la pieza: acento naranja.
    botonFiltro = new Boton(p, {
      etiqueta: `Filtro 1/${FILTROS.length} ▸`,
      acento: "naranja",
      onPress: () => siguiente(),
    });
    botonFiltro.position(12, 540);

    new Boton(p, {
      etiqueta: "Cámara",
      alternar: true,
      onPress: (activo) => {
        usarCamara = activo;
        if (activo) void camara.abrir(selectorCamara.valor());
        else camara.cerrar();
      },
    }).position(150, 540);

    new Boton(p, {
      etiqueta: "HUD",
      alternar: true,
      activo: true,
      onPress: (activo) => {
        mostrarHud = activo;
      },
    }).position(258, 540);

    new Boton(p, {
      etiqueta: "Guardar",
      onPress: () => p.saveCanvas(SLUG, "png"),
    }).position(330, 540);

    // El estado va en un panel DOM: en WEBGL, `text()` exige fuente con `loadFont`.
    panelEstado = new PanelEstado(p);
    panelEstado.position(12, 508);
  }

  // --- HUD ------------------------------------------------------------------

  function textoEstado(): string {
    const f = FILTROS[indice];
    const filtro = `filtro ${indice + 1}/${FILTROS.length}: ${f.nombre} (${f.credito})`;
    const ajustes = `Ajuste 1 → ${f.ajuste1} · Ajuste 2 → ${f.ajuste2}`;
    let cam: string;
    if (!usarCamara) {
      cam = "cámara: apagada — patrón de prueba (encendé la cámara)";
    } else if (camara.error) {
      cam = `cámara: ${camara.error}`;
    } else if (!camara.listo) {
      cam = "cámara: abriendo…";
    } else {
      cam = "cámara: activa";
    }
    return `${filtro} · ${ajustes} · ${cam}`;
  }

  // --- Utilidades -----------------------------------------------------------

  /** PRELUDIO + declaración de los uniforms de color + cuerpo del filtro. */
  function fuente(f: Filtro): string {
    const decl = Object.keys(f.colores)
      .map((k) => `uniform vec3 ${k};`)
      .join("\n");
    return `${PRELUDIO}\n${decl}\n${f.cuerpo}`;
  }

  /** Hex de `PALETA` → `[r, g, b]` en 0–1, que es lo que espera el shader. */
  function rgb(hex: string): number[] {
    const c = p.color(hex);
    return [p.red(c) / 255, p.green(c) / 255, p.blue(c) / 255];
  }

  function dentroDelLienzo(): boolean {
    return (
      p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height
    );
  }

  // --- Manejadores ----------------------------------------------------------

  // p5 mapea el toque de un dedo a los eventos de mouse: tocar el lienzo pasa al
  // siguiente filtro (equivalente táctil de la tecla `n` / flecha derecha).
  p.mousePressed = () => {
    if (!dentroDelLienzo()) return;
    siguiente();
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
    if (p.key === "h" || p.key === "H") mostrarHud = !mostrarHud;
    if (p.key === "n" || p.key === "N" || p.keyCode === p.RIGHT_ARROW) siguiente();
    if (p.keyCode === p.LEFT_ARROW) seleccionar(indice - 1);
    // Teclas 1..9: selección directa de filtro.
    const n = parseInt(p.key, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= FILTROS.length) seleccionar(n - 1);
  };
};
