import type p5 from "p5";
import type { SketchFactory } from "../types";
import { Knob } from "../bibliotecas/knob";
import { Boton, PanelEstado } from "../bibliotecas/boton";
import { RastreadorManos } from "../bibliotecas/manosMediaPipe";
import { SelectorCamara } from "../bibliotecas/camara";

/**
 * Flor de malla + shader en forma de dona, con núcleo esférico y tallo,
 * dirigida por las manos. Tres cuerpos en WEBGL, cada uno con su textura
 * procedural (ni una imagen), y con el tono ciclando en loop infinito:
 *
 *  1. **Corona de pétalos (dona).** Perfil polar de lóbulos
 *     `|cos(nPétalos·θ/2)|^agudeza` muestreado en una rejilla de anillos ×
 *     segmentos y cosido con `TRIANGLE_STRIP`. El anillo interior arranca en un
 *     radio > 0 (`CONFIG.agujero`), así la flor queda **hueca en el centro**
 *     como una dona. Curvatura en Z que la ahueca como cuenco; ruido Perlin por
 *     nodo para romper la simetría. La llena el shader `FLOR` (fbm con dominio
 *     deformado + bandas + paleta coseno + especular).
 *
 *  2. **Núcleo esférico.** Una esfera en el hueco de la dona, con su propia
 *     textura (celular, pulsante, con el tono **desfasado** para contrastar con
 *     los pétalos) y sombreado 3D real por `uNormalMatrix`.
 *
 *  3. **Tallo.** Una pila de cilindros que baja del núcleo hacia el suelo, con
 *     textura verdosa fibrosa y una leve inclinación orgánica.
 *
 * Detrás de todo hay un **fondo de oleaje** procedural (otro shader, cuad de
 * pantalla completa) en azules oceánicos. La textura de los pétalos recorre
 * rojos/rosas/violetas/azules pero **nunca vira a verde** (paleta propia + tope
 * duro del canal verde); el verde queda reservado al tallo.
 *
 * El **tono cicla solo**, de forma continua (no hay perilla de tono). Las manos
 * y las perillas comparten estos parámetros:
 *
 *   dedos levantados     → número de pétalos (dona, 3–10)     [perilla Pétalos]
 *   pinza pulgar-índice  → agudeza del pétalo (dona)          [perilla Forma]
 *   puño abierto/cerrado → curvatura del cuenco (dona)        [perilla Cuenco]
 *   separación de manos  → tamaño del núcleo esférico         [perilla Núcleo]
 *   altura de la mano    → largo del tallo                    [perilla Tallo]
 *
 * Además, con la cámara encendida, **cerrar los ojos guarda la imagen**: un
 * segundo modelo (Face Landmarker, blendshapes de parpadeo) lo detecta y
 * dispara `saveCanvas`, igual que la tecla `s`.
 *
 * Las perillas Núcleo y Tallo ocupan el lugar de las viejas Tamaño y Brillo
 * (ahora fijas); la de Tono desapareció porque el tono es automático.
 *
 * Sin cámara la pieza funciona igual con los `Knob`/`Boton` táctiles. La
 * cámara se elige con `SelectorCamara`; "Buscar cámaras" pide permiso y
 * recarga la lista con los nombres reales.
 */

const SLUG = "flor-shader";

/** Paleta del HUD y del fondo (los colores de los cuerpos los generan los shaders). */
const PALETA = {
  fondo: "#04060a", // negro azulado
  hud: "#7fffa8", // matrix-text
  hudLinea: "#143b22", // matrix-line
  hudAcento: "#00ff41", // matrix-green
};

