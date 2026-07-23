import type p5 from "p5";
import type { SketchFactory } from "../types";
import { Knob } from "../bibliotecas/knob";
import { Boton, PanelEstado } from "../bibliotecas/boton";
import { RastreadorManos } from "../bibliotecas/manosMediaPipe";
import { SelectorCamara } from "../bibliotecas/camara";

/**
 * **Caverna a Impulsos** — un río subterráneo raymarcheado por el que se avanza
 * a empujones, con inercia que se acumula si se insiste.
 *
 * El motor es un shader de Shadertoy de una sola pasada (pantalla completa): un
 * túnel-caverna que serpentea, una superficie de agua con refracción y una
 * fuente de luz que se mece por dentro. Fuente: **no vino con autor**. El GLSL
 * traía cuatro enlaces anotados a modo de referencia/inspiración
 * (`playlist/cXBGzV`, "Rio Subterraneo" `https://www.shadertoy.com/view/4cyyRc`,
 * "glass volumetric" `https://www.shadertoy.com/view/4fGyWG`, `playlist/m3BSDD`);
 * por el tema (caverna con río) **"Rio Subterraneo" (`4cyyRc`) es la fuente más
 * probable, pero NO está confirmada** y los otros parecen inspiración. Quedan
 * registrados como *referencias anotadas en el original*; falta acreditar autor.
 *
 * Cómo funciona el raymarch (ver `CAVERNA_FRAG`):
 *
 * - `map()` es el SDF de la escena: un **túnel** cuyo eje sigue `path(z)` y cuyo
 *   radio respira con `openCave` (una `tanh` de la posición), más un **grano
 *   fractal** de la pared (`trap`), y una **superficie de agua** (`waterSurf`)
 *   que ondula. `svObjID` distingue roca (0) de agua (1) para colorearlas
 *   distinto. El agua se marchea **dos veces**: la primera choca con su
 *   superficie, la segunda refracta el rayo hacia adentro (`refract`) para ver
 *   el fondo a través del agua. Normales por diferencias finitas y AO de 4
 *   muestras: es un shader **caro**.
 *
 * - **La esfera se quitó del SDF pero se conserva como luz** (mismo patrón que
 *   `bl1` en `mascaraTunel.ts`): el original fundía una bola con el túnel
 *   (`min(tunel, ball)`) y esa bola era a la vez geometría visible y la luz de
 *   la escena (`lp`). Aquí se elimina el `min(tunel, ball)` —la bola deja de
 *   renderizarse y de ocluir— pero `lp` se sigue calculando con
 *   `ballMovez`/`ballMoveXY` y viaja a `doColor()` como la posición de la luz.
 *   La cueva sigue iluminada por un foco que se mueve donde iba la bola.
 *
 * El corazón de la pieza: **el tiempo no corre solo**. En el original la cámara
 * avanzaba con `iTime` (`ro.z = iTime`). Aquí `ro.z` lo alimenta un acumulador
 * `avance` que **solo crece cuando hay un impulso**:
 *
 *   - cada frame `avance += velocidad` y `velocidad *= friccion` (fricción < 1 →
 *     la velocidad decae sola y te detienes tras unos pasos);
 *   - un **impulso** suma a la velocidad (`min(velocidad + IMPULSO, VEL_MAX)`),
 *     así repetir impulsos **acumula velocidad** y vas más rápido si insistes.
 *
 * Dos fuentes de impulso, ambas idénticas: el **botón "Adelante"** (o un toque
 * en el lienzo) y **acercar la mano a la cámara**. La animación ambiental (agua
 * fluyendo, luz meciéndose, cueva respirando, textura) va montada sobre un reloj
 * `uTiempo = avance + derivaAmbiente·relojReal`: al empujar todo el mundo avanza
 * contigo; en reposo queda casi quieto, con solo la deriva ambiental mínima
 * (`CONFIG.derivaAmbiente`) para que no se sienta muerto. El desplazamiento hacia
 * adelante viene **solo** de `avance`, nunca del reloj.
 *
 * **Gesto de acercar la mano**: la biblioteca `RastreadorManos` no expone
 * distancia a la cámara, así que el proxy de profundidad se deriva dentro del
 * sketch como el **tamaño aparente** de la mano (distancia muñeca→nudillo medio,
 * `puntos[0]`→`puntos[9]`): mano más grande = más cerca. Un empujón es un flanco
 * de crecimiento (mano lejos → cerca) detectado con histéresis + refractario
 * sobre el tamaño *suavizado* (misma disciplina que `detectarParpadeo`), para
 * que un empujón físico sea un solo impulso y el jitter del landmark no dispare
 * ráfagas. Sin cámara la pieza es plenamente jugable con el botón y las perillas.
 */

