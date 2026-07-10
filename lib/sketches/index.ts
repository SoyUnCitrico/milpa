import type { SketchEntry } from "../types";
import { spiralOne } from "./spiralOne";
import { spiralGira } from "./spiralGira";
import { girasol } from "./girasol";
import { generativo } from "./generativo";
import { generativoParticulas } from "./generativoParticulas";
import { spaceGame } from "./spaceGame";
import { mousePaint } from "./mousePaint";
import { rejillaMovimiento } from "./rejillaMovimiento";
import { arosPulsantes } from "./arosPulsantes";
import { bolitasVectores } from "./bolitasVectores";
// import { piano } from "./piano";
import { sumador } from "./sumador";
import { soundCollider } from "./soundCollider";
import { fftVisualization } from "./fftVisualization";
// import { reticulaCrayola } from "./reticulaCrayola";
// import { estacionEspacial } from "./estacionEspacial";
import { terrenoRuido } from "./terrenoRuido";
import { lineasHumo } from "./lineasHumo";
import { abanicosAgentes } from "./abanicosAgentes";
import { ondasModuladas } from "./ondasModuladas";
import { orbitasLissajous } from "./orbitasLissajous";
import { mallaArmonica } from "./mallaArmonica";
import { revolution } from "./revolution";
import { noiseCircle } from "./noiseCircle";
import { compAurea } from "./compAurea";
import { rev2 } from "./rev2";
import { rev3 } from "./rev3";
import { revNoiz } from "./revNoiz";
import { trayectorias } from "./trayectorias";
import { sunsetREv } from "./sunsetREv";
import { delay3 } from "./delay3";
import { spectografo } from "./spectografo";
import { audioGraf } from "./audioGraf";
import { synth } from "./synth";
import { atomosPixel } from "./atomosPixel";


const baseImage = "https://amazons3-images-micel10.s3.us-east-2.amazonaws.com/images/gallery/";
/**
 * Registro de piezas de la galería. Agregar una pieza nueva = portar su factory
 * y añadir una entrada aquí; la landing itera sobre este array.
 */
