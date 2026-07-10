import type p5 from "p5";
import type * as Tone from "tone";
import { Colisionador } from "../bibliotecas/colisionador";
import { Cajita } from "../bibliotecas/cajita";
import { Knob } from "../bibliotecas/knob";
import { onRemove } from "../bibliotecas/cleanup";
import type { SketchFactory } from "../types";

/**
 * Rediseño de `Talleres2021-CC2/.../CC2/soundCollider.js`.
 *
 * Cajas que se desplazan y DERIVAN con ruido; el usuario coloca hasta 8 bolitas
 * detonadoras con el clic. Cuando una caja cruza una bolita dispara una voz de un
 * sintetizador polifónico de CAMPANITAS (FM, envolvente AD percusiva). El tamaño
 * de la caja fija la nota; con la cuantización activa, la nota se ajusta a la
 * escala/nota base elegidas.
 *
 * Migrado de p5.sound a **Tone.js**: un `PolySynth` de `FMSynth` con hasta 8
 * voces. Se dispone al cambiar de página vía `onRemove`. UI: perillas de volumen
 * y velocidad, botones de transposición MIDI ±, selector de nota base y escala, y
 * botón de cuantización on/off.
 */

const SLUG = "sound-collider";

const PALETA = {
  fondo: "#050805", // matrix-black
  texto: "#7fffa8", // matrix-text
  titulo: "#ff8c1a", // neon-orange
  valor: "#00ff41", // matrix-green
  cajas: ["#00e5ff", "#00b341", "#a855f7", "#ff8c1a", "#c98bff", "#33ff77"],
  bolita: "#ff8c1a", // neon-orange (detonadores)
};

const CONFIG = {
  numCajas: 10,
  maxBolitas: 8,
  maxVoces: 8,
  sizeMin: 30,
  sizeMax: 100,
  notaMin: 48, // caja grande → nota grave
  notaMax: 84, // caja chica → nota aguda
};