const SLUG = "caverna-impulso";

/**
 * Todos los colores del archivo. Los del shader se recolorean a la identidad de
 * la galería y viajan como uniforms (ningún hex dentro del GLSL): **verde =
 * roca/estructura**, **cian = agua** y **naranja = destello especular** (acento
 * puntual). `svObjID` decide roca vs. agua en `doColor`.
 */
const PALETA = {
  fondo: "#050805", // matrix-black
  /** Roca del túnel (era el azulado `vec3(.6,.8,1)`): verde estructura. */
  roca: "#46d98a",
  /** Superficie de agua (era el naranja `vec3(1,.55,.35)`): cian-teal. */
  agua: "#2fd6c8",
  /** Destello especular (era `vec3(1,.6,.2)`): naranja, acento puntual. */
  especular: "#ff8c1a", // neon-orange
  /** Barra del medidor de fuerza. */
  medidor: "#00ff41", // matrix-green
  /** Pico del medidor y marco del preview al detectar un empujón. */
  pico: "#ff8c1a", // neon-orange
  hud: "#7fffa8", // matrix-text
  hudLinea: "#143b22", // matrix-line
  hudAcento: "#00ff41", // matrix-green
} as const;

const CONFIG = {
  ancho: 900,
  alto: 600,

  // --- Física del avance por impulso ----------------------------------------
  /** Cuánto suma cada impulso a la velocidad (unidades de avance por frame). */
  impulso: 0.35,
  /** Cuánto conserva la velocidad de un frame al siguiente (0–1). <1 = frena. */
  friccion: 0.9,
  /** Tope de velocidad, para que insistir no teletransporte. */
  velMax: 1.0,
  /**
   * Deriva ambiental: unidades de reloj por segundo que se suman a `uTiempo`
   * (agua/luz/cueva/textura) aparte del avance, para que el mundo respire en
   * reposo. NO mueve la cámara hacia adelante. 0 = mundo congelado al detenerse.
   */
  derivaAmbiente: 0.3,

  // --- Gesto: acercar la mano -----------------------------------------------
  /** Suavizado del tamaño aparente (lerp): 1 = sin filtro, chico = más lento. */
  suavizado: 0.4,
  /** Tamaño aparente (muñeca→nudillo) por encima del cual la mano está "cerca". */
  tamCerca: 0.17,
  /** Tamaño por debajo del cual se rearma el gesto (histéresis). */
  tamLejos: 0.1,
  /** Refractario entre empujones del gesto, en ms. */
  refractario: 500,

  // --- Raymarch --------------------------------------------------------------
  /** Pasos de la marcha (Knob "Calidad"). Tope duro en el shader: MAX_PASOS. */
  pasos: 72,
  /** Duración del destello del medidor/preview al detectar un impulso, en ms. */
  flash: 180,

  preview: 190,
};

/**
 * Vertex shader del cuad de pantalla completa: **ignora cámara y proyección** y
 * manda `aTexCoord` directo a clip space. Mismo truco que `mareaManos.ts` y
 * `mascaraTunel.ts`. Con `uv.y = 0` abajo, las coordenadas coinciden con el
 * `fragCoord` de Shadertoy (origen abajo-izquierda) sin ninguna inversión extra.
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
 * **Caverna raymarcheada**, portada del shader de una sola pasada. Cambios
 * respecto del original:
 *
 * - `iTime` se parte en dos uniforms: `uAvance` mueve la cámara hacia adelante
 *   (`ro.z`) y solo crece con los impulsos; `uTiempo` es el reloj ambiental
 *   (agua/luz/cueva/textura). En el original ambos eran el mismo `iTime`.
 * - **La bola se elimina del SDF** (se quita `min(tunel, ball)`): deja de
 *   renderizarse y de ocluir, pero `lp` se sigue calculando y pasando a
 *   `doColor` como la luz. La cueva queda iluminada por ese foco móvil.
 * - Los colores literales (`vec3(.6,.8,1)`, `vec3(1,.55,.35)`, `vec3(1,.6,.2)`)
 *   salen de uniforms de `PALETA`. `svObjID` elige roca (verde) o agua (cian).
 * - **`tanh` no existe en GLSL ES 1.00 (WebGL1)**: `openCave`, `ballMovez` y
 *   `ballMoveXY` la usan, así que va polyfilleada (`tanh_`, definición exacta con
 *   el argumento acotado para no desbordar `exp`).
 * - `while(i++ < 96.)` → `for` con tope constante `MAX_PASOS` y `break` por
 *   `uPasos` (Knob "Calidad"), en las dos marchas. Todas las variables locales
 *   se inicializan (ES 1.00). `iResolution` → `uResolucion`.
 * - Orientación: `fragCoord = vUv·uResolucion`, con `vUv.y = 0` abajo, coincide
 *   con Shadertoy sin flip.
 */
