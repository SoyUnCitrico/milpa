import type p5 from "p5";

/**
 * Ploter de series de Fourier (epiciclos / espirógrafo) portado de
 * `creativeCode/libraries/PloterFourier.js` a modo instancia.
 *
 * Dibuja la estructura de círculos giratorios cuyos radios siguen los
 * coeficientes de Fourier de una onda triangular (1), cuadrada (2) o de sierra
 * (3), y grafica en paralelo la onda resultante en el tiempo. Recibe `p` y
 * prefija toda la API global; los vectores son de `p.createVector` y se operan
 * con métodos de instancia (`.copy()`), así que no necesita el constructor de p5.
 */
export class PloterFourier {
  p: p5;
  tiempo: number;
  timeStep: number;
  amp: number;
  piFactor: number;
  radio: number;
  resolucion: number;
  arrayWaveTime: number[];
  arrayEspyro: number[];
  centroPolar: p5.Vector;
  puntoExterior!: p5.Vector;
  centroActual!: p5.Vector;
  initPlotTime: p5.Vector;
  sizeTiempoPlot: number;
  sizePolarPlot: number;
  funcActual: number;
  factor: number;

  /**
   * Paleta cyberpunk (tokens del sitio). Estructura verde, figura naranja neón,
   * onda cian y puente violeta. Compartida por `spectografo` y `sumador`.
   */
  colores = {
    eje: "#143b22", // matrix-line
    estructura: "#00b341", // matrix-dim (epiciclos)
    punto: "#00ff41", // matrix-green (nodos)
    puente: "#a855f7", // neon-violet (unión polar↔tiempo)
    figura: "#ff8c1a", // neon-orange (espirógrafo)
    onda: "#00e5ff", // cian cyberpunk (onda en el tiempo)
  };

  constructor(
    p: p5,
    centroPolarPlot: p5.Vector,
    initTimePlot: p5.Vector,
    amplitude: number,
    armonicos: number,
  ) {
    this.p = p;
    this.tiempo = 0;
    this.timeStep = 0.1;
    this.amp = amplitude;
    this.piFactor = 3 / (1 * p.PI);
    this.radio = this.amp + this.piFactor;
    this.resolucion = armonicos;

    this.arrayWaveTime = [];
    this.arrayEspyro = [];

    this.centroPolar = centroPolarPlot;
    this.initPlotTime = initTimePlot;

    this.sizeTiempoPlot = 500;
    this.sizePolarPlot = 1000;

    this.funcActual = 1;
    this.factor = 0;
  }