/** Escalas como offsets en semitonos dentro de la octava. */
const ESCALAS: Record<string, number[]> = {
  Mayor: [0, 2, 4, 5, 7, 9, 11],
  Menor: [0, 2, 3, 5, 7, 8, 10],
  Pentatónica: [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10],
  Cromática: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const NOTAS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const soundCollider: SketchFactory = (p: p5, _P5?: typeof p5, ToneModule?: typeof Tone) => {
  const T = ToneModule as typeof Tone;

  const W = 800;
  const H = 600;

  const cajas: Cajita[] = [];
  const bolitas: Colisionador[] = [];

  let poly: Tone.PolySynth<Tone.FMSynth>;
  let masterGain: Tone.Gain;
  let audioArrancado = false;

  // Estado de control.
  let volumen = 0.7;
  let velocidad = 1.5;
  let transpose = 0; // semitonos (botones MIDI ±)
  let rootPc = 0; // clase de altura de la nota base (0 = C)
  let escalaNombre = "Pentatónica";
  let cuantizar = true;

  // Nota a partir del tamaño de la caja (grande → grave, chica → aguda).
  const notaDeTamano = (size: number) =>
    p.map(size, CONFIG.sizeMin, CONFIG.sizeMax, CONFIG.notaMax, CONFIG.notaMin);

  // Ajusta un MIDI a la escala elegida enraizada en la nota base.
  const cuantiza = (midi: number): number => {
    const root = 60 + rootPc;
    const intervalos = ESCALAS[escalaNombre];
    const rel = midi - root;
    const octava = Math.floor(rel / 12);
    const dentro = rel - octava * 12;
    let mejor = intervalos[0];
    let mejorDist = Infinity;
    for (const iv of intervalos) {
      const d = Math.abs(iv - dentro);
      if (d < mejorDist) {
        mejorDist = d;
        mejor = iv;
      }
    }
    return root + octava * 12 + mejor;
  };

  // Dispara una campanita a la nota derivada del tamaño de la caja.
  const dispara = (caja: Cajita) => {
    if (!audioArrancado) return;
    let midi = notaDeTamano(caja.tam()) + transpose;
    if (cuantizar) midi = cuantiza(midi);
    midi = p.constrain(Math.round(midi), 24, 96);
    poly.triggerAttackRelease(T.Frequency(midi, "midi").toFrequency(), "8n");
  };

  const estiloControl = (el: p5.Element) => {
    el.style("background", "#0a140d");
    el.style("color", "#00ff41");
    el.style("border", "1px solid #143b22");
    el.style("font-family", "monospace");
    el.style("font-size", "11px");
    el.style("padding", "2px 4px");
  };

  p.setup = () => {
    p.createCanvas(W, H);

    // --- Audio: PolySynth de campanitas (FM, AD percusivo, hasta 8 voces) ---
    poly = new T.PolySynth(T.FMSynth, {
      harmonicity: 3.01, // razón inarmónica → timbre de campana
      modulationIndex: 12,
      oscillator: { type: "sine" },
      modulation: { type: "sine" },
      envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.0 }, // AD percusivo
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.3 },
      volume: -6,
    });
    poly.maxPolyphony = CONFIG.maxVoces;
    masterGain = new T.Gain(volumen);
    poly.connect(masterGain);
    masterGain.connect(T.Destination);

    // --- Cajas móviles ---
    for (let i = 0; i < CONFIG.numCajas; i++) {
      cajas.push(
        new Cajita(
          p,
          p.random(W),
          p.random(H),
          p.random(CONFIG.sizeMin, CONFIG.sizeMax),
          p.random(CONFIG.sizeMin, CONFIG.sizeMax),
          i,
          p.random(PALETA.cajas) as string,
        ),
      );
    }

    // --- UI: perillas ---
    const knobVol = new Knob(p, {
      etiqueta: "Volumen",
      min: 0,
      max: 1,
      valor: volumen,
      paso: 0.01,
      onChange: (v) => {
        volumen = v;
        masterGain.gain.rampTo(v, 0.05);
      },
    });
    knobVol.position(12, 12);

    const knobVel = new Knob(p, {
      etiqueta: "Velocidad",
      min: 0.1,
      max: 8,
      valor: velocidad,
      paso: 0.1,
      onChange: (v) => {
        velocidad = v;
      },
    });
    knobVel.position(84, 12);

    // --- UI: selector de nota base ---
    // p5 no tipa option/selected/changed sobre Element: se usa `any` (mismo
    // patrón que los componentes de audio del port original).
    const selNota = p.createSelect() as any;
    NOTAS.forEach((n) => selNota.option(n));
    selNota.selected(NOTAS[rootPc]);
    selNota.changed(() => {
      rootPc = NOTAS.indexOf(String(selNota.value()));
    });
    estiloControl(selNota);
    selNota.position(160, 24);

    // --- UI: selector de escala ---
    const selEscala = p.createSelect() as any;
    Object.keys(ESCALAS).forEach((n) => selEscala.option(n));
    selEscala.selected(escalaNombre);
    selEscala.changed(() => {
      escalaNombre = String(selEscala.value());
    });
    estiloControl(selEscala);
    selEscala.position(220, 24);

    // --- UI: botón de cuantización ---
    const btnQ = p.createButton(`Cuantizar: ${cuantizar ? "ON" : "OFF"}`);
    btnQ.mousePressed(() => {
      cuantizar = !cuantizar;
      btnQ.html(`Cuantizar: ${cuantizar ? "ON" : "OFF"}`);
    });
    estiloControl(btnQ);
    btnQ.position(330, 24);

    // --- UI: transposición MIDI ± ---
    const btnMenos = p.createButton("MIDI −");
    btnMenos.mousePressed(() => {
      transpose = Math.max(-24, transpose - 12);
    });
    estiloControl(btnMenos);
    btnMenos.position(460, 24);

    const btnMas = p.createButton("MIDI +");
    btnMas.mousePressed(() => {
      transpose = Math.min(24, transpose + 12);
    });
    estiloControl(btnMas);
    btnMas.position(520, 24);

    // Elimina la voz al cambiar de página.
    onRemove(p, () => {
      poly.dispose();
      masterGain.dispose();
    });
  };

  p.draw = () => {
    p.background(PALETA.fondo);

    // Cajas: mover, detectar colisiones (flanco) y dibujar.
    for (const caja of cajas) {
      caja.actualizar(velocidad);
      const ahora = new Set<number>();
      for (let k = 0; k < bolitas.length; k++) {
        if (caja.chocaCon(bolitas[k])) ahora.add(k);
      }
      // Dispara solo en las colisiones NUEVAS (rising edge).
      for (const k of ahora) {
        if (!caja.colisionesPrevias.has(k)) dispara(caja);
      }
      caja.colisionesPrevias = ahora;
      caja.setHit(ahora.size > 0);
      caja.mostrar();
    }

    for (const bol of bolitas) bol.mostrar();

    dibujaHUD();
  };

  function dibujaHUD() {
    p.push();
    p.noStroke();
    p.textFont("monospace");
    p.textAlign(p.LEFT, p.TOP);

    // Panel inferior con el estado.
    p.textSize(12);
    p.fill(PALETA.titulo);
    p.text("SOUND COLLIDER", 12, H - 60);
    p.fill(PALETA.texto);
    p.textSize(11);
    const base = `Base: ${NOTAS[rootPc]}  Escala: ${escalaNombre}  Cuant.: ${cuantizar ? "ON" : "OFF"}  MIDI: ${transpose >= 0 ? "+" : ""}${transpose}`;
    p.text(base, 12, H - 42);
    p.fill(PALETA.valor);
    p.text(`Bolitas: ${bolitas.length}/${CONFIG.maxBolitas}   Voces: hasta ${CONFIG.maxVoces}`, 12, H - 26);

    // Ayuda de clic.
    p.fill(PALETA.texto);
    p.textAlign(p.RIGHT, p.TOP);
    p.text("clic: colocar bolita detonadora · s: guardar", W - 12, H - 26);
    p.pop();
  }

  // Clic: arranca el audio y coloca una bolita detonadora (hasta 8).
  p.mousePressed = () => {
    audioArrancado = true;
    // Ignora clics fuera del canvas o sobre la franja de controles superior.
    if (p.mouseX < 0 || p.mouseX > W || p.mouseY < 0 || p.mouseY > H) return;
    if (p.mouseY < 90) return;
    if (bolitas.length >= CONFIG.maxBolitas) return;
    bolitas.push(new Colisionador(p, p.mouseX, p.mouseY, 22, PALETA.bolita));
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas(SLUG, "png");
  };
};