const CONFIG = {
  lado: 900,
  /** Resolución de la corona: anillos (radial) × segmentos (angular). */
  anillos: 14,
  segmentos: 132,
  /** Tamaño fijo de la flor (antes era una perilla). */
  tamano: 235,
  /** Radio del hueco central, como fracción del tamaño (la "dona"). */
  agujero: 0.3,
  /** Brillo/especular fijo de los pétalos (antes era una perilla). */
  brillo: 0.9,
  /** Ondulación fija de las puntas de los pétalos. */
  ondulacion: 14,
  petalosMin: 3,
  petalosMax: 10,
  agudezaMin: 0.4,
  agudezaMax: 6,
  /** Escala del núcleo relativa al hueco (1 = llena justo la dona). */
  nucleoMin: 0.3,
  nucleoMax: 1.0,
  /** Largo del tallo en px. */
  talloMin: 120,
  talloMax: 640,
  /** Segmentos (cilindros) que componen el tallo. */
  talloSeg: 8,
  /** Velocidad del ciclo de tono, por frame (loop infinito). */
  velTono: 0.0016,
  /** Cuánto se acerca cada parámetro a su objetivo por frame (0–1). */
  suavizado: 0.1,
  preview: 200,
  /**
   * Coeficientes de la paleta coseno de los shaders (`a + b·cos(2π(c·t + d))`,
   * gradiente iridiscente): `a` nivel medio, `b` amplitud, `c` cuántas vueltas
   * de tono. El desfase `d` va fijo en el shader.
   */
  paletaA: [0.42, 0.32, 0.52] as const,
  paletaB: [0.45, 0.38, 0.48] as const,
  paletaC: [1.0, 0.85, 0.7] as const,
};