  actualizar() {
    const p = this.p;
    // El limpiado de fondo lo hace el sketch que llama (no aquí), para permitir
    // componer varios plotters en un mismo canvas (p. ej. `sumador`).
    this.dibujaAxis();
    this.puntoExterior = this.centroPolar.copy();
    // Amplitud que decae por armónico (solo la usa la función 5).
    let amplitud = this.amp;
    for (let i = 0; i < this.resolucion; i++) {
      this.centroActual = this.puntoExterior.copy();
      let n: number;
      switch (this.funcActual) {
        case 1:
          // TRIANGULAR
          n = i * 2 + 1;
          this.radio = this.amp * ((8 / (n * n * p.PI * p.PI)) * p.pow(-1, (n - 1) / 2));
          this.puntoExterior.x += this.radio * p.cos(n * this.tiempo);
          this.puntoExterior.y += this.radio * p.sin(n * this.tiempo);
          break;
        case 2:
          // CUADRADA
          n = i * 2 + 1;
          this.radio = this.amp * (4 / (n * p.PI));
          this.puntoExterior.x += this.radio * p.cos(n * this.tiempo);
          this.puntoExterior.y += this.radio * p.sin(n * this.tiempo);
          break;
        case 3:
          // SIERRA
          n = i + 1;
          this.radio = 4 * this.amp * (1 / 2 - 1 / p.PI) * (1 / n);
          this.puntoExterior.x += this.radio * p.cos(n * this.tiempo);
          this.puntoExterior.y += this.radio * p.sin(n * this.tiempo);
          break;
        case 4:
          // SENOIDAL (un solo armónico)
          this.radio = this.amp;
          this.puntoExterior.x += this.radio * p.cos(this.tiempo);
          this.puntoExterior.y += this.radio * p.sin(this.tiempo);
          break;
        case 5:
          // Armónicos con amplitud que decae por `factor` (usada por `sumador`).
          n = i + 1;
          this.radio = amplitud;
          this.puntoExterior.x += this.radio * p.cos(this.tiempo * n);
          this.puntoExterior.y += this.radio * p.sin(this.tiempo * n);
          amplitud *= this.factor;
          break;
        case 6:
          // SIERRA INVERSA — espejo de la sierra (case 3, con signo negado).
          n = i + 1;
          this.radio = -4 * this.amp * (1 / 2 - 1 / p.PI) * (1 / n);
          this.puntoExterior.x += this.radio * p.cos(n * this.tiempo);
          this.puntoExterior.y += this.radio * p.sin(n * this.tiempo);
          break;
        case 7:
          // PULSO (onda rectangular de ciclo de trabajo 0.3): amplitud de cada
          // armónico ∝ sin(n·π·duty); incluye pares e impares (más denso que la
          // cuadrada). Escala ×2 para igualar la altura de la cuadrada.
          n = i + 1;
          this.radio = this.amp * (2 / (n * p.PI)) * p.sin(n * p.PI * 0.3) * 2;
          this.puntoExterior.x += this.radio * p.cos(n * this.tiempo);
          this.puntoExterior.y += this.radio * p.sin(n * this.tiempo);
          break;
        case 8:
          // IMPULSO — armónicos que decaen lento (1/√n): serie más "puntiaguda"
          // que la sierra, tiende a un tren de pulsos al subir los armónicos.
          n = i + 1;
          this.radio = this.amp * (2 / p.PI) * (1 / p.sqrt(n));
          this.puntoExterior.x += this.radio * p.cos(n * this.tiempo);
          this.puntoExterior.y += this.radio * p.sin(n * this.tiempo);
          break;
      }
      this.dibujaPolarStructure();
    }
    this.guardaPolar();
    this.guardaTiempo();
    this.dibujaBridgeStroke();
    this.dibujaTimeShape();
    this.dibujaPolarShape();

    this.tiempo += this.timeStep;
  }

  guardaTiempo() {
    this.arrayWaveTime.unshift(this.puntoExterior.y - this.centroPolar.y);
    if (this.arrayWaveTime.length > this.sizeTiempoPlot) {
      this.arrayWaveTime.pop();
    }
  }

  guardaPolar() {
    this.arrayEspyro.unshift(this.puntoExterior.x, this.puntoExterior.y);
    if (this.arrayEspyro.length > this.sizePolarPlot) {
      this.arrayEspyro.pop();
    }
  }

  /** Aplica un color de la paleta con alfa (0-255) al stroke actual. */
  private strokePaleta(hex: string, alfa: number) {
    const c = this.p.color(hex);
    c.setAlpha(alfa);
    this.p.stroke(c);
  }

  dibujaAxis() {
    const p = this.p;
    p.push();
    this.strokePaleta(this.colores.eje, 140);
    p.strokeWeight(1);
    p.line(this.initPlotTime.x - 50, this.initPlotTime.y, this.initPlotTime.x + 450, this.initPlotTime.y);
    p.line(this.initPlotTime.x, this.initPlotTime.y - this.amp * 2, this.initPlotTime.x, this.initPlotTime.y + this.amp * 2);
    p.line(this.centroPolar.x - 2 * this.amp, this.centroPolar.y, this.centroPolar.x + 2 * this.amp, this.centroPolar.y);
    p.line(this.centroPolar.x, this.centroPolar.y - 2 * this.amp, this.centroPolar.x, this.centroPolar.y + 2 * this.amp);
    p.pop();
  }