export const sketches: SketchEntry[] = [
    {
    meta: {
      slug: "generativo",
      title: "Generativo",
      author: "emm3",
      source: "p5_works/sketches/generativo.js",
      image: `${baseImage}generativo.png`,
      description: "Composición generativa: un patrón aleatorio de líneas que recorre y se acumula sobre el lienzo, una cuadrícula de elipses, un cuadrado central que gira y 5 círculos interactivos distribuidos en pentágono que laten y brillan solos como afordancia de clic. Paleta vívida café-negro/dorado/turquesa/magenta neón. Loop continuo, interactivo por mouse.",
      tags: ["generativo", "líneas", "cuadrícula", "interactivo", "afordancia"],
      controls: [
        { key: "mouse", action: "Mantener pulsado activa el color de acento en líneas, cuadrado y círculos interactivos." },
        { key: "s / S", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 600,
      height: 600,
    },
    factory: generativo,
  },
  {
    meta: {
      slug: "generativo-particulas",
      title: "Generativo Partículas",
      author: "emm3",
      source: "p5_works/sketches/generativoParticulas.js",
      image: `${baseImage}generativo-particulas.png`,
      description: "Campo de flujo de ruido Perlin (Coding Train): 300 partículas siguen el campo recalculado cada frame y dejan estelas de color que derivan lentamente en el tiempo y rebotan en los bordes. Paleta violeta-magenta-cian neón sobre fondo casi negro, con el color de cada partícula elegido por distribución gaussiana centrada en el violeta medio de la paleta. El cursor atrae (o repele, con clic) a las partículas cercanas. Reusa la biblioteca Particle extendida con el modo 'estela'.",
      tags: ["partículas", "flow field", "Perlin noise", "estela", "bibliotecas", "interactivo"],
      controls: [
        { key: "mouse", action: "El cursor atrae a las partículas cercanas; el radio de influencia es local." },
        { key: "clic", action: "Invierte el modo del cursor entre atraer y repeler." },
        { key: "s / S", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 600,
      height: 600,
    },
    factory: generativoParticulas,
  },
   {
    meta: {
      slug: "girasol",
      title: "Girasol",
      author: "emm3",
      source: "p5_works/sketches/girasol.js",
      image: `${baseImage}girasol.png`,
      description: "Girasol estático compuesto por cuatro espirales de partículas (centro, dos coronas de semillas y pétalos) sobre un cielo violeta synthwave, con corona y pétalos en neón naranja/ámbar. Estudio de composición polar; reusa la biblioteca Spiral y se detiene con noLoop() tras el primer frame.",
      tags: ["espiral", "partículas", "composición", "bibliotecas", "noLoop"],
      controls: [
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 1254,
      height: 1254,
    },
    factory: girasol,
  },
  {
    meta: {
      slug: "spiral-gira",
      title: "Spiral Gira",
      author: "emm3",
      source: "p5_works/sketches/spiralGira.js",
      image: `${baseImage}spiral-gira.png`,
      description: "Flor animada de cuatro capas de espirales (centro, corona, semillas y pétalos, estos últimos con forma de gota) que respiran: los radios y ciclos hacen ping-pong entre límites mientras los offsets de ángulo rotan en sentidos contrarios. Reusa la biblioteca Spiral en modo instancia, con paleta propia en tonos ember/dorado.",
      tags: ["espiral", "partículas", "Nature of Code", "bibliotecas"],
      controls: [
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 1080,
      height: 1080,
    },
    factory: spiralGira,
  },
   {
    meta: {
      slug: "spiral-one",
      title: "Spiral One",
      author: "mdrn.mx",
      source: "p5_works/sketches/spiralOne.js",
      image: `${baseImage}spiral-one.png`,  
      description: "Tres espirales concéntricas de partículas que respiran: el radio interior y exterior hacen ping-pong entre límites y los ciclos se animan con un offset de ángulo continuo. Ejercita el reuso de las bibliotecas Spiral y Particle en modo instancia.",
      tags: ["espiral", "partículas", "Nature of Code", "bibliotecas"],
      controls: [
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 600,
      height: 600,
    },
    factory: spiralOne,
  },
    {
    meta: {
      slug: "rejilla-movimiento",
      title: "Ojos que no ven...",
      author: "emm3",
      source: "Talleres2021-CC1/assets/js/scripts/CC1/script/CC1_taller4_Movbolita_loopAnidado.js",
      image: `${baseImage}rejilla-movimiento.png`,
      description: "Rejilla de 64 ojos con estado propio: cada uno tiene tamaño, forma y color de iris distintos, y una pupila que persigue al cursor como en unos 'googly eyes'. Al hacer clic, los ojos más cercanos al punto tocado reaccionan cerrando el párpado (parpadeo) o dejando caer una lágrima, animados en el tiempo. La rejilla se calcula para llenar el canvas sin encimar ojos. Reescritura completa de la pieza original sin estado (círculos en trayectoria circular + ruido Perlin, fondo acumulado sin limpiar).",
      tags: ["ojos", "interactivo", "estado por objeto", "animación", "mouse"],
      controls: [
        { key: "mouse", action: "La pupila de cada ojo sigue al cursor." },
        { key: "clic", action: "Los ojos más cercanos al punto de clic parpadean o lloran." },
        { key: "s / S", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 800,
      height: 800,
    },
    factory: rejillaMovimiento,
  },
  {
    meta: {
      slug: "aros-pulsantes",
      title: "Aros Pulsantes",
      author: "emm3",
      source:
        "Talleres2021-CC1/assets/js/scripts/CC1/Ejemplos/CC1_ejemplo4_Movbolita_loopAnidado_aros.js",
      image: `${baseImage}aros-pulsantes.png`,
      description: "Rejilla de 49 celdas con estado propio (punto, aro y cuadrado en proporción áurea φ) y color HSB psicodélico que recorre el espectro con corrimiento de fase por celda. Dos de cada tres celdas laten con un pulso suave; la tercera rota con un rebote elástico amortiguado, para que se note la variación cada 3 iteraciones. Las celdas cercanas al mouse se energizan (más amplitud, velocidad y saturación) con una caída suave según la distancia. El tamaño base de cada celda es determinístico, calculado una vez con ruido Perlin.",
      tags: ["rejilla", "geometría", "pulso", "HSB", "proporción áurea", "interactivo", "psicodélico"],
      controls: [
        { key: "mouse", action: "Las celdas cercanas al cursor se energizan: más amplitud, velocidad y brillo." },
        { key: "s / S", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 600,
      height: 600,
    },
    factory: arosPulsantes,
  },
  {
    meta: {
      slug: "mouse-paint",
      title: "Mouse Paint",
      author: "mndrn.mx",
      source: "Talleres2021-CC1/assets/js/scripts/CC1/Ejemplos/CC1_ejemplo3_mousePaint.js",
      image: `${baseImage}mouse-paint.png`,
      description: "Herramienta de pintura: el lienzo nunca se limpia, así que se acumula. Presionar deja un círculo blanco, soltar un punto, y arrastrar pinta elipses cuyo tono recorre el espectro HSB mientras se trazan cuadrados que rotan. Del taller de Introducción al Código Creativo de mndrn.mx.",
      tags: ["interactivo", "pintar", "HSB", "mouse"],
      controls: [
        { key: "mouse", action: "Presionar, arrastrar y soltar pintan formas y color." },
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 500,
      height: 500,
    },
    factory: mousePaint,
  },
  {
    meta: {
      slug: "bolitas-vectores",
      title: "Bolitas Ping-Pong",
      author: "emm3",
      source:
        "Talleres2021-CC1/assets/js/scripts/CC1/Ejemplos/CC1_ejemplo2.5._Bolita_vectores_Muchos.js",
      image: `${baseImage}bolitas-vectores.png`,
      description: "Cinco bolitas (antes tres) con posición y velocidad como vectores rebotan dentro de una frontera rectangular; cada rebote dispara una voz de un instrumento de campana/marimba (oscilador triangular → filtro pasa-banda resonante → envolvente percusiva, migrado a Tone.js), afinada según el tamaño de la bolita: chica suena aguda, grande suena grave. Un clic 'mata' la última bolita del arreglo y hace nacer una nueva con tamaño, velocidad, color y frecuencia distintos.",
      tags: ["partículas", "rebote", "vectores", "interactivo", "audio", "Tone.js", "percusión"],
      controls: [
        { key: "clic", action: "'Mata' la última bolita y hace nacer una nueva con tamaño, velocidad, color y frecuencia distintos (activa el audio)." },
        { key: "espacio", action: "Mostrar u ocultar la frontera." },
        { key: "s / S", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: true,
      motorAudio: "tone",
      width: 600,
      height: 600,
    },
    factory: bolitasVectores,
  },{
    meta: {
      slug: "space-game",
      title: "Space Game",
      author: "emm3",
      source: "spaceGame/sketch.js",
      image: `${baseImage}space-game+(1).png`,
      description: "Reimplementación en p5 del clásico canvas shooter: una nave triangular generativa (moverse con WASD, siempre orientada hacia el cursor) dispara al hacer clic; los enemigos surgen de los bordes en colores cyberpunk según su tamaño/resistencia y persiguen a la nave, al impactarlos encogen o explotan en partículas y suman score. Fondo de campo estelar persistente sobre negro profundo. El original era Canvas 2D vanilla + gsap; aquí se reescribe sobre p5 sin dependencias externas.",
      tags: ["juego", "interactivo", "colisiones", "partículas", "cyberpunk"],
      controls: [
        {
          key: "clic",
          action: "Disparar hacia el cursor; también inicia y reinicia la partida.",
        },
        { key: "g / G", action: "Guardar el canvas como PNG (saveCanvas)." },
        { key: "W / A / S / D", action: "Mover la nave por el lienzo (movimiento continuo)." },
      ],
      needsAudio: false,
      width: 800,
      height: 600,
    },
    factory: spaceGame,
  },
  {
    meta: {
      slug: "comp-aurea",
      title: "Composición Áurea",
      author: "emm3",
      source: "creativeCode/compAurea.js",
      image: `${baseImage}comp-aurea.png`,
      description: "Círculos translúcidos superpuestos cuyos diámetros crecen en proporción áurea (φ = 1.618), anclados a las esquinas y retículas de una rejilla, con un cuadrado central que rota. Reestilizada a los tokens del sitio conservando la variedad de tonos del original (verde matrix como base; violeta, ember, ámbar, orquídea y naranja re-mapeados 1-a-1 desde los matices originales para que cada capa se distinga), con un filtro CRT en postproceso —aberración cromática, scanlines, viñeta y flicker— cuya intensidad se modula con el ángulo de giro del cuadrado, más una familia de puntos de interés sembrados en espiral áurea. Loop continuo.",
      tags: ["proporción áurea", "geometría", "composición", "CRT", "postproceso"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1000,
      height: 1000,
    },
    factory: compAurea,
  },
  {
    meta: {
      slug: "noise-circle",
      title: "Noise Circle",
      author: "emm3",
      source: "creativeCode/noiseCircle.js",
      image: `${baseImage}noise-circle.png`,
      description: "Una línea cuyo extremo orbita el centro sobre un fondo negro persistente; el grosor, el brillo y la opacidad del trazo se modulan con ruido Perlin, dejando una estela verde que rellena el círculo, con un anillo intermedio de cuentas y ticks ámbar perimetrales que acumulan textura. El 'hola mundo' de la familia Revolución.",
      tags: ["órbita", "Perlin noise", "estela", "minimal"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1000,
      height: 1000,
    },
    factory: noiseCircle,
  },
  {
    meta: {
      slug: "sunset-rev",
      title: "Relieve Rev",
      author: "emm3",
      source: "creativeCode/sunsetREv.js",
      image: `${baseImage}relieveNoise.png`,
      description: "Relieve de montaña generativo (vertical) de la familia Revolución: una trayectoria circular con ruido traza líneas que se acumulan a lo largo de una franja temporal, con grosor y opacidad modulados por Perlin. Detrás, una bruma de líneas horizontales barre el canvas de arriba a abajo al ritmo del timeline, cada una con su propia opacidad por ruido. Termina con noLoop().",
      tags: ["timeline", "relieve", "Perlin noise", "bruma", "noLoop"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1080,
      height: 1350,
    },
    factory: sunsetREv,
  },
  {
    meta: {
      slug: "revolution",
      title: "Revolution",
      author: "emm3",
      source: "creativeCode/revolution.js",
      image: `${baseImage}revolution.png`,
      description: "Paisaje radial trazado en HSB, arquetipo de la familia Revolución: dos ángulos contrarrotantes tejen líneas moduladas por ruido Perlin en grosor y opacidad, con un anillo perimetral de puntos ámbar y ecos radiales interiores que exponen el mismo ruido. La pieza es de duración fija: al completar una vuelta (angle ≥ TWO_PI) dibuja un remate de cuadrados y se detiene con noLoop().",
      tags: ["radial", "HSB", "Perlin noise", "noLoop"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1000,
      height: 1000,
    },
    factory: revolution,
  },  
  {
    meta: {
      slug: "rev2",
      title: "Revolution II",
      author: "emm3",
      source: "creativeCode/rev2.js",
      image: `${baseImage}revolution2.png`,
      description: "Variante coloreada de Revolution en HSB con paleta verde/vino: dos ángulos contrarrotantes tejen líneas con opacidad y grosor modulados por ruido Perlin (cada mitad con su propio índice de ruido) y, al cerrar la vuelta, rematan con una franja de líneas rotada en verde neón. Termina con noLoop().",
      tags: ["radial", "HSB", "Perlin noise", "noLoop"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1000,
      height: 1000,
    },
    factory: rev2,
  },
  {
    meta: {
      slug: "rev3",
      title: "Revolution III",
      author: "emm3",
      source: "creativeCode/rev3.js",
      image: `${baseImage}revolution3.png`,
      description: "Pieza de timeline (≈30 s) por millis() con carácter cromático por fase: un atardecer ámbar con horizonte deformado por ruido Perlin da paso a un rayo verde neón con destellos ámbar y a un relieve orquídea trazado con ruido; entre fases se posan acentos geométricos tipo Kandinsky (círculos concéntricos, semicírculos, diagonales, retícula). Se detiene con noLoop(). Composición vertical.",
      tags: ["timeline", "atardecer", "Perlin noise", "Kandinsky", "HSB", "noLoop"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 800,
      height: 1000,
    },
    factory: rev3,
  },
  {
    meta: {
      slug: "rev-noiz",
      title: "Sunset Revolution",
      author: "emm3",
      source: "creativeCode/revNoiz.js",
      image: `${baseImage}sunsetRevolution.png`,
      description: "Atardecer generativo en formato vertical (Instagram): degradado de sol y cielo por círculos interpolados (lerpColor) con el horizonte deformado por ruido Perlin, silueta de montaña que se acumula sobre la línea del horizonte, camino de relieve tipo joyplot que avanza hacia el espectador y rayos de luz que brotan del horizonte; timeline (~42 s) que termina con noLoop().",
      tags: ["timeline", "atardecer", "RGB", "lerpColor", "Perlin noise", "relieve", "noLoop"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1080,
      height: 1350,
    },
    factory: revNoiz,
  },
  {
    meta: {
      slug: "trayectorias",
      title: "Trayectorias",
      author: "mdrn.mx",
      source: "creativeCode/trayectorias.js",
      image: `${baseImage}trayectorias.png`,
      description: "Tres trayectorias paramétricas dibujadas sobre el tiempo —logarítmica, senoidal y una figura de Lissajous— con la opacidad modulada por ruido Perlin. Estudio de movimiento; termina con noLoop().",
      tags: ["paramétrico", "Lissajous", "Perlin noise", "noLoop"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1000,
      height: 1000,
    },
    factory: trayectorias,
  },
  {
    meta: {
      slug: "delay3",
      title: "Delay III",
      author: "mdrn.mx",
      source: "creativeCode/delay3.js",
      image: `${baseImage}delay3.png`,
      description: "Estudio minimalista de fundido: la saturación y el brillo del fondo suben gradualmente desde negro hasta un vino profundo en HSB a lo largo de ~5.4 s, y se detiene con noLoop().",
      tags: ["fundido", "HSB", "minimal", "noLoop"],
      controls: [{ key: "s", action: "Guardar el canvas como PNG (saveCanvas)." }],
      needsAudio: false,
      width: 1000,
      height: 1000,
    },
    factory: delay3,
  },
  {
    meta: {
      slug: "spectografo",
      title: "Espectrógrafo de Fourier",
      author: "mdrn.mx",
      source: "creativeCode/spectografo.js",
      image: `${baseImage}spectografo.png`,
      description: "Visualizador de series de Fourier: dibuja los epiciclos (espirógrafo) cuyos radios siguen los coeficientes de una onda triangular, cuadrada o de sierra, y grafica en paralelo la onda resultante en el tiempo. Interactivo, sin audio.",
      tags: ["Fourier", "epiciclos", "interactivo", "bibliotecas"],
      controls: [
        { key: "sliders", action: "Armónicos, amplitud y paso de tiempo." },
        { key: "1 / 2 / 3", action: "Onda triangular / cuadrada / de sierra." },
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 800,
      height: 500,
    },
    factory: spectografo,
  },
  {
    meta: {
      slug: "sumador",
      title: "Sumador de Fourier",
      author: "mndrn.mx",
      source: "Talleres2021-CC2/assets/js/scripts/CC2/sumador.js",
      image: `${baseImage}sumador.png`,
      description: "Suma de armónicos: una columna de epiciclos individuales (un armónico cada uno, con amplitud que decae) y, abajo, el plotter que los suma todos en una onda. Reusa la biblioteca PloterFourier extendida. Sin audio.",
      tags: ["Fourier", "epiciclos", "armónicos", "bibliotecas"],
      controls: [
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 800,
      height: 600,
    },
    factory: sumador,
  },
  {
    meta: {
      slug: "audio-graf",
      title: "Audio Graf",
      author: "mdrn.mx",
      source: "creativeCode/audioGraf.js",
      image: `${baseImage}audiograf.png`,
      description: "Generador y analizador de audio: un oscilador controlado por sliders de frecuencia (escala logarítmica) y volumen, con su espectro FFT y forma de onda dibujados en tiempo real. Requiere activar el audio.",
      tags: ["audio", "oscilador", "FFT", "p5.sound"],
      controls: [
        { key: "sliders", action: "Frecuencia (log) y volumen." },
        { key: "1–4", action: "Onda: seno / triángulo / cuadrada / sierra." },
        { key: "p / s", action: "Arrancar / parar el oscilador." },
        { key: "l", action: "Alternar escala del espectro (lin/log)." },
      ],
      needsAudio: true,
      width: 800,
      height: 600,
    },
    factory: audioGraf,
  },
  {
    meta: {
      slug: "synth",
      title: "Synth Modular",
      author: "emm3",
      source: "creativeCode/synth.js",
      image: `${baseImage}synth.png`,
      description: "Sintetizador modular: dos osciladores (VCO + PWM) enrutados a un filtro (VCF), con dos envolventes (ADSR). Cada módulo dibuja su propio osciloscopio/espectro con knobs giratorios en vez de sliders. Migrado al motor Tone.js, con dispose explícito de todos los nodos al desmontar. Requiere activar el audio.",
      tags: ["audio", "síntesis", "VCO/VCF/ADSR", "Tone.js"],
      motorAudio: "tone",
      controls: [
        { key: "1–4 / 8–0", action: "Voz del VCO / del PWM." },
        { key: "a·x / j·k", action: "Arrancar/parar VCO / PWM." },
        { key: "w / l", action: "Onda↔espectro / escala lin↔log." },
        { key: "t / mouse", action: "Disparar envolventes (attack/release)." },
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: true,
      width: 600,
      height: 600,
    },
    factory: synth,
  },
  // {
  //   meta: {
  //     slug: "piano",
  //     title: "Piano",
  //     author: "mndrn.mx",
  //     source: "Talleres2021-CC2/assets/js/scripts/CC2/piano.js",
  //     description:
  //       "Piano de 10 teclas con un oscilador square, envolvente, reverb y delay ping-pong. Clic en el canvas enciende el sistema; las teclas a s d f g h j k l ñ tocan las notas y pintan barras de color en HSB. Del taller de Audio y Web de mndrn.mx.",
  //     tags: ["audio", "síntesis", "oscilador", "p5.sound", "HSB"],
  //     controls: [
  //       { key: "clic", action: "Enciende/apaga el oscilador (activa el audio)." },
  //       { key: "a s d f g h j k l ñ", action: "Tocar las 10 notas del piano." },
  //       { key: "sliders", action: "Mezcla de delay y de reverb." },
  //     ],
  //     needsAudio: true,
  //     width: 500,
  //     height: 400,
  //   },
  //   factory: piano,
  // },
  {
    meta: {
      slug: "sound-collider",
      title: "Sound Collider",
      author: "mndrn.mx",
      source: "Talleres2021-CC2/assets/js/scripts/CC2/soundCollider.js",
      image: `${baseImage}soundcollider.png`,
      description: "Cajas que se desplazan mientras una sonda sigue al mouse; al chocar con una caja se dispara un drone (oscilador square → filtro) afinado a la nota de la caja. mouseX barre la frecuencia de corte y el clic añade más sondas. Reusa las bibliotecas Colisionador y Cajita.",
      tags: ["audio", "colisiones", "interactivo", "p5.sound", "bibliotecas"],
      controls: [
        { key: "clic", action: "Añade una sonda fija (activa el audio)." },
        { key: "mouse", action: "mouseX barre la frecuencia del filtro." },
        { key: "a / s", action: "Arranca / para el oscilador." },
        { key: "g", action: "Dispara la envolvente (mantener)." },
      ],
      needsAudio: true,
      width: 800,
      height: 600,
    },
    factory: soundCollider,
  },
  {
    meta: {
      slug: "fft-visualization",
      title: "Visualización FFT",
      author: "mndrn.mx",
      source: "Talleres2021-CC2/assets/js/scripts/CC2/fft_Visualization.js",
      image: `${baseImage}audiovisualization.png`,
      description: "Visualizador de audio sobre una canción: dibuja la autocorrelación de la forma de onda y un espectro de frecuencias en disposición polar, en HSB. Botones de Play/Stop/Random, sliders de volumen y velocidad, y la tecla t alterna entre la canción y el micrófono.",
      tags: ["audio", "FFT", "autocorrelación", "espectro", "p5.sound"],
      controls: [
        { key: "Play / Stop / Random", action: "Reproducir, detener o saltar en la canción." },
        { key: "sliders", action: "Volumen y velocidad de reproducción." },
        { key: "t", action: "Alternar entre la canción y el micrófono." },
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: true,
      width: 800,
      height: 600,
    },
    factory: fftVisualization,
  },
  // {
  //   meta: {
  //     slug: "reticula-crayola",
  //     title: "Retícula Crayola",
  //     author: "mndrn.mx",
  //     source: "Talleres2021-CC3/assets/js/scripts/CC3/Clase3/Ejemplo5.js",
  //     description:
  //       "Retícula 12×10 de colores estándar Crayola cargados de un JSON; al hacer clic sobre un círculo se muestra el nombre del color. Del taller de Código y Datos de mndrn.mx; el dataset se sirve localmente (public/crayola.json).",
  //     tags: ["datos", "JSON", "color", "interactivo", "Crayola"],
  //     controls: [
  //       { key: "clic", action: "Clic sobre un color muestra su nombre al centro." },
  //     ],
  //     needsAudio: false,
  //     width: 800,
  //     height: 600,
  //   },
  //   factory: reticulaCrayola,
  // },
  // {
  //   meta: {
  //     slug: "estacion-espacial",
  //     title: "Estación Espacial (ISS)",
  //     author: "mndrn.mx",
  //     source: "Talleres2021-CC3/assets/js/scripts/CC3/Clase4/Ejemplo8.js",
  //     description:
  //       "Mapea la posición en vivo de la Estación Espacial Internacional (API pública wheretheiss.at) sobre el canvas, con suavizado, encima de un GIF. Pieza de datos en tiempo real (basada en el ejemplo de la ISS de Daniel Shiffman). Requiere conexión a internet.",
  //     tags: ["datos", "API", "tiempo real", "mapa", "ISS"],
  //     controls: [
  //       { key: "—", action: "Pieza autónoma; consulta la posición de la ISS en vivo." },
  //     ],
  //     needsAudio: false,
  //     width: 800,
  //     height: 600,
  //   },
  //   factory: estacionEspacial,
  // },
  {
    meta: {
      slug: "terreno-ruido",
      title: "Terreno de Ruido",
      author: "emm3",
      source: "Code-Package-p5.js/02_M/M_1_4_01/sketch.js",
      image: `${baseImage}terreno-ruido.png`,
      description: "Malla 3D (WEBGL) tipo terreno generada con ruido Perlin, reestilizada al tema del sitio: cuerpo verde matrix con las cimas en naranja neón sobre fondo negro. Pieza autónoma: dos LFOs senoidales a distinta frecuencia modulan el relieve y el terreno gira lento y continuo en Z. Basada en el libro Generative Design (cap. M). Se arrastra con el mouse para inclinar/orbitar la cámara.",
      tags: ["3D", "WEBGL", "Perlin noise", "terreno", "LFO", "animación autónoma", "Generative Design"],
      controls: [
        { key: "arrastrar", action: "Inclinar/orbitar la cámara." },
        { key: "flechas / + −", action: "Falloff, octavas y zoom." },
        { key: "espacio / s", action: "Nueva semilla / guardar PNG." },
      ],
      needsAudio: false,
      width: 600,
      height: 600,
    },
    factory: terrenoRuido,
  },
  {
    meta: {
      slug: "lineas-humo",
      title: "Líneas de Humo",
      author: "Generative Design",
      source: "Code-Package-p5.js/02_M/M_1_5_03/sketch.js",
      image: `${baseImage}lineas-humo.png`,
      description: "Miles de agentes siguen un campo de ruido Perlin 3D trazando líneas que se acumulan en contornos que fluyen, como humo o curvas de nivel. Reestilizado al tema del sitio: fondo oscuro con la mayoría de trazos en verde matrix y algunos destellos en naranja neón. Al hacer click, el número de agentes (1000–5000) se ajusta según la posición horizontal del mouse. Reusa la biblioteca AgenteHumo. Del libro Generative Design (cap. M).",
      tags: ["agentes", "flow field", "Perlin noise", "bibliotecas", "Generative Design"],
      controls: [
        { key: "click", action: "Nº de agentes (1000–5000) según mouseX." },
        { key: "1 / 2", action: "Alternar el modo de ruido." },
        { key: "c", action: "Nueva semilla de ruido." },
        { key: "borrar / s", action: "Limpiar la pantalla / guardar PNG." },
      ],
      needsAudio: false,
      width: 800,
      height: 800,
    },
    factory: lineasHumo,
  },
  {
    meta: {
      slug: "abanicos-agentes",
      title: "Abanicos de Agentes",
      author: "Generative Design",
      source: "Code-Package-p5.js/02_M/M_1_5_04/sketch.js",
      image: `${baseImage}abanicos-agentes.png`,
      description: "Miles de agentes siguen un campo de ruido y dibujan pinceladas en abanico, con trazo perpendicular (estilo 1) o elipses (estilo 2). Reestilizado al tema del sitio: fondo oscuro con la mayoría de pinceladas en verde matrix y algunos destellos en naranja neón. Al hacer click, el número de agentes (1000–5000) se ajusta según la posición horizontal del mouse. Reusa la biblioteca AgenteAbanico. Del libro Generative Design (cap. M).",
      tags: ["agentes", "flow field", "HSB", "bibliotecas", "Generative Design"],
      controls: [
        { key: "click", action: "Nº de agentes (1000–5000) según mouseX." },
        { key: "1 / 2 / 3", action: "Estilo de trazo: línea / elipse / rectángulo." },
        { key: "c", action: "Nueva semilla de ruido." },
        { key: "borrar / s", action: "Limpiar la pantalla / guardar PNG." },
      ],
      needsAudio: false,
      width: 800,
      height: 800,
    },
    factory: abanicosAgentes,
  },
  {
    meta: {
      slug: "ondas-moduladas",
      title: "Ondas Moduladas",
      author: "Generative Design",
      source: "Code-Package-p5.js/02_M/M_2_3_01/sketch.js",
      image: `${baseImage}ondas-moduladas.png`,
      description: "Un oscilador modulado en amplitud: la señal de información (seno, verde) y la portadora (coseno, verde tenue) se multiplican para dar la onda combinada, en naranja neón sobre fondo negro. La fase se anima sola de forma continua, así la onda se desplaza suavemente. Estudio de modulación del libro Generative Design (cap. M).",
      tags: ["oscilador", "modulación", "onda", "Generative Design"],
      controls: [
        { key: "i / c", action: "Mostrar/ocultar señal de información / portadora." },
        { key: "1 / 2 · 7 / 8", action: "Frecuencia · frecuencia de modulación." },
        { key: "← / → · s", action: "Empujar la fase (se anima sola) · guardar PNG." },
      ],
      needsAudio: false,
      width: 800,
      height: 400,
    },
    factory: ondasModuladas,
  },
  {
    meta: {
      slug: "orbitas-lissajous",
      title: "Órbitas de Lissajous",
      author: "Generative Design",
      source: "Code-Package-p5.js/02_M/M_2_3_02/sketch.js",
      image: `${baseImage}orbitas-lissajous.png`,
      description: "Curva de Lissajous modulada dibujada como órbitas elípticas entrelazadas en verde matrix sobre fondo oscuro; la fase se anima sola de forma continua y un texto en naranja muestra frecuencias, modulación y fase. La posición horizontal del mouse controla el número de puntos. Del libro Generative Design (cap. M).",
      tags: ["Lissajous", "paramétrico", "interactivo", "Generative Design"],
      controls: [
        { key: "mouse X", action: "Número de puntos de la curva." },
        { key: "p", action: "Pausar/continuar la animación de la fase." },
        { key: "d", action: "Alternar el modo de dibujo." },
        { key: "1-4 · 7-0 · ←/→", action: "Frecuencias, modulación y fase (se anima sola)." },
        { key: "s", action: "Guardar el canvas como PNG (saveCanvas)." },
      ],
      needsAudio: false,
      width: 600,
      height: 600,
    },
    factory: orbitasLissajous,
  },
  {
    meta: {
      slug: "malla-armonica",
      title: "Malla Armónica",
      author: "Generative Design",
      source: "Code-Package-p5.js/02_M/M_2_5_01/sketch.js",
      image: `${baseImage}malla-armonica.png`,
      description: "Una figura de Lissajous con sus puntos cercanos conectados: la malla de conexiones se dibuja en naranja neón (con desvanecimiento por distancia) y los nodos de la curva en verde matrix, sobre fondo oscuro. La fase rota sola de forma continua y suave, y un texto en naranja muestra frecuencias, modulación y fase. Del libro Generative Design (cap. M).",
      tags: ["Lissajous", "malla", "geometría", "animado", "Generative Design"],
      controls: [
        { key: "p", action: "Pausar/continuar la rotación de la fase." },
        { key: "1-4 · 7-0", action: "Frecuencias X/Y y de modulación." },
        { key: "← / →", action: "Empujar la fase (se anima sola)." },
        { key: "s", action: "Guardar el canvas como PNG." },
      ],
      needsAudio: false,
      width: 800,
      height: 800,
    },
    factory: mallaArmonica,
  },
    {
    meta: {
      slug: "atomos-pixel",
      title: "Átomos de Píxel",
      author: "emm3",
      source: "pixelAtomProject/pixelAtomProject.pde",
      image: `${baseImage}atomos-pixel.png`,
      description: "Port a p5 del sketch de Processing pixelAtomProject: captura una imagen (webcam o archivo), la descompone en partículas de color que conservan el píxel original y las anima con 15 modos —steering behaviors (seguir, deambular, manada, vórtice, explosión), composiciones generativas (líneas, círculos, rectángulos, hue-shift) y colonización de espacios— sobre 7 tipos de flow field con transiciones suaves, 9 formas de partícula (incluido ASCII/Matrix) y estelas/mezcla aditiva. Sin el control OSC del original.",
      tags: ["partículas", "steering", "webcam", "flow field", "ASCII", "interactivo"],
      controls: [
        { key: "1–9 / 0", action: "Modos: original, mouse, campo, deambular, lluvia, temblor, manada, vórtice, explosión, gravedad." },
        { key: "w / o / x / h / a", action: "Composiciones: líneas, círculos, rectángulos, hue-shift, colonización." },
        { key: "d e f g q y z", action: "Campos: ruido, imagen, radial, circular, corazón, infinito, espiral." },
        { key: "t / l / p / r", action: "Capturar / cargar imagen / play-pausa / reset." },
        { key: "s / b / m / n / v", action: "Forma, fondo/estelas, mezcla aditiva, tamaño dinámico, vida." },
        { key: "j k , .", action: "Tipografía: color, negrita, tamaño de letra." },
        { key: "espacio / ← ↑ → ↓ / + − / [ ] / u i / c", action: "Explosión, dirección lluvia, velocidad, estela, umbral colonización, ver campo." },
      ],
      needsAudio: false,
      width: 1280,
      height: 720,
    },
    factory: atomosPixel,
  },
];

export function getSketch(slug: string): SketchEntry | undefined {
  return sketches.find((entry) => entry.meta.slug === slug);
}