/** Ruido de valor + fbm, compartido por los tres fragment shaders. */
const NOISE_GLSL = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float ruido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * ruido(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

/**
 * Fondo de oleaje. Cuad de pantalla completa: el vertex shader ignora cámara y
 * proyección y mapea la UV (0–1) directo a clip space, así cubre todo el lienzo
 * sin importar la perspectiva. Se dibuja primero, con el z-test apagado.
 */
const FONDO_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vUv;
void main() {
  vUv = aTexCoord;
  gl_Position = vec4(aTexCoord * 2.0 - 1.0, 0.999, 1.0);
}
`;

/**
 * Fragment shader del fondo: oleaje suave. Bandas horizontales que ondulan y se
 * desplazan despacio (fbm + senoidales), en azules oceánicos oscuros para que
 * la flor resalte por encima.
 */
const FONDO_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTiempo;
${NOISE_GLSL}
void main() {
  vec2 uv = vUv;
  // Desplazamiento vertical del oleaje: dos ondas lentas más ruido, de modo que
  // las "olas" avanzan y se deforman sin repetirse a simple vista.
  float onda =
    0.5 * sin(uv.x * 6.0 + uTiempo * 0.35 + fbm(uv * 2.0 + uTiempo * 0.05) * 3.0) +
    0.3 * sin(uv.y * 9.0 - uTiempo * 0.22 + fbm(uv * 3.0) * 2.0);
  float h = uv.y + onda * 0.06;
  float capas = fbm(vec2(uv.x * 3.0, h * 6.0 - uTiempo * 0.1));

  vec3 hondo = vec3(0.010, 0.028, 0.060);   // valle de la ola
  vec3 cresta = vec3(0.030, 0.100, 0.190);  // cresta iluminada
  vec3 col = mix(hondo, cresta, smoothstep(0.2, 0.9, capas));
  col += pow(capas, 5.0) * vec3(0.05, 0.14, 0.24) * 0.6; // espuma tenue

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Vertex shader de la corona: proyecta la malla y agrega la ondulación viva de
 * los pétalos (una onda que recorre el ángulo y crece con el radio, así el
 * borde interior queda firme y solo las puntas se mecen).
 */
const FLOR_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;
uniform float uTiempo;
uniform float uOndulacion;
varying vec2 vUv;
void main() {
  vUv = aTexCoord;
  vec3 pos = aPosition;
  pos.z += sin(vUv.y * 12.566 + uTiempo * 1.5) * uOndulacion * vUv.x * vUv.x;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1.0);
}
`;

/** Fragment shader de la corona: textura procedural iridiscente + especular. */
const FLOR_FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTiempo;
uniform float uTono;
uniform float uBrillo;
uniform float uDetalle;
uniform vec2 uLuz;
${NOISE_GLSL}
void main() {
  float radio = vUv.x;
  float ang = vUv.y;

  vec2 q = vec2(ang * uDetalle, radio * uDetalle * 0.5 - uTiempo * 0.15);
  float n = fbm(q + fbm(q * 1.7 + uTiempo * 0.05) * 1.5);
  float bandas = 0.5 + 0.5 * sin(radio * 26.0 - uTiempo * 0.8 + n * 5.0);
  float m = mix(n, bandas, 0.35);

  // Paleta coseno propia de los pétalos: el canal verde tiene poca base y poca
  // amplitud, así el color recorre rojo/naranja/rosa/magenta/violeta/azul pero
  // NUNCA vira a verde. Distinta de la del núcleo (uPaleta*), que sí es libre.
  vec3 pa = vec3(0.55, 0.24, 0.52);
  vec3 pb = vec3(0.45, 0.20, 0.48);
  vec3 pc = vec3(1.0, 0.65, 1.0);
  vec3 col = pa + pb * cos(6.28318 * (pc * (m + uTono) + vec3(0.0, 0.18, 0.58)));
  // Garantía dura anti-verde: el verde puro exige G > R y G > B; se limita el
  // canal verde para que nunca supere al mayor de los otros dos.
  col.g = min(col.g, max(col.r, col.b));

  // Especular que sigue a la mano; exponente alto para que sea un reflejo
  // localizado y no reviente la textura a blanco. Tinte cálido (sin verde).
  vec2 cart = vec2(cos(ang * 6.28318), sin(ang * 6.28318)) * radio * 0.5 + 0.5;
  float halo = pow(1.0 - clamp(distance(cart, uLuz) * 1.6, 0.0, 1.0), 9.0);
  col += halo * uBrillo * 0.55 * vec3(1.0, 0.9, 0.95);

  col += pow(m, 7.0) * 0.45 * uBrillo * vec3(1.0, 0.85, 0.95); // brillo húmedo cálido
  col *= smoothstep(1.03, 0.3, radio) * 0.55 + 0.55;
  col += pow(1.0 - radio, 5.0) * 0.18 * vec3(1.0, 0.8, 0.95);  // borde interior de la dona
  col.g = min(col.g, max(col.r, col.b));       // reafirma el anti-verde tras los realces

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Vertex shader de los cuerpos sólidos (núcleo y tallo): pasa UV y la normal en
 * espacio de vista (`uNormalMatrix`, que p5 inyecta solo si el shader la
 * declara) para poder sombrearlos como volúmenes 3D reales.
 */
const SOLIDO_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
uniform mat4 uProjectionMatrix;
uniform mat4 uModelViewMatrix;
uniform mat3 uNormalMatrix;
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = aTexCoord;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
}
`;

/**
 * Núcleo: textura celular pulsante con el tono desfasado media vuelta respecto
 * a los pétalos, más difuso + rim para que se lea como esfera.
 */
const NUCLEO_FRAG = `
precision highp float;
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTiempo;
uniform float uTono;
uniform vec3 uPaletaA;
uniform vec3 uPaletaB;
uniform vec3 uPaletaC;
${NOISE_GLSL}
void main() {
  float n = fbm(vUv * 7.0 + uTiempo * 0.25);
  float cel = fbm(vUv * 15.0 - uTiempo * 0.4);
  float m = mix(n, cel, 0.5);
  // +0.5 en el tono: la esfera contrasta con la corona en vez de fundirse.
  vec3 col = uPaletaA + uPaletaB * cos(6.28318 * (uPaletaC * (m + uTono + 0.5) + vec3(0.0, 0.33, 0.67)));

  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.4, -0.5, 0.8));
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float rim = pow(1.0 - clamp(N.z, 0.0, 1.0), 3.0);
  col *= 0.45 + 0.75 * diff;
  col += rim * 0.5 * vec3(0.8, 0.9, 1.0);
  col += pow(m, 4.0) * 0.6;                     // manchas encendidas

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Tallo: fibras verticales verdes con venas y sombreado difuso. */
const TALLO_FRAG = `
precision highp float;
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTiempo;
${NOISE_GLSL}
void main() {
  float fibras = fbm(vec2(vUv.x * 20.0, vUv.y * 5.0));
  float venas = 0.5 + 0.5 * sin(vUv.x * 6.28318 * 8.0 + fibras * 3.0);
  vec3 verde = mix(vec3(0.03, 0.18, 0.05), vec3(0.2, 0.6, 0.15), fibras);
  verde += venas * 0.12 * vec3(0.4, 0.9, 0.3);

  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.4, -0.5, 0.8));
  float diff = clamp(dot(N, L), 0.0, 1.0);
  float rim = pow(1.0 - clamp(N.z, 0.0, 1.0), 2.5);
  verde *= 0.4 + 0.8 * diff;
  verde += rim * 0.15 * vec3(0.5, 1.0, 0.4);

  gl_FragColor = vec4(verde, 1.0);
}
`;