  dibujaPolarStructure() {
    const p = this.p;
    p.push();
    p.strokeWeight(1);
    this.strokePaleta(this.colores.estructura, 120);
    p.noFill();
    p.ellipse(this.centroActual.x, this.centroActual.y, this.radio * 2);
    p.line(this.centroActual.x, this.centroActual.y, this.puntoExterior.x, this.puntoExterior.y);
    p.strokeWeight(3);
    this.strokePaleta(this.colores.punto, 255);
    p.point(this.centroActual.x, this.centroActual.y);
    p.point(this.puntoExterior.x, this.puntoExterior.y);
    p.pop();
  }

  dibujaBridgeStroke() {
    const p = this.p;
    p.push();
    this.strokePaleta(this.colores.puente, 130);
    p.line(this.puntoExterior.x, this.puntoExterior.y, this.initPlotTime.x, this.arrayWaveTime[0] + this.initPlotTime.y);
    p.pop();
  }

  dibujaPolarShape() {
    const p = this.p;
    p.push();
    p.strokeWeight(3);
    this.strokePaleta(this.colores.figura, 190);
    p.beginShape();
    p.noFill();
    for (let i = 0; i < this.arrayEspyro.length / 2; i += 2) {
      p.vertex(this.arrayEspyro[i], this.arrayEspyro[i + 1]);
    }
    p.endShape();
    p.pop();
  }

  dibujaTimeShape() {
    const p = this.p;
    p.push();
    p.strokeWeight(2);
    this.strokePaleta(this.colores.onda, 220);
    p.beginShape();
    p.noFill();
    for (let i = 0; i < this.arrayWaveTime.length; i++) {
      p.vertex(i + this.initPlotTime.x, this.arrayWaveTime[i] + this.initPlotTime.y);
    }
    p.endShape();
    p.pop();
  }

  getArmonicos() {
    return this.resolucion;
  }

  setArmonicos(armonicos: number) {
    this.resolucion = armonicos;
  }

  getAmp() {
    return this.amp;
  }

  setAmp(amp: number) {
    this.amp = amp;
  }

  setTimeStep(time: number) {
    this.timeStep = time;
  }

  changeFunction(funcion: number) {
    this.funcActual = funcion;
  }

  changeFactor(f: number) {
    this.factor = f;
  }
}

/**
 * Variante que dibuja **un solo armónico** (un círculo de radio `amp` girando a
 * frecuencia `resolucion`), usada por `sumador` para componer una columna de
 * epiciclos individuales. Reusa toda la maquinaria de dibujo de `PloterFourier`
 * y solo redefine `actualizar()`; no limpia el fondo (lo hace el sketch).
 */
export class PloterFinalFourier extends PloterFourier {
  constructor(
    p: p5,
    centroPolarPlot: p5.Vector,
    initTimePlot: p5.Vector,
    amplitude: number,
    armonicos: number,
  ) {
    super(p, centroPolarPlot, initTimePlot, amplitude, armonicos);
    this.timeStep = 0.02;
  }

  actualizar() {
    const p = this.p;
    this.dibujaAxis();
    this.puntoExterior = this.centroPolar.copy();
    this.centroActual = this.puntoExterior.copy();
    this.radio = this.amp;
    this.puntoExterior.x += this.radio * p.cos(this.resolucion * this.tiempo);
    this.puntoExterior.y += this.radio * p.sin(this.resolucion * this.tiempo);

    this.dibujaPolarStructure();
    this.guardaPolar();
    this.guardaTiempo();
    this.dibujaBridgeStroke();
    this.dibujaTimeShape();
    this.dibujaPolarShape();

    this.tiempo += this.timeStep;
  }
}
