import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Paleta en RGB (el colorMode nativo del sketch). Identidad original: grises
 * y blancos crudos sobre negro; se re-mapea al duotono del sitio — verdes
 * matrix como base y un ámbar discreto como acento puntual — conservando el
 * fondo negro persistente y el carácter minimal/meditativo de la pieza.
 */
const PALETA = {
  fondo: [5, 8, 5] as [number, number, number], // antes background(0): negro con tinte verde
  centro: [135, 172, 153] as [number, number, number], // antes blanco 255: verde pálido del punto central
  orbital: [0, 255, 65] as [number, number, number], // antes gris 200: verde neón del punto que orbita
  radial: [21, 90, 54] as [number, number, number], // antes gris por ruido: verde glow (brillo aún modulado por ruido)
  cuentas: [176, 184, 72] as [number, number, number], // verde apagado: anillo intermedio de cuentas
  acento: [118, 86, 233] as [number, number, number], // ámbar: ticks perimetrales, acento puntual
  acento2: [255, 255, 0] as [number, number, number], // amarillo: ticks perimetrales, acento puntual
};

/**
 * Port en modo instancia de `creativeCode/noiseCircle.js`.
 *
 * "Hola mundo" de la familia "Revolución" (ver `algorithms.md`): un punto
 * orbita el centro y una línea lo une a él, con grosor/brillo/opacidad
 * modulados por ruido Perlin, acumulándose sobre fondo negro persistente
 * (el `background` solo corre en `setup`). Loop continuo sin `noLoop()`.
 * Se omite el `console.log(sC)` de depuración del original (corría cada
 * frame y siempre imprimía 0).
 */
export const noiseCircle: SketchFactory = (p: p5) => {
  let x = 0;
  let y = 0;
  let angle = 0;
  const radio = 430;
  let index = 0;

  p.setup = () => {
    p.createCanvas(1000, 1000);
    p.background(...PALETA.fondo);
    puntoCentral();
  };

  p.draw = () => {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    x = radio * p.cos(angle);
    y = radio * p.sin(angle);
    puntoOrbital();
    radioAlCentro();
    cuentasIntermedias();
    ticksPerimetrales();
    p.pop();

    angle += 0.005;
    angle %= p.TWO_PI;

    index += 0.007;
  };

  /** Punto central, dibujado una sola vez desde setup(). */
  function puntoCentral() {
    p.push();
    p.translate(p.width / 2, p.height / 2);
    p.stroke(...PALETA.centro);
    p.strokeWeight(5);
    p.point(0, 0);
    p.pop();
  }

  /** Punto que orbita el perímetro: grosor y opacidad por ruido. */
  function puntoOrbital() {
    p.stroke(...PALETA.orbital, p.noise(index * 4) * 255);
    p.strokeWeight(p.noise(index) * 5);
    p.point(x, y);
  }

  /**
   * Línea del centro al punto orbital. Como en el original, dos lecturas de
   * ruido la modulan: `noise(index)` como brillo del trazo (escala el color)
   * y `noise(index·3)` como opacidad.
   */
  function radioAlCentro() {
    const brillo = p.noise(index);
    p.stroke(
      PALETA.radial[0] * brillo,
      PALETA.radial[1] * brillo,
      PALETA.radial[2] * brillo,
      p.noise(index * 3) * 255,
    );
    p.strokeWeight(1);
    p.line(0, 0, x, y);
  }

  /**
   * Cuenta sobre un anillo intermedio (~55–61% del radio), leyendo el ruido
   * con offset propio: el radio respira levemente y el grosor y la opacidad
   * exponen la textura del ruido. Al acumularse con las vueltas graba un
   * anillo granulado dentro de la estela.
   */
  function cuentasIntermedias() {
    const ruido = p.noise(index + 41.3);
    const r = radio * (0.55 + 0.06 * ruido);
    p.stroke(...PALETA.cuentas, ruido * 120 + 10);
    p.strokeWeight(ruido * 4 + 0.5);
    p.point(r * p.cos(angle), r * p.sin(angle));
  }

  /**
   * Tick radial corto justo afuera de la órbita, girando en sentido contrario
   * (usa `-angle`). Acento ámbar discreto: solo aparece cuando su offset de
   * ruido pica alto, con grosor, largo y opacidad modulados por él.
   */
  function ticksPerimetrales() {
    const ruido = p.noise(index + 87.9);
    const rInt = radio * 1.02;
    const rExt = radio * (1.02 + 0.05 * ruido);

    if(p.mouseIsPressed){
      p.stroke(...PALETA.acento2, (ruido * 2) * 180 + 80);
      p.strokeWeight(ruido * 3);
      p.line(rInt * p.cos(-angle), rInt * p.sin(-angle), rExt * p.cos(-angle), rExt * p.sin(-angle));
    }
    
    if (ruido < 0.35) return;
    p.stroke(...PALETA.acento, (ruido * 2) * 200 + 50);
    p.strokeWeight(ruido * 2);
    p.line(rInt * p.cos(-angle), rInt * p.sin(-angle), rExt * p.cos(-angle), rExt * p.sin(-angle));
    
    
  }

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("noise-circle", "png");
  };
};