const CAVERNA_FRAG = `
precision highp float;
varying vec2 vUv;

uniform vec2 uResolucion;
uniform float uAvance;   // acumulador de avance: mueve la cámara (era ro.z = iTime)
uniform float uTiempo;   // reloj ambiental: agua/luz/cueva/textura
uniform float uPasos;    // pasos de la marcha (Knob "Calidad")

uniform vec3 uRoca;      // era vec3(.6,.8,1)
uniform vec3 uAgua;      // era vec3(1,.55,.35)
uniform vec3 uEspecular; // era vec3(1,.6,.2)

#define MAX_PASOS 96

// tanh no existe en GLSL ES 1.00: definición exacta, con el argumento acotado
// para que exp(2x) no desborde (tanh satura a ±1 mucho antes de |x|=10).
float tanh_(float x) {
  x = clamp(x, -10.0, 10.0);
  float e = exp(2.0 * x);
  return (e - 1.0) / (e + 1.0);
}

#define h21(p) fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123)
#define path(z) vec2(sin(z * .15) * 2.4, cos(z * .25) * 1.7)
#define openCave(T)  (tanh_(cos((T) * .05) * 12. + 10.) * .5 + .5)
#define ballMovez(T)  (tanh_(cos((T) * .5) * 6. + 4.) * 3. + 7.)
#define ballMoveXY(T) (tanh_(sin(T) * 5. - 3.) * 4.)
#define tri(x) abs(x - floor(x) - .5)
#define trap(x, pf) (tri(x - pf * .125) + tri(x + pf * .125)) * .5

bool G;
float FAR = 40., ID, svObjID;
vec3 lp;

// Superficie de agua: ondas que fluyen con el reloj ambiental.
float waterSurf(vec3 p) {
  p += vec3(0, 0, uTiempo * 4.);
  return dot(sin(p + sin(p.yzx * 2.) * cos(p.y)), vec3(.2)) + 1.;
}

float map(vec3 p) {
  float sf = dot(trap(p * .384 + trap(p.yzx * .192, .75), .75), vec3(.666));
  sf = (1. - sf) * (cos(p.z * .4) + 1.02);

  p.xy -= path(p.z);

  // La bola se quitó del SDF: solo queda el túnel. lp se sigue usando como luz
  // en doColor, no como geometría.
  float tunel = 1.5 - length(p.xy * vec2(.5, .7071)) * openCave(uTiempo) + sf;

  if (G) {
    ID = 1.;
    return tunel;
  }

  p.y += waterSurf(p);
  ID = step(tunel, p.y);
  return min(tunel, p.y);
}

vec3 getNormal(vec3 p, inout float edge) {
  vec2 e = vec2(6. / uResolucion.y, 0);

  edge = abs(map(p + e.xyy) + map(p - e.xyy) - map(p) * 2.)
       + abs(map(p + e.yxy) + map(p - e.yxy) - map(p) * 2.)
       + abs(map(p + e.yyx) + map(p - e.yyx) - map(p) * 2.);

  edge = smoothstep(0., 1., sqrt(edge / e.x * 2.));

  e = vec2(.01, 0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

vec3 doColor(vec3 sp, vec3 rd, vec3 sn, vec3 luz, float edge, float dist) {
  vec3 col = vec3(0.);

  if (dist < 40.) {
    vec3 ld = luz - sp;
    float lDist = max(length(ld), .001);
    ld /= lDist;

    float atten = 1.5 / (1. + lDist * .125 + lDist * lDist * .025);

    float diff = max(dot(sn, ld), 0.);
    diff = pow(diff, 4.) * .66 + pow(diff, 8.) * .34;

    float spec = pow(max(dot(reflect(-ld, sn), -rd), 0.), 32.);

    vec3 objCol = uRoca;
    if (svObjID > .5) objCol = uAgua;

    col = objCol * (diff + .7 + uEspecular * spec * 2.);
    col *= 1. - edge * .9;
    col *= atten;
  }

  return col;
}

float calculateAO(vec3 pos, vec3 nor) {
  float sca = 2., occ = 0.;
  for (int i = 0; i < 4; i++) {
    float hr = .01 + float(i) * .5 / 4.;
    float dd = map(nor * hr + pos);
    occ += (hr - dd) * sca;
    sca *= .6;
  }
  return clamp(1. - occ, 0., 1.);
}

float march(vec3 ro, vec3 rd) {
  float t = 0., d = 0.;
  for (int k = 0; k < MAX_PASOS; k++) {
    if (float(k) >= uPasos) break;
    d = map(ro + rd * t);
    if (abs(d) < .001 * (t * .5 + 1.) || t > FAR) break;
    t += d * .8;
  }
  return t;
}

float noise(vec3 q) {
  vec2 p = vec2(length(q.zy), q.x);
  vec2 i = floor(p), f = fract(p), c = vec2(1, 0);
  f *= f * (3. - 2. * f);
  return mix(
    mix(h21(i + c.yy), h21(i + c.xy), f.x),
    mix(h21(i + c.yx), h21(i + c.xx), f.x),
    f.y
  );
}

float bumpFunc(vec3 p) {
  vec2 e = vec2(uTiempo, 0);
  return (
    noise(p * 5. + e.yxy * -12.)
    + noise(p * 4. + e.xyy * -4.)
    + noise(p * 6. + e.xyy * 7.)
  ) / 2.;
}

vec3 bumpMap(vec3 p, vec3 n, float bumpfactor) {
  vec2 e = vec2(.002, 0);
  vec3 grad = vec3(
    bumpFunc(p - e.xyy),
    bumpFunc(p - e.yxy),
    bumpFunc(p - e.yyx)
  ) - bumpFunc(p);

  return normalize((1. - n * dot(n, n)) * grad * bumpfactor / e.x + n);
}

void main() {
  // fragCoord en píxeles, origen abajo-izquierda (vUv.y = 0 abajo): igual que
  // Shadertoy, sin inversión.
  vec2 fragCoord = vUv * uResolucion;
  vec2 r = uResolucion;
  vec2 u = (fragCoord - r / 2.) / r.y;

  // La cámara avanza SOLO con el acumulador de impulso; la luz se mece con el
  // reloj ambiental (era el mismo iTime para todo).
  vec3 ro = vec3(0, 0, uAvance);
  vec3 lk = ro + vec3(0, 0, .25);
  lp = ro + vec3(0, .25, ballMovez(uTiempo));

  ro.xy += path(ro.z);
  lk.xy += path(lk.z);
  lp.xy += path(lp.z + ballMoveXY(uTiempo)) - vec2(0, 1);

  vec3 forward = normalize(lk - ro);
  vec3 right = normalize(vec3(forward.z, 0., -forward.x));
  vec3 up = cross(forward, right);
  vec3 rd = normalize(forward + (u.x * right + u.y * up));

  // Primera marcha: choca con la pared o con la superficie del agua.
  float md = march(ro, rd);

  svObjID = ID;
  float oSvObjID = svObjID;
  vec3 sp = ro + rd * md;

  float edge = 0.;
  vec3 sn = getNormal(sp, edge);

  if (oSvObjID < .5) sn = bumpMap(sp, sn, .04);

  vec3 col = doColor(sp, rd, sn, lp, edge, md);

  float fog = md / FAR + .2;
  float ao = calculateAO(sp, sn);

  vec3 refr = refract(rd, sn, 1. / 1.33);
  float fr = clamp(1. + dot(rd, sn), 0., 1.);

  // Segunda marcha (solo sobre agua): refracta el rayo para ver el fondo a
  // través de la superficie.
  svObjID = ID;

  if (oSvObjID < .5) {
    G = true;
    md = march(sp, refr);
    svObjID = ID;
    vec3 refSp = sp + refr * md;
    sn = getNormal(refSp, edge);

    vec3 refrColor = doColor(refSp, refr, sn, lp, edge, md);
    col = col * .2 + mix(refrColor, col, pow(fr, 5.) * .4 + .2);
  } else {
    col = pow(col, vec3(.5)) * (ao + .5) * .5 - fog * .3;
  }

  vec3 fin = pow(smoothstep(.05, .4, col * fog), vec3(.45));
  gl_FragColor = vec4(fin, 1.0);
}
`;