/** Interpolación exponencial hacia un objetivo (suaviza el salto del modelo). */
function suave(actual: number, objetivo: number, factor: number): number {
  return actual + (objetivo - actual) * factor;
}

export const florShader: SketchFactory = (p: p5) => {
  // Al cerrar los ojos (parpadeo detectado por el Face Landmarker) se guarda la
  // imagen. El parpadeo se detecta dentro de `rastreador.actualizar()`, que
  // corre al inicio de `p.draw()` —antes de dibujar la flor—, así que guardar
  // ahí capturaría el canvas recién limpiado (negro). En vez de eso, se marca
  // una bandera y el guardado ocurre al FINAL del frame, con todo ya dibujado
  // (igual que el botón Guardar, que se dispara entre frames).
  let guardarAlCerrarOjos = false;
  const rastreador = new RastreadorManos(p, {
    onParpadeo: () => {
      guardarAlCerrarOjos = true;
    },
  });

  // Parámetros con destino/valor suavizado. `objetivo` lo fija el gesto (o la
  // perilla); `actual` es el valor con el que se dibuja.
  const objetivo = {
    petalos: 6,
    agudeza: 2.2,
    curvatura: 0.35,
    nucleo: 0.6,
    tallo: 320,
  };
  const actual = { ...objetivo };

  // Tono en ciclo continuo (loop infinito) y posición del especular. Van fuera
  // del suavizado porque no persiguen un objetivo: avanzan solos cada frame.
  let tono = 0.3;
  let luzX = 0.32;
  let luzY = 0.34;

  let usarCamara = false;
  let mostrarHud = true;
  let selectorCamara: SelectorCamara;
  let panelEstado: PanelEstado;

  let shaderFondo: p5.Shader;
  let shaderFlor: p5.Shader;
  let shaderNucleo: p5.Shader;
  let shaderTallo: p5.Shader;

  /**
   * Nodos de la corona, un `Float32Array` por anillo con 5 componentes por
   * nodo (x, y, z, u, v). Se reservan una vez y se reescriben en el sitio cada
   * frame: la geometría cambia con cada gesto, pero reasignar ~2000 vértices
   * por frame sería basura para el GC.
   */
  const nodos: Float32Array[] = [];

  p.setup = () => {
    p.createCanvas(CONFIG.lado, CONFIG.lado, p.WEBGL);
    p.frameRate(30);
    p.noStroke();

    for (let a = 0; a <= CONFIG.anillos; a++) {
      nodos.push(new Float32Array((CONFIG.segmentos + 1) * 5));
    }

    shaderFondo = p.createShader(FONDO_VERT, FONDO_FRAG);
    shaderFlor = p.createShader(FLOR_VERT, FLOR_FRAG);
    shaderNucleo = p.createShader(SOLIDO_VERT, NUCLEO_FRAG);
    shaderTallo = p.createShader(SOLIDO_VERT, TALLO_FRAG);

    crearControles();
  };

  p.draw = () => {
    p.background(PALETA.fondo);

    if (usarCamara && rastreador.activo) {
      rastreador.actualizar();
      leerGestos();
    }

    for (const clave of Object.keys(objetivo) as (keyof typeof objetivo)[]) {
      actual[clave] = suave(actual[clave], objetivo[clave], CONFIG.suavizado);
    }

    // Tono en loop infinito; módulo alto para no perder precisión con las horas.
    tono = (tono + CONFIG.velTono) % 1000;
    // Sin mano, el especular orbita solo para que el reflejo siga vivo.
    if (!(usarCamara && rastreador.estado.manos.length > 0)) {
      const t = p.millis() / 1000;
      luzX = 0.5 + 0.3 * Math.cos(t * 0.5);
      luzY = 0.5 + 0.3 * Math.sin(t * 0.5);
    }

    const tiempo = p.millis() / 1000;
    generarNodos();

    dibujarFondo(tiempo);

    p.push();
    // Inclinación fija: deja ver el ahuecado y el tallo sin volverlo ilegible.
    p.rotateX(p.PI * 0.16);

    // Apilado por capas, de la más lejana a la más cercana: tallo → núcleo →
    // pétalos. En WEBGL el orden de dibujo no basta (el z-buffer decide la
    // oclusión por profundidad real), así que se limpia el buffer de
    // profundidad entre capa y capa: cada cuerpo conserva su 3D interno pero el
    // siguiente lo pinta encima por completo (algoritmo del pintor por capa).
    dibujarTallo();
    limpiarProfundidad();
    dibujarNucleo(tiempo);
    limpiarProfundidad();
    dibujarCorona(tiempo);

    p.pop();

    if (mostrarHud) dibujarHud();
    actualizarEstado();

    // Guardado diferido del parpadeo: acá el frame ya está completo, así que
    // `saveCanvas` captura la flor y no el fondo recién limpiado.
    if (guardarAlCerrarOjos) {
      guardarAlCerrarOjos = false;
      p.saveCanvas(SLUG, "png");
    }
  };

  /** Vacía el buffer de profundidad para que la siguiente capa se dibuje encima. */
  function limpiarProfundidad() {
    const gl = p.drawingContext as WebGLRenderingContext;
    gl.clear(gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Oleaje de fondo: un cuad de pantalla completa con el z-test apagado, para
   * que sea el telón sobre el que se dibuja todo lo demás.
   */
  function dibujarFondo(tiempo: number) {
    const gl = p.drawingContext as WebGLRenderingContext;
    gl.disable(gl.DEPTH_TEST);
    p.push();
    p.shader(shaderFondo);
    shaderFondo.setUniform("uTiempo", tiempo);
    p.plane(p.width, p.height);
    p.pop();
    gl.enable(gl.DEPTH_TEST);
  }

  // --- Cuerpo 1: corona de pétalos (dona) -----------------------------------

  /**
   * Perfil polar de la corona: radio del contorno para un ángulo dado. El
   * lóbulo `|cos(n·θ/2)|^agudeza` vale 1 en el eje de cada pétalo y 0 entre
   * pétalos; el 0.34 de base evita que el contorno se estrangule.
   */
  function perfil(theta: number): number {
    const lobulo = Math.pow(
      Math.abs(Math.cos((actual.petalos * theta) / 2)),
      actual.agudeza,
    );
    return 0.34 + 0.66 * lobulo;
  }

  /**
   * Reescribe posiciones y UVs de todos los nodos. El radio del anillo `a` no
   * arranca en 0 sino en `agujero`: el anillo interior es el borde del hueco
   * (la "dona"). La UV.x sigue yendo 0→1 a lo largo del pétalo para que el
   * shader coloree igual.
   */
  function generarNodos() {
    const semilla = p.millis() / 9000;
    for (let a = 0; a <= CONFIG.anillos; a++) {
      const anillo = nodos[a];
      const u = a / CONFIG.anillos; // 0 = borde del hueco, 1 = punta
      // Radio normalizado con hueco central: [0,1] → [agujero, 1].
      const radioNorm = CONFIG.agujero + u * (1 - CONFIG.agujero);
      for (let s = 0; s <= CONFIG.segmentos; s++) {
        const v = s / CONFIG.segmentos; // ángulo normalizado → UV.y
        const theta = v * p.TWO_PI;
        // Ruido sobre el círculo unitario: irregularidad que no rompe la
        // continuidad al cerrar la vuelta (θ=0 y θ=2π coinciden).
        const irregular =
          0.88 +
          0.24 * p.noise(Math.cos(theta) + 1, Math.sin(theta) + 1, semilla);
        const radio = CONFIG.tamano * radioNorm * perfil(theta) * irregular;
        const i = s * 5;
        anillo[i] = radio * Math.cos(theta);
        anillo[i + 1] = radio * Math.sin(theta);
        // Cuenco: el borde cae hacia atrás con el cuadrado del radio.
        anillo[i + 2] = -actual.curvatura * CONFIG.tamano * u * u;
        anillo[i + 3] = u;
        anillo[i + 4] = v;
      }
    }
  }

  /** Cose los anillos de dos en dos con tiras de triángulos, bajo el shader FLOR. */
  function dibujarCorona(tiempo: number) {
    p.push();
    p.shader(shaderFlor);
    shaderFlor.setUniform("uTiempo", tiempo);
    shaderFlor.setUniform("uTono", tono);
    shaderFlor.setUniform("uBrillo", CONFIG.brillo);
    shaderFlor.setUniform("uDetalle", 3 + actual.agudeza * 2.5);
    shaderFlor.setUniform("uOndulacion", CONFIG.ondulacion);
    shaderFlor.setUniform("uLuz", [luzX, luzY]);
    // La corona ya no usa uPaleta*: tiene su propia paleta sin verde en el shader.
    for (let a = 0; a < CONFIG.anillos; a++) {
      const interior = nodos[a];
      const exterior = nodos[a + 1];
      p.beginShape(p.TRIANGLE_STRIP);
      for (let s = 0; s <= CONFIG.segmentos; s++) {
        const i = s * 5;
        p.vertex(interior[i], interior[i + 1], interior[i + 2], interior[i + 3], interior[i + 4]);
        p.vertex(exterior[i], exterior[i + 1], exterior[i + 2], exterior[i + 3], exterior[i + 4]);
      }
      p.endShape();
    }
    p.pop();
  }

  // --- Cuerpo 2: núcleo esférico --------------------------------------------

  /** Radio del núcleo, escalado sobre el hueco de la dona. */
  function radioNucleo(): number {
    return CONFIG.tamano * CONFIG.agujero * actual.nucleo;
  }

  /**
   * Esfera en el hueco central. Va centrada (no empujada al frente): el apilado
   * por capas de `p.draw` hace que los pétalos la cubran por fuera del hueco, y
   * un ligero retroceso en Z la niega dentro del cuenco.
   */
  function dibujarNucleo(tiempo: number) {
    const r = radioNucleo();
    p.push();
    p.translate(0, 0, -r * 0.2);
    p.shader(shaderNucleo);
    shaderNucleo.setUniform("uTiempo", tiempo);
    shaderNucleo.setUniform("uTono", tono);
    shaderNucleo.setUniform("uPaletaA", [...CONFIG.paletaA]);
    shaderNucleo.setUniform("uPaletaB", [...CONFIG.paletaB]);
    shaderNucleo.setUniform("uPaletaC", [...CONFIG.paletaC]);
    p.sphere(r, 36, 24);
    p.pop();
  }

  // --- Cuerpo 3: tallo -------------------------------------------------------

  /**
   * Pila de cilindros que baja del núcleo hacia el suelo (+y). Cada segmento se
   * adelgaza hacia la punta y se desvía un poco en X/Z (`sin` acumulado) para
   * que el tallo caiga con una curva orgánica en vez de recto.
   */
  function dibujarTallo() {
    const seg = CONFIG.talloSeg;
    const largoSeg = actual.tallo / seg;
    const rBase = radioNucleo() * 0.5;
    const rPunta = rBase * 0.45;
    const t = p.millis() / 1000;

    p.push();
    p.shader(shaderTallo);
    shaderTallo.setUniform("uTiempo", t);
    // Arranca por debajo del núcleo y ligeramente atrás, para que salga desde
    // detrás de la flor (los pétalos y el núcleo lo tapan en su nacimiento).
    p.translate(0, radioNucleo() * 0.6, -radioNucleo() * 0.4);
    for (let i = 0; i < seg; i++) {
      const frac = i / (seg - 1);
      const radio = p.lerp(rBase, rPunta, frac);
      // Curva suave del tallo: la desviación crece hacia la punta.
      const desvio = Math.sin(i * 0.5 + t * 0.6) * largoSeg * 0.16 * frac;
      p.push();
      p.translate(desvio, largoSeg * 0.5, 0);
      // El cilindro de p5 va por el eje Y: sin rotación ya cae hacia el suelo.
      p.cylinder(radio, largoSeg * 1.04, 16, 1);
      p.pop();
      p.translate(desvio, largoSeg, 0);
    }
    p.pop();
  }

  // --- Gestos → parámetros ---------------------------------------------------

  /**
   * Vocabulario de gestos repartido entre los tres cuerpos. Cada gesto se
   * aplica solo si su mano está en cuadro: con una mano ya se controla la
   * pieza, con dos el control es completo.
   */
  function leerGestos() {
    const { manos, separacion } = rastreador.estado;
    if (manos.length === 0) return;

    // Dedos levantados (ambas manos) → número de pétalos.
    const dedos = manos.reduce((suma, m) => suma + m.dedos, 0);
    objetivo.petalos = p.map(
      dedos,
      0,
      manos.length * 5,
      CONFIG.petalosMin,
      CONFIG.petalosMax,
      true,
    );

    // Pinza pulgar-índice → agudeza del pétalo (redondo ↔ afilado).
    objetivo.agudeza = p.map(
      manos[0].pinza,
      0.05,
      0.9,
      CONFIG.agudezaMin,
      CONFIG.agudezaMax,
      true,
    );

    // Puño cerrado ↔ mano abierta → curvatura del cuenco.
    const apertura =
      manos.reduce((suma, m) => suma + m.apertura, 0) / manos.length;
    objetivo.curvatura = p.map(apertura, 0, 1, 0.7, 0.12, true);

    // Separación de las manos → tamaño del núcleo esférico (con una mano, su
    // propia extensión).
    const nucleoGesto = separacion ?? manos[0].apertura * 0.7;
    objetivo.nucleo = p.map(
      nucleoGesto,
      0.1,
      0.75,
      CONFIG.nucleoMin,
      CONFIG.nucleoMax,
      true,
    );

    // Altura de la mano → largo del tallo (mano arriba, tallo largo).
    objetivo.tallo = p.map(
      1 - manos[0].centro.y,
      0,
      1,
      CONFIG.talloMin,
      CONFIG.talloMax,
      true,
    );

    // El especular de los pétalos sigue a la mano.
    luzX = p.constrain(manos[0].centro.x, 0, 1);
    luzY = p.constrain(manos[0].centro.y, 0, 1);
  }

  // --- Controles táctiles ----------------------------------------------------

  function crearControles() {
    new Knob(p, {
      etiqueta: "Pétalos",
      min: CONFIG.petalosMin,
      max: CONFIG.petalosMax,
      valor: objetivo.petalos,
      paso: 1,
      onChange: (v) => {
        objetivo.petalos = v;
      },
    }).position(12, 12);

    new Knob(p, {
      etiqueta: "Forma",
      min: CONFIG.agudezaMin,
      max: CONFIG.agudezaMax,
      valor: objetivo.agudeza,
      paso: 0.05,
      onChange: (v) => {
        objetivo.agudeza = v;
      },
    }).position(76, 12);

    new Knob(p, {
      etiqueta: "Cuenco",
      min: 0,
      max: 0.8,
      valor: objetivo.curvatura,
      paso: 0.01,
      onChange: (v) => {
        objetivo.curvatura = v;
      },
    }).position(140, 12);

    // Núcleo y Tallo ocupan el lugar de las viejas perillas Tamaño y Brillo.
    new Knob(p, {
      etiqueta: "Núcleo",
      min: CONFIG.nucleoMin,
      max: CONFIG.nucleoMax,
      valor: objetivo.nucleo,
      paso: 0.01,
      onChange: (v) => {
        objetivo.nucleo = v;
      },
    }).position(204, 12);

    new Knob(p, {
      etiqueta: "Tallo",
      min: CONFIG.talloMin,
      max: CONFIG.talloMax,
      valor: objetivo.tallo,
      paso: 1,
      onChange: (v) => {
        objetivo.tallo = v;
      },
    }).position(268, 12);

    // Menú de cámaras: los `label` de `enumerateDevices()` llegan vacíos hasta
    // que hay permiso, por eso el selector trae su propio botón "Buscar".
    selectorCamara = new SelectorCamara(p, {
      ancho: 200,
      onCambio: (deviceId) => {
        if (usarCamara) void rastreador.iniciar(deviceId);
      },
    });
    selectorCamara.position(340, 12);

    new Boton(p, {
      etiqueta: "Cámara",
      alternar: true,
      acento: "naranja",
      onPress: (activo) => {
        usarCamara = activo;
        if (activo) void rastreador.iniciar(selectorCamara.valor());
        else rastreador.detener();
      },
    }).position(556, 24);

    new Boton(p, {
      etiqueta: "HUD",
      alternar: true,
      activo: true,
      onPress: (activo) => {
        mostrarHud = activo;
      },
    }).position(672, 24);

    new Boton(p, {
      etiqueta: "Guardar",
      onPress: () => p.saveCanvas(SLUG, "png"),
    }).position(760, 24);

    // El estado va en un panel DOM y no con `p.text`: en WEBGL, `text()` exige
    // una fuente cargada con `loadFont`.
    panelEstado = new PanelEstado(p);
    panelEstado.position(12, CONFIG.lado - 34);
  }

  // --- HUD -------------------------------------------------------------------

  function dibujarHud() {
    if (!usarCamara) return;
    const w = CONFIG.preview;
    // WEBGL centra el origen: la esquina inferior derecha se calcula a mano.
    const x = p.width / 2 - w - 16;
    const y = p.height / 2 - w * 0.75 - 16;
    p.push();
    p.resetShader(); // los shaders de los cuerpos no deben teñir el preview
    rastreador.dibujarPreview(x, y, w, {
      linea: PALETA.hudAcento,
      punto: PALETA.hud,
      marco: PALETA.hudLinea,
    });
    p.pop();
  }

  function actualizarEstado() {
    panelEstado.actualizar(mostrarHud ? textoEstado() : "");
  }

  function textoEstado(): string {
    if (!usarCamara) return "cámara: apagada — controles manuales";
    switch (rastreador.fase) {
      case "cargando":
        return "cámara: cargando modelo…";
      case "sin-permiso":
        return "cámara: permiso denegado — se usan los controles";
      case "error":
        return `cámara: error — ${rastreador.mensaje}`;
      case "activo": {
        const { manos, separacion } = rastreador.estado;
        const ojos = rastreador.ojosCerrados ? "  👁 cerrados → guardar" : "";
        if (manos.length === 0)
          return `manos: — (mostrá las manos a la cámara)${ojos}`;
        const dedos = manos.reduce((s, m) => s + m.dedos, 0);
        const sep = separacion === null ? "—" : separacion.toFixed(2);
        return `manos: ${manos.length}  dedos: ${dedos}  pinza: ${manos[0].pinza.toFixed(
          2,
        )}  separación: ${sep}  pétalos: ${actual.petalos.toFixed(1)}${ojos}`;
      }
      default:
        return "cámara: apagada";
    }
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
    if (p.key === "h" || p.key === "H") mostrarHud = !mostrarHud;
  };
};