/**
 * Flanco de acercamiento de la mano: dos umbrales (histéresis) sobre el tamaño
 * aparente suavizado + refractario. Misma disciplina que `DetectorPuno` de
 * `mareaManos.ts` y `DetectorOjo` de `mascaraTunel.ts`. Con un solo umbral, una
 * mano sostenida cerca dispararía un impulso por frame; con dos, hay que alejar
 * la mano (el tamaño baja de `tamLejos`) para armar el siguiente empujón.
 */
class DetectorAcercar {
  /** La mano está "cerca" ahora mismo (armado invertido). */
  cerca = false;
  private ultimo = -Infinity;

  /** `true` solo en el frame en que la mano cruza de lejos a cerca. */
  actualizar(tam: number, ahora: number): boolean {
    if (!this.cerca && tam > CONFIG.tamCerca) {
      this.cerca = true;
      if (ahora - this.ultimo > CONFIG.refractario) {
        this.ultimo = ahora;
        return true;
      }
    } else if (this.cerca && tam < CONFIG.tamLejos) {
      this.cerca = false;
    }
    return false;
  }

  reiniciar(): void {
    this.cerca = false;
  }
}

export const cavernaImpulso: SketchFactory = (p: p5) => {
  const rastreador = new RastreadorManos(p);
  const detector = new DetectorAcercar();

  // --- Estado en clausura ---------------------------------------------------
  let shaderCaverna: p5.Shader;

  /** Acumulador de avance: la cámara está en `ro.z = avance`. Solo crece con impulsos. */
  let avance = 0;
  /** Velocidad de avance por frame; decae por fricción, sube con cada impulso. */
  let velocidad = 0;

  // Parámetros de las perillas.
  let impulso = CONFIG.impulso;
  let friccion = CONFIG.friccion;
  let velMax = CONFIG.velMax;
  let pasos = CONFIG.pasos;

  // Gesto.
  /** Tamaño aparente de la mano, suavizado (muñeca→nudillo medio). */
  let tamanoSuave = 0;
  /** Había mano el frame anterior (para reiniciar el suavizado al reaparecer). */
  let habiaMano = false;

  /** Hasta cuándo (ms) dura el destello de "impulso detectado" en el HUD. */
  let flashHasta = 0;

  let usarCamara = false;
  let mostrarHud = true;
  let selectorCamara: SelectorCamara;
  let panelEstado: PanelEstado;

  // Colores del medidor, precalculados.
  let colMedidor: p5.Color;
  let colPico: p5.Color;
  let colLinea: p5.Color;

  p.setup = () => {
    p.createCanvas(CONFIG.ancho, CONFIG.alto, p.WEBGL);
    // El raymarch cuesta por píxel; en retina, duplicar la densidad cuadruplica
    // el trabajo sin diferencia visible. Y esta pieza marcha DOS veces (agua).
    p.pixelDensity(1);
    p.noStroke();
    p.frameRate(60);

    shaderCaverna = p.createShader(CUAD_VERT, CAVERNA_FRAG);

    colMedidor = p.color(PALETA.medidor);
    colPico = p.color(PALETA.pico);
    colLinea = p.color(PALETA.hudLinea);

    crearControles();
  };

  p.draw = () => {
    p.background(PALETA.fondo);

    if (usarCamara && rastreador.activo) rastreador.actualizar();
    leerGesto();
    avanzarFisica();

    dibujarCaverna();

    // HUD: se dibuja con el pipeline por defecto (el shader ya terminó).
    p.resetShader();
    dibujarMedidor();
    if (mostrarHud) dibujarPreview();
    panelEstado.actualizar(mostrarHud ? textoEstado() : "");
  };

  // --- Física del avance por impulso ----------------------------------------

  /**
   * El desplazamiento hacia adelante viene solo de `avance`; el reloj ambiental
   * `uTiempo` agrega la deriva mínima para que el mundo respire en reposo.
   */
  function avanzarFisica() {
    avance += velocidad;
    velocidad *= friccion;
    if (velocidad < 1e-4) velocidad = 0;
  }

  /** Reloj ambiental: avance + deriva por tiempo real (agua/luz/cueva/textura). */
  function relojAmbiente(): number {
    return avance + CONFIG.derivaAmbiente * (p.millis() / 1000);
  }

  /** Un impulso: suma a la velocidad (acumulable) y enciende el destello del HUD. */
  function impulsar() {
    velocidad = Math.min(velocidad + impulso, velMax);
    flashHasta = p.millis() + CONFIG.flash;
  }

  function reiniciar() {
    avance = 0;
    velocidad = 0;
    detector.reiniciar();
  }

  // --- Gesto: acercar la mano -----------------------------------------------

  /**
   * Deriva el tamaño aparente de la mano (proxy de profundidad) y dispara un
   * impulso en el flanco de acercamiento. `RastreadorManos` no da distancia a la
   * cámara: el tamaño aparente es la distancia muñeca→nudillo medio, que crece
   * al acercar la mano. Se suaviza con lerp antes de pasarlo al detector, o el
   * jitter del landmark dispararía falsos positivos.
   */
  function leerGesto() {
    const manos = usarCamara && rastreador.activo ? rastreador.estado.manos : [];
    if (manos.length === 0) {
      detector.reiniciar();
      habiaMano = false;
      return;
    }
    const mano = manos[0];
    const tam = Math.hypot(
      mano.puntos[0].x - mano.puntos[9].x,
      mano.puntos[0].y - mano.puntos[9].y,
    );
    // Al reaparecer la mano, arrancar el suavizado en la lectura actual para no
    // fabricar un flanco falso desde el valor viejo.
    tamanoSuave = habiaMano
      ? tamanoSuave + (tam - tamanoSuave) * CONFIG.suavizado
      : tam;
    habiaMano = true;

    if (detector.actualizar(tamanoSuave, p.millis())) impulsar();
  }

  // --- Dibujo ---------------------------------------------------------------

  /** Cuad de pantalla completa con el shader de la caverna. */
  function dibujarCaverna() {
    p.push();
    p.shader(shaderCaverna);
    shaderCaverna.setUniform("uResolucion", [p.width, p.height]);
    shaderCaverna.setUniform("uAvance", avance);
    shaderCaverna.setUniform("uTiempo", relojAmbiente());
    shaderCaverna.setUniform("uPasos", pasos);
    shaderCaverna.setUniform("uRoca", rgb(PALETA.roca));
    shaderCaverna.setUniform("uAgua", rgb(PALETA.agua));
    shaderCaverna.setUniform("uEspecular", rgb(PALETA.especular));
    // El tamaño del plano da igual: el vertex shader lo manda a clip space desde
    // la UV, no desde la posición.
    p.plane(p.width, p.height);
    p.pop();
    p.resetShader();
  }

  /**
   * Medidor de la fuerza acumulada: una barra que muestra `velocidad/velMax`,
   * para que se vea que el empujón registró y que la inercia sube al insistir.
   * Se dibuja con geometría (no `text()`, que en WEBGL exige fuente cargada).
   */
  function dibujarMedidor() {
    const w = 220;
    const h = 10;
    // WEBGL centra el origen: la esquina inferior izquierda se calcula a mano.
    const x = -p.width / 2 + 12;
    const y = p.height / 2 - 58;
    const destello = p.millis() < flashHasta;
    const frac = velMax > 0 ? Math.min(velocidad / velMax, 1) : 0;

    p.push();
    p.noStroke();
    p.fill(colLinea);
    p.rect(x, y, w, h);
    p.fill(destello ? colPico : colMedidor);
    p.rect(x, y, w * frac, h);
    p.pop();
  }

  /** Preview de la cámara con el esqueleto de las manos, abajo a la derecha. */
  function dibujarPreview() {
    if (!usarCamara) return;
    const w = CONFIG.preview;
    const x = p.width / 2 - w - 16;
    const y = p.height / 2 - w * 0.75 - 78;
    const destello = p.millis() < flashHasta;
    p.push();
    p.resetShader();
    rastreador.dibujarPreview(x, y, w, {
      linea: PALETA.hudAcento,
      punto: PALETA.hud,
      // El marco parpadea naranja al detectar un empujón por gesto.
      marco: destello ? PALETA.pico : PALETA.hudLinea,
    });
    p.pop();
  }

  // --- Controles táctiles ----------------------------------------------------

  function crearControles() {
    new Knob(p, {
      etiqueta: "Impulso",
      min: 0.05,
      max: 1,
      valor: impulso,
      paso: 0.01,
      onChange: (v) => {
        impulso = v;
      },
    }).position(12, 10);

    new Knob(p, {
      etiqueta: "Inercia",
      min: 0.7,
      max: 0.985,
      valor: friccion,
      paso: 0.005,
      onChange: (v) => {
        friccion = v;
      },
    }).position(76, 10);

    new Knob(p, {
      etiqueta: "Vel. máx",
      min: 0.2,
      max: 3,
      valor: velMax,
      paso: 0.05,
      onChange: (v) => {
        velMax = v;
      },
    }).position(140, 10);

    new Knob(p, {
      etiqueta: "Calidad",
      min: 24,
      max: 96,
      valor: pasos,
      paso: 1,
      onChange: (v) => {
        pasos = v;
      },
    }).position(204, 10);

    // Menú de cámaras: los `label` de `enumerateDevices()` llegan vacíos hasta
    // que hay permiso, por eso el selector trae su propio botón "Buscar".
    selectorCamara = new SelectorCamara(p, {
      ancho: 200,
      onCambio: (deviceId) => {
        // Cambio en caliente: se reabre el stream sin recargar el modelo.
        if (usarCamara) void rastreador.iniciar(deviceId);
      },
    });
    selectorCamara.position(660, 10);

    // "Adelante" es la acción central: acento naranja (CTA). Cada toque = un
    // impulso; el toque sobre el lienzo hace lo mismo (más fácil de repetir).
    new Boton(p, {
      etiqueta: "Adelante",
      acento: "naranja",
      onPress: () => impulsar(),
    }).position(12, 540);

    new Boton(p, {
      etiqueta: "Cámara",
      alternar: true,
      onPress: (activo) => {
        usarCamara = activo;
        if (activo) void rastreador.iniciar(selectorCamara.valor());
        else rastreador.detener();
      },
    }).position(120, 540);

    new Boton(p, {
      etiqueta: "Reiniciar",
      onPress: () => reiniciar(),
    }).position(228, 540);

    new Boton(p, {
      etiqueta: "HUD",
      alternar: true,
      activo: true,
      onPress: (activo) => {
        mostrarHud = activo;
      },
    }).position(338, 540);

    new Boton(p, {
      etiqueta: "Guardar",
      onPress: () => p.saveCanvas(SLUG, "png"),
    }).position(426, 540);

    // El estado va en un panel DOM: en WEBGL, `text()` exige fuente con `loadFont`.
    panelEstado = new PanelEstado(p);
    panelEstado.position(12, 508);
  }

  // --- HUD -------------------------------------------------------------------

  function textoEstado(): string {
    const comun = `avance: ${avance.toFixed(1)}  vel: ${velocidad.toFixed(2)}`;
    if (!usarCamara) {
      return `cámara: apagada — tocá "Adelante" o el lienzo para avanzar · ${comun}`;
    }
    switch (rastreador.fase) {
      case "cargando":
        return `cámara: cargando modelo… · ${comun}`;
      case "sin-permiso":
        return `cámara: permiso denegado — usá "Adelante" · ${comun}`;
      case "error":
        return `cámara: error — ${rastreador.mensaje} · ${comun}`;
      case "activo": {
        const manos = rastreador.estado.manos;
        if (manos.length === 0) {
          return `sin detección — mostrá la mano y acercala para empujar · ${comun}`;
        }
        const estado = detector.cerca ? "cerca" : "lejos";
        return `mano: ${estado}  tamaño: ${tamanoSuave.toFixed(3)} · ${comun}`;
      }
      default:
        return `cámara: apagada · ${comun}`;
    }
  }

  // --- Utilidades ------------------------------------------------------------

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

  // --- Manejadores -----------------------------------------------------------

  // p5 mapea el toque de un dedo a los eventos de mouse: tocar el lienzo da un
  // impulso, igual que el botón "Adelante" (así se puede tap-tap para acelerar).
  p.mousePressed = () => {
    if (!dentroDelLienzo()) return;
    impulsar();
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
    if (p.key === "r" || p.key === "R") reiniciar();
    if (p.key === "h" || p.key === "H") mostrarHud = !mostrarHud;
    // Espacio / flecha arriba = un impulso (equivalente de teclado del botón).
    if (p.key === " " || p.keyCode === p.UP_ARROW) {
      impulsar();
      return false; // evita que la barra espaciadora scrollee la página
    }
  };
};
